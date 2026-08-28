"""Supplier CRUD, plus linked products and purchase history."""

from __future__ import annotations

from flask import Blueprint, request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload

from ..errors import ConflictError, NotFoundError
from ..extensions import db
from ..models import Product, Purchase, Supplier, UserRole
from ..schemas import (
    ProductSchema,
    PurchaseSchema,
    SupplierSchema,
    SupplierWriteSchema,
)
from ..utils import apply_sort, auth_required, paginate, role_required

suppliers_bp = Blueprint("suppliers", __name__, url_prefix="/suppliers")

supplier_schema = SupplierSchema()
product_schema = ProductSchema()
purchase_schema = PurchaseSchema()

SORTABLE = {
    "name": Supplier.name,
    "contact_person": Supplier.contact_person,
    "created_at": Supplier.created_at,
}


def _get_or_404(supplier_id: int) -> Supplier:
    supplier = db.session.get(Supplier, supplier_id)
    if supplier is None:
        raise NotFoundError("That supplier does not exist.")
    return supplier


def _clean(payload: dict) -> dict:
    """Trim strings and turn blank inputs into NULL rather than empty strings."""
    cleaned = {}
    for key, value in payload.items():
        if isinstance(value, str):
            value = value.strip() or None
        cleaned[key] = value
    return cleaned


@suppliers_bp.get("")
@auth_required
def list_suppliers():
    search = (request.args.get("search") or "").strip()

    query = select(Supplier)
    if search:
        needle = f"%{search.lower()}%"
        query = query.where(
            or_(
                func.lower(Supplier.name).like(needle),
                func.lower(Supplier.contact_person).like(needle),
                func.lower(Supplier.email).like(needle),
                Supplier.phone.like(f"%{search}%"),
            )
        )
    query = apply_sort(query, SORTABLE, default="name")

    # `paginate=false` returns everything, for populating <select> dropdowns.
    if (request.args.get("paginate") or "").lower() == "false":
        suppliers = list(db.session.scalars(query).all())
        return {"items": _attach_counts(suppliers)}, 200

    result = paginate(query)
    result["items"] = _attach_counts(result["items"])
    return result, 200


def _attach_counts(suppliers: list[Supplier]) -> list[dict]:
    counts = dict(
        db.session.execute(
            select(Product.supplier_id, func.count(Product.id)).group_by(
                Product.supplier_id
            )
        ).all()
    )
    payload = []
    for supplier in suppliers:
        data = supplier_schema.dump(supplier)
        data["product_count"] = int(counts.get(supplier.id, 0))
        payload.append(data)
    return payload


@suppliers_bp.get("/<int:supplier_id>")
@auth_required
def get_supplier(supplier_id: int):
    supplier = _get_or_404(supplier_id)

    products = db.session.scalars(
        select(Product)
        .options(joinedload(Product.category), joinedload(Product.supplier))
        .where(Product.supplier_id == supplier.id)
        .order_by(Product.name)
    ).all()

    totals = db.session.execute(
        select(
            func.coalesce(func.sum(Purchase.quantity * Purchase.cost_price), 0),
            func.count(Purchase.id),
        ).where(Purchase.supplier_id == supplier.id)
    ).one()

    data = supplier_schema.dump(supplier)
    data["product_count"] = len(products)

    return {
        "supplier": data,
        "products": product_schema.dump(products, many=True),
        "stats": {
            "total_purchased_value": float(totals[0] or 0),
            "purchase_count": int(totals[1] or 0),
            "product_count": len(products),
        },
    }, 200


@suppliers_bp.get("/<int:supplier_id>/purchases")
@auth_required
def supplier_purchases(supplier_id: int):
    supplier = _get_or_404(supplier_id)

    query = (
        select(Purchase)
        .options(joinedload(Purchase.product), joinedload(Purchase.creator))
        .where(Purchase.supplier_id == supplier.id)
        .order_by(Purchase.purchase_date.desc(), Purchase.id.desc())
    )
    return paginate(query, purchase_schema), 200


@suppliers_bp.post("")
@auth_required
def create_supplier():
    payload = _clean(SupplierWriteSchema().load(request.get_json(silent=True) or {}))

    supplier = Supplier(**payload)
    try:
        db.session.add(supplier)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    data = supplier_schema.dump(supplier)
    data["product_count"] = 0
    return {"supplier": data, "message": f'Supplier "{supplier.name}" created.'}, 201


@suppliers_bp.put("/<int:supplier_id>")
@auth_required
def update_supplier(supplier_id: int):
    supplier = _get_or_404(supplier_id)
    payload = _clean(SupplierWriteSchema().load(request.get_json(silent=True) or {}))

    for key, value in payload.items():
        setattr(supplier, key, value)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return {"supplier": supplier_schema.dump(supplier), "message": "Supplier updated."}, 200


@suppliers_bp.delete("/<int:supplier_id>")
@role_required(UserRole.ADMIN)
def delete_supplier(supplier_id: int):
    supplier = _get_or_404(supplier_id)

    linked = db.session.scalar(
        select(func.count(Product.id)).where(Product.supplier_id == supplier.id)
    )
    if linked:
        raise ConflictError(
            f'"{supplier.name}" supplies {linked} product(s). Reassign them before '
            "deleting this supplier."
        )

    try:
        db.session.delete(supplier)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return {"message": f'Supplier "{supplier.name}" deleted.'}, 200
