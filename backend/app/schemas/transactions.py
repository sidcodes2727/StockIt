from __future__ import annotations

from datetime import date

from marshmallow import fields, validate

from .common import BaseSchema, MiniRefSchema, Money


# --------------------------------------------------------------------------- #
# Purchases (stock in)
# --------------------------------------------------------------------------- #
class PurchaseLineSchema(BaseSchema):
    product_id = fields.Int(
        required=True, error_messages={"required": "Select a product."}
    )
    quantity = fields.Int(
        required=True,
        validate=validate.Range(min=1, error="Quantity must be at least 1."),
        error_messages={"required": "Quantity is required."},
    )
    # Omit to fall back to the product's current cost price.
    cost_price = Money(
        allow_none=True,
        load_default=None,
        validate=validate.Range(min=0, error="Cost price cannot be negative."),
    )


class PurchaseCreateSchema(BaseSchema):
    supplier_id = fields.Int(allow_none=True, load_default=None)
    purchase_date = fields.Date(load_default=date.today)
    items = fields.List(
        fields.Nested(PurchaseLineSchema),
        required=True,
        validate=validate.Length(min=1, error="Add at least one product."),
        error_messages={"required": "Add at least one product."},
    )
    # When true, each product's stored cost_price is refreshed to this purchase's
    # cost — the common "latest cost wins" valuation approach.
    update_cost_price = fields.Bool(load_default=True)


class PurchaseSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    reference_no = fields.Str(dump_only=True)
    product_id = fields.Int(dump_only=True)
    supplier_id = fields.Int(dump_only=True, allow_none=True)
    product = fields.Nested(MiniRefSchema, dump_only=True, allow_none=True)
    supplier = fields.Nested(MiniRefSchema, dump_only=True, allow_none=True)
    quantity = fields.Int(dump_only=True)
    cost_price = Money(dump_only=True)
    line_total = Money(dump_only=True)
    purchase_date = fields.Date(dump_only=True)
    created_by = fields.Int(dump_only=True, allow_none=True)
    creator = fields.Nested(MiniRefSchema, dump_only=True, allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    product_sku = fields.Str(dump_only=True, attribute="product.sku")


# --------------------------------------------------------------------------- #
# Sales (stock out)
# --------------------------------------------------------------------------- #
class SaleLineSchema(BaseSchema):
    product_id = fields.Int(
        required=True, error_messages={"required": "Select a product."}
    )
    quantity = fields.Int(
        required=True,
        validate=validate.Range(min=1, error="Quantity must be at least 1."),
        error_messages={"required": "Quantity is required."},
    )
    # Omit to fall back to the product's list price.
    sale_price = Money(
        allow_none=True,
        load_default=None,
        validate=validate.Range(min=0, error="Sale price cannot be negative."),
    )


class SaleCreateSchema(BaseSchema):
    customer_name = fields.Str(
        allow_none=True, load_default=None, validate=validate.Length(max=160)
    )
    sale_date = fields.Date(load_default=date.today)
    items = fields.List(
        fields.Nested(SaleLineSchema),
        required=True,
        validate=validate.Length(min=1, error="Add at least one product."),
        error_messages={"required": "Add at least one product."},
    )


class SaleSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    invoice_no = fields.Str(dump_only=True)
    product_id = fields.Int(dump_only=True)
    product = fields.Nested(MiniRefSchema, dump_only=True, allow_none=True)
    quantity = fields.Int(dump_only=True)
    sale_price = Money(dump_only=True)
    line_total = Money(dump_only=True)
    customer_name = fields.Str(dump_only=True, allow_none=True)
    sale_date = fields.Date(dump_only=True)
    created_by = fields.Int(dump_only=True, allow_none=True)
    creator = fields.Nested(MiniRefSchema, dump_only=True, allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    product_sku = fields.Str(dump_only=True, attribute="product.sku")
