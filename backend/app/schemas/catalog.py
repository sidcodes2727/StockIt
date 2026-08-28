from __future__ import annotations

from marshmallow import fields, validate

from .common import BaseSchema


class CategorySchema(BaseSchema):
    id = fields.Int(dump_only=True)
    name = fields.Str(dump_only=True)
    description = fields.Str(dump_only=True, allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    product_count = fields.Int(dump_only=True)


class CategoryWriteSchema(BaseSchema):
    name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=120),
        error_messages={"required": "Category name is required."},
    )
    description = fields.Str(
        allow_none=True, load_default=None, validate=validate.Length(max=1000)
    )


class SupplierSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    name = fields.Str(dump_only=True)
    contact_person = fields.Str(dump_only=True, allow_none=True)
    phone = fields.Str(dump_only=True, allow_none=True)
    email = fields.Str(dump_only=True, allow_none=True)
    address = fields.Str(dump_only=True, allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    product_count = fields.Int(dump_only=True)


class SupplierWriteSchema(BaseSchema):
    name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=160),
        error_messages={"required": "Supplier name is required."},
    )
    contact_person = fields.Str(
        allow_none=True, load_default=None, validate=validate.Length(max=120)
    )
    phone = fields.Str(
        allow_none=True, load_default=None, validate=validate.Length(max=40)
    )
    # Not fields.Email: suppliers are often recorded without one, and an empty
    # string from a cleared form input should not be a validation error.
    email = fields.Str(
        allow_none=True, load_default=None, validate=validate.Length(max=255)
    )
    address = fields.Str(
        allow_none=True, load_default=None, validate=validate.Length(max=2000)
    )
