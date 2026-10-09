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
    "fashion_ecom": ["LUXINA ARCHIVE", "LUXINA", "Luxina"],
    "grocery_ecom": ["Grofresh Online Grocery Ltd", "Grofresh", "GROFRESH"],
    "shoeshop_ecom": ["FootWear Hub", "FootWear", "Footwear", "FOOTWEAR"],
    "mart_ecom": ["Freshly Market", "Freshly"],
    "booking_ecom": ["Beauty Salon Body LPG", "LPG Beauty & Clinic", "LPG Beauty \u0026 Clinic", "LPG"],
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


def render_ecomm(db: Session, ctx: dict, business: Business, key: str) -> str:
    page = (TEMPLATES_ROOT / key / "index.html").read_text(encoding="utf-8")
    data = build_data(db, ctx, business)
    data["key"] = key
    for brand in DEMO_BRANDS[key]:
        page = page.replace(brand, _html.escape(business.name.upper() if brand.isupper() else business.name))
    page = re.sub(r"<title>.*?</title>", f"<title>{_html.escape(ctx['seo']['title'])}</title>", page, count=1, flags=re.S)
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
    head = (f'<base href="{URL_BASE}/{key}/">'
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
            page = page.replace("</header>", f'<nav class="custom-nav" style="display:flex;gap:16px;padding:10px;">{nav_html}</nav></header>', 1)

    # If business has a custom hero headline in website sections, update the main heading
    hero_sec = next((s for s in ctx.get("sections", []) if s.get("type") == "hero"), None)
    if hero_sec:
        hero_content = hero_sec.get("content") or {}
        headline = hero_content.get("headline")
        if headline:
            escaped_hl = _html.escape(headline)
            # Replace primary headings in ecomm templates
            page = re.sub(r'(<h1[^>]*>).*?(</h1>)', rf'\g<1>{escaped_hl}\g<2>', page, count=1, flags=re.S)

    # Render custom sections (e.g. rich text, custom html, video, ig feed, google reviews, collections)
    draft_mode = bool(ctx.get("draft") or ctx.get("editing"))
    custom_sections_html = "".join(_render_section_html(s, draft_mode, business) for s in ctx.get("sections", []))
    if custom_sections_html:
        page = re.sub(r'(<body[^>]*>)', rf'\g<1><div id="bz-custom-sections">{custom_sections_html}</div>', page, count=1)

    # Branding footer if enabled
    if ctx.get("show_branding"):
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
    marker = '<script src="scripts/data.js"></script>'
    bridge = f'<script src="{URL_BASE}/_bridge.js"></script>'
    if marker in page:
        page = page.replace(marker, marker + inject + bridge, 1)
    else:  # no data.js: still inject before the app script
        page = page.replace("</body>", inject + bridge + "</body>", 1)
    return page


