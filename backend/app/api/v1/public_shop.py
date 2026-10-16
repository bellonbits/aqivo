"""Public cart, order and search endpoints. The slug is the tenant; prices, fees and discounts are always recomputed server-side."""
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.v1.public import _honeypot, _visitor, get_public_business
from app.core.countries import normalize_phone
from app.core.db import get_db
from app.core.errors import bad_request, not_found
from app.core.rate_limit import rate_limit
from app.models import Business, Customer, Order, Product, Service
from app.models.enums import EventType
from app.services import analytics as an
from app.services import attribution as attr
from app.services import online_payments
from app.services import orders as order_svc
from app.services import pricing
from app.services import store as store_cfg
from app.services.business import whatsapp_link

router = APIRouter(prefix="/public/{slug}", tags=["public-shop"])


class CartLine(BaseModel):
    kind: str = "product"
    id: uuid.UUID
    variant_id: uuid.UUID | None = None
    qty: int = Field(default=1, ge=1, le=99)

    @field_validator("kind", mode="before")
    @classmethod
    def clean_kind(cls, v):
        if isinstance(v, str) and v.strip().lower() in ("product", "service"):
            return v.strip().lower()
        return "product"

    @field_validator("variant_id", mode="before")
    @classmethod
    def clean_variant(cls, v):
        if not v or v in ("null", "undefined", "none", "", "None"):
            return None
        return v


class QuoteIn(BaseModel):
    lines: list[CartLine] = Field(default_factory=list, max_length=50)
    delivery_method: str = "PICKUP"
    zone: str | None = Field(default=None, max_length=80)
    code: str | None = Field(default=None, max_length=32)
    phone: str | None = Field(default=None, max_length=32)

    @field_validator("delivery_method", mode="before")
    @classmethod
    def clean_delivery(cls, v):
        if isinstance(v, str) and v.strip().upper() in ("PICKUP", "DELIVERY"):
            return v.strip().upper()
        return "PICKUP"

    @field_validator("zone", "code", "phone", mode="before")
    @classmethod
    def clean_empty_strings(cls, v):
        if not v or (isinstance(v, str) and not v.strip()):
            return None
        return v.strip() if isinstance(v, str) else v


class OrderIn(BaseModel):
    lines: list[CartLine] = Field(default_factory=list, max_length=50)
    name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    email: str | None = Field(default=None, max_length=120)
    delivery_method: str = "PICKUP"
    zone: str | None = Field(default=None, max_length=80)
    address: str = Field(default="", max_length=400)
    notes: str = Field(default="", max_length=600)
    scheduled_for: str | None = Field(default=None, max_length=32)
    payment: str = Field(default="cash", max_length=32)
    code: str | None = Field(default=None, max_length=32)
    source: str | None = Field(default=None, max_length=48)
    campaign: str | None = Field(default=None, max_length=64)
    referrer: str | None = Field(default=None, max_length=300)
    website: str = ""

    @field_validator("delivery_method", mode="before")
    @classmethod
    def clean_delivery(cls, v):
        if isinstance(v, str) and v.strip().upper() in ("PICKUP", "DELIVERY"):
            return v.strip().upper()
        return "PICKUP"

    @field_validator("email", "phone", "zone", "code", "source", "campaign", "referrer", "scheduled_for", mode="before")
    @classmethod
    def clean_empty_strings(cls, v):
        if not v or (isinstance(v, str) and not v.strip()):
            return None
        return v.strip() if isinstance(v, str) else v


class RefIn(BaseModel):
    reference: str = Field(max_length=60)


def _lines(body) -> list[dict]:
    return [{"kind": ln.kind, "id": str(ln.id), "variant_id": str(ln.variant_id) if ln.variant_id else None, "qty": ln.qty} for ln in body.lines]


def _phone(b: Business, raw: str | None) -> str | None:
    if not raw:
        return None
    try:
        return normalize_phone(raw, b.country_code)
    except ValueError as e:
        raise bad_request(str(e))


@router.get("/checkout-config")
def checkout_config(b: Business = Depends(get_public_business), db: Session = Depends(get_db)):
    return store_cfg.public_config(b, db)


@router.post("/cart/quote", dependencies=[Depends(rate_limit("quote", 90, 60))])
def quote(body: QuoteIn, b: Business = Depends(get_public_business), db: Session = Depends(get_db)):
    if not body.lines:
        raise bad_request("Your shopping bag is empty")
    phone = None
    try:
        phone = _phone(b, body.phone)
    except Exception:  # noqa: BLE001  (a half-typed phone must not block pricing)
        phone = None
    q = pricing.quote(db, b, _lines(body), delivery_method=body.delivery_method, zone=body.zone, code=body.code, phone=phone)
    return pricing.quote_json(q)


@router.post("/orders", status_code=201, dependencies=[Depends(rate_limit("order", 6, 600))])
def place_order(body: OrderIn, request: Request, b: Business = Depends(get_public_business), db: Session = Depends(get_db)):
    _honeypot(body.website)
    if not body.lines:
        raise bad_request("Your shopping bag is empty")
    phone = _phone(b, body.phone)
    o = order_svc.place(db, b, raw_lines=_lines(body), name=body.name.strip(), phone=phone, email=str(body.email) if body.email else None, delivery_method=body.delivery_method,
                        zone=body.zone, address=body.address, notes=body.notes, scheduled_for=body.scheduled_for, payment_key=body.payment, code=body.code, source=attr.normalise_source(body.source, body.referrer), campaign=attr.clean_campaign(body.campaign))
    an.record_event(db, b.id, EventType.ORDER_PLACED, visitor_hash=_visitor(request), source=o.source, campaign=o.campaign)
    out = {"ok": True, "number": o.number, "token": o.token, "total": float(o.total), "payment": None}
    method = next((m for m in store_cfg.enabled_payments(b, db) if m["key"] == body.payment), None)
    if method and method.get("gateway"):
        db.commit()  # the order exists even if the gateway is down; the customer can retry from the order page
        try:
            out["payment"] = online_payments.start(db, b, o, method["gateway"], phone=phone)
            db.commit()
        except HTTPException as e:
            db.commit()
            out["payment_error"] = e.detail if isinstance(e.detail, str) else "The payment couldn't be started"
        return out
    db.commit()
    return out


class CancelOrderIn(BaseModel):
    reason: str = Field(default="", max_length=300)


def _find_order_secure(
    db: Session,
    b: Business,
    ref: str,
    *,
    token: str | None = None,
    phone: str | None = None,
    request: Request | None = None,
) -> Order:
    """Find an order by unguessable token or order number/id, validating access credentials."""
    # 1. Match by random token directly
    o = db.scalars(select(Order).where(Order.business_id == b.id, Order.token == ref)).first()
    if o is not None:
        return o

    # 2. Parse potential order numbers or UUIDs
    clean_num = None
    if ref.isdigit():
        clean_num = int(ref)
    elif ref.upper().startswith("AQ-") and ref[3:].isdigit():
        clean_num = int(ref[3:])
    elif ref.upper().startswith("ORD-") and ref[4:].isdigit():
        clean_num = int(ref[4:])
    elif ref.startswith("#") and ref[1:].isdigit():
        clean_num = int(ref[1:])

    uuid_obj = None
    try:
        uuid_obj = uuid.UUID(ref)
    except Exception:
        pass

    conds = []
    if clean_num is not None:
        conds.append(Order.number == clean_num)
    if uuid_obj is not None:
        conds.append(Order.id == uuid_obj)

    if not conds:
        raise not_found("Order")

    o = db.scalars(select(Order).where(Order.business_id == b.id, or_(*conds))).first()
    if o is None:
        raise not_found("Order")

    # 3. Security check: if looked up by sequential number or ID instead of token:
    # Must provide matching order token OR customer phone / authenticated session!
    tok_param = token or (request.query_params.get("token") if request else None) or (request.headers.get("x-order-token") if request else None)
    if tok_param and tok_param == o.token:
        return o

    phone_param = phone or (request.query_params.get("phone") if request else None) or (request.headers.get("x-customer-phone") if request else None)
    if phone_param:
        try:
            norm_phone = normalize_phone(phone_param, b.country_code)
            if o.customer_phone and (norm_phone == o.customer_phone or norm_phone.endswith(o.customer_phone[-9:])):
                return o
        except Exception:
            pass

    if request:
        try:
            from app.api.v1.public_account import _cookie_name
            from app.services import customer_auth as ca
            sess_tok = request.cookies.get(_cookie_name(b))
            if not sess_tok and request.headers.get("authorization", "").startswith("Bearer "):
                sess_tok = request.headers.get("authorization")[7:].strip()
            if sess_tok:
                cust = ca.read_session(db, b, sess_tok)
                if cust and cust.id == o.customer_id:
                    return o
        except Exception:
            pass

    raise not_found("Order")


def _format_order_response(o: Order, b: Business, db: Session) -> dict:
    STATUS_LABELS = {
        "PENDING": "Awaiting seller confirmation",
        "CONFIRMED": "Accepted by seller",
        "PREPARING": "Preparing your order",
        "READY": "Ready for collection / Out for delivery",
        "COMPLETED": "Completed",
        "CANCELLED": "Cancelled",
        "REFUNDED": "Refunded",
    }

    step_keys = [
        ("PLACED", "Order placed", True, o.created_at.isoformat() if o.created_at else None),
        ("CONFIRMED", "Accepted", o.status in ("CONFIRMED", "PREPARING", "READY", "COMPLETED"), None),
        ("PREPARING", "Preparing", o.status in ("PREPARING", "READY", "COMPLETED"), None),
        ("READY", "Ready / Out for delivery" if o.delivery_method == "DELIVERY" else "Ready for collection", o.status in ("READY", "COMPLETED"), None),
        ("COMPLETED", "Completed", o.status == "COMPLETED", None),
    ]

    event_times = {e.status: e.created_at.isoformat() for e in o.events if e.status}
    tracking_steps = []
    for code, title, is_done, default_time in step_keys:
        t = event_times.get(code) or default_time
        tracking_steps.append({
            "code": code,
            "title": title,
            "done": bool(is_done),
            "current": o.status == code or (code == "PLACED" and o.status == "PENDING"),
            "time": t,
        })

    pay_instructions = ""
    try:
        enabled = store_cfg.enabled_payments(b, db)
        meth_key = o.payment_method.lower() if o.payment_method else ""
        for p in enabled:
            if p.get("method") == o.payment_method or p.get("key") == meth_key:
                pay_instructions = p.get("instructions", "")
                break
    except Exception:
        pass

    return_policy = (
        getattr(b, "return_policy", None) or
        "30-day return policy for unused, undamaged items in original condition. Contact the store directly for returns, replacements, and exchanges."
    )

    CURRENCY_SYMBOLS = {"KES": "KSh", "USD": "$", "ZAR": "R", "NGN": "₦", "TZS": "TSh", "UGX": "USh", "RWF": "RF", "ETB": "Br", "EUR": "€", "GBP": "£"}
    sym = CURRENCY_SYMBOLS.get(o.currency, o.currency or "KSh")

    return {
        "id": str(o.id),
        "number": o.number,
        "receipt_no": f"AQ-{o.number}",
        "token": o.token,
        "status": o.status,
        "status_label": STATUS_LABELS.get(o.status, o.status),
        "payment_status": o.payment_status,
        "payment_method": o.payment_method,
        "payment_instructions": pay_instructions,
        "payment_reference": o.payment_reference,
        "currency": o.currency,
        "currency_symbol": sym,
        "subtotal": float(o.subtotal or 0),
        "discount": float(o.discount or 0),
        "delivery_fee": float(o.delivery_fee or 0),
        "tax": float(o.tax or 0),
        "total": float(o.total or 0),
        "customer": {
            "name": o.customer_name,
            "phone": o.customer_phone,
            "email": o.customer_email,
            "address": o.address,
        },
        "delivery": {
            "method": o.delivery_method,
            "zone": o.delivery_zone,
            "address": o.address,
            "fee": float(o.delivery_fee or 0),
            "scheduled_for": o.scheduled_for,
        },
        "notes": o.notes,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "store": {
            "name": b.name,
            "slug": b.slug,
            "phone": b.phone or b.whatsapp or "",
            "whatsapp": b.whatsapp or b.phone or "",
            "email": b.email or "",
            "address": b.address or "",
            "return_policy": return_policy,
        },
        "items": [
            {
                "name": i.name,
                "variant": i.variant_title,
                "qty": i.quantity,
                "unit_price": float(i.unit_price or 0),
                "total": float(i.line_total or 0),
                "image": i.image_url or "",
            }
            for i in o.items
        ],
        "timeline": [
            {"kind": e.kind, "status": e.status, "message": e.message, "at": e.created_at.isoformat()}
            for e in o.events if e.kind != "NOTE"
        ],
        "tracking_steps": tracking_steps,
        "can_cancel": bool(o.status in ("PENDING", "CONFIRMED")),
    }


@router.get("/orders/{token}")
def get_order(
    token: str,
    request: Request,
    token_param: str | None = Query(default=None, alias="token"),
    phone: str | None = Query(default=None),
    b: Business = Depends(get_public_business),
    db: Session = Depends(get_db),
):
    o = _find_order_secure(db, b, token, token=token_param, phone=phone, request=request)
    return _format_order_response(o, b, db)


def _order(db: Session, b: Business, token: str) -> Order:
    return _find_order_secure(db, b, token)


@router.post("/orders/{token}/cancel")
def cancel_order(
    token: str,
    request: Request,
    body: CancelOrderIn | None = None,
    token_param: str | None = Query(default=None, alias="token"),
    phone: str | None = Query(default=None),
    b: Business = Depends(get_public_business),
    db: Session = Depends(get_db),
):
    o = _find_order_secure(db, b, token, token=token_param, phone=phone, request=request)
    if o.status in ("CANCELLED", "REFUNDED"):
        return _format_order_response(o, b, db)
    if o.status not in ("PENDING", "CONFIRMED"):
        raise bad_request(f"This order cannot be cancelled because it is already {order_svc.STATUS_TEXT.get(o.status, o.status).lower()}.")
    reason = (body.reason if body and body.reason else "").strip() or "Cancelled by customer via receipt"
    order_svc.set_status(db, o, "CANCELLED", actor="Customer", note=reason)
    db.commit()
    return _format_order_response(o, b, db)


@router.post("/orders/{token}/pay", dependencies=[Depends(rate_limit("pay", 10, 600))])
def pay_again(token: str, b: Business = Depends(get_public_business), db: Session = Depends(get_db)):
    """Start (or restart) an online payment for an order that isn't paid yet."""
    o = _order(db, b, token)
    gw_key = next((m["gateway"] for m in store_cfg.enabled_payments(b, db) if m.get("gateway") and (o.payment_provider is None or m["gateway"] == o.payment_provider)), None)
    if o.payment_method not in ("ONLINE", "MPESA") or gw_key is None:
        raise bad_request("This order can't be paid online")
    res = online_payments.start(db, b, o, gw_key)
    db.commit()
    return res


@router.post("/orders/{token}/verify-payment", dependencies=[Depends(rate_limit("payverify", 40, 600))])
def verify_payment(token: str, b: Business = Depends(get_public_business), db: Session = Depends(get_db)):
    o = _order(db, b, token)
    out = online_payments.verify_order(db, b, o)
    db.commit()
    return {"payment_status": o.payment_status, "result": out}


@router.post("/orders/{token}/payment-reference", dependencies=[Depends(rate_limit("payref", 10, 600))])
def payment_reference(token: str, body: RefIn, b: Business = Depends(get_public_business), db: Session = Depends(get_db)):
    o = _order(db, b, token)
    order_svc.customer_reference(db, o, body.reference)
    o.payment_status = "PENDING"
    db.commit()
    return {"ok": True}


@router.get("/search", dependencies=[Depends(rate_limit("suggest", 120, 60))])
def search(q: str = Query(min_length=2, max_length=80), b: Business = Depends(get_public_business), db: Session = Depends(get_db)):
    like = f"%{q.strip()}%"
    out = []
    for p in db.scalars(select(Product).where(Product.business_id == b.id, Product.deleted_at.is_(None), Product.status == "ACTIVE", or_(Product.name.ilike(like), Product.sku.ilike(like))).limit(6)):
        out.append({"name": p.name, "kind": "Product", "url": f"/products/{p.slug}"})
    for s in db.scalars(select(Service).where(Service.business_id == b.id, Service.deleted_at.is_(None), Service.is_active.is_(True), Service.name.ilike(like), Service.slug.isnot(None)).limit(4)):
        out.append({"name": s.name, "kind": "Service", "url": f"/services/{s.slug}"})
    return {"results": out[:8]}
