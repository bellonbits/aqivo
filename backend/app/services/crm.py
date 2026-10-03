from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Booking, BookingService, Customer, Lead, Payment
from app.models.enums import BookingStatus, LeadStatus, PaymentStatus


def customer_stats(db: Session, business_id, customer_ids: list) -> dict:
    """Aggregates per customer, computed from real bookings/payments (nothing denormalised to drift)."""
    if not customer_ids:
        return {}
    now = datetime.now(timezone.utc)
    stats = {cid: {"total_bookings": 0, "completed_bookings": 0, "total_spent": Decimal("0"), "last_visit": None, "next_booking": None,
                   "favourite_service": None, "total_orders": 0} for cid in customer_ids}
    rows = db.execute(select(Booking.customer_id, func.count(), func.count().filter(Booking.status == BookingStatus.COMPLETED),
                             func.coalesce(func.sum(Booking.total_amount).filter(Booking.status == BookingStatus.COMPLETED), 0),
                             func.max(Booking.starts_at).filter(Booking.status == BookingStatus.COMPLETED),
                             func.min(Booking.starts_at).filter(Booking.status.in_((BookingStatus.PENDING, BookingStatus.CONFIRMED)), Booking.starts_at >= now))
                      .where(Booking.business_id == business_id, Booking.deleted_at.is_(None), Booking.customer_id.in_(customer_ids))
                      .group_by(Booking.customer_id)).all()
    for cid, total, completed, spent, last, nxt in rows:
        st = stats[cid]
        st.update(total_bookings=total, completed_bookings=completed, total_spent=Decimal(spent), last_visit=last, next_booking=nxt)
    from app.models import Order
    for cid, n in db.execute(select(Order.customer_id, func.count()).where(Order.business_id == business_id, Order.customer_id.in_(customer_ids), Order.status.notin_(("CANCELLED", "REFUNDED")))
                             .group_by(Order.customer_id)):
        stats[cid]["total_orders"] = n
    walkin = db.execute(select(Payment.customer_id, func.coalesce(func.sum(Payment.amount), 0))
                        .where(Payment.business_id == business_id, Payment.status == PaymentStatus.PAID, Payment.booking_id.is_(None),
                               Payment.customer_id.in_(customer_ids)).group_by(Payment.customer_id)).all()
    for cid, amt in walkin:
        stats[cid]["total_spent"] += Decimal(amt)
    fav = db.execute(select(Booking.customer_id, BookingService.name, func.count().label("n"))
                     .join(BookingService, BookingService.booking_id == Booking.id)
                     .where(Booking.business_id == business_id, Booking.customer_id.in_(customer_ids), Booking.status == BookingStatus.COMPLETED)
                     .group_by(Booking.customer_id, BookingService.name).order_by(func.count().desc())).all()
    for cid, name, _n in fav:
        if stats[cid]["favourite_service"] is None:
            stats[cid]["favourite_service"] = name
    return stats


def convert_lead_to_customer(db: Session, lead: Lead) -> Customer:
    from app.services.bookings import normalise_customer
    cust = normalise_customer(db, lead.business_id, lead.name, lead.phone, lead.source, lead.email)
    if cust.lead_id is None:
        cust.lead_id = lead.id
    if lead.status not in (LeadStatus.CONVERTED,):
        lead.status = LeadStatus.CONVERTED
    if lead.first_response_at is None:
        lead.first_response_at = datetime.now(timezone.utc)
    db.flush()
    return cust


def inactive_customers(db: Session, business_id, days: int, limit: int | None = None) -> list[tuple[Customer, datetime]]:
    """Customers who have visited before, but not within `days`, who can be contacted on WhatsApp."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    last = (select(Booking.customer_id, func.max(Booking.starts_at).label("last_visit"))
            .where(Booking.business_id == business_id, Booking.status == BookingStatus.COMPLETED, Booking.deleted_at.is_(None),
                   Booking.customer_id.is_not(None)).group_by(Booking.customer_id).subquery())
    upcoming = select(Booking.customer_id).where(Booking.business_id == business_id, Booking.status.in_((BookingStatus.PENDING, BookingStatus.CONFIRMED)),
                                                 Booking.starts_at >= datetime.now(timezone.utc), Booking.customer_id.is_not(None))
    q = (select(Customer, last.c.last_visit).join(last, last.c.customer_id == Customer.id)
         .where(Customer.business_id == business_id, Customer.deleted_at.is_(None), Customer.whatsapp_opt_out.is_(False),
                Customer.phone.is_not(None), last.c.last_visit < cutoff, Customer.id.not_in(upcoming))
         .order_by(last.c.last_visit))
    if limit:
        q = q.limit(limit)
    return [(c, lv) for c, lv in db.execute(q).all()]


def timeline(db: Session, business_id, customer: Customer) -> list[dict]:
    """Everything we know about this customer in one list, newest first. Built from real records — anonymous browsing before they
    identified themselves can't be linked to a person, so it isn't shown here."""
    from app.models import CustomerNote, MarketingMessage, Order, Review
    ev: list[dict] = []

    def add(at, kind, title, detail="", ref=None):
        if at is not None:
            ev.append({"at": at, "kind": kind, "title": title, "detail": detail, "ref": ref})

    src = customer.acquisition_source or customer.source
    came = f"via {src.lower()}" if src and src.lower() not in ("website", "other", "direct") else "from your website"
    add(customer.created_at, "joined", f"Became a customer {came}", f"Campaign: {customer.acquisition_campaign}" if customer.acquisition_campaign else "")
    lead_q = select(Lead).where(Lead.business_id == business_id, Lead.deleted_at.is_(None))
    lead_q = lead_q.where(Lead.phone == customer.phone) if customer.phone else lead_q.where(Lead.id == customer.lead_id)
    for l in db.scalars(lead_q.limit(30)):
        add(l.created_at, "lead", "Sent an enquiry" + (f" about {l.service_name}" if l.service_name else ""), (l.message or "")[:140], str(l.id))
    for b in db.scalars(select(Booking).where(Booking.business_id == business_id, Booking.customer_id == customer.id, Booking.deleted_at.is_(None)).limit(60)):
        names = ", ".join(i.name for i in b.items)
        add(b.created_at, "booking", f"Requested a booking: {names}", f"For {b.starts_at:%d %b %Y, %H:%M} · {b.status.lower()}", str(b.id))
        if b.status == BookingStatus.COMPLETED:
            add(b.ends_at, "visit", f"Visited for {names}", "", str(b.id))
    for o in db.scalars(select(Order).where(Order.business_id == business_id, Order.customer_id == customer.id).limit(60)):
        add(o.created_at, "order", f"Placed order #{o.number}", f"{o.currency} {o.total:,.0f} · {o.status.lower()}", str(o.id))
        for e in o.events:
            if e.kind == "PAYMENT":
                add(e.created_at, "payment", f"Order #{o.number}: payment", e.message[:140], str(o.id))
    for p in db.scalars(select(Payment).where(Payment.business_id == business_id, Payment.customer_id == customer.id, Payment.status == PaymentStatus.PAID,
                                              Payment.order_id.is_(None)).limit(40)):
        add(p.paid_at or p.created_at, "payment", f"Paid {p.currency} {p.amount:,.0f}", p.method.lower())
    for r in db.scalars(select(Review).where(Review.business_id == business_id, Review.customer_id == customer.id, Review.deleted_at.is_(None)).limit(20)):
        add(r.created_at, "review", f"Left a {r.rating}-star review", (r.comment or "")[:140])
    for m in db.scalars(select(MarketingMessage).where(MarketingMessage.business_id == business_id, MarketingMessage.customer_id == customer.id, MarketingMessage.status == "SENT").limit(30)):
        add(m.sent_at, "message", "You sent them a WhatsApp message", m.body[:140])
    for n in db.scalars(select(CustomerNote).where(CustomerNote.business_id == business_id, CustomerNote.customer_id == customer.id).limit(40)):
        add(n.created_at, "note", f"{n.kind.title()} note", n.body[:140])
    ev.sort(key=lambda e: e["at"], reverse=True)
    return ev[:120]
