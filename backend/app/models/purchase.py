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


class Purchase(db.Model):
    """One purchase line: a single product received from a supplier.

    Multi-product purchases are modelled as several rows sharing a
    ``reference_no``, which keeps the prescribed flat schema while still letting
    one form submission record several products under one goods-received note.
    """

    __tablename__ = "purchases"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_purchases_quantity_positive"),
        CheckConstraint("cost_price >= 0", name="ck_purchases_cost_price_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    reference_no: Mapped[str] = mapped_column(String(40), nullable=False, index=True)

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True
    )

    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    cost_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=utcnow
    )

    product: Mapped["Product"] = relationship(back_populates="purchases")
    supplier: Mapped["Supplier | None"] = relationship(back_populates="purchases")
    creator: Mapped["User | None"] = relationship(back_populates="purchases")

    @property
    def line_total(self) -> Decimal:
        return self.cost_price * self.quantity

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Purchase {self.reference_no} product={self.product_id} qty={self.quantity}>"
