"""Storefront customer account API. The session lives in an httpOnly cookie scoped to this business; every state-changing request must carry
the X-Bizora header (so a form on another site can't act on a logged-in customer's behalf)."""
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.public import get_public_business
from app.core.config import get_settings
from app.core.db import get_db
from app.core.errors import bad_request, not_found
from app.core.rate_limit import rate_limit
from app.models import Booking, Business, Customer, CustomerAddress, Order, Product, SavedProduct
from app.services import customer_accounts as ca
from app.services import orders as order_svc

router = APIRouter(prefix="/public/{slug}/account", tags=["customer-account"])
COOKIE = "bz_customer"


def _cookie_name(b: Business) -> str:
    return f"{COOKIE}_{b.slug}"[:60]


def current(request: Request, b: Business = Depends(get_public_business), db: Session = Depends(get_db)) -> Customer:
    c = ca.read_session(db, b, request.cookies.get(_cookie_name(b)))
    if c is None:
        from fastapi import HTTPException
        raise HTTPException(401, "Please sign in")
    return c


def csrf(request: Request) -> None:
    if request.method in ("POST", "PATCH", "PUT", "DELETE") and request.headers.get("x-bizora") != "1":
        raise bad_request("Invalid request")


class CodeReq(BaseModel):
    identifier: str = Field(min_length=3, max_length=200)


class CodeVerify(BaseModel):
    identifier: str = Field(min_length=3, max_length=200)
    code: str = Field(min_length=4, max_length=8)
    name: str | None = Field(default=None, max_length=120)


@router.post("/otp/request", dependencies=[Depends(csrf), Depends(rate_limit("otp-req", 8, 600))])
def otp_request(body: CodeReq, b: Business = Depends(get_public_business), db: Session = Depends(get_db)):
    out = ca.request_code(db, b, body.identifier)
    db.commit()
    return out


@router.post("/otp/verify", dependencies=[Depends(csrf), Depends(rate_limit("otp-verify", 20, 600))])
def otp_verify(body: CodeVerify, response: Response, b: Business = Depends(get_public_business), db: Session = Depends(get_db)):
    try:
        cust = ca.verify_code(db, b, body.identifier, body.code, body.name)
    except Exception:
        db.commit()  # keep the attempt count
        raise
    db.commit()
    response.set_cookie(_cookie_name(b), ca.issue_session(cust), max_age=ca.SESSION_DAYS * 86400, httponly=True, samesite="lax", secure=get_settings().is_production, path="/")
    return _me(db, cust)


@router.post("/logout", dependencies=[Depends(csrf)])
def logout(response: Response, b: Business = Depends(get_public_business)):
    response.delete_cookie(_cookie_name(b), path="/")
    return {"ok": True}


def _addr(a: CustomerAddress) -> dict:
    return {"id": str(a.id), "label": a.label, "line": a.line, "zone": a.zone, "is_default": a.is_default}


def _me(db: Session, c: Customer) -> dict:
    addrs = db.scalars(select(CustomerAddress).where(CustomerAddress.customer_id == c.id, CustomerAddress.business_id == c.business_id).order_by(CustomerAddress.is_default.desc(), CustomerAddress.created_at))
    return {"id": str(c.id), "name": c.name, "phone": c.phone, "email": c.email, "addresses": [_addr(a) for a in addrs]}


@router.get("/me")
def me(c: Customer = Depends(current), db: Session = Depends(get_db)):
    return _me(db, c)


class ProfileIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    email: str | None = Field(default=None, max_length=200)


@router.patch("/me", dependencies=[Depends(csrf)])
def update_me(body: ProfileIn, c: Customer = Depends(current), db: Session = Depends(get_db)):
    if body.name:
        c.name = body.name.strip()
    if body.email is not None:
        e = body.email.strip().lower()
        if e:
            import re
            if not re.match(ca.EMAIL_RE, e):
                raise bad_request("Enter a valid email address")
            if db.scalar(select(Customer.id).where(Customer.business_id == c.business_id, Customer.email == e, Customer.id != c.id, Customer.deleted_at.is_(None))):
                raise bad_request("That email belongs to another account")
        c.email = e or None
    db.commit()
    return _me(db, c)


@router.get("/orders")
def my_orders(c: Customer = Depends(current), db: Session = Depends(get_db)):
    rows = db.scalars(select(Order).where(Order.business_id == c.business_id, Order.customer_id == c.id).order_by(Order.created_at.desc()).limit(50))
    return [{"number": o.number, "token": o.token, "status": o.status, "status_text": order_svc.STATUS_TEXT[o.status], "payment_status": o.payment_status, "total": float(o.total), "currency": o.currency,
             "created_at": o.created_at, "items": [f"{i.quantity}× {i.name}" for i in o.items]} for o in rows]


@router.get("/bookings")
def my_bookings(c: Customer = Depends(current), db: Session = Depends(get_db)):
    rows = db.scalars(select(Booking).where(Booking.business_id == c.business_id, Booking.customer_id == c.id, Booking.deleted_at.is_(None)).order_by(Booking.starts_at.desc()).limit(50))
    return [{"id": str(x.id), "starts_at": x.starts_at, "status": x.status, "total": float(x.total_amount), "currency": x.currency, "services": [i.name for i in x.items]} for x in rows]


@router.get("/saved")
def saved(c: Customer = Depends(current), db: Session = Depends(get_db)):
    rows = db.execute(select(Product).join(SavedProduct, SavedProduct.product_id == Product.id).where(SavedProduct.customer_id == c.id, Product.business_id == c.business_id,
                                                                                                Product.deleted_at.is_(None), Product.status == "ACTIVE").order_by(SavedProduct.created_at.desc())).scalars()
    return [{"id": str(p.id), "name": p.name, "slug": p.slug, "price": float(p.price), "currency": p.currency, "image": p.images[0] if p.images else None} for p in rows]


@router.post("/saved/{product_id}", status_code=201, dependencies=[Depends(csrf)])
def save_product(product_id: uuid.UUID, c: Customer = Depends(current), db: Session = Depends(get_db)):
    p = db.scalars(select(Product).where(Product.id == product_id, Product.business_id == c.business_id, Product.deleted_at.is_(None))).first()
    if p is None:
        raise not_found("Product")
    if not db.scalar(select(SavedProduct.id).where(SavedProduct.customer_id == c.id, SavedProduct.product_id == p.id)):
        db.add(SavedProduct(business_id=c.business_id, customer_id=c.id, product_id=p.id))
        db.commit()
    return {"saved": True}


@router.delete("/saved/{product_id}", dependencies=[Depends(csrf)])
def unsave_product(product_id: uuid.UUID, c: Customer = Depends(current), db: Session = Depends(get_db)):
    row = db.scalars(select(SavedProduct).where(SavedProduct.customer_id == c.id, SavedProduct.product_id == product_id, SavedProduct.business_id == c.business_id)).first()
    if row:
        db.delete(row)
        db.commit()
    return {"saved": False}


class AddrIn(BaseModel):
    label: str = Field(default="Home", max_length=40)
    line: str = Field(min_length=4, max_length=300)
    zone: str | None = Field(default=None, max_length=80)
    is_default: bool = False


@router.post("/addresses", status_code=201, dependencies=[Depends(csrf)])
def add_address(body: AddrIn, c: Customer = Depends(current), db: Session = Depends(get_db)):
    n = len(list(db.scalars(select(CustomerAddress.id).where(CustomerAddress.customer_id == c.id))))
    if n >= 10:
        raise bad_request("You can save up to 10 addresses")
    if body.is_default or n == 0:
        for a in db.scalars(select(CustomerAddress).where(CustomerAddress.customer_id == c.id)):
            a.is_default = False
    a = CustomerAddress(business_id=c.business_id, customer_id=c.id, label=body.label.strip() or "Home", line=body.line.strip(), zone=body.zone, is_default=body.is_default or n == 0)
    db.add(a)
    db.commit()
    return _addr(a)


@router.delete("/addresses/{aid}", dependencies=[Depends(csrf)])
def delete_address(aid: uuid.UUID, c: Customer = Depends(current), db: Session = Depends(get_db)):
    a = db.scalars(select(CustomerAddress).where(CustomerAddress.id == aid, CustomerAddress.customer_id == c.id, CustomerAddress.business_id == c.business_id)).first()
    if a:
        db.delete(a)
        db.commit()
    return {"ok": True}


@router.get("/session")
def session_check(request: Request, b: Business = Depends(get_public_business), db: Session = Depends(get_db)):
    """Lets storefront pages ask 'is someone signed in?' without a 401 in the console."""
    c = ca.read_session(db, b, request.cookies.get(_cookie_name(b)))
    return {"signed_in": c is not None, "name": c.name if c else None}
