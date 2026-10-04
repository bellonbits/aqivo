import re
import secrets
import unicodedata
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.countries import get_country, normalize_phone
from app.core.errors import bad_request
from app.models import (Business, BusinessMember, Domain, Referral, Service, Subscription, Template, User, Website,
                        WebsiteSection)
from app.models.enums import BusinessRole, SubscriptionStatus
from app.services.hours import DEFAULT_HOURS
from app.services.plans import get_plan
from app.services.industries import INDUSTRIES, get_industry
from app.services.website import generate_sections

RESERVED_SLUGS = {
    "api", "admin", "app", "www", "dashboard", "login", "register", "signup", "onboarding", "templates", "pricing",
    "health", "readiness", "media", "static", "assets", "sitemap", "robots", "review", "book", "about", "contact",
    "help", "support", "terms", "privacy", "bizora", "docs", "blog", "mail", "ftp", "demo", "s", "sitemap.xml",
    "robots.txt", "favicon.ico", "forgot-password", "reset-password",
}


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"['’]", "", text.lower())
    text = re.sub(r"[^a-z0-9]+", "", text)  # marysbeauty style, matches aqivo.shop/marysbeauty
    return text[:40] or "business"


def valid_slug(slug: str) -> bool:
    return bool(re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])", slug)) and slug not in RESERVED_SLUGS


def slug_available(db: Session, slug: str, exclude_id: uuid.UUID | None = None) -> bool:
    if not valid_slug(slug):
        return False
    q = select(Business.id).where(Business.slug == slug)
    found = db.scalar(q)
    return found is None or found == exclude_id


def unique_slug(db: Session, base: str) -> str:
    slug = slugify(base)
    if len(slug) < 3:
        slug = slug + "biz"
    candidate = slug
    n = 2
    while not slug_available(db, candidate):
        candidate = f"{slug}{n}"
        n += 1
    return candidate


def business_urls(business: Business) -> dict:
    s = get_settings()
    domain = s.base_domain if s.base_domain and s.base_domain != "localhost" else "aqivo.shop"
    if s.public_base_url and "localhost" not in s.public_base_url:
        base = s.public_base_url.rstrip("/")
    else:
        base = f"https://{domain}"
    wa = whatsapp_link(business)
    root = f"https://{business.primary_domain}" if business.primary_domain else f"{base}/{business.slug}"
    return {
        "profile": root,
        "booking": f"{root}#book",
        "review": f"{root}/review",
        "whatsapp": wa,
        "subdomain": f"https://{business.slug}.{domain}",
        "short": f"{domain}/{business.slug}",
    }


def whatsapp_link(business: Business, service_name: str | None = None) -> str | None:
    if not business.whatsapp:
        return None
    from urllib.parse import quote
    digits = "".join(ch for ch in business.whatsapp if ch.isdigit())
    msg = (business.whatsapp_default_message if service_name else business.whatsapp_greeting) or ""
    msg = msg.replace("{business}", business.name).replace("{service}", service_name or "an appointment")
    return f"https://wa.me/{digits}?text={quote(msg)}"


def create_business(db: Session, *, owner: User | None, name: str, industry: str = "beauty",
                    category: str | None = None, country_code: str = "KE", city: str = "", phone: str | None = None,
                    whatsapp: str | None = None, description: str = "", slug: str | None = None,
                    template_key: str | None = None, plan_key: str | None = None, trial: bool = True,
                    is_demo: bool = False, created_by_admin: User | None = None, referral_code: str | None = None,
                    email: str | None = None) -> Business:
    s = get_settings()
    if industry not in INDUSTRIES:
        raise bad_request("Unknown industry")
    ind = get_industry(industry)
    category = category or ind.categories[0]
    template_key = template_key or ind.template
    country = get_country(country_code)
    try:
        phone_n = normalize_phone(phone, country_code) if phone else None
        wa_n = normalize_phone(whatsapp, country_code) if whatsapp else phone_n
    except ValueError as e:
        raise bad_request(str(e))
    if slug:
        slug = slugify(slug)
        if not slug_available(db, slug):
            raise bad_request("That business link is not available")
    else:
        slug = unique_slug(db, name)

    business = Business(
        name=name.strip(), slug=slug, industry=industry, category=category, country_code=country.code,
        currency=country.currency, locale="en", timezone=country.timezone, city=city, phone=phone_n, whatsapp=wa_n,
        email=email or (owner.email if owner else None), description=description, opening_hours=DEFAULT_HOURS,
        whatsapp_default_message=ind.wa_message, referral_code=secrets.token_hex(4), is_demo=is_demo, created_by_admin_id=created_by_admin.id if created_by_admin else None,
    )
    db.add(business)
    db.flush()
    if owner:
        db.add(BusinessMember(business_id=business.id, user_id=owner.id, role=BusinessRole.BUSINESS_OWNER))

    # subscription: TRIAL of Grow by default (so the site can be published in the first session), else FREE
    now = datetime.now(timezone.utc)
    if plan_key is None:
        plan_key = "GROW" if trial else "FREE"
    plan = get_plan(db, plan_key)
    if plan_key == "FREE":
        db.add(Subscription(business_id=business.id, plan_id=plan.id, status=SubscriptionStatus.ACTIVE, currency=country.currency,
                            current_period_start=now))
    else:
        db.add(Subscription(business_id=business.id, plan_id=plan.id, status=SubscriptionStatus.TRIAL, currency=country.currency,
                            trial_ends_at=now + timedelta(days=s.trial_days), current_period_start=now))

    base_dom = s.base_domain if s.base_domain and s.base_domain != "localhost" else "aqivo.shop"
    db.add(Domain(business_id=business.id, domain=f"{base_dom}/{slug}", type="PATH", status="ACTIVE",
                  verification_status="VERIFIED", ssl_status="MANAGED"))
    db.add(Domain(business_id=business.id, domain=f"{slug}.{base_dom}", type="SUBDOMAIN", status="ACTIVE",
                  verification_status="VERIFIED", ssl_status="MANAGED"))
    create_website(db, business, template_key)

    if referral_code:
        referrer = db.scalars(select(Business).where(Business.referral_code == referral_code)).first()
        if referrer and referrer.id != business.id:
            business.referred_by_id = referrer.id
            db.add(Referral(referrer_business_id=referrer.id, referred_business_id=business.id))
    db.flush()
    return business


def create_website(db: Session, business: Business, template_key: str) -> Website:
    template = db.scalars(select(Template).where(Template.key == template_key, Template.is_active.is_(True))).first()
    if template is None:
        raise bad_request("Unknown template")
    site = Website(business_id=business.id, template_id=template.id, status="DRAFT")
    db.add(site)
    db.flush()
    generate_sections(db, site, business, list(template.default_sections))
    return site
