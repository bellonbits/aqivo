"""Taking payment online through the business's own gateway: start → (customer pays) → confirm by webhook *or* by asking the gateway.
Every path funnels into confirm(), which checks the amount and is safe to call twice."""
from __future__ import annotations

import secrets
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import bad_request
from app.models import Business, Order, Payment, WebhookEvent
from app.services import connections as cx
from app.services import gateways as gw
from app.services import orders as order_svc
from app.services.business import business_urls
from app.core.config import get_settings


def _gateway(db: Session, business: Business, key: str):
    g = gw.GATEWAYS.get(key)
    c = cx.creds(db, business, key)
    if g is None or c is None:
        raise bad_request("That payment method isn't available right now")
    return g, c[0], c[1]


def _payment_row(db: Session, order: Order) -> Payment:
    p = db.scalars(select(Payment).where(Payment.order_id == order.id, Payment.business_id == order.business_id)).first()
    if p is None:
        p = Payment(business_id=order.business_id, customer_id=order.customer_id, order_id=order.id, amount=order.total, currency=order.currency, method=order.payment_method,
                    provider="MANUAL", payer_phone=order.customer_phone, status="PENDING", note=f"Order #{order.number}")
        db.add(p)
    return p


def hook_url(business: Business, key: str) -> str:
    return f"{get_settings().public_base_url.rstrip('/')}/api/v1/webhooks/payments/{key}/{business.slug}"


def start(db: Session, business: Business, order: Order, key: str, *, phone: str | None = None) -> dict:
    """Begin (or restart) payment. Returns {"type": "redirect", "url"} or {"type": "push", "message"}."""
    if order.payment_status == "PAID":
        raise bad_request("This order is already paid")
    if order.status in ("CANCELLED", "REFUNDED"):
        raise bad_request("This order is closed")
    g, cfg, sec = _gateway(db, business, key)
    ref = f"BZ{order.number}-{secrets.token_hex(4).upper()}"  # a fresh reference per attempt
    cb = f"{business_urls(business)['profile']}/order/{order.token}?pay=return"
    try:
        res = g.init(cfg, sec, amount=order.total, currency=order.currency, reference=ref, email=order.customer_email, phone=phone or order.customer_phone, name=order.customer_name,
                     callback_url=cb, hook_url=hook_url(business, key), description=f"{business.name} order #{order.number}")
    except (gw.GatewayError, Exception) as exc:  # noqa: BLE001 - never leak provider internals to the customer
        order_svc._event(order, "PAYMENT", f"Couldn't start {g.label} payment.")
        raise bad_request("We couldn't reach the payment provider. Please try again in a moment.") from exc
    if not res.ok:
        order_svc._event(order, "PAYMENT", f"{g.label} couldn't start the payment: {res.message[:120]}")
        raise bad_request(res.message or "The payment couldn't be started")
    order.payment_provider, order.payment_reference, order.payment_status = key, res.reference or ref, "PENDING"
    pay = _payment_row(db, order)
    pay.provider, pay.provider_reference, pay.status = key.upper(), order.payment_reference, "PENDING"
    pay.method = "MPESA" if key == "daraja" else "CARD"
    order_svc._event(order, "PAYMENT", f"Waiting for {g.label} payment.")
    db.flush()
    return {"type": "push", "message": res.message} if res.push else {"type": "redirect", "url": res.redirect_url}


def confirm(db: Session, business: Business, order: Order, *, status: str, amount: Decimal | None, currency: str | None, source: str) -> str:
    """Apply a payment result. Idempotent; refuses a payment that is smaller than the order or in another currency."""
    if order.payment_status == "PAID":
        return "already_paid"
    if status == "PAID":
        if (amount is not None and amount < order.total) or (currency and currency != order.currency):
            order_svc._event(order, "PAYMENT", f"Payment received through {source} but the amount/currency didn't match ({currency} {amount}). Check it before confirming.")
            order.payment_status = "PENDING"
            return "mismatch"
        order_svc._record_paid(db, order, actor=None, reference=order.payment_reference, note=f"Paid online ({source})")
        if order.status == "PENDING":
            order.status = "CONFIRMED"
            order_svc._event(order, "STATUS", "Confirmed automatically after online payment.", status="CONFIRMED")
        return "paid"
    if status == "FAILED":
        order.payment_status = "UNPAID"
        order_svc._event(order, "PAYMENT", f"{source} payment failed or was cancelled. The customer can try again.")
        return "failed"
    return "pending"


def verify_order(db: Session, business: Business, order: Order) -> str:
    """Ask the gateway about this order's payment (used when the customer returns from the gateway and while polling an M-Pesa prompt)."""
    if order.payment_status == "PAID" or not order.payment_provider or not order.payment_reference:
        return order.payment_status.lower()
    g, cfg, sec = _gateway(db, business, order.payment_provider)
    try:
        res = g.verify(cfg, sec, order.payment_reference)
    except Exception:  # noqa: BLE001
        return "pending"
    return confirm(db, business, order, status=res.status, amount=res.amount, currency=res.currency, source=g.label)


def handle_webhook(db: Session, business: Business, key: str, headers: dict, body: bytes, query: dict) -> tuple[int, str]:
    """(http_status, outcome). 401 when the signature is wrong; everything else is 200 so providers don't retry forever."""
    try:
        g, cfg, sec = _gateway(db, business, key)
    except Exception:  # noqa: BLE001
        return 404, "not_connected"
    try:
        ev = g.parse_webhook(cfg, sec, {k.lower(): v for k, v in headers.items()}, body, query)
    except Exception:  # noqa: BLE001
        return 400, "bad_payload"
    if ev is None:
        return 401, "bad_signature_or_ignored"
    rec = WebhookEvent(provider=f"{key}:{business.id}"[:16], event_id=f"{business.id}:{ev.event_id}"[:160], payload={"reference": ev.reference, "status": ev.status})
    try:
        with db.begin_nested():
            db.add(rec)
            db.flush()
    except IntegrityError:
        return 200, "duplicate"
    order = db.scalars(select(Order).where(Order.business_id == business.id, Order.payment_reference == ev.reference)).first()
    if order is None:
        rec.outcome = "unknown_order"
        return 200, "unknown_order"
    rec.outcome = confirm(db, business, order, status=ev.status, amount=ev.amount, currency=ev.currency, source=g.label)
    return 200, rec.outcome
