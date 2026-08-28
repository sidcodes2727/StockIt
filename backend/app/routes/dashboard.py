"""Dashboard aggregates: summary cards, recent activity, sales trend."""

from __future__ import annotations

from datetime import date, timedelta

from flask import Blueprint, request
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from ..errors import ApiError
from ..extensions import db
from ..models import Category, Product, Purchase, Sale, Supplier, User
from ..schemas import ProductSchema
from ..utils import auth_required
from .products import NEEDS_REORDER

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")

product_schema = ProductSchema()


def _percent_change(current: float, previous: float) -> float | None:
    """Signed percentage change, or ``None`` when there is no baseline."""
    if previous == 0:
        return None if current == 0 else 100.0
    return round(((current - previous) / previous) * 100, 1)


@dashboard_bp.get("/summary")
@auth_required
def summary():
    today = date.today()
    yesterday = today - timedelta(days=1)

    # -- summary cards -------------------------------------------------------
    product_totals = db.session.execute(
        select(
            func.count(Product.id),
            func.coalesce(func.sum(Product.cost_price * Product.quantity), 0),
            func.coalesce(func.sum(Product.unit_price * Product.quantity), 0),
            func.coalesce(func.sum(Product.quantity), 0),
        )
    ).one()

    low_stock_count = db.session.scalar(
        select(func.count(Product.id)).where(NEEDS_REORDER)
    )
    out_of_stock_count = db.session.scalar(
        select(func.count(Product.id)).where(Product.quantity <= 0)
    )

    today_sales = db.session.execute(
        select(
            func.coalesce(func.sum(Sale.quantity * Sale.sale_price), 0),
            func.coalesce(func.sum(Sale.quantity), 0),
            func.count(func.distinct(Sale.invoice_no)),
        ).where(Sale.sale_date == today)
    ).one()

    yesterday_revenue = db.session.scalar(
        select(func.coalesce(func.sum(Sale.quantity * Sale.sale_price), 0)).where(
            Sale.sale_date == yesterday
        )
    )

    month_start = today.replace(day=1)
    month_totals = db.session.execute(
        select(
            func.coalesce(func.sum(Sale.quantity * Sale.sale_price), 0),
            func.coalesce(func.sum(Sale.quantity), 0),
        ).where(Sale.sale_date >= month_start, Sale.sale_date <= today)
    ).one()

    counts = {
        "categories": db.session.scalar(select(func.count(Category.id))) or 0,
        "suppliers": db.session.scalar(select(func.count(Supplier.id))) or 0,
        "users": db.session.scalar(select(func.count(User.id))) or 0,
    }

    # -- low stock alerts panel ---------------------------------------------
    low_stock_products = db.session.scalars(
        select(Product)
        .options(joinedload(Product.category), joinedload(Product.supplier))
        .where(NEEDS_REORDER)
        .order_by(Product.quantity.asc(), Product.name.asc())
        .limit(8)
    ).unique().all()

    # -- recent transactions (last 10 movements, purchases + sales merged) ---
    recent_sales = db.session.scalars(
        select(Sale)
        .options(joinedload(Sale.product), joinedload(Sale.creator))
        .order_by(Sale.created_at.desc(), Sale.id.desc())
        .limit(10)
    ).unique().all()
    recent_purchases = db.session.scalars(
        select(Purchase)
        .options(joinedload(Purchase.product), joinedload(Purchase.creator))
        .order_by(Purchase.created_at.desc(), Purchase.id.desc())
        .limit(10)
    ).unique().all()

    movements = [
        {
            "id": f"sale-{s.id}",
            "type": "sale",
            "reference": s.invoice_no,
            "product_name": s.product.name if s.product else "(deleted product)",
            "product_sku": s.product.sku if s.product else None,
            "quantity": s.quantity,
            "unit_amount": float(s.sale_price),
            "total_amount": float(s.line_total),
            "party": s.customer_name or "Walk-in customer",
            "date": s.sale_date.isoformat(),
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "user": s.creator.name if s.creator else None,
        }
        for s in recent_sales
    ] + [
        {
            "id": f"purchase-{p.id}",
            "type": "purchase",
            "reference": p.reference_no,
            "product_name": p.product.name if p.product else "(deleted product)",
            "product_sku": p.product.sku if p.product else None,
            "quantity": p.quantity,
            "unit_amount": float(p.cost_price),
            "total_amount": float(p.line_total),
            "party": p.supplier.name if p.supplier else "Unknown supplier",
            "date": p.purchase_date.isoformat(),
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "user": p.creator.name if p.creator else None,
        }
        for p in recent_purchases
    ]
    movements.sort(key=lambda m: (m["created_at"] or "", m["id"]), reverse=True)

    today_revenue = float(today_sales[0] or 0)

    return {
        "cards": {
            "total_products": int(product_totals[0] or 0),
            "total_units": int(product_totals[3] or 0),
            "stock_value_at_cost": float(product_totals[1] or 0),
            "stock_value_at_retail": float(product_totals[2] or 0),
            "low_stock_count": int(low_stock_count or 0),
            "out_of_stock_count": int(out_of_stock_count or 0),
            "today_revenue": today_revenue,
            "today_units": int(today_sales[1] or 0),
            "today_invoice_count": int(today_sales[2] or 0),
            "today_vs_yesterday_pct": _percent_change(
                today_revenue, float(yesterday_revenue or 0)
            ),
            "month_revenue": float(month_totals[0] or 0),
            "month_units": int(month_totals[1] or 0),
        },
        "counts": counts,
        "low_stock_products": product_schema.dump(low_stock_products, many=True),
        "recent_transactions": movements[:10],
    }, 200


@dashboard_bp.get("/sales-trend")
@auth_required
def sales_trend():
    """Daily revenue/units for the trailing window, zero-filled.

    Gaps are filled in Python rather than left out, so the chart shows a
    continuous axis instead of silently compressing quiet days.
    """
    try:
        days = int(request.args.get("days", 7))
    except ValueError:
        raise ApiError("`days` must be an integer.") from None

    if days not in {7, 14, 30, 90}:
        raise ApiError("`days` must be one of 7, 14, 30 or 90.")

    end = date.today()
    start = end - timedelta(days=days - 1)

    sales_rows = dict(
        db.session.execute(
            select(
                Sale.sale_date,
                func.coalesce(func.sum(Sale.quantity * Sale.sale_price), 0),
            )
            .where(Sale.sale_date >= start, Sale.sale_date <= end)
            .group_by(Sale.sale_date)
        ).all()
    )
    units_rows = dict(
        db.session.execute(
            select(Sale.sale_date, func.coalesce(func.sum(Sale.quantity), 0))
            .where(Sale.sale_date >= start, Sale.sale_date <= end)
            .group_by(Sale.sale_date)
        ).all()
    )
    purchase_rows = dict(
        db.session.execute(
            select(
                Purchase.purchase_date,
                func.coalesce(func.sum(Purchase.quantity * Purchase.cost_price), 0),
            )
            .where(Purchase.purchase_date >= start, Purchase.purchase_date <= end)
            .group_by(Purchase.purchase_date)
        ).all()
    )

    series = []
    for offset in range(days):
        day = start + timedelta(days=offset)
        series.append(
            {
                "date": day.isoformat(),
                "label": day.strftime("%d %b"),
                "revenue": float(sales_rows.get(day, 0) or 0),
                "units": int(units_rows.get(day, 0) or 0),
                "purchases": float(purchase_rows.get(day, 0) or 0),
            }
        )

    total_revenue = sum(point["revenue"] for point in series)

    return {
        "days": days,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "series": series,
        "totals": {
            "revenue": round(total_revenue, 2),
            "units": sum(point["units"] for point in series),
            "purchases": round(sum(point["purchases"] for point in series), 2),
            "average_daily_revenue": round(total_revenue / days, 2) if days else 0,
        },
    }, 200


@dashboard_bp.get("/top-products")
@auth_required
def top_products():
    """Best sellers by revenue over the trailing window."""
    try:
        days = int(request.args.get("days", 30))
        limit = int(request.args.get("limit", 5))
    except ValueError:
        raise ApiError("`days` and `limit` must be integers.") from None

    start = date.today() - timedelta(days=max(days, 1) - 1)

    rows = db.session.execute(
        select(
            Product.id,
            Product.name,
            Product.sku,
            func.coalesce(func.sum(Sale.quantity), 0).label("units"),
            func.coalesce(func.sum(Sale.quantity * Sale.sale_price), 0).label("revenue"),
        )
        .join(Sale, Sale.product_id == Product.id)
        .where(Sale.sale_date >= start)
        .group_by(Product.id, Product.name, Product.sku)
        .order_by(func.sum(Sale.quantity * Sale.sale_price).desc())
        .limit(max(1, min(limit, 20)))
    ).all()

    return {
        "days": days,
        "items": [
            {
                "product_id": row.id,
                "name": row.name,
                "sku": row.sku,
                "units": int(row.units or 0),
                "revenue": float(row.revenue or 0),
            }
            for row in rows
        ],
    }, 200
