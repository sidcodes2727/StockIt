from __future__ import annotations

from marshmallow import fields, validate

from .common import BaseSchema, MiniRefSchema, Money


class ProductSchema(BaseSchema):
    """Full product representation returned by the API."""

    id = fields.Int(dump_only=True)
    name = fields.Str(dump_only=True)
    sku = fields.Str(dump_only=True)

    category_id = fields.Int(dump_only=True, allow_none=True)
    supplier_id = fields.Int(dump_only=True, allow_none=True)
    category = fields.Nested(MiniRefSchema, dump_only=True, allow_none=True)
    supplier = fields.Nested(MiniRefSchema, dump_only=True, allow_none=True)

    unit_price = Money(dump_only=True)
    cost_price = Money(dump_only=True)
    quantity = fields.Int(dump_only=True)
    reorder_level = fields.Int(dump_only=True)

    description = fields.Str(dump_only=True, allow_none=True)
    image_url = fields.Str(dump_only=True, allow_none=True)

    # Computed on the model so the badge logic lives in exactly one place.
    stock_status = fields.Str(dump_only=True)
    stock_value = Money(dump_only=True)
    retail_value = Money(dump_only=True)

    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class ProductCreateSchema(BaseSchema):
    name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=200),
        error_messages={"required": "Product name is required."},
    )
    # Omit to have one generated from the category (e.g. MED-0007).
    sku = fields.Str(
        allow_none=True,
        load_default=None,
        validate=validate.Length(max=64),
    )
    category_id = fields.Int(allow_none=True, load_default=None)
    supplier_id = fields.Int(allow_none=True, load_default=None)

    unit_price = Money(
        load_default=0,
        validate=validate.Range(min=0, error="Unit price cannot be negative."),
    )
    cost_price = Money(
        load_default=0,
        validate=validate.Range(min=0, error="Cost price cannot be negative."),
    )
    quantity = fields.Int(
        load_default=0,
        validate=validate.Range(min=0, error="Quantity cannot be negative."),
    )
    reorder_level = fields.Int(
        load_default=0,
        validate=validate.Range(min=0, error="Reorder level cannot be negative."),
    )

    description = fields.Str(
        allow_none=True, load_default=None, validate=validate.Length(max=5000)
    )
    image_url = fields.Str(
        allow_none=True, load_default=None, validate=validate.Length(max=500)
    )


class ProductUpdateSchema(BaseSchema):
    """All fields optional — supports PATCH-style partial updates.

    ``quantity`` is deliberately absent: stock levels change only through
    purchases, sales, or the explicit stock-adjustment endpoint, so that every
    movement leaves an audit trail.
    """

    name = fields.Str(validate=validate.Length(min=2, max=200))
    sku = fields.Str(validate=validate.Length(min=1, max=64))
    category_id = fields.Int(allow_none=True)
    supplier_id = fields.Int(allow_none=True)
    unit_price = Money(validate=validate.Range(min=0))
    cost_price = Money(validate=validate.Range(min=0))
    reorder_level = fields.Int(validate=validate.Range(min=0))
    description = fields.Str(allow_none=True, validate=validate.Length(max=5000))
    image_url = fields.Str(allow_none=True, validate=validate.Length(max=500))


class StockAdjustmentSchema(BaseSchema):
    """Manual stock correction (damage, shrinkage, stock-take difference)."""

    quantity = fields.Int(
        required=True,
        validate=validate.Range(min=0, error="Quantity cannot be negative."),
    )
    reason = fields.Str(
        allow_none=True, load_default=None, validate=validate.Length(max=300)
    )
