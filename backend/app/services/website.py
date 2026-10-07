import copy
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import bad_request, not_found
from app.models import Business, Product, ServiceCategory, Template, Website, WebsitePage, WebsiteSection
from app.services import sections
from app.services.industries import get_industry

MAX_SECTIONS = 40


def default_section_content(stype: str, b: Business) -> dict:
    """Starting settings for a new section, written in the business's own vocabulary."""
    ind = get_industry(b.industry)
    city = f" in {b.city}" if b.city else ""
    base = {
        "hero": {"headline": b.name, "subheadline": b.tagline or b.description[:160] or f"{b.category}{city}. {ind.booking_subtitle} Or message us on WhatsApp.",
                 "cta_text": ind.cta, "image_url": None},
        "promo": {"title": "Free delivery on orders over KSh 5,000", "body": "Order on WhatsApp and we'll confirm within minutes.", "cta_text": "Shop now"},
        "specialists": {"title": "Meet the team", "subtitle": "Choose who you'd like to book with."},
        "about": {"title": f"About {b.name}", "body": b.description or f"{b.name} is a {b.category.lower()}{city}. Add your story here."},
        "services": {"title": ind.services_title, "subtitle": ind.services_subtitle},
        "gallery": {"title": f"A Taste of {b.name}" if b.industry == "restaurant" else "Gallery"},
        "testimonials": {"title": "What Our Customers Say" if b.industry == "restaurant" else "What customers say"},
        "reviews": {"title": "What Our Customers Say" if b.industry == "restaurant" else "Reviews from real customers"},
        "booking": {"title": ind.booking_title, "subtitle": ind.booking_subtitle},
        "location": {"title": f"Visit {b.name}" if b.industry == "restaurant" else "Find us"},
        "contact": {"title": "Get in touch", "body": "Message us on WhatsApp or give us a call — we reply quickly."},
        "announcement": {"text": "Order on WhatsApp — we reply within minutes."},
        "profile": {"title": b.name},
        "image": {"alt": b.name},
        "image_text": {"title": f"Why {b.name}", "body": b.description[:400] if b.description else "Tell customers what makes you different."},
        "text": {"title": "A few words", "body": "Write something here."},
        "rich_text": {"title": "Good to know", "body": "- Add your policies\n- Delivery areas\n- Anything customers often ask"},
        "product_grid": {"title": "Shop", "subtitle": "", "source": "all", "limit": 8},
        "product_carousel": {"title": "New Arrivals", "subtitle": "Trending this week", "source": "all", "limit": 10},
        "why_us": {"title": "Why shop with us", "subtitle": "Our promise to every customer",
                   "f1_title": "Secure ordering", "f1_desc": "Safe online checkout with instant order confirmation",
                   "f2_title": "Fast delivery", "f2_desc": "Direct to your doorstep with tracking updates",
                   "f3_title": "Easy checkout", "f3_desc": "Pay with M-Pesa, card, WhatsApp or cash"},
        "offers": {"title": "On offer", "subtitle": "Reduced prices while stock lasts."},
        "category_grid": {"title": "Browse by category"},
        "service_grid": {"title": ind.services_title, "subtitle": ind.services_subtitle, "source": "all", "limit": 6},
        "service_carousel": {"title": ind.services_title, "source": "all", "limit": 10},
        "faq": {"title": "Questions, answered", "items": [{"q": "How do I book or order?", "a": "Tap the WhatsApp button or use the booking form and we will confirm quickly."}]},
        "video": {"title": "See us in action"},
        "booking_cta": {"title": ind.booking_title, "body": ind.booking_subtitle, "button_text": "Book now"},
        "whatsapp_cta": {"title": "Hungry? Let's get your order started." if b.industry == "restaurant" else "Prefer WhatsApp?",
                         "body": "Whether you're dining in, picking up or ordering for delivery, we're just a message away on WhatsApp." if b.industry == "restaurant" else "Message us and get a quick reply.",
                         "button_text": "Order on WhatsApp →" if b.industry == "restaurant" else "Chat on WhatsApp", "message": f"Hi {b.name}, "},
        "newsletter": {"title": "Stay in the loop", "body": "Leave your number or email and we'll tell you about offers.", "button_text": "Keep me updated"},
        "opening_hours": {"title": "Opening hours"},
        "map": {"title": "Find us on the map"},
        "social_links": {"title": "Follow us"},
        "custom_button": {"label": "Chat on WhatsApp", "action": "whatsapp"},
        "custom_html": {"html": "", "height": 320},
    }.get(stype, {})
    return {**sections.defaults(stype), **base}


def get_website(db: Session, business_id) -> Website | None:
    return db.scalars(select(Website).where(Website.business_id == business_id)).first()


def touch_draft(site: Website) -> None:
    site.has_unpublished_changes = True


def home_page(db: Session, site: Website) -> WebsitePage:
    pg = db.scalars(select(WebsitePage).where(WebsitePage.website_id == site.id, WebsitePage.is_home.is_(True))).first()
    if pg is None:  # sites created before pages existed
        pg = WebsitePage(business_id=site.business_id, website_id=site.id, slug="home", title="Home", is_home=True, position=0)
        db.add(pg)
        db.flush()
        for s in site.sections:
            if s.page_id is None:
                s.page_id = pg.id
    return pg


def pages_of(db: Session, site: Website) -> list[WebsitePage]:
    home_page(db, site)
    return list(db.scalars(select(WebsitePage).where(WebsitePage.website_id == site.id).order_by(WebsitePage.is_home.desc(), WebsitePage.position, WebsitePage.created_at)))


def get_page(db: Session, site: Website, page_id=None) -> WebsitePage:
    if page_id is None:
        return home_page(db, site)
    pg = db.scalars(select(WebsitePage).where(WebsitePage.id == page_id, WebsitePage.website_id == site.id)).first()
    if pg is None:
        raise not_found("Page")
    return pg


def page_sections(site: Website, page_id) -> list[WebsiteSection]:
    return sorted((s for s in site.sections if s.page_id == page_id), key=lambda x: x.position)


def _find(site: Website, section_id) -> WebsiteSection:
    sec = next((s for s in site.sections if str(s.id) == str(section_id)), None)
    if sec is None:
        raise not_found("Section")
    return sec


def _reindex(site: Website, page_id) -> None:
    for i, s in enumerate(page_sections(site, page_id)):
        s.position = i


def add_section(db: Session, site: Website, business: Business, stype: str, *, after_id=None, page_id=None, settings: dict | None = None) -> WebsiteSection:
    if stype not in sections.REGISTRY:
        raise bad_request("Unknown section type")
    page = get_page(db, site, page_id)
    mine = page_sections(site, page.id)
    if len(mine) >= MAX_SECTIONS:
        raise bad_request(f"A page can have up to {MAX_SECTIONS} sections")
    content = {**default_section_content(stype, business), **sections.clean_settings(stype, settings or {})}
    pos = len(mine)
    if after_id:
        anchor = _find(site, after_id)
        if anchor.page_id != page.id:
            raise not_found("Section")
        pos = anchor.position + 1
    for s in mine:
        if s.position >= pos:
            s.position += 1
    sec = WebsiteSection(business_id=business.id, website_id=site.id, page_id=page.id, type=stype, position=pos, enabled=True, content=content, styles={})
    db.add(sec)
    db.flush()
    db.refresh(site)
    _reindex(site, page.id)
    touch_draft(site)
    db.flush()
    return sec


def update_section(db: Session, site: Website, section_id, *, content: dict | None, styles: dict | None, enabled: bool | None) -> WebsiteSection:
    sec = _find(site, section_id)
    if content is not None:
        sec.content = {**(sec.content or {}), **sections.clean_settings(sec.type, content)}
    if styles is not None:
        merged = {**(sec.styles or {}), **sections.clean_styles(styles)}
        sec.styles = {k: v for k, v in merged.items() if v is not None}
    if enabled is not None:
        sec.enabled = enabled
    touch_draft(site)
    db.flush()
    return sec


def delete_section(db: Session, site: Website, section_id) -> None:
    sec = _find(site, section_id)
    pid = sec.page_id
    db.delete(sec)
    db.flush()
    db.refresh(site)
    _reindex(site, pid)
    touch_draft(site)
    db.flush()


def duplicate_section(db: Session, site: Website, section_id) -> WebsiteSection:
    src = _find(site, section_id)
    if len(page_sections(site, src.page_id)) >= MAX_SECTIONS:
        raise bad_request(f"A page can have up to {MAX_SECTIONS} sections")
    for s in page_sections(site, src.page_id):
        if s.position > src.position:
            s.position += 1
    sec = WebsiteSection(business_id=src.business_id, website_id=site.id, page_id=src.page_id, type=src.type, position=src.position + 1, enabled=src.enabled,
                         content=copy.deepcopy(src.content or {}), styles=dict(src.styles or {}))
    db.add(sec)
    db.flush()
    db.refresh(site)
    _reindex(site, src.page_id)
    touch_draft(site)
    db.flush()
    return sec


def reorder_sections(db: Session, site: Website, order: list[str], page_id=None) -> None:
    page = get_page(db, site, page_id)
    by_id = {str(s.id): s for s in page_sections(site, page.id)}
    if sorted(order) != sorted(by_id):
        raise bad_request("Order must include every section of the page exactly once")
    for i, sid in enumerate(order):
        by_id[sid].position = i
    touch_draft(site)
    db.flush()
    db.expire(site, ["sections"])


# ---------------------------------------------------------------- pages
RESERVED_PAGE_SLUGS = {"home", "products", "services", "categories", "search", "checkout", "cart", "order", "orders", "bookings", "review", "p", "sitemap.xml", "robots.txt"}
MAX_PAGES = 20
PAGE_TEMPLATES = {
    "blank": [],
    "about": ["text", "image_text", "specialists", "whatsapp_cta"],
    "contact": ["contact", "opening_hours", "map", "social_links"],
    "faq": ["faq", "whatsapp_cta"],
    "policies": ["rich_text"],
}


def page_slug(db: Session, site: Website, title: str, exclude_id=None) -> str:
    from app.services.catalog import slugify
    base = slugify(title, "page")
    if base in RESERVED_PAGE_SLUGS:
        base = f"{base}-page"
    slug, n = base, 2
    while True:
        q = select(WebsitePage.id).where(WebsitePage.website_id == site.id, WebsitePage.slug == slug)
        if exclude_id:
            q = q.where(WebsitePage.id != exclude_id)
        if not db.scalar(q):
            return slug
        slug, n = f"{base}-{n}", n + 1


def create_page(db: Session, site: Website, business: Business, title: str, template: str = "blank") -> WebsitePage:
    title = title.strip()[:120]
    if not title:
        raise bad_request("Give the page a name")
    if template not in PAGE_TEMPLATES:
        raise bad_request("Unknown page starter")
    from app.services.plans import check_limit
    if len(pages_of(db, site)) >= MAX_PAGES:
        raise bad_request(f"You can have up to {MAX_PAGES} pages")
    check_limit(db, business, "pages", len(pages_of(db, site)))
    pg = WebsitePage(business_id=business.id, website_id=site.id, slug=page_slug(db, site, title), title=title, position=len(pages_of(db, site)))
    db.add(pg)
    db.flush()
    seed = ["text"] if template == "blank" else PAGE_TEMPLATES[template]
    for i, t in enumerate(seed):
        content = default_section_content(t, business)
        if template == "blank" and t == "text":
            content = {"title": title, "body": "Write something here."}
        if template == "about" and t == "text":
            content = {"title": f"About {business.name}", "body": business.description or "Tell your story here."}
        if template == "contact" and t == "contact":
            content = {**content, "title": "Contact us"}
        if template == "policies" and t == "rich_text":
            content = {"title": title, "body": "## Delivery\nAdd your delivery times.\n\n## Returns\nAdd your return policy."}
        db.add(WebsiteSection(business_id=business.id, website_id=site.id, page_id=pg.id, type=t, position=i, enabled=True, content=content, styles={}))
    touch_draft(site)
    db.flush()
    db.refresh(site)
    return pg


def update_page(db: Session, site: Website, page_id, *, title=None, slug=None, enabled=None, seo_title=None, seo_description=None, fields: set | None = None) -> WebsitePage:
    pg = get_page(db, site, page_id)
    fields = fields or set()
    if title is not None:
        if not title.strip():
            raise bad_request("Give the page a name")
        pg.title = title.strip()[:120]
    if slug is not None and not pg.is_home:
        new = page_slug(db, site, slug, exclude_id=pg.id)
        pg.slug = new
    if enabled is not None:
        if pg.is_home and not enabled:
            raise bad_request("The home page can't be hidden")
        pg.enabled = enabled
    if "seo_title" in fields:
        pg.seo_title = (seo_title or "").strip()[:200] or None
    if "seo_description" in fields:
        pg.seo_description = (seo_description or "").strip()[:320] or None
    touch_draft(site)
    db.flush()
    return pg


def delete_page(db: Session, site: Website, page_id) -> None:
    pg = get_page(db, site, page_id)
    if pg.is_home:
        raise bad_request("The home page can't be deleted")
    for s in list(site.sections):
        if s.page_id == pg.id:
            db.delete(s)
    db.delete(pg)
    site.navigation = _strip_nav(site.navigation or [], str(pg.id))
    touch_draft(site)
    db.flush()
    db.refresh(site)


# ---------------------------------------------------------------- navigation (menu)
NAV_TYPES = ("page", "products", "services", "category", "collection", "booking", "contact", "search", "url")
MAX_NAV = 12


def _strip_nav(items: list, ref: str) -> list:
    out = []
    for it in items:
        if it.get("ref") == ref:
            continue
        out.append({**it, "children": _strip_nav(it.get("children") or [], ref)})
    return out


def clean_navigation(db: Session, site: Website, items: list, depth: int = 0) -> list:
    if not isinstance(items, list):
        raise bad_request("Menu must be a list")
    if len(items) > MAX_NAV:
        raise bad_request(f"A menu level can have up to {MAX_NAV} links")
    page_ids = {str(p.id) for p in pages_of(db, site)}
    cat_ids = {str(c) for c in db.scalars(select(ServiceCategory.id).where(ServiceCategory.business_id == site.business_id))}
    from app.models import Collection
    coll_ids = {str(c) for c in db.scalars(select(Collection.id).where(Collection.business_id == site.business_id))}
    out = []
    for it in items:
        if not isinstance(it, dict):
            raise bad_request("Invalid menu link")
        t = it.get("type")
        if t not in NAV_TYPES:
            raise bad_request("Unknown menu link type")
        label = str(it.get("label") or "").strip()[:40]
        if not label:
            raise bad_request("Every menu link needs a name")
        ref, url = it.get("ref"), None
        if t == "page" and str(ref) not in page_ids:
            raise bad_request("That page doesn't exist")
        if t == "category" and str(ref) not in cat_ids:
            raise bad_request("That category doesn't exist")
        if t == "collection" and str(ref) not in coll_ids:
            raise bad_request("That collection doesn't exist")
        if t == "url":
            url = sections._clean_url(it.get("url"), 300)
            if not url:
                raise bad_request("Enter a link address")
        if t not in ("page", "category", "collection"):
            ref = None
        out.append({"id": str(it.get("id") or uuid.uuid4()), "label": label, "type": t, "ref": str(ref) if ref else None, "url": url,
                    "children": clean_navigation(db, site, it.get("children") or [], depth + 1) if depth < 1 else []})
    return out


def default_navigation(pages: list) -> list[dict]:
    """The menu shown until the owner customises it: Home, Shop, Services, their extra pages, Book, Contact."""
    home = next((p for p in pages if p.is_home), None)
    items = [{"label": "Home", "type": "page", "ref": str(home.id)}] if home else []
    items += [{"label": "Shop", "type": "products"}, {"label": "Services", "type": "services"}]
    items += [{"label": p.title, "type": "page", "ref": str(p.id)} for p in pages if not p.is_home]
    items += [{"label": "Book", "type": "booking"}, {"label": "Contact", "type": "contact"}]
    return items


def set_navigation(db: Session, site: Website, items: list) -> list:
    site.navigation = clean_navigation(db, site, items)
    touch_draft(site)
    db.flush()
    return site.navigation


# ---------------------------------------------------------------- automatic composition
def compose_types(db: Session, business: Business, base: list[str]) -> list[str]:
    """Turn a preset's section order into the storefront that fits this business's actual data.

    Not a template: the result depends on what the business has (products, categories, staff, photos…) and can be
    edited freely afterwards.
    """
    from app.models import Service
    ind = get_industry(business.industry)
    has_products = bool(db.scalar(select(func.count()).select_from(Product).where(Product.business_id == business.id, Product.deleted_at.is_(None))))
    has_services = bool(db.scalar(select(func.count()).select_from(Service).where(Service.business_id == business.id, Service.deleted_at.is_(None))))
    sells_products = ind.key in ("retail", "restaurant") or has_products
    out: list[str] = []
    seen = set()

    def add(item: str):
        if item not in seen:
            seen.add(item)
            out.append(item)

    for t in base:
        if t == "services" and sells_products and ind.key != "restaurant":
            # Retail ecommerce storefronts lead with categories, product grid, new arrivals carousel, and trust guarantees
            add("category_grid")
            add("product_grid")
            add("product_carousel")
            add("why_us")
            continue
        if (t in ("booking", "booking_cta")) and sells_products:
            # Do not inject salon/restaurant booking forms into retail/food ordering storefronts
            continue
        if t == "opening_hours" and sells_products:
            # Don't clutter storefront with opening hours cards
            continue
        if t == "contact" and "whatsapp_cta" not in base:
            add("whatsapp_cta")
        add(t)
    return out


def generate_sections(db: Session, site: Website, business: Business, base: list[str]) -> None:
    home = home_page(db, site)
    for i, stype in enumerate(compose_types(db, business, base)):
        db.add(WebsiteSection(business_id=business.id, website_id=site.id, page_id=home.id, type=stype, position=i, enabled=True,
                              content=default_section_content(stype, business), styles={}))
    db.flush()


def regenerate(db: Session, site: Website, business: Business) -> Website:
    """Replace the home page's sections with a fresh composition from the current business data (other pages are left alone)."""
    home = home_page(db, site)
    for s in list(site.sections):
        if s.page_id == home.id:
            db.delete(s)
    db.flush()
    db.refresh(site)
    generate_sections(db, site, business, list(site.template.default_sections))
    touch_draft(site)
    db.flush()
    db.refresh(site)
    return site


def change_template(db: Session, site: Website, business: Business, template_key: str) -> Website:
    """Switching a style preset changes colours, fonts and header/hero look. It never touches the owner's sections."""
    tpl = db.scalars(select(Template).where(Template.key == template_key, Template.is_active.is_(True))).first()
    if tpl is None:
        raise bad_request("Unknown style")
    site.template_id = tpl.id
    site.template = tpl
    touch_draft(site)
    db.flush()
    db.refresh(site)
    return site


def publish(db: Session, site: Website) -> Website:
    for s in site.sections:
        s.published_content = copy.deepcopy(s.content or {})
        s.published_styles = dict(s.styles or {})
        s.published_enabled = s.enabled
    for pg in pages_of(db, site):
        pg.published = {"slug": pg.slug, "title": pg.title, "enabled": pg.enabled, "seo_title": pg.seo_title, "seo_description": pg.seo_description}
    site.published_style = {"theme_overrides": dict(site.theme_overrides or {}), "settings": dict(site.settings or {}), "navigation": copy.deepcopy(site.navigation or [])}
    site.status = "PUBLISHED"
    site.published_at = datetime.now(timezone.utc)
    site.has_unpublished_changes = False
    db.flush()
    return site


def unpublish(db: Session, site: Website) -> Website:
    site.status = "UNPUBLISHED"
    db.flush()
    return site


# ---------------------------------------------------------------- style & settings
import re as _re

FONTS = {
    "Fraunces": "'Fraunces', Georgia, serif", "Playfair Display": "'Playfair Display', Georgia, serif", "DM Serif Display": "'DM Serif Display', Georgia, serif",
    "DM Sans": "'DM Sans', system-ui, sans-serif", "Manrope": "'Manrope', system-ui, sans-serif", "Inter": "'Inter', system-ui, sans-serif", "Poppins": "'Poppins', system-ui, sans-serif",
    "Space Grotesk": "'Space Grotesk', system-ui, sans-serif", "Outfit": "'Outfit', system-ui, sans-serif",
}
HERO_LAYOUTS = ("split", "centered", "overlay")
RADII = {"square": "2px", "soft": "10px", "round": "18px", "pill": "28px"}
_HEX = _re.compile(r"^#[0-9A-Fa-f]{6}$")


def clean_theme(data: dict) -> dict:
    out: dict = {}
    for k in ("accent", "bg", "ink", "surface"):
        if k in data:
            v = data[k]
            if v in (None, ""):
                out[k] = None
            elif isinstance(v, str) and _HEX.match(v):
                out[k] = v.upper()
            else:
                raise bad_request(f"{k}: enter a colour like #5B3CF5")
    for k in ("font_display", "font_body"):
        if k in data:
            if data[k] in (None, ""):
                out[k] = None
            elif data[k] in FONTS:
                out[k] = data[k]
            else:
                raise bad_request("Unknown font")
    if "hero" in data:
        if data["hero"] in (None, ""):
            out["hero"] = None
        elif data["hero"] in HERO_LAYOUTS:
            out["hero"] = data["hero"]
        else:
            raise bad_request("Unknown hero layout")
    if "radius" in data:
        if data["radius"] in (None, ""):
            out["radius"] = None
        elif data["radius"] in RADII:
            out["radius"] = data["radius"]
        else:
            raise bad_request("Unknown corner style")
    return out


def clean_settings(data: dict) -> dict:
    out: dict = {}
    for k in ("whatsapp_float", "cart_enabled", "show_prices", "show_prices_currency"):
        if k in data:
            if not isinstance(data[k], bool):
                raise bad_request(f"{k} must be true or false")
            out[k] = data[k]
    for k, limit in (("announcement", 160), ("order_intro", 300), ("order_button_label", 40), ("promo_note", 120)):
        if k in data:
            v = data[k]
            if v is not None and not isinstance(v, str):
                raise bad_request(f"{k} must be text")
            out[k] = (v or "").strip()[:limit]
    return out


def update_style(db: Session, site: Website, *, theme: dict | None, settings: dict | None) -> Website:
    if theme is not None:
        merged = {**(site.theme_overrides or {}), **clean_theme(theme)}
        site.theme_overrides = {k: v for k, v in merged.items() if v is not None}
    if settings is not None:
        site.settings = {**(site.settings or {}), **clean_settings(settings)}
    touch_draft(site)
    db.flush()
    return site
