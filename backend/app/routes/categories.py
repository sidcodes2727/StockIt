"""Category CRUD."""

from __future__ import annotations

from flask import Blueprint, request
from sqlalchemy import func, select

from ..errors import ConflictError, NotFoundError
from ..extensions import db
from ..models import Category, Product
from ..schemas import CategorySchema, CategoryWriteSchema
from ..utils import auth_required, role_required
from ..models import UserRole

categories_bp = Blueprint("categories", __name__, url_prefix="/categories")

category_schema = CategorySchema()


def _with_counts(categories: list[Category]) -> list[dict]:
    """Attach product counts in one grouped query rather than N+1 lookups."""
    counts = dict(
        db.session.execute(
            select(Product.category_id, func.count(Product.id)).group_by(
                Product.category_id
            )
        ).all()
    )
    payload = []
    for category in categories:
        data = category_schema.dump(category)
        data["product_count"] = int(counts.get(category.id, 0))
        payload.append(data)
    return payload


def _get_or_404(category_id: int) -> Category:
    category = db.session.get(Category, category_id)
    if category is None:
        raise NotFoundError("That category does not exist.")
    return category


def _assert_name_available(name: str, exclude_id: int | None = None) -> None:
    query = select(Category).where(func.lower(Category.name) == name.lower())
    if exclude_id is not None:
        query = query.where(Category.id != exclude_id)
    if db.session.scalar(query) is not None:
        raise ConflictError(f'A category named "{name}" already exists.')


@categories_bp.get("")
@auth_required
def list_categories():
    """All categories. Unpaginated on purpose — it powers sidebar filters."""
    categories = db.session.scalars(select(Category).order_by(Category.name)).all()
    return {"items": _with_counts(list(categories))}, 200


@categories_bp.get("/<int:category_id>")
@auth_required
def get_category(category_id: int):
    return {"category": category_schema.dump(_get_or_404(category_id))}, 200


@categories_bp.post("")
@auth_required
def create_category():
    payload = CategoryWriteSchema().load(request.get_json(silent=True) or {})
    name = payload["name"].strip()
    _assert_name_available(name)

    category = Category(name=name, description=(payload.get("description") or None))
    try:
        db.session.add(category)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    data = category_schema.dump(category)
    data["product_count"] = 0
    return {"category": data, "message": f'Category "{name}" created.'}, 201


@categories_bp.put("/<int:category_id>")
@auth_required
def update_category(category_id: int):
    category = _get_or_404(category_id)
    payload = CategoryWriteSchema().load(request.get_json(silent=True) or {})

    name = payload["name"].strip()
    _assert_name_available(name, exclude_id=category.id)

    category.name = name
    category.description = payload.get("description") or None

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return {"category": category_schema.dump(category), "message": "Category updated."}, 200


@categories_bp.delete("/<int:category_id>")
@role_required(UserRole.ADMIN)
def delete_category(category_id: int):
    """Delete a category.

    Admin-only, and blocked while products still reference it — silently
    orphaning stock is worse than making the user reassign it first.
    """
    category = _get_or_404(category_id)

    in_use = db.session.scalar(
        select(func.count(Product.id)).where(Product.category_id == category.id)
    )
    if in_use:
        raise ConflictError(
            f'"{category.name}" still has {in_use} product(s). Reassign or delete '
            "them before removing the category."
        )

    try:
        db.session.delete(category)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return {"message": f'Category "{category.name}" deleted.'}, 200
