"""Consistent JSON error handling.

Every failure that leaves the API — validation, auth, 404, integrity violation,
unhandled exception — is serialised to the same envelope::

    {
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "The submitted data is invalid.",
        "details": {"email": ["Not a valid email address."]}
      }
    }

The frontend relies on ``error.message`` for toasts and ``error.details`` to map
field-level messages back onto form inputs.
"""

from __future__ import annotations

import logging
from typing import Any

from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError
from werkzeug.exceptions import HTTPException

from .extensions import db

logger = logging.getLogger(__name__)


class ApiError(Exception):
    """Raised anywhere in the app to abort with a structured JSON error."""

    status_code = 400
    code = "BAD_REQUEST"

    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        code: str | None = None,
        details: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        if code is not None:
            self.code = code
        self.details = details

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.details:
            payload["details"] = self.details
        return {"error": payload}


class NotFoundError(ApiError):
    status_code = 404
    code = "NOT_FOUND"


class ConflictError(ApiError):
    status_code = 409
    code = "CONFLICT"


class ForbiddenError(ApiError):
    status_code = 403
    code = "FORBIDDEN"


class UnauthorizedError(ApiError):
    status_code = 401
    code = "UNAUTHORIZED"


class InsufficientStockError(ApiError):
    """A sale asked for more units than are on hand."""

    status_code = 422
    code = "INSUFFICIENT_STOCK"


class ValidationApiError(ApiError):
    status_code = 422
    code = "VALIDATION_ERROR"


def _envelope(code: str, message: str, details: Any = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"code": code, "message": message}
    if details:
        payload["details"] = details
    return {"error": payload}


_HTTP_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    415: "UNSUPPORTED_MEDIA_TYPE",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
    500: "INTERNAL_ERROR",
}


def register_error_handlers(app) -> None:
    @app.errorhandler(ApiError)
    def _handle_api_error(exc: ApiError):
        return exc.to_dict(), exc.status_code

    @app.errorhandler(ValidationError)
    def _handle_marshmallow(exc: ValidationError):
        return (
            _envelope(
                "VALIDATION_ERROR",
                "The submitted data is invalid.",
                exc.messages,
            ),
            422,
        )

    @app.errorhandler(IntegrityError)
    def _handle_integrity(exc: IntegrityError):
        db.session.rollback()
        detail = str(getattr(exc, "orig", exc))
        logger.warning("Integrity error: %s", detail)

        message = "That operation conflicts with existing data."
        lowered = detail.lower()
        if "unique" in lowered or "duplicate key" in lowered:
            message = "A record with one of those unique values already exists."
        elif "foreign key" in lowered:
            message = "A referenced record does not exist, or is still in use."
        elif "check constraint" in lowered or "violates check" in lowered:
            message = "A value fell outside its allowed range (stock cannot go negative)."

        return _envelope("CONFLICT", message), 409

    @app.errorhandler(OperationalError)
    def _handle_operational(exc: OperationalError):
        db.session.rollback()
        logger.error("Database unavailable: %s", exc)
        return (
            _envelope(
                "DATABASE_UNAVAILABLE",
                "Could not reach the database. Check DATABASE_URL and that the "
                "database is awake, then try again.",
            ),
            503,
        )

    @app.errorhandler(SQLAlchemyError)
    def _handle_sqlalchemy(exc: SQLAlchemyError):
        db.session.rollback()
        logger.exception("Unhandled database error")
        return _envelope("DATABASE_ERROR", "A database error occurred."), 500

    @app.errorhandler(HTTPException)
    def _handle_http(exc: HTTPException):
        code = _HTTP_CODES.get(exc.code or 500, "HTTP_ERROR")
        return (
            _envelope(code, exc.description or exc.name),
            exc.code or 500,
        )

    @app.errorhandler(Exception)
    def _handle_unexpected(exc: Exception):
        db.session.rollback()
        logger.exception("Unhandled exception")
        if app.config.get("DEBUG"):
            return _envelope("INTERNAL_ERROR", f"{type(exc).__name__}: {exc}"), 500
        return _envelope("INTERNAL_ERROR", "An unexpected error occurred."), 500
