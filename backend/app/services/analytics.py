"""Real metrics only. Every function returns raw counts; callers show 'Not enough data yet' when empty."""
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import cast, Date, func, select, text
from sqlalchemy.orm import Session

from app.models import AnalyticsEvent, Booking, Customer, Lead, Payment, Review, Service
from app.models.enums import BookingStatus, EventType, LeadStatus, PaymentStatus

PERIODS = {"today": 1, "7d": 7, "30d": 30, "90d": 90}


def period_start(period: str, tz_name: str = "UTC") -> datetime:
    days = PERIODS.get(period, 30)
    from zoneinfo import ZoneInfo
    now = datetime.now(ZoneInfo(tz_name))
    if period == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
    return (now - timedelta(days=days)).astimezone(timezone.utc)


def record_event(db: Session, business_id, event_type: str, *, visitor_hash: str | None = None, source: str | None = None, service_id=None, product_id=None,
                 session_id: str | None = None, campaign: str | None = None, path: str | None = None) -> None:
    db.add(AnalyticsEvent(business_id=business_id, event_type=event_type, visitor_hash=visitor_hash, source=source, service_id=service_id, product_id=product_id,
                          session_id=(session_id or None) and session_id[:40], campaign=campaign, path=(path or None) and path[:200]))


def summary(db: Session, business, period: str) -> dict:
    since = period_start(period, business.timezone)
    bid = business.id
    ev = {t: (c, u) for t, c, u in db.execute(
        select(AnalyticsEvent.event_type, func.count(), func.count(func.distinct(AnalyticsEvent.visitor_hash)))
        .where(AnalyticsEvent.business_id == bid, AnalyticsEvent.created_at >= since)
        .group_by(AnalyticsEvent.event_type)).all()}
    def n(t): return ev.get(t, (0, 0))[0]
    visitors = (ev.get(EventType.WEBSITE_VISIT, (0, 0))[1] + ev.get(EventType.PROFILE_VIEW, (0, 0))[1])
    leads = db.scalar(select(func.count()).select_from(Lead).where(Lead.business_id == bid, Lead.deleted_at.is_(None), Lead.created_at >= since)) or 0
    converted = db.scalar(select(func.count()).select_from(Lead).where(Lead.business_id == bid, Lead.deleted_at.is_(None), Lead.created_at >= since,
                                                                       Lead.status.in_((LeadStatus.BOOKED, LeadStatus.CONVERTED)))) or 0
    b_rows = dict(db.execute(select(Booking.status, func.count()).where(Booking.business_id == bid, Booking.deleted_at.is_(None), Booking.created_at >= since)
                             .group_by(Booking.status)).all())
    completed = db.scalar(select(func.count()).select_from(Booking).where(Booking.business_id == bid, Booking.deleted_at.is_(None),
                                                                          Booking.status == BookingStatus.COMPLETED, Booking.starts_at >= since)) or 0
    revenue = db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.business_id == bid, Payment.status == PaymentStatus.PAID,
                                                                                  Payment.paid_at >= since)) or Decimal("0")
    reviews = db.execute(select(func.count(), func.avg(Review.rating)).where(Review.business_id == bid, Review.deleted_at.is_(None), Review.created_at >= since)).one()
    returning = db.scalar(
        select(func.count(func.distinct(Booking.customer_id))).where(
            Booking.business_id == bid, Booking.status == BookingStatus.COMPLETED, Booking.starts_at >= since, Booking.customer_id.is_not(None),
            Booking.customer_id.in_(select(Booking.customer_id).where(Booking.business_id == bid, Booking.status == BookingStatus.COMPLETED,
                                                                        Booking.starts_at < since, Booking.customer_id.is_not(None))))) or 0
    new_customers = db.scalar(select(func.count()).select_from(Customer).where(Customer.business_id == bid, Customer.deleted_at.is_(None), Customer.created_at >= since)) or 0
    booking_requests = sum(b_rows.values())
    has_data = any([visitors, leads, booking_requests, n(EventType.WHATSAPP_CLICK), revenue, reviews[0]])
    return {
        "period": period, "since": since.isoformat(), "has_data": bool(has_data),
        "website_visitors": ev.get(EventType.WEBSITE_VISIT, (0, 0))[1], "profile_views": ev.get(EventType.PROFILE_VIEW, (0, 0))[0],
        "visitors": visitors, "whatsapp_clicks": n(EventType.WHATSAPP_CLICK), "phone_clicks": n(EventType.PHONE_CLICK),
        "directions_clicks": n(EventType.DIRECTIONS_CLICK), "qr_scans": n(EventType.QR_SCAN),
        "leads": leads, "booking_requests": booking_requests, "completed_bookings": completed,
        "lead_conversion_rate": round(converted / leads * 100, 1) if leads else None,
        "reviews": reviews[0] or 0, "average_rating": round(float(reviews[1]), 1) if reviews[0] else None,
        "revenue": str(revenue), "currency": business.currency, "returning_customers": returning, "new_customers": new_customers,
    }


def timeseries(db: Session, business, period: str, metric: str) -> list[dict]:
    """Daily series for charts. metric: visitors | whatsapp | leads | bookings | revenue"""
    since = period_start(period, business.timezone)
    bid = business.id
    if metric in ("visitors", "whatsapp"):
        types = (EventType.WEBSITE_VISIT, EventType.PROFILE_VIEW) if metric == "visitors" else (EventType.WHATSAPP_CLICK,)
        q = select(cast(AnalyticsEvent.created_at, Date).label('day'), func.count()).where(AnalyticsEvent.business_id == bid, AnalyticsEvent.event_type.in_(types),
                                                                             AnalyticsEvent.created_at >= since).group_by(text('day')).order_by(text('day'))
    elif metric == "leads":
        q = select(cast(Lead.created_at, Date).label('day'), func.count()).where(Lead.business_id == bid, Lead.deleted_at.is_(None), Lead.created_at >= since).group_by(text('day')).order_by(text('day'))
    elif metric == "bookings":
        q = select(cast(Booking.created_at, Date).label('day'), func.count()).where(Booking.business_id == bid, Booking.deleted_at.is_(None), Booking.created_at >= since).group_by(text('day')).order_by(text('day'))
    else:
        q = select(cast(Payment.paid_at, Date).label('day'), func.sum(Payment.amount)).where(Payment.business_id == bid, Payment.status == PaymentStatus.PAID, Payment.paid_at >= since).group_by(text('day')).order_by(text('day'))
    return [{"date": d.isoformat(), "value": float(v)} for d, v in db.execute(q).all()]


def leads_by_source(db: Session, business_id, since: datetime) -> list[dict]:
    rows = db.execute(select(Lead.source, func.count()).where(Lead.business_id == business_id, Lead.deleted_at.is_(None), Lead.created_at >= since)
                      .group_by(Lead.source).order_by(func.count().desc())).all()
    return [{"source": s, "count": c} for s, c in rows]


def top_services(db: Session, business_id, since: datetime, limit: int = 5) -> list[dict]:
    """Service interest = bookings + leads + WhatsApp clicks that named the service."""
    from app.models import BookingService
    scores: dict[str, dict] = {}
    for name, c in db.execute(select(BookingService.name, func.count()).join(Booking, Booking.id == BookingService.booking_id)
                              .where(Booking.business_id == business_id, Booking.deleted_at.is_(None), Booking.created_at >= since).group_by(BookingService.name)).all():
        scores.setdefault(name, {"service": name, "bookings": 0, "leads": 0, "whatsapp_clicks": 0})["bookings"] = c
    for name, c in db.execute(select(Lead.service_name, func.count()).where(Lead.business_id == business_id, Lead.deleted_at.is_(None), Lead.created_at >= since,
                                                                          Lead.service_name.is_not(None)).group_by(Lead.service_name)).all():
        scores.setdefault(name, {"service": name, "bookings": 0, "leads": 0, "whatsapp_clicks": 0})["leads"] = c
    for name, c in db.execute(select(Service.name, func.count()).join(AnalyticsEvent, AnalyticsEvent.service_id == Service.id)
                              .where(AnalyticsEvent.business_id == business_id, AnalyticsEvent.event_type == EventType.WHATSAPP_CLICK,
                                     AnalyticsEvent.created_at >= since).group_by(Service.name)).all():
        scores.setdefault(name, {"service": name, "bookings": 0, "leads": 0, "whatsapp_clicks": 0})["whatsapp_clicks"] = c
    out = sorted(scores.values(), key=lambda x: -(x["bookings"] * 3 + x["leads"] * 2 + x["whatsapp_clicks"]))
    return out[:limit]
