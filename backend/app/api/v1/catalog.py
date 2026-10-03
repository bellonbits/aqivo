import uuid

from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import TenantContext, require, require_feature
from app.api.helpers import log
from app.core.countries import normalize_phone
from app.core.db import get_db
from app.core.errors import bad_request, not_found, or404, upgrade_required
from app.models import Service, StaffService
from app.repositories import (GalleryRepository, ServiceCategoryRepository, ServiceRepository, StaffRepository, TestimonialRepository)
from app.schemas.catalog import (CategoryIn, CategoryOut, GalleryOut, GalleryUpdate, ReorderIn, ServiceIn, ServiceOut, ServiceUpdate, StaffIn,
                                 StaffOut, TestimonialIn, TestimonialOut)
from app.services import catalog as cat_svc
from app.services.images import process_upload
from app.services.plans import check_limit, effective_plan, has_feature
from app.services.website import touch_draft

services_router = APIRouter(prefix="/services", tags=["services"])
gallery_router = APIRouter(prefix="/gallery", tags=["gallery"])
staff_router = APIRouter(prefix="/staff", tags=["staff"])
testimonials_router = APIRouter(prefix="/testimonials", tags=["testimonials"])

FREE_SERVICE_LIMIT = 10
FREE_GALLERY_LIMIT = 6
PAID_GALLERY_LIMIT = 40


def _dirty(ctx: TenantContext) -> None:
    if ctx.business.website:
        touch_draft(ctx.business.website)


# ----- services ----------------------------------------------------------
@services_router.get("", response_model=list[ServiceOut])
def list_services(ctx: TenantContext = Depends(require("services:read")), db: Session = Depends(get_db)):
    return ServiceRepository(db, ctx.business_id).list(order_by=[Service.position, Service.created_at])


@services_router.post("", response_model=ServiceOut, status_code=201)
def create_service(body: ServiceIn, request: Request, ctx: TenantContext = Depends(require("services:write")), db: Session = Depends(get_db)):
    repo = ServiceRepository(db, ctx.business_id)
    check_limit(db, ctx.business, "services", repo.count())
    _check_category(db, ctx, body.category_id)
    pos = (db.scalar(select(func.max(Service.position)).where(Service.business_id == ctx.business_id)) or 0) + 1
    s = repo.add(**body.model_dump(), currency=ctx.business.currency, position=pos, slug=cat_svc.unique_service_slug(db, ctx.business_id, body.name))
    _dirty(ctx)
    log(ctx, "service.created", request, "service", s.id)
    db.commit()
    return s


def _check_category(db, ctx, category_id):
    if category_id and not ServiceCategoryRepository(db, ctx.business_id).get(category_id):
        raise bad_request("Unknown category")


@services_router.patch("/{service_id}", response_model=ServiceOut)
def update_service(service_id: uuid.UUID, body: ServiceUpdate, request: Request, ctx: TenantContext = Depends(require("services:write")), db: Session = Depends(get_db)):
    repo = ServiceRepository(db, ctx.business_id)
    s = or404(repo.get(service_id), "Service")
    data = body.model_dump(exclude_unset=True)
    _check_category(db, ctx, data.get("category_id"))
    if data.get("name") and data["name"] != s.name or not s.slug:
        data["slug"] = cat_svc.unique_service_slug(db, ctx.business_id, data.get("name") or s.name, exclude_id=s.id)
    repo.update(s, **data)
    _dirty(ctx)
    log(ctx, "service.updated", request, "service", s.id)
    db.commit()
    return s


@services_router.delete("/{service_id}", status_code=204)
def delete_service(service_id: uuid.UUID, request: Request, ctx: TenantContext = Depends(require("services:write")), db: Session = Depends(get_db)):
    repo = ServiceRepository(db, ctx.business_id)
    s = or404(repo.get(service_id), "Service")
    repo.delete(s)
    _dirty(ctx)
    log(ctx, "service.deleted", request, "service", s.id)
    db.commit()


@services_router.put("/order", status_code=204)
def reorder_services(body: ReorderIn, ctx: TenantContext = Depends(require("services:write")), db: Session = Depends(get_db)):
    repo = ServiceRepository(db, ctx.business_id)
    for i, sid in enumerate(body.ids):
        s = repo.get(sid)
        if s:
            s.position = i
    _dirty(ctx)
    db.commit()


@services_router.post("/{service_id}/image", response_model=ServiceOut)
async def service_image(service_id: uuid.UUID, file: UploadFile = File(...), ctx: TenantContext = Depends(require("services:write")), db: Session = Depends(get_db)):
    repo = ServiceRepository(db, ctx.business_id)
    s = or404(repo.get(service_id), "Service")
    res = await process_upload(file, ctx.business_id, "services")
    s.image_url = res["thumb_url"]
    _dirty(ctx)
    db.commit()
    return s


@services_router.get("/categories", response_model=list[CategoryOut])
def list_categories(ctx: TenantContext = Depends(require("services:read")), db: Session = Depends(get_db)):
    from app.models import ServiceCategory
    return ServiceCategoryRepository(db, ctx.business_id).list(order_by=ServiceCategory.position)


@services_router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(body: CategoryIn, ctx: TenantContext = Depends(require("services:write")), db: Session = Depends(get_db)):
    repo = ServiceCategoryRepository(db, ctx.business_id)
    c = repo.add(name=body.name, position=repo.count())
    db.commit()
    return c


@services_router.delete("/categories/{cid}", status_code=204)
def delete_category(cid: uuid.UUID, ctx: TenantContext = Depends(require("services:write")), db: Session = Depends(get_db)):
    repo = ServiceCategoryRepository(db, ctx.business_id)
    c = or404(repo.get(cid), "Category")
    repo.delete(c)
    db.commit()


# ----- gallery -----------------------------------------------------------
@gallery_router.get("", response_model=list[GalleryOut])
def list_gallery(ctx: TenantContext = Depends(require("business:read")), db: Session = Depends(get_db)):
    from app.models import GalleryImage
    return GalleryRepository(db, ctx.business_id).list(order_by=[GalleryImage.position, GalleryImage.created_at])


@gallery_router.post("", response_model=GalleryOut, status_code=201)
async def upload_gallery(request: Request, file: UploadFile = File(...), ctx: TenantContext = Depends(require("gallery:write")), db: Session = Depends(get_db)):
    repo = GalleryRepository(db, ctx.business_id)
    check_limit(db, ctx.business, "gallery", repo.count())
    res = await process_upload(file, ctx.business_id, "gallery")
    g = repo.add(url=res["medium_url"], thumb_url=res["thumb_url"], width=res["width"], height=res["height"], position=repo.count())
    _dirty(ctx)
    log(ctx, "gallery.uploaded", request, "gallery_image", g.id)
    db.commit()
    return g


@gallery_router.patch("/{gid}", response_model=GalleryOut)
def caption(gid: uuid.UUID, body: GalleryUpdate, ctx: TenantContext = Depends(require("gallery:write")), db: Session = Depends(get_db)):
    repo = GalleryRepository(db, ctx.business_id)
    g = or404(repo.get(gid), "Photo")
    g.caption = body.caption
    _dirty(ctx)
    db.commit()
    return g


@gallery_router.delete("/{gid}", status_code=204)
def delete_gallery(gid: uuid.UUID, request: Request, ctx: TenantContext = Depends(require("gallery:write")), db: Session = Depends(get_db)):
    repo = GalleryRepository(db, ctx.business_id)
    g = or404(repo.get(gid), "Photo")
    repo.delete(g)
    _dirty(ctx)
    log(ctx, "gallery.deleted", request, "gallery_image", gid)
    db.commit()


@gallery_router.put("/order", status_code=204)
def reorder_gallery(body: ReorderIn, ctx: TenantContext = Depends(require("gallery:write")), db: Session = Depends(get_db)):
    repo = GalleryRepository(db, ctx.business_id)
    for i, gid in enumerate(body.ids):
        g = repo.get(gid)
        if g:
            g.position = i
    _dirty(ctx)
    db.commit()


# ----- testimonials (owner-curated) ---------------------------------------
@testimonials_router.get("", response_model=list[TestimonialOut])
def list_testimonials(ctx: TenantContext = Depends(require("business:read")), db: Session = Depends(get_db)):
    from app.models import Testimonial
    return TestimonialRepository(db, ctx.business_id).list(order_by=Testimonial.position)


@testimonials_router.post("", response_model=TestimonialOut, status_code=201)
def add_testimonial(body: TestimonialIn, ctx: TenantContext = Depends(require("services:write")), db: Session = Depends(get_db)):
    repo = TestimonialRepository(db, ctx.business_id)
    t = repo.add(author=body.author, quote=body.quote, position=repo.count())
    _dirty(ctx)
    db.commit()
    return t


@testimonials_router.delete("/{tid}", status_code=204)
def delete_testimonial(tid: uuid.UUID, ctx: TenantContext = Depends(require("services:write")), db: Session = Depends(get_db)):
    repo = TestimonialRepository(db, ctx.business_id)
    t = or404(repo.get(tid), "Testimonial")
    repo.delete(t)
    _dirty(ctx)
    db.commit()


# ----- staff ----------------------------------------------------------------
def _staff_out(db, s) -> StaffOut:
    ids = list(db.scalars(select(StaffService.service_id).where(StaffService.staff_id == s.id)))
    out = StaffOut.model_validate(s)
    out.service_ids = ids
    return out


def _set_staff_services(db, ctx, staff, service_ids):
    valid = {s.id for s in ServiceRepository(db, ctx.business_id).list()}
    if not set(service_ids) <= valid:
        raise bad_request("Unknown service")
    for row in db.scalars(select(StaffService).where(StaffService.staff_id == staff.id)):
        db.delete(row)
    db.flush()
    for sid in service_ids:
        db.add(StaffService(business_id=ctx.business_id, staff_id=staff.id, service_id=sid))
    db.flush()


@staff_router.get("", response_model=list[StaffOut])
def list_staff(ctx: TenantContext = Depends(require("staff:read")), db: Session = Depends(get_db)):
    return [_staff_out(db, s) for s in StaffRepository(db, ctx.business_id).list(order_by=None)]


@staff_router.post("", response_model=StaffOut, status_code=201)
def create_staff(body: StaffIn, request: Request, ctx: TenantContext = Depends(require_feature("staff", "staff:write")), db: Session = Depends(get_db)):
    from app.services.hours import validate_hours
    try:
        hours = validate_hours(body.working_hours) if body.working_hours else {}
        phone = normalize_phone(body.phone, ctx.business.country_code) if body.phone else None
    except ValueError as e:
        raise bad_request(str(e))
    s = StaffRepository(db, ctx.business_id).add(name=body.name, phone=phone, working_hours=hours, is_active=body.is_active)
    _set_staff_services(db, ctx, s, body.service_ids)
    log(ctx, "staff.created", request, "staff", s.id)
    db.commit()
    return _staff_out(db, s)


@staff_router.put("/{sid}", response_model=StaffOut)
def update_staff(sid: uuid.UUID, body: StaffIn, request: Request, ctx: TenantContext = Depends(require_feature("staff", "staff:write")), db: Session = Depends(get_db)):
    from app.services.hours import validate_hours
    repo = StaffRepository(db, ctx.business_id)
    s = or404(repo.get(sid), "Staff member")
    try:
        s.working_hours = validate_hours(body.working_hours) if body.working_hours else {}
        s.phone = normalize_phone(body.phone, ctx.business.country_code) if body.phone else None
    except ValueError as e:
        raise bad_request(str(e))
    s.name, s.is_active = body.name, body.is_active
    _set_staff_services(db, ctx, s, body.service_ids)
    log(ctx, "staff.updated", request, "staff", s.id)
    db.commit()
    return _staff_out(db, s)


@staff_router.delete("/{sid}", status_code=204)
def delete_staff(sid: uuid.UUID, request: Request, ctx: TenantContext = Depends(require_feature("staff", "staff:write")), db: Session = Depends(get_db)):
    repo = StaffRepository(db, ctx.business_id)
    s = or404(repo.get(sid), "Staff member")
    repo.delete(s)
    log(ctx, "staff.deleted", request, "staff", sid)
    db.commit()


@staff_router.post("/{sid}/photo", response_model=StaffOut)
async def staff_photo(sid: uuid.UUID, file: UploadFile = File(...), ctx: TenantContext = Depends(require_feature("staff", "staff:write")), db: Session = Depends(get_db)):
    s = or404(StaffRepository(db, ctx.business_id).get(sid), "Staff member")
    res = await process_upload(file, ctx.business_id, "staff")
    s.photo_url = res["thumb_url"]
    _dirty(ctx)
    db.commit()
    return _staff_out(db, s)
