import secrets
import uuid

from fastapi import APIRouter, Depends, File, Request, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import TenantContext, get_current_user, get_tenant, require
from app.api.helpers import log
from app.core.countries import COUNTRIES, get_country, normalize_phone, SUPPORTED_CURRENCIES, SUPPORTED_LOCALES
from app.core.db import get_db
from app.core.errors import bad_request, conflict, forbidden, not_found
from app.core.rate_limit import rate_limit
from app.core.security import hash_password
from app.models import Business, BusinessMember, Domain, User
from app.models.enums import BusinessRole
from app.schemas.business import BusinessCreate, BusinessOut, BusinessUpdate, MemberInvite
from app.services import business as biz
from app.services.industries import INDUSTRIES
from app.services.audit import audit
from app.services.health import get_found_checklist
from app.services.hours import validate_hours
from app.services.images import process_upload
from app.services.notifications import notify
from app.services.plans import effective_plan, get_subscription, has_feature, refresh_subscription_state
from app.services.qr import qr_bytes

router = APIRouter(prefix="/businesses", tags=["businesses"])


@router.get("/config")
def config():
    """Country/currency/locale configuration for the UI (no hardcoded Kenya)."""
    return {"countries": [{"code": c.code, "name": c.name, "currency": c.currency, "dial_code": c.dial_code, "timezone": c.timezone,
                           "payment_providers": list(c.payment_providers)} for c in COUNTRIES.values()],
            "currencies": list(SUPPORTED_CURRENCIES), "locales": list(SUPPORTED_LOCALES),
            "industries": [{"key": i.key, "label": i.label, "blurb": i.blurb, "categories": list(i.categories), "template": i.template, "item_word": i.item_word, "photo": i.photo,
                            "suggestions": [{"name": n, "price": p, "minutes": m} for n, p, m in i.suggestions]} for i in INDUSTRIES.values()]}


@router.get("/slug-available")
def slug_available(slug: str, db: Session = Depends(get_db)):
    s = biz.slugify(slug)
    return {"slug": s, "available": biz.slug_available(db, s)}


@router.post("", response_model=BusinessOut, status_code=201, dependencies=[Depends(rate_limit("biz-create", 10, 3600))])
def create_business(body: BusinessCreate, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if db.scalar(select(BusinessMember.id).where(BusinessMember.user_id == user.id)):
        raise conflict("You already have a business")
    b = biz.create_business(db, owner=user, name=body.name, industry=body.industry, category=body.category, country_code=body.country_code,
                            city=body.city, phone=body.phone, whatsapp=body.whatsapp, description=body.description, slug=body.slug,
                            template_key=body.template_key, referral_code=body.referral_code)
    audit(db, "business.created", user_id=user.id, business_id=b.id, resource_type="business", resource_id=b.id, request=request)
    notify(db, "welcome", user.email, business_id=b.id, user_id=user.id, name=user.full_name, business=b.name)
    db.commit()
    return b


def _summary(db: Session, ctx: TenantContext) -> dict:
    b = ctx.business
    sub = get_subscription(db, b.id)
    if sub:
        refresh_subscription_state(db, sub)
    plan = effective_plan(db, b)
    site = b.website
    return {
        "business": BusinessOut.model_validate(b).model_dump(mode="json"),
        "role": ctx.role, "permissions_all": ctx.can("*"),
        "urls": biz.business_urls(b),
        "plan": {"key": plan.key, "name": plan.name, "features": plan.features},
        "subscription": None if not sub else {
            "status": sub.status, "plan_key": sub.plan.key, "plan_name": sub.plan.name, "trial_ends_at": sub.trial_ends_at, "current_period_end": sub.current_period_end,
            "cancel_at_period_end": sub.cancel_at_period_end, "grace_ends_at": sub.grace_ends_at, "data_retained_until": sub.data_retained_until},
        "website": {"status": site.status if site else None, "has_unpublished_changes": site.has_unpublished_changes if site else False},
        "impersonating": ctx.impersonator_id is not None,
    }


@router.get("/me")
def get_me(ctx: TenantContext = Depends(get_tenant), db: Session = Depends(get_db)):
    return _summary(db, ctx)


@router.patch("/me")
def update_me(body: BusinessUpdate, request: Request, ctx: TenantContext = Depends(require("business:read")), db: Session = Depends(get_db)):
    if not ctx.can("*") and not ctx.can("services:write"):
        raise forbidden()
    b = ctx.business
    data = body.model_dump(exclude_unset=True)
    if "slug" in data and data["slug"] is not None:
        if not ctx.can("*"):
            raise forbidden("Only the owner can change the business link")
        new = biz.slugify(data["slug"])
        if new != b.slug:
            if not biz.slug_available(db, new, exclude_id=b.id):
                raise bad_request("That business link is not available")
            s = biz.get_settings()
            old_slug = b.slug
            b.slug = new
            for d in db.scalars(select(Domain).where(Domain.business_id == b.id, Domain.type.in_(("PATH", "SUBDOMAIN")))):
                d.domain = f"{new}.{s.base_domain}" if d.type == "SUBDOMAIN" else f"{s.base_domain}/{new}"
            log(ctx, "business.slug_changed", request, "business", b.id, old=old_slug, new=new)
    data.pop("slug", None)
    country = b.country_code
    try:
        for f in ("phone", "whatsapp"):
            if f in data and data[f]:
                data[f] = normalize_phone(data[f], country)
        if data.get("opening_hours") is not None:
            data["opening_hours"] = validate_hours(data["opening_hours"])
    except ValueError as e:
        raise bad_request(str(e))
    if "blocked_dates" in data and data["blocked_dates"] is not None:
        from datetime import date
        try:
            data["blocked_dates"] = sorted({date.fromisoformat(d).isoformat() for d in data["blocked_dates"]})
        except ValueError:
            raise bad_request("Blocked dates must be YYYY-MM-DD")
    for k, v in data.items():
        setattr(b, k, v)
    if b.website:
        b.website.has_unpublished_changes = True
    log(ctx, "business.updated", request, "business", b.id, fields=sorted(data))
    db.commit()
    return _summary(db, ctx)


@router.post("/me/logo")
async def upload_logo(request: Request, file: UploadFile = File(...), ctx: TenantContext = Depends(require("business:read")), db: Session = Depends(get_db)):
    if not ctx.can("services:write"):
        raise forbidden()
    res = await process_upload(file, ctx.business.id, "logo")
    ctx.business.logo_url = res["medium_url"]
    if ctx.business.website:
        ctx.business.website.has_unpublished_changes = True
    log(ctx, "business.logo_updated", request, "business", ctx.business.id)
    db.commit()
    return {"logo_url": ctx.business.logo_url}


@router.post("/me/onboarding-complete", status_code=204)
def onboarding_complete(ctx: TenantContext = Depends(require("business:read")), db: Session = Depends(get_db)):
    ctx.business.onboarding_completed = True
    db.commit()


@router.get("/me/checklist")
def checklist(ctx: TenantContext = Depends(require("business:read")), db: Session = Depends(get_db)):
    return get_found_checklist(db, ctx.business)


@router.get("/me/links")
def links(ctx: TenantContext = Depends(require("business:read"))):
    return biz.business_urls(ctx.business)


@router.get("/me/qr")
def qr(fmt: str = "png", ctx: TenantContext = Depends(require("business:read"))):
    if fmt not in ("png", "svg"):
        raise bad_request("fmt must be png or svg")
    url = biz.business_urls(ctx.business)["profile"] + "?qr=1"
    data, media = qr_bytes(url, fmt)
    return Response(data, media_type=media, headers={"Content-Disposition": f'attachment; filename="{ctx.business.slug}-qr.{fmt}"', "Cache-Control": "private, max-age=3600"})


# ---- team ------------------------------------------------------------
@router.get("/me/members")
def members(ctx: TenantContext = Depends(require("members:manage")), db: Session = Depends(get_db)):
    rows = db.execute(select(BusinessMember, User).join(User, User.id == BusinessMember.user_id).where(BusinessMember.business_id == ctx.business.id)).all()
    return [{"id": str(m.id), "user_id": str(u.id), "email": u.email, "full_name": u.full_name, "role": m.role, "staff_id": str(m.staff_id) if m.staff_id else None,
             "is_active": m.is_active} for m, u in rows]


@router.post("/me/members", status_code=201)
def invite_member(body: MemberInvite, request: Request, ctx: TenantContext = Depends(require("members:manage")), db: Session = Depends(get_db)):
    if not has_feature(db, ctx.business, "staff"):
        from app.core.errors import upgrade_required
        raise upgrade_required("staff")
    from app.services.plans import check_limit, usage as plan_usage
    check_limit(db, ctx.business, "staff", plan_usage(db, ctx.business)["staff"]["used"])
    email = body.email.lower()
    user = db.scalars(select(User).where(User.email == email)).first()
    temp = None
    if user is None:
        temp = body.password or secrets.token_urlsafe(9)
        user = User(email=email, password_hash=hash_password(temp), full_name=body.full_name)
        db.add(user)
        db.flush()
    elif db.scalar(select(BusinessMember.id).where(BusinessMember.user_id == user.id)):
        raise conflict("That person already belongs to a business")
    m = BusinessMember(business_id=ctx.business.id, user_id=user.id, role=body.role, staff_id=body.staff_id)
    db.add(m)
    log(ctx, "staff.member_added", request, "user", user.id, role=body.role)
    notify(db, "team_invite", user.email, business_id=ctx.business.id, user_id=user.id, name=user.full_name, business=ctx.business.name)
    db.commit()
    return {"id": str(m.id), "email": email, "temporary_password": temp}


@router.delete("/me/members/{member_id}", status_code=204)
def remove_member(member_id: uuid.UUID, request: Request, ctx: TenantContext = Depends(require("members:manage")), db: Session = Depends(get_db)):
    m = db.scalars(select(BusinessMember).where(BusinessMember.id == member_id, BusinessMember.business_id == ctx.business.id)).first()
    if not m:
        raise not_found("Member")
    if m.role == BusinessRole.BUSINESS_OWNER:
        raise bad_request("The owner can't be removed")
    db.delete(m)
    log(ctx, "staff.member_removed", request, "user", m.user_id)
    db.commit()
