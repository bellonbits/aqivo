"""Pattern A: Repository.
Dedicated product repository abstracting database operations behind a clean,
substitutable interface with tenant-enforced scoping and centralized session management.
"""
from __future__ import annotations

import uuid
from typing import Any, Protocol, Sequence, runtime_checkable

from fastapi import Depends
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.business import Business, Product
from app.models.commerce import ProductVariant
from app.repositories.base import TenantRepository


@runtime_checkable
class IProductRepository(Protocol):
    """Protocol / Interface for Product Repository, enabling mockability and interchangeable backends."""

    def get_by_id(self, product_id: uuid.UUID) -> Product | None: ...
    def get_by_slug(self, slug: str) -> Product | None: ...
    def list_active(
        self,
        category_id: uuid.UUID | None = None,
        status: str = "ACTIVE",
        limit: int = 50,
        offset: int = 0,
    ) -> list[Product]: ...
    def count_active(self, category_id: uuid.UUID | None = None, status: str = "ACTIVE") -> int: ...
    def batch_load_variants(self, product_ids: Sequence[uuid.UUID]) -> dict[str, list[ProductVariant]]: ...
    def create_product(self, data: dict[str, Any]) -> Product: ...
    def update_product(self, product: Product, data: dict[str, Any]) -> Product: ...
    def soft_delete(self, product: Product) -> None: ...


class ProductRepository(TenantRepository[Product], IProductRepository):
    """Concrete SQLAlchemy implementation of IProductRepository."""

    model = Product

    def __init__(self, db: Session, business_id: uuid.UUID):
        super().__init__(db, business_id)

    def get_by_id(self, product_id: uuid.UUID) -> Product | None:
        return self.get(product_id)

    def get_by_slug(self, slug: str) -> Product | None:
        q = self.query().where(Product.slug == slug)
        return self.db.scalar(q)

    def list_active(
        self,
        category_id: uuid.UUID | None = None,
        status: str = "ACTIVE",
        limit: int = 50,
        offset: int = 0,
    ) -> list[Product]:
        q = self.query().where(Product.status == status)
        if category_id:
            q = q.where(Product.category_id == category_id)
        q = q.order_by(Product.position, Product.created_at.desc()).limit(limit).offset(offset)
        return list(self.db.scalars(q))

    def count_active(self, category_id: uuid.UUID | None = None, status: str = "ACTIVE") -> int:
        q = select(func.count()).select_from(Product).where(
            Product.business_id == self.business_id,
            Product.deleted_at.is_(None),
            Product.status == status,
        )
        if category_id:
            q = q.where(Product.category_id == category_id)
        return self.db.scalar(q) or 0

    def batch_load_variants(self, product_ids: Sequence[uuid.UUID]) -> dict[str, list[ProductVariant]]:
        if not product_ids:
            return {}
        pids = list(product_ids)
        rows = self.db.scalars(
            select(ProductVariant)
            .where(
                ProductVariant.business_id == self.business_id,
                ProductVariant.product_id.in_(pids),
                ProductVariant.is_active.is_(True),
            )
            .order_by(ProductVariant.product_id, ProductVariant.position)
        ).all()
        by_product: dict[str, list[ProductVariant]] = {}
        for v in rows:
            by_product.setdefault(str(v.product_id), []).append(v)
        return by_product

    def create_product(self, data: dict[str, Any]) -> Product:
        return self.add(**data)

    def update_product(self, product: Product, data: dict[str, Any]) -> Product:
        return self.update(product, **data)

    def soft_delete(self, product: Product) -> None:
        self.delete(product)


def get_product_repo(
    db: Session = Depends(get_db),
    business_id: uuid.UUID | None = None,
) -> ProductRepository:
    """FastAPI Dependency Provider for ProductRepository."""
    if business_id is None:
        raise ValueError("business_id is required to instantiate ProductRepository")
    return ProductRepository(db, business_id)
