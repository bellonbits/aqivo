"""Tracked links: any storefront page + ?source=<channel>&campaign=<slug>. The storefront remembers both and stamps them on every
view, enquiry, booking and order that follows, so results can be traced back to the post, poster or message that earned them."""
from __future__ import annotations

import uuid
from urllib.parse import urlencode

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import bad_request
from app.models import Business, Product, Service, ServiceCategory, WebsitePage
from app.services import attribution as attr
from app.services.business import business_urls

TARGET_TYPES = ("storefront", "shop", "product", "service", "category", "collection", "page", "booking", "checkout")
CHANNEL_LABELS = {"instagram": "Instagram", "facebook": "Facebook", "tiktok": "TikTok", "google": "Google Business", "whatsapp": "WhatsApp", "youtube": "YouTube", "email": "Email",
                  "sms": "SMS", "poster": "Poster / flyer", "qr": "QR code", "referral": "Referral", "twitter": "X / Twitter", "linkedin": "LinkedIn", "website": "Website"}


def target_path(db: Session, business: Business, target_type: str, ref: str | None) -> tuple[str, str]:
    """Returns (path, human label). Refs are checked against this business so a link can never point at someone else's page."""
    if target_type == "storefront":
        return "", "Storefront"
    if target_type == "shop":
        return "/products", "Shop"
    if target_type == "booking":
        return "/bookings", "Booking page"
    if target_type == "checkout":
        return "/checkout", "Checkout"
    try:
        rid = uuid.UUID(str(ref))
    except (ValueError, TypeError):
        raise bad_request("Choose what the link should open")
    if target_type == "product":
        p = db.scalars(select(Product).where(Product.id == rid, Product.business_id == business.id, Product.deleted_at.is_(None))).first()
        if p is None:
            raise bad_request("That product doesn't exist")
        return f"/products/{p.slug}", p.name
    if target_type == "service":
        sv = db.scalars(select(Service).where(Service.id == rid, Service.business_id == business.id, Service.deleted_at.is_(None))).first()
        if sv is None or not sv.slug:
            raise bad_request("That service doesn't exist")
        return f"/services/{sv.slug}", sv.name
    if target_type == "category":
        c = db.scalars(select(ServiceCategory).where(ServiceCategory.id == rid, ServiceCategory.business_id == business.id)).first()
        if c is None or not c.slug:
            raise bad_request("That category doesn't exist")
        return f"/categories/{c.slug}", c.name
    if target_type == "collection":
        from app.models import Collection
        c = db.scalars(select(Collection).where(Collection.id == rid, Collection.business_id == business.id)).first()
        if c is None:
            raise bad_request("That collection doesn't exist")
        return f"/collections/{c.slug}", c.name
    if target_type == "page":
        site = business.website
        pg = db.scalars(select(WebsitePage).where(WebsitePage.id == rid, WebsitePage.business_id == business.id)).first() if site else None
        if pg is None:
            raise bad_request("That page doesn't exist")
        return ("" if pg.is_home else f"/p/{pg.slug}"), pg.title
    raise bad_request("Unknown link target")


def tracked_url(business: Business, path: str, source: str, campaign: str | None = None, extra: dict | None = None) -> str:
    q = {"source": attr.normalise_source(source) if source else "direct"}
    if campaign:
        q["campaign"] = attr.clean_campaign(campaign) or ""
    q.update(extra or {})
    return f"{business_urls(business)['profile']}{path}?{urlencode({k: v for k, v in q.items() if v})}"


def unique_slug(db: Session, model, business_id, base: str, column: str = "slug") -> str:
    from app.services.catalog import slugify
    base = slugify(base, "campaign")[:56]
    slug, n = base, 2
    col = getattr(model, column)
    while db.scalar(select(model.id).where(model.business_id == business_id, col == slug)):
        slug, n = f"{base}-{n}", n + 1
    return slug
