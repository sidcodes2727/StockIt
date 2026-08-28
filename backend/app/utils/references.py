"""Generation of human-readable identifiers: SKUs, invoice and PO numbers."""

from __future__ import annotations

import re
from datetime import date

from sqlalchemy import func, select

from ..extensions import db

_NON_ALNUM = re.compile(r"[^A-Za-z0-9]+")


def slug_prefix(text: str | None, fallback: str = "GEN", length: int = 3) -> str:
    """Build a short uppercase prefix from arbitrary text (e.g. a category name)."""
    if not text:
        return fallback
    cleaned = _NON_ALNUM.sub("", text).upper()
    if not cleaned:
        return fallback
    return cleaned[:length].ljust(length, "X")


def generate_sku(category_name: str | None = None) -> str:
    """Produce a unique SKU such as ``MED-0007``.

    Scans the existing numeric tails for the prefix and takes ``max + 1``, then
    walks forward on the (very unlikely) chance of a collision. The unique index
    on ``products.sku`` is the real guarantee — this just avoids hitting it.
    """
    from ..models import Product

    prefix = slug_prefix(category_name, fallback="SKU")
    pattern = f"{prefix}-%"

    existing = db.session.scalars(
        select(Product.sku).where(Product.sku.like(pattern))
    ).all()

    highest = 0
    tail_re = re.compile(rf"^{re.escape(prefix)}-(\d+)$")
    for sku in existing:
        match = tail_re.match(sku or "")
        if match:
            highest = max(highest, int(match.group(1)))

    taken = set(existing)
    candidate_num = highest + 1
    while f"{prefix}-{candidate_num:04d}" in taken:
        candidate_num += 1
    return f"{prefix}-{candidate_num:04d}"


def _next_dated_reference(model, column, prefix: str, on_date: date) -> str:
    """Build ``PREFIX-YYYYMMDD-NNNN``, sequential within the given day."""
    stem = f"{prefix}-{on_date.strftime('%Y%m%d')}"

    # Postgres: split off the trailing counter and take the numeric maximum.
    highest = db.session.scalar(
        select(func.max(func.cast(func.split_part(column, "-", 3), db.Integer))).where(
            column.like(f"{stem}-%")
        )
    )
    return f"{stem}-{(highest or 0) + 1:04d}"


def generate_invoice_no(sale_date: date) -> str:
    from ..models import Sale

    return _next_dated_reference(Sale, Sale.invoice_no, "INV", sale_date)


def generate_purchase_reference(purchase_date: date) -> str:
    from ..models import Purchase

    return _next_dated_reference(Purchase, Purchase.reference_no, "PO", purchase_date)
