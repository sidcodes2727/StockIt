"""Application configuration.

Everything is driven by environment variables loaded from ``backend/.env`` so the
same codebase runs against a local Postgres or a hosted one (Neon, Supabase,
Railway, ...) with no code changes.
"""

from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")


def _normalise_database_url(raw: str | None) -> str | None:
    """Make a pasted Postgres URL safe for SQLAlchemy 2.x + psycopg 3.

    Hosted providers hand out URLs in a handful of shapes. This accepts any of
    them verbatim so nobody has to hand-edit a connection string:

    * ``postgres://``  -> ``postgresql+psycopg://`` (Heroku/Railway style)
    * ``postgresql://`` -> ``postgresql+psycopg://`` (avoids defaulting to the
      psycopg2 driver, which we do not install)
    * appends ``sslmode=require`` for remote hosts that omitted it
    * drops libpq parameters that psycopg cannot pass through
    """
    if not raw:
        return None

    url = raw.strip().strip('"').strip("'")
    if not url:
        return None

    for prefix, replacement in (
        ("postgres://", "postgresql+psycopg://"),
        ("postgresql://", "postgresql+psycopg://"),
    ):
        if url.startswith(prefix):
            url = replacement + url[len(prefix) :]
            break

    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))

    # Some dashboards include this; psycopg accepts it, but it is noise for a
    # dev app and trips up older libpq builds on Windows.
    query.pop("channel_binding", None)

    host = (parts.hostname or "").lower()
    is_local = host in {"localhost", "127.0.0.1", "::1", ""}
    if not is_local and "sslmode" not in query:
        query["sslmode"] = "require"

    return urlunsplit(
        (parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
    )


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")

    SQLALCHEMY_DATABASE_URI = _normalise_database_url(os.getenv("DATABASE_URL"))
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Neon (and most serverless Postgres) close idle connections aggressively.
    # Recycling below their timeout plus pre-ping avoids "server closed the
    # connection unexpectedly" on the first request after an idle period.
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
        "pool_size": 5,
        "max_overflow": 5,
        "connect_args": {"connect_timeout": 15},
    }

    # Alembic uses this when set — handy on Neon, where the pooled endpoint can
    # interfere with DDL. Falls back to the main URL.
    MIGRATION_DATABASE_URI = (
        _normalise_database_url(os.getenv("MIGRATION_DATABASE_URL"))
        or SQLALCHEMY_DATABASE_URI
    )

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        hours=float(os.getenv("JWT_ACCESS_TOKEN_HOURS", "12"))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        days=float(os.getenv("JWT_REFRESH_TOKEN_DAYS", "30"))
    )
    JWT_ERROR_MESSAGE_KEY = "message"

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]

    JSON_SORT_KEYS = False


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = (
        _normalise_database_url(os.getenv("TEST_DATABASE_URL"))
        or Config.SQLALCHEMY_DATABASE_URI
    )


_CONFIGS = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}


def get_config(name: str | None = None) -> type[Config]:
    key = (name or os.getenv("FLASK_ENV") or "development").lower()
    return _CONFIGS.get(key, DevelopmentConfig)
