"""Attribution analytics: which channels and campaigns bring visitors, leads, orders and money. Real counts only; an empty result means no data yet.

Revenue here is *tracked* revenue: paid online orders plus completed bookings, attributed to the source/campaign stored on the record.
Visitors are distinct sessions (falling back to the daily anonymous visitor hash for older events)."""
from __future__ import annotations

from decimal import Decimal

from sqlalchemy import func, literal_column, select
from sqlalchemy.orm import Session

from app.models import AnalyticsEvent, Booking, Customer, Lead, Order, OrderItem, Product, Service, ServiceCategory
from app.models.enums import EventType
from app.services import analytics as an
from app.services import attribution as attr

VISIT = (EventType.WEBSITE_VISIT, EventType.PROFILE_VIEW, EventType.PRODUCT_VIEW, EventType.SERVICE_VIEW, EventType.SEARCH)
ITEM_VIEW = (EventType.PRODUCT_VIEW, EventType.SERVICE_VIEW)
CONTACT = (EventType.WHATSAPP_CLICK, EventType.PHONE_CLICK)
OPEN_ORDER = ("CANCELLED", "REFUNDED")
SESSION = func.coalesce(AnalyticsEvent.session_id, AnalyticsEvent.visitor_hash)
ZERO = Decimal("0")
DIRECT = literal_column("'direct'")  # literal, not a bind parameter, so GROUP BY expressions match the SELECT


def _ev_filters(business, since, source, campaign):
    w = [AnalyticsEvent.business_id == business.id, AnalyticsEvent.created_at >= since]
    if source:
        w.append(func.lower(func.coalesce(AnalyticsEvent.source, DIRECT)) == source)
    if campaign:
        w.append(AnalyticsEvent.campaign == campaign)
    return w


def _order_source(o_source, o_channel) -> str:
    return attr.key(o_source) if o_source else ("offline" if o_channel == "WHATSAPP" else "direct")


def _collect(db: Session, business, since, group: str) -> dict[str, dict]:
    """Merge every table's counts under one key (source or campaign)."""
    rows: dict[str, dict] = {}

    def row(k):
        return rows.setdefault(k, {"key": k, "visitors": 0, "whatsapp_clicks": 0, "leads": 0, "bookings": 0, "orders": 0, "customers": 0, "revenue": ZERO})

    ev_col = AnalyticsEvent.source if group == "source" else AnalyticsEvent.campaign
    ev_key = func.lower(func.coalesce(ev_col, DIRECT)) if group == "source" else func.coalesce(ev_col, literal_column("''"))
    for k, n in db.execute(select(ev_key, func.count(func.distinct(SESSION))).where(AnalyticsEvent.business_id == business.id, AnalyticsEvent.created_at >= since,
                                                                                    AnalyticsEvent.event_type.in_(VISIT)).group_by(ev_key)):
        if group == "campaign" and not k:
            continue
        row(attr.key(k) if group == "source" else k)["visitors"] += n
    for k, n in db.execute(select(ev_key, func.count()).where(AnalyticsEvent.business_id == business.id, AnalyticsEvent.created_at >= since,
                                                              AnalyticsEvent.event_type.in_(CONTACT)).group_by(ev_key)):
        if group == "campaign" and not k:
            continue
        row(attr.key(k) if group == "source" else k)["whatsapp_clicks"] += n

    if group == "source":
        for k, n in db.execute(select(func.lower(Lead.source), func.count()).where(Lead.business_id == business.id, Lead.deleted_at.is_(None), Lead.created_at >= since).group_by(func.lower(Lead.source))):
            row(attr.key(k))["leads"] += n
        for k, n in db.execute(select(func.lower(Booking.source), func.count()).where(Booking.business_id == business.id, Booking.deleted_at.is_(None), Booking.created_at >= since).group_by(func.lower(Booking.source))):
            row(attr.key(k))["bookings"] += n
        for k, n in db.execute(select(func.lower(func.coalesce(Customer.acquisition_source, DIRECT)), func.count()).where(Customer.business_id == business.id, Customer.deleted_at.is_(None),
                                                                                                                           Customer.created_at >= since).group_by(func.lower(func.coalesce(Customer.acquisition_source, DIRECT)))):
            row(attr.key(k))["customers"] += n
        for src, ch, n, tot in db.execute(select(Order.source, Order.channel, func.count(), func.coalesce(func.sum(Order.total), 0)).where(
                Order.business_id == business.id, Order.created_at >= since, Order.status.notin_(OPEN_ORDER)).group_by(Order.source, Order.channel)):
            row(_order_source(src, ch))["orders"] += n
        for src, ch, tot in db.execute(select(Order.source, Order.channel, func.coalesce(func.sum(Order.total), 0)).where(
                Order.business_id == business.id, Order.created_at >= since, Order.payment_status == "PAID", Order.status.notin_(OPEN_ORDER)).group_by(Order.source, Order.channel)):
            row(_order_source(src, ch))["revenue"] += tot
        for k, tot in db.execute(select(func.lower(Booking.source), func.coalesce(func.sum(Booking.total_amount), 0)).where(
                Booking.business_id == business.id, Booking.deleted_at.is_(None), Booking.created_at >= since, Booking.status == "COMPLETED").group_by(func.lower(Booking.source))):
            row(attr.key(k))["revenue"] += tot
    else:
        for k, n in db.execute(select(Lead.campaign, func.count()).where(Lead.business_id == business.id, Lead.deleted_at.is_(None), Lead.created_at >= since, Lead.campaign.is_not(None)).group_by(Lead.campaign)):
            row(k)["leads"] += n
        for k, n in db.execute(select(Booking.campaign, func.count()).where(Booking.business_id == business.id, Booking.deleted_at.is_(None), Booking.created_at >= since, Booking.campaign.is_not(None)).group_by(Booking.campaign)):
            row(k)["bookings"] += n
        for k, n in db.execute(select(Customer.acquisition_campaign, func.count()).where(Customer.business_id == business.id, Customer.deleted_at.is_(None), Customer.created_at >= since,
                                                                                         Customer.acquisition_campaign.is_not(None)).group_by(Customer.acquisition_campaign)):
            row(k)["customers"] += n
        for k, n, tot in db.execute(select(Order.campaign, func.count(), func.coalesce(func.sum(Order.total), 0)).where(
                Order.business_id == business.id, Order.created_at >= since, Order.campaign.is_not(None), Order.status.notin_(OPEN_ORDER)).group_by(Order.campaign)):
            row(k)["orders"] += n
        for k, tot in db.execute(select(Order.campaign, func.coalesce(func.sum(Order.total), 0)).where(
                Order.business_id == business.id, Order.created_at >= since, Order.campaign.is_not(None), Order.payment_status == "PAID", Order.status.notin_(OPEN_ORDER)).group_by(Order.campaign)):
            row(k)["revenue"] += tot
        for k, tot in db.execute(select(Booking.campaign, func.coalesce(func.sum(Booking.total_amount), 0)).where(
                Booking.business_id == business.id, Booking.deleted_at.is_(None), Booking.created_at >= since, Booking.campaign.is_not(None), Booking.status == "COMPLETED").group_by(Booking.campaign)):
            row(k)["revenue"] += tot
    return rows


def _finish(rows: dict[str, dict], key_name: str) -> list[dict]:
    out = []
    for r in rows.values():
        conv = r["orders"] + r["bookings"]
        out.append({key_name: r["key"], "visitors": r["visitors"], "whatsapp_clicks": r["whatsapp_clicks"], "leads": r["leads"], "bookings": r["bookings"], "orders": r["orders"],
                    "customers": r["customers"], "revenue": float(r["revenue"]), "conversion": round(conv / r["visitors"] * 100, 1) if r["visitors"] else None})
    return sorted(out, key=lambda x: (-x["revenue"], -(x["orders"] + x["bookings"]), -x["leads"], -x["visitors"]))


def sources(db: Session, business, period: str) -> list[dict]:
    return _finish(_collect(db, business, an.period_start(period, business.timezone), "source"), "source")


def campaigns(db: Session, business, period: str) -> list[dict]:
    return _finish(_collect(db, business, an.period_start(period, business.timezone), "campaign"), "campaign")


def funnel(db: Session, business, period: str, *, source: str | None = None, campaign: str | None = None) -> dict:
    since = an.period_start(period, business.timezone)
    source = attr.key(source) if source else None
    ew = _ev_filters(business, since, source, campaign)

    def sessions(types) -> int:
        return db.scalar(select(func.count(func.distinct(SESSION))).where(*ew, AnalyticsEvent.event_type.in_(types))) or 0

    lw = [Lead.business_id == business.id, Lead.deleted_at.is_(None), Lead.created_at >= since]
    ow = [Order.business_id == business.id, Order.created_at >= since, Order.status.notin_(OPEN_ORDER)]
    bw = [Booking.business_id == business.id, Booking.deleted_at.is_(None), Booking.created_at >= since]
    if source:
        lw.append(func.lower(Lead.source) == source.lower() if source != "direct" else func.lower(Lead.source).in_(("website", "direct")))
        ow.append(func.lower(func.coalesce(Order.source, DIRECT)) == source)
        bw.append(func.lower(Booking.source) == source.lower() if source != "direct" else func.lower(Booking.source).in_(("website", "direct")))
    if campaign:
        lw.append(Lead.campaign == campaign); ow.append(Order.campaign == campaign); bw.append(Booking.campaign == campaign)
    leads = db.scalar(select(func.count()).select_from(Lead).where(*lw)) or 0
    orders = db.scalar(select(func.count()).select_from(Order).where(*ow)) or 0
    done_orders = db.scalar(select(func.count()).select_from(Order).where(*ow, Order.status == "COMPLETED")) or 0
    bookings = db.scalar(select(func.count()).select_from(Booking).where(*bw)) or 0
    done_bookings = db.scalar(select(func.count()).select_from(Booking).where(*bw, Booking.status == "COMPLETED")) or 0
    visitors = sessions(VISIT)
    steps = [
        {"key": "visitors", "label": "Visitors", "count": visitors},
        {"key": "viewed", "label": "Viewed a product or service", "count": sessions(ITEM_VIEW)},
        {"key": "contacted", "label": "Tapped WhatsApp or call", "count": sessions(CONTACT)},
        {"key": "leads", "label": "Sent an enquiry or booking request", "count": leads + 0},
        {"key": "checkout", "label": "Started checkout", "count": sessions((EventType.CHECKOUT_STARTED,))},
        {"key": "orders", "label": "Placed an order", "count": orders},
        {"key": "bookings", "label": "Requested a booking", "count": bookings},
        {"key": "completed", "label": "Completed (order or visit)", "count": done_orders + done_bookings},
    ]
    for s in steps:
        s["pct_of_visitors"] = round(s["count"] / visitors * 100, 1) if visitors else None
    return {"period": period, "source": source, "campaign": campaign, "steps": steps, "has_data": any(s["count"] for s in steps),
            "note": "Steps are counts, not a strict path: a customer can message you without placing an order, and old visits may lack sessions."}


def products(db: Session, business, period: str, limit: int = 10) -> dict:
    since = an.period_start(period, business.timezone)
    views = {pid: (n, s) for pid, n, s in db.execute(select(AnalyticsEvent.product_id, func.count(), func.count(func.distinct(SESSION))).where(
        AnalyticsEvent.business_id == business.id, AnalyticsEvent.created_at >= since, AnalyticsEvent.event_type == EventType.PRODUCT_VIEW, AnalyticsEvent.product_id.is_not(None)).group_by(AnalyticsEvent.product_id))}
    adds = {pid: n for pid, n in db.execute(select(AnalyticsEvent.product_id, func.count()).where(
        AnalyticsEvent.business_id == business.id, AnalyticsEvent.created_at >= since, AnalyticsEvent.event_type == EventType.ADD_TO_CART, AnalyticsEvent.product_id.is_not(None)).group_by(AnalyticsEvent.product_id))}
    sold = {pid: (u, rev) for pid, u, rev in db.execute(select(OrderItem.product_id, func.sum(OrderItem.quantity), func.sum(OrderItem.line_total)).join(Order, Order.id == OrderItem.order_id).where(
        OrderItem.business_id == business.id, Order.created_at >= since, Order.status.notin_(OPEN_ORDER), OrderItem.product_id.is_not(None)).group_by(OrderItem.product_id))}
    ids = set(views) | set(adds) | set(sold)
    names = {p.id: p for p in db.scalars(select(Product).where(Product.business_id == business.id, Product.id.in_(ids)))} if ids else {}
    prods = []
    for pid in ids:
        p = names.get(pid)
        if p is None:
            continue
        v = views.get(pid, (0, 0))
        u, rev = sold.get(pid, (0, ZERO))
        prods.append({"id": str(pid), "name": p.name, "views": v[0], "viewers": v[1], "added_to_bag": adds.get(pid, 0), "units": int(u or 0), "revenue": float(rev or 0),
                      "conversion": round((int(u or 0) / v[1]) * 100, 1) if v[1] else None})
    prods.sort(key=lambda x: (-x["revenue"], -x["views"]))
    cats = [{"name": n or "Uncategorised", "units": int(u or 0), "revenue": float(r or 0)} for n, u, r in db.execute(
        select(ServiceCategory.name, func.sum(OrderItem.quantity), func.sum(OrderItem.line_total)).select_from(OrderItem).join(Order, Order.id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id, isouter=True).join(ServiceCategory, ServiceCategory.id == Product.category_id, isouter=True)
        .where(OrderItem.business_id == business.id, Order.created_at >= since, Order.status.notin_(OPEN_ORDER), OrderItem.product_id.is_not(None))
        .group_by(ServiceCategory.name).order_by(func.sum(OrderItem.line_total).desc()).limit(8))]
    sv = db.execute(select(Service.name, func.count()).join(AnalyticsEvent, AnalyticsEvent.service_id == Service.id).where(
        AnalyticsEvent.business_id == business.id, AnalyticsEvent.created_at >= since, AnalyticsEvent.event_type == EventType.SERVICE_VIEW).group_by(Service.name).order_by(func.count().desc()).limit(limit)).all()
    return {"products": prods[:limit], "categories": cats, "services": [{"name": n, "views": c} for n, c in sv], "top_services": an.top_services(db, business.id, since, limit),
            "has_data": bool(prods or cats or sv)}


def compare(db: Session, business, days: int = 30) -> dict:
    """This period vs the one before it: totals and the per-source change. Used to answer "why are sales down?" with facts only."""
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    cur_start, prev_start = now - timedelta(days=days), now - timedelta(days=2 * days)

    def window(a, z):
        ew = [AnalyticsEvent.business_id == business.id, AnalyticsEvent.created_at >= a, AnalyticsEvent.created_at < z]
        visitors = db.scalar(select(func.count(func.distinct(SESSION))).where(*ew, AnalyticsEvent.event_type.in_(VISIT))) or 0
        leads = db.scalar(select(func.count()).select_from(Lead).where(Lead.business_id == business.id, Lead.deleted_at.is_(None), Lead.created_at >= a, Lead.created_at < z)) or 0
        o = db.execute(select(func.count(), func.coalesce(func.sum(Order.total), 0)).where(Order.business_id == business.id, Order.created_at >= a, Order.created_at < z, Order.status.notin_(OPEN_ORDER))).one()
        bk = db.execute(select(func.count(), func.coalesce(func.sum(Booking.total_amount).filter(Booking.status == "COMPLETED"), 0)).where(Booking.business_id == business.id, Booking.deleted_at.is_(None), Booking.created_at >= a, Booking.created_at < z)).one()
        per = {k: n for k, n in db.execute(select(func.lower(func.coalesce(AnalyticsEvent.source, DIRECT)), func.count(func.distinct(SESSION))).where(*ew, AnalyticsEvent.event_type.in_(VISIT)).group_by(func.lower(func.coalesce(AnalyticsEvent.source, DIRECT))))}
        sales = o[0] + bk[0]
        return {"visitors": visitors, "leads": leads, "orders": o[0], "bookings": bk[0], "revenue": float(o[1] + bk[1]), "conversion": round(sales / visitors * 100, 1) if visitors else None, "by_source": per}

    cur, prev = window(cur_start, now), window(prev_start, cur_start)
    deltas = sorted(({"source": k, "now": cur["by_source"].get(k, 0), "before": prev["by_source"].get(k, 0)} for k in set(cur["by_source"]) | set(prev["by_source"])), key=lambda d: d["now"] - d["before"])
    return {"days": days, "current": cur, "previous": prev, "source_changes": deltas}
