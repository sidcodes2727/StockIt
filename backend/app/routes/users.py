"""User management. Admin-only — enforced by ``@admin_required`` on every route."""

from __future__ import annotations

from flask import Blueprint, request
from flask_jwt_extended import current_user
from sqlalchemy import func, or_, select

from ..errors import ApiError, ConflictError, NotFoundError
from ..extensions import db
from ..models import Purchase, Sale, User, UserRole
from ..schemas import UserCreateSchema, UserSchema, UserUpdateSchema
from ..utils import admin_required, apply_sort, paginate

users_bp = Blueprint("users", __name__, url_prefix="/users")

user_schema = UserSchema()

SORTABLE = {
    "name": User.name,
    "email": User.email,
    "role": User.role,
    "created_at": User.created_at,
}


def _get_or_404(user_id: int) -> User:
    user = db.session.get(User, user_id)
    if user is None:
        raise NotFoundError("That user does not exist.")
    return user


def _assert_email_available(email: str, exclude_id: int | None = None) -> None:
    query = select(User).where(func.lower(User.email) == email.lower())
    if exclude_id is not None:
        query = query.where(User.id != exclude_id)
    if db.session.scalar(query) is not None:
        raise ApiError(
            "That email address is already registered.",
            status_code=422,
            code="VALIDATION_ERROR",
            details={"email": ["That email address is already registered."]},
        )


def _count_other_active_admins(exclude_id: int) -> int:
    return (
        db.session.scalar(
            select(func.count(User.id)).where(
                User.role == UserRole.ADMIN,
                User.is_active.is_(True),
                User.id != exclude_id,
            )
        )
        or 0
    )


@users_bp.get("")
@admin_required
def list_users():
    search = (request.args.get("search") or "").strip()

    query = select(User)
    if search:
        needle = f"%{search}%"
        query = query.where(or_(User.name.ilike(needle), User.email.ilike(needle)))

    role = request.args.get("role")
    if role and role != "all":
        if role not in UserRole.ALL:
            raise ApiError("`role` must be 'admin' or 'staff'.")
        query = query.where(User.role == role)

    status = request.args.get("status")
    if status == "active":
        query = query.where(User.is_active.is_(True))
    elif status == "inactive":
        query = query.where(User.is_active.is_(False))

    query = apply_sort(query, SORTABLE, default="name")
    return paginate(query, user_schema), 200


@users_bp.get("/<int:user_id>")
@admin_required
def get_user(user_id: int):
    user = _get_or_404(user_id)

    activity = db.session.execute(
        select(
            select(func.count(Sale.id))
            .where(Sale.created_by == user.id)
            .scalar_subquery(),
            select(func.count(Purchase.id))
            .where(Purchase.created_by == user.id)
            .scalar_subquery(),
        )
    ).one()

    return {
        "user": user_schema.dump(user),
        "activity": {
            "sales_recorded": int(activity[0] or 0),
            "purchases_recorded": int(activity[1] or 0),
        },
    }, 200


@users_bp.post("")
@admin_required
def create_user():
    payload = UserCreateSchema().load(request.get_json(silent=True) or {})

    email = payload["email"].strip().lower()
    _assert_email_available(email)

    user = User(
        name=payload["name"].strip(),
        email=email,
        role=payload["role"],
        is_active=payload["is_active"],
    )
    user.set_password(payload["password"])

    try:
        db.session.add(user)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return {
        "user": user_schema.dump(user),
        "message": f"{user.name} added as {user.role}.",
    }, 201


@users_bp.put("/<int:user_id>")
@users_bp.patch("/<int:user_id>")
@admin_required
def update_user(user_id: int):
    user = _get_or_404(user_id)
    payload = UserUpdateSchema().load(request.get_json(silent=True) or {})

    is_self = current_user is not None and current_user.id == user.id

    # Guard rails against an admin locking themselves — or everyone — out.
    if is_self and payload.get("role") == UserRole.STAFF:
        raise ConflictError(
            "You cannot change your own role. Ask another administrator to do it."
        )
    if is_self and payload.get("is_active") is False:
        raise ConflictError("You cannot deactivate your own account.")

    losing_admin = user.role == UserRole.ADMIN and (
        payload.get("role") == UserRole.STAFF or payload.get("is_active") is False
    )
    if losing_admin and _count_other_active_admins(user.id) == 0:
        raise ConflictError(
            "This is the only active administrator. Promote another user to admin first."
        )

    if "email" in payload:
        email = payload["email"].strip().lower()
        _assert_email_available(email, exclude_id=user.id)
        user.email = email

    if "name" in payload:
        user.name = payload["name"].strip()
    if "role" in payload:
        user.role = payload["role"]
    if "is_active" in payload:
        user.is_active = payload["is_active"]
    if "password" in payload:
        user.set_password(payload["password"])

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return {"user": user_schema.dump(user), "message": f"{user.name} updated."}, 200


@users_bp.post("/<int:user_id>/deactivate")
@admin_required
def deactivate_user(user_id: int):
    user = _get_or_404(user_id)

    if current_user is not None and current_user.id == user.id:
        raise ConflictError("You cannot deactivate your own account.")
    if user.role == UserRole.ADMIN and _count_other_active_admins(user.id) == 0:
        raise ConflictError(
            "This is the only active administrator. Promote another user to admin first."
        )
    if not user.is_active:
        return {"user": user_schema.dump(user), "message": f"{user.name} is already inactive."}, 200

    user.is_active = False
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return {
        "user": user_schema.dump(user),
        "message": f"{user.name} has been deactivated and can no longer sign in.",
    }, 200


@users_bp.post("/<int:user_id>/activate")
@admin_required
def activate_user(user_id: int):
    user = _get_or_404(user_id)
    user.is_active = True

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return {
        "user": user_schema.dump(user),
        "message": f"{user.name} has been reactivated.",
    }, 200


@users_bp.delete("/<int:user_id>")
@admin_required
def delete_user(user_id: int):
    """Permanently remove an account.

    Refused once the user has recorded transactions — deactivation keeps the
    audit trail intact, which is what you want for anyone who has touched stock.
    """
    user = _get_or_404(user_id)

    if current_user is not None and current_user.id == user.id:
        raise ConflictError("You cannot delete your own account.")
    if user.role == UserRole.ADMIN and _count_other_active_admins(user.id) == 0:
        raise ConflictError("This is the only active administrator and cannot be deleted.")

    sales = db.session.scalar(
        select(func.count(Sale.id)).where(Sale.created_by == user.id)
    )
    purchases = db.session.scalar(
        select(func.count(Purchase.id)).where(Purchase.created_by == user.id)
    )
    if sales or purchases:
        raise ConflictError(
            f"{user.name} has recorded {sales or 0} sale(s) and {purchases or 0} "
            "purchase(s). Deactivate the account instead so the history is preserved.",
            code="HAS_TRANSACTIONS",
        )

    name = user.name
    try:
        db.session.delete(user)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return {"message": f"{name} deleted."}, 200
