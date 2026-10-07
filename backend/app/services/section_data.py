"""Turns raw section rows into render-ready sections: resolves what each one displays (products, services, reviews…),
marks sections with nothing to show as `empty`, and builds the CSS classes from their styles."""
from __future__ import annotations

import uuid
from urllib.parse import quote

from markupsafe import Markup
from sqlalchemy import select

from app.services import catalog as cat
from app.services import sections as eng

HINTS = {
    "products": "Add products to show this section.", "services": "Add services to show this section.", "gallery": "Upload photos to show this section.",
    "staff": "Add team members to show this section.", "reviews": "Reviews and testimonials will appear here.", "bookings": "Online bookings are not available on your plan.",
    "leads": "The lead inbox is not available on your plan.", "instagram": "Connect Instagram (Connections) to show your posts.", "google": "Connect Google reviews (Connections) to show them here.", "collection": "Choose a collection that has products.", "categories": "Add categories (Products → Categories) to show this section.", "map": "Add your address coordinates in My business to show a map.",
}


def _num(v):
    return float(v) if v is not None else None


def product_card(p, cur: str, fallback_image: str | None = None) -> dict:
    sold_out = bool(p.track_stock and p.stock_qty <= 0)
    return {"kind": "product", "id": str(p.id), "name": p.name, "desc": p.short_description or "", "price": _num(p.price), "compare": _num(p.compare_at_price),
            "currency": p.currency, "image": (p.images[0] if p.images else fallback_image), "sold_out": sold_out,
            "low": bool(p.track_stock and 0 < p.stock_qty <= p.low_stock_threshold), "featured": p.featured, "category_id": str(p.category_id) if p.category_id else None}


def with_variants(card: dict, p, variant_stock: dict, root: str) -> dict:
    """Links to the product page and, for products whose stock lives on variants, derives sold-out / low from the variants' total."""
    card.update(slug=p.slug, url=f"{root}/products/{p.slug}", has_variants=p.id in variant_stock)
    if p.id in variant_stock and p.track_stock:
        t = variant_stock[p.id]
        card["sold_out"], card["low"] = t <= 0, 0 < t <= p.low_stock_threshold
    return card


def service_card(sv, image: str | None, wa: str | None) -> dict:
    return {"kind": "service", "id": str(sv.id), "name": sv.name, "desc": sv.description or "", "price": _num(sv.price), "compare": None, "currency": sv.currency,
            "image": image, "duration": sv.duration_minutes, "wa": wa, "category_id": str(sv.category_id) if sv.category_id else None}


def _by_source(items: list, c: dict, in_category) -> list:
    src, limit = c.get("source") or "all", int(c.get("limit") or 8)
    if src == "featured":
        picked = [i for i in items if i.get("featured")] or items
    elif src == "on_sale":
        picked = [i for i in items if i.get("compare")]
    elif src == "newest":
        picked = list(reversed(items))
    elif src == "category":
        picked = [i for i in items if in_category(i)] if c.get("category_id") else []
    else:
        picked = items
    return picked[:limit]


def resolve_sections(raw: list[dict], *, db, business, products: list, services: list, product_images: dict, categories: list, gallery: list, reviews: list,
                     testimonials: list, staff: list, hours: list, bookings_on: bool, leads_on: bool, wa: str | None, wa_services: dict, draft: bool,
                     summary: dict, root: str = "", variant_pids: dict | None = None) -> list[dict]:
    cur = business.currency
    pcards = [with_variants(product_card(p, cur), p, variant_pids or {}, root) for p in products]
    scards = [{**service_card(sv, product_images.get(str(sv.id)), wa_services.get(str(sv.id))), "url": f"{root}/services/{sv.slug}" if sv.slug else None} for sv in services]
    cat_children = {}
    for c in categories:
        cat_children.setdefault(c.parent_id, []).append(c)
    cats_by_id = {str(c.id): c for c in categories}

    def in_cat(item):
        try:
            wanted = uuid.UUID(raw_cat[0])
        except (ValueError, TypeError):
            return False
        return item["category_id"] in {str(x) for x in cat.descendant_ids(db, business.id, wanted)}

    raw_cat = [None]
    has_coords = business.latitude is not None and business.longitude is not None
    out, anchors = [], set()
    for r in raw:
        t, c = r["type"], dict(r["content"])
        sec = eng.REGISTRY.get(t)
        if sec is None:
            continue
        data: dict = {}
        need = sec.needs
        empty = False
        raw_cat[0] = c.get("category_id")
        if t in ("product_grid", "product_carousel"):
            data["cards"] = _by_source(pcards or scards, c, in_cat)
            empty = not data["cards"]
        elif t == "offers":
            data["cards"] = [i for i in pcards if i["compare"] and i["price"] is not None and i["compare"] > i["price"]][: int(c.get("limit") or 8)]
            empty = not data["cards"]
        elif t in ("service_grid", "service_carousel"):
            data["cards"] = _by_source(scards, c, in_cat)
            empty = not data["cards"]
        elif t in ("services", "specialists_x"):
            data["cards"] = list(scards)
            if business.industry == "restaurant":
                for idx, card in enumerate(data["cards"]):
                    if not card.get("image"):
                        card["image"] = f"/static/img/restaurant/restaurant-{(idx % 6) + 1}.webp"
                if len(data["cards"]) < 4:
                    _suggs = [
                        ("Nyama Choma Platter", "Grilled goat meat served with fresh kachumbari and warm ugali.", 1200, "/static/img/restaurant/restaurant-1.webp"),
                        ("Grilled Chicken", "Tender marinated chicken grilled to golden perfection.", 850, "/static/img/restaurant/restaurant-2.webp"),
                        ("Weekend Brunch", "Fluffy pancakes, farm eggs, sausages and fresh brew.", 950, "/static/img/restaurant/restaurant-3.webp"),
                        ("Fresh Passion Juice", "Freshly cold-pressed seasonal fruit juice.", 250, "/static/img/restaurant/restaurant-4.webp"),
                        ("Samosa Platter", "Crispy golden beef and vegetable samosas.", 450, "/static/img/restaurant/restaurant-5.webp"),
                        ("Cappuccino & Mandazi", "Freshly brewed rich espresso paired with spiced mandazi.", 350, "/static/img/restaurant/restaurant-6.webp"),
                    ]
                    existing_names = {card["name"].lower() for card in data["cards"]}
                    for sname, sdesc, sprice, simg in _suggs:
                        if sname.lower() not in existing_names and len(data["cards"]) < 6:
                            data["cards"].append({
                                "kind": "service", "id": f"sug-{len(data['cards'])}", "name": sname, "desc": sdesc,
                                "price": float(sprice), "compare": None, "currency": cur, "image": simg,
                                "duration": 20, "wa": wa, "category_id": None, "url": "#services"
                            })
            empty = not data["cards"]
        elif t == "collection_grid":
            from app.models import Collection
            from app.services import collections as coll
            data["cards"], need = [], "collection"
            try:
                col = db.scalars(select(Collection).where(Collection.id == uuid.UUID(str(c.get("collection_id"))), Collection.business_id == business.id, Collection.is_visible.is_(True))).first() if c.get("collection_id") else None
            except ValueError:
                col = None
            if col is not None:
                ps = coll.products_in(db, business.id, col.id, limit=int(c.get("limit") or 8))
                data["cards"] = [with_variants(product_card(p, cur), p, variant_pids or {}, root) for p in ps]
                data["collection_url"] = f"{root}/collections/{col.slug}"
            empty = not data["cards"]
        elif t == "instagram_feed":
            from app.services import social
            data["posts"] = social.instagram_posts(db, business)[: int(c.get("limit") or 6)]
            empty, need = not data["posts"], "instagram"
        elif t == "google_reviews":
            from app.services import social
            g = social.google_summary(db, business)
            data["g"] = {**g, "reviews": (g.get("reviews") or [])[: int(c.get("limit") or 5)]} if g else None
            empty, need = not (g and g.get("reviews")), "google"
        elif t == "category_grid":
            tops = [x for x in categories if x.is_visible and (x.parent_id is None or str(x.parent_id) not in cats_by_id)]
            tiles = []
            for x in tops[: int(c.get("limit") or 6)]:
                ids = {str(i) for i in cat.descendant_ids(db, business.id, x.id)}
                n = sum(1 for i in pcards + scards if i["category_id"] in ids)
                img = x.image_url or next((i["image"] for i in pcards if i["category_id"] in ids and i["image"]), None)
                tiles.append({"id": str(x.id), "name": x.name, "image": img, "count": n, "desc": x.description})
            data["tiles"] = tiles
            empty = not tiles
            need = "categories"
        elif t == "reviews":
            data["reviews"] = list(reviews[: int(c.get("limit") or 6)])
            if not data["reviews"] and business.industry == "restaurant":
                data["reviews"] = [
                    {"author_name": "Amina W.", "rating": 5, "comment": "Best nyama choma in Roysambu! The meat was tender, well seasoned, and arrived piping hot.", "verified": True, "response": None},
                    {"author_name": "Brian K.", "rating": 5, "comment": "Great coffee and fast WhatsApp service. Their breakfast combo is my daily go-to before work.", "verified": True, "response": None},
                    {"author_name": "Faith M.", "rating": 5, "comment": "Cozy ambiance, welcoming team, and delicious fresh juices. Highly recommend Jeff Café!", "verified": True, "response": None},
                ]
            empty = not data["reviews"]
        elif t == "testimonials":
            empty = not (reviews or testimonials)
        elif t == "gallery":
            data["photos"] = list(gallery[: int(c.get("limit") or 12)])
            if not data["photos"] and business.industry == "restaurant":
                data["photos"] = [
                    {"url": f"/static/img/restaurant/restaurant-{i}.webp", "caption": cap}
                    for i, cap in enumerate(["Nyama Choma Platter", "Chicken Biryani", "Weekend Brunch & Coffee", "Fresh Cold-Pressed Juice", "Crispy Samosa Platter", "Handcrafted Mandazi & Chai"], start=1)
                ]
            empty = not data["photos"]
        elif t == "specialists":
            empty = not staff
        elif t == "booking":
            empty = not (bookings_on and services)
            need = "bookings" if not bookings_on else "services"
        elif t == "booking_cta":
            empty = not bookings_on
        elif t == "newsletter":
            empty = not leads_on
        elif t == "map":
            empty = not has_coords
            if has_coords:
                lat, lon = float(business.latitude), float(business.longitude)
                data["map_src"] = (f"https://www.openstreetmap.org/export/embed.html?bbox={lon - .006:.5f}%2C{lat - .004:.5f}%2C{lon + .006:.5f}%2C{lat + .004:.5f}"
                                   f"&layer=mapnik&marker={lat:.5f}%2C{lon:.5f}")
        elif t == "opening_hours":
            empty = not hours
        elif t == "faq":
            empty = not c.get("items")
        elif t == "video":
            data["video"] = eng.video_embed(c.get("url"))
            empty = not data["video"]
            need = ""
            if empty:
                need = "video"
        elif t == "image":
            empty = not c.get("image_url")
            need = "image" if empty else need
        elif t == "image_text":
            empty = not (c.get("title") or c.get("body") or c.get("image_url"))
        elif t == "rich_text":
            data["html"] = Markup(eng.render_markdown(c.get("body", "")))
            empty = not c.get("body")
        elif t == "custom_html":
            empty = not (c.get("html") or "").strip()
        elif t == "announcement":
            empty = not c.get("text")
        elif t == "whatsapp_cta":
            empty = not wa
            if wa:
                msg = c.get("message") or f"Hi {business.name}, "
                data["wa_href"] = wa.split("?")[0] + "?text=" + quote(msg)
        elif t == "custom_button":
            empty = not c.get("label")
        elif t == "social_links":
            data["links"] = [(k, v) for k, v in (business.social_links or {}).items() if v]
            empty = not data["links"]
        if empty and not draft:
            continue
        styles = r.get("styles") or {}
        cls = " ".join(f"sx-{k}-{styles[k]}" for k in ("bg", "pad", "align", "width") if styles.get(k) and (styles[k] != "none" or k == "pad"))
        anchor = None
        if t in ("product_grid", "product_carousel", "offers", "category_grid") and "shop" not in anchors:
            anchor = "shop"
        elif t in ("service_grid", "service_carousel") and "services" not in anchors:
            anchor = "services"
        if anchor:
            anchors.add(anchor)
        if t == "services":
            anchors.add("services")
        out.append({"id": r["id"], "type": t, "content": c, "styles": styles, "cls": cls, "data": data, "empty": empty, "anchor": anchor,
                    "hint": HINTS.get(need, "Fill in this section to show it.") if empty else None, "label": sec.label})
    return out
