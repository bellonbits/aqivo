import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import TenantContext, get_tenant, require, require_feature
from app.api.helpers import log
from app.core.db import get_db
from app.core.errors import bad_request, or404
from app.models import Booking, Collection, Discount, Lead, MarketingCampaign, MarketingMessage, Notification, Product, QRCode, Service, ServiceCategory, WebsitePage
from app.models.enums import BookingStatus, LeadStatus
from app.repositories import CampaignRepository
from app.schemas.money import ActionIn, AskIn, CampaignIn, CampaignOut, GrowthCampaignIn, GrowthCampaignUpdate, LinkIn, QRIn
from app.services import ai as ai_svc
from app.services import analytics as an
from app.services import growth_analytics as ga
from app.services import campaign_content as cc
from app.services import links as lk
from app.services import marketing as mk
from app.services.qr import poster_pdf, qr_bytes
from app.services.crm import inactive_customers
from app.services.health import get_found_checklist, health_score, next_actions
from app.services.plans import check_limit, has_feature, plan_limit, usage

analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])
marketing_router = APIRouter(prefix="/marketing", tags=["marketing"])
ai_router = APIRouter(prefix="/ai", tags=["ai"])
notif_router = APIRouter(prefix="/notifications", tags=["notifications"])


# ============================ analytics ====================================
@analytics_router.get("/overview")
def overview(ctx: TenantContext = Depends(get_tenant), db: Session = Depends(get_db)):
    """Dashboard home: real numbers only; fields the plan doesn't include are omitted, never faked."""
    b = ctx.business
    s = an.summary(db, b, "30d")
    out = {"period": "30d", "summary": s, "checklist": get_found_checklist(db, b), "actions": next_actions(db, b),
           "leads_new": db.scalar(select(func.count()).select_from(Lead).where(Lead.business_id == b.id, Lead.deleted_at.is_(None), Lead.status == LeadStatus.NEW)) or 0}
    if has_feature(db, b, "customers"):
        out["inactive_45"] = len(inactive_customers(db, b.id, 45))
    return out


@analytics_router.get("/summary")
def summary(period: str = Query("30d", pattern="^(today|7d|30d|90d)$"), ctx: TenantContext = Depends(require_feature("analytics", "analytics:read")), db: Session = Depends(get_db)):
    s = an.summary(db, ctx.business, period)
    since = an.period_start(period, ctx.business.timezone)
    s["leads_by_source"] = an.leads_by_source(db, ctx.business_id, since)
    s["top_services"] = an.top_services(db, ctx.business_id, since)
    return s


PERIOD = Query("30d", pattern="^(today|7d|30d|90d)$")


@analytics_router.get("/sources")
def sources(period: str = PERIOD, ctx: TenantContext = Depends(require_feature("analytics", "analytics:read")), db: Session = Depends(get_db)):
    rows = ga.sources(db, ctx.business, period)
    return {"period": period, "currency": ctx.business.currency, "rows": rows, "has_data": any(r["visitors"] or r["leads"] or r["orders"] or r["bookings"] for r in rows)}


@analytics_router.get("/funnel")
def funnel(period: str = PERIOD, source: str | None = Query(None, max_length=48), campaign: str | None = Query(None, max_length=64),
           ctx: TenantContext = Depends(require_feature("analytics", "analytics:read")), db: Session = Depends(get_db)):
    return ga.funnel(db, ctx.business, period, source=source, campaign=campaign)


@analytics_router.get("/campaigns")
def campaign_performance(period: str = PERIOD, ctx: TenantContext = Depends(require_feature("analytics", "analytics:read")), db: Session = Depends(get_db)):
    from app.models import QRCode
    names = {c.slug: c.name for c in db.scalars(select(MarketingCampaign).where(MarketingCampaign.business_id == ctx.business_id, MarketingCampaign.slug.is_not(None)))}
    names.update({q.campaign: f"QR: {q.name}" for q in db.scalars(select(QRCode).where(QRCode.business_id == ctx.business_id))})
    rows = ga.campaigns(db, ctx.business, period)
    for r in rows:
        r["name"] = names.get(r["campaign"], r["campaign"])
    return {"period": period, "currency": ctx.business.currency, "rows": rows}


@analytics_router.get("/products")
def product_performance(period: str = PERIOD, ctx: TenantContext = Depends(require_feature("analytics", "analytics:read")), db: Session = Depends(get_db)):
    return {**ga.products(db, ctx.business, period), "currency": ctx.business.currency}


@analytics_router.get("/timeseries")
def timeseries(metric: str = Query(pattern="^(visitors|whatsapp|leads|bookings|revenue)$"), period: str = Query("30d", pattern="^(today|7d|30d|90d)$"),
               ctx: TenantContext = Depends(require_feature("analytics", "analytics:read")), db: Session = Depends(get_db)):
    if metric == "revenue" and not has_feature(db, ctx.business, "analytics_advanced"):
        from app.core.errors import upgrade_required
        raise upgrade_required("analytics_advanced")
    return {"metric": metric, "period": period, "points": an.timeseries(db, ctx.business, period, metric)}


@analytics_router.get("/health")
def health(ctx: TenantContext = Depends(require_feature("analytics", "analytics:read")), db: Session = Depends(get_db)):
    return {**health_score(db, ctx.business), "recommendations": next_actions(db, ctx.business)}


@analytics_router.get("/weekly-report")
def weekly(ctx: TenantContext = Depends(require_feature("analytics", "analytics:read")), db: Session = Depends(get_db)):
    s = an.summary(db, ctx.business, "7d")
    top = an.top_services(db, ctx.business_id, an.period_start("7d", ctx.business.timezone), 1)
    return {"summary": s, "top_service": top[0]["service"] if top else None, "next_actions": next_actions(db, ctx.business)[:3]}


# ============================ marketing ====================================
def _camp_out(c: MarketingCampaign) -> CampaignOut:
    o = CampaignOut.model_validate(c)
    o.recipient_count = len(c.messages)
    o.sent_count = sum(1 for m in c.messages if m.status == "SENT")
    return o


@marketing_router.get("/campaigns", response_model=list[CampaignOut])
def list_campaigns(ctx: TenantContext = Depends(require_feature("marketing", "marketing:read")), db: Session = Depends(get_db)):
    return [_camp_out(c) for c in CampaignRepository(db, ctx.business_id).list(order_by=MarketingCampaign.created_at.desc(), limit=100)]


@marketing_router.get("/opportunities")
def opportunities(ctx: TenantContext = Depends(require_feature("marketing", "marketing:read")), db: Session = Depends(get_db)):
    """Retention buckets: customers by days since last completed visit."""
    return {"buckets": [{"days": d, "count": len(inactive_customers(db, ctx.business_id, d))} for d in (30, 45, 60, 90)]}


@marketing_router.post("/campaigns", response_model=CampaignOut, status_code=201)
def create_campaign(body: CampaignIn, request: Request, ctx: TenantContext = Depends(require_feature("marketing", "marketing:write")), db: Session = Depends(get_db)):
    camp = mk.create_campaign(db, ctx.business, name=body.name, kind=body.kind, message_template=body.message_template, audience=body.audience, user_id=ctx.user.id, by_ai=body.by_ai)
    log(ctx, "marketing.campaign_created", request, "campaign", camp.id, recipients=len(camp.messages))
    db.commit()
    return _camp_out(camp)


@marketing_router.get("/campaigns/{cid}")
def get_campaign(cid: uuid.UUID, ctx: TenantContext = Depends(require_feature("marketing", "marketing:read")), db: Session = Depends(get_db)):
    c = or404(CampaignRepository(db, ctx.business_id).get(cid), "Campaign")
    return {"campaign": _camp_out(c), "messages": [{"id": str(m.id), "recipient_name": m.recipient_name, "recipient_phone": m.recipient_phone, "body": m.body, "status": m.status,
                                                    "whatsapp_url": mk.wa_link(m.recipient_phone, m.body), "sent_at": m.sent_at} for m in c.messages]}


@marketing_router.post("/campaigns/{cid}/confirm", response_model=CampaignOut)
def confirm(cid: uuid.UUID, request: Request, ctx: TenantContext = Depends(require_feature("marketing", "marketing:write")), db: Session = Depends(get_db)):
    """Explicit owner confirmation. Bizora doesn't transmit WhatsApp messages itself: this readies the recipient links."""
    c = or404(CampaignRepository(db, ctx.business_id).get(cid), "Campaign")
    mk.confirm_campaign(db, c)
    log(ctx, "marketing.campaign_confirmed", request, "campaign", c.id, recipients=len(c.messages))
    db.commit()
    return _camp_out(c)


@marketing_router.post("/campaigns/{cid}/messages/{mid}/sent", response_model=CampaignOut)
def message_sent(cid: uuid.UUID, mid: uuid.UUID, ctx: TenantContext = Depends(require_feature("marketing", "marketing:write")), db: Session = Depends(get_db)):
    c = or404(CampaignRepository(db, ctx.business_id).get(cid), "Campaign")
    m = next((m for m in c.messages if m.id == mid), None)
    mk.mark_message_sent(db, c, or404(m, "Message"))
    db.commit()
    return _camp_out(c)


@marketing_router.post("/campaigns/{cid}/cancel", response_model=CampaignOut)
def cancel_campaign(cid: uuid.UUID, ctx: TenantContext = Depends(require_feature("marketing", "marketing:write")), db: Session = Depends(get_db)):
    c = or404(CampaignRepository(db, ctx.business_id).get(cid), "Campaign")
    if c.status == "SENT":
        raise bad_request("A sent campaign can't be cancelled")
    c.status = "CANCELLED"
    db.commit()
    return _camp_out(c)


# ----- tracked links & QR codes ------------------------------------------
@marketing_router.get("/link-targets")
def link_targets(ctx: TenantContext = Depends(require("business:read")), db: Session = Depends(get_db)):
    bid = ctx.business_id
    site = ctx.business.website
    return {"channels": [{"key": k, "label": v} for k, v in lk.CHANNEL_LABELS.items()], "base": lk.business_urls(ctx.business)["profile"],
            "products": [{"id": str(p.id), "name": p.name} for p in db.scalars(select(Product).where(Product.business_id == bid, Product.deleted_at.is_(None), Product.status == "ACTIVE").order_by(Product.name).limit(200))],
            "services": [{"id": str(x.id), "name": x.name} for x in db.scalars(select(Service).where(Service.business_id == bid, Service.deleted_at.is_(None), Service.is_active.is_(True), Service.slug.is_not(None)).order_by(Service.name))],
            "categories": [{"id": str(c.id), "name": c.name} for c in db.scalars(select(ServiceCategory).where(ServiceCategory.business_id == bid, ServiceCategory.slug.is_not(None)).order_by(ServiceCategory.name))],
            "collections": [{"id": str(c.id), "name": c.name} for c in db.scalars(select(Collection).where(Collection.business_id == bid, Collection.is_visible.is_(True)).order_by(Collection.name))],
            "pages": [{"id": str(p.id), "name": p.title} for p in db.scalars(select(WebsitePage).where(WebsitePage.business_id == bid, WebsitePage.website_id == site.id).order_by(WebsitePage.position))] if site else []}


@marketing_router.post("/links")
def build_link(body: LinkIn, ctx: TenantContext = Depends(require("business:read")), db: Session = Depends(get_db)):
    path, label = lk.target_path(db, ctx.business, body.target_type, body.target_ref)
    return {"url": lk.tracked_url(ctx.business, path, body.source, body.campaign), "label": label}


def _qr_out(db: Session, q: QRCode, ctx: TenantContext) -> dict:
    scans = db.scalar(select(func.count()).select_from(an.AnalyticsEvent).where(an.AnalyticsEvent.business_id == ctx.business_id, an.AnalyticsEvent.event_type == "QR_SCAN",
                                                                                 an.AnalyticsEvent.campaign == q.campaign)) or 0
    return {"id": str(q.id), "name": q.name, "target_type": q.target_type, "target_ref": q.target_ref, "headline": q.headline, "campaign": q.campaign, "scans": scans,
            "url": lk.tracked_url(ctx.business, q.path, "qr", q.campaign), "created_at": q.created_at}


@marketing_router.get("/qr-codes")
def list_qr(ctx: TenantContext = Depends(require("business:read")), db: Session = Depends(get_db)):
    return [_qr_out(db, q, ctx) for q in db.scalars(select(QRCode).where(QRCode.business_id == ctx.business_id).order_by(QRCode.created_at.desc()))]


@marketing_router.post("/qr-codes", status_code=201)
def create_qr(body: QRIn, request: Request, ctx: TenantContext = Depends(require("marketing:write")), db: Session = Depends(get_db)):
    path, label = lk.target_path(db, ctx.business, body.target_type, body.target_ref)
    n = db.scalar(select(func.count()).select_from(QRCode).where(QRCode.business_id == ctx.business_id)) or 0
    check_limit(db, ctx.business, "qr_codes", n)
    q = QRCode(business_id=ctx.business_id, name=body.name.strip(), target_type=body.target_type, target_ref=body.target_ref if body.target_type in ("product", "service", "category", "collection", "page") else None,
               path=path, campaign=lk.unique_slug(db, QRCode, ctx.business_id, f"qr-{body.name}", "campaign"), headline=body.headline.strip())
    db.add(q)
    db.flush()
    log(ctx, "qr.created", request, "qr", q.id)
    db.commit()
    return _qr_out(db, q, ctx)


@marketing_router.delete("/qr-codes/{qid}", status_code=204)
def delete_qr(qid: uuid.UUID, ctx: TenantContext = Depends(require("marketing:write")), db: Session = Depends(get_db)):
    q = or404(db.scalars(select(QRCode).where(QRCode.id == qid, QRCode.business_id == ctx.business_id)).first(), "QR code")
    db.delete(q)
    db.commit()


@marketing_router.get("/qr-codes/{qid}/image")
def qr_image(qid: uuid.UUID, fmt: str = Query("png", pattern="^(png|svg|pdf)$"), ctx: TenantContext = Depends(require("business:read")), db: Session = Depends(get_db)):
    q = or404(db.scalars(select(QRCode).where(QRCode.id == qid, QRCode.business_id == ctx.business_id)).first(), "QR code")
    url = lk.tracked_url(ctx.business, q.path, "qr", q.campaign)
    if fmt == "pdf":
        data, media = poster_pdf(ctx.business.name, q.headline or "Scan to visit us", url, ctx.business.primary_color), "application/pdf"
    else:
        data, media = qr_bytes(url, fmt)
    return Response(data, media_type=media, headers={"Content-Disposition": f'attachment; filename="{ctx.business.slug}-{q.campaign}.{fmt}"', "Cache-Control": "private, max-age=300"})


# ----- growth campaigns (one offer, many channels, tracked) ---------------
def _growth_out(c: MarketingCampaign) -> CampaignOut:
    return _camp_out(c)


def _validate_code(db: Session, ctx: TenantContext, code: str | None) -> str | None:
    if not code:
        return None
    from app.services import discounts as disc
    d = disc.find(db, ctx.business, code)
    if d is None:
        raise bad_request("That discount code doesn't exist yet. Create it under Products → Discounts first.")
    return d.code


def _build_content(db: Session, ctx: TenantContext, c: MarketingCampaign) -> None:
    path, label = lk.target_path(db, ctx.business, c.target_type or "storefront", c.target_ref)
    c.content = cc.generate(ctx.business, c, label, path)


def _make_growth_campaign(db: Session, ctx: TenantContext, body: GrowthCampaignIn, *, by_ai: bool = False) -> MarketingCampaign:
    chans = [c for c in dict.fromkeys(body.channels) if c in cc.CHANNELS]
    if not chans:
        raise bad_request("Choose at least one channel")
    if body.starts_on and body.ends_on and body.ends_on < body.starts_on:
        raise bad_request("The end date must be after the start date")
    lk.target_path(db, ctx.business, body.target_type, body.target_ref)  # validates the target
    c = MarketingCampaign(business_id=ctx.business_id, name=body.name.strip(), kind="GROWTH", status="DRAFT", message_template="", audience=body.audience or {}, created_by_id=ctx.user.id,
                          created_by_ai=by_ai, slug=lk.unique_slug(db, MarketingCampaign, ctx.business_id, body.name), objective=body.objective, offer_text=body.offer_text.strip(),
                          discount_code=_validate_code(db, ctx, body.discount_code), target_type=body.target_type, target_ref=body.target_ref, channels=chans, starts_on=body.starts_on, ends_on=body.ends_on)
    db.add(c)
    db.flush()
    _build_content(db, ctx, c)
    if body.audience and "whatsapp" in chans:  # optional broadcast list: one prepared message per customer, owner taps to send
        tpl = c.content["whatsapp"]["text"]
        for cust in mk.resolve_audience(db, ctx.business, body.audience):
            db.add(MarketingMessage(business_id=ctx.business_id, campaign_id=c.id, customer_id=cust.id, recipient_name=cust.name, recipient_phone=cust.phone, body=mk.render_message(tpl, ctx.business, cust.name)))
        c.message_template = tpl
        db.flush()
        db.refresh(c)
    return c


@marketing_router.post("/growth-campaigns", response_model=CampaignOut, status_code=201)
def create_growth_campaign(body: GrowthCampaignIn, request: Request, ctx: TenantContext = Depends(require_feature("marketing", "marketing:write")), db: Session = Depends(get_db)):
    c = _make_growth_campaign(db, ctx, body)
    log(ctx, "marketing.growth_campaign_created", request, "campaign", c.id, channels=c.channels)
    db.commit()
    return _growth_out(c)


@marketing_router.patch("/growth-campaigns/{cid}", response_model=CampaignOut)
def update_growth_campaign(cid: uuid.UUID, body: GrowthCampaignUpdate, ctx: TenantContext = Depends(require_feature("marketing", "marketing:write")), db: Session = Depends(get_db)):
    c = or404(CampaignRepository(db, ctx.business_id).get(cid), "Campaign")
    if c.kind != "GROWTH":
        raise bad_request("Not a growth campaign")
    data = body.model_dump(exclude_unset=True)
    regen = False
    for k in ("name", "offer_text"):
        if data.get(k) is not None:
            setattr(c, k, data[k].strip())
            regen = regen or k == "offer_text"
    for k in ("starts_on", "ends_on"):
        if k in data:
            setattr(c, k, data[k])
            regen = True
    if "discount_code" in data:
        c.discount_code = _validate_code(db, ctx, data["discount_code"]); regen = True
    if "channels" in data and data["channels"] is not None:
        c.channels = [x for x in dict.fromkeys(data["channels"]) if x in cc.CHANNELS] or c.channels; regen = True
    if c.starts_on and c.ends_on and c.ends_on < c.starts_on:
        raise bad_request("The end date must be after the start date")
    if regen:
        _build_content(db, ctx, c)
    if data.get("content"):  # the owner hand-edited some copy
        merged = dict(c.content or {})
        for ch, v in data["content"].items():
            if ch in merged and isinstance(v, dict) and isinstance(v.get("text"), str):
                merged[ch] = {**merged[ch], "text": v["text"][:2000], "source": "owner"}
        c.content = merged
    db.commit()
    return _growth_out(c)


@marketing_router.post("/growth-campaigns/{cid}/website-banner")
def campaign_banner(cid: uuid.UUID, request: Request, ctx: TenantContext = Depends(require_feature("marketing", "marketing:write")), db: Session = Depends(get_db)):
    """Puts the offer on the storefront home page as a discount banner (draft — publish the storefront to make it live)."""
    from app.services import website as ws
    c = or404(CampaignRepository(db, ctx.business_id).get(cid), "Campaign")
    site = ctx.business.website
    if c.kind != "GROWTH" or site is None:
        raise bad_request("This campaign can't be added to a website")
    path, _ = lk.target_path(db, ctx.business, c.target_type or "storefront", c.target_ref)
    action = {"product": "shop", "category": "shop", "shop": "shop", "service": "services", "booking": "book"}.get(c.target_type or "", "contact")
    code = f" Use code {c.discount_code}." if c.discount_code else ""
    home_secs = ws.page_sections(site, ws.home_page(db, site).id)
    ws.add_section(db, site, ctx.business, "promo", after_id=home_secs[0].id if home_secs else None, settings={"title": (c.offer_text or c.name)[:100], "body": (f"{c.name}.{code}")[:200], "cta_text": cc.CTA.get(c.objective or "", "Take a look"), "cta_action": action})
    log(ctx, "marketing.campaign_banner", request, "campaign", c.id)
    db.commit()
    return {"ok": True, "message": "Banner added to your home page as a draft. Publish your storefront to show it.", "href": "/dashboard/website"}


# ================================ AI =======================================
@ai_router.get("/suggestions")
def suggestions(ctx: TenantContext = Depends(require_feature("ai", "ai:use"))):
    return {"suggestions": ai_svc.SUGGESTIONS}


@ai_router.post("/ask")
def ask(body: AskIn, request: Request, ctx: TenantContext = Depends(require_feature("ai", "ai:use")), db: Session = Depends(get_db)):
    u = usage(db, ctx.business)["ai_requests_month"]
    if u["limit"] is not None and u["used"] >= u["limit"]:
        from app.core.errors import upgrade_required
        raise upgrade_required("limit:ai_requests_month", f"You've used all {u['limit']} AI questions included this month. They reset on the 1st, or upgrade for more.")
    res = ai_svc.answer(db, ctx.business, body.question)
    log(ctx, "ai.asked", request, "ai", None, question=body.question[:200], source=res.get("source"))
    db.commit()
    return res


@ai_router.get("/plan")
def growth_plan(ctx: TenantContext = Depends(require_feature("ai", "ai:use")), db: Session = Depends(get_db)):
    """Today's ranked to-do list, computed from real data. Also runs the owner's opted-in automations once a day (drafts only)."""
    from app.services import automation, growth_plan as gp
    prepared = []
    try:
        prepared = [{"kind": m["kind"], "title": m["title"], "campaign_id": str(m["campaign"].id)} for m in automation.run_daily(db, ctx.business)]
        db.commit()
    except Exception:  # noqa: BLE001 - a failed automation must never break the plan
        db.rollback()
    return {"items": gp.todays_plan(db, ctx.business), "automations": automation.settings(ctx.business), "automation_options": {k: v["label"] for k, v in automation.AUTOMATIONS.items()},
            "prepared_today": prepared, "generated_at": datetime.now(timezone.utc)}


@ai_router.patch("/automations")
def set_automations(body: dict, request: Request, ctx: TenantContext = Depends(require_feature("ai", "marketing:write")), db: Session = Depends(get_db)):
    from app.services import automation
    out = automation.update(ctx.business, body)
    log(ctx, "ai.automations_updated", request, "business", ctx.business.id)
    db.commit()
    return out


@ai_router.post("/automations/run")
def run_automations(ctx: TenantContext = Depends(require_feature("ai", "marketing:write")), db: Session = Depends(get_db)):
    from app.services import automation
    made = automation.run_daily(db, ctx.business, force=True)
    db.commit()
    return {"prepared": [{"kind": m["kind"], "title": m["title"], "campaign_id": str(m["campaign"].id)} for m in made]}


@ai_router.post("/actions")
def execute_action(body: ActionIn, request: Request, ctx: TenantContext = Depends(require_feature("ai", "ai:use")), db: Session = Depends(get_db)):
    """AI proposals are inert until the owner confirms here. `confirmed` must be true."""
    from app.core.errors import forbidden
    if not body.confirmed:
        raise bad_request("This action needs your confirmation")
    p = body.payload

    def need(perm: str, feature: str | None = None) -> None:
        if not ctx.can(perm) or (feature and not has_feature(db, ctx.business, feature)):
            raise forbidden("That isn't available on your plan or role")

    if body.type == "create_campaign":
        need("marketing:write", "marketing")
        camp = mk.create_campaign(db, ctx.business, name=str(p.get("name", "Campaign"))[:160], kind=p.get("kind", "WHATSAPP"), message_template=str(p.get("message_template", ""))[:1000],
                                  audience=p.get("audience") or {"type": "all"}, user_id=ctx.user.id, by_ai=True)
        log(ctx, "ai.action.create_campaign", request, "campaign", camp.id, recipients=len(camp.messages))
        db.commit()
        return {"ok": True, "message": f"Draft campaign created with {len(camp.messages)} recipient(s). Review it in Marketing — nothing has been sent.", "campaign_id": str(camp.id), "href": f"/dashboard/marketing?open={camp.id}"}
    if body.type == "follow_up_leads":
        need("leads:write", "marketing")
        camp = mk.create_followup_campaign(db, ctx.business, [uuid.UUID(str(x)) for x in p.get("lead_ids", [])][:100], user_id=ctx.user.id, by_ai=True)
        log(ctx, "ai.action.follow_up_leads", request, "campaign", camp.id, recipients=len(camp.messages))
        db.commit()
        return {"ok": True, "message": f"{len(camp.messages)} follow-up message(s) prepared. Review and send them from Marketing — nothing has been sent.", "campaign_id": str(camp.id), "href": f"/dashboard/marketing?open={camp.id}"}
    if body.type == "request_reviews":
        need("reviews:respond", "marketing")
        camp = mk.create_review_campaign(db, ctx.business, booking_ids=[uuid.UUID(str(x)) for x in p.get("booking_ids", [])][:100], order_ids=[uuid.UUID(str(x)) for x in p.get("order_ids", [])][:100],
                                         user_id=ctx.user.id, by_ai=True)
        log(ctx, "ai.action.request_reviews", request, "campaign", camp.id, recipients=len(camp.messages))
        db.commit()
        return {"ok": True, "message": f"{len(camp.messages)} review request(s) prepared with single-use links. Review and send them from Marketing.", "campaign_id": str(camp.id), "href": f"/dashboard/marketing?open={camp.id}"}
    if body.type == "create_growth_campaign":
        need("marketing:write", "marketing")
        code = None
        cd = p.get("create_discount")
        if isinstance(cd, dict) and cd.get("percent"):
            from app.services import discounts as disc
            pct = max(1, min(90, int(cd["percent"])))
            code = disc.normalise_code(cd.get("code") or f"PROMO{pct}")
            if not disc.find(db, ctx.business, code):
                db.add(Discount(business_id=ctx.business_id, code=code, description="Created with the campaign by Aqivo AI", type="PERCENT", value=pct))
                db.flush()
        gb = GrowthCampaignIn(name=str(p.get("name", "Campaign"))[:160], objective=p.get("objective", "AWARENESS"), offer_text=str(p.get("offer_text", ""))[:300], discount_code=code,
                              target_type=p.get("target_type", "storefront"), target_ref=p.get("target_ref"), channels=[c for c in p.get("channels", ["instagram", "whatsapp"]) if isinstance(c, str)][:8])
        camp = _make_growth_campaign(db, ctx, gb, by_ai=True)
        log(ctx, "ai.action.create_growth_campaign", request, "campaign", camp.id, channels=camp.channels)
        db.commit()
        return {"ok": True, "message": "Campaign draft created with copy and tracked links for each channel. Review it in Marketing.", "campaign_id": str(camp.id), "href": f"/dashboard/marketing?open={camp.id}"}
    if body.type == "update_product_description":
        need("products:write")
        prod = or404(db.scalars(select(Product).where(Product.id == uuid.UUID(str(p.get("product_id"))), Product.business_id == ctx.business_id, Product.deleted_at.is_(None))).first(), "Product")
        prod.description = str(p.get("description", ""))[:5000]
        if ctx.business.website:
            ctx.business.website.has_unpublished_changes = True
        log(ctx, "ai.action.update_product_description", request, "product", prod.id)
        db.commit()
        return {"ok": True, "message": f"Updated the description of {prod.name}.", "href": "/dashboard/products"}
    if body.type == "update_description":
        if not ctx.can("*"):
            raise forbidden()
        ctx.business.description = str(p.get("description", ""))[:2000]
        if ctx.business.website:
            ctx.business.website.has_unpublished_changes = True
        log(ctx, "ai.action.update_description", request, "business", ctx.business.id)
        db.commit()
        return {"ok": True, "message": "Description updated. Publish your website to make it live.", "href": "/dashboard/business"}
    raise bad_request("Unknown action")


# ========================== notifications (in-app) =========================
@notif_router.get("")
def my_notifications(ctx: TenantContext = Depends(get_tenant), db: Session = Depends(get_db)):
    rows = db.scalars(select(Notification).where(Notification.business_id == ctx.business_id).order_by(Notification.created_at.desc()).limit(30))
    return [{"id": str(n.id), "kind": n.kind, "subject": n.subject, "body": n.body, "status": n.status, "created_at": n.created_at, "read": n.read_at is not None} for n in rows]


@notif_router.post("/read", status_code=204)
def mark_read(ctx: TenantContext = Depends(get_tenant), db: Session = Depends(get_db)):
    for n in db.scalars(select(Notification).where(Notification.business_id == ctx.business_id, Notification.read_at.is_(None))):
        n.read_at = datetime.now(timezone.utc)
    db.commit()
