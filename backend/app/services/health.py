"""Business health score + 'Get Found' checklist. Every number comes from a stated, measurable signal.
A component with no underlying data is reported as unavailable — it never gets an invented score."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Booking, Business, Customer, GalleryImage, Lead, Review, Service, Website
from app.models.enums import BookingStatus, LeadStatus
from app.services.crm import inactive_customers
from app.services.hours import has_any_hours
from app.services.plans import has_feature
from app.services.reviews import rating_summary

WEIGHTS = {"online_presence": 0.30, "customer_response": 0.20, "reviews": 0.20, "bookings": 0.15, "customer_retention": 0.15}


def get_found_checklist(db: Session, b: Business) -> dict:
    services = db.scalar(select(func.count()).select_from(Service).where(Service.business_id == b.id, Service.deleted_at.is_(None), Service.is_active.is_(True))) or 0
    photos = db.scalar(select(func.count()).select_from(GalleryImage).where(GalleryImage.business_id == b.id)) or 0
    reviews = rating_summary(db, b.id)["count"]
    site: Website | None = b.website
    website_ok = bool(site and site.status == "PUBLISHED")
    items = [
        {"key": "business_info", "label": "Business name, address & phone", "done": bool(b.name and b.address and b.phone), "fix": "/dashboard/business"},
        {"key": "description", "label": "Description", "done": len(b.description or "") >= 40, "fix": "/dashboard/business"},
        {"key": "whatsapp", "label": "WhatsApp number", "done": bool(b.whatsapp), "fix": "/dashboard/business"},
        {"key": "hours", "label": "Opening hours", "done": has_any_hours(b.opening_hours or {}), "fix": "/dashboard/business"},
        {"key": "services", "label": "Services (at least 3)", "done": services >= 3, "fix": "/dashboard/services"},
        {"key": "photos", "label": "Photos (at least 3)", "done": photos >= 3, "fix": "/dashboard/website"},
        {"key": "logo", "label": "Logo", "done": bool(b.logo_url), "fix": "/dashboard/website"},
        {"key": "website", "label": "Website published", "done": website_ok, "fix": "/dashboard/website",
         "locked": not has_feature(db, b, "website")},
        {"key": "reviews", "label": "At least one review", "done": reviews >= 1, "fix": "/dashboard/reviews"},
        {"key": "social", "label": "Social links", "done": any((b.social_links or {}).values()), "fix": "/dashboard/business"},
    ]
    done = sum(1 for i in items if i["done"])
    return {"items": items, "completion": round(done / len(items) * 100)}


def _pct(n: float) -> int:
    return max(0, min(100, round(n)))


def health_score(db: Session, b: Business) -> dict:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=30)
    components: dict[str, dict] = {}

    checklist = get_found_checklist(db, b)
    components["online_presence"] = {"score": checklist["completion"], "basis": f"{sum(i['done'] for i in checklist['items'])}/{len(checklist['items'])} setup items complete"}

    leads = list(db.scalars(select(Lead).where(Lead.business_id == b.id, Lead.deleted_at.is_(None), Lead.created_at >= since)))
    if leads:
        answered = sum(1 for l in leads if l.status != LeadStatus.NEW)
        components["customer_response"] = {"score": _pct(answered / len(leads) * 100), "basis": f"{answered}/{len(leads)} leads from the last 30 days followed up"}
    else:
        components["customer_response"] = {"score": None, "basis": "No leads in the last 30 days"}

    rs = rating_summary(db, b.id)
    if rs["count"]:
        volume = min(rs["count"] / 10, 1)
        components["reviews"] = {"score": _pct((rs["average"] / 5 * 70) + volume * 30),
                                 "basis": f"{rs['average']}★ average across {rs['count']} review(s); volume counts up to 10"}
    else:
        components["reviews"] = {"score": None, "basis": "No reviews yet"}

    rows = dict(db.execute(select(Booking.status, func.count()).where(Booking.business_id == b.id, Booking.deleted_at.is_(None), Booking.starts_at >= since,
                                                                       Booking.starts_at <= now).group_by(Booking.status)).all())
    done, lost = rows.get(BookingStatus.COMPLETED, 0), rows.get(BookingStatus.CANCELLED, 0) + rows.get(BookingStatus.NO_SHOW, 0)
    if done + lost:
        components["bookings"] = {"score": _pct(done / (done + lost) * 100), "basis": f"{done} completed vs {lost} cancelled/no-show (30 days)"}
    else:
        components["bookings"] = {"score": None, "basis": "No past bookings in the last 30 days"}

    visited = db.execute(select(Booking.customer_id, func.count()).where(Booking.business_id == b.id, Booking.status == BookingStatus.COMPLETED,
                                                                         Booking.customer_id.is_not(None)).group_by(Booking.customer_id)).all()
    if visited:
        repeat = sum(1 for _, c in visited if c >= 2)
        components["customer_retention"] = {"score": _pct(repeat / len(visited) * 100), "basis": f"{repeat}/{len(visited)} customers have visited more than once"}
    else:
        components["customer_retention"] = {"score": None, "basis": "No completed visits yet"}

    avail = {k: v for k, v in components.items() if v["score"] is not None}
    total_w = sum(WEIGHTS[k] for k in avail)
    overall = round(sum(v["score"] * WEIGHTS[k] for k, v in avail.items()) / total_w) if total_w else None
    return {"overall": overall, "components": components, "weights": WEIGHTS,
            "note": "Score covers only components with data. Weights: " + ", ".join(f"{k.replace('_', ' ')} {int(w * 100)}%" for k, w in WEIGHTS.items())}


def next_actions(db: Session, b: Business) -> list[dict]:
    """Prioritised recommendations from real counts."""
    actions: list[dict] = []
    new_leads = db.scalar(select(func.count()).select_from(Lead).where(Lead.business_id == b.id, Lead.deleted_at.is_(None), Lead.status == LeadStatus.NEW)) or 0
    if new_leads:
        actions.append({"key": "leads", "text": f"Respond to {new_leads} unanswered lead{'s' if new_leads != 1 else ''}", "href": "/dashboard/leads", "count": new_leads})
    inactive = len(inactive_customers(db, b.id, 45))
    if inactive and has_feature(db, b, "marketing"):
        actions.append({"key": "retention", "text": f"Follow up with {inactive} customer{'s' if inactive != 1 else ''} who haven't visited in 45+ days", "href": "/dashboard/marketing", "count": inactive})
    elif inactive:
        actions.append({"key": "retention", "text": f"{inactive} customer{'s' if inactive != 1 else ''} haven't visited in 45+ days", "href": "/dashboard/customers", "count": inactive})
    unrated = db.scalar(select(func.count()).select_from(Booking).where(Booking.business_id == b.id, Booking.status == BookingStatus.COMPLETED, Booking.review_requested_at.is_(None))) or 0
    if unrated:
        actions.append({"key": "reviews", "text": f"Ask {unrated} recent customer{'s' if unrated != 1 else ''} for a review", "href": "/dashboard/reviews", "count": unrated})
    unanswered = db.scalar(select(func.count()).select_from(Review).where(Review.business_id == b.id, Review.deleted_at.is_(None), Review.response.is_(None))) or 0
    if unanswered:
        actions.append({"key": "review_replies", "text": f"Reply to {unanswered} review{'s' if unanswered != 1 else ''}", "href": "/dashboard/reviews", "count": unanswered})
    pending = db.scalar(select(func.count()).select_from(Booking).where(Booking.business_id == b.id, Booking.deleted_at.is_(None), Booking.status == BookingStatus.PENDING,
                                                                        Booking.starts_at >= datetime.now(timezone.utc))) or 0
    if pending:
        actions.append({"key": "pending_bookings", "text": f"Confirm {pending} pending booking{'s' if pending != 1 else ''}", "href": "/dashboard/bookings", "count": pending})
    checklist = get_found_checklist(db, b)
    for it in checklist["items"]:
        if not it["done"] and not it.get("locked"):
            actions.append({"key": f"setup_{it['key']}", "text": f"Add: {it['label']}", "href": it["fix"]})
            break
    return actions
