import hashlib
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.errors import bad_request, conflict
from app.models import Booking, BookingService, Business, Customer, Lead, Service, Staff, StaffService
from app.models.enums import BookingStatus, LeadStatus
from app.services.hours import hours_for

ACTIVE = (BookingStatus.PENDING, BookingStatus.CONFIRMED)


def _staff_for(db: Session, business: Business, service_ids: list[uuid.UUID]) -> list[Staff]:
    """Active staff who can perform every requested service. If nobody is configured, the business is one 'resource'."""
    staff = list(db.scalars(select(Staff).where(Staff.business_id == business.id, Staff.deleted_at.is_(None), Staff.is_active.is_(True))))
    if not staff:
        return []
    out = []
    for st in staff:
        assigned = set(db.scalars(select(StaffService.service_id).where(StaffService.staff_id == st.id)))
        if not assigned or set(service_ids) <= assigned:  # no assignment rows => performs everything
            out.append(st)
    return out


def load_services(db: Session, business: Business, service_ids: list[uuid.UUID]) -> list[Service]:
    if not service_ids:
        raise bad_request("Choose at least one service")
    services = list(db.scalars(select(Service).where(Service.business_id == business.id, Service.id.in_(service_ids),
                                                     Service.deleted_at.is_(None), Service.is_active.is_(True))))
    if len(services) != len(set(service_ids)):
        raise bad_request("One of the selected services is not available")
    return services


def _overlapping(db: Session, business_id, start: datetime, end: datetime, staff_id=None) -> list[Booking]:
    q = select(Booking).where(Booking.business_id == business_id, Booking.deleted_at.is_(None), Booking.status.in_(ACTIVE),
                              Booking.starts_at < end, Booking.ends_at > start)
    if staff_id:
        q = q.where(Booking.staff_id == staff_id)
    return list(db.scalars(q))


def _hours_for_day(business: Business, staff: Staff | None, d: date):
    if staff and staff.working_hours:
        span = hours_for(staff.working_hours, d)
        if span:
            return span
        return None
    return hours_for(business.opening_hours or {}, d)


def compute_slots(db: Session, business: Business, services: list[Service], d: date) -> dict:
    tz = ZoneInfo(business.timezone)
    now = datetime.now(tz)
    duration = sum(s.duration_minutes for s in services)
    if d.isoformat() in (business.blocked_dates or []):
        return {"slots": [], "reason": "We're closed on that date."}
    if d < now.date():
        return {"slots": [], "reason": "That date has passed."}
    if d > now.date() + timedelta(days=120):
        return {"slots": [], "reason": "Bookings open up to 4 months ahead."}
    staff_list = _staff_for(db, business, [s.id for s in services])
    resources: list[Staff | None] = staff_list or [None]
    earliest = now + timedelta(hours=business.booking_lead_hours)
    interval = max(15, business.slot_interval_minutes or 30)
    seen: dict[datetime, str] = {}
    for res in resources:
        span = _hours_for_day(business, res, d)
        if not span:
            continue
        cursor = datetime.combine(d, span[0], tz)
        close = datetime.combine(d, span[1], tz)
        while cursor + timedelta(minutes=duration) <= close:
            end = cursor + timedelta(minutes=duration)
            if cursor >= earliest and cursor not in seen:
                busy = _overlapping(db, business.id, cursor.astimezone(timezone.utc), end.astimezone(timezone.utc), res.id if res else None)
                if not busy:
                    seen[cursor] = cursor.strftime("%H:%M")
            cursor += timedelta(minutes=interval)
    slots = [{"starts_at": k.astimezone(timezone.utc).isoformat(), "label": v} for k, v in sorted(seen.items())]
    return {"slots": slots, "reason": None if slots else "No times available that day."}


def normalise_customer(db: Session, business_id, name: str, phone: str | None, source: str, email: str | None = None, *, acq_source: str | None = None,
                       acq_campaign: str | None = None) -> Customer:
    cust = None
    if phone:
        cust = db.scalars(select(Customer).where(Customer.business_id == business_id, Customer.phone == phone,
                                                 Customer.deleted_at.is_(None))).first()
    if cust is None:
        cust = Customer(business_id=business_id, name=name, phone=phone, email=email, source=source, acquisition_source=acq_source, acquisition_campaign=acq_campaign)
        db.add(cust)
        db.flush()
    return cust


def create_booking(db: Session, business: Business, services: list[Service], starts_at: datetime, *, name: str,
                   phone: str | None, source: str = "WEBSITE", notes: str = "", staff_id=None, customer_id=None,
                   status: str = BookingStatus.PENDING, enforce_availability: bool = True) -> Booking:
    duration = sum(s.duration_minutes for s in services)
    if starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=timezone.utc)
    ends_at = starts_at + timedelta(minutes=duration)
    # serialise bookings per business so two people can't grab the same slot
    db.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": int.from_bytes(hashlib.sha1(business.id.bytes).digest()[:8], "big", signed=True)})
    chosen_staff = None
    if enforce_availability:
        tz = ZoneInfo(business.timezone)
        local = starts_at.astimezone(tz)
        if starts_at < datetime.now(timezone.utc) + timedelta(hours=business.booking_lead_hours):
            raise conflict("That time is too soon. Please pick a later slot.")
        if local.date().isoformat() in (business.blocked_dates or []):
            raise conflict("We're closed on that date.")
        staff_list = [s for s in _staff_for(db, business, [s.id for s in services])]
        if staff_id:
            staff_list = [s for s in staff_list if s.id == staff_id]
            if not staff_list:
                raise bad_request("That staff member can't perform these services")
        if staff_list:
            for st in staff_list:
                span = _hours_for_day(business, st, local.date())
                if span and datetime.combine(local.date(), span[0], tz) <= local and local + timedelta(minutes=duration) <= datetime.combine(local.date(), span[1], tz) \
                        and not _overlapping(db, business.id, starts_at, ends_at, st.id):
                    chosen_staff = st
                    break
            if chosen_staff is None:
                raise conflict("Sorry, that time was just taken. Please choose another.")
        else:
            span = hours_for(business.opening_hours or {}, local.date())
            if not span or not (datetime.combine(local.date(), span[0], tz) <= local and local + timedelta(minutes=duration) <= datetime.combine(local.date(), span[1], tz)):
                raise conflict("That time is outside our opening hours.")
            if _overlapping(db, business.id, starts_at, ends_at):
                raise conflict("Sorry, that time was just taken. Please choose another.")
    total = sum((s.price for s in services), Decimal("0"))
    booking = Booking(business_id=business.id, customer_id=customer_id, staff_id=(chosen_staff.id if chosen_staff else staff_id),
                      customer_name=name, customer_phone=phone, starts_at=starts_at, ends_at=ends_at, status=status,
                      source=source, total_amount=total, currency=business.currency, notes=notes)
    db.add(booking)
    db.flush()
    for s in services:
        db.add(BookingService(business_id=business.id, booking_id=booking.id, service_id=s.id, name=s.name, price=s.price,
                              duration_minutes=s.duration_minutes))
    db.flush()
    db.refresh(booking)
    return booking


VALID_TRANSITIONS = {
    BookingStatus.PENDING: {BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.COMPLETED, BookingStatus.NO_SHOW},
    BookingStatus.CONFIRMED: {BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.NO_SHOW, BookingStatus.PENDING},
    BookingStatus.COMPLETED: set(),
    BookingStatus.CANCELLED: {BookingStatus.PENDING},
    BookingStatus.NO_SHOW: {BookingStatus.PENDING},
}


def set_status(db: Session, booking: Booking, new: str) -> Booking:
    if new == booking.status:
        return booking
    if new not in VALID_TRANSITIONS.get(booking.status, set()):
        raise bad_request(f"Can't change a {booking.status.lower()} booking to {new.lower()}")
    booking.status = new
    if new == BookingStatus.COMPLETED:
        # ensure a customer record exists and close the loop on the originating lead
        if booking.customer_id is None:
            cust = normalise_customer(db, booking.business_id, booking.customer_name, booking.customer_phone, booking.source)
            booking.customer_id = cust.id
        if booking.lead_id:
            lead = db.get(Lead, booking.lead_id)
            if lead and lead.business_id == booking.business_id:
                lead.status = LeadStatus.CONVERTED
    db.flush()
    return booking
