"""SEO audit: concrete, fixable checks against what the storefront actually publishes. No scores for things we can't measure."""
from __future__ import annotations

import re
from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Business, Product, Service, ServiceCategory, WebsitePage
from app.services.plans import has_feature

GA4 = re.compile(r"^G-[A-Z0-9]{6,12}$")
PIXEL = re.compile(r"^\d{8,20}$")


def issue(severity: str, area: str, message: str, fix: str, count: int | None = None) -> dict:
    return {"severity": severity, "area": area, "message": message, "fix": fix, "count": count}


def audit(db: Session, b: Business) -> dict:
    out: list[dict] = []
    ok: list[str] = []
    site = b.website
    published = bool(site and site.status == "PUBLISHED")
    if not published:
        out.append(issue("error", "Storefront", "Your storefront isn't published, so search engines can't see it.", "/dashboard/website"))
    else:
        ok.append("Storefront is published and listed in your sitemap")
    if site is not None:
        t = (site.seo_title or "").strip()
        if not t:
            out.append(issue("info", "Home page", "No custom search title — we use “Name — category in city”. A title with what you sell is stronger.", "/dashboard/website"))
        elif len(t) > 60:
            out.append(issue("warn", "Home page", f"Your search title is {len(t)} characters; Google shows about 60.", "/dashboard/website"))
        else:
            ok.append("Home page has a search title")
        d = (site.seo_description or b.description or "").strip()
        if len(d) < 70:
            out.append(issue("warn", "Home page", "Your search description is missing or very short (aim for 70–155 characters).", "/dashboard/website"))
        elif len(d) > 155:
            out.append(issue("warn", "Home page", f"Your search description is {len(d)} characters; it will be cut off near 155.", "/dashboard/website"))
        else:
            ok.append("Home page description is a good length")
        if not (site.og_image or b.logo_url):
            out.append(issue("warn", "Sharing", "No social image — links shared on WhatsApp and Facebook show without a picture.", "/dashboard/seo?tab=sharing"))
        else:
            ok.append("A social share image is set")
        pages = list(db.scalars(select(WebsitePage).where(WebsitePage.website_id == site.id, WebsitePage.is_home.is_(False), WebsitePage.enabled.is_(True))))
        bare = [p for p in pages if not (p.seo_description or "").strip()]
        if bare:
            out.append(issue("info", "Pages", f"{len(bare)} page{'s have' if len(bare) != 1 else ' has'} no search description.", "/dashboard/website", len(bare)))
    missing = [x for x, v in (("address", b.address), ("phone", b.phone), ("opening hours", b.opening_hours)) if not v]
    if missing:
        out.append(issue("warn", "Local search", f"Add your {', '.join(missing)} so you can appear in “near me” searches and on your map.", "/dashboard/business"))
    else:
        ok.append("Address, phone and opening hours are filled in")

    prods = list(db.scalars(select(Product).where(Product.business_id == b.id, Product.deleted_at.is_(None), Product.status == "ACTIVE")))
    if prods:
        noimg = [p for p in prods if not p.images]
        nodesc = [p for p in prods if len((p.description or p.short_description or "").strip()) < 30]
        dup = [n for n, c in Counter(p.name.strip().lower() for p in prods).items() if c > 1]
        if noimg:
            out.append(issue("warn", "Products", f"{len(noimg)} product{'s have' if len(noimg) != 1 else ' has'} no photo. Photos drive clicks and sales.", "/dashboard/products", len(noimg)))
        if nodesc:
            out.append(issue("warn", "Products", f"{len(nodesc)} product{'s have' if len(nodesc) != 1 else ' has'} little or no description.", "/dashboard/products", len(nodesc)))
        if dup:
            out.append(issue("warn", "Products", f"{len(dup)} product name{'s are' if len(dup) != 1 else ' is'} used more than once, which makes search results confusing.", "/dashboard/products", len(dup)))
        if not (noimg or nodesc or dup):
            ok.append("All products have photos and descriptions")
    svcs = list(db.scalars(select(Service).where(Service.business_id == b.id, Service.deleted_at.is_(None), Service.is_active.is_(True))))
    nodesc_s = [s for s in svcs if len((s.description or "").strip()) < 20]
    if svcs and nodesc_s:
        out.append(issue("info", "Services", f"{len(nodesc_s)} service{'s have' if len(nodesc_s) != 1 else ' has'} no description.", "/dashboard/services", len(nodesc_s)))
    cats = list(db.scalars(select(ServiceCategory).where(ServiceCategory.business_id == b.id, ServiceCategory.is_visible.is_(True))))
    nodesc_c = [c for c in cats if not (c.description or "").strip()]
    if nodesc_c:
        out.append(issue("info", "Categories", f"{len(nodesc_c)} categor{'ies have' if len(nodesc_c) != 1 else 'y has'} no description.", "/dashboard/products", len(nodesc_c)))
    if not b.primary_domain:
        out.append(issue("info", "Address", "You're using the aqivo.shop address. A custom domain makes your link easier to remember and trust.", "/dashboard/seo?tab=domains"))
    else:
        ok.append(f"Your main address is {b.primary_domain}")
    weight = {"error": 20, "warn": 6, "info": 2}
    score = max(0, 100 - sum(weight[i["severity"]] for i in out))
    return {"score": score, "issues": sorted(out, key=lambda i: ("error", "warn", "info").index(i["severity"])), "passed": ok}


def clean_tracking(data: dict) -> dict:
    from app.core.errors import bad_request
    out = {}
    if "ga4_id" in data:
        v = (data["ga4_id"] or "").strip().upper()
        if v and not GA4.match(v):
            raise bad_request("A Google Analytics 4 ID looks like G-ABC123XYZ")
        out["ga4_id"] = v
    if "meta_pixel_id" in data:
        v = str(data["meta_pixel_id"] or "").strip()
        if v and not PIXEL.match(v):
            raise bad_request("A Meta Pixel ID is 8–20 digits")
        out["meta_pixel_id"] = v
    if "hide_branding" in data:
        if not isinstance(data["hide_branding"], bool):
            raise bad_request("hide_branding must be on or off")
        out["hide_branding"] = data["hide_branding"]
    return out


def tracking_gate(db: Session, b: Business, data: dict) -> None:
    from app.core.errors import upgrade_required
    if ({"ga4_id", "meta_pixel_id"} & set(data)) and any(data.get(k) for k in ("ga4_id", "meta_pixel_id")) and not has_feature(db, b, "tracking"):
        raise upgrade_required("tracking", "Google Analytics and Meta Pixel are part of the Grow plan and above.")
    if data.get("hide_branding") and not has_feature(db, b, "remove_branding"):
        raise upgrade_required("remove_branding", "Removing Aqivo branding is part of the Grow plan and above.")
