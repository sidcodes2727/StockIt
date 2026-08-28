"""Sales (stock out).

Same transactional guarantees as purchases, plus a stock check: the sale is
refused outright — with a per-product breakdown of what is short — rather than
being partially fulfilled.
"""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from flask import Blueprint, request
from flask_jwt_extended import current_user
from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload

from ..errors import ApiError, InsufficientStockError, NotFoundError
from ..extensions import db
from ..models import Product, Sale
from ..schemas import SaleCreateSchema, SaleSchema
from ..utils import (
    apply_sort,
    auth_required,
    generate_invoice_no,
    paginate,
    parse_date_arg,
)

sales_bp = Blueprint("sales", __name__, url_prefix="/sales")

sale_schema = SaleSchema()

SORTABLE = {
    "sale_date": Sale.sale_date,
    "quantity": Sale.quantity,
    "sale_price": Sale.sale_price,
    "invoice_no": Sale.invoice_no,
    "customer_name": Sale.customer_name,
    "id": Sale.id,
}


def _base_query():
    return select(Sale).options(joinedload(Sale.product), joinedload(Sale.creator))


def _apply_filters(query):
    start = parse_date_arg("start_date")
    end = parse_date_arg("end_date")
    if start:
        query = query.where(Sale.sale_date >= start)
    if end:
        query = query.where(Sale.sale_date <= end)

    product_id = request.args.get("product_id")
    if product_id and product_id != "all":
        try:
            query = query.where(Sale.product_id == int(product_id))
        except ValueError:
            raise ApiError("`product_id` must be an integer.") from None

    search = (request.args.get("search") or "").strip()
    if search:
        needle = f"%{search}%"
        query = query.where(
            or_(Sale.invoice_no.ilike(needle), Sale.customer_name.ilike(needle))
        )

    return query


@sales_bp.get("")
@auth_required
def list_sales():
    query = _apply_filters(_base_query())
    query = apply_sort(query, SORTABLE, default="sale_date", default_dir="desc")

    result = paginate(query, sale_schema)

    totals = db.session.execute(
        _apply_filters(
            select(
                func.coalesce(func.sum(Sale.quantity * Sale.sale_price), 0),
                func.coalesce(func.sum(Sale.quantity), 0),
                func.count(func.distinct(Sale.invoice_no)),
            )
        )
    ).one()
    result["summary"] = {
        "total_revenue": float(totals[0] or 0),
        "total_units": int(totals[1] or 0),
        "invoice_count": int(totals[2] or 0),
    }
    return result, 200


@sales_bp.get("/<int:sale_id>")
@auth_required
def get_sale(sale_id: int):
    sale = db.session.get(Sale, sale_id)
    if sale is None:
        raise NotFoundError("That sale record does not exist.")
    return {"sale": sale_schema.dump(sale)}, 200


@sales_bp.get("/invoice/<invoice_no>")
@auth_required
def get_invoice(invoice_no: str):
    """Everything the printable receipt view needs, in one call."""
    lines = db.session.scalars(
        _base_query().where(Sale.invoice_no == invoice_no).order_by(Sale.id)
    ).unique().all()

    if not lines:
        raise NotFoundError(f"No sale found with invoice number {invoice_no}.")

    first = lines[0]
    items = [
        {
            "id": line.id,
            "product_id": line.product_id,
            "product_name": line.product.name if line.product else "(deleted product)",
            "product_sku": line.product.sku if line.product else None,
            "quantity": line.quantity,
            "sale_price": float(line.sale_price),
            "line_total": float(line.line_total),
        }
        for line in lines
    ]

    return {
        "invoice_no": invoice_no,
        "sale_date": first.sale_date.isoformat(),
        "customer_name": first.customer_name,
        "created_by": first.creator.name if first.creator else None,
        "created_at": first.created_at.isoformat() if first.created_at else None,
        "items": items,
        "total_units": sum(line.quantity for line in lines),
        "total_amount": float(sum(line.line_total for line in lines)),
    }, 200


@sales_bp.post("")
@auth_required
def create_sale():
    payload = SaleCreateSchema().load(request.get_json(silent=True) or {})

    # Aggregate first: two lines of 5 against 8 units in stock must fail, even
    # though neither line exceeds stock on its own.
    requested: dict[int, int] = defaultdict(int)
    for item in payload["items"]:
        requested[item["product_id"]] += item["quantity"]

    sale_date = payload["sale_date"]
    customer_name = (payload.get("customer_name") or "").strip() or None

    try:
        locked: dict[int, Product] = {}
        for product_id in sorted(requested):
            product = db.session.execute(
                select(Product).where(Product.id == product_id).with_for_update()
            ).scalar_one_or_none()
            if product is None:
                raise ApiError(
                    "One of the selected products no longer exists.",
                    status_code=422,
                    code="VALIDATION_ERROR",
                    details={"items": [f"Product id {product_id} does not exist."]},
                )
            locked[product_id] = product

        # Validate the whole basket before mutating anything, so the error message
        # can list every shortfall at once instead of only the first.
        shortfalls = []
        for product_id, needed in requested.items():
            product = locked[product_id]
            if product.quantity < needed:
                shortfalls.append(
                    {
                        "product_id": product.id,
                        "product_name": product.name,
                        "sku": product.sku,
                        "requested": needed,
                        "available": product.quantity,
                        "short_by": needed - product.quantity,
                    }
                )

        if shortfalls:
            if len(shortfalls) == 1:
                only = shortfalls[0]
                message = (
                    f"Not enough stock for \"{only['product_name']}\" — "
                    f"{only['available']} in stock, {only['requested']} requested."
                )
            else:
                names = ", ".join(s["product_name"] for s in shortfalls)
                message = f"Not enough stock for {len(shortfalls)} products: {names}."
            raise InsufficientStockError(message, details={"shortfalls": shortfalls})

        invoice_no = generate_invoice_no(sale_date)
        created: list[Sale] = []

        for item in payload["items"]:
            product = locked[item["product_id"]]
            sale_price = item.get("sale_price")
            if sale_price is None:
                sale_price = product.unit_price or Decimal("0.00")

            product.quantity = product.quantity - item["quantity"]

            line = Sale(
                invoice_no=invoice_no,
                product_id=product.id,
                quantity=item["quantity"],
                sale_price=sale_price,
                customer_name=customer_name,
                sale_date=sale_date,
                created_by=current_user.id if current_user else None,
            )
            db.session.add(line)
            created.append(line)

        db.session.commit()
    except Exception:
        # Stock deduction and sale rows stand or fall together.
        db.session.rollback()
        raise

    total_amount = float(sum(line.line_total for line in created))
    total_units = sum(line.quantity for line in created)

    return {
        "invoice_no": invoice_no,
        "items": sale_schema.dump(created, many=True),
        "total_amount": total_amount,
        "total_units": total_units,
        "message": f"Sale {invoice_no} recorded — {total_units} unit(s) sold.",
    }, 201
