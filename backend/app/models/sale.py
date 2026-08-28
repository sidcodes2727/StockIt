from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..extensions import db
from .mixins import utcnow


class Sale(db.Model):
    """One sale line: a single product sold.

    Rows sharing an ``invoice_no`` make up one receipt, so a basket of products
    prints as a single invoice while the table itself stays flat.
    """

    __tablename__ = "sales"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_sales_quantity_positive"),
        CheckConstraint("sale_price >= 0", name="ck_sales_sale_price_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_no: Mapped[str] = mapped_column(String(40), nullable=False, index=True)

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )

    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    sale_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    customer_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    sale_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )

    product: Mapped["Product"] = relationship(back_populates="sales")
    creator: Mapped["User | None"] = relationship(back_populates="sales")

    @property
    def line_total(self) -> Decimal:
        return self.sale_price * self.quantity

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Sale {self.invoice_no} product={self.product_id} qty={self.quantity}>"
