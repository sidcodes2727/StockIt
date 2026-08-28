"""Purchases (stock in).

Recording a purchase must increase stock *and* write the purchase rows, or do
neither. Both happen inside one transaction, and the affected product rows are
locked with ``SELECT ... FOR UPDATE`` so two concurrent purchases cannot
interleave their read-modify-write of ``Product.quantity``.
"""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from flask import Blueprint, request
from flask_jwt_extended import current_user
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from ..errors import ApiError, NotFoundError
from ..extensions import db
from ..models import Product, Purchase, Supplier
from ..schemas import PurchaseCreateSchema, PurchaseSchema
from ..utils import (
    apply_sort,
    auth_required,
    generate_purchase_reference,
    paginate,
    parse_date_arg,
)

purchases_bp = Blueprint("purchases", __name__, url_prefix="/purchases")

purchase_schema = PurchaseSchema()

SORTABLE = {
    "purchase_date": Purchase.purchase_date,
    "quantity": Purchase.quantity,
    "cost_price": Purchase.cost_price,
    "reference_no": Purchase.reference_no,
    "id": Purchase.id,
}


def _base_query():
    return select(Purchase).options(
        joinedload(Purchase.product),
        joinedload(Purchase.supplier),
        joinedload(Purchase.creator),
    )


def _apply_filters(query):
    start = parse_date_arg("start_date")
    end = parse_date_arg("end_date")
    if start:
        query = query.where(Purchase.purchase_date >= start)
    if end:
        query = query.where(Purchase.purchase_date <= end)

    supplier_id = request.args.get("supplier_id")
    if supplier_id and supplier_id != "all":
        try:
            query = query.where(Purchase.supplier_id == int(supplier_id))
        except ValueError:
            raise ApiError("`supplier_id` must be an integer.") from None

    product_id = request.args.get("product_id")
    if product_id and product_id != "all":
        try:
            query = query.where(Purchase.product_id == int(product_id))
        except ValueError:
            raise ApiError("`product_id` must be an integer.") from None

    search = (request.args.get("search") or "").strip()
    if search:
        query = query.where(Purchase.reference_no.ilike(f"%{search}%"))

    return query


@purchases_bp.get("")
@auth_required
def list_purchases():
    query = _apply_filters(_base_query())
    query = apply_sort(query, SORTABLE, default="purchase_date", default_dir="desc")

    result = paginate(query, purchase_schema)

    totals = db.session.execute(
        _apply_filters(
            select(
                func.coalesce(func.sum(Purchase.quantity * Purchase.cost_price), 0),
                func.coalesce(func.sum(Purchase.quantity), 0),
            )
        )
    ).one()
    result["summary"] = {
        "total_value": float(totals[0] or 0),
        "total_units": int(totals[1] or 0),
    }
    return result, 200


@purchases_bp.get("/<int:purchase_id>")
@auth_required
def get_purchase(purchase_id: int):
    purchase = db.session.get(Purchase, purchase_id)
    if purchase is None:
        raise NotFoundError("That purchase record does not exist.")
    return {"purchase": purchase_schema.dump(purchase)}, 200


@purchases_bp.get("/reference/<reference_no>")
@auth_required
def get_purchase_group(reference_no: str):
    """All lines filed under one goods-received reference."""
    lines = db.session.scalars(
        _base_query()
        .where(Purchase.reference_no == reference_no)
        .order_by(Purchase.id)
    ).unique().all()

    if not lines:
        raise NotFoundError(f"No purchase found with reference {reference_no}.")

    first = lines[0]
    return {
        "reference_no": reference_no,
        "purchase_date": first.purchase_date.isoformat(),
        "supplier": (
            {"id": first.supplier.id, "name": first.supplier.name}
            if first.supplier
            else None
        ),
        "created_by": first.creator.name if first.creator else None,
        "items": purchase_schema.dump(lines, many=True),
        "total_value": float(sum(line.line_total for line in lines)),
        "total_units": sum(line.quantity for line in lines),
    }, 200


@purchases_bp.post("")
@auth_required
def create_purchase():
    payload = PurchaseCreateSchema().load(request.get_json(silent=True) or {})

    supplier_id = payload.get("supplier_id")
    if supplier_id is not None and db.session.get(Supplier, supplier_id) is None:
        raise ApiError(
            "That supplier does not exist.",
            status_code=422,
            code="VALIDATION_ERROR",
            details={"supplier_id": ["That supplier does not exist."]},
        )

    # Collapse repeated products so each row is locked exactly once, while still
    # writing one purchase line per submitted entry.
    requested: dict[int, int] = defaultdict(int)
    for item in payload["items"]:
        requested[item["product_id"]] += item["quantity"]

    purchase_date = payload["purchase_date"]
    update_cost_price = payload["update_cost_price"]

    try:
        # Lock in a stable order (ascending id) so concurrent transactions
        # touching the same products can never deadlock against each other.
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

        reference_no = generate_purchase_reference(purchase_date)
        created: list[Purchase] = []

        for item in payload["items"]:
            product = locked[item["product_id"]]
            cost_price = item.get("cost_price")
            if cost_price is None:
                cost_price = product.cost_price or Decimal("0.00")

            product.quantity = product.quantity + item["quantity"]
            if update_cost_price:
                product.cost_price = cost_price

            line = Purchase(
                reference_no=reference_no,
                product_id=product.id,
                supplier_id=supplier_id,
                quantity=item["quantity"],
                cost_price=cost_price,
                purchase_date=purchase_date,
                created_by=current_user.id if current_user else None,
            )
            db.session.add(line)
            created.append(line)

        db.session.commit()
    except Exception:
        # Nothing is persisted unless every stock update and every line succeeded.
        db.session.rollback()
        raise

    total_value = float(sum(line.line_total for line in created))
    total_units = sum(line.quantity for line in created)

    return {
        "reference_no": reference_no,
        "items": purchase_schema.dump(created, many=True),
        "total_value": total_value,
        "total_units": total_units,
        "message": (
            f"Purchase {reference_no} recorded — {total_units} unit(s) added to stock."
        ),
    }, 201
