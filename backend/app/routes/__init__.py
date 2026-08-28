"""API blueprints, one module per domain.

Registered in ``app.create_app`` under the ``/api`` prefix.
"""

from .auth import auth_bp
from .categories import categories_bp
from .dashboard import dashboard_bp
from .products import products_bp
from .purchases import purchases_bp
from .reports import reports_bp
from .sales import sales_bp
from .suppliers import suppliers_bp
from .users import users_bp

__all__ = [
    "auth_bp",
    "categories_bp",
    "dashboard_bp",
    "products_bp",
    "purchases_bp",
    "reports_bp",
    "sales_bp",
    "suppliers_bp",
    "users_bp",
]
