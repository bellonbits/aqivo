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
    _tpl("booking_ecom", "Booking", "beauty", "Booking-focused storefront for service businesses.", ["Online booking", "Service menu", "WhatsApp button"], "#B4532A", sections=SECTION_ORDER),
    _tpl("fashion_ecom", "Fashion", "retail", "Fashion storefront with big imagery and a clean product grid.", ["Product grid", "Categories", "Cart drawer", "Search"], "#111111"),
    _tpl("grocery_ecom", "Grocery", "restaurant", "Fresh grocery and food storefront with deals and categories.", ["Deals", "Categories", "Cart drawer", "Search"], "#16A34A"),
    _tpl("mart_ecom", "Mart", "retail", "General marketplace storefront with vendors and product pages.", ["Vendors", "Product page", "Cart drawer", "Search"], "#2563EB"),
    _tpl("shoeshop_ecom", "Shoe Shop", "retail", "Sneaker and footwear storefront with deals and brands.", ["Deals", "Brands", "Cart drawer", "Search"], "#111111"),
    _tpl("aqivo", "Aqivo Modern", "retail", "Unified modern storefront supporting both products and appointment bookings.", ["Products & Services", "Appointments", "Cart & Checkout", "Search"], "#00BFFF"),
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

