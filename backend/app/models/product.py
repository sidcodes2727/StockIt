from __future__ import annotations

from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..extensions import db
from .mixins import TimestampMixin


class Product(TimestampMixin, db.Model):
    __tablename__ = "products"
    __table_args__ = (
        # DB-level backstop: stock can never go negative, whatever the app does.
        CheckConstraint("quantity >= 0", name="ck_products_quantity_non_negative"),
        CheckConstraint(
            "reorder_level >= 0", name="ck_products_reorder_level_non_negative"
        ),
        CheckConstraint("unit_price >= 0", name="ck_products_unit_price_non_negative"),
        CheckConstraint("cost_price >= 0", name="ck_products_cost_price_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    sku: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )

    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True
    )

    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    cost_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reorder_level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    category: Mapped["Category | None"] = relationship(back_populates="products")
    supplier: Mapped["Supplier | None"] = relationship(back_populates="products")
    purchases: Mapped[list["Purchase"]] = relationship(
        back_populates="product", cascade="all, delete-orphan", passive_deletes=True
    )
    sales: Mapped[list["Sale"]] = relationship(
        back_populates="product", cascade="all, delete-orphan", passive_deletes=True
    )

    # -- derived values ------------------------------------------------------
    @property
    def stock_status(self) -> str:
        """``out_of_stock`` / ``low_stock`` / ``in_stock`` — drives the UI badge."""
        if self.quantity <= 0:
            return "out_of_stock"
        if self.quantity <= self.reorder_level:
            return "low_stock"
        return "in_stock"

    @property
    def stock_value(self) -> Decimal:
        """Inventory value at cost — the standard basis for stock valuation."""
        return (self.cost_price or Decimal("0")) * self.quantity

    @property
    def retail_value(self) -> Decimal:
        return (self.unit_price or Decimal("0")) * self.quantity

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Product {self.sku} {self.name}>"
