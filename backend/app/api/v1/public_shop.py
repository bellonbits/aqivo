"""Public cart, order and search endpoints. The slug is the tenant; prices, fees and discounts are always recomputed server-side."""
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.v1.public import _honeypot, _visitor, get_public_business
from app.core.countries import normalize_phone
from app.core.db import get_db
from app.core.errors import bad_request, not_found
from app.core.rate_limit import rate_limit
from app.models import Business, Order, Product, Service
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
    kind: Literal["product", "service"] = "product"
    id: uuid.UUID
    variant_id: uuid.UUID | None = None
    qty: int = Field(ge=1, le=99)


class QuoteIn(BaseModel):
    lines: list[CartLine] = Field(min_length=1, max_length=50)
    delivery_method: Literal["PICKUP", "DELIVERY"] = "PICKUP"
    zone: str | None = Field(default=None, max_length=80)
    code: str | None = Field(default=None, max_length=32)
    phone: str | None = Field(default=None, max_length=32)


class OrderIn(BaseModel):
    lines: list[CartLine] = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    delivery_method: Literal["PICKUP", "DELIVERY"] = "PICKUP"
    zone: str | None = Field(default=None, max_length=80)
    address: str = Field(default="", max_length=400)
    notes: str = Field(default="", max_length=600)
    scheduled_for: str | None = Field(default=None, max_length=16)
    payment: str = Field(max_length=16)
    code: str | None = Field(default=None, max_length=32)
    source: str | None = Field(default=None, max_length=48)
    campaign: str | None = Field(default=None, max_length=64)
    referrer: str | None = Field(default=None, max_length=300)
    website: str = ""


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


@router.get("/orders/{token}")
def get_order(token: str, b: Business = Depends(get_public_business), db: Session = Depends(get_db)):
    o = db.scalars(select(Order).where(Order.business_id == b.id, Order.token == token)).first()
    if o is None:
        raise not_found("Order")
    return {"number": o.number, "status": o.status, "payment_status": o.payment_status, "total": float(o.total), "currency": o.currency,
            "items": [{"name": i.name, "variant": i.variant_title, "qty": i.quantity, "total": float(i.line_total)} for i in o.items],
            "timeline": [{"message": e.message, "at": e.created_at.isoformat()} for e in o.events if e.kind != "NOTE"]}


def _order(db: Session, b: Business, token: str) -> Order:
    o = db.scalars(select(Order).where(Order.business_id == b.id, Order.token == token)).first()
    if o is None:
        raise not_found("Order")
    return o


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
    o = db.scalars(select(Order).where(Order.business_id == b.id, Order.token == token)).first()
    if o is None:
        raise not_found("Order")
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
