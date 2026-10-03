"""Collections: hand-picked, ordered groups of products."""
from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import bad_request
from app.models import Collection, CollectionProduct, Product
from app.services.catalog import slugify


def unique_slug(db: Session, business_id, name: str, exclude_id=None) -> str:
    base = slugify(name, "collection")
    slug, n = base, 2
    while True:
        q = select(Collection.id).where(Collection.business_id == business_id, Collection.slug == slug)
        if exclude_id:
            q = q.where(Collection.id != exclude_id)
        if not db.scalar(q):
            return slug
        slug, n = f"{base}-{n}", n + 1


def product_ids(db: Session, business_id, collection_id) -> list[uuid.UUID]:
    return list(db.scalars(select(CollectionProduct.product_id).where(CollectionProduct.business_id == business_id, CollectionProduct.collection_id == collection_id).order_by(CollectionProduct.position)))


def products_in(db: Session, business_id, collection_id, *, active_only: bool = True, limit: int | None = None) -> list[Product]:
    ids = product_ids(db, business_id, collection_id)
    if not ids:
        return []
    rows = {p.id: p for p in db.scalars(select(Product).where(Product.business_id == business_id, Product.id.in_(ids), Product.deleted_at.is_(None), *([Product.status == "ACTIVE"] if active_only else [])))}
    out = [rows[i] for i in ids if i in rows]
    return out[:limit] if limit else out


def set_products(db: Session, business_id, collection: Collection, ids: list[uuid.UUID]) -> None:
    if len(ids) > 500:
        raise bad_request("A collection can hold up to 500 products")
    valid = set(db.scalars(select(Product.id).where(Product.business_id == business_id, Product.id.in_(ids), Product.deleted_at.is_(None))))
    if set(ids) - valid:
        raise bad_request("One of those products doesn't exist")
    for row in db.scalars(select(CollectionProduct).where(CollectionProduct.collection_id == collection.id)):
        db.delete(row)
    db.flush()
    seen = set()
    for i, pid in enumerate(x for x in ids if not (x in seen or seen.add(x))):
        db.add(CollectionProduct(business_id=business_id, collection_id=collection.id, product_id=pid, position=i))
    db.flush()


def counts(db: Session, business_id) -> dict:
    return dict(db.execute(select(CollectionProduct.collection_id, func.count()).where(CollectionProduct.business_id == business_id).group_by(CollectionProduct.collection_id)).all())
