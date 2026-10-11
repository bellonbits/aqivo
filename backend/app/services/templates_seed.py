"""Website templates. These are the static storefronts in public/ecomm_templates/<key>/ (served at
/ecomm-templates/<key>/). The template key equals the folder name."""
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Template

SECTION_ORDER = ["hero", "about", "services", "gallery", "testimonials", "booking", "location", "contact"]
SHOP_ORDER = ["hero", "category_grid", "product_grid", "product_carousel", "why_us", "reviews", "contact"]


def _tpl(key, name, industry, description, features, accent, bg="#FFFFFF", ink="#111111", sections=SHOP_ORDER):
    return dict(key=key, name=name, industry=industry, description=description, features=features, default_sections=sections,
                theme=dict(bg=bg, ink=ink, accent=accent, accent_ink="#FFFFFF", muted="#6B7280", surface="#FFFFFF", border="#E5E7EB",
                           font_display="'Inter', system-ui, sans-serif", font_body="'Inter', system-ui, sans-serif", hero="split", radius="12px"))


TEMPLATES = [
    _tpl("twosidesboutique", "Two Sides Boutique", "retail", "Contemporary fashion atelier storefront with ready-to-wear collections and size variants.", ["Collections", "Size Variants", "Atelier Sales", "Online Checkout"], "#059669", sections=SHOP_ORDER),
    _tpl("mavunofresh", "Mavuno Fresh", "retail", "Farm-fresh groceries and produce storefront with fresh vegetable boxes and rapid dispatch.", ["Farm Produce", "Harvest Deals", "Quantity Steppers", "M-Pesa Checkout"], "#16A34A", sections=SHOP_ORDER),
    _tpl("brewandbites", "Brew & Bites", "restaurant", "Modern food & dining storefront with real-time cart, countdown offers, and delivery tracking.", ["Menu & Pizzas", "Special Offers", "Quantity Steppers", "Online Checkout"], "#D97706", sections=SHOP_ORDER),
    _tpl("zuribeauty", "Zuri Beauty Studio", "beauty", "Luxe beauty salon, barbershop and service storefront with appointment booking and grooming.", ["Beauty & Grooming", "Salon & Barbershop Bookings", "Service Durations", "WhatsApp Confirmation"], "#9333EA", sections=SECTION_ORDER),
]


def seed_templates(db: Session) -> None:
    try:
        db.execute(text("SELECT pg_advisory_xact_lock(hashtext('seed_templates'))"))
    except Exception:
        pass
    existing = {t.key: t for t in db.scalars(select(Template))}
    keys = {t["key"] for t in TEMPLATES}
    for row in existing.values():
        if row.key not in keys:
            row.is_active = False  # FK from websites is RESTRICT: retire instead of delete
    for t in TEMPLATES:
        if t["key"] in existing:
            row = existing[t["key"]]
            for k, v in t.items():
                setattr(row, k, v)
            row.is_active = True
        else:
            db.add(Template(**t))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = {t.key: t for t in db.scalars(select(Template))}
        for t in TEMPLATES:
            if t["key"] in existing:
                row = existing[t["key"]]
                for k, v in t.items():
                    setattr(row, k, v)
                row.is_active = True
        try:
            db.commit()
        except Exception:
            db.rollback()

