"""Plan/feature gating. Features are keys; plans list which they include (editable in /admin)."""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Business, Plan, Subscription
from app.models.enums import SubscriptionStatus

FEATURES = {
    "profile": "Business profile & link",
    "whatsapp": "WhatsApp contact button",
    "qr_basic": "QR code",
    "website": "Professional website",
    "bookings": "Online bookings",
    "customers": "Customer CRM",
    "leads": "Lead inbox",
    "analytics": "Analytics",
    "reviews": "Reviews",
    "mpesa": "M-Pesa payments",
    "invoices": "Invoices",
    "marketing": "Marketing campaigns",
    "ai": "Aqivo AI assistant",
    "retention": "Customer retention",
    "analytics_advanced": "Advanced analytics",
    "staff": "Staff management",
    "multi_location": "Multiple locations",
    "priority_support": "Priority support",
    "automation": "Advanced automation",
}

PLAN_VERSION = 3  # bump when the defaults below change; seed_plans() upgrades older rows without touching admin edits to prices

FEATURES.update({
    "custom_domain": "Custom domain",
    "remove_branding": "Remove Aqivo branding",
    "tracking": "Google Analytics & Meta Pixel",
    "seo_tools": "Redirects & social image",
})

_FREE = ["profile", "whatsapp", "qr_basic", "website", "bookings", "customers", "leads", "reviews"]
_GROW = _FREE + ["analytics", "custom_domain", "remove_branding", "tracking", "seo_tools"]
_PRO = _GROW + ["mpesa", "invoices", "marketing", "ai", "retention", "analytics_advanced"]
_BUSINESS = _PRO + ["staff", "multi_location", "priority_support", "automation"]

# A missing key means unlimited.
LIMITS = {
    "FREE": {"products": 30, "services": 15, "gallery": 12, "pages": 3, "qr_codes": 3, "media": 100, "custom_domains": 0, "staff": 0, "ai_requests_month": 0},
    "GROW": {"products": 500, "services": 100, "gallery": 40, "pages": 10, "qr_codes": 20, "media": 500, "custom_domains": 1, "staff": 0, "ai_requests_month": 0},
    "PRO": {"products": 5000, "services": 500, "gallery": 60, "pages": 20, "qr_codes": 50, "media": 500, "custom_domains": 3, "staff": 0, "ai_requests_month": 300},
    "BUSINESS": {"custom_domains": 10, "media": 500, "staff": 20, "ai_requests_month": 2000, "qr_codes": 50},
}
LIMIT_LABELS = {"products": "products", "services": "services", "gallery": "gallery photos", "pages": "pages", "qr_codes": "QR codes", "media": "library images",
                "custom_domains": "custom domains", "staff": "team members", "ai_requests_month": "AI questions a month"}

DEFAULT_PLANS = [
    dict(key="FREE", name="Free", position=0, prices={"KES": "0", "USD": "0"}, features=_FREE, limits=LIMITS["FREE"], version=PLAN_VERSION,
         description="A real storefront, bookings and WhatsApp orders — free to start.",
         highlights=["Storefront builder with your link", "Products, orders & WhatsApp checkout", "Online bookings & customer list", "Lead inbox & reviews", "Up to 30 products"]),
    dict(key="GROW", name="Grow", position=1, prices={"KES": "1500", "USD": "12"}, features=_GROW, limits=LIMITS["GROW"], version=PLAN_VERSION,
         description="Your own domain, no Aqivo branding and analytics that show where customers come from.",
         highlights=["Everything in Free", "Custom domain", "Remove Aqivo branding", "Source & funnel analytics", "Google Analytics & Meta Pixel", "Up to 500 products"]),
    dict(key="PRO", name="Pro", position=2, prices={"KES": "3000", "USD": "24"}, features=_PRO, limits=LIMITS["PRO"], version=PLAN_VERSION,
         description="Get paid, bring customers back, and let Aqivo AI do the busywork.",
         highlights=["Everything in Grow", "M-Pesa payments", "Marketing campaigns", "Aqivo AI assistant & daily plan",
                     "Customer retention", "Advanced analytics", "Invoices"]),
    dict(key="BUSINESS", name="Business", position=3, prices={"KES": "5000", "USD": "40"}, features=_BUSINESS, limits=LIMITS["BUSINESS"], version=PLAN_VERSION,
         description="For teams and multi-location businesses.",
         highlights=["Everything in Pro", "Staff accounts", "Multiple locations", "Advanced reporting",
                     "Priority support", "Advanced automation"]),
]


def seed_plans(db: Session) -> None:
    """Insert missing plans; upgrade older rows to the current defaults by *adding* new features and limits (admin price edits are kept)."""
    existing = {p.key: p for p in db.scalars(select(Plan))}
    for d in DEFAULT_PLANS:
        row = existing.get(d["key"])
        if row is None:
            db.add(Plan(**d))
            continue
        if (row.version or 1) < PLAN_VERSION:
            row.features = list(dict.fromkeys([*(row.features or []), *d["features"]]))
            row.limits = {**d["limits"], **(row.limits or {})}
            row.highlights = d["highlights"]
            row.version = PLAN_VERSION
    db.commit()


def get_plan(db: Session, key: str) -> Plan:
    return db.scalars(select(Plan).where(Plan.key == key)).one()


def get_subscription(db: Session, business_id) -> Subscription | None:
    return db.scalars(select(Subscription).where(Subscription.business_id == business_id)).first()


def refresh_subscription_state(db: Session, sub: Subscription, now: datetime | None = None) -> Subscription:
    """Lazy state machine — evaluated on read so no cron is required to stay correct."""
    now = now or datetime.now(timezone.utc)
    s = get_settings()
    st = sub.status
    if st == SubscriptionStatus.TRIAL and sub.trial_ends_at and sub.trial_ends_at < now:
        sub.status = SubscriptionStatus.EXPIRED
        sub.data_retained_until = sub.trial_ends_at + _days(s.data_retention_days)
    elif st == SubscriptionStatus.ACTIVE and sub.current_period_end and sub.current_period_end < now:
        if sub.cancel_at_period_end:
            sub.status = SubscriptionStatus.CANCELLED
            sub.data_retained_until = sub.current_period_end + _days(s.data_retention_days)
        else:
            sub.status = SubscriptionStatus.PAST_DUE
            sub.grace_ends_at = sub.current_period_end + _days(s.grace_period_days)
    elif st == SubscriptionStatus.PAST_DUE and sub.grace_ends_at and sub.grace_ends_at < now:
        sub.status = SubscriptionStatus.EXPIRED
        sub.data_retained_until = sub.grace_ends_at + _days(s.data_retention_days)
    return sub


def _days(n: int):
    from datetime import timedelta
    return timedelta(days=n)


def effective_plan(db: Session, business: Business) -> Plan:
    """The plan whose features apply right now. TRIAL/ACTIVE/PAST_DUE(in grace) => subscribed plan; else FREE.
    Data is never deleted when a plan lapses — paid features simply lock (grace/retention)."""
    sub = get_subscription(db, business.id)
    if sub is None:
        return get_plan(db, "FREE")
    refresh_subscription_state(db, sub)
    if sub.status in (SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE):
        return sub.plan
    return get_plan(db, "FREE")


def has_feature(db: Session, business: Business, feature: str) -> bool:
    return feature in (effective_plan(db, business).features or [])


# ----------------------------------------------------------------- limits & usage
def plan_limit(db: Session, business: Business, key: str) -> int | None:
    v = (effective_plan(db, business).limits or {}).get(key)
    return None if v is None else int(v)


def check_limit(db: Session, business: Business, key: str, current: int, adding: int = 1) -> None:
    """Raise a clear upgrade prompt when adding `adding` more would pass the plan's limit."""
    from app.core.errors import upgrade_required
    lim = plan_limit(db, business, key)
    if lim is not None and current + adding > lim:
        plan = effective_plan(db, business)
        what = LIMIT_LABELS.get(key, key)
        raise upgrade_required(f"limit:{key}", f"Your {plan.name} plan includes {lim} {what}. Upgrade to add more." if lim else f"{what.capitalize()} aren't included in your {plan.name} plan. Upgrade to use them.")


def usage(db: Session, business: Business) -> dict:
    """Current usage against every limit, for the billing screen."""
    from datetime import date

    from sqlalchemy import func

    from app.models import AuditLog, Domain, GalleryImage, MediaAsset, Product, QRCode, Service, WebsitePage

    bid = business.id

    def n(model, *where):
        return db.scalar(select(func.count()).select_from(model).where(model.business_id == bid, *where)) or 0

    month = date.today().replace(day=1)
    used = {
        "products": n(Product, Product.deleted_at.is_(None)), "services": n(Service, Service.deleted_at.is_(None)), "gallery": n(GalleryImage), "pages": n(WebsitePage),
        "qr_codes": n(QRCode), "media": n(MediaAsset), "custom_domains": n(Domain, Domain.type == "CUSTOM"),
        "ai_requests_month": db.scalar(select(func.count()).select_from(AuditLog).where(AuditLog.business_id == bid, AuditLog.action == "ai.asked", AuditLog.created_at >= month)) or 0,
    }
    from app.models import BusinessMember
    used["staff"] = max(0, (db.scalar(select(func.count()).select_from(BusinessMember).where(BusinessMember.business_id == bid, BusinessMember.is_active.is_(True))) or 1) - 1)
    return {k: {"used": v, "limit": plan_limit(db, business, k), "label": LIMIT_LABELS[k]} for k, v in used.items()}
