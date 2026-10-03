"""Context builders for the storefront's catalogue, checkout and order pages (the pages that aren't a list of sections)."""
from __future__ import annotations

import json
from urllib.parse import quote

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models import Business, Order, Product, ProductVariant, Review, Service, ServiceCategory
from app.services import catalog as cat
from app.services import inventory as inv
from app.services import orders as order_svc
from app.services import store as store_cfg
from app.services.reviews import rating_summary
from app.services.section_data import product_card, service_card, with_variants
from app.services.site_render import _safe_json, build_context

PAGE_SIZE = 24
SORTS = {"newest": "Newest", "price_asc": "Price: low to high", "price_desc": "Price: high to low", "name": "Name"}


def _base(db: Session, business: Business, root: str, title: str, *, description: str | None = None, canonical_path: str = "", noindex: bool = False, draft: bool = False) -> dict:
    ctx = build_context(db, business, draft=draft, root=root)
    seo = dict(ctx["seo"])
    seo["title"] = f"{title} — {business.name}"[:70]
    if description:
        seo["description"] = description[:300]
    seo["canonical"] = f"{ctx['urls']['profile']}{canonical_path}"
    if noindex:
        seo["robots"] = "noindex,follow"
    ctx.update(seo=seo, page_title=title, sections=[])
    return ctx


def _cats(db: Session, business: Business) -> list[ServiceCategory]:
    return list(db.scalars(select(ServiceCategory).where(ServiceCategory.business_id == business.id, ServiceCategory.is_visible.is_(True)).order_by(ServiceCategory.position)))


def _variant_stock(db: Session, business: Business) -> dict:
    return {pid: int(t or 0) for pid, t in db.execute(select(ProductVariant.product_id, func.sum(ProductVariant.stock_qty)).where(
        ProductVariant.business_id == business.id, ProductVariant.is_active.is_(True)).group_by(ProductVariant.product_id))}


def _cards(db: Session, business: Business, root: str, products: list[Product]) -> list[dict]:
    vs = _variant_stock(db, business)
    return [with_variants(product_card(p, business.currency), p, vs, root) for p in products]


def _paginate(q, page: int):
    return q.limit(PAGE_SIZE + 1).offset((max(page, 1) - 1) * PAGE_SIZE)


def _order(sort: str):
    return {"price_asc": [Product.price.asc()], "price_desc": [Product.price.desc()], "name": [Product.name.asc()]}.get(sort, [Product.position, Product.created_at.desc()])


def listing(db: Session, business: Business, root: str, *, q: str = "", category_slug: str | None = None, sort: str = "newest", page: int = 1) -> dict:
    cats = _cats(db, business)
    current = next((c for c in cats if c.slug == category_slug), None) if category_slug else None
    if category_slug and current is None:
        return {}
    where = [Product.business_id == business.id, Product.deleted_at.is_(None), Product.status == "ACTIVE"]
    if current is not None:
        where.append(Product.category_id.in_(cat.descendant_ids(db, business.id, current.id)))
    if q:
        like = f"%{q.strip()}%"
        where.append(or_(Product.name.ilike(like), Product.short_description.ilike(like), Product.sku.ilike(like)))
    rows = list(db.scalars(_paginate(select(Product).where(*where).order_by(*_order(sort)), page)))
    has_next = len(rows) > PAGE_SIZE
    title = current.name if current else ("Search" if q else "Shop")
    path = f"/categories/{current.slug}" if current else "/products"
    ctx = _base(db, business, root, title, description=(current.description if current else None) or f"{title} at {business.name}", canonical_path=path, noindex=bool(q) or page > 1)
    top = [c for c in cats if c.parent_id is None or c.parent_id not in {x.id for x in cats}]
    crumbs = []
    if current:
        chain, cur = [], current
        while cur is not None:
            chain.append(cur)
            cur = next((c for c in cats if c.id == cur.parent_id), None)
        crumbs = [{"name": c.name, "url": f"{root}/categories/{c.slug}"} for c in reversed(chain)]
    ctx.update(kind="products", cards=_cards(db, business, root, rows[:PAGE_SIZE]), q=q, current=current, sort=sort, sorts=SORTS, page_no=page, has_next=has_next, has_prev=page > 1,
               cat_chips=[{"name": c.name, "url": f"{root}/categories/{c.slug}", "active": current is not None and c.id == current.id} for c in top],
               crumbs=crumbs, base_path=path, children=[{"name": c.name, "url": f"{root}/categories/{c.slug}"} for c in cats if current and c.parent_id == current.id])
    return ctx


def collection_page(db: Session, business: Business, root: str, slug: str, page: int = 1) -> dict:
    from app.models import Collection
    from app.services import collections as coll
    col = db.scalars(select(Collection).where(Collection.business_id == business.id, Collection.slug == slug, Collection.is_visible.is_(True))).first()
    if col is None:
        return {}
    ps = coll.products_in(db, business.id, col.id)
    ctx = _base(db, business, root, col.name, description=col.description or f"{col.name} at {business.name}", canonical_path=f"/collections/{col.slug}")
    ctx.update(kind="products", cards=_cards(db, business, root, ps), q="", current=col, sort="newest", sorts=SORTS, page_no=1, has_next=False, has_prev=False, cat_chips=[], crumbs=[], children=[], base_path=f"/collections/{col.slug}")
    return ctx


def services_listing(db: Session, business: Business, root: str) -> dict:
    ctx = _base(db, business, root, "Services", description=f"Services offered by {business.name}", canonical_path="/services")
    cards = [{**service_card(sv, ctx["product_images"].get(str(sv.id)), ctx["wa_services"].get(str(sv.id))), "url": f"{root}/services/{sv.slug}" if sv.slug else None} for sv in ctx["services"]]
    ctx.update(kind="services", cards=cards, q="", current=None, crumbs=[], children=[], cat_chips=[], has_next=False, has_prev=False, page_no=1, base_path="/services", sort="newest", sorts=SORTS)
    return ctx


def product_detail(db: Session, business: Business, root: str, slug: str, *, review_token: str = "") -> dict:
    p = db.scalars(select(Product).where(Product.business_id == business.id, Product.slug == slug, Product.deleted_at.is_(None), Product.status == "ACTIVE")).first()
    if p is None:
        return {}
    cats = _cats(db, business)
    category = next((c for c in cats if c.id == p.category_id), None)
    variants = inv.active_variants(db, p)
    imgs = list(p.images or [])
    for v in variants:
        if v.image_url and v.image_url not in imgs:
            imgs.append(v.image_url)
    reviews = list(db.scalars(select(Review).where(Review.business_id == business.id, Review.product_id == p.id, Review.deleted_at.is_(None), Review.is_published.is_(True)).order_by(Review.created_at.desc()).limit(12)))
    rsum = db.execute(select(func.count(), func.avg(Review.rating)).where(Review.business_id == business.id, Review.product_id == p.id, Review.deleted_at.is_(None), Review.is_published.is_(True))).one()
    related_q = select(Product).where(Product.business_id == business.id, Product.deleted_at.is_(None), Product.status == "ACTIVE", Product.id != p.id)
    related = list(db.scalars((related_q.where(Product.category_id == p.category_id) if p.category_id else related_q.where(Product.featured.is_(True))).order_by(Product.position).limit(4)))
    if len(related) < 4:
        extra = list(db.scalars(related_q.where(Product.id.notin_([r.id for r in related])).order_by(Product.featured.desc(), Product.position).limit(4 - len(related))))
        related += extra
    desc = p.short_description or (p.description[:155] if p.description else f"{p.name} from {business.name}")
    ctx = _base(db, business, root, p.seo_title or p.name, description=p.seo_description or desc, canonical_path=f"/products/{p.slug}")
    ctx["seo"]["title"] = (p.seo_title or f"{p.name} — {business.name}")[:70]
    ctx["seo"]["og_image"] = (imgs[0] if imgs else ctx["seo"].get("og_image"))
    total = inv.product_total_stock(db, p)
    offer = {"@type": "Offer", "price": str(p.price), "priceCurrency": p.currency, "url": ctx["seo"]["canonical"],
             "availability": "https://schema.org/OutOfStock" if (total is not None and total <= 0) else "https://schema.org/InStock"}
    ld = {"@context": "https://schema.org", "@type": "Product", "name": p.name, "description": desc, "sku": p.sku, "image": imgs[:4] or None, "offers": offer,
          "brand": {"@type": "Brand", "name": business.name}}
    if rsum[0]:
        ld["aggregateRating"] = {"@type": "AggregateRating", "ratingValue": round(float(rsum[1]), 1), "reviewCount": rsum[0]}
    crumbs_ld = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Shop", "item": f"{ctx['urls']['profile']}/products"},
                                                                                                      {"@type": "ListItem", "position": 2, "name": p.name}]}
    ctx["seo"]["jsonld"] = _safe_json({k: v for k, v in ld.items() if v not in (None, [], {})})
    ctx["seo"]["jsonld_extra"] = _safe_json(crumbs_ld)
    vdata = [{"id": str(v.id), "title": v.title, "options": v.options, "price": float(v.price if v.price is not None else p.price),
              "compare": float(v.compare_at_price) if v.compare_at_price is not None else (float(p.compare_at_price) if p.compare_at_price is not None else None),
              "stock": (v.stock_qty if p.track_stock else None), "image": v.image_url} for v in variants]
    chain = []
    cur = category
    while cur is not None:
        chain.append({"name": cur.name, "url": f"{root}/categories/{cur.slug}"})
        cur = next((c for c in cats if c.id == cur.parent_id), None)
    ctx.update(product=p, images=imgs, variants=variants, vjson=_safe_json({"variants": vdata, "options": p.options or [], "stock": (p.stock_qty if p.track_stock else None),
                                                                           "price": float(p.price), "compare": float(p.compare_at_price) if p.compare_at_price else None}),
               category=category, crumbs=list(reversed(chain)), reviews=reviews, review_summary={"count": rsum[0], "average": round(float(rsum[1]), 1) if rsum[0] else 0},
               related=_cards(db, business, root, related), total_stock=total, low=bool(p.track_stock and total is not None and 0 < total <= p.low_stock_threshold),
               sold_out=bool(total is not None and total <= 0), review_token=review_token,
               share_url=ctx["seo"]["canonical"], share_wa=f"https://wa.me/?text={quote(p.name + ' — ' + ctx['seo']['canonical'])}",
               ask_wa=(ctx["wa"].split("?")[0] + "?text=" + quote(f"Hi {business.name}, I'm interested in {p.name}.")) if ctx["wa"] else None)
    return ctx


def service_detail(db: Session, business: Business, root: str, slug: str) -> dict:
    sv = db.scalars(select(Service).where(Service.business_id == business.id, Service.slug == slug, Service.deleted_at.is_(None), Service.is_active.is_(True))).first()
    if sv is None:
        return {}
    ctx = _base(db, business, root, sv.name, description=(sv.description or f"{sv.name} at {business.name}")[:155], canonical_path=f"/services/{sv.slug}")
    others = [x for x in ctx["services"] if x.id != sv.id][:4]
    from app.models import Staff, StaffService
    team = list(db.scalars(select(Staff).join(StaffService, StaffService.staff_id == Staff.id).where(StaffService.service_id == sv.id, Staff.business_id == business.id,
                                                                                                    Staff.is_active.is_(True), Staff.deleted_at.is_(None))))
    ld = {"@context": "https://schema.org", "@type": "Service", "name": sv.name, "description": sv.description or None, "provider": {"@type": "LocalBusiness", "name": business.name},
          "offers": {"@type": "Offer", "price": str(sv.price), "priceCurrency": sv.currency}}
    ctx["seo"]["jsonld"] = _safe_json({k: v for k, v in ld.items() if v})
    img = sv.image_url or ctx["product_images"].get(str(sv.id))
    ctx.update(service=sv, image=img, others=[{**service_card(o, ctx["product_images"].get(str(o.id)), ctx["wa_services"].get(str(o.id))), "url": f"{root}/services/{o.slug}" if o.slug else None} for o in others],
               team=team, wa_service=ctx["wa_services"].get(str(sv.id)))
    return ctx


def search_page(db: Session, business: Business, root: str, q: str) -> dict:
    q = q.strip()[:80]
    ctx = _base(db, business, root, f"Search: {q}" if q else "Search", canonical_path="/search", noindex=True)
    like = f"%{q}%"
    products, services, cats = [], [], []
    if q:
        products = list(db.scalars(select(Product).where(Product.business_id == business.id, Product.deleted_at.is_(None), Product.status == "ACTIVE",
                                                          or_(Product.name.ilike(like), Product.short_description.ilike(like), Product.sku.ilike(like))).order_by(Product.position).limit(24)))
        services = [s for s in ctx["services"] if q.lower() in s.name.lower() or q.lower() in (s.description or "").lower()][:12]
        cats = [c for c in _cats(db, business) if q.lower() in c.name.lower()][:6]
    popular = list(db.scalars(select(Product).where(Product.business_id == business.id, Product.deleted_at.is_(None), Product.status == "ACTIVE")
                              .order_by(Product.featured.desc(), Product.position).limit(4)))
    ctx.update(q=q, pcards=_cards(db, business, root, products), scards=[{**service_card(s, ctx["product_images"].get(str(s.id)), ctx["wa_services"].get(str(s.id))),
                                                                     "url": f"{root}/services/{s.slug}" if s.slug else None} for s in services],
               ccards=[{"name": c.name, "url": f"{root}/categories/{c.slug}"} for c in cats], popular=_cards(db, business, root, popular))
    return ctx


def checkout(db: Session, business: Business, root: str) -> dict:
    ctx = _base(db, business, root, "Checkout", canonical_path="/checkout", noindex=True)
    ctx["checkout_cfg"] = _safe_json(store_cfg.public_config(business, db))
    return ctx


def order_page(db: Session, business: Business, root: str, token: str) -> dict:
    o = db.scalars(select(Order).where(Order.business_id == business.id, Order.token == token)).first()
    if o is None:
        return {}
    ctx = _base(db, business, root, f"Order #{o.number}", canonical_path=f"/order/{token}", noindex=True)
    pm = next((m for m in store_cfg.enabled_payments(business, db) if m["method"] == o.payment_method), None)
    cur = o.currency
    lines = [f"• {i.quantity}× {i.name}{' (' + i.variant_title + ')' if i.variant_title else ''} — {cur} {i.line_total:,.0f}" for i in o.items]
    parts = [f"Hi {business.name}, I just placed order #{o.number}.", "", *lines, ""]
    if o.discount:
        parts.append(f"Discount: -{cur} {o.discount:,.0f}")
    if o.delivery_fee:
        parts.append(f"Delivery: {cur} {o.delivery_fee:,.0f}")
    parts.append(f"Total: {cur} {o.total:,.0f}")
    parts.append(f"Delivery to: {o.address}" if o.delivery_method == "DELIVERY" and o.address else "Pickup")
    if o.scheduled_for:
        parts.append("When: " + o.scheduled_for.replace("T", " "))
    if o.notes:
        parts.append(f"Notes: {o.notes}")
    parts += [f"Name: {o.customer_name}", f"Track: {root}/order/{o.token}"]
    msg = "\n".join(parts)
    online = o.payment_method in ("ONLINE", "MPESA") and bool(o.payment_provider or (pm and pm.get("gateway")))
    ctx.update(can_pay_online=online and o.payment_status != "PAID" and o.status not in ("CANCELLED", "REFUNDED"), order=o, status_text=order_svc.STATUS_TEXT, timeline=[e for e in o.events if e.kind != "NOTE"], pay_info=pm,
               order_wa=(ctx["wa"].split("?")[0] + "?text=" + quote(msg)) if ctx["wa"] else None, thank_you=store_cfg.get(business)["thank_you"],
               pickup_note=store_cfg.get(business)["pickup_note"], can_add_ref=o.payment_method in ("MPESA", "BANK") and not o.payment_provider and o.payment_status != "PAID" and o.status not in ("CANCELLED", "REFUNDED"))
    return ctx
