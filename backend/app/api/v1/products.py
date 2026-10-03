import uuid

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import TenantContext, require
from app.api.helpers import log
from app.core.db import get_db
from app.core.errors import bad_request, or404, upgrade_required
from app.models import Collection, CollectionProduct, Product, ServiceCategory
from app.repositories import ServiceCategoryRepository
from app.repositories.base import TenantRepository
from app.schemas.catalog import ReorderIn
from app.schemas.common import Page
from app.schemas.products import CategoryIn2, CategoryOut2, CategoryUpdate, ProductIn, ProductOut, ProductUpdate
from app.services import catalog as cat
from app.services import collections as coll_svc
from app.services import inventory as inv
from app.services.images import process_upload
from app.services.plans import check_limit
from app.services.website import touch_draft

router = APIRouter(prefix="/products", tags=["products"])
categories_router = APIRouter(prefix="/categories", tags=["categories"])

MAX_PRODUCT_IMAGES = 12


class ProductRepository(TenantRepository[Product]):
    model = Product


def _out(db: Session, p: Product) -> ProductOut:
    o = ProductOut.model_validate(p)
    vs = inv.active_variants(db, p)
    o.variant_count = len(vs)
    o.total_stock = inv.product_total_stock(db, p)
    return o


def _dirty(ctx: TenantContext) -> None:
    if ctx.business.website:
        touch_draft(ctx.business.website)


def _check_category(db, ctx, category_id) -> None:
    if category_id and not ServiceCategoryRepository(db, ctx.business_id).get(category_id):
        raise bad_request("Unknown category")


# ------------------------------------------------------------------ products
@router.get("", response_model=Page[ProductOut])
def list_products(q: str | None = None, category_id: uuid.UUID | None = None, status: str | None = None, featured: bool | None = None,
                  low_stock: bool = False, limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
                  ctx: TenantContext = Depends(require("products:read")), db: Session = Depends(get_db)):
    where = [Product.business_id == ctx.business_id, Product.deleted_at.is_(None)]
    if q:
        like = f"%{q.strip()}%"
        where.append(or_(Product.name.ilike(like), Product.sku.ilike(like)))
    if category_id:
        where.append(Product.category_id.in_(cat.descendant_ids(db, ctx.business_id, category_id)))
    if status:
        where.append(Product.status == status.upper())
    if featured is not None:
        where.append(Product.featured.is_(featured))
    if low_stock:
        where.append(Product.track_stock.is_(True))
        where.append(Product.stock_qty <= Product.low_stock_threshold)
    total = db.scalar(select(func.count()).select_from(Product).where(*where)) or 0
    items = db.scalars(select(Product).where(*where).order_by(Product.position, Product.created_at.desc()).limit(limit).offset(offset)).all()
    return {"items": [_out(db, p) for p in items], "total": total, "limit": limit, "offset": offset}


@router.post("", response_model=ProductOut, status_code=201)
def create_product(body: ProductIn, request: Request, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    repo = ProductRepository(db, ctx.business_id)
    check_limit(db, ctx.business, "products", repo.count())
    _check_category(db, ctx, body.category_id)
    data = body.model_dump()
    if data.get("compare_at_price") is not None and data["compare_at_price"] <= data["price"]:
        data["compare_at_price"] = None  # a "was" price only makes sense when it is higher
    pos = (db.scalar(select(func.max(Product.position)).where(Product.business_id == ctx.business_id)) or 0) + 1
    qty = data.pop("stock_qty", 0)
    p = repo.add(**data, stock_qty=0, slug=cat.unique_product_slug(db, ctx.business_id, body.name), currency=ctx.business.currency, position=pos)
    if p.track_stock and qty:
        inv.adjust_stock(db, p, None, qty, "INITIAL", note="Opening stock", user_id=ctx.user.id)
    _dirty(ctx)
    log(ctx, "product.created", request, "product", p.id)
    db.commit()
    return _out(db, p)


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: uuid.UUID, ctx: TenantContext = Depends(require("products:read")), db: Session = Depends(get_db)):
    return _out(db, or404(ProductRepository(db, ctx.business_id).get(product_id), "Product"))


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(product_id: uuid.UUID, body: ProductUpdate, request: Request, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    repo = ProductRepository(db, ctx.business_id)
    p = or404(repo.get(product_id), "Product")
    data = body.model_dump(exclude_unset=True)
    if "category_id" in data:
        _check_category(db, ctx, data["category_id"])
    if data.get("name") and data["name"] != p.name:
        data["slug"] = cat.unique_product_slug(db, ctx.business_id, data["name"], exclude_id=p.id)
    price = data.get("price", p.price)
    if "compare_at_price" in data and data["compare_at_price"] is not None and data["compare_at_price"] <= price:
        data["compare_at_price"] = None
    for k in ("name", "price", "status", "images", "tags"):
        if k in data and data[k] is None:
            data.pop(k)
    new_qty = data.pop("stock_qty", None)
    was_tracked = p.track_stock
    repo.update(p, **data)
    if new_qty is not None and p.track_stock and not inv.active_variants(db, p) and (new_qty != p.stock_qty or not was_tracked):
        inv.adjust_stock(db, p, None, new_qty - p.stock_qty, "INITIAL" if not was_tracked else "ADJUSTMENT", note="Edited in product", user_id=ctx.user.id)
    _dirty(ctx)
    log(ctx, "product.updated", request, "product", p.id)
    db.commit()
    return _out(db, p)


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: uuid.UUID, request: Request, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    repo = ProductRepository(db, ctx.business_id)
    p = or404(repo.get(product_id), "Product")
    repo.delete(p)
    _dirty(ctx)
    log(ctx, "product.deleted", request, "product", p.id)
    db.commit()


@router.put("/order/set", status_code=204)
def reorder_products(body: ReorderIn, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    repo = ProductRepository(db, ctx.business_id)
    for i, pid in enumerate(body.ids):
        p = repo.get(pid)
        if p:
            p.position = i
    _dirty(ctx)
    db.commit()


@router.post("/{product_id}/images", response_model=ProductOut)
async def add_product_image(product_id: uuid.UUID, file: UploadFile = File(...), ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    repo = ProductRepository(db, ctx.business_id)
    p = or404(repo.get(product_id), "Product")
    if len(p.images or []) >= MAX_PRODUCT_IMAGES:
        raise bad_request(f"A product can have up to {MAX_PRODUCT_IMAGES} photos")
    res = await process_upload(file, ctx.business_id, "products")
    p.images = [*(p.images or []), res["medium_url"]]
    _dirty(ctx)
    db.commit()
    return _out(db, p)


@router.delete("/{product_id}/images", response_model=ProductOut)
def remove_product_image(product_id: uuid.UUID, index: int = Query(..., ge=0), ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    repo = ProductRepository(db, ctx.business_id)
    p = or404(repo.get(product_id), "Product")
    imgs = list(p.images or [])
    if index >= len(imgs):
        raise bad_request("No such photo")
    imgs.pop(index)
    p.images = imgs
    _dirty(ctx)
    db.commit()
    return _out(db, p)


# ---------------------------------------------------------------- categories
@categories_router.get("", response_model=list[CategoryOut2])
def list_categories(ctx: TenantContext = Depends(require("products:read")), db: Session = Depends(get_db)):
    return ServiceCategoryRepository(db, ctx.business_id).list(order_by=[ServiceCategory.position, ServiceCategory.created_at])


@categories_router.post("", response_model=CategoryOut2, status_code=201)
def create_category(body: CategoryIn2, request: Request, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    repo = ServiceCategoryRepository(db, ctx.business_id)
    cat.check_parent(db, ctx.business_id, None, body.parent_id)
    c = repo.add(**body.model_dump(), slug=cat.unique_category_slug(db, ctx.business_id, body.name), position=repo.count())
    _dirty(ctx)
    log(ctx, "category.created", request, "category", c.id)
    db.commit()
    return c


@categories_router.patch("/{cid}", response_model=CategoryOut2)
def update_category(cid: uuid.UUID, body: CategoryUpdate, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    repo = ServiceCategoryRepository(db, ctx.business_id)
    c = or404(repo.get(cid), "Category")
    data = body.model_dump(exclude_unset=True)
    if "parent_id" in data:
        cat.check_parent(db, ctx.business_id, c.id, data["parent_id"])
    if data.get("name") and data["name"] != c.name:
        data["slug"] = cat.unique_category_slug(db, ctx.business_id, data["name"], exclude_id=c.id)
    if data.get("name") is None:
        data.pop("name", None)
    repo.update(c, **data)
    _dirty(ctx)
    db.commit()
    return c


@categories_router.post("/{cid}/image", response_model=CategoryOut2)
async def category_image(cid: uuid.UUID, file: UploadFile = File(...), ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    repo = ServiceCategoryRepository(db, ctx.business_id)
    c = or404(repo.get(cid), "Category")
    res = await process_upload(file, ctx.business_id, "categories")
    c.image_url = res["medium_url"]
    _dirty(ctx)
    db.commit()
    return c


@categories_router.delete("/{cid}", status_code=204)
def delete_category(cid: uuid.UUID, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    repo = ServiceCategoryRepository(db, ctx.business_id)
    c = or404(repo.get(cid), "Category")
    repo.delete(c)  # children and items fall back to "no parent / no category" via ON DELETE SET NULL
    _dirty(ctx)
    db.commit()


@categories_router.put("/order/set", status_code=204)
def reorder_categories(body: ReorderIn, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    repo = ServiceCategoryRepository(db, ctx.business_id)
    for i, cid in enumerate(body.ids):
        c = repo.get(cid)
        if c:
            c.position = i
    _dirty(ctx)
    db.commit()


# ------------------------------------------------------------------ collections
collections_router = APIRouter(prefix="/collections", tags=["collections"])


class CollectionIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    image_url: str | None = Field(default=None, max_length=500)
    is_visible: bool = True
    product_ids: list[uuid.UUID] | None = None


class CollectionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    image_url: str | None = Field(default=None, max_length=500)
    is_visible: bool | None = None
    product_ids: list[uuid.UUID] | None = None


def _coll_out(db: Session, c: Collection) -> dict:
    return {"id": str(c.id), "name": c.name, "slug": c.slug, "description": c.description, "image_url": c.image_url, "is_visible": c.is_visible,
            "product_ids": [str(x) for x in coll_svc.product_ids(db, c.business_id, c.id)]}


def _check_img(v):
    if v and not str(v).startswith(("/", "https://")):
        raise bad_request("Choose an image from your library")


@collections_router.get("")
def list_collections(ctx: TenantContext = Depends(require("products:read")), db: Session = Depends(get_db)):
    return [_coll_out(db, c) for c in db.scalars(select(Collection).where(Collection.business_id == ctx.business_id).order_by(Collection.position, Collection.created_at))]


@collections_router.post("", status_code=201)
def create_collection(body: CollectionIn, request: Request, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    _check_img(body.image_url)
    n = db.scalar(select(func.count()).select_from(Collection).where(Collection.business_id == ctx.business_id)) or 0
    if n >= 100:
        raise bad_request("You can have up to 100 collections")
    c = Collection(business_id=ctx.business_id, name=body.name.strip(), slug=coll_svc.unique_slug(db, ctx.business_id, body.name), description=body.description, image_url=body.image_url, is_visible=body.is_visible, position=n)
    db.add(c)
    db.flush()
    if body.product_ids:
        coll_svc.set_products(db, ctx.business_id, c, body.product_ids)
    _dirty(ctx)
    log(ctx, "collection.created", request, "collection", c.id)
    db.commit()
    return _coll_out(db, c)


@collections_router.patch("/{cid}")
def update_collection(cid: uuid.UUID, body: CollectionUpdate, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    c = or404(db.scalars(select(Collection).where(Collection.id == cid, Collection.business_id == ctx.business_id)).first(), "Collection")
    data = body.model_dump(exclude_unset=True)
    _check_img(data.get("image_url"))
    if data.get("name"):
        c.slug = coll_svc.unique_slug(db, ctx.business_id, data["name"], exclude_id=c.id)
        c.name = data["name"].strip()
    for k in ("description", "image_url", "is_visible"):
        if k in data:
            setattr(c, k, data[k])
    if body.product_ids is not None:
        coll_svc.set_products(db, ctx.business_id, c, body.product_ids)
    _dirty(ctx)
    db.commit()
    return _coll_out(db, c)


@collections_router.delete("/{cid}", status_code=204)
def delete_collection(cid: uuid.UUID, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    c = or404(db.scalars(select(Collection).where(Collection.id == cid, Collection.business_id == ctx.business_id)).first(), "Collection")
    for row in db.scalars(select(CollectionProduct).where(CollectionProduct.collection_id == c.id)):
        db.delete(row)
    db.delete(c)
    _dirty(ctx)
    db.commit()
