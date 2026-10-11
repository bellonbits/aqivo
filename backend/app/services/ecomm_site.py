"""Renders a business storefront through one of the static ecomm templates (public/ecomm_templates/<key>/).

The template's HTML/CSS/JS is served as-is; we inject the business's real catalogue/services/hours as
`window.__BZ` plus `_bridge.js`, which swaps the template's demo data for it and wires cart -> /checkout and
bookings -> the public bookings API."""
import html as _html
import json
import re
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Business, ProductVariant
from app.services.plans import has_feature

TEMPLATES_ROOT = Path(__file__).resolve().parent.parent / "public" / "ecomm_templates"
URL_BASE = "/ecomm-templates"

# demo brand names baked into each template's static HTML
# Order matters: longer / more-specific patterns must come first so they are replaced before shorter substrings
DEMO_BRANDS = {
    "twosidesboutique": ["Two Sides Boutique", "Two Sides"],
    "mavunofresh": ["Mavuno Fresh", "Mavuno"],
    "brewandbites": ["Brew & Bites", "Brew \u0026 Bites", "Brew and Bites", "Brew &amp; Bites"],
    "zuribeauty": ["Zuri Beauty Studio", "Zuri Beauty"],
}


def is_ecomm(key: str | None) -> bool:
    return bool(key) and key in DEMO_BRANDS and (TEMPLATES_ROOT / key / "index.html").is_file()


def _f(v) -> float | None:
    return float(v) if v is not None else None


def build_data(db: Session, ctx: dict, business: Business) -> dict:
    root = ctx["root"]
    cat_names = {str(c.id): c.name for c in ctx["categories"]}
    images = ctx["product_images"]
    items: list[dict] = []
    products = ctx["products"]
    if products:
        variants: dict = {}
        for v in db.scalars(select(ProductVariant).where(ProductVariant.business_id == business.id, ProductVariant.is_active.is_(True)).order_by(ProductVariant.position)):
            variants.setdefault(str(v.product_id), []).append({"id": str(v.id), "title": v.title, "price": _f(v.price)})
        for p in products[:200]:
            imgs = [u for u in (p.images or []) if u]
            items.append({"id": str(p.id), "kind": "product", "name": p.name, "price": _f(p.price) or 0, "compare": _f(p.compare_at_price),
                          "image": imgs[0] if imgs else None, "images": imgs, "cid": str(p.category_id) if p.category_id else "",
                          "category": cat_names.get(str(p.category_id), ""), "desc": p.short_description or p.description or "", "featured": bool(p.featured),
                          "variants": variants.get(str(p.id), []), "soldout": bool(p.track_stock and not variants.get(str(p.id)) and p.stock_qty <= 0)})
    services = []
    for s in ctx["services"]:
        services.append({"id": str(s.id), "kind": "service", "name": s.name, "price": _f(s.price) or 0, "compare": None, "image": images.get(str(s.id)),
                         "images": [images[str(s.id)]] if images.get(str(s.id)) else [], "cid": str(s.category_id) if s.category_id else "",
                         "category": cat_names.get(str(s.category_id), ""), "desc": s.description or "", "duration": s.duration_minutes, "variants": [], "featured": False})
    if not items:
        items = services  # menus / catalogues built from services
    cats = []
    for c in ctx["categories"]:
        if c.is_visible:
            n = sum(1 for i in items if i["cid"] == str(c.id))
            if n:
                cats.append({"id": str(c.id), "name": c.name, "image": c.image_url, "count": n})
    ex = _html.escape
    return {
        "key": business.website.template.key if business.website else "", "root": root, "slug": business.slug,
        "name": business.name, "tagline": business.tagline or "", "phone": business.phone or "", "email": business.email or "",
        "wa": ctx["wa"], "address": ", ".join(x for x in (business.address, business.city) if x), "directions": ctx["directions"],
        "currency": business.currency, "symbol": ctx["cur_symbol"], "freeOver": ctx["free_over"] or 0, "logo": business.logo_url, "about": business.description or "",
        "items": items, "categories": cats, "services": services,
        "team": [{"id": str(s.id), "name": s.name, "photo": s.photo_url} for s in ctx["staff"]],
        "gallery": [{"src": g.url, "caption": g.caption or ""} for g in ctx["gallery"]][:12],
        "hours": ctx["hours"], "bookingsOn": has_feature(db, business, "bookings"),
        "reviews": [{"author": r.author_name, "stars": int(r.rating), "text": r.comment or "", "date": r.created_at.strftime("%b %d, %Y")} for r in ctx["reviews"]],
        "rating": ctx["summary"],
        "nav": ctx.get("nav", []),
        "sections": ctx.get("sections", []),
        "industry": business.industry,
        "is_commerce": business.industry in ("retail", "restaurant") or bool(ctx.get("products")),
    }


def _safe_json(d: dict) -> str:
    return json.dumps(d, default=str).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def _render_section_html(s: dict, draft: bool = False, business: Business = None) -> str:
    """Renders custom website builder sections into HTML markup for storefront HTML responses."""
    stype = s.get("type")
    content = s.get("content") or {}
    data = s.get("data") or {}
    cls = s.get("cls") or ""
    empty = s.get("empty")
    hint = s.get("hint")
    if empty and draft and hint:
        return f'<div class="sx-empty">{_html.escape(hint)}</div>'
    if empty:
        return ""

    title = content.get("title") or ""
    title_html = f'<h2>{_html.escape(title)}</h2>' if title else ""

    if stype == "product_grid":
        cards = data.get("cards") or []
        items_html = "".join(
            f'<div class="pcard" data-id="{_html.escape(str(c.get("id", "")))}"><h3>{_html.escape(c["name"])}</h3><p>{_html.escape(c.get("desc", ""))}</p>'
            f'{"<span>Save " + str(round((1 - (c["price"]/c["compare"] if c.get("compare") else 1))*100)) + "%</span>" if c.get("compare") and c["compare"] > c["price"] else ""}'
            f'{"<span>Sold out</span>" if c.get("sold_out") or (c.get("track_stock") and c.get("stock_qty", 1) <= 0) else ""}'
            f'{"<span>Choose options</span>" if c.get("has_variants") else ""}'
            f'<a href="{_html.escape(c.get("url", ""))}">{_html.escape(c["name"])}</a>'
            f'</div>'
            for c in cards
        )
        return f'<section class="sx-sec {cls}">{title_html}<div class="pgrid">{items_html}</div></section>'

    if stype == "category_grid":
        tiles = data.get("tiles") or []
        tiles_html = "".join(
            f'<div class="ctile"><span>{_html.escape(t["name"])}</span><small>{t["count"]} item{"s" if t["count"] != 1 else ""}</small></div>'
            for t in tiles
        )
        return f'<section class="sx-sec {cls}">{title_html}<div class="ctiles">{tiles_html}</div></section>'

    if stype == "collection_grid":
        cards = data.get("cards") or []
        col_url = data.get("collection_url") or ""
        items_html = "".join(f'<div class="pcard"><h3>{_html.escape(c["name"])}</h3></div>' for c in cards)
        url_html = f'<a href="{_html.escape(col_url)}">View collection</a>' if col_url else ""
        return f'<section class="sx-sec {cls}">{title_html}<div class="pgrid">{items_html}</div>{url_html}</section>'

    if stype == "instagram_feed":
        posts = data.get("posts") or []
        posts_html = "".join(
            f'<a href="{_html.escape(p.get("permalink", "#"))}"><img src="{_html.escape(p.get("media_url") or p.get("thumbnail_url") or "")}" alt="{_html.escape(p.get("caption", ""))}"/></a>'
            for p in posts
        )
        return f'<section class="sx-sec {cls}"><h2>On Instagram</h2><div class="insta-grid">{posts_html}</div></section>'

    if stype == "google_reviews":
        g = data.get("g") or {}
        reviews = g.get("reviews") or []
        count = g.get("count") if g.get("count") is not None else g.get("userRatingCount", 0)
        def _get_txt(r):
            if isinstance(r, dict):
                t = r.get("text")
                return t.get("text") if isinstance(t, dict) else str(t or "")
            return str(r or "")
        revs_html = "".join(f'<div class="g-review"><p>{_html.escape(_get_txt(r))}</p></div>' for r in reviews)
        return (f'<section class="sx-sec {cls}"><h2>Reviews from Google</h2>'
                f'<div>{g.get("rating")}</div><div>{count} Google reviews</div>'
                f'<div class="g-reviews">{revs_html}</div></section>')

    if stype == "rich_text":
        from app.services import sections as eng
        html_content = str(data.get("html") or eng.render_markdown(content.get("body", "")))
        return f'<section class="sx-sec {cls}">{title_html}<div class="prose">{html_content}</div></section>'

    if stype == "custom_html":
        raw_html = content.get("html") or ""
        return f'<section class="sx-sec {cls}"><iframe title="Embedded content" sandbox="allow-scripts allow-popups" srcdoc="{_html.escape(raw_html)}"></iframe></section>'

    if stype == "video":
        embed = data.get("video") or content.get("url") or ""
        src = (embed.get("embed_url") or embed.get("url") or "") if isinstance(embed, dict) else str(embed or "")
        return f'<section class="sx-sec {cls}">{title_html}<iframe src="{_html.escape(src)}" class="video"></iframe></section>'

    if stype == "custom_button":
        lbl = content.get("label") or "Click here"
        act = (data.get("wa_href") if isinstance(data, dict) else None) or content.get("action") or "#"
        if act == "whatsapp":
            phone = (business.phone or '') if business else ''
            act = f"https://wa.me/{phone.replace('+', '')}"
        return f'<section class="sx-sec {cls}"><a href="{_html.escape(str(act))}" class="btn">{_html.escape(lbl)}</a></section>'

    if stype == "faq":
        items = content.get("items") or []
        items_html = "".join(f'<details><summary>{_html.escape(i.get("q", ""))}</summary><p>{_html.escape(i.get("a", ""))}</p></details>' for i in items if i.get("q"))
        return f'<section class="sx-sec {cls}"><h2>FAQ</h2><div class="faq">{items_html}</div></section>'

    if stype == "text":
        body = content.get("body") or ""
        return f'<section class="sx-sec {cls}">{title_html}<p>{_html.escape(body)}</p></section>'

    return ""


def _render_store_footer(business: Business, ctx: dict, data: dict) -> str:
    escaped_name = _html.escape(business.name)
    tagline_raw = business.tagline or business.description or (
        f"Professional {business.industry} services & direct customer bookings"
        if business.industry in ("salon", "barbershop", "beauty")
        else f"Quality products and direct online ordering from {business.name}."
    )
    escaped_tagline = _html.escape(tagline_raw)

    phone = business.phone or business.whatsapp or ""
    contact_parts = []
    if business.address:
        contact_parts.append(f'<div><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-2px;margin-right:6px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>{_html.escape(business.address)}</div>')
    if phone:
        contact_parts.append(f'<div><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-2px;margin-right:6px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><a href="tel:{_html.escape(phone)}" style="color:inherit;text-decoration:none;">{_html.escape(phone)}</a></div>')
    if business.email:
        contact_parts.append(f'<div><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-2px;margin-right:6px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:{_html.escape(business.email)}" style="color:inherit;text-decoration:none;">{_html.escape(business.email)}</a></div>')

    wa_clean = (business.whatsapp or business.phone or "").replace("+", "").replace(" ", "")
    wa_btn = ""
    if wa_clean:
        wa_btn = f'<a href="https://wa.me/{wa_clean}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;margin-top:12px;padding:8px 14px;background:#25D366;color:#FFF;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>Chat on WhatsApp</a>'

    hours_html = '<div style="margin-top:8px;font-size:12.5px;color:#94A3B8;">Operating daily with scheduled orders & bookings.</div>'

    from datetime import date
    year = date.today().year

    root = ctx.get("root") or (f"/{business.slug}" if business and business.slug else "")
    home_url = root or "index.html"

    return (
        '<footer class="site-storefront-footer" style="background:#0F172A;color:#F8FAFC;padding:52px 20px 24px;margin-top:64px;font-family:inherit;border-top:1px solid #1E293B;">'
        '<div style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:36px;padding-bottom:36px;border-bottom:1px solid rgba(255,255,255,0.08);">'
        '<div>'
        f'<h3 style="font-size:19px;font-weight:800;color:#FFFFFF;margin:0 0 10px;letter-spacing:-0.02em;">{escaped_name}</h3>'
        f'<p style="font-size:13.5px;color:#94A3B8;line-height:1.6;margin:0 0 10px;">{escaped_tagline}</p>'
        f'{wa_btn}'
        '</div>'
        '<div>'
        '<h4 style="font-size:13px;font-weight:700;color:#E2E8F0;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 14px;">Store Links</h4>'
        '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px;font-size:13.5px;">'
        f'<li><a href="{home_url}" style="color:#94A3B8;text-decoration:none;">Home</a></li>'
        '<li><a href="cart.html" style="color:#94A3B8;text-decoration:none;">Shopping Bag</a></li>'
        '<li><a href="checkout.html" style="color:#94A3B8;text-decoration:none;">Checkout</a></li>'
        '</ul>'
        '</div>'
        '<div>'
        '<h4 style="font-size:13px;font-weight:700;color:#E2E8F0;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 14px;">Contact & Location</h4>'
        f'<div style="font-size:13.5px;color:#94A3B8;display:flex;flex-direction:column;gap:10px;">{"".join(contact_parts) if contact_parts else "<div>Contact merchant directly online.</div>"}</div>'
        f'{hours_html}'
        '</div>'
        '</div>'
        '<div style="max-width:1200px;margin:0 auto;padding-top:20px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;font-size:12.5px;color:#64748B;">'
        f'<div>© {year} {escaped_name}. All rights reserved.</div>'
        '<div>Powered by <a href="https://aqivo.shop" style="color:#38BDF8;font-weight:600;text-decoration:none;">Aqivo</a></div>'
        '</div>'
        '</footer>'
    )


def render_ecomm(db: Session, ctx: dict, business: Business, key: str, page_name: str = "index.html", item_id: str | None = None) -> str:
    target_file = TEMPLATES_ROOT / key / page_name
    if not target_file.is_file():
        target_file = TEMPLATES_ROOT / key / "index.html"
    page = target_file.read_text(encoding="utf-8")
    data = build_data(db, ctx, business)
    data["key"] = key
    for brand in DEMO_BRANDS[key]:
        page = page.replace(brand, _html.escape(business.name.upper() if brand.isupper() else business.name))
    page = re.sub(r"<title>.*?</title>", f"<title>{_html.escape(ctx['seo']['title'])}</title>", page, count=1, flags=re.S)
    # Strip any hardcoded demo meta description from static template
    page = re.sub(r'<meta\s+[^>]*name=[\'\"]description[\'\"][^>]*>', '', page, flags=re.I)
    desc = _html.escape(ctx["seo"]["description"], quote=True)
    jsonld_tags = f'<script type="application/ld+json">{ctx["seo"]["jsonld"]}</script>'
    if ctx["seo"].get("jsonld_extra"):
        jsonld_tags += f'<script type="application/ld+json">{ctx["seo"]["jsonld_extra"]}</script>'
    
    og_image_tag = f'<meta property="og:image" content="{_html.escape(ctx["seo"]["og_image"], quote=True)}">' if ctx.get("seo", {}).get("og_image") else ''

    tracking_tags = ''
    tracking = ctx.get("tracking")
    if tracking:
        if tracking.get("ga4"):
            ga4 = _html.escape(tracking["ga4"])
            tracking_tags += f'<script async src="https://www.googletagmanager.com/gtag/js?id={ga4}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag("js",new Date());gtag("config","{ga4}",{{anonymize_ip:true}});</script>'
        if tracking.get("meta"):
            meta_id = _html.escape(tracking["meta"])
            tracking_tags += f'<script>!function(f,b,e,v,n,t,s){{if(f.fbq)return;n=f.fbq=function(){{n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)}};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");fbq("init","{meta_id}");fbq("track","PageView");</script>'

    accent = ctx.get("theme", {}).get("accent")
    style_tag = f'<style>:root{{--accent:{accent};}}</style>' if accent else ''
    root = ctx.get("root") or (f"/{business.slug}" if business and business.slug else "")
    store_base = f"{root.rstrip('/')}/" if root else f"{URL_BASE}/{key}/"
    head = (f'<base href="{store_base}">'
            f'<meta name="description" content="{desc}">'
            f'<link rel="canonical" href="{_html.escape(ctx["seo"]["canonical"], quote=True)}">'
            f'<meta name="robots" content="{ctx["seo"]["robots"]}">'
            f'{og_image_tag}'
            f'{style_tag}'
            f'{jsonld_tags}'
            f'{tracking_tags}')
    page = page.replace("<head>", "<head>" + head, 1)

    # Optional announcement bar
    announcement = (ctx.get("settings") or {}).get("announcement")
    if announcement:
        ann_bar = f'<div class="announce" style="background:var(--accent, #111);color:#fff;text-align:center;padding:9px 16px;font-weight:700;font-size:14px;">{_html.escape(announcement)}</div>'
        page = page.replace("<body", "<body " + ("data-announcement=\"true\" "), 1)
        # insert right after <body>
        page = re.sub(r'(<body[^>]*>)', rf'\g<1>{ann_bar}', page, count=1)

    # Render custom navigation items if present
    nav_items = ctx.get("nav") or []
    if nav_items:
        nav_html = "".join(f'<a href="{_html.escape(item.get("href", "#"))}">{_html.escape(item.get("label", ""))}</a>' for item in nav_items)
        if nav_html:
            if "</header>" in page:
                page = page.replace("</header>", f'<nav class="custom-nav" style="display:none;" aria-hidden="true">{nav_html}</nav></header>', 1)
            else:
                page = re.sub(r'(<body[^>]*>)', rf'\g<1><nav class="custom-nav" style="display:none;" aria-hidden="true">{nav_html}</nav>', page, count=1)

    # If business has a custom hero headline in website sections, update the main heading
    hero_sec = next((s for s in ctx.get("sections", []) if s.get("type") == "hero"), None)
    if hero_sec:
        hero_content = hero_sec.get("content") or {}
        headline = hero_content.get("headline")
        if headline:
            escaped_hl = _html.escape(headline)
            page = re.sub(r'(<h1[^>]*>).*?(</h1>)', rf'\g<1>{escaped_hl}\g<2>', page, count=1, flags=re.S)

    # Clean demo hero description with real business tagline/description
    hero_desc_text = business.tagline or business.description or (
        f"Welcome to {business.name}. Browse our services and book online."
        if (business.industry in ("salon", "barbershop", "beauty") or key == "zuribeauty")
        else f"Welcome to {business.name}. Browse our catalogue and place your order online."
    )
    page = re.sub(r'<p class="hero-store-desc">.*?</p>', f'<p class="hero-store-desc">{_html.escape(hero_desc_text)}</p>', page, count=1, flags=re.S)

    # Clean demo search placeholder
    if business.industry in ("salon", "barbershop", "beauty") or key == "zuribeauty":
        search_ph = "Search services..."
    elif business.industry in ("restaurant", "food") or key == "brewandbites":
        search_ph = "Search menu..."
    else:
        search_ph = "Search catalogue..."
    page = re.sub(r'placeholder="Search[^"]*"', f'placeholder="{search_ph}"', page)

    # Clean location label
    if business.address:
        page = page.replace('id="nav-location-label">Kilimani, Nairobi</span>', f'id="nav-location-label">{_html.escape(business.address)}</span>')

    # Reset hardcoded nav cart badge to 0
    page = re.sub(r'<span class="nav-cart-badge"[^>]*>.*?</span>', '<span class="nav-cart-badge" id="nav-cart-badge" style="display:none;">0</span>', page)

    # Clean hardcoded checkout address values
    page = re.sub(r'(id="checkout-address"[^>]*?)\s+value="[^"]*"', r'\1 value=""', page)

    # Clean demo initialCart and discounts in inline script
    page = re.sub(r'initialCart:\s*\[[\s\S]*?\](?=,\s*\n|\s*store|\s*defaultPromo|\s*\})', 'initialCart: []', page)
    page = re.sub(r'defaultDiscount:\s*\d+', 'defaultDiscount: 0', page)

    # Clean PDP (product.html / service.html) demo data
    items = data.get("items") or []
    if ("pdp-content-grid" in page or page_name in ("product.html", "service.html")) and items:
        is_service = business.industry in ("salon", "barbershop", "beauty") or key == "zuribeauty" or any(i.get("kind") == "service" for i in items)
        active_item = None
        if item_id:
            active_item = next((it for it in items if str(it.get("id")) == str(item_id)), None)
        if not active_item:
            active_item = items[0]

        # Replace breadcrumbs and title
        page = re.sub(r'<span class="current" id="pdp-crumb-title">.*?</span>', lambda _: f'<span class="current" id="pdp-crumb-title">{_html.escape(active_item["name"])}</span>', page)
        page = re.sub(r'<span id="pdp-crumb-cat">.*?</span>', lambda _: f'<span id="pdp-crumb-cat">{_html.escape(active_item.get("category") or ("Services" if is_service else "Catalogue"))}</span>', page)
        page = re.sub(r'<h1 class="pdp-item-title" id="pdp-item-title">.*?</h1>', lambda _: f'<h1 class="pdp-item-title" id="pdp-item-title">{_html.escape(active_item["name"])}</h1>', page)
        page = re.sub(r'<div class="pdp-category-tag" id="pdp-category-tag"[^>]*>.*?</div>', lambda _: f'<div class="pdp-category-tag" id="pdp-category-tag">{_html.escape(active_item.get("category") or business.name)}</div>', page)

        # Replace hero image
        img_url = active_item.get("image") or ""
        if img_url:
            page = re.sub(r'<img id="pdp-hero-img" src="[^"]*"', lambda _: f'<img id="pdp-hero-img" src="{_html.escape(img_url)}"', page)

        # Clean rating & verified reviews
        page = re.sub(r'<span class="pdp-verified-reviews">.*?</span>', '', page)
        page = re.sub(r'<span class="pdp-prep-chip">.*?</span>', lambda _: f'<span class="pdp-prep-chip">{"Service" if is_service else "Item"}</span>', page)

        # Price
        cur_sym = data.get("symbol") or business.currency or "KSh"
        p_price = f"{cur_sym} {active_item['price']:,.0f}" if isinstance(active_item['price'], (int, float)) else f"{cur_sym} {active_item['price']}"
        page = re.sub(r'<div class="pdp-price-bold" id="pdp-price-bold">.*?</div>', lambda _: f'<div class="pdp-price-bold" id="pdp-price-bold">{p_price}</div>', page)
        page = re.sub(r'<div class="pdp-vat-label">.*?</div>', '<div class="pdp-vat-label">Inclusive of all applicable taxes</div>', page)

        # Description
        desc_text = active_item.get("desc") or ""
        page = re.sub(r'<p class="pdp-description-text" id="pdp-description-text">.*?</p>', lambda _: f'<p class="pdp-description-text" id="pdp-description-text">{_html.escape(desc_text)}</p>', page, flags=re.S)

        # Action button
        action_text = f"Book Service — {p_price}" if is_service else f"Add to Bag — {p_price}"
        page = re.sub(r'<button class="pdp-cta-add-bag" id="pdp-add-bag-btn"[^>]*>.*?</button>', lambda _: f'<button class="pdp-cta-add-bag" id="pdp-add-bag-btn" onclick="window.StoreApp.addPdpToCart()">{action_text}</button>', page, flags=re.S)

        # Options (hide if no variants)
        if not active_item.get("variants"):
            page = re.sub(r'<div class="pdp-options-section">[\s\S]*?</div>\s*(?=<!-- Purchase Actions Row -->|<div class="pdp-purchase-row")', '<div class="pdp-options-section" style="display:none;"></div>', page)

        # Thumbnails (hide if single image)
        if len(active_item.get("images") or []) <= 1:
            page = re.sub(r'<div class="pdp-thumbnails-strip">[\s\S]*?</div>\s*(?=<!-- Trust Badges Strip -->|<div class="pdp-trust-grid")', '<div class="pdp-thumbnails-strip" style="display:none;"></div>', page)

        # Trust badges strip
        trust_html = (
            '<div class="pdp-trust-grid">'
            '<div class="pdp-trust-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span class="trust-title">Verified Business</span><span class="trust-sub">Direct from ' + _html.escape(business.name) + '</span></div>'
            '<div class="pdp-trust-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span class="trust-title">' + ('Flexible Booking' if is_service else 'Fast Fulfilment') + '</span><span class="trust-sub">Order via WhatsApp or Online</span></div>'
            '<div class="pdp-trust-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg><span class="trust-title">Direct Payment</span><span class="trust-sub">M-Pesa, Cash or Bank</span></div>'
            '</div>'
        )
        page = re.sub(r'<div class="pdp-trust-grid">[\s\S]*?</div>(?=\s*</div>\s*(?:<!--.*?-->\s*)?<div class="pdp-info-col">)', lambda _: trust_html, page)

        # Accordions
        acc_html = (
            '<div class="pdp-accordion-group">'
            '<div class="pdp-accordion-item open"><div class="pdp-accordion-header"><span>' + ('Service Information' if is_service else 'Product Details') + '</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div><div class="pdp-accordion-content">' + _html.escape(desc_text or f"High quality service provided directly by {business.name}.") + '</div></div>'
            '<div class="pdp-accordion-item"><div class="pdp-accordion-header"><span>' + ('Booking & Appointment Info' if is_service else 'Fulfilment & Delivery Information') + '</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div><div class="pdp-accordion-content">' + ('Book your appointment online or contact us directly on WhatsApp to confirm availability.' if is_service else 'Orders are prepared and dispatched directly by the seller. Track status and coordinate delivery on WhatsApp.') + '</div></div>'
            '</div>'
        )
        page = re.sub(r'<div class="pdp-accordion-group">[\s\S]*?</div>(?=(?:\s*</div>)+\s*(?:<!--.*?-->\s*)?<section class="pdp-related-container")', lambda _: acc_html, page)

        # Related heading
        page = re.sub(r'<h2 class="pdp-related-title"[^>]*>.*?</h2>', lambda _: f'<h2 class="pdp-related-title" id="related-heading">More from {_html.escape(business.name)}</h2>', page)

        # Related items grid: replace hardcoded demo products with real merchant items
        related_items = [it for it in items if str(it.get("id")) != str(active_item.get("id"))]
        if not related_items:
            related_items = items[:4]
        else:
            related_items = related_items[:4]

        prefix = f"/{business.slug}" if business.slug else ""
        rel_cards_html = "".join(
            f'<a href="{prefix}/{"service.html" if it.get("kind") == "service" else "product.html"}?id={_html.escape(str(it["id"]))}" class="menu-card" data-prod-name="{_html.escape(it["name"])}">'
            f'<div class="menu-card-img-box">'
            f'{"<img src=" + chr(34) + _html.escape(it["image"]) + chr(34) + " alt=" + chr(34) + _html.escape(it["name"]) + chr(34) + " loading=" + chr(34) + "lazy" + chr(34) + " />" if it.get("image") else ""}'
            f'<button class="card-add-btn" aria-label="Add" onclick="event.preventDefault(); event.stopPropagation(); window.StoreApp.addToCart(\'{it["id"]}\');">'
            f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
            f'</button>'
            f'</div>'
            f'<div class="menu-card-price">{cur_sym} {it["price"]:,.0f}</div>'
            f'<h3 class="menu-card-title">{_html.escape(it["name"])}</h3>'
            f'</a>'
            for it in related_items
        )
        page = re.sub(
            r'(<section class="pdp-related-container"[\s\S]*?<div class="product-cards-grid">)[\s\S]*?(</div>\s*</section>)',
            lambda m: m.group(1) + rel_cards_html + m.group(2),
            page
        )

    # Inject real products into inline createWebStorefront config
    if items:
        safe_items_js = _safe_json(items)
        clean_phone = (business.phone or business.whatsapp or "").replace("+", "").replace(" ", "")
        page = re.sub(r'store:\s*\{[\s\S]*?products:\s*\[[\s\S]*?\][\s\S]*?\}', lambda _: f'store: {{ name: {_safe_json(business.name)}, whatsappPhone: {_safe_json(clean_phone)}, products: {safe_items_js} }}', page)

    # Render custom sections (e.g. rich text, custom html, video, ig feed, google reviews, collections)
    draft_mode = bool(ctx.get("draft") or ctx.get("editing"))
    custom_sections_html = "".join(_render_section_html(s, draft_mode, business) for s in ctx.get("sections", []))
    if custom_sections_html:
        page = re.sub(r'(<body[^>]*>)', rf'\g<1><div id="bz-custom-sections">{custom_sections_html}</div>', page, count=1)

    # Purge demo 'Market' breadcrumb with 'Home'
    page = re.sub(r'<a href="index\.html">Market</a>', '<a href="index.html">Home</a>', page)

    # Storefront footer (includes business info, hours, store links, and Powered by Aqivo)
    if business and 'class="site-storefront-footer"' not in page:
        footer_html = _render_store_footer(business, ctx, data)
        page = page.replace("</body>", footer_html + "</body>", 1)
    elif ctx.get("show_branding") and 'aqivo-branding' not in page:
        page = page.replace("</body>", '<footer class="aqivo-branding" style="text-align:center;padding:16px;font-size:13px;color:#888;">Powered by <a href="https://aqivo.shop" style="color:inherit;font-weight:600;">Aqivo</a></footer></body>', 1)

    # Inject cart drawer if the storefront has any products (needed for WhatsApp bag checkout)
    if data.get("items") and 'id="bag"' not in page:
        bag_html = (
            '<div class="take-modal-veil" data-close-bag hidden></div>'
            '<aside class="take-cart-sheet" id="bag" role="dialog" aria-label="Shopping Cart" aria-modal="true" hidden>'
            '<div class="take-cart-sheet-header">'
            '<h2 class="take-cart-sheet-title">Shopping Bag</h2>'
            '<button type="button" data-close-bag aria-label="Close cart" class="take-modal-close">&times;</button>'
            '</div>'
            '<div class="take-cart-items" data-bag-items></div>'
            '<div class="take-cart-footer">'
            '<a class="take-checkout-btn" data-checkout-btn href="#">Checkout via WhatsApp</a>'
            '</div>'
            '</aside>'
        )
        page = page.replace("</body>", bag_html + "</body>", 1)

    inject = f'<script>window.__BZ={_safe_json(data)};</script>'
    bridge = f'<script src="{URL_BASE}/_bridge.js"></script>'
    marker = '<script src="scripts/data.js"></script>'
    marker_store = '<script src="scripts/mobile-store.js"></script>'
    if marker in page:
        page = page.replace(marker, marker + inject + bridge, 1)
    elif marker_store in page:
        page = page.replace(marker_store, inject + bridge + marker_store, 1)
    else:  # no data.js: still inject before the app script
        page = page.replace("</body>", inject + bridge + "</body>", 1)

    # Rewrite relative asset paths to absolute template paths so they load regardless of base href
    page = re.sub(r'(href|src)=["\']styles/', rf'\1="{URL_BASE}/{key}/styles/', page)
    page = re.sub(r'(href|src)=["\']scripts/', rf'\1="{URL_BASE}/{key}/scripts/', page)
    page = re.sub(r'(href|src)=["\']\.\./_bridge\.js["\']', rf'\1="{URL_BASE}/_bridge.js"', page)
    return page


