import secrets
import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_auth, require_platform_admin, require_super_admin
from app.core.db import get_db
from app.core.errors import bad_request, conflict, forbidden, not_found, or404
from app.core.security import create_access_token, hash_password
from app.models import (AnalyticsEvent, AuditLog, Booking, Business, BusinessMember, Customer, Lead, Plan, SalesLead, Subscription, SupportTicket, User, Website)
from app.models.enums import BusinessRole, BusinessStatus, SalesLeadStatus, SubscriptionStatus
from app.schemas.business import BusinessOut
from app.services import business as biz
from app.services.audit import audit
from app.services.notifications import notify
from app.services.plans import FEATURES, LIMIT_LABELS, get_plan, get_subscription, refresh_subscription_state
from app.services.subscriptions import SubscriptionService, price_for
from app.services.website import publish as publish_site

router = APIRouter(prefix="/admin", tags=["admin"])


# ------------------------------- dashboard ---------------------------------
@router.get("/dashboard")
def dashboard(admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    biz_rows = db.scalars(select(Business).where(Business.deleted_at.is_(None), Business.is_demo.is_(False))).all()
    subs = {s.business_id: refresh_subscription_state(db, s) for s in db.scalars(select(Subscription))}
    counts = {k: 0 for k in SubscriptionStatus}
    mrr: dict[str, float] = {}
    for b in biz_rows:
        s = subs.get(b.id)
        if not s:
            continue
        counts[s.status] += 1
        if s.status == SubscriptionStatus.ACTIVE:
            price = s.price_override if s.price_override is not None else price_for(s.plan, s.currency)
            if price:
                mrr[s.currency] = mrr.get(s.currency, 0) + float(price)
    db.commit()
    since = now - timedelta(days=30)
    def cnt(model, *w): return db.scalar(select(func.count()).select_from(model).where(*w)) or 0
    return {
        "total_businesses": len(biz_rows), "active_businesses": counts[SubscriptionStatus.ACTIVE], "trial_businesses": counts[SubscriptionStatus.TRIAL],
        "cancelled_businesses": counts[SubscriptionStatus.CANCELLED] + counts[SubscriptionStatus.EXPIRED], "past_due": counts[SubscriptionStatus.PAST_DUE],
        "suspended": sum(1 for b in biz_rows if b.status == BusinessStatus.SUSPENDED), "mrr": mrr,
        "new_registrations_30d": sum(1 for b in biz_rows if b.created_at >= since),
        "websites_live": cnt(Website, Website.status == "PUBLISHED"), "bookings_total": cnt(Booking, Booking.deleted_at.is_(None)),
        "leads_total": cnt(Lead, Lead.deleted_at.is_(None)), "open_tickets": cnt(SupportTicket, SupportTicket.status != "RESOLVED"),
        "sales_pipeline": {s: cnt(SalesLead, SalesLead.deleted_at.is_(None), SalesLead.status == s) for s in SalesLeadStatus},
    }


# ------------------------------- businesses --------------------------------
class AdminBusinessCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    owner_email: EmailStr
    owner_name: str = Field(min_length=1, max_length=160)
    owner_password: str | None = Field(default=None, min_length=8, max_length=128)
    industry: str = "beauty"
    category: str | None = None
    country_code: str = "KE"
    city: str = ""
    phone: str | None = None
    whatsapp: str | None = None
    description: str = ""
    slug: str | None = None
    template_key: str | None = None
    plan_key: str | None = None
    trial: bool = True
    sales_lead_id: uuid.UUID | None = None


def _biz_row(b: Business, sub: Subscription | None, owner: User | None) -> dict:
    return {"id": str(b.id), "name": b.name, "slug": b.slug, "city": b.city, "country_code": b.country_code, "status": b.status, "is_demo": b.is_demo, "created_at": b.created_at,
            "plan": sub.plan.key if sub else None, "subscription_status": sub.status if sub else None, "owner_email": owner.email if owner else None, "owner_name": owner.full_name if owner else None,
            "website_status": b.website.status if b.website else None}


@router.get("/businesses")
def list_businesses(q: str | None = None, status: str | None = None, limit: int = Query(50, le=200), offset: int = 0, admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    stmt = select(Business).where(Business.deleted_at.is_(None))
    if q:
        stmt = stmt.where(or_(Business.name.ilike(f"%{q}%"), Business.slug.ilike(f"%{q}%"), Business.city.ilike(f"%{q}%")))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Business.created_at.desc()).limit(limit).offset(offset)).all()
    out = []
    for b in rows:
        sub = get_subscription(db, b.id)
        if sub:
            refresh_subscription_state(db, sub)
        if status and (not sub or sub.status != status):
            continue
        owner = db.scalar(select(User).join(BusinessMember, BusinessMember.user_id == User.id).where(BusinessMember.business_id == b.id, BusinessMember.role == BusinessRole.BUSINESS_OWNER))
        out.append(_biz_row(b, sub, owner))
    return {"items": out, "total": total}


@router.post("/businesses", status_code=201)
def create_business(body: AdminBusinessCreate, request: Request, admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    """Manual onboarding: create owner + business + website + subscription in one step."""
    email = body.owner_email.lower()
    user = db.scalars(select(User).where(User.email == email)).first()
    temp = None
    if user is None:
        temp = body.owner_password or secrets.token_urlsafe(9)
        user = User(email=email, password_hash=hash_password(temp), full_name=body.owner_name)
        db.add(user)
        db.flush()
    elif db.scalar(select(BusinessMember.id).where(BusinessMember.user_id == user.id)):
        raise conflict("That owner already has a business")
    b = biz.create_business(db, owner=user, name=body.name, industry=body.industry, category=body.category, country_code=body.country_code, city=body.city, phone=body.phone,
                            whatsapp=body.whatsapp, description=body.description, slug=body.slug, template_key=body.template_key, plan_key=body.plan_key, trial=body.trial,
                            created_by_admin=admin, email=email)
    if body.sales_lead_id:
        sl = db.get(SalesLead, body.sales_lead_id)
        if sl:
            sl.business_id, sl.status = b.id, SalesLeadStatus.ONBOARDING
    audit(db, "admin.business_created", user_id=admin.id, business_id=b.id, resource_type="business", resource_id=b.id, request=request)
    notify(db, "welcome", email, business_id=b.id, user_id=user.id, name=user.full_name, business=b.name)
    db.commit()
    return {"business": BusinessOut.model_validate(b), "owner_email": email, "temporary_password": temp, "urls": biz.business_urls(b)}


@router.get("/businesses/{bid}")
def get_business(bid: uuid.UUID, admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    b = or404(db.get(Business, bid), "Business")
    sub = get_subscription(db, b.id)
    if sub:
        refresh_subscription_state(db, sub)
    owner = db.scalar(select(User).join(BusinessMember, BusinessMember.user_id == User.id).where(BusinessMember.business_id == b.id, BusinessMember.role == BusinessRole.BUSINESS_OWNER))
    def cnt(m, *w): return db.scalar(select(func.count()).select_from(m).where(m.business_id == b.id, *w)) or 0
    activity = db.scalars(select(AuditLog).where(AuditLog.business_id == b.id).order_by(AuditLog.created_at.desc()).limit(30)).all()
    return {"business": BusinessOut.model_validate(b), "urls": biz.business_urls(b), "owner": {"id": str(owner.id), "email": owner.email, "name": owner.full_name} if owner else None,
            "subscription": None if not sub else {"status": sub.status, "plan_key": sub.plan.key, "trial_ends_at": sub.trial_ends_at, "current_period_end": sub.current_period_end,
                                                  "price_override": str(sub.price_override) if sub.price_override is not None else None, "grace_ends_at": sub.grace_ends_at},
            "website": {"status": b.website.status, "published_at": b.website.published_at, "template": b.website.template.key} if b.website else None,
            "counts": {"leads": cnt(Lead, Lead.deleted_at.is_(None)), "customers": cnt(Customer, Customer.deleted_at.is_(None)), "bookings": cnt(Booking, Booking.deleted_at.is_(None))},
            "activity": [{"action": a.action, "user_id": str(a.user_id) if a.user_id else None, "impersonator_id": str(a.impersonator_id) if a.impersonator_id else None, "created_at": a.created_at, "metadata": a.meta} for a in activity]}


class AdminBusinessPatch(BaseModel):
    name: str | None = None
    category: str | None = None
    city: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    description: str | None = None
    is_demo: bool | None = None


@router.patch("/businesses/{bid}")
def patch_business(bid: uuid.UUID, body: AdminBusinessPatch, request: Request, admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    b = or404(db.get(Business, bid), "Business")
    data = body.model_dump(exclude_unset=True)
    from app.core.countries import normalize_phone
    try:
        for f in ("phone", "whatsapp"):
            if data.get(f):
                data[f] = normalize_phone(data[f], b.country_code)
    except ValueError as e:
        raise bad_request(str(e))
    for k, v in data.items():
        setattr(b, k, v)
    audit(db, "admin.business_updated", user_id=admin.id, business_id=b.id, resource_type="business", resource_id=b.id, request=request, meta={"fields": sorted(data)})
    db.commit()
    return BusinessOut.model_validate(b)


@router.post("/businesses/{bid}/suspend")
def suspend(bid: uuid.UUID, request: Request, admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    b = or404(db.get(Business, bid), "Business")
    b.status = BusinessStatus.SUSPENDED
    audit(db, "admin.business_suspended", user_id=admin.id, business_id=b.id, resource_type="business", resource_id=b.id, request=request)
    db.commit()
    return {"status": b.status}


@router.post("/businesses/{bid}/activate")
def activate(bid: uuid.UUID, request: Request, admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    b = or404(db.get(Business, bid), "Business")
    b.status = BusinessStatus.ACTIVE
    audit(db, "admin.business_activated", user_id=admin.id, business_id=b.id, resource_type="business", resource_id=b.id, request=request)
    db.commit()
    return {"status": b.status}


class SubscriptionChange(BaseModel):
    plan_key: str
    action: str = Field(default="activate", pattern="^(activate|trial|cancel|expire|suspend)$")
    months: int = Field(default=1, ge=1, le=24)
    price_override: str | None = None


@router.post("/businesses/{bid}/subscription")
def change_subscription(bid: uuid.UUID, body: SubscriptionChange, request: Request, admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    """Manual billing: the founder takes M-Pesa/bank payment out-of-band, then activates the plan here (audited)."""
    b = or404(db.get(Business, bid), "Business")
    plan = get_plan(db, body.plan_key)
    sub = get_subscription(db, b.id)
    if body.action == "activate":
        sub = SubscriptionService.activate(db, b, plan, actor=admin, source="admin")
        if body.months > 1:
            sub.current_period_end += timedelta(days=plan.billing_interval_days * (body.months - 1))
        if body.price_override is not None:
            from decimal import Decimal
            sub.price_override = Decimal(body.price_override)
        notify(db, "payment_success", b.email, business_id=b.id, business=b.name, amount=str(price_for(plan, b.currency) or 0), currency=b.currency)
    elif body.action == "trial":
        from app.core.config import get_settings
        sub.plan_id, sub.plan = plan.id, plan
        sub.status, sub.trial_ends_at = SubscriptionStatus.TRIAL, datetime.now(timezone.utc) + timedelta(days=get_settings().trial_days)
    elif body.action == "cancel":
        SubscriptionService.cancel(db, sub, admin, immediate=True)
    elif body.action == "expire":
        SubscriptionService.set_status(db, sub, SubscriptionStatus.EXPIRED, admin)
    elif body.action == "suspend":
        SubscriptionService.set_status(db, sub, SubscriptionStatus.SUSPENDED, admin)
    audit(db, "admin.subscription_changed", user_id=admin.id, business_id=b.id, request=request, meta={"action": body.action, "plan": body.plan_key})
    db.commit()
    return {"status": sub.status, "plan": sub.plan.key, "current_period_end": sub.current_period_end}


@router.post("/businesses/{bid}/publish")
def force_publish(bid: uuid.UUID, request: Request, admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    b = or404(db.get(Business, bid), "Business")
    site = or404(b.website, "Website")
    publish_site(db, site)
    audit(db, "admin.website_published", user_id=admin.id, business_id=b.id, resource_type="website", resource_id=site.id, request=request)
    db.commit()
    return {"status": site.status}


@router.post("/businesses/{bid}/impersonate")
def impersonate(bid: uuid.UUID, request: Request, admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    """Never silent: start is written to the audit log, every write made afterwards is logged with the admin's id."""
    b = or404(db.get(Business, bid), "Business")
    owner = db.scalar(select(User).join(BusinessMember, BusinessMember.user_id == User.id).where(BusinessMember.business_id == b.id, BusinessMember.role == BusinessRole.BUSINESS_OWNER))
    if not owner:
        raise bad_request("This business has no owner account")
    audit(db, "admin.impersonation_started", user_id=owner.id, impersonator_id=admin.id, business_id=b.id, resource_type="business", resource_id=b.id, request=request)
    db.commit()
    token = create_access_token(str(owner.id), extra={"imp": {"by": str(admin.id), "business_id": str(b.id)}}, minutes=60)
    return {"access_token": token, "business_name": b.name, "expires_in_minutes": 60}


# ------------------------------- plans --------------------------------------
class PlanPatch(BaseModel):
    name: str | None = None
    description: str | None = None
    prices: dict[str, str] | None = None
    features: list[str] | None = None
    highlights: list[str] | None = None
    limits: dict[str, int | None] | None = None
    is_public: bool | None = None
    is_active: bool | None = None


@router.get("/plans")
def admin_plans(admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    return {"plans": [{"key": p.key, "name": p.name, "description": p.description, "prices": p.prices, "features": p.features, "highlights": p.highlights, "is_public": p.is_public, "is_active": p.is_active, "limits": p.limits or {}}
                      for p in db.scalars(select(Plan).order_by(Plan.position))], "all_features": FEATURES, "limit_labels": LIMIT_LABELS}


@router.patch("/plans/{key}")
def patch_plan(key: str, body: PlanPatch, request: Request, admin: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    p = get_plan(db, key.upper())
    data = body.model_dump(exclude_unset=True)
    if "prices" in data:
        from decimal import Decimal, InvalidOperation
        try:
            data["prices"] = {c: str(Decimal(v)) for c, v in data["prices"].items()}
        except InvalidOperation:
            raise bad_request("Prices must be numbers")
    if "features" in data and not set(data["features"]) <= set(FEATURES):
        raise bad_request("Unknown feature")
    if "limits" in data:
        lim = data["limits"] or {}
        if not set(lim) <= set(LIMIT_LABELS) or any((v is not None and (not isinstance(v, int) or isinstance(v, bool) or v < 0)) for v in lim.values()):
            raise bad_request("Limits must be whole numbers (leave a limit out for unlimited)")
        data["limits"] = {k: v for k, v in lim.items() if v is not None}
    for k, v in data.items():
        setattr(p, k, v)
    audit(db, "admin.plan_updated", user_id=admin.id, resource_type="plan", resource_id=p.key, request=request, meta={"fields": sorted(data)})
    db.commit()
    return {"ok": True}


# ------------------------------- sales CRM ---------------------------------
class SalesLeadIn(BaseModel):
    business_name: str = Field(min_length=1, max_length=160)
    owner_name: str = ""
    phone: str | None = None
    industry: str = "beauty"
    location: str = ""
    source: str = ""
    status: SalesLeadStatus = SalesLeadStatus.NEW
    notes: str = ""
    follow_up_on: date | None = None


class SalesLeadPatch(BaseModel):
    business_name: str | None = None
    owner_name: str | None = None
    phone: str | None = None
    industry: str | None = None
    location: str | None = None
    source: str | None = None
    status: SalesLeadStatus | None = None
    notes: str | None = None
    follow_up_on: date | None = None


def _sl(s: SalesLead) -> dict:
    return {"id": str(s.id), "business_name": s.business_name, "owner_name": s.owner_name, "phone": s.phone, "industry": s.industry, "location": s.location, "source": s.source,
            "status": s.status, "notes": s.notes, "follow_up_on": s.follow_up_on, "business_id": str(s.business_id) if s.business_id else None, "created_at": s.created_at}


@router.get("/sales-leads")
def list_sales(status: str | None = None, admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    q = select(SalesLead).where(SalesLead.deleted_at.is_(None))
    if status:
        q = q.where(SalesLead.status == status)
    return [_sl(s) for s in db.scalars(q.order_by(SalesLead.follow_up_on.asc().nulls_last(), SalesLead.created_at.desc()))]


@router.post("/sales-leads", status_code=201)
def create_sales(body: SalesLeadIn, request: Request, admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    s = SalesLead(**body.model_dump(), assigned_to_id=admin.id)
    db.add(s)
    db.flush()
    audit(db, "admin.sales_lead_created", user_id=admin.id, resource_type="sales_lead", resource_id=s.id, request=request)
    db.commit()
    return _sl(s)


@router.patch("/sales-leads/{sid}")
def patch_sales(sid: uuid.UUID, body: SalesLeadPatch, admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    s = or404(db.get(SalesLead, sid), "Sales lead")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    return _sl(s)


@router.delete("/sales-leads/{sid}", status_code=204)
def delete_sales(sid: uuid.UUID, admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    s = or404(db.get(SalesLead, sid), "Sales lead")
    s.deleted_at = datetime.now(timezone.utc)
    db.commit()


# ------------------------------- support -----------------------------------
class TicketPatch(BaseModel):
    status: str | None = Field(default=None, pattern="^(OPEN|PENDING|RESOLVED)$")
    admin_notes: str | None = None
    priority: str | None = Field(default=None, pattern="^(LOW|NORMAL|HIGH)$")


@router.get("/support-tickets")
def tickets(admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    rows = db.execute(select(SupportTicket, Business.name).outerjoin(Business, Business.id == SupportTicket.business_id).order_by(SupportTicket.created_at.desc()).limit(200)).all()
    return [{"id": str(t.id), "business_id": str(t.business_id) if t.business_id else None, "business_name": n, "subject": t.subject, "body": t.body, "status": t.status,
             "priority": t.priority, "admin_notes": t.admin_notes, "created_at": t.created_at} for t, n in rows]


@router.patch("/support-tickets/{tid}")
def patch_ticket(tid: uuid.UUID, body: TicketPatch, admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    t = or404(db.get(SupportTicket, tid), "Ticket")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(t, k, v)
    db.commit()
    return {"ok": True}


# ------------------------------- audit -------------------------------------
@router.get("/audit-logs")
def audit_logs(action: str | None = None, business_id: uuid.UUID | None = None, limit: int = Query(100, le=500), admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    q = select(AuditLog)
    if action:
        q = q.where(AuditLog.action.ilike(f"{action}%"))
    if business_id:
        q = q.where(AuditLog.business_id == business_id)
    return [{"id": str(a.id), "action": a.action, "user_id": str(a.user_id) if a.user_id else None, "impersonator_id": str(a.impersonator_id) if a.impersonator_id else None,
             "business_id": str(a.business_id) if a.business_id else None, "resource_type": a.resource_type, "resource_id": a.resource_id, "ip": a.ip, "metadata": a.meta, "created_at": a.created_at}
            for a in db.scalars(q.order_by(AuditLog.created_at.desc()).limit(limit))]
