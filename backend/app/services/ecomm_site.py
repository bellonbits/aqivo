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
from app.services import store as store_cfg
from app.services.plans import has_feature

TEMPLATES_ROOT = Path(__file__).resolve().parent.parent / "public" / "ecomm_templates"
URL_BASE = "/ecomm-templates"

DEMO_BRANDS = {}


def is_ecomm(key: str | None) -> bool:
    return bool(key) and (TEMPLATES_ROOT / key / "index.html").is_file()



def _f(v) -> float | None:
    return float(v) if v is not None else None


CURATED_FALLBACK_PHOTOS = {
    "dress": "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80",
    "clothing": "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80",
    "fashion": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
    "bag": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    "handbag": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    "leather": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    "hamper": "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80",
    "gift": "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=800&q=80",
    "shoe": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
    "sneaker": "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80",
    "beauty": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
    "skincare": "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",
    "hair": "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80",
    "coffee": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80",
    "food": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
    "electronics": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    "phone": "https://images.unsplash.com/photo-1511707171634-5f897ff02547?auto=format&fit=crop&w=800&q=80",
    "grocery": "https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=800&q=80",
}


def _match_photo(name: str, desc: str = "") -> str | None:
    txt = f"{name} {desc}".lower()
    for kw, u in CURATED_FALLBACK_PHOTOS.items():
        if kw in txt:
            return u
    return None


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
            if not imgs:
                matched = _match_photo(p.name, p.short_description or p.description or "")
                if matched:
                    imgs = [matched]
            items.append({"id": str(p.id), "kind": "product", "name": p.name, "price": _f(p.price) or 0, "compare": _f(p.compare_at_price),
                          "image": imgs[0] if imgs else None, "images": imgs, "cid": str(p.category_id) if p.category_id else "",
                          "category": cat_names.get(str(p.category_id), ""), "desc": p.short_description or p.description or "", "featured": bool(p.featured),
                          "variants": variants.get(str(p.id), []), "soldout": bool(p.track_stock and not variants.get(str(p.id)) and p.stock_qty <= 0)})
    services = []
    for s in ctx["services"]:
        s_img = images.get(str(s.id))
        s_imgs = [s_img] if s_img else []
        if not s_imgs:
            matched = _match_photo(s.name, s.description or "")
            if matched:
                s_imgs = [matched]
                s_img = matched
        services.append({"id": str(s.id), "kind": "service", "name": s.name, "price": _f(s.price) or 0, "compare": None, "image": s_img,
                         "images": s_imgs, "cid": str(s.category_id) if s.category_id else "",
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
    hero_sec = next((s for s in ctx.get("sections", []) if s.get("type") == "hero"), None)
    hero_content = (hero_sec.get("content") or {}) if hero_sec else {}
    hero_headline = hero_content.get("headline") or hero_content.get("title") or business.name
    hero_subheadline = hero_content.get("subheadline") or hero_content.get("subtitle") or business.tagline or "Discover our collection and order directly on WhatsApp."
    hero_cta_text = hero_content.get("cta_text") or ""
    hero_cta_url = hero_content.get("cta_url") or ""
    sec_ids = {str(s.get("type")): str(s.get("id")) for s in ctx.get("sections", []) if s.get("id") and s.get("type")}

    clean_wa = "".join(ch for ch in (business.whatsapp or business.phone or "") if ch.isdigit())
    return {
        "key": business.website.template.key if business.website else "", "root": root, "slug": business.slug,
        "name": business.name, "tagline": business.tagline or "", "phone": business.phone or clean_wa, "wa_phone": clean_wa, "email": business.email or "",
        "wa": ctx["wa"], "address": ", ".join(x for x in (business.address, business.city) if x), "directions": ctx["directions"],
        "currency": business.currency, "symbol": ctx["cur_symbol"], "freeOver": ctx["free_over"] or 0, "logo": business.logo_url, "about": business.description or "",
        "items": items, "categories": cats, "services": services,
        "hero_headline": hero_headline, "hero_subheadline": hero_subheadline, "hero_cta_text": hero_cta_text, "hero_cta_url": hero_cta_url,
        "section_ids": sec_ids,
        "team": [{"id": str(s.id), "name": s.name, "photo": s.photo_url} for s in ctx["staff"]],
        "gallery": [{"src": g.url, "caption": g.caption or ""} for g in ctx["gallery"]][:12],
        "hours": ctx["hours"], "bookingsOn": has_feature(db, business, "bookings"),
        "reviews": [{"author": r.author_name, "stars": int(r.rating), "text": r.comment or "", "date": r.created_at.strftime("%b %d, %Y")} for r in ctx["reviews"]],
        "rating": ctx["summary"],
        "nav": ctx.get("nav", []),
        "sections": ctx.get("sections", []),
        "industry": business.industry,
        "is_commerce": business.industry in ("retail", "restaurant") or bool(ctx.get("products")),
        "is_service": business.industry in ("salon", "barbershop", "beauty", "services") or bool(services and not ctx.get("products")),
        "announcement": (ctx.get("settings") or {}).get("announcement") or "",
        "checkout_config": store_cfg.public_config(business, db) if business else None,
    }


def _safe_json(d: dict) -> str:
    return json.dumps(d, default=str).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def _render_section_html(s: dict, draft: bool = False, business: Business = None, key: str = "", is_service: bool = False) -> str:
    """Renders custom website builder sections into HTML markup for storefront HTML responses."""
    stype = s.get("type")
    content = s.get("content") or {}
    data = s.get("data") or {}
    cls = s.get("cls") or ""
    empty = s.get("empty")
    hint = s.get("hint")
    sid = s.get("id") or ""

    if empty:
        if draft and hint and stype not in ("hero", "product_grid", "category_grid", "product_carousel", "reviews"):
            return f'<div class="sx-empty" data-sid="{_html.escape(str(sid))}">{_html.escape(hint)}</div>'
        return ""

    title = content.get("title") or ""
    title_html = f'<h2>{_html.escape(title)}</h2>' if title else ""
    data_attr = f'data-sid="{_html.escape(str(sid))}" data-type="{_html.escape(str(stype or ""))}"'

    if stype == "hero":
        headline = content.get("headline") or content.get("title") or (business.name if business else ("Welcome to our studio" if is_service else "Welcome to our store"))
        default_sub = "Choose a service and a time. We'll confirm shortly. Or message us on WhatsApp." if is_service else "Discover our collection and order directly on WhatsApp."
        subheadline = content.get("subheadline") or content.get("subtitle") or (business.tagline if business else "") or default_sub
        cta_text = content.get("cta_text")
        cta_url = content.get("cta_url") or "#items-grid"
        wa_phone = (business.phone or business.whatsapp or "") if business else ""
        if wa_phone and not cta_text:
            cta_text = "Book on WhatsApp" if is_service else "Order on WhatsApp"
            cta_url = f"https://wa.me/{wa_phone.replace('+', '').replace(' ', '')}"
        cta_html = f'<a href="{_html.escape(cta_url)}" class="btn-brand">{_html.escape(cta_text)}</a>' if cta_text else ""
        return (
            f'<section class="store-hero-compact {cls}" {data_attr}>'
            f'<div class="store-hero-content">'
            f'<h2 class="store-hero-title">{_html.escape(headline)}</h2>'
            f'<p class="store-hero-sub">{_html.escape(subheadline)}</p>'
            f'{cta_html}'
            f'</div>'
            f'</section>'
        )

    if stype == "category_grid":
        tiles = data.get("tiles") or []
        all_lbl = "All services" if is_service else "All items"
        pills_html = [f'<button type="button" class="cat-pill active" data-cat-id="all">{all_lbl}</button>']
        for t in tiles:
            count = t.get("count", 0)
            item_noun = "service" if is_service else "item"
            cnt_str = f"{count} {item_noun}" if count == 1 else f"{count} {item_noun}s"
            pills_html.append(
                f'<button type="button" class="cat-pill" data-cat-id="{_html.escape(str(t.get("id", "")))}">'
                f'<span>{_html.escape(t["name"])}</span> <span class="pill-count">({cnt_str})</span>'
                f'</button>'
            )
        return (
            f'<section class="store-category-pills-section {cls}" {data_attr}>'
            f'{title_html}'
            f'<div class="store-category-pills-scroll cat-pills-scroll">{"".join(pills_html)}</div>'
            f'</section>'
        )

    if stype == "product_grid":
        cards = data.get("cards") or []
        cur_sym = data.get("symbol") or (business.currency if business else "KES")
        items_html = []
        for c in cards:
            c_is_svc = is_service or c.get("kind") == "service"
            c_action = "Book" if c_is_svc else ("Options" if c.get("has_variants") else "Add")
            c_name = _html.escape(c.get("name") or "")
            c_desc = _html.escape(c.get("desc") or "")
            c_price = f"{cur_sym} {c['price']:,.0f}" if c.get("price") is not None else ""
            c_comp = f'<s class="item-compare">{cur_sym} {c["compare"]:,.0f}</s>' if (not c_is_svc and c.get("compare") and c["compare"] > c.get("price", 0)) else ""
            save_badge = ""
            if not c_is_svc and c.get("compare") and c.get("price") and c["compare"] > c["price"]:
                pct = round((1 - (c["price"] / c["compare"])) * 100)
                save_badge = f'<span class="badge-discount">Save {pct}%</span>'
            sold_badge = '<span class="badge-soldout">Sold out</span>' if c.get("sold_out") or (c.get("track_stock") and c.get("stock_qty", 1) <= 0) else ""
            opt_badge = '<span>Choose options</span>' if c.get("has_variants") and not c_is_svc else ""
            img_url = c.get("image") or _match_photo(c.get("name", ""), c.get("desc", ""))
            img_html = f'<img src="{_html.escape(img_url)}" alt="{c_name}" class="w-full h-full object-cover" loading="lazy" />' if img_url else ''
            items_html.append(
                f'<div class="store-card product-card pcard" data-id="{_html.escape(str(c.get("id", "")))}">'
                f'<div class="item-img-wrap aspect-square">{img_html}{save_badge}{sold_badge}</div>'
                f'<div class="card-body">'
                f'<h3 class="item-title">{c_name}</h3>'
                f'{"<p class=\"item-desc\">" + c_desc + "</p>" if c_desc else ""}'
                f'<div class="card-footer flex items-center justify-between mt-2 pt-2 border-t border-slate-100">'
                f'<div class="item-price font-extrabold">{c_price} {c_comp}</div>'
                f'<button type="button" class="btn-add-cart" data-id="{_html.escape(str(c.get("id")))}">{c_action}</button>'
                f'</div>'
                f'{opt_badge}'
                f'</div>'
                f'</div>'
            )
        return f'<section class="sx-sec store-product-section {cls}" {data_attr}>{title_html}<div class="store-product-grid pgrid">{"".join(items_html)}</div></section>'

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
    brand_url = "https://aqivo.shop"
    escaped_name = _html.escape(business.name) if business else ""
    return (
        '<footer class="site-storefront-footer" data-section="aqivo-attribution" style="text-align:center;padding:36px 16px 48px;font-size:12.5px;color:#94A3B8;font-family:inherit;">'
        f'<div style="display:none;" data-merchant-name="{escaped_name}">{escaped_name}</div>'
        f'<a href="{brand_url}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;color:#64748B;text-decoration:none;font-weight:500;transition:opacity 0.2s;" onmouseover="this.style.opacity=\'0.8\'" onmouseout="this.style.opacity=\'1\'">'
        '<span>Powered by</span>'
        '<img src="/static/brand/aqivo-mark.png" alt="Aqivo" style="height:15px;width:15px;object-fit:contain;display:inline-block;vertical-align:middle;" />'
        '<span style="font-weight:700;color:#0B1736;letter-spacing:-0.01em;">Aqivo</span>'
        '</a>'
        '</footer>'
    )


def render_ecomm(db: Session, ctx: dict, business: Business, key: str, page_name: str = "index.html", item_id: str | None = None, draft: bool = False, precomputed_data: dict | None = None) -> str:
    from app.services.theme_studio import DRAFTS_ROOT
    target_file = None
    if draft:
        draft_candidate = DRAFTS_ROOT / key / page_name
        if draft_candidate.is_file():
            target_file = draft_candidate
    if not target_file:
        target_file = TEMPLATES_ROOT / key / page_name
        if not target_file.is_file():
            shared_file = TEMPLATES_ROOT / page_name
            if shared_file.is_file():
                target_file = shared_file
            else:
                target_file = TEMPLATES_ROOT / key / "index.html"
    page = target_file.read_text(encoding="utf-8")
    if precomputed_data is not None:
        data = dict(precomputed_data)
    else:
        data = build_data(db, ctx, business)
    data["key"] = key
    for brand in DEMO_BRANDS.get(key, []):
        page = page.replace(brand, _html.escape(business.name.upper() if brand.isupper() else business.name))
    page = re.sub(r"<title>.*?</title>", f"<title>{_html.escape(ctx['seo']['title'])}</title>", page, count=1, flags=re.S)
    # Strip any hardcoded demo meta description from static template
    page = re.sub(r'<meta\s+[^>]*name=[\'\"]description[\'\"][^>]*>', '', page, flags=re.I)
    desc = _html.escape(ctx["seo"]["description"], quote=True)
    jsonld_tags = f'<script type="application/ld+json">{ctx["seo"]["jsonld"]}</script>'
    if ctx["seo"].get("jsonld_extra"):
        jsonld_tags += f'<script type="application/ld+json">{ctx["seo"]["jsonld_extra"]}</script>'
    
    items = data.get("items") or []
    is_service = bool(
        data.get("is_service")
        or (business and business.industry in ("salon", "barbershop", "beauty", "services"))
        or key == "zuribeauty"
        or (items and all(i.get("kind") == "service" for i in items))
    )

    og_img = ctx.get("seo", {}).get("og_image")
    if not og_img:
        if item_id and items:
            matched_item = next((it for it in items if str(it.get("id")) == str(item_id)), None)
            if matched_item and matched_item.get("image"):
                og_img = matched_item["image"]
        if not og_img and items:
            first_with_img = next((it for it in items if it.get("image")), None)
            if first_with_img:
                og_img = first_with_img["image"]
        if not og_img and getattr(business, "logo_url", None):
            og_img = business.logo_url
        if not og_img and getattr(business, "cover_image_url", None):
            og_img = business.cover_image_url
        if not og_img and ctx.get("cover_image"):
            og_img = ctx["cover_image"]

    og_image_tag = ''
    if og_img:
        if not og_img.startswith("http://") and not og_img.startswith("https://"):
            og_img = f"https://www.aqivo.shop/{og_img.lstrip('/')}"
        og_image_tag = (
            f'<meta property="og:image" content="{_html.escape(og_img, quote=True)}">'
            f'<meta property="og:image:secure_url" content="{_html.escape(og_img, quote=True)}">'
            f'<meta property="og:image:width" content="1200">'
            f'<meta property="og:image:height" content="630">'
            f'<meta name="twitter:image" content="{_html.escape(og_img, quote=True)}">'
            f'<meta name="twitter:card" content="summary_large_image">'
        )
    page_title = _html.escape(ctx["seo"]["title"], quote=True)
    og_tags = (
        f'<meta property="og:title" content="{page_title}">'
        f'<meta property="og:description" content="{desc}">'
        f'<meta property="og:site_name" content="{_html.escape(business.name, quote=True)}">'
        f'<meta property="og:type" content="website">'
        f'<meta property="og:url" content="{_html.escape(ctx["seo"]["canonical"], quote=True)}">'
        f'{og_image_tag}'
    )

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
    style_content = ''
    style_candidate = target_file.parent / "style.css"
    if style_candidate.is_file():
        style_content = f'<style id="aqivo-template-styles">\n{style_candidate.read_text(encoding="utf-8")}\n</style>'
    root = ctx.get("root") or (f"/{business.slug}" if business and business.slug else "")
    store_base = f"{root.rstrip('/')}/" if root else f"{URL_BASE}/{key}/"
    head = (f'<base href="{store_base}">'
            f'<meta name="description" content="{desc}">'
            f'<link rel="canonical" href="{_html.escape(ctx["seo"]["canonical"], quote=True)}">'
            f'<meta name="robots" content="{ctx["seo"]["robots"]}">'
            f'{og_tags}'
            f'{style_tag}'
            f'{style_content}'
            f'{jsonld_tags}'
            f'{tracking_tags}')
    page = page.replace("<head>", "<head>" + head, 1)

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
        if is_service
        else f"Welcome to {business.name}. Browse our catalogue and place your order online."
    )
    page = re.sub(r'<p class="hero-store-desc">.*?</p>', f'<p class="hero-store-desc">{_html.escape(hero_desc_text)}</p>', page, count=1, flags=re.S)

    # Clean demo search placeholder
    if is_service:
        search_ph = "Search services..."
    elif business.industry in ("restaurant", "food") or key == "brewandbites":
        search_ph = "Search menu..."
    else:
        search_ph = "Search catalogue..."
    page = re.sub(r'placeholder="Search[^"]*"', f'placeholder="{search_ph}"', page)

    # Service vs Shop Text & Element Adjustments
    if is_service:
        page = page.replace("Our Collection", "Our Services")
        page = page.replace("All items", "All services")
        page = page.replace("Order on WhatsApp", "Book on WhatsApp")
        page = page.replace("Order online · Direct delivery", "Appointments & walk-ins welcome")
        page = page.replace("Back to Store", "Back to Services")
        page = re.sub(r'id="cart-bar"', 'id="cart-bar" style="display:none !important;"', page)
        page = re.sub(r'class="pdp-qty-row', 'class="pdp-qty-row" style="display:none !important;"', page)

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
    if ("pdp-content-grid" in page or page_name in ("product.html", "service.html")) and items:
        active_item = None
        if item_id:
            active_item = next((it for it in items if str(it.get("id")) == str(item_id)), None)
        if not active_item:
            active_item = items[0]

        # Replace breadcrumbs and title
        page = re.sub(r'<title>.*?</title>', f'<title>{_html.escape(active_item["name"])} — {_html.escape(business.name)}</title>', page)
        page = re.sub(r'(<span[^>]*id="pdp-brand-logo"[^>]*>).*?(</span>)', lambda m: f'{m.group(1)}{_html.escape(business.name)}{m.group(2)}', page)
        page = re.sub(r'(<span[^>]*id="pdp-crumb-title"[^>]*>).*?(</span>)', lambda m: f'{m.group(1)}{_html.escape(active_item["name"])}{m.group(2)}', page)
        page = re.sub(r'(<span[^>]*id="pdp-crumb-cat"[^>]*>).*?(</span>)', lambda m: f'{m.group(1)}{_html.escape(active_item.get("category") or ("Services" if is_service else "Catalogue"))}{m.group(2)}', page)
        page = re.sub(r'(<h1[^>]*id="pdp-item-title"[^>]*>).*?(</h1>)', lambda m: f'{m.group(1)}{_html.escape(active_item["name"])}{m.group(2)}', page)
        page = re.sub(r'(<div[^>]*id="pdp-category-tag"[^>]*>).*?(</div>)', lambda m: f'{m.group(1)}{_html.escape(active_item.get("category") or business.name)}{m.group(2)}', page)

        # Replace hero image
        img_url = active_item.get("image") or ""
        if img_url:
            page = re.sub(r'<img id="pdp-hero-img" src="[^"]*"', lambda _: f'<img id="pdp-hero-img" src="{_html.escape(img_url)}"', page)

        # Clean rating & verified reviews
        page = re.sub(r'<span class="pdp-verified-reviews">.*?</span>', '', page)
        page = re.sub(r'(<span[^>]*class="[^"]*pdp-prep-chip[^"]*"[^>]*>).*?(</span>)', lambda m: f'{m.group(1)}{"Service" if is_service else "Item"}{m.group(2)}', page)

        # Price
        cur_sym = data.get("symbol") or business.currency or "KSh"
        p_price = f"{cur_sym} {active_item['price']:,.0f}" if isinstance(active_item['price'], (int, float)) else f"{cur_sym} {active_item['price']}"
        page = re.sub(r'(<div[^>]*id="pdp-price-bold"[^>]*>).*?(</div>)', lambda m: f'{m.group(1)}{p_price}{m.group(2)}', page)
        page = re.sub(r'<div class="pdp-vat-label">.*?</div>', '<div class="pdp-vat-label">Inclusive of all applicable taxes</div>', page)

        # Description
        desc_text = active_item.get("desc") or ""
        page = re.sub(r'(<p[^>]*id="pdp-description-text"[^>]*>).*?(</p>)', lambda m: f'{m.group(1)}{_html.escape(desc_text)}{m.group(2)}', page, flags=re.S)

        # Action button
        action_text = f"Book Service — {p_price}" if is_service else f"Add to Bag — {p_price}"
        page = re.sub(r'(<button[^>]*id="pdp-add-bag-btn"[^>]*>).*?(</button>)', lambda m: f'{m.group(1)}{action_text}{m.group(2)}', page, flags=re.S)

        # Options (render if variants exist, hide if none)
        if active_item.get("variants"):
            chips = []
            for idx, v in enumerate(active_item["variants"]):
                active_cls = " active" if idx == 0 else ""
                v_title = _html.escape(v.get("title", ""))
                v_price = f"{cur_sym} {v['price']:,.0f}" if isinstance(v.get("price"), (int, float)) else f"{cur_sym} {v.get('price', '')}"
                chips.append(f'<button type="button" class="pdp-chip-btn{active_cls}" data-v-id="{_html.escape(str(v.get("id", "")))}" data-v-price="{v.get("price", active_item["price"])}">{v_title} ({v_price})</button>')
            v_html = (
                '<div class="pdp-option-header"><span class="pdp-option-title">Select Option</span></div>'
                f'<div class="pdp-chips-grid">{"".join(chips)}</div>'
            )
            page = re.sub(r'<div[^>]*id="pdp-options-wrap"[^>]*>.*?</div>', f'<div class="pdp-options-section mb-5" id="pdp-options-wrap">{v_html}</div>', page, flags=re.S)
        else:
            page = re.sub(r'<div[^>]*id="pdp-options-wrap"[^>]*>.*?</div>', '<div class="pdp-options-section" id="pdp-options-wrap" style="display:none;"></div>', page, flags=re.S)

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
            f'<div class="store-card group bg-white rounded-2xl p-3 border border-slate-200/90 shadow-sm flex flex-col justify-between" data-item-id="{_html.escape(str(it["id"]))}">'
            f'<a href="{prefix}/{"service.html" if it.get("kind") == "service" or is_service else "product.html"}?id={_html.escape(str(it["id"]))}" class="block">'
            f'<div class="w-full aspect-square rounded-xl bg-slate-50 mb-2 overflow-hidden flex items-center justify-center border border-slate-100">'
            f'{"<img src=" + chr(34) + _html.escape(it["image"]) + chr(34) + " alt=" + chr(34) + _html.escape(it["name"]) + chr(34) + " class=\"w-full h-full object-cover\" loading=\"lazy\" />" if it.get("image") else ""}'
            f'</div>'
            f'<h4 class="font-bold text-xs text-[#0B1736] line-clamp-2 mb-1">{_html.escape(it["name"])}</h4>'
            f'</a>'
            f'<div class="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between">'
            f'<div class="font-extrabold text-xs text-[#0B1736]">{cur_sym} {it["price"]:,.0f}</div>'
            f'<button type="button" class="btn-add-cart h-7 px-2.5 rounded-lg bg-[#5B21F5] text-white text-[11px] font-bold" data-id="{_html.escape(str(it["id"]))}">{"Book" if it.get("kind") == "service" or is_service else "+ Add"}</button>'
            f'</div>'
            f'</div>'
            for it in related_items
        )
        page = re.sub(
            r'(<section class="pdp-related-container"[\s\S]*?<div[^>]*class="[^"]*product-cards-grid[^"]*"[^>]*>)[\s\S]*?(</div>\s*</section>)',
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
    custom_sections_html = "".join(_render_section_html(s, draft_mode, business, key, is_service=is_service) for s in ctx.get("sections", []))
    if custom_sections_html and page_name not in ("product.html", "service.html", "receipt.html"):
        if "</main>" in page:
            page = page.replace("</main>", f'<div id="bz-custom-sections">{custom_sections_html}</div></main>', 1)
        else:
            page = re.sub(r'(<body[^>]*>)', rf'\g<1><div id="bz-custom-sections">{custom_sections_html}</div>', page, count=1)

    # Purge demo 'Market' breadcrumb with 'Home'
    page = re.sub(r'<a href="index\.html">Market</a>', '<a href="index.html">Home</a>', page)

    # Storefront footer (Powered by Aqivo attribution)
    if business and 'class="aqivo-attribution"' not in page and 'class="site-storefront-footer"' not in page:
        footer_html = _render_store_footer(business, ctx, data)
        page = page.replace("</body>", footer_html + "</body>", 1)
    elif ctx.get("show_branding") and 'aqivo-branding' not in page and 'aqivo-attribution' not in page:
        page = page.replace("</body>", '<footer class="aqivo-attribution" style="text-align:center;padding:32px 16px;font-size:12.5px;color:#94A3B8;"><a href="https://aqivo.shop" style="color:inherit;font-weight:600;text-decoration:none;">Powered by Aqivo</a></footer></body>', 1)

    # Inject cart drawer ONLY if NOT a service booking storefront (pure commerce shop checkout)
    if not is_service and data.get("items") and 'id="bag"' not in page:
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
    booking_bridge = (
        f'<script src="{URL_BASE}/aqivo-booking.js"></script>'
        f'<script src="{URL_BASE}/aqivo-booking-bridge.js"></script>'
    )
    if 'aqivo-booking.js' not in page:
        bridge += booking_bridge

    marker = '<script src="scripts/data.js"></script>'
    marker_store = '<script src="scripts/mobile-store.js"></script>'
    if marker in page:
        page = page.replace(marker, marker + inject + bridge, 1)
    elif marker_store in page:
        page = page.replace(marker_store, inject + bridge + marker_store, 1)
    else:  # no data.js: still inject before the app script
        page = page.replace("</body>", inject + bridge + "</body>", 1)

    # Rewrite relative asset paths to absolute template paths so they load regardless of base href
    page = re.sub(r'(href|src)=["\']style\.css["\']', rf'\1="{URL_BASE}/{key}/style.css"', page)
    page = re.sub(r'(href|src)=["\']styles/', rf'\1="{URL_BASE}/{key}/styles/', page)
    page = re.sub(r'(href|src)=["\']scripts/', rf'\1="{URL_BASE}/{key}/scripts/', page)
    page = re.sub(r'(href|src)=["\']\.\./_bridge\.js["\']', rf'\1="{URL_BASE}/_bridge.js"', page)
    page = re.sub(r'(href|src)=["\']aqivo-booking\.js["\']', rf'\1="{URL_BASE}/aqivo-booking.js"', page)
    page = re.sub(r'(href|src)=["\']aqivo-booking-bridge\.js["\']', rf'\1="{URL_BASE}/aqivo-booking-bridge.js"', page)
    return page


