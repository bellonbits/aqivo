import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import TenantContext, require, require_feature
from app.api.helpers import log
from app.core.db import get_db
from app.core.errors import bad_request, not_found, upgrade_required
from app.models import Template
from app.schemas.catalog import NavigationIn, PageIn, PageUpdate, SectionAdd, SectionOrder, SectionUpdate, SeoUpdate, TemplateChange
from app.services import sections as sec_engine
from app.services import website as ws
from app.services.business import business_urls
from app.services.notifications import notify
from app.services.plans import has_feature
from app.services.site_render import render_business

router = APIRouter(prefix="/websites", tags=["websites"])
templates_router = APIRouter(prefix="/templates", tags=["templates"])


def _section_out(s) -> dict:
    return {"id": str(s.id), "page_id": str(s.page_id) if s.page_id else None, "type": s.type, "position": s.position, "enabled": s.enabled, "settings": s.content or {}, "styles": s.styles or {}}


def _page_out(p) -> dict:
    return {"id": str(p.id), "slug": p.slug, "title": p.title, "is_home": p.is_home, "enabled": p.enabled, "position": p.position, "seo_title": p.seo_title,
            "seo_description": p.seo_description, "published": p.published is not None}


def _site_out(db, site) -> dict:
    pages = ws.pages_of(db, site)
    return {"pages": [_page_out(p) for p in pages], "navigation": site.navigation or ws.default_navigation(pages), "navigation_custom": bool(site.navigation),
            **_site_core(site)}


def _site_core(site) -> dict:
    return {"id": str(site.id), "status": site.status, "published_at": site.published_at, "has_unpublished_changes": site.has_unpublished_changes,
            "seo_title": site.seo_title, "seo_description": site.seo_description, "og_image": site.og_image,
            "template": {"key": site.template.key, "name": site.template.name, "layout": (site.template.theme or {}).get("layout", "classic"), "theme": site.template.theme},
            "theme_overrides": site.theme_overrides or {}, "settings": site.settings or {},
            "style_options": {"fonts": list(ws.FONTS), "hero_layouts": list(ws.HERO_LAYOUTS), "radii": list(ws.RADII)},
            "sections": [_section_out(s) for s in site.sections]}


def _site(db, ctx):
    site = ws.get_website(db, ctx.business.id)
    if not site:
        raise not_found("Website")
    return site


@router.get("/me")
def get_site(ctx: TenantContext = Depends(require("website:read")), db: Session = Depends(get_db)):
    return _site_out(db, _site(db, ctx))


def _data_availability(db, ctx) -> dict:
    from app.services.plans import has_feature
    b = ctx.business
    # Data-driven sections are always addable: they fill in as the owner adds products, photos and reviews.
    from app.services import connections as cx
    return {"products": True, "services": True, "gallery": True, "staff": True, "reviews": True, "map": True, "instagram": cx.connected(db, b, "instagram"), "google": cx.connected(db, b, "google_places"),
            "bookings": has_feature(db, b, "bookings"), "leads": has_feature(db, b, "leads")}


@router.get("/me/registry")
def registry(ctx: TenantContext = Depends(require("website:read")), db: Session = Depends(get_db)):
    """Section types, their editable fields, and which are usable on this plan (drives the editor)."""
    return sec_engine.registry_json(_data_availability(db, ctx))


@router.post("/me/sections", status_code=201)
def add_section(body: SectionAdd, request: Request, ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    site = _site(db, ctx)
    sec = ws.add_section(db, site, ctx.business, body.type, after_id=body.after_id, page_id=body.page_id, settings=body.settings)
    log(ctx, "website.section_added", request, "website", site.id, section=body.type)
    db.commit()
    return {**_site_out(db, site), "added_id": str(sec.id)}


@router.patch("/me/sections/{section_id}")
def update_section(section_id: uuid.UUID, body: SectionUpdate, request: Request, ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    site = _site(db, ctx)
    ws.update_section(db, site, section_id, content=body.settings, styles=body.styles, enabled=body.enabled)
    log(ctx, "website.section_updated", request, "website", site.id, section=str(section_id))
    db.commit()
    return _site_out(db, site)


@router.delete("/me/sections/{section_id}")
def delete_section(section_id: uuid.UUID, request: Request, ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    site = _site(db, ctx)
    ws.delete_section(db, site, section_id)
    log(ctx, "website.section_deleted", request, "website", site.id, section=str(section_id))
    db.commit()
    return _site_out(db, site)


@router.post("/me/sections/{section_id}/duplicate", status_code=201)
def duplicate_section(section_id: uuid.UUID, ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    site = _site(db, ctx)
    sec = ws.duplicate_section(db, site, section_id)
    db.commit()
    return {**_site_out(db, site), "added_id": str(sec.id)}


@router.put("/me/order")
def reorder(body: SectionOrder, request: Request, ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    site = _site(db, ctx)
    ws.reorder_sections(db, site, body.order, body.page_id)
    db.commit()
    return _site_out(db, site)


@router.post("/me/pages", status_code=201)
def create_page(body: PageIn, request: Request, ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    site = _site(db, ctx)
    pg = ws.create_page(db, site, ctx.business, body.title, body.template)
    log(ctx, "website.page_created", request, "website", site.id, page=pg.slug)
    db.commit()
    return {**_site_out(db, site), "added_id": str(pg.id)}


@router.patch("/me/pages/{page_id}")
def update_page(page_id: uuid.UUID, body: PageUpdate, request: Request, ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    site = _site(db, ctx)
    data = body.model_dump(exclude_unset=True)
    ws.update_page(db, site, page_id, title=data.get("title"), slug=data.get("slug"), enabled=data.get("enabled"), seo_title=data.get("seo_title"),
                   seo_description=data.get("seo_description"), fields=set(data))
    db.commit()
    return _site_out(db, site)


@router.delete("/me/pages/{page_id}")
def delete_page(page_id: uuid.UUID, request: Request, ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    site = _site(db, ctx)
    ws.delete_page(db, site, page_id)
    log(ctx, "website.page_deleted", request, "website", site.id)
    db.commit()
    return _site_out(db, site)


@router.put("/me/navigation")
def set_navigation(body: NavigationIn, ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    site = _site(db, ctx)
    ws.set_navigation(db, site, body.items)
    db.commit()
    return _site_out(db, site)


@router.delete("/me/navigation")
def reset_navigation(ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    site = _site(db, ctx)
    site.navigation = []
    ws.touch_draft(site)
    db.commit()
    return _site_out(db, site)


@router.post("/me/regenerate")
def regenerate(request: Request, ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    """Rebuild the storefront from the business's current data. Replaces the owner's sections."""
    site = ws.regenerate(db, _site(db, ctx), ctx.business)
    log(ctx, "website.regenerated", request, "website", site.id)
    db.commit()
    return _site_out(db, site)


@router.patch("/me/seo")
def seo(body: SeoUpdate, ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    site = _site(db, ctx)
    data = body.model_dump(exclude_unset=True)
    if "og_image" in data:
        if not has_feature(db, ctx.business, "seo_tools"):
            raise upgrade_required("seo_tools", "A custom social image is part of the Grow plan and above.")
        if data["og_image"] and not str(data["og_image"]).startswith(("/", "https://")):
            raise bad_request("Choose an image from your library")
    for k, v in data.items():
        setattr(site, k, (v or None))
    ws.touch_draft(site)
    db.commit()
    return _site_out(db, site)


class StyleUpdate(BaseModel):
    theme: dict | None = None
    settings: dict | None = None


@router.patch("/me/style")
def style(body: StyleUpdate, request: Request, ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    site = _site(db, ctx)
    ws.update_style(db, site, theme=body.theme, settings=body.settings)
    log(ctx, "website.style_updated", request, "website", site.id)
    db.commit()
    return _site_out(db, site)


@router.delete("/me/style", status_code=200)
def reset_style(ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    site = _site(db, ctx)
    site.theme_overrides = {}
    ws.touch_draft(site)
    db.commit()
    return _site_out(db, site)


@router.post("/me/template")
def change_template(body: TemplateChange, request: Request, ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    site = _site(db, ctx)
    ws.change_template(db, site, ctx.business, body.template_key)
    log(ctx, "website.template_changed", request, "website", site.id, template=body.template_key)
    db.commit()
    return _site_out(db, site)


@router.get("/me/preview", response_class=HTMLResponse)
def preview(template: str | None = None, edit: bool = False, page: uuid.UUID | None = None, ctx: TenantContext = Depends(require_feature("website", "website:read")), db: Session = Depends(get_db)):
    """Draft render (what has been saved). With ?template= it shows the owner's own business in another design before they switch."""
    headers = {"X-Robots-Tag": "noindex", "Cache-Control": "no-store"}
    if template:
        from app.services.site_render import render as render_tpl, template_preview_context
        tpl = db.scalars(select(Template).where(Template.key == template, Template.is_active.is_(True))).first()
        if not tpl:
            raise not_found("Template")
        c = template_preview_context(db, ctx.business, tpl)
        c["draft"], c["no_track"] = True, True
        return HTMLResponse(render_tpl("site.html", **c), headers=headers)
    pg = ws.get_page(db, _site(db, ctx), page) if page else None
    return HTMLResponse(render_business(db, ctx.business, draft=True, editing=edit, page=pg if pg and not pg.is_home else None, root="" if edit else None), headers=headers)


@router.post("/me/publish")
def publish(request: Request, ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    if not ctx.can("*") and not ctx.can("website:read"):
        raise HTTPException(403, "Not allowed")
    b = ctx.business
    if not b.name or not (b.phone or b.whatsapp):
        raise bad_request("Add your business name and a phone or WhatsApp number before publishing")
    first = _site(db, ctx).status != "PUBLISHED"
    site = ws.publish(db, _site(db, ctx))
    log(ctx, "website.published", request, "website", site.id)
    if first:
        notify(db, "website_published", b.email, business_id=b.id, business=b.name, url=business_urls(b)["profile"])
    db.commit()
    return _site_out(db, site)


@router.post("/me/unpublish")
def unpublish(request: Request, ctx: TenantContext = Depends(require_feature("website", "website:write")), db: Session = Depends(get_db)):
    site = ws.unpublish(db, _site(db, ctx))
    log(ctx, "website.unpublished", request, "website", site.id)
    db.commit()
    return _site_out(db, site)


# ---- template catalogue (public) -----------------------------------------
@templates_router.get("")
def list_templates(db: Session = Depends(get_db)):
    rows = db.scalars(select(Template).where(Template.is_active.is_(True)).order_by(Template.created_at))
    return [{"key": t.key, "name": t.name, "industry": t.industry, "description": t.description, "features": t.features, "theme": t.theme,
             "preview_url": f"/api/v1/templates/{t.key}/preview"} for t in rows]


@templates_router.get("/{key}/preview", response_class=HTMLResponse)
def template_preview(key: str, db: Session = Depends(get_db)):
    from app.models import Business
    from app.services.site_render import render, template_preview_context
    tpl = db.scalars(select(Template).where(Template.key == key, Template.is_active.is_(True))).first()
    if not tpl:
        raise not_found("Template")
    demo = db.scalars(select(Business).where(Business.is_demo.is_(True), Business.industry == tpl.industry).order_by(Business.created_at)).first()
    if not demo:
        raise not_found("Demo business")
    ctx = template_preview_context(db, demo, tpl)
    return HTMLResponse(render("site.html", **ctx), headers={"X-Frame-Options": "SAMEORIGIN"})
