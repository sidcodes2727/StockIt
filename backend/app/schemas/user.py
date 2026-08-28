from __future__ import annotations

from marshmallow import fields, validate

from ..models import UserRole
from .common import BaseSchema

# bcrypt 5.x raises on secrets longer than 72 bytes rather than truncating, so
# the cap is enforced here instead of surfacing as a 500 at hash time.
PASSWORD_VALIDATOR = validate.Length(
    min=8, max=72, error="Password must be between 8 and 72 characters."
)


class UserSchema(BaseSchema):
    """Public representation of a user. Never includes the password hash."""

    id = fields.Int(dump_only=True)
    name = fields.Str(dump_only=True)
    email = fields.Email(dump_only=True)
    role = fields.Str(dump_only=True)
    is_active = fields.Bool(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class LoginSchema(BaseSchema):
    email = fields.Email(required=True, error_messages={"required": "Email is required."})
    password = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=72),
        error_messages={"required": "Password is required."},
    )


class UserCreateSchema(BaseSchema):
    name = fields.Str(required=True, validate=validate.Length(min=2, max=120))
    email = fields.Email(required=True, validate=validate.Length(max=255))
    password = fields.Str(required=True, validate=PASSWORD_VALIDATOR, load_only=True)
    role = fields.Str(
        load_default=UserRole.STAFF,
        validate=validate.OneOf(
            UserRole.ALL, error="Role must be either 'admin' or 'staff'."
        ),
    )
    is_active = fields.Bool(load_default=True)


class UserUpdateSchema(BaseSchema):
    name = fields.Str(validate=validate.Length(min=2, max=120))
    email = fields.Email(validate=validate.Length(max=255))
    password = fields.Str(validate=PASSWORD_VALIDATOR, load_only=True)
    role = fields.Str(
        validate=validate.OneOf(
            UserRole.ALL, error="Role must be either 'admin' or 'staff'."
        )
    )
    is_active = fields.Bool()


class ChangePasswordSchema(BaseSchema):
    current_password = fields.Str(required=True, load_only=True)
    new_password = fields.Str(required=True, validate=PASSWORD_VALIDATOR, load_only=True)


class ProfileUpdateSchema(BaseSchema):
    name = fields.Str(validate=validate.Length(min=2, max=120))
    email = fields.Email(validate=validate.Length(max=255))
