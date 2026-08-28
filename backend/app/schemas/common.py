"""Shared schema building blocks."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from marshmallow import EXCLUDE, Schema, fields


class BaseSchema(Schema):
    """Ignores unrecognised input keys instead of 422-ing.

    The frontend sometimes round-trips a whole object (including ``id`` and
    computed fields) back into an update call; silently dropping those is far
    less annoying than rejecting the request.
    """

    class Meta:
        unknown = EXCLUDE


class Money(fields.Decimal):
    """A 2-decimal currency amount.

    Stored as ``Numeric(12, 2)``, loaded as ``Decimal`` (so no float drift
    reaches the database), but dumped as a JSON number so the frontend can do
    arithmetic without parsing strings.
    """

    def __init__(self, **kwargs) -> None:
        kwargs.setdefault("places", 2)
        kwargs.setdefault("rounding", ROUND_HALF_UP)
        kwargs.setdefault("as_string", False)
        super().__init__(**kwargs)

    def _serialize(self, value, attr, obj, **kwargs):
        if value is None:
            return None
        try:
            quantised = Decimal(str(value)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        except (InvalidOperation, ValueError):
            return None
        return float(quantised)


def money_out(value) -> float:
    """Quantise an arbitrary numeric to 2dp for hand-built response dicts."""
    if value is None:
        return 0.0
    try:
        return float(
            Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        )
    except (InvalidOperation, ValueError):
        return 0.0


class MiniRefSchema(BaseSchema):
    """Compact ``{id, name}`` used for nested relations in list payloads."""

    id = fields.Int(dump_only=True)
    name = fields.Str(dump_only=True)
