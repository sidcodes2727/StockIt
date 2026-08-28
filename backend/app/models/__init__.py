"""SQLAlchemy models.

Imported as a package so Alembic autogenerate sees every table, and so
relationship strings like ``"Product"`` resolve against a fully-populated
registry.
"""

from .category import Category
from .mixins import TimestampMixin, utcnow
from .product import Product
from .purchase import Purchase
from .sale import Sale
from .supplier import Supplier
from .user import User, UserRole

__all__ = [
    "Category",
    "Product",
    "Purchase",
    "Sale",
    "Supplier",
    "TimestampMixin",
    "User",
    "UserRole",
    "utcnow",
]
