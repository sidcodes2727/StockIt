"""Application factory."""

from __future__ import annotations

import logging

from flask import Flask, jsonify

from config import Config, get_config

from .errors import register_error_handlers
from .extensions import bcrypt, cors, db, jwt, migrate


def create_app(config_name: str | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(get_config(config_name))

    _configure_logging(app)
    _verify_database_config(app)
    _init_extensions(app)
    _configure_jwt(app)
    _register_blueprints(app)
    register_error_handlers(app)
    _register_shell_context(app)

    return app


def _configure_logging(app: Flask) -> None:
    logging.basicConfig(
        level=logging.DEBUG if app.config.get("DEBUG") else logging.INFO,
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    )
    # SQLAlchemy's own chatter drowns out request logs in debug mode.
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def _verify_database_config(app: Flask) -> None:
    """Fail loudly and usefully when DATABASE_URL is missing."""
    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        raise RuntimeError(
            "DATABASE_URL is not set.\n"
            "  1. Copy backend/.env.example to backend/.env\n"
            "  2. Paste your Postgres connection string into DATABASE_URL\n"
            "     (Neon dashboard -> Connection string)\n"
        )


def _init_extensions(app: Flask) -> None:
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        # Without this the browser hides the header, and CSV/PDF downloads lose
        # their filename.
        expose_headers=["Content-Disposition"],
    )


def _configure_jwt(app: Flask) -> None:
    from .models import User

    @jwt.user_identity_loader
    def _identity(user) -> str:
        # The JWT `sub` claim must be a string.
        return str(user.id) if isinstance(user, User) else str(user)

    @jwt.user_lookup_loader
    def _lookup(_jwt_header, jwt_data):
        try:
            user_id = int(jwt_data["sub"])
        except (KeyError, TypeError, ValueError):
            return None
        return db.session.get(User, user_id)

    def _error(code: str, message: str, status: int = 401):
        return jsonify({"error": {"code": code, "message": message}}), status

    @jwt.expired_token_loader
    def _expired(_header, _payload):
        # A distinct code lets the frontend attempt a silent refresh instead of
        # bouncing the user straight to the login screen.
        return _error("TOKEN_EXPIRED", "Your session has expired.")

    @jwt.invalid_token_loader
    def _invalid(reason):
        return _error("TOKEN_INVALID", "Your session token is invalid.")

    @jwt.unauthorized_loader
    def _missing(reason):
        return _error("AUTH_REQUIRED", "You must sign in to access this resource.")

    @jwt.revoked_token_loader
    def _revoked(_header, _payload):
        return _error("TOKEN_REVOKED", "Your session has been revoked.")

    @jwt.user_lookup_error_loader
    def _lookup_failed(_header, _payload):
        return _error("USER_NOT_FOUND", "The account for this session no longer exists.")


def _register_blueprints(app: Flask) -> None:
    from .routes.auth import auth_bp
    from .routes.categories import categories_bp
    from .routes.dashboard import dashboard_bp
    from .routes.products import products_bp
    from .routes.purchases import purchases_bp
    from .routes.reports import reports_bp
    from .routes.sales import sales_bp
    from .routes.suppliers import suppliers_bp
    from .routes.users import users_bp

    for blueprint in (
        auth_bp,
        dashboard_bp,
        products_bp,
        categories_bp,
        suppliers_bp,
        purchases_bp,
        sales_bp,
        reports_bp,
        users_bp,
    ):
        app.register_blueprint(blueprint, url_prefix=f"/api{blueprint.url_prefix or ''}")

    @app.get("/api/health")
    def health():
        """Liveness + database reachability, handy for debugging setup issues."""
        from sqlalchemy import text

        database_ok = True
        detail = "connected"
        try:
            db.session.execute(text("SELECT 1"))
        except Exception as exc:  # pragma: no cover - environment dependent
            database_ok = False
            detail = f"{type(exc).__name__}: {exc}"

        return (
            {
                "status": "ok" if database_ok else "degraded",
                "database": {"connected": database_ok, "detail": detail},
            },
            200 if database_ok else 503,
        )

    @app.get("/")
    def index():
        return {
            "name": "StockFlow API",
            "version": "1.0.0",
            "docs": "See README.md for the endpoint reference.",
            "health": "/api/health",
        }


def _register_shell_context(app: Flask) -> None:
    from .models import Category, Product, Purchase, Sale, Supplier, User

    @app.shell_context_processor
    def _shell():
        return {
            "db": db,
            "User": User,
            "Category": Category,
            "Supplier": Supplier,
            "Product": Product,
            "Purchase": Purchase,
            "Sale": Sale,
        }


__all__ = ["create_app", "Config"]
