"""Product / category helpers shared by the dashboard API and the storefront renderer."""
import re
import unicodedata
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import bad_request
from app.models import Product, ServiceCategory


def slugify(text: str, fallback: str = "item") -> str:
    t = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:60]
    return t or fallback


def unique_product_slug(db: Session, business_id: uuid.UUID, name: str, exclude_id: uuid.UUID | None = None) -> str:
    base = slugify(name, "product")
    slug, n = base, 2
    while True:
        q = select(Product.id).where(Product.business_id == business_id, Product.slug == slug)
        if exclude_id:
            q = q.where(Product.id != exclude_id)
        if not db.scalar(q):
            return slug
        slug, n = f"{base}-{n}", n + 1


def unique_category_slug(db: Session, business_id: uuid.UUID, name: str, exclude_id: uuid.UUID | None = None) -> str:
    base = slugify(name, "category")
    slug, n = base, 2
    while True:
        q = select(ServiceCategory.id).where(ServiceCategory.business_id == business_id, ServiceCategory.slug == slug)
        if exclude_id:
            q = q.where(ServiceCategory.id != exclude_id)
        if not db.scalar(q):
            return slug
        slug, n = f"{base}-{n}", n + 1


def check_parent(db: Session, business_id: uuid.UUID, category_id: uuid.UUID | None, parent_id: uuid.UUID | None) -> None:
    """A parent must belong to the same business, and nesting may not loop or exceed 3 levels."""
    if parent_id is None:
        return
    parent = db.scalar(select(ServiceCategory).where(ServiceCategory.id == parent_id, ServiceCategory.business_id == business_id))
    if parent is None:
        raise bad_request("Unknown parent category")
    depth, cur = 1, parent
    while cur.parent_id:
        if category_id and cur.parent_id == category_id:
            raise bad_request("A category can't sit inside itself")
        cur = db.get(ServiceCategory, cur.parent_id)
        depth += 1
        if cur is None or depth > 3:
            break
    if category_id and parent_id == category_id:
        raise bad_request("A category can't sit inside itself")
    if depth >= 3:
        raise bad_request("Categories can be nested up to three levels")


def descendant_ids(db: Session, business_id: uuid.UUID, category_id: uuid.UUID) -> list[uuid.UUID]:
    rows = db.scalars(select(ServiceCategory).where(ServiceCategory.business_id == business_id)).all()
    kids: dict = {}
    for c in rows:
        kids.setdefault(c.parent_id, []).append(c.id)
    out, stack = [category_id], [category_id]
    while stack:
        for k in kids.get(stack.pop(), []):
            out.append(k)
            stack.append(k)
    return out


def unique_service_slug(db: Session, business_id: uuid.UUID, name: str, exclude_id: uuid.UUID | None = None) -> str:
    from app.models import Service
    base = slugify(name, "service")
    slug, n = base, 2
    while True:
        q = select(Service.id).where(Service.business_id == business_id, Service.slug == slug)
        if exclude_id:
            q = q.where(Service.id != exclude_id)
        if not db.scalar(q):
            return slug
        slug, n = f"{base}-{n}", n + 1
