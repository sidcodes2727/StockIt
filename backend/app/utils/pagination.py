"""Pagination, sorting and date-range helpers shared by list endpoints."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Iterable

from flask import request
from sqlalchemy import asc, desc

from ..errors import ApiError

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 200


def get_pagination_args() -> tuple[int, int]:
    """Read and clamp ``?page=`` / ``?per_page=``."""
    try:
        page = int(request.args.get("page", 1))
    except (TypeError, ValueError):
        page = 1
    try:
        per_page = int(request.args.get("per_page", DEFAULT_PAGE_SIZE))
    except (TypeError, ValueError):
        per_page = DEFAULT_PAGE_SIZE

    return max(page, 1), max(1, min(per_page, MAX_PAGE_SIZE))


def apply_sort(query, sortable: dict[str, Any], default: str, default_dir: str = "asc"):
    """Apply ``?sort_by=`` / ``?sort_dir=`` using a whitelist of columns.

    The whitelist matters: interpolating a raw query param into ``order_by`` is
    how SQL injection sneaks into otherwise-parameterised code.

    ``default_dir`` sets the direction when the client sends none — ledgers want
    newest-first, catalogues want A-Z.
    """
    sort_by = request.args.get("sort_by") or default
    sort_dir = (request.args.get("sort_dir") or default_dir).lower()

    column = sortable.get(sort_by, sortable[default])
    direction = desc if sort_dir in {"desc", "descending"} else asc

    # Deterministic tiebreaker so pages don't reshuffle between requests.
    return query.order_by(direction(column), sortable[default])


def paginate(query, schema=None, *, page: int | None = None, per_page: int | None = None):
    """Run a paginated query and build the standard list envelope."""
    if page is None or per_page is None:
        page, per_page = get_pagination_args()

    from ..extensions import db

    pagination = db.paginate(
        query, page=page, per_page=per_page, error_out=False, count=True
    )

    items: Iterable = pagination.items
    return {
        "items": schema.dump(items, many=True) if schema is not None else list(items),
        "meta": {
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total": pagination.total,
            "pages": pagination.pages,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev,
        },
    }


def parse_date_arg(name: str, default: date | None = None) -> date | None:
    """Parse an ISO ``YYYY-MM-DD`` query parameter."""
    raw = request.args.get(name)
    if not raw:
        return default
    try:
        return datetime.strptime(raw.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise ApiError(
            f"`{name}` must be a date in YYYY-MM-DD format.",
            code="INVALID_DATE",
        ) from None


def get_date_range(default_days: int = 30) -> tuple[date, date]:
    """Resolve ``?start_date=``/``?end_date=``, defaulting to a trailing window."""
    today = date.today()
    start = parse_date_arg("start_date")
    end = parse_date_arg("end_date", today)

    if start is None:
        start = (end or today) - timedelta(days=default_days - 1)

    if start > end:
        raise ApiError(
            "`start_date` cannot be after `end_date`.", code="INVALID_DATE_RANGE"
        )
    return start, end
