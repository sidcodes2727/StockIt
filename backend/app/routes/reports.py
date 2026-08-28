"""Reports: stock valuation, sales, purchases and low stock.

Each report shares one query builder between the JSON, CSV and PDF responses, so
an export can never drift from what the screen shows. Pick the shape with
``?format=json|csv|pdf``.
"""

from __future__ import annotations

from datetime import date, timedelta

from flask import Blueprint, request
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from ..errors import ApiError
from ..extensions import db
from ..models import Category, Product, Purchase, Sale, Supplier
from ..utils import auth_required, csv_response, get_date_range, pdf_table_response
from .products import NEEDS_REORDER

reports_bp = Blueprint("reports", __name__, url_prefix="/reports")

VALID_FORMATS = {"json", "csv", "pdf"}


def _requested_format() -> str:
    fmt = (request.args.get("format") or "json").lower()
    if fmt not in VALID_FORMATS:
        raise ApiError("`format` must be one of: json, csv, pdf.")
    return fmt


def _money(value) -> float:
    return round(float(value or 0), 2)


def _fmt(value) -> str:
    """Thousands-separated 2dp string for CSV/PDF cells."""
    return f"{float(value or 0):,.2f}"


# --------------------------------------------------------------------------- #
# Stock report
# --------------------------------------------------------------------------- #
@reports_bp.get("/stock")
@auth_required
def stock_report():
    query = (
        select(Product)
        .options(joinedload(Product.category), joinedload(Product.supplier))
        .order_by(Product.name)
    )

    category_id = request.args.get("category_id")
    if category_id and category_id != "all":
        try:
            query = query.where(Product.category_id == int(category_id))
        except ValueError:
            raise ApiError("`category_id` must be an integer.") from None

    products = db.session.scalars(query).unique().all()

    rows = [
        {
            "sku": p.sku,
            "name": p.name,
            "category": p.category.name if p.category else "Uncategorised",
            "supplier": p.supplier.name if p.supplier else "—",
            "quantity": p.quantity,
            "reorder_level": p.reorder_level,
            "cost_price": _money(p.cost_price),
            "unit_price": _money(p.unit_price),
            "stock_value": _money(p.stock_value),
            "retail_value": _money(p.retail_value),
            "stock_status": p.stock_status,
        }
        for p in products
    ]

    totals = {
        "product_count": len(rows),
        "total_units": sum(r["quantity"] for r in rows),
        "total_stock_value": round(sum(r["stock_value"] for r in rows), 2),
        "total_retail_value": round(sum(r["retail_value"] for r in rows), 2),
        "low_stock_count": sum(1 for r in rows if r["stock_status"] == "low_stock"),
        "out_of_stock_count": sum(1 for r in rows if r["stock_status"] == "out_of_stock"),
    }
    totals["potential_margin"] = round(
        totals["total_retail_value"] - totals["total_stock_value"], 2
    )

    fmt = _requested_format()
    headers = [
        "SKU",
        "Product",
        "Category",
        "Supplier",
        "Qty",
        "Reorder level",
        "Cost price",
        "Unit price",
        "Stock value",
        "Retail value",
        "Status",
    ]
    table = [
        [
            r["sku"],
            r["name"],
            r["category"],
            r["supplier"],
            r["quantity"],
            r["reorder_level"],
            _fmt(r["cost_price"]),
            _fmt(r["unit_price"]),
            _fmt(r["stock_value"]),
            _fmt(r["retail_value"]),
            r["stock_status"].replace("_", " ").title(),
        ]
        for r in rows
    ]

    if fmt == "csv":
        return csv_response(f"stock-report-{date.today().isoformat()}.csv", headers, table)
    if fmt == "pdf":
        return pdf_table_response(
            f"stock-report-{date.today().isoformat()}.pdf",
            "Stock Report",
            f"Current inventory valuation as at {date.today().strftime('%d %B %Y')}",
            headers,
            table,
            summary=[
                ("Products", str(totals["product_count"])),
                ("Total units", f"{totals['total_units']:,}"),
                ("Stock value (cost)", _fmt(totals["total_stock_value"])),
                ("Stock value (retail)", _fmt(totals["total_retail_value"])),
                ("Low stock items", str(totals["low_stock_count"])),
                ("Out of stock", str(totals["out_of_stock_count"])),
            ],
            numeric_columns=(4, 5, 6, 7, 8, 9),
        )

    return {"generated_at": date.today().isoformat(), "totals": totals, "rows": rows}, 200


# --------------------------------------------------------------------------- #
# Sales report
# --------------------------------------------------------------------------- #
@reports_bp.get("/sales")
@auth_required
def sales_report():
    start, end = get_date_range(default_days=30)
    group_by = (request.args.get("group_by") or "day").lower()
    if group_by not in {"day", "product", "category"}:
        raise ApiError("`group_by` must be one of: day, product, category.")

    base_filters = [Sale.sale_date >= start, Sale.sale_date <= end]

    revenue = func.coalesce(func.sum(Sale.quantity * Sale.sale_price), 0)
    units = func.coalesce(func.sum(Sale.quantity), 0)

    if group_by == "day":
        rows_raw = db.session.execute(
            select(Sale.sale_date, units, revenue, func.count(func.distinct(Sale.invoice_no)))
            .where(*base_filters)
            .group_by(Sale.sale_date)
            .order_by(Sale.sale_date)
        ).all()

        # Zero-fill so the chart's x-axis stays continuous.
        by_day = {row[0]: row for row in rows_raw}
        rows = []
        cursor = start
        while cursor <= end:
            row = by_day.get(cursor)
            rows.append(
                {
                    "key": cursor.isoformat(),
                    "label": cursor.strftime("%d %b %Y"),
                    "units": int(row[1]) if row else 0,
                    "revenue": _money(row[2]) if row else 0.0,
                    "invoices": int(row[3]) if row else 0,
                }
            )
            cursor += timedelta(days=1)

    elif group_by == "product":
        rows_raw = db.session.execute(
            select(Product.id, Product.name, Product.sku, units, revenue)
            .join(Sale, Sale.product_id == Product.id)
            .where(*base_filters)
            .group_by(Product.id, Product.name, Product.sku)
            .order_by(revenue.desc())
        ).all()
        rows = [
            {
                "key": str(row[0]),
                "label": row[1],
                "sku": row[2],
                "units": int(row[3] or 0),
                "revenue": _money(row[4]),
                "invoices": None,
            }
            for row in rows_raw
        ]

    else:  # category
        rows_raw = db.session.execute(
            select(
                func.coalesce(Category.name, "Uncategorised"),
                units,
                revenue,
            )
            .select_from(Sale)
            .join(Product, Sale.product_id == Product.id)
            .outerjoin(Category, Product.category_id == Category.id)
            .where(*base_filters)
            .group_by(func.coalesce(Category.name, "Uncategorised"))
            .order_by(revenue.desc())
        ).all()
        rows = [
            {
                "key": row[0],
                "label": row[0],
                "units": int(row[1] or 0),
                "revenue": _money(row[2]),
                "invoices": None,
            }
            for row in rows_raw
        ]

    grand = db.session.execute(
        select(units, revenue, func.count(func.distinct(Sale.invoice_no))).where(
            *base_filters
        )
    ).one()

    span_days = (end - start).days + 1
    totals = {
        "total_units": int(grand[0] or 0),
        "total_revenue": _money(grand[1]),
        "invoice_count": int(grand[2] or 0),
        "average_order_value": (
            round(float(grand[1] or 0) / grand[2], 2) if grand[2] else 0.0
        ),
        "average_daily_revenue": round(float(grand[1] or 0) / span_days, 2),
        "days": span_days,
    }

    fmt = _requested_format()
    label_header = {"day": "Date", "product": "Product", "category": "Category"}[group_by]
    if group_by == "product":
        headers = [label_header, "SKU", "Units sold", "Revenue"]
        table = [[r["label"], r.get("sku", ""), r["units"], _fmt(r["revenue"])] for r in rows]
        numeric = (2, 3)
    elif group_by == "day":
        headers = [label_header, "Invoices", "Units sold", "Revenue"]
        table = [[r["label"], r["invoices"], r["units"], _fmt(r["revenue"])] for r in rows]
        numeric = (1, 2, 3)
    else:
        headers = [label_header, "Units sold", "Revenue"]
        table = [[r["label"], r["units"], _fmt(r["revenue"])] for r in rows]
        numeric = (1, 2)

    stem = f"sales-report-{group_by}-{start.isoformat()}-to-{end.isoformat()}"
    if fmt == "csv":
        return csv_response(f"{stem}.csv", headers, table)
    if fmt == "pdf":
        return pdf_table_response(
            f"{stem}.pdf",
            "Sales Report",
            f"{start.strftime('%d %b %Y')} to {end.strftime('%d %b %Y')} · grouped by {group_by}",
            headers,
            table,
            summary=[
                ("Period", f"{span_days} day(s)"),
                ("Invoices", str(totals["invoice_count"])),
                ("Units sold", f"{totals['total_units']:,}"),
                ("Total revenue", _fmt(totals["total_revenue"])),
                ("Avg order value", _fmt(totals["average_order_value"])),
                ("Avg daily revenue", _fmt(totals["average_daily_revenue"])),
            ],
            numeric_columns=numeric,
        )

    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "group_by": group_by,
        "totals": totals,
        "rows": rows,
    }, 200


# --------------------------------------------------------------------------- #
# Purchase report
# --------------------------------------------------------------------------- #
@reports_bp.get("/purchases")
@auth_required
def purchase_report():
    start, end = get_date_range(default_days=30)
    group_by = (request.args.get("group_by") or "day").lower()
    if group_by not in {"day", "supplier", "product"}:
        raise ApiError("`group_by` must be one of: day, supplier, product.")

    filters = [Purchase.purchase_date >= start, Purchase.purchase_date <= end]

    supplier_id = request.args.get("supplier_id")
    if supplier_id and supplier_id != "all":
        try:
            filters.append(Purchase.supplier_id == int(supplier_id))
        except ValueError:
            raise ApiError("`supplier_id` must be an integer.") from None

    cost = func.coalesce(func.sum(Purchase.quantity * Purchase.cost_price), 0)
    units = func.coalesce(func.sum(Purchase.quantity), 0)

    if group_by == "day":
        rows_raw = db.session.execute(
            select(Purchase.purchase_date, units, cost)
            .where(*filters)
            .group_by(Purchase.purchase_date)
            .order_by(Purchase.purchase_date)
        ).all()
        by_day = {row[0]: row for row in rows_raw}
        rows = []
        cursor = start
        while cursor <= end:
            row = by_day.get(cursor)
            rows.append(
                {
                    "key": cursor.isoformat(),
                    "label": cursor.strftime("%d %b %Y"),
                    "units": int(row[1]) if row else 0,
                    "cost": _money(row[2]) if row else 0.0,
                }
            )
            cursor += timedelta(days=1)

    elif group_by == "supplier":
        rows_raw = db.session.execute(
            select(func.coalesce(Supplier.name, "Unknown supplier"), units, cost)
            .select_from(Purchase)
            .outerjoin(Supplier, Purchase.supplier_id == Supplier.id)
            .where(*filters)
            .group_by(func.coalesce(Supplier.name, "Unknown supplier"))
            .order_by(cost.desc())
        ).all()
        rows = [
            {"key": row[0], "label": row[0], "units": int(row[1] or 0), "cost": _money(row[2])}
            for row in rows_raw
        ]

    else:  # product
        rows_raw = db.session.execute(
            select(Product.name, Product.sku, units, cost)
            .join(Purchase, Purchase.product_id == Product.id)
            .where(*filters)
            .group_by(Product.id, Product.name, Product.sku)
            .order_by(cost.desc())
        ).all()
        rows = [
            {
                "key": row[1],
                "label": row[0],
                "sku": row[1],
                "units": int(row[2] or 0),
                "cost": _money(row[3]),
            }
            for row in rows_raw
        ]

    grand = db.session.execute(
        select(units, cost, func.count(func.distinct(Purchase.reference_no))).where(*filters)
    ).one()

    span_days = (end - start).days + 1
    totals = {
        "total_units": int(grand[0] or 0),
        "total_cost": _money(grand[1]),
        "purchase_count": int(grand[2] or 0),
        "days": span_days,
    }

    fmt = _requested_format()
    label_header = {"day": "Date", "supplier": "Supplier", "product": "Product"}[group_by]
    if group_by == "product":
        headers = [label_header, "SKU", "Units received", "Total cost"]
        table = [[r["label"], r.get("sku", ""), r["units"], _fmt(r["cost"])] for r in rows]
        numeric = (2, 3)
    else:
        headers = [label_header, "Units received", "Total cost"]
        table = [[r["label"], r["units"], _fmt(r["cost"])] for r in rows]
        numeric = (1, 2)

    stem = f"purchase-report-{group_by}-{start.isoformat()}-to-{end.isoformat()}"
    if fmt == "csv":
        return csv_response(f"{stem}.csv", headers, table)
    if fmt == "pdf":
        return pdf_table_response(
            f"{stem}.pdf",
            "Purchase Report",
            f"{start.strftime('%d %b %Y')} to {end.strftime('%d %b %Y')} · grouped by {group_by}",
            headers,
            table,
            summary=[
                ("Period", f"{span_days} day(s)"),
                ("Purchase orders", str(totals["purchase_count"])),
                ("Units received", f"{totals['total_units']:,}"),
                ("Total cost", _fmt(totals["total_cost"])),
            ],
            numeric_columns=numeric,
        )

    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "group_by": group_by,
        "totals": totals,
        "rows": rows,
    }, 200


# --------------------------------------------------------------------------- #
# Low stock report
# --------------------------------------------------------------------------- #
@reports_bp.get("/low-stock")
@auth_required
def low_stock_report():
    products = db.session.scalars(
        select(Product)
        .options(joinedload(Product.category), joinedload(Product.supplier))
        .where(NEEDS_REORDER)
        .order_by(Product.quantity.asc(), Product.name.asc())
    ).unique().all()

    rows = []
    for p in products:
        shortfall = max(p.reorder_level - p.quantity, 0)
        rows.append(
            {
                "id": p.id,
                "sku": p.sku,
                "name": p.name,
                "category": p.category.name if p.category else "Uncategorised",
                "supplier": p.supplier.name if p.supplier else "—",
                "supplier_phone": p.supplier.phone if p.supplier else None,
                "quantity": p.quantity,
                "reorder_level": p.reorder_level,
                "shortfall": shortfall,
                "cost_price": _money(p.cost_price),
                "restock_cost": _money((p.cost_price or 0) * shortfall),
                "stock_status": p.stock_status,
            }
        )

    totals = {
        "item_count": len(rows),
        "out_of_stock_count": sum(1 for r in rows if r["stock_status"] == "out_of_stock"),
        "total_shortfall_units": sum(r["shortfall"] for r in rows),
        "estimated_restock_cost": round(sum(r["restock_cost"] for r in rows), 2),
    }

    fmt = _requested_format()
    headers = [
        "SKU",
        "Product",
        "Category",
        "Supplier",
        "In stock",
        "Reorder level",
        "Shortfall",
        "Restock cost",
        "Status",
    ]
    table = [
        [
            r["sku"],
            r["name"],
            r["category"],
            r["supplier"],
            r["quantity"],
            r["reorder_level"],
            r["shortfall"],
            _fmt(r["restock_cost"]),
            r["stock_status"].replace("_", " ").title(),
        ]
        for r in rows
    ]

    stem = f"low-stock-report-{date.today().isoformat()}"
    if fmt == "csv":
        return csv_response(f"{stem}.csv", headers, table)
    if fmt == "pdf":
        return pdf_table_response(
            f"{stem}.pdf",
            "Low Stock Report",
            f"Products at or below reorder level as at {date.today().strftime('%d %B %Y')}",
            headers,
            table,
            summary=[
                ("Items needing reorder", str(totals["item_count"])),
                ("Out of stock", str(totals["out_of_stock_count"])),
                ("Units short", f"{totals['total_shortfall_units']:,}"),
                ("Est. restock cost", _fmt(totals["estimated_restock_cost"])),
            ],
            numeric_columns=(4, 5, 6, 7),
        )

    return {"generated_at": date.today().isoformat(), "totals": totals, "rows": rows}, 200
