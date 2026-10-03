"""'What should I do today?' — a ranked list built only from the business's own data. Every item states the numbers behind it and, where it makes
sense, a *proposed* action. Proposals are inert: the owner confirms each one separately (see /ai/actions), and nothing is ever sent to customers
by Bizora itself."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Booking, Business, Lead, MarketingCampaign, Order, Product, Review, Service
from app.models.enums import BookingStatus, LeadStatus
from app.services import growth_analytics as ga
from app.services.crm import inactive_customers
from app.services.health import next_actions
from app.services.inventory import product_total_stock

MIN_VIEWERS = 5  # don't draw conclusions from a handful of visits


def _money(b: Business, v) -> str:
    return f"{b.currency} {float(v):,.0f}"


def _item(key, priority, title, detail, *, stats=None, opportunity=None, action=None):
    return {"key": key, "priority": priority, "title": title, "detail": detail, "stats": stats or [], "opportunity": opportunity, "action": action}


def _navigate(label, href):
    return {"type": "navigate", "label": label, "payload": {"href": href}, "requires_confirmation": False}


def leads_waiting(db: Session, b: Business) -> dict | None:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=2)
    leads = list(db.scalars(select(Lead).where(Lead.business_id == b.id, Lead.deleted_at.is_(None), Lead.status == LeadStatus.NEW, Lead.created_at < cutoff).order_by(Lead.created_at).limit(50)))
    if not leads:
        return None
    reachable = [l for l in leads if l.phone]
    prices = {s.id: s.price for s in db.scalars(select(Service).where(Service.business_id == b.id, Service.id.in_([l.service_id for l in leads if l.service_id])))} if any(l.service_id for l in leads) else {}
    listed = sum((prices.get(l.service_id, Decimal("0")) for l in leads), Decimal("0"))
    oldest = max(1, int((datetime.now(timezone.utc) - leads[0].created_at).total_seconds() // 3600))
    return _item("leads_waiting", 1, f"{len(leads)} lead{'s' if len(leads) != 1 else ''} waiting for a reply",
                 f"The longest has been waiting about {oldest} hour{'s' if oldest != 1 else ''}. Replying quickly is the biggest lever on whether an enquiry becomes a customer.",
                 stats=[{"label": "Waiting", "value": len(leads)}, {"label": "With a phone number", "value": len(reachable)}],
                 opportunity={"label": "Listed price of the services they asked about", "value": _money(b, listed)} if listed else None,
                 action={"type": "follow_up_leads", "label": f"Prepare {len(reachable)} WhatsApp follow-up{'s' if len(reachable) != 1 else ''}", "requires_confirmation": True,
                         "payload": {"lead_ids": [str(l.id) for l in reachable]}} if reachable else _navigate("Open leads", "/dashboard/leads"))


def pending_orders(db: Session, b: Business) -> dict | None:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=2)
    new = db.scalar(select(func.count()).select_from(Order).where(Order.business_id == b.id, Order.status == "PENDING", Order.created_at < cutoff)) or 0
    check = db.scalar(select(func.count()).select_from(Order).where(Order.business_id == b.id, Order.payment_status == "PENDING", Order.status.notin_(("CANCELLED", "REFUNDED")))) or 0
    if not (new or check):
        return None
    parts = []
    if new:
        parts.append(f"{new} new order{'s' if new != 1 else ''} not yet confirmed")
    if check:
        parts.append(f"{check} payment code{'s' if check != 1 else ''} waiting for you to check")
    return _item("orders_waiting", 1, " · ".join(parts).capitalize(), "Customers who ordered are waiting to hear from you.", stats=[{"label": "To confirm", "value": new}, {"label": "Payments to check", "value": check}],
                 action=_navigate("Open orders", "/dashboard/orders"))


def winback(db: Session, b: Business) -> dict | None:
    rows = inactive_customers(db, b.id, 45)
    if not rows:
        return None
    return _item("winback", 2, f"{len(rows)} customer{'s' if len(rows) != 1 else ''} haven't been back in 45+ days",
                 "People who already trust you are the cheapest customers to win back. I can prepare a WhatsApp message for each — you review and send.",
                 stats=[{"label": "Inactive 45+ days", "value": len(rows)}, {"label": "Inactive 90+ days", "value": len(inactive_customers(db, b.id, 90))}],
                 action={"type": "create_campaign", "label": "Prepare win-back messages", "requires_confirmation": True,
                         "payload": {"name": "Come back — 45+ days", "kind": "REACTIVATION", "audience": {"type": "inactive", "days": 45},
                                     "message_template": "Hi {name}, it's {business}. We haven't seen you in a while and we miss you! Book your next visit and enjoy a treat on us. Reply here to pick a time."}})


def reviews_due(db: Session, b: Business) -> dict | None:
    since = datetime.now(timezone.utc) - timedelta(days=30)
    bks = list(db.scalars(select(Booking).where(Booking.business_id == b.id, Booking.status == BookingStatus.COMPLETED, Booking.review_requested_at.is_(None), Booking.deleted_at.is_(None),
                                                Booking.starts_at >= since, Booking.customer_phone.is_not(None)).limit(40)))
    ords = list(db.scalars(select(Order).where(Order.business_id == b.id, Order.status == "COMPLETED", Order.created_at >= since, Order.customer_phone.is_not(None)).limit(40)))
    reviewed = set(db.scalars(select(Review.customer_id).where(Review.business_id == b.id, Review.customer_id.is_not(None))))
    from app.models import ReviewRequest
    asked = set(db.scalars(select(ReviewRequest.customer_id).where(ReviewRequest.business_id == b.id, ReviewRequest.customer_id.is_not(None), ReviewRequest.created_at >= since)))
    skip = reviewed | asked
    bks = [x for x in bks if x.customer_id not in skip]
    ords = [o for o in ords if o.customer_id not in skip]
    ids = {x.customer_id for x in bks} | {o.customer_id for o in ords}
    if not ids:
        return None
    return _item("reviews_due", 2, f"Ask {len(ids)} recent customer{'s' if len(ids) != 1 else ''} for a review",
                 "They were happy enough to complete a visit or order and haven't been asked yet. Reviews from real customers are what new customers trust most.",
                 stats=[{"label": "Customers to ask", "value": len(ids)}],
                 action={"type": "request_reviews", "label": "Prepare review requests", "requires_confirmation": True,
                         "payload": {"booking_ids": [str(x.id) for x in bks], "order_ids": [str(o.id) for o in ords]}})


def source_insight(db: Session, b: Business) -> dict | None:
    rows = ga.sources(db, b, "30d")
    rows = [r for r in rows if r["source"] not in ("offline",)]
    waste = [r for r in rows if r["visitors"] >= 15 and r["orders"] + r["bookings"] == 0 and r["leads"] == 0]
    best = [r for r in rows if r["visitors"] >= 10 and r["orders"] + r["bookings"] > 0]
    if not waste and not best:
        return None
    best.sort(key=lambda r: (-(r["conversion"] or 0), -r["revenue"]))
    parts, stats = [], []
    if best:
        t = best[0]
        parts.append(f"{t['source'].title()} is your best channel: {t['orders'] + t['bookings']} order/booking{'s' if t['orders'] + t['bookings'] != 1 else ''} from {t['visitors']} visitors ({t['conversion']}%).")
        stats.append({"label": f"{t['source'].title()} conversion", "value": f"{t['conversion']}%"})
    if waste:
        w = max(waste, key=lambda r: r["visitors"])
        parts.append(f"{w['source'].title()} sent {w['visitors']} visitors but no leads, bookings or orders — check what that link points to.")
        stats.append({"label": f"{w['source'].title()} visitors", "value": w["visitors"]})
    return _item("sources", 3, "Where your customers are coming from", " ".join(parts), stats=stats, action=_navigate("See all sources", "/dashboard/analytics?tab=sources"))


def interest_gap(db: Session, b: Business) -> dict | None:
    pr = ga.products(db, b, "30d", limit=30)
    cand = [p for p in pr["products"] if p["viewers"] >= MIN_VIEWERS and p["units"] == 0]
    if not cand:
        return None
    p = max(cand, key=lambda x: x["viewers"])
    row = db.scalars(select(Product).where(Product.id == p["id"], Product.business_id == b.id)).first()
    if row is None:
        return None
    return _item("interest_gap", 2, f"{p['name']} gets attention but no sales",
                 f"{p['viewers']} people looked at it in the last 30 days and {p['added_to_bag']} added it to the bag, but nobody bought it. Check the photos, price and description — or give it a push this week.",
                 stats=[{"label": "People who viewed", "value": p["viewers"]}, {"label": "Added to bag", "value": p["added_to_bag"]}, {"label": "Sold", "value": 0}],
                 action={"type": "create_growth_campaign", "label": f"Draft a campaign for {p['name']}", "requires_confirmation": True,
                         "payload": {"name": f"{p['name']} spotlight", "objective": "SALES", "offer_text": f"Spotlight: {p['name']}", "target_type": "product", "target_ref": str(row.id), "channels": ["instagram", "whatsapp"]}})


def low_stock(db: Session, b: Business) -> dict | None:
    pr = {p["id"]: p for p in ga.products(db, b, "30d", limit=50)["products"]}
    hot = []
    for p in db.scalars(select(Product).where(Product.business_id == b.id, Product.deleted_at.is_(None), Product.track_stock.is_(True), Product.status == "ACTIVE")):
        total = product_total_stock(db, p)
        if total is not None and total <= p.low_stock_threshold and (pr.get(str(p.id), {}).get("viewers", 0) >= 3 or pr.get(str(p.id), {}).get("units", 0) > 0):
            hot.append((p.name, total))
    if not hot:
        return None
    names = ", ".join(f"{n} ({t} left)" for n, t in hot[:4])
    return _item("low_stock", 2, f"Restock {len(hot)} popular item{'s' if len(hot) != 1 else ''}", f"These are selling or being looked at and are nearly out: {names}.",
                 stats=[{"label": "Low and in demand", "value": len(hot)}], action=_navigate("Open inventory", "/dashboard/products?tab=inventory"))


def campaign_results(db: Session, b: Business) -> dict | None:
    since = datetime.now(timezone.utc) - timedelta(days=14)
    camps = list(db.scalars(select(MarketingCampaign).where(MarketingCampaign.business_id == b.id, MarketingCampaign.kind == "GROWTH", MarketingCampaign.slug.is_not(None), MarketingCampaign.created_at >= since)))
    if not camps:
        return None
    perf = {r["campaign"]: r for r in ga.campaigns(db, b, "30d")}
    best = max(((c, perf.get(c.slug)) for c in camps if perf.get(c.slug)), key=lambda x: (x[1]["orders"] + x[1]["bookings"], x[1]["leads"], x[1]["visitors"]), default=None)
    if best is None or not (best[1]["visitors"] or best[1]["leads"]):
        return None
    c, r = best
    return _item("campaign_results", 3, f"“{c.name}” is working" if (r["orders"] + r["bookings"]) else f"“{c.name}” is bringing visitors",
                 f"{r['visitors']} visitors, {r['leads']} enquiries, {r['orders']} order{'s' if r['orders'] != 1 else ''} and {r['bookings']} booking{'s' if r['bookings'] != 1 else ''} so far, worth {_money(b, r['revenue'])} tracked revenue.",
                 stats=[{"label": "Visitors", "value": r["visitors"]}, {"label": "Orders + bookings", "value": r["orders"] + r["bookings"]}], action=_navigate("See campaign results", "/dashboard/marketing"))


def setup_gap(db: Session, b: Business) -> dict | None:
    for a in next_actions(db, b):
        if a["key"].startswith("setup_"):
            return _item(a["key"], 3, a["text"], "Completing your profile makes it easier for customers to find and trust you.", action=_navigate("Fix it", a["href"]))
    return None


def todays_plan(db: Session, b: Business) -> list[dict]:
    items = [f(db, b) for f in (leads_waiting, pending_orders, winback, reviews_due, interest_gap, low_stock, source_insight, campaign_results, setup_gap)]
    items = [i for i in items if i]
    items.sort(key=lambda i: i["priority"])
    return items[:7]
