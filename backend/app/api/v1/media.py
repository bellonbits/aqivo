import uuid

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import TenantContext, require
from app.api.helpers import log
from app.core.db import get_db
from app.core.errors import bad_request, or404
from app.models import MediaAsset
from app.repositories.base import TenantRepository
from app.schemas.common import ORM, Page
from app.services.images import process_upload
from app.services.plans import check_limit

router = APIRouter(prefix="/media", tags=["media"])
FOLDERS = ("storefront", "products", "services", "logo", "gallery")
MAX_ASSETS = 500


class MediaRepository(TenantRepository[MediaAsset]):
    model = MediaAsset


class MediaOut(ORM):
    id: uuid.UUID
    folder: str
    name: str
    url: str
    large_url: str | None
    thumb_url: str | None
    width: int | None
    height: int | None
    size_bytes: int


class MediaUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    folder: str | None = None


@router.get("", response_model=Page[MediaOut])
def list_media(folder: str | None = None, q: str | None = None, limit: int = Query(60, ge=1, le=200), offset: int = Query(0, ge=0),
               ctx: TenantContext = Depends(require("products:read")), db: Session = Depends(get_db)):
    where = [MediaAsset.business_id == ctx.business_id]
    if folder:
        where.append(MediaAsset.folder == folder)
    if q:
        where.append(MediaAsset.name.ilike(f"%{q.strip()}%"))
    total = db.scalar(select(func.count()).select_from(MediaAsset).where(*where)) or 0
    items = db.scalars(select(MediaAsset).where(*where).order_by(MediaAsset.created_at.desc()).limit(limit).offset(offset)).all()
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("", response_model=MediaOut, status_code=201)
async def upload_media(request: Request, file: UploadFile = File(...), folder: str = Form("storefront"),
                       ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    if folder not in FOLDERS:
        raise bad_request("Unknown folder")
    repo = MediaRepository(db, ctx.business_id)
    if repo.count() >= MAX_ASSETS:
        raise bad_request(f"Your media library is full ({MAX_ASSETS} images). Delete some to add more.")
    check_limit(db, ctx.business, "media", repo.count())
    res = await process_upload(file, ctx.business_id, folder)
    name = (file.filename or "image").rsplit(".", 1)[0][:160] or "image"
    a = repo.add(folder=folder, name=name, url=res["medium_url"], large_url=res["url"], thumb_url=res["thumb_url"], width=res["width"], height=res["height"], size_bytes=res["bytes"])
    log(ctx, "media.uploaded", request, "media", a.id)
    db.commit()
    return a


@router.patch("/{asset_id}", response_model=MediaOut)
def update_media(asset_id: uuid.UUID, body: MediaUpdate, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    repo = MediaRepository(db, ctx.business_id)
    a = or404(repo.get(asset_id), "Image")
    data = body.model_dump(exclude_unset=True)
    if data.get("folder") is not None and data["folder"] not in FOLDERS:
        raise bad_request("Unknown folder")
    repo.update(a, **{k: v for k, v in data.items() if v is not None})
    db.commit()
    return a


@router.delete("/{asset_id}", status_code=204)
def delete_media(asset_id: uuid.UUID, request: Request, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    repo = MediaRepository(db, ctx.business_id)
    a = or404(repo.get(asset_id), "Image")
    repo.delete(a)  # the file stays on disk so pages that already use it don't break
    log(ctx, "media.deleted", request, "media", a.id)
    db.commit()
