"""Authentication: login, token refresh, profile, password change."""

from __future__ import annotations

from flask import Blueprint, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    current_user,
    jwt_required,
)
from sqlalchemy import func, select

from ..errors import ConflictError, ForbiddenError, UnauthorizedError
from ..extensions import db
from ..models import User
from ..schemas import (
    ChangePasswordSchema,
    LoginSchema,
    ProfileUpdateSchema,
    UserSchema,
)
from ..utils import auth_required

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

user_schema = UserSchema()


def _tokens_for(user: User) -> dict:
    """Issue an access/refresh pair with the role embedded as a claim."""
    claims = {"role": user.role, "name": user.name}
    return {
        "access_token": create_access_token(identity=user, additional_claims=claims),
        "refresh_token": create_refresh_token(identity=user, additional_claims=claims),
    }


@auth_bp.post("/login")
def login():
    payload = LoginSchema().load(request.get_json(silent=True) or {})

    user = db.session.scalar(
        select(User).where(func.lower(User.email) == payload["email"].strip().lower())
    )

    # One generic message for both "no such email" and "wrong password" so the
    # endpoint cannot be used to enumerate registered accounts. check_password is
    # still called on a miss to keep the timing profile similar.
    if user is None or not user.check_password(payload["password"]):
        raise UnauthorizedError("Incorrect email or password.", code="INVALID_CREDENTIALS")

    if not user.is_active:
        raise ForbiddenError(
            "This account has been deactivated. Contact an administrator.",
            code="ACCOUNT_INACTIVE",
        )

    return {**_tokens_for(user), "user": user_schema.dump(user)}, 200


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    if current_user is None or not current_user.is_active:
        raise UnauthorizedError("Your session is no longer valid. Please sign in again.")

    claims = {"role": current_user.role, "name": current_user.name}
    return {
        "access_token": create_access_token(identity=current_user, additional_claims=claims),
        "user": user_schema.dump(current_user),
    }, 200


@auth_bp.post("/logout")
@auth_required
def logout():
    """Stateless logout.

    Tokens are self-contained and short-lived, so the client discards them. This
    endpoint exists so the frontend has a single place to call, and so a token
    blocklist can be added later without changing the API surface.
    """
    return {"message": "Signed out successfully."}, 200


@auth_bp.get("/me")
@auth_required
def me():
    return {"user": user_schema.dump(current_user)}, 200


@auth_bp.patch("/me")
@auth_required
def update_me():
    payload = ProfileUpdateSchema().load(request.get_json(silent=True) or {})

    if "email" in payload:
        new_email = payload["email"].strip().lower()
        clash = db.session.scalar(
            select(User).where(
                func.lower(User.email) == new_email, User.id != current_user.id
            )
        )
        if clash is not None:
            raise ConflictError("That email address is already in use.")
        current_user.email = new_email

    if "name" in payload:
        current_user.name = payload["name"].strip()

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return {"user": user_schema.dump(current_user), "message": "Profile updated."}, 200


@auth_bp.post("/change-password")
@auth_required
def change_password():
    payload = ChangePasswordSchema().load(request.get_json(silent=True) or {})

    if not current_user.check_password(payload["current_password"]):
        raise UnauthorizedError(
            "Your current password is incorrect.", code="INVALID_CREDENTIALS"
        )

    current_user.set_password(payload["new_password"])
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return {"message": "Password changed successfully."}, 200
