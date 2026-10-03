"""Discount codes. Validation lives here so the quote, the order and the dashboard all agree."""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import bad_request
from app.models import Business, Discount, Order

ZERO = Decimal("0")


def normalise_code(code: str | None) -> str:
    return "".join(ch for ch in (code or "").upper().strip() if ch.isalnum() or ch in "-_")[:32]


def find(db: Session, business: Business, code: str, *, lock: bool = False) -> Discount | None:
    q = select(Discount).where(Discount.business_id == business.id, Discount.code == normalise_code(code))
    if lock:
        q = q.with_for_update()
    return db.scalars(q).first()


def check(db: Session, business: Business, d: Discount | None, *, subtotal: Decimal, phone: str | None) -> Discount:
    """Raise a customer-friendly error unless the code can be used right now."""
    if d is None or not d.is_active:
        raise bad_request("That discount code isn't valid")
    now = datetime.now(timezone.utc)
    if d.starts_at and now < d.starts_at:
        raise bad_request("That discount code isn't active yet")
    if d.ends_at and now > d.ends_at:
        raise bad_request("That discount code has expired")
    if d.usage_limit is not None and d.used_count >= d.usage_limit:
        raise bad_request("That discount code has been fully used")
    if d.min_order is not None and subtotal < d.min_order:
        raise bad_request(f"Spend at least {d.min_order:,.0f} to use this code")
    if d.once_per_customer and phone:
        used = db.scalar(select(func.count()).select_from(Order).where(Order.business_id == business.id, Order.discount_code == d.code, Order.customer_phone == phone,
                                                                       Order.status != "CANCELLED")) or 0
        if used:
            raise bad_request("You've already used this code")
    return d


def amount(d: Discount, eligible_subtotal: Decimal) -> Decimal:
    if d.type == "PERCENT":
        return (eligible_subtotal * min(d.value, Decimal("100")) / 100).quantize(Decimal("0.01"))
    if d.type == "FIXED":
        return min(d.value, eligible_subtotal).quantize(Decimal("0.01"))
    return ZERO  # FREE_DELIVERY changes the delivery fee, not the goods


def applies_to(d: Discount, product_id, category_id) -> bool:
    if not d.product_ids and not d.category_ids:
        return True
    return (str(product_id) in {str(x) for x in d.product_ids}) or (category_id is not None and str(category_id) in {str(x) for x in d.category_ids})
