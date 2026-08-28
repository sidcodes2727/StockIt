from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..extensions import bcrypt, db
from .mixins import utcnow


class UserRole:
    """Role constants.

    Stored as a plain string with a CHECK constraint rather than a Postgres ENUM
    — adding a role later is a one-line constraint change instead of an
    ``ALTER TYPE`` migration dance.
    """

    ADMIN = "admin"
    STAFF = "staff"

    ALL = (ADMIN, STAFF)


class User(db.Model):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('admin', 'staff')",
            name="ck_users_role_valid",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default=UserRole.STAFF
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )

    purchases: Mapped[list["Purchase"]] = relationship(back_populates="creator")
    sales: Mapped[list["Sale"]] = relationship(back_populates="creator")

    # -- password handling ---------------------------------------------------
    def set_password(self, raw_password: str) -> None:
        """Hash and store a password. The plaintext is never persisted."""
        self.password_hash = bcrypt.generate_password_hash(raw_password).decode("utf-8")

    def check_password(self, raw_password: str) -> bool:
        if not self.password_hash:
            return False
        return bcrypt.check_password_hash(self.password_hash, raw_password)

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<User {self.email} ({self.role})>"
