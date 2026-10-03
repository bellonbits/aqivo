"""Order lifecycle: place (atomically: price, stock, discount, customer), move through statuses, record payment, cancel/refund with restock."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.errors import bad_request
from app.models import Business, Customer, Discount, Order, OrderEvent, OrderItem, Payment
from app.services import bookings as bk
from app.services import discounts as disc
from app.services import inventory as inv
from app.services import pricing
from app.services import store as store_cfg
from app.services.business import business_urls
from app.services.notifications import notify

STATUSES = ("PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED", "REFUNDED")
TRANSITIONS = {
    "PENDING": {"CONFIRMED", "CANCELLED"},
    "CONFIRMED": {"PREPARING", "READY", "COMPLETED", "CANCELLED"},
    "PREPARING": {"READY", "COMPLETED", "CANCELLED"},
    "READY": {"COMPLETED", "CANCELLED"},
    "COMPLETED": {"REFUNDED"},
    "CANCELLED": set(),
    "REFUNDED": set(),
}
STATUS_TEXT = {"PENDING": "Received", "CONFIRMED": "Confirmed", "PREPARING": "Being prepared", "READY": "Ready", "COMPLETED": "Completed", "CANCELLED": "Cancelled", "REFUNDED": "Refunded"}


def _lock(db: Session, business: Business) -> None:
    key = int.from_bytes(hashlib.sha1(b"orders" + business.id.bytes).digest()[:8], "big", signed=True)
    db.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": key})


def _event(order: Order, kind: str, message: str, *, status: str | None = None, actor=None) -> None:
    order.events.append(OrderEvent(business_id=order.business_id, kind=kind, status=status, message=message[:300], actor_id=actor))


def _clean_schedule(v: str | None) -> str | None:
    """A requested date/time (a preference, not a promise). Accepts the browser's datetime-local value."""
    if not v or not v.strip():
        return None
    from datetime import datetime, timedelta
    try:
        t = datetime.strptime(v.strip(), "%Y-%m-%dT%H:%M")
    except ValueError:
        raise bad_request("That date and time doesn't look right")
    now = datetime.utcnow() + timedelta(hours=3)  # loose lower bound that works for every African timezone (UTC-1 to UTC+4)
    if t < now - timedelta(hours=6) or t > now + timedelta(days=90):
        raise bad_request("Please choose a date and time within the next 90 days")
    return t.strftime("%Y-%m-%dT%H:%M")


def place(db: Session, business: Business, *, raw_lines: list[dict], name: str, phone: str | None, email: str | None, delivery_method: str, zone: str | None,
          address: str, notes: str, payment_key: str, code: str | None, source: str | None = None, campaign: str | None = None, channel: str = "WEBSITE",
          scheduled_for: str | None = None) -> Order:
    cfg = store_cfg.get(business)
    when = _clean_schedule(scheduled_for)
    if not phone and not email:
        raise bad_request("Please add a phone number so we can reach you about your order")
    if cfg["require_email"] and not email:
        raise bad_request("Please add your email address")
    if delivery_method == "DELIVERY" and len(address.strip()) < 4:
        raise bad_request("Please tell us where to deliver")
    methods = {m["key"]: m for m in store_cfg.enabled_payments(business, db)}
    if payment_key not in methods:
        raise bad_request("Choose how you'd like to pay")

    _lock(db, business)  # one order at a time per business: sequential numbers, no oversell
    qt = pricing.quote(db, business, raw_lines, delivery_method=delivery_method, zone=zone, code=code, phone=phone, lock=True)
    number = (db.scalar(select(func.max(Order.number)).where(Order.business_id == business.id)) or 1000) + 1
    cust = bk.normalise_customer(db, business.id, name, phone, "WEBSITE", email=email, acq_source=source, acq_campaign=campaign)
    if email and not cust.email:
        cust.email = email
    method = methods[payment_key]["method"]
    order = Order(business_id=business.id, number=number, token=secrets.token_urlsafe(24), customer_id=cust.id, customer_name=name, customer_phone=phone, customer_email=email,
                  delivery_method=delivery_method, delivery_zone=zone if delivery_method == "DELIVERY" else None, address=address.strip()[:400] if delivery_method == "DELIVERY" else "",
                  notes=notes.strip()[:600], scheduled_for=when, status="PENDING", payment_method=method, payment_status="UNPAID", currency=business.currency, subtotal=qt.subtotal,
                  discount=qt.discount, delivery_fee=qt.delivery_fee, tax=qt.tax, total=qt.total, discount_code=qt.discount_code, source=source, campaign=campaign, channel=channel)
    db.add(order)
    db.flush()
    for ln in qt.lines:
        order.items.append(OrderItem(business_id=business.id, kind=ln.kind, product_id=ln.product.id if ln.product else None, variant_id=ln.variant.id if ln.variant else None,
                                     service_id=ln.service.id if ln.service else None, name=ln.name[:200], variant_title=ln.variant_title, image_url=ln.image,
                                     unit_price=ln.unit_price, quantity=ln.qty, line_total=ln.total))
        if ln.product is not None:
            inv.adjust_stock(db, ln.product, ln.variant, -ln.qty, "SALE", note=f"Order #{number}", order_id=order.id)
    if qt.discount_obj is not None:
        qt.discount_obj.used_count += 1  # type: ignore[attr-defined]
    if method != "WHATSAPP" and methods[payment_key].get("gateway") is None:
        db.add(Payment(business_id=business.id, customer_id=cust.id, order_id=order.id, amount=qt.total, currency=business.currency, method=method, provider="MANUAL",
                       status="PENDING", payer_phone=phone, note=f"Order #{number}"))
    _event(order, "PLACED", f"Order placed ({'WhatsApp' if channel == 'WHATSAPP' else 'online'}).")
    db.flush()
    summary = ", ".join(f"{i.quantity}× {i.name}" for i in order.items)[:200]
    notify(db, "new_order", business.email, business_id=business.id, number=number, customer=name, total=f"{business.currency} {qt.total:,.0f}", items=summary,
           payment=methods[payment_key]["label"], phone=phone or email)
    return order


def set_status(db: Session, order: Order, new: str, *, actor=None, note: str = "") -> Order:
    if new not in STATUSES:
        raise bad_request("Unknown status")
    if new == order.status:
        return order
    if new not in TRANSITIONS[order.status]:
        raise bad_request(f"An order that is {STATUS_TEXT[order.status].lower()} can't be marked {STATUS_TEXT[new].lower()}")
    old = order.status
    order.status = new
    msg = f"{STATUS_TEXT[old]} → {STATUS_TEXT[new]}" + (f". {note}" if note else "")
    if new == "CANCELLED":
        restock(db, order, "CANCELLED", actor=actor)
        if order.payment_status == "PAID":
            order.payment_status = "REFUNDED"  # money received must be returned by the owner
            msg += " (payment needs refunding)"
        _release_discount(db, order)
    if new == "COMPLETED" and order.payment_method == "CASH" and order.payment_status != "PAID":
        _record_paid(db, order, actor=actor, reference=None, note="Cash collected")
    _event(order, "STATUS", msg, status=new, actor=actor)
    db.flush()
    _tell_customer(db, order, new)
    return order


def restock(db: Session, order: Order, reason: str, *, actor=None) -> None:
    if order.stock_restored:
        return
    from app.models import Product, ProductVariant
    for it in order.items:
        if it.product_id is None:
            continue
        p = db.get(Product, it.product_id)
        v = db.get(ProductVariant, it.variant_id) if it.variant_id else None
        if p is not None and p.business_id == order.business_id:
            inv.adjust_stock(db, p, v, it.quantity, reason, note=f"Order #{order.number}", order_id=order.id, user_id=actor, allow_negative=True)
    order.stock_restored = True


def _release_discount(db: Session, order: Order) -> None:
    if order.discount_code:
        d = db.scalars(select(Discount).where(Discount.business_id == order.business_id, Discount.code == order.discount_code)).first()
        if d is not None and d.used_count > 0:
            d.used_count -= 1


def _record_paid(db: Session, order: Order, *, actor, reference: str | None, note: str) -> None:
    order.payment_status = "PAID"
    pay = db.scalars(select(Payment).where(Payment.order_id == order.id, Payment.business_id == order.business_id)).first()
    now = datetime.now(timezone.utc)
    if pay is None:
        pay = Payment(business_id=order.business_id, customer_id=order.customer_id, order_id=order.id, amount=order.total, currency=order.currency, method=order.payment_method,
                      provider="MANUAL", payer_phone=order.customer_phone, note=f"Order #{order.number}")
        db.add(pay)
    pay.status, pay.paid_at = "PAID", now
    if reference:
        pay.provider_reference = reference[:120]
    _event(order, "PAYMENT", note or "Payment received", actor=actor)


def mark_paid(db: Session, order: Order, *, actor=None, reference: str | None = None) -> Order:
    if order.status in ("CANCELLED", "REFUNDED"):
        raise bad_request("This order is closed")
    if order.payment_status == "PAID":
        return order
    _record_paid(db, order, actor=actor, reference=reference, note=f"Payment received{' (ref ' + reference + ')' if reference else ''}")
    db.flush()
    return order


def refund(db: Session, order: Order, *, actor=None, restock_items: bool = True, note: str = "") -> Order:
    if order.status != "COMPLETED":
        raise bad_request("Only completed orders can be refunded. Cancel the order instead.")
    set_status(db, order, "REFUNDED", actor=actor, note=note)
    if order.payment_status == "PAID":
        order.payment_status = "REFUNDED"
        pay = db.scalars(select(Payment).where(Payment.order_id == order.id, Payment.business_id == order.business_id)).first()
        if pay is not None:
            pay.status = "REFUNDED"
    if restock_items:
        restock(db, order, "RETURN", actor=actor)
    db.flush()
    return order


def customer_reference(db: Session, order: Order, reference: str) -> None:
    """The customer says they paid and gives the M-Pesa/bank reference; the owner still has to confirm it."""
    ref = "".join(ch for ch in reference.strip().upper() if ch.isalnum())[:30]
    if len(ref) < 6:
        raise bad_request("That doesn't look like a payment code")
    if order.status in ("CANCELLED", "REFUNDED") or order.payment_status == "PAID":
        raise bad_request("This order can't take a payment reference")
    pay = db.scalars(select(Payment).where(Payment.order_id == order.id, Payment.business_id == order.business_id)).first()
    if pay is not None:
        pay.provider_reference = ref
    _event(order, "PAYMENT", f"Customer says they paid — reference {ref}. Check it before confirming.")
    db.flush()


def add_note(order: Order, message: str, actor) -> None:
    _event(order, "NOTE", message, actor=actor)


def _tell_customer(db: Session, order: Order, status: str) -> None:
    if status in ("CONFIRMED", "READY", "COMPLETED", "CANCELLED"):
        from app.services import whatsapp
        b0 = db.get(Business, order.business_id)
        if b0 is not None:
            whatsapp.notify_order(db, order, STATUS_TEXT[status], f"{business_urls(b0)['profile']}/order/{order.token}")
    if order.customer_email and status in ("CONFIRMED", "READY", "COMPLETED", "CANCELLED"):
        b = db.get(Business, order.business_id)
        notify(db, "order_update", order.customer_email, business_id=order.business_id, number=order.number, customer=order.customer_name, status=STATUS_TEXT[status],
               business=b.name if b else "", url=f"{business_urls(b)['profile']}/order/{order.token}" if b else "")
