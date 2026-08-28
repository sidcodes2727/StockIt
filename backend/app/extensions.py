"""Flask extension singletons.

Kept in their own module so models, routes and the app factory can import them
without creating circular imports.
"""

from __future__ import annotations

from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """SQLAlchemy 2.x declarative base."""


db = SQLAlchemy(model_class=Base)
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()
cors = CORS()
