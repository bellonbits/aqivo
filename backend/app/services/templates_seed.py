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
    _tpl("aqivo", "Aqivo Storefront", "retail", "Unified modern Take App-style digital commerce storefront optimized for mobile shopping, fast ordering, and WhatsApp checkout.", ["Mobile-First Design", "Instant Cart", "WhatsApp Checkout", "Catalog & Search"], "#5B21F5", sections=SECTION_ORDER),
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
            row = Template(**t)
            db.add(row)
            existing[t["key"]] = row
    db.flush()

    # Migrate any websites on inactive/legacy templates to the active unified template
    aqivo_tpl = existing.get("aqivo") or db.scalars(select(Template).where(Template.key == "aqivo")).first()
    if aqivo_tpl:
        from app.models import Website
        for w in db.scalars(select(Website)):
            if w.template_id != aqivo_tpl.id:
                w.template_id = aqivo_tpl.id

    try:
        db.commit()
    except Exception:
        db.rollback()

