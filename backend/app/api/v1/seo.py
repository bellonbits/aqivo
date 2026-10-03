"""SEO tooling: audit, redirects, tracking & branding, integrations (links), social image."""
import uuid
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import TenantContext, require, require_feature
from app.api.helpers import log
from app.core.db import get_db
from app.core.errors import bad_request, or404, upgrade_required
from app.models import SiteRedirect
from app.services import seo as seo_svc
from app.services import website as ws
from app.services.plans import has_feature

router = APIRouter(prefix="/seo", tags=["seo"])
integrations_router = APIRouter(prefix="/integrations", tags=["integrations"])
MAX_REDIRECTS = 100
BLOCKED = ("/checkout", "/cart", "/order", "/api", "/media", "/static")


def _need_seo(db: Session, ctx: TenantContext) -> None:
    if not has_feature(db, ctx.business, "seo_tools"):
        raise upgrade_required("seo_tools", "Redirects are part of the Grow plan and above.")


@router.get("/audit")
def audit(ctx: TenantContext = Depends(require("website:read")), db: Session = Depends(get_db)):
    return seo_svc.audit(db, ctx.business)


# ---- redirects ---------------------------------------------------------
class RedirectIn(BaseModel):
    from_path: str = Field(min_length=2, max_length=200)
    to_path: str = Field(min_length=1, max_length=500)
    permanent: bool = True


def _norm_from(p: str) -> str:
    p = "/" + p.strip().split("?")[0].split("#")[0].strip("/").lower()
    if p == "/" or any(p == b or p.startswith(b + "/") for b in BLOCKED):
        raise bad_request("That address can't be redirected")
    return p


def _norm_to(p: str) -> str:
    p = p.strip()
    if p.startswith("https://"):
        if not urlparse(p).hostname:
            raise bad_request("Enter a full address or a path starting with /")
        return p
    if not p.startswith("/") or p.startswith("//") or p.startswith("/\\"):
        raise bad_request("Send visitors to a path starting with / or a full https:// address")
    return p


def _out(r: SiteRedirect) -> dict:
    return {"id": str(r.id), "from_path": r.from_path, "to_path": r.to_path, "permanent": r.permanent, "hits": r.hits}


@router.get("/redirects")
def list_redirects(ctx: TenantContext = Depends(require("website:read")), db: Session = Depends(get_db)):
    rows = db.scalars(select(SiteRedirect).where(SiteRedirect.business_id == ctx.business_id).order_by(SiteRedirect.created_at.desc()))
    return {"items": [_out(r) for r in rows], "available": has_feature(db, ctx.business, "seo_tools")}


@router.post("/redirects", status_code=201)
def create_redirect(body: RedirectIn, request: Request, ctx: TenantContext = Depends(require("website:write")), db: Session = Depends(get_db)):
    _need_seo(db, ctx)
    frm, to = _norm_from(body.from_path), _norm_to(body.to_path)
    if frm == to.lower().rstrip("/"):
        raise bad_request("A redirect can't point at itself")
    if (db.scalar(select(func.count()).select_from(SiteRedirect).where(SiteRedirect.business_id == ctx.business_id)) or 0) >= MAX_REDIRECTS:
        raise bad_request(f"You can have up to {MAX_REDIRECTS} redirects")
    if db.scalar(select(SiteRedirect.id).where(SiteRedirect.business_id == ctx.business_id, SiteRedirect.from_path == frm)):
        raise bad_request("There's already a redirect from that address")
    back = db.scalar(select(SiteRedirect.id).where(SiteRedirect.business_id == ctx.business_id, SiteRedirect.from_path == to.lower().rstrip("/"), SiteRedirect.to_path == frm))
    if back:
        raise bad_request("That would create a redirect loop")
    r = SiteRedirect(business_id=ctx.business_id, from_path=frm, to_path=to, permanent=body.permanent)
    db.add(r)
    db.flush()
    log(ctx, "seo.redirect_created", request, "redirect", r.id)
    db.commit()
    return _out(r)


@router.delete("/redirects/{rid}", status_code=204)
def delete_redirect(rid: uuid.UUID, ctx: TenantContext = Depends(require("website:write")), db: Session = Depends(get_db)):
    r = or404(db.scalars(select(SiteRedirect).where(SiteRedirect.id == rid, SiteRedirect.business_id == ctx.business_id)).first(), "Redirect")
    db.delete(r)
    db.commit()


# ---- tracking & branding (published with the storefront) ------------------
@router.get("/tracking")
def get_tracking(ctx: TenantContext = Depends(require("website:read")), db: Session = Depends(get_db)):
    s = (ctx.business.website.settings if ctx.business.website else {}) or {}
    return {"ga4_id": s.get("ga4_id", ""), "meta_pixel_id": s.get("meta_pixel_id", ""), "hide_branding": bool(s.get("hide_branding")),
            "can_track": has_feature(db, ctx.business, "tracking"), "can_hide_branding": has_feature(db, ctx.business, "remove_branding")}


@router.patch("/tracking")
def set_tracking(body: dict, request: Request, ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    clean = seo_svc.clean_tracking(body)
    seo_svc.tracking_gate(db, ctx.business, clean)
    site = ctx.business.website
    site.settings = {**(site.settings or {}), **clean}
    ws.touch_draft(site)
    log(ctx, "seo.tracking_updated", request, "website", site.id)
    db.commit()
    return get_tracking(ctx, db)


# ---- integrations (honest: links we use today; OAuth connections are not built) --
def _gurl(v) -> str:
    v = (v or "").strip()
    if not v:
        return ""
    host = (urlparse(v).hostname or "").lower()
    if not v.startswith("https://") or not (host.endswith("google.com") or host.endswith("google.co.ke") or host in ("g.page", "goo.gl", "maps.app.goo.gl") or host.endswith(".g.page")):
        raise bad_request("Paste the link Google gives you (it starts with https:// and is on google.com or g.page)")
    return v[:500]


@integrations_router.get("")
def integrations(ctx: TenantContext = Depends(require("business:read")), db: Session = Depends(get_db)):
    b = ctx.business
    ig = b.integrations or {}
    s = (b.website.settings if b.website else {}) or {}
    social = b.social_links or {}
    from app.core.config import get_settings
    from app.services import connections as cx
    from app.services import whatsapp as wa

    def conn(key, name, detail_on, detail_off, manage="/dashboard/connections", limits=""):
        on = cx.connected(db, b, key)
        return {"key": key, "name": name, "status": "connected" if on else "not_set", "detail": detail_on if on else detail_off, "manage": manage, "limits": limits}

    return {"providers": [
        {"key": "whatsapp", "name": "WhatsApp chat links", "status": "connected" if b.whatsapp else "not_set", "detail": f"Chat and order links use {b.whatsapp}" if b.whatsapp else "Add your WhatsApp number in My business.", "manage": "/dashboard/business", "limits": ""},
        conn("whatsapp_cloud", "WhatsApp Business (Cloud API)", "Order updates, campaigns and login codes are sent from your number; replies appear in the inbox.", "Connect your number to send messages and read replies in Aqivo.",
             limits="Free-form messages are only allowed within 24 hours of the customer's last message; otherwise an approved template is used."),
        conn("paystack", "Paystack", "Customers can pay by card or mobile money; orders confirm automatically.", "Accept cards and mobile money online."),
        conn("flutterwave", "Flutterwave", "Customers can pay by card, bank or mobile money; orders confirm automatically.", "Accept cards, bank transfer and mobile money online."),
        conn("daraja", "M-Pesa STK push", "Customers get an M-Pesa PIN prompt on their phone.", "Send an M-Pesa prompt to the customer's phone."),
        conn("instagram", "Instagram feed", "Your latest posts can be shown on your storefront.", "Show your latest posts on your storefront.", limits="Shows posts; Aqivo can't publish to Instagram."),
        conn("google_places", "Google reviews", "Your Google rating and reviews can be shown on your storefront.", "Show your Google rating and reviews."),
        {"key": "instagram_link", "name": "Instagram / Facebook / TikTok links", "status": "linked" if any(social.get(k) for k in ("instagram", "facebook", "tiktok")) else "not_set",
         "detail": ", ".join(k.title() for k in ("instagram", "facebook", "tiktok") if social.get(k)) or "Add your profile links in My business.", "manage": "/dashboard/business", "limits": "Profile links shown in your footer."},
        {"key": "google_business", "name": "Google review link", "status": "linked" if ig.get("google_review_url") or ig.get("google_maps_url") else "not_set",
         "detail": "Customers can review you on Google from your review page." if ig.get("google_review_url") else "Paste your Google review link so customers can review you on Google.", "manage": "/dashboard/seo?tab=integrations", "limits": ""},
        {"key": "google_analytics", "name": "Google Analytics 4", "status": "connected" if s.get("ga4_id") else "not_set", "detail": s.get("ga4_id") or "Add your measurement ID.", "manage": "/dashboard/seo?tab=tracking", "limits": "Page views are sent from your published storefront."},
        {"key": "meta_pixel", "name": "Meta Pixel", "status": "connected" if s.get("meta_pixel_id") else "not_set", "detail": s.get("meta_pixel_id") or "Add your pixel ID.", "manage": "/dashboard/seo?tab=tracking", "limits": "PageView events only."},
        {"key": "mpesa", "name": "M-Pesa (manual)", "status": "connected" if (b.store_settings or {}).get("mpesa_number") and (b.store_settings or {}).get("payments", {}).get("mpesa") else "not_set", "detail": "Customers pay your till/paybill; you confirm each payment.", "manage": "/dashboard/store", "limits": ""},
        {"key": "email", "name": "Email notifications", "status": "connected" if get_settings().smtp_host else "platform_off", "detail": "Order and booking emails." if get_settings().smtp_host else "Email isn't configured on this server, so messages are logged, not sent.", "manage": None, "limits": ""},
    ], "google": {"google_review_url": ig.get("google_review_url", ""), "google_maps_url": ig.get("google_maps_url", "")},
        "not_available": ["Pesapal, DPO, PawaPay and Airtel Money checkout", "Publishing posts to Instagram", "Google Merchant Center", "Courier company APIs (you assign riders by hand and add a tracking link)", "One-click Google/Instagram sign-in (these use API keys and tokens you paste)"]}


@integrations_router.patch("")
def set_integrations(body: dict, request: Request, ctx: TenantContext = Depends(require("website:write")), db: Session = Depends(get_db)):
    cur = dict(ctx.business.integrations or {})
    for k in ("google_review_url", "google_maps_url"):
        if k in body:
            cur[k] = _gurl(body[k])
    ctx.business.integrations = cur
    if ctx.business.website:
        ws.touch_draft(ctx.business.website)
    log(ctx, "integrations.updated", request, "business", ctx.business.id)
    db.commit()
    return {"google": {"google_review_url": cur.get("google_review_url", ""), "google_maps_url": cur.get("google_maps_url", "")}}
