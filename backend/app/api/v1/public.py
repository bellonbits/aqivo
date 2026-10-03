"""Unauthenticated endpoints used by public business pages. The tenant is the slug in the URL; every write is
rate-limited, validated, honeypot-protected, and only ever touches that one business."""
import hashlib
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.countries import normalize_phone
from app.core.db import get_db
from app.core.errors import bad_request, not_found
from app.core.rate_limit import rate_limit
from app.models import Business, Customer, Lead, Review, ReviewRequest, Service
from app.models.enums import BookingStatus, BusinessStatus, EventType, LeadStatus
from app.schemas.crm import PublicBookingIn, PublicEventIn, PublicLeadIn, PublicReviewIn
from app.services import analytics as an
from app.services import attribution as attr
from app.services import bookings as bk
from app.services.audit import client_ip
from app.services.notifications import notify
from app.services.plans import has_feature

router = APIRouter(prefix="/public/{slug}", tags=["public"])

BOT_HINTS = ("bot", "crawler", "spider", "curl", "python-requests", "headless", "lighthouse")


def get_public_business(slug: str, db: Session = Depends(get_db)) -> Business:
    b = db.scalars(select(Business).where(Business.slug == slug.lower(), Business.deleted_at.is_(None))).first()
    if not b or b.status != BusinessStatus.ACTIVE:
        raise not_found("Business")
    return b


def _honeypot(v: str) -> None:
    if v:
        raise HTTPException(400, "Invalid submission")


@router.get("/slots")
def slots(date_: date = Query(alias="date"), service_ids: list[uuid.UUID] = Query(), b: Business = Depends(get_public_business), db: Session = Depends(get_db),
          _rl=Depends(rate_limit("slots", 60, 60))):
    if not has_feature(db, b, "bookings"):
        raise not_found("Bookings")
    svcs = bk.load_services(db, b, service_ids)
    res = bk.compute_slots(db, b, svcs, date_)
    return res


@router.post("/bookings", status_code=201, dependencies=[Depends(rate_limit("public-book", 8, 600))])
def public_booking(body: PublicBookingIn, request: Request, b: Business = Depends(get_public_business), db: Session = Depends(get_db)):
    _honeypot(body.website)
    if not has_feature(db, b, "bookings"):
        raise not_found("Bookings")
    try:
        phone = normalize_phone(body.phone, b.country_code)
    except ValueError as e:
        raise bad_request(str(e))
    svcs = bk.load_services(db, b, body.service_ids)
    src, camp = attr.normalise_source(body.source, body.referrer), attr.clean_campaign(body.campaign)
    cust = bk.normalise_customer(db, b.id, body.name, phone, "WEBSITE", acq_source=src, acq_campaign=camp)
    booking = bk.create_booking(db, b, svcs, body.starts_at, name=body.name, phone=phone, source=attr.lead_source(body.source, body.referrer), notes=body.notes, customer_id=cust.id, status=BookingStatus.PENDING)
    booking.campaign = camp
    lead = Lead(business_id=b.id, name=body.name, phone=phone, message=body.notes, source=attr.lead_source(body.source, body.referrer), campaign=camp, service_id=svcs[0].id,
                service_name=", ".join(s.name for s in svcs), status=LeadStatus.BOOKED)
    db.add(lead)
    db.flush()
    booking.lead_id = lead.id
    an.record_event(db, b.id, EventType.BOOKING_REQUEST, visitor_hash=_visitor(request), source=src, service_id=svcs[0].id, campaign=camp)
    when = booking.starts_at.astimezone(__import__("zoneinfo").ZoneInfo(b.timezone)).strftime("%a %d %b, %H:%M")
    notify(db, "new_booking", b.email, business_id=b.id, customer=body.name, service=lead.service_name, when=when, phone=phone)
    db.commit()
    return {"ok": True, "message": "Booking requested", "booking_id": str(booking.id)}


@router.post("/leads", status_code=201, dependencies=[Depends(rate_limit("public-lead", 8, 600))])
def public_lead(body: PublicLeadIn, request: Request, b: Business = Depends(get_public_business), db: Session = Depends(get_db)):
    _honeypot(body.website)
    if not has_feature(db, b, "leads"):
        raise not_found("Enquiries")
    if not body.phone and not body.email:
        raise bad_request("Please add a phone number or email so we can reply")
    try:
        phone = normalize_phone(body.phone, b.country_code) if body.phone else None
    except ValueError as e:
        raise bad_request(str(e))
    svc = db.scalars(select(Service).where(Service.id == body.service_id, Service.business_id == b.id)).first() if body.service_id else None
    src = attr.lead_source(body.source, body.referrer)
    lead = Lead(business_id=b.id, name=body.name, phone=phone, email=body.email, message=body.message, source=src, campaign=attr.clean_campaign(body.campaign),
                service_id=svc.id if svc else None, service_name=svc.name if svc else None)
    db.add(lead)
    notify(db, "new_lead", b.email, business_id=b.id, customer=body.name, service=lead.service_name or "your business", source=src, phone=phone or body.email, message=body.message)
    db.commit()
    return {"ok": True}


@router.post("/reviews", status_code=201, dependencies=[Depends(rate_limit("public-review", 5, 900))])
def public_review(body: PublicReviewIn, b: Business = Depends(get_public_business), db: Session = Depends(get_db)):
    _honeypot(body.website)
    if not has_feature(db, b, "reviews"):
        raise not_found("Reviews")
    if body.product_id:
        return _product_review(body, b, db)
    rr = None
    if body.token:
        rr = db.scalars(select(ReviewRequest).where(ReviewRequest.token == body.token, ReviewRequest.business_id == b.id)).first()
        if rr is None or rr.completed_at is not None:
            raise bad_request("This review link has already been used or is invalid")
    review = Review(business_id=b.id, author_name=body.name, rating=body.rating, comment=body.comment.strip(), verified=rr is not None,
                    customer_id=rr.customer_id if rr else None, booking_id=rr.booking_id if rr else None, request_id=rr.id if rr else None)
    db.add(review)
    if rr:
        rr.completed_at = datetime.now(timezone.utc)
    notify(db, "review_received", b.email, business_id=b.id, rating=body.rating, author=body.name, comment=body.comment, business=b.name)
    db.commit()
    return {"ok": True}


def _visitor(request: Request) -> str:
    ua = request.headers.get("user-agent", "")
    day = datetime.now(timezone.utc).strftime("%Y%m%d")
    return hashlib.sha256(f"{client_ip(request)}|{ua}|{day}|{get_settings().secret_key}".encode()).hexdigest()[:32]  # daily-rotating, no raw IP stored


@router.post("/events", status_code=204, dependencies=[Depends(rate_limit("events", 120, 60))])
def event(body: PublicEventIn, request: Request, b: Business = Depends(get_public_business), db: Session = Depends(get_db)):
    ua = request.headers.get("user-agent", "").lower()
    if any(h in ua for h in BOT_HINTS) or body.event_type not in {e.value for e in EventType}:
        return
    if body.event_type in (EventType.BOOKING_REQUEST, EventType.ORDER_PLACED):  # server-recorded only
        return
    sid = pid = None
    if body.service_id:
        sid = db.scalar(select(Service.id).where(Service.id == body.service_id, Service.business_id == b.id))
    if body.product_id:
        from app.models import Product
        pid = db.scalar(select(Product.id).where(Product.id == body.product_id, Product.business_id == b.id))
    own = request.headers.get("host", "").split(":")[0]
    an.record_event(db, b.id, body.event_type, visitor_hash=_visitor(request), source=attr.normalise_source(body.source, body.referrer, own), service_id=sid, product_id=pid,
                    session_id=body.session_id, campaign=attr.clean_campaign(body.campaign), path=body.path)
    db.commit()


def _product_review(body: PublicReviewIn, b: Business, db: Session):
    """A review of one product, allowed only with the token of a completed order that contained it (so it is a verified purchase)."""
    from app.models import Order, OrderItem, Product
    p = db.scalars(select(Product).where(Product.id == body.product_id, Product.business_id == b.id, Product.deleted_at.is_(None))).first()
    order = db.scalars(select(Order).where(Order.token == (body.token or ""), Order.business_id == b.id, Order.status == "COMPLETED")).first()
    if p is None or order is None or not any(i.product_id == p.id for i in order.items):
        raise bad_request("You can review a product after your order is completed")
    if db.scalar(select(Review.id).where(Review.business_id == b.id, Review.product_id == p.id, Review.customer_id == order.customer_id, Review.deleted_at.is_(None))):
        raise bad_request("You've already reviewed this product")
    db.add(Review(business_id=b.id, author_name=body.name, rating=body.rating, comment=body.comment.strip(), verified=True, customer_id=order.customer_id, product_id=p.id))
    notify(db, "review_received", b.email, business_id=b.id, rating=body.rating, author=body.name, comment=f"[{p.name}] {body.comment}", business=b.name)
    db.commit()
    return {"ok": True}
