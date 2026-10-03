import uuid
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import TenantContext, require, require_feature
from app.api.helpers import log
from app.core.countries import normalize_phone
from app.core.db import get_db
from app.core.errors import bad_request, forbidden, or404
from app.core.security import random_token
from app.models import Booking, Customer, CustomerNote, Lead, Review, ReviewRequest
from app.models.enums import BookingStatus, LeadStatus
from app.repositories import (BookingRepository, CustomerNoteRepository, CustomerRepository, LeadRepository, ReviewRepository, ReviewRequestRepository, ServiceRepository)
from app.schemas.common import Page
from app.schemas.crm import (BookingIn, BookingOut, BookingUpdate, CustomerIn, CustomerOut, CustomerUpdate, LeadIn, LeadOut, LeadUpdate, NoteIn, NoteOut,
                             ReviewOut, ReviewRequestIn, ReviewRespond)
from app.services import bookings as bk
from app.services import crm as crm_svc
from app.services.business import business_urls
from app.services.marketing import wa_link

leads_router = APIRouter(prefix="/leads", tags=["leads"])
customers_router = APIRouter(prefix="/customers", tags=["customers"])
bookings_router = APIRouter(prefix="/bookings", tags=["bookings"])
reviews_router = APIRouter(prefix="/reviews", tags=["reviews"])


def _phone(ctx, v):
    if not v:
        return None
    try:
        return normalize_phone(v, ctx.business.country_code)
    except ValueError as e:
        raise bad_request(str(e))


# ============================ leads =======================================
@leads_router.get("", response_model=Page[LeadOut])
def list_leads(status: str | None = None, source: str | None = None, q: str | None = None, limit: int = Query(50, le=200), offset: int = 0,
               ctx: TenantContext = Depends(require_feature("leads", "leads:read")), db: Session = Depends(get_db)):
    repo = LeadRepository(db, ctx.business_id)
    where = []
    if status:
        where.append(Lead.status == status)
    if source:
        where.append(Lead.source == source)
    if q:
        where.append(or_(Lead.name.ilike(f"%{q}%"), Lead.phone.ilike(f"%{q}%")))
    return Page(items=repo.list(*where, order_by=Lead.created_at.desc(), limit=limit, offset=offset), total=repo.count(*where), limit=limit, offset=offset)


@leads_router.get("/counts")
def lead_counts(ctx: TenantContext = Depends(require_feature("leads", "leads:read")), db: Session = Depends(get_db)):
    rows = db.execute(select(Lead.status, func.count()).where(Lead.business_id == ctx.business_id, Lead.deleted_at.is_(None)).group_by(Lead.status)).all()
    return {s: c for s, c in rows}


@leads_router.post("", response_model=LeadOut, status_code=201)
def create_lead(body: LeadIn, request: Request, ctx: TenantContext = Depends(require_feature("leads", "leads:write")), db: Session = Depends(get_db)):
    svc = ServiceRepository(db, ctx.business_id).get(body.service_id) if body.service_id else None
    lead = LeadRepository(db, ctx.business_id).add(name=body.name, phone=_phone(ctx, body.phone), email=body.email, message=body.message, source=body.source,
                                                   service_id=svc.id if svc else None, service_name=svc.name if svc else None)
    log(ctx, "lead.created", request, "lead", lead.id)
    db.commit()
    return lead


@leads_router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: uuid.UUID, body: LeadUpdate, request: Request, ctx: TenantContext = Depends(require_feature("leads", "leads:write")), db: Session = Depends(get_db)):
    repo = LeadRepository(db, ctx.business_id)
    lead = or404(repo.get(lead_id), "Lead")
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] != LeadStatus.NEW and lead.first_response_at is None:
        lead.first_response_at = datetime.now(timezone.utc)
    repo.update(lead, **data)
    log(ctx, "lead.updated", request, "lead", lead.id, status=lead.status)
    db.commit()
    return lead


@leads_router.post("/{lead_id}/convert", response_model=CustomerOut)
def convert_lead(lead_id: uuid.UUID, request: Request, ctx: TenantContext = Depends(require_feature("leads", "leads:write")), db: Session = Depends(get_db)):
    lead = or404(LeadRepository(db, ctx.business_id).get(lead_id), "Lead")
    cust = crm_svc.convert_lead_to_customer(db, lead)
    log(ctx, "lead.converted", request, "lead", lead.id, customer_id=str(cust.id))
    db.commit()
    return _customer_out(db, ctx, [cust])[0]


@leads_router.delete("/{lead_id}", status_code=204)
def delete_lead(lead_id: uuid.UUID, ctx: TenantContext = Depends(require_feature("leads", "leads:write")), db: Session = Depends(get_db)):
    repo = LeadRepository(db, ctx.business_id)
    repo.delete(or404(repo.get(lead_id), "Lead"))
    db.commit()


# ========================== customers ======================================
def _customer_out(db, ctx, customers: list[Customer]) -> list[CustomerOut]:
    stats = crm_svc.customer_stats(db, ctx.business_id, [c.id for c in customers])
    out = []
    for c in customers:
        o = CustomerOut.model_validate(c)
        for k, v in stats.get(c.id, {}).items():
            setattr(o, k, v)
        out.append(o)
    return out


@customers_router.get("", response_model=Page[CustomerOut])
def list_customers(q: str | None = None, limit: int = Query(50, le=200), offset: int = 0,
                   ctx: TenantContext = Depends(require_feature("customers", "customers:read")), db: Session = Depends(get_db)):
    repo = CustomerRepository(db, ctx.business_id)
    where = []
    if q:
        where.append(or_(Customer.name.ilike(f"%{q}%"), Customer.phone.ilike(f"%{q}%"), Customer.email.ilike(f"%{q}%")))
    if ctx.assigned_only:  # staff only see customers on their own bookings
        where.append(Customer.id.in_(select(Booking.customer_id).where(Booking.business_id == ctx.business_id, Booking.staff_id == ctx.staff_id)))
    items = repo.list(*where, order_by=Customer.created_at.desc(), limit=limit, offset=offset)
    return Page(items=_customer_out(db, ctx, items), total=repo.count(*where), limit=limit, offset=offset)


@customers_router.get("/inactive")
def inactive(days: int = Query(45, ge=7, le=365), ctx: TenantContext = Depends(require_feature("customers", "customers:read")), db: Session = Depends(get_db)):
    rows = crm_svc.inactive_customers(db, ctx.business_id, days)
    return {"days": days, "count": len(rows), "customers": [{"id": str(c.id), "name": c.name, "phone": c.phone, "last_visit": lv} for c, lv in rows[:100]]}


@customers_router.get("/retention-buckets")
def buckets(ctx: TenantContext = Depends(require_feature("customers", "customers:read")), db: Session = Depends(get_db)):
    return {str(d): len(crm_svc.inactive_customers(db, ctx.business_id, d)) for d in (30, 45, 60, 90)}


@customers_router.post("", response_model=CustomerOut, status_code=201)
def create_customer(body: CustomerIn, request: Request, ctx: TenantContext = Depends(require_feature("customers", "customers:write")), db: Session = Depends(get_db)):
    c = CustomerRepository(db, ctx.business_id).add(name=body.name, phone=_phone(ctx, body.phone), email=body.email, birthday=body.birthday, notes=body.notes, source=body.source)
    log(ctx, "customer.created", request, "customer", c.id)
    db.commit()
    return _customer_out(db, ctx, [c])[0]


def _get_customer(db, ctx, cid) -> Customer:
    c = or404(CustomerRepository(db, ctx.business_id).get(cid), "Customer")
    if ctx.assigned_only and not db.scalar(select(Booking.id).where(Booking.business_id == ctx.business_id, Booking.customer_id == cid, Booking.staff_id == ctx.staff_id)):
        raise forbidden()
    return c


@customers_router.get("/{cid}")
def get_customer(cid: uuid.UUID, ctx: TenantContext = Depends(require_feature("customers", "customers:read")), db: Session = Depends(get_db)):
    c = _get_customer(db, ctx, cid)
    notes = CustomerNoteRepository(db, ctx.business_id).list(CustomerNote.customer_id == cid, order_by=CustomerNote.created_at.desc())
    bookings = BookingRepository(db, ctx.business_id).list(Booking.customer_id == cid, order_by=Booking.starts_at.desc(), limit=50)
    return {"customer": _customer_out(db, ctx, [c])[0], "notes": [NoteOut.model_validate(n) for n in notes], "bookings": [BookingOut.model_validate(b) for b in bookings]}


@customers_router.get("/{cid}/timeline")
def customer_timeline(cid: uuid.UUID, ctx: TenantContext = Depends(require_feature("customers", "customers:read")), db: Session = Depends(get_db)):
    c = _get_customer(db, ctx, cid)
    return {"events": crm_svc.timeline(db, ctx.business_id, c)}


@customers_router.patch("/{cid}", response_model=CustomerOut)
def update_customer(cid: uuid.UUID, body: CustomerUpdate, request: Request, ctx: TenantContext = Depends(require_feature("customers", "customers:write")), db: Session = Depends(get_db)):
    c = _get_customer(db, ctx, cid)
    data = body.model_dump(exclude_unset=True)
    if "phone" in data:
        data["phone"] = _phone(ctx, data["phone"])
    CustomerRepository(db, ctx.business_id).update(c, **data)
    log(ctx, "customer.updated", request, "customer", c.id)
    db.commit()
    return _customer_out(db, ctx, [c])[0]


@customers_router.delete("/{cid}", status_code=204)
def delete_customer(cid: uuid.UUID, request: Request, ctx: TenantContext = Depends(require_feature("customers", "customers:write")), db: Session = Depends(get_db)):
    if not ctx.can("*"):
        raise forbidden("Only the owner can delete customers")
    repo = CustomerRepository(db, ctx.business_id)
    repo.delete(or404(repo.get(cid), "Customer"))
    log(ctx, "customer.deleted", request, "customer", cid)
    db.commit()


@customers_router.post("/{cid}/notes", response_model=NoteOut, status_code=201)
def add_note(cid: uuid.UUID, body: NoteIn, ctx: TenantContext = Depends(require_feature("customers", "customers:write")), db: Session = Depends(get_db)):
    c = _get_customer(db, ctx, cid)
    n = CustomerNoteRepository(db, ctx.business_id).add(customer_id=c.id, author_id=ctx.user.id, kind=body.kind, body=body.body)
    if body.kind != "NOTE":
        c.last_contacted_at = datetime.now(timezone.utc)
    db.commit()
    return n


# ============================ bookings =====================================
def _booking_filters(ctx, status, start, end):
    where = []
    if status:
        where.append(Booking.status == status)
    if start:
        where.append(Booking.starts_at >= start)
    if end:
        where.append(Booking.starts_at < end)
    if ctx.assigned_only:
        where.append(Booking.staff_id == ctx.staff_id)
    return where


@bookings_router.get("", response_model=Page[BookingOut])
def list_bookings(status: str | None = None, start: datetime | None = None, end: datetime | None = None, limit: int = Query(100, le=300), offset: int = 0,
                  order: str = "asc", ctx: TenantContext = Depends(require_feature("bookings", "bookings:read")), db: Session = Depends(get_db)):
    repo = BookingRepository(db, ctx.business_id)
    where = _booking_filters(ctx, status, start, end)
    ob = Booking.starts_at.asc() if order == "asc" else Booking.starts_at.desc()
    return Page(items=repo.list(*where, order_by=ob, limit=limit, offset=offset), total=repo.count(*where), limit=limit, offset=offset)


@bookings_router.get("/overview")
def overview(ctx: TenantContext = Depends(require_feature("bookings", "bookings:read")), db: Session = Depends(get_db)):
    tz = ZoneInfo(ctx.business.timezone)
    now = datetime.now(tz)
    start = datetime.combine(now.date(), time.min, tz).astimezone(timezone.utc)
    end = start + timedelta(days=1)
    base = [Booking.business_id == ctx.business_id, Booking.deleted_at.is_(None)]
    if ctx.assigned_only:
        base.append(Booking.staff_id == ctx.staff_id)
    def cnt(*w): return db.scalar(select(func.count()).select_from(Booking).where(*base, *w)) or 0
    return {"today": cnt(Booking.starts_at >= start, Booking.starts_at < end, Booking.status.in_((BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED))),
            "upcoming": cnt(Booking.starts_at >= end, Booking.status.in_((BookingStatus.PENDING, BookingStatus.CONFIRMED))),
            "pending": cnt(Booking.status == BookingStatus.PENDING, Booking.starts_at >= start),
            "completed": cnt(Booking.status == BookingStatus.COMPLETED), "cancelled": cnt(Booking.status == BookingStatus.CANCELLED),
            "no_show": cnt(Booking.status == BookingStatus.NO_SHOW)}


@bookings_router.get("/slots")
def slots(date_: date = Query(alias="date"), service_ids: list[uuid.UUID] = Query(), ctx: TenantContext = Depends(require_feature("bookings", "bookings:read")), db: Session = Depends(get_db)):
    svcs = bk.load_services(db, ctx.business, service_ids)
    return bk.compute_slots(db, ctx.business, svcs, date_)


@bookings_router.post("", response_model=BookingOut, status_code=201)
def create_booking(body: BookingIn, request: Request, ctx: TenantContext = Depends(require_feature("bookings", "bookings:write")), db: Session = Depends(get_db)):
    svcs = bk.load_services(db, ctx.business, body.service_ids)
    cust = None
    if body.customer_id:
        cust = or404(CustomerRepository(db, ctx.business_id).get(body.customer_id), "Customer")
    name = cust.name if cust else (body.customer_name or "").strip()
    if not name:
        raise bad_request("Customer name is required")
    phone = cust.phone if cust else _phone(ctx, body.customer_phone)
    if cust is None:
        cust = bk.normalise_customer(db, ctx.business_id, name, phone, body.source)
    if ctx.assigned_only:
        body.staff_id = ctx.staff_id
    b = bk.create_booking(db, ctx.business, svcs, body.starts_at, name=name, phone=phone, source=body.source, notes=body.notes, staff_id=body.staff_id,
                          customer_id=cust.id, status=BookingStatus.CONFIRMED, enforce_availability=not (body.ignore_availability and ctx.can("*")))
    log(ctx, "booking.created", request, "booking", b.id)
    db.commit()
    return b


def _get_booking(db, ctx, bid) -> Booking:
    b = or404(BookingRepository(db, ctx.business_id).get(bid), "Booking")
    if ctx.assigned_only and b.staff_id != ctx.staff_id:
        raise forbidden()
    return b


@bookings_router.patch("/{bid}", response_model=BookingOut)
def update_booking(bid: uuid.UUID, body: BookingUpdate, request: Request, ctx: TenantContext = Depends(require_feature("bookings", "bookings:write")), db: Session = Depends(get_db)):
    b = _get_booking(db, ctx, bid)
    data = body.model_dump(exclude_unset=True)
    if data.get("starts_at"):
        dur = b.ends_at - b.starts_at
        new_start = data["starts_at"] if data["starts_at"].tzinfo else data["starts_at"].replace(tzinfo=timezone.utc)
        if bk._overlapping(db, ctx.business_id, new_start, new_start + dur, b.staff_id) and any(o.id != b.id for o in bk._overlapping(db, ctx.business_id, new_start, new_start + dur, b.staff_id)):
            raise bad_request("That time overlaps another booking")
        b.starts_at, b.ends_at = new_start, new_start + dur
    if "notes" in data:
        b.notes = data["notes"] or ""
    if "staff_id" in data and ctx.can("*") or ("staff_id" in data and ctx.can("bookings:write") and not ctx.assigned_only):
        b.staff_id = data["staff_id"]
    if data.get("status"):
        bk.set_status(db, b, data["status"])
    log(ctx, "booking.updated", request, "booking", b.id, status=b.status)
    db.commit()
    return b


# ============================ reviews ======================================
@reviews_router.get("", response_model=list[ReviewOut])
def list_reviews(ctx: TenantContext = Depends(require_feature("reviews", "reviews:read")), db: Session = Depends(get_db)):
    return ReviewRepository(db, ctx.business_id).list(order_by=Review.created_at.desc(), limit=200)


@reviews_router.get("/summary")
def review_summary(ctx: TenantContext = Depends(require_feature("reviews", "reviews:read")), db: Session = Depends(get_db)):
    from app.services.reviews import rating_summary
    dist = dict(db.execute(select(Review.rating, func.count()).where(Review.business_id == ctx.business_id, Review.deleted_at.is_(None)).group_by(Review.rating)).all())
    return {**rating_summary(db, ctx.business_id), "distribution": {str(i): dist.get(i, 0) for i in range(1, 6)}, "review_link": business_urls(ctx.business)["review"]}


@reviews_router.post("/{rid}/respond", response_model=ReviewOut)
def respond(rid: uuid.UUID, body: ReviewRespond, request: Request, ctx: TenantContext = Depends(require_feature("reviews", "reviews:respond")), db: Session = Depends(get_db)):
    r = or404(ReviewRepository(db, ctx.business_id).get(rid), "Review")
    r.response, r.responded_at = body.response.strip(), datetime.now(timezone.utc)
    log(ctx, "review.responded", request, "review", r.id)
    db.commit()
    return r


@reviews_router.post("/{rid}/visibility", response_model=ReviewOut)
def visibility(rid: uuid.UUID, published: bool, ctx: TenantContext = Depends(require_feature("reviews", "reviews:respond")), db: Session = Depends(get_db)):
    r = or404(ReviewRepository(db, ctx.business_id).get(rid), "Review")
    r.is_published = published
    db.commit()
    return r


@reviews_router.post("/requests")
def request_review(body: ReviewRequestIn, request: Request, ctx: TenantContext = Depends(require_feature("reviews", "reviews:respond")), db: Session = Depends(get_db)):
    """Creates a single-use review link tied to a completed visit (=> 'verified'). Returns a WhatsApp link; the owner taps to send."""
    booking = cust = None
    if body.booking_id:
        booking = or404(BookingRepository(db, ctx.business_id).get(body.booking_id), "Booking")
        if booking.status != BookingStatus.COMPLETED:
            raise bad_request("Reviews can be requested after the booking is completed")
        if booking.customer_id:
            cust = CustomerRepository(db, ctx.business_id).get(booking.customer_id)
    elif body.customer_id:
        cust = or404(CustomerRepository(db, ctx.business_id).get(body.customer_id), "Customer")
    else:
        raise bad_request("Choose a booking or customer")
    rr = ReviewRequestRepository(db, ctx.business_id).add(token=random_token(18), customer_id=cust.id if cust else None, booking_id=booking.id if booking else None, sent_via="WHATSAPP")
    if booking:
        booking.review_requested_at = datetime.now(timezone.utc)
    name = (cust.name if cust else booking.customer_name if booking else "there")
    link = f"{business_urls(ctx.business)['review']}?t={rr.token}"
    phone = cust.phone if cust else booking.customer_phone if booking else None
    body_txt = f"Hi {name.split()[0]}, thanks for visiting {ctx.business.name}! Could you leave us a quick review? {link}"
    log(ctx, "review.requested", request, "review_request", rr.id)
    db.commit()
    return {"link": link, "whatsapp_url": wa_link(phone, body_txt), "message": body_txt}


@reviews_router.get("/pending-requests")
def pending(ctx: TenantContext = Depends(require_feature("reviews", "reviews:read")), db: Session = Depends(get_db)):
    """Completed bookings we haven't asked for a review yet."""
    rows = BookingRepository(db, ctx.business_id).list(Booking.status == BookingStatus.COMPLETED, Booking.review_requested_at.is_(None), order_by=Booking.starts_at.desc(), limit=30)
    return [{"booking_id": str(b.id), "customer_name": b.customer_name, "starts_at": b.starts_at, "services": [i.name for i in b.items]} for b in rows]
