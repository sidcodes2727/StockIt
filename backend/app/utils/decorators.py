"""Auth / authorisation decorators."""

from __future__ import annotations

from functools import wraps

from flask_jwt_extended import current_user, verify_jwt_in_request

from ..errors import ForbiddenError, UnauthorizedError
from ..models import UserRole


def _ensure_identity() -> None:
    verify_jwt_in_request()
    if current_user is None:
        raise UnauthorizedError("Your session is no longer valid. Please sign in again.")
    if not current_user.is_active:
        raise ForbiddenError(
            "This account has been deactivated. Contact an administrator."
        )


def auth_required(fn):
    """Any signed-in, active user."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        _ensure_identity()
        return fn(*args, **kwargs)

    return wrapper


def role_required(*roles: str):
    """Restrict a route to the given roles.

    Usage::

        @role_required(UserRole.ADMIN)
        def delete_user(...): ...
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            _ensure_identity()
            if current_user.role not in roles:
                raise ForbiddenError(
                    "Your role does not have permission to perform this action."
                )
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def admin_required(fn):
    """Shorthand for ``role_required(UserRole.ADMIN)``."""
    return role_required(UserRole.ADMIN)(fn)
