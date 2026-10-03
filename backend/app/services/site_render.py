"""Renders public business pages from business data. Server-rendered Jinja => fast, SEO-friendly, no dashboard JS."""
import json
from decimal import Decimal
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.countries import get_country
from app.models import Business, GalleryImage, Product, Review, Service, ServiceCategory, Staff, Testimonial, Website
from app.services.business import business_urls, whatsapp_link
from app.services.industries import get_industry
from app.services.hours import hours_display, is_open_now, schema_org_hours
from app.services.plans import has_feature
from app.services.reviews import rating_summary
from app.services import sections as sec_engine
from app.services import store as store_cfg
from app.services.website import FONTS, RADII

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "public" / "templates"
_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR), autoescape=select_autoescape(["html"]), trim_blocks=True,
                   lstrip_blocks=True)

SYMBOLS = {"KES": "KSh", "USD": "$", "ZAR": "R", "NGN": "₦", "TZS": "TSh", "UGX": "USh", "RWF": "RF", "ETB": "Br"}


def money(amount, currency: str = "KES") -> str:
    d = Decimal(str(amount))
    sym = SYMBOLS.get(currency, currency)
    text = f"{d:,.0f}" if d == d.to_integral_value() else f"{d:,.2f}"
    return f"{sym} {text}" if len(sym) > 1 else f"{sym}{text}"


_env.filters["money"] = money
_env.filters["stars"] = lambda n: "★" * int(round(n or 0)) + "☆" * (5 - int(round(n or 0)))


def render(name: str, **ctx) -> str:
    return _env.get_template(name).render(**ctx)


def _safe_json(data: dict) -> str:
    """JSON for a <script type=ld+json> block: neutralise sequences that could close the tag or start markup."""
    return json.dumps(data).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def _contrast_ink(hex_color: str) -> str:
    r, g, b = (int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5))
    lum = 0.2126 * r ** 2.2 + 0.7152 * g ** 2.2 + 0.0722 * b ** 2.2
    return "#0F0F0F" if lum > 0.42 else "#FFFFFF"


def _fonts_url(names: list[str]) -> str:
    fam = "&".join(f"family={n.replace(' ', '+')}:wght@400;500;600;700;800" for n in names)
    return f"https://fonts.googleapis.com/css2?{fam}&display=swap"


def _seo(business: Business, website: Website | None, urls: dict, summary: dict, services: list[Service],
         image: str | None, published: bool) -> dict:
    title = (website.seo_title if website and website.seo_title else None) or \
        f"{business.name} — {business.category}{' in ' + business.city if business.city else ''}"
    desc = (website.seo_description if website and website.seo_description else None) or \
        (business.description[:155] if business.description else f"{business.name}, {business.category}. Book online or message on WhatsApp.")
    base = get_settings().public_base_url.rstrip("/")
    ld = {
        "@context": "https://schema.org",
        "@type": get_industry(business.industry).schema_type,
        "name": business.name, "description": desc, "url": urls["profile"],
        "telephone": business.phone, "email": business.email,
        "image": [base + image] if image and image.startswith("/") else ([image] if image else None),
        "address": {"@type": "PostalAddress", "streetAddress": business.address, "addressLocality": business.city,
                    "addressCountry": business.country_code},
        "openingHoursSpecification": schema_org_hours(business.opening_hours or {}),
        "priceRange": None,
        "sameAs": [v for v in (business.social_links or {}).values() if v],
        "makesOffer": [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": s.name},
                        "price": str(s.price), "priceCurrency": s.currency} for s in services[:20]],
    }
    if business.latitude is not None and business.longitude is not None:
        ld["geo"] = {"@type": "GeoCoordinates", "latitude": float(business.latitude), "longitude": float(business.longitude)}
    if summary["count"]:
        ld["aggregateRating"] = {"@type": "AggregateRating", "ratingValue": summary["average"], "reviewCount": summary["count"]}
    ld = {k: v for k, v in ld.items() if v not in (None, "", [], {})}
    if website is not None and website.og_image:
        image = website.og_image
    elif not image:
        image = business.logo_url
    return {"title": title[:70], "description": desc, "canonical": urls["profile"], "og_image": (base + image) if image and image.startswith("/") else image,
            "robots": "index,follow" if published else "noindex,nofollow", "jsonld": _safe_json(ld)}


def _page_seo(seo: dict, page_info: dict | None, business: Business, urls: dict) -> dict:
    if not page_info:
        return seo
    title = page_info["seo_title"] or f"{page_info['title']} — {business.name}"
    return {**seo, "title": title[:70], "description": page_info["seo_description"] or seo["description"], "canonical": f"{urls['profile']}/p/{page_info['slug']}"}


def _faq_seo(seo: dict, faq: list) -> dict:
    if faq:
        seo = {**seo, "jsonld_extra": _safe_json({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": faq[:30]})}
    return seo


def resolve_nav(site, pages: list, categories: list, *, root: str, collections: list | None = None, draft: bool, has_products: bool, has_services: bool, bookings_on: bool) -> list[dict]:
    """Turn the stored menu into links for this page. Links to things that don't exist or aren't live are dropped."""
    if site is None:
        return []
    live = {str(p.id): p for p in pages if p.enabled and (draft or (p.published or {}).get("enabled"))}
    cats = {str(c.id): c for c in categories if c.is_visible and c.slug}
    colls = {str(c.id): c for c in (collections or []) if c.is_visible}
    items = (site.navigation if draft else (site.published_style or {}).get("navigation", site.navigation)) or None
    if items is None:
        from app.services.website import default_navigation
        items = default_navigation(pages)

    def href(it: dict) -> str | None:
        t = it.get("type")
        if t == "page":
            p = live.get(str(it.get("ref")))
            return None if p is None else ((root or "/") if p.is_home else f"{root}/p/{p.slug}")
        if t == "products":
            return f"{root}/products" if has_products else None
        if t == "services":
            return f"{root}/services" if has_services else None
        if t == "category":
            c = cats.get(str(it.get("ref")))
            return f"{root}/categories/{c.slug}" if c else None
        if t == "collection":
            c = colls.get(str(it.get("ref")))
            return f"{root}/collections/{c.slug}" if c else None
        if t == "booking":
            return f"{root}/bookings" if (bookings_on and has_services) else None
        if t == "contact":
            return f"{root}/#contact"
        if t == "search":
            return f"{root}/search"
        if t == "url":
            return it.get("url")
        return None

    out = []
    for it in items:
        kids = [{"label": c["label"], "href": h} for c in (it.get("children") or []) if (h := href(c))]
        h = href(it)
        if h or kids:
            out.append({"label": it["label"], "href": h or (kids[0]["href"] if kids else "#"), "children": kids})
    return out


def build_context(db: Session, business: Business, *, draft: bool = False, force_profile: bool = False, editing: bool = False, page=None, root: str | None = None) -> dict:
    site: Website | None = business.website
    root = f"/{business.slug}" if root is None else root
    can_site = has_feature(db, business, "website") and site is not None
    published = bool(site and site.status == "PUBLISHED")
    use_site = can_site and not force_profile and (published or draft)

    services = list(db.scalars(select(Service).where(Service.business_id == business.id, Service.deleted_at.is_(None),
                                                      Service.is_active.is_(True)).order_by(Service.position, Service.created_at)))
    gallery = list(db.scalars(select(GalleryImage).where(GalleryImage.business_id == business.id).order_by(GalleryImage.position, GalleryImage.created_at)))
    reviews = list(db.scalars(select(Review).where(Review.business_id == business.id, Review.deleted_at.is_(None), Review.is_published.is_(True))
                              .order_by(Review.created_at.desc()).limit(6)))
    testimonials = list(db.scalars(select(Testimonial).where(Testimonial.business_id == business.id).order_by(Testimonial.position)))
    summary = rating_summary(db, business.id)
    urls = business_urls(business)
    bookings_on = has_feature(db, business, "bookings")

    products = list(db.scalars(select(Product).where(Product.business_id == business.id, Product.deleted_at.is_(None), Product.status == "ACTIVE")
                               .order_by(Product.position, Product.created_at.desc())))
    raw_sections: list[dict] = []
    theme: dict = {}
    pages: list = []
    cur_page = None
    if use_site and site is not None:
        from app.services.website import home_page, page_sections, pages_of
        pages = pages_of(db, site)
        cur_page = page or home_page(db, site)
        theme = dict(site.template.theme or {})
        for s in page_sections(site, cur_page.id):
            if not draft and s.published_enabled is None:
                continue  # added after the last publish: not live yet
            enabled = s.enabled if draft else s.published_enabled
            content = s.content if draft else (s.published_content if s.published_content is not None else s.content)
            styles = s.styles if draft else (s.published_styles if s.published_styles is not None else s.styles)
            if enabled:
                raw_sections.append({"id": str(s.id), "type": s.type, "content": content or {}, "styles": styles or {}})
    hero_image = None
    for s in raw_sections:
        if s["type"] == "hero":
            hero_image = s["content"].get("image_url")
    if not hero_image and gallery:
        hero_image = gallery[0].url
    style = (site.theme_overrides if draft else (site.published_style or {}).get("theme_overrides", site.theme_overrides)) if site else {}
    settings = (site.settings if draft else (site.published_style or {}).get("settings", site.settings)) if site else {}
    style, settings = style or {}, settings or {}
    if not style.get("accent") and business.primary_color and business.primary_color not in ("#0F0F0F",) and theme:
        theme["accent"] = business.primary_color  # owner brand colour wins over template accent
    for k in ("accent", "bg", "ink", "surface"):
        if style.get(k):
            theme[k] = style[k]
    if style.get("accent"):
        theme["accent_ink"] = _contrast_ink(style["accent"])
    if style.get("font_display"):
        theme["font_display"] = FONTS[style["font_display"]]
    if style.get("font_body"):
        theme["font_body"] = FONTS[style["font_body"]]
    if style.get("hero"):
        theme["hero"] = style["hero"]
    if style.get("radius"):
        theme["radius"] = RADII[style["radius"]]
    fonts_used = sorted({n for n, css in FONTS.items() if css in (theme.get("font_display"), theme.get("font_body"))} | {"Manrope"})
    layout = theme.get("layout", "classic")
    theme.setdefault("bg", "#FFFFFF"); theme.setdefault("ink", "#111111"); theme.setdefault("accent", "#111111")
    theme.setdefault("accent_ink", "#FFFFFF"); theme.setdefault("muted", "#666666"); theme.setdefault("surface", "#FFFFFF")
    theme.setdefault("border", "#E5E5E5"); theme.setdefault("radius", "12px"); theme.setdefault("hero", "centered")
    theme.setdefault("font_display", "'Manrope', system-ui, sans-serif"); theme.setdefault("font_body", "'Manrope', system-ui, sans-serif")

    staff = list(db.scalars(select(Staff).where(Staff.business_id == business.id, Staff.deleted_at.is_(None), Staff.is_active.is_(True)).order_by(Staff.created_at)))
    categories = list(db.scalars(select(ServiceCategory).where(ServiceCategory.business_id == business.id).order_by(ServiceCategory.position)))
    cat_names = {c.id: c.name for c in categories}
    for sv in services:  # per-product display helpers
        sv.category_name = cat_names.get(sv.category_id, "")
    photos = [g.thumb_url or g.url for g in gallery]
    product_images = {str(sv.id): (sv.image_url or (photos[i % len(photos)] if photos else None)) for i, sv in enumerate(services)}
    cart_default = get_industry(business.industry).key in ("retail", "restaurant") or layout in ("boutique", "nova", "catalog", "shopapp") or bool(products)
    settings.setdefault("cart_enabled", cart_default)
    settings.setdefault("whatsapp_float", True)
    settings.setdefault("show_prices", True)
    wa_services = {str(s.id): whatsapp_link(business, s.name) for s in services}
    map_q = f"{business.name} {business.address} {business.city}".strip()
    from urllib.parse import quote
    if business.latitude is not None and business.longitude is not None:
        directions = f"https://www.google.com/maps/dir/?api=1&destination={business.latitude},{business.longitude}"
    else:
        directions = f"https://www.google.com/maps/search/?api=1&query={quote(map_q)}"

    hours = hours_display(business.opening_hours or {})
    from app.services.section_data import resolve_sections
    from app.models import ProductVariant
    from sqlalchemy import func as _f
    variant_pids = {pid: int(tot or 0) for pid, tot in db.execute(select(ProductVariant.product_id, _f.sum(ProductVariant.stock_qty)).where(ProductVariant.business_id == business.id, ProductVariant.is_active.is_(True)).group_by(ProductVariant.product_id))}

    def resolve(raw, as_draft=draft):
        return resolve_sections(raw, db=db, business=business, products=products, services=services, product_images=product_images, categories=categories,
                                gallery=gallery, reviews=reviews, testimonials=testimonials, staff=staff, hours=hours, bookings_on=bookings_on,
                                leads_on=has_feature(db, business, "leads"), wa=whatsapp_link(business), wa_services=wa_services, draft=as_draft, summary=summary, root=root, variant_pids=variant_pids)
    sections = resolve(raw_sections)

    def act(action: str | None = "auto", url: str | None = None) -> dict:
        """Where a button goes. 'auto' picks the best action this business actually has."""
        wa_link = whatsapp_link(business)
        a = action or "auto"
        if a == "auto":
            a = "book" if bookings_on else ("whatsapp" if wa_link else "contact")
        if a == "book" and not bookings_on:
            a = "whatsapp" if wa_link else "contact"
        if a == "whatsapp":
            return {"href": wa_link or "#contact", "track": "WHATSAPP_CLICK" if wa_link else None, "ext": bool(wa_link)}
        if a == "call" and business.phone:
            return {"href": f"tel:{business.phone}", "track": "PHONE_CLICK", "ext": False}
        if a == "url" and url:
            return {"href": url, "track": None, "ext": url.startswith("http")}
        return {"href": {"book": "#booking", "shop": "#shop", "services": "#services"}.get(a, "#contact"), "track": None, "ext": False}

    from app.services.plans import has_feature as _hf
    st = settings or {}
    live = not draft and not editing
    tracking = {"ga4": st.get("ga4_id"), "meta": st.get("meta_pixel_id")} if (live and use_site and _hf(db, business, "tracking") and (st.get("ga4_id") or st.get("meta_pixel_id"))) else None
    show_branding = not (st.get("hide_branding") and _hf(db, business, "remove_branding"))
    faq = [{"@type": "Question", "name": i["q"], "acceptedAnswer": {"@type": "Answer", "text": i["a"]}} for sc in sections if sc["type"] == "faq" and not sc["empty"] for i in (sc["content"].get("items") or []) if i.get("q") and i.get("a")]
    from app.models import Collection as _Col
    nav = resolve_nav(site if use_site else None, pages, categories, collections=list(db.scalars(select(_Col).where(_Col.business_id == business.id))), root=root, draft=draft, has_products=bool(products), has_services=bool(services), bookings_on=bookings_on)
    page_info = None
    if cur_page is not None and not cur_page.is_home:
        pub = cur_page.published or {}
        page_info = {"title": (cur_page.title if draft else pub.get("title") or cur_page.title), "slug": cur_page.slug, "seo_title": cur_page.seo_title if draft else pub.get("seo_title"),
                     "seo_description": cur_page.seo_description if draft else pub.get("seo_description")}
    return dict(
        act=act, products=products, editing=editing, _resolve=resolve, root=root, nav=nav, tracking=tracking, show_branding=show_branding, google_review_url=(business.integrations or {}).get("google_review_url"), page=page_info, home_href=root or "/", search_on=True,
        business=business, website=site, use_site=use_site, sections=sections, theme=theme, services=services,
        gallery=gallery, staff=staff, categories=categories, product_images=product_images, reviews=reviews, testimonials=testimonials, summary=summary, urls=urls,
        wa=whatsapp_link(business), wa_services=wa_services, bookings_on=bookings_on, leads_on=has_feature(db, business, "leads"), directions=directions,
        hours=hours, open_now=is_open_now(business.opening_hours or {}, business.timezone) if business.opening_hours else None,
        seo=_faq_seo(_page_seo(_seo(business, site if use_site else None, urls, summary, services, hero_image, (published or not use_site) and not draft), page_info, business, urls), faq),
        hero_image=hero_image, draft=draft, country=get_country(business.country_code),
        free_over=(store_cfg.get(business)["delivery"] or {}).get("free_over"), logo=business.logo_url, layout=layout, settings=settings, cur_symbol=SYMBOLS.get(business.currency, business.currency), fonts_url=_fonts_url(fonts_used), year=__import__("datetime").date.today().year,
    )


def render_business(db: Session, business: Business, *, draft: bool = False, force_profile: bool = False, editing: bool = False, page=None, root: str | None = None) -> str:
    ctx = build_context(db, business, draft=draft, force_profile=force_profile, editing=editing, page=page, root=root)
    return render("site.html" if ctx["use_site"] else "profile.html", **ctx)


def template_preview_context(db: Session, business: Business, tpl) -> dict:
    """Render a demo business in an arbitrary template (used by the template showcase and the editor's design tab)."""
    from app.services.website import default_section_content
    ctx = build_context(db, business, draft=True)
    ctx["draft"], ctx["no_track"] = False, True
    theme = {**ctx["theme"], **tpl.theme}
    layout = tpl.theme.get("layout", "classic")
    theme["layout"] = layout
    ctx.update(theme=theme, layout=layout, fonts_url=_fonts_url(sorted({n for n, css in FONTS.items() if css in (theme.get("font_display"), theme.get("font_body"))} | {"Manrope"})))
    existing = {sec["type"]: sec["content"] for sec in ctx["sections"]}
    from app.services.website import compose_types
    raw = [{"id": f"preview-{i}", "type": t, "content": existing.get(t) or default_section_content(t, business), "styles": {}}
           for i, t in enumerate(compose_types(db, business, list(tpl.default_sections)))]
    ctx["sections"] = ctx["_resolve"](raw, as_draft=False)
    st = dict(ctx["settings"])
    st["cart_enabled"] = layout in ("boutique", "nova", "catalog", "shopapp") or business.industry in ("retail", "restaurant") or bool(ctx["products"])
    ctx["settings"] = st
    ctx["seo"] = {**ctx["seo"], "robots": "noindex,nofollow", "title": f"{tpl.name} template — Aqivo.shop"}
    return ctx
