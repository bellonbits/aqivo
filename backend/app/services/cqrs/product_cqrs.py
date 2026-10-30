"""Pattern F: CQRS (Command Query Responsibility Segregation).
Explicit separation of Write/Mutation models (Commands) and Read/Projection models (Queries)
for product catalogue lifecycle and storefront delivery.
"""
from __future__ import annotations

import decimal
import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.core.cache import get_cache, invalidate_products, set_cache, TTL_PRODUCT_DETAIL, TTL_PRODUCT_LIST
from app.models.business import Product
from app.repositories.product import ProductRepository


# ============================================================================
# COMMAND SIDE (Writes & State Mutations)
# ============================================================================

@dataclass(frozen=True)
class CreateProductCommand:
    business_id: uuid.UUID
    name: str
    price: decimal.Decimal
    currency: str
    category_id: uuid.UUID | None = None
    description: str = ""
    short_description: str = ""
    compare_at_price: decimal.Decimal | None = None
    sku: str | None = None
    images: list[str] | None = None
    track_stock: bool = False
    stock_qty: int = 0
    featured: bool = False


@dataclass(frozen=True)
class UpdateProductCommand:
    business_id: uuid.UUID
    product_id: uuid.UUID
    updates: dict[str, Any]


@dataclass(frozen=True)
class DeleteProductCommand:
    business_id: uuid.UUID
    product_id: uuid.UUID


class ProductCommandHandler:
    """Handles Command side: enforces invariants, manages transactions, and evicts read models."""

    def __init__(self, db: Session, business_id: uuid.UUID):
        self.db = db
        self.business_id = business_id
        self.repo = ProductRepository(db, business_id)

    def handle_create(self, cmd: CreateProductCommand) -> Product:
        from app.services import catalog as cat

        slug = cat.unique_product_slug(self.db, self.business_id, cmd.name)
        data = {
            "name": cmd.name,
            "slug": slug,
            "price": cmd.price,
            "currency": cmd.currency,
            "category_id": cmd.category_id,
            "description": cmd.description,
            "short_description": cmd.short_description,
            "compare_at_price": cmd.compare_at_price,
            "sku": cmd.sku,
            "images": cmd.images or [],
            "track_stock": cmd.track_stock,
            "stock_qty": cmd.stock_qty,
            "featured": cmd.featured,
        }
        product = self.repo.create_product(data)
        self.db.commit()

        # Invalidate read projections
        invalidate_products(self.business_id)
        return product

    def handle_update(self, cmd: UpdateProductCommand) -> Product:
        product = self.repo.get_by_id(cmd.product_id)
        if not product:
            raise ValueError(f"Product {cmd.product_id} not found")

        self.repo.update_product(product, cmd.updates)
        self.db.commit()

        # Invalidate read projections
        invalidate_products(self.business_id)
        return product

    def handle_delete(self, cmd: DeleteProductCommand) -> None:
        product = self.repo.get_by_id(cmd.product_id)
        if not product:
            return

        self.repo.soft_delete(product)
        self.db.commit()

        # Invalidate read projections
        invalidate_products(self.business_id)


# ============================================================================
# QUERY SIDE (Reads & Cache Projections)
# ============================================================================

@dataclass(frozen=True)
class ProductReadModel:
    id: str
    name: str
    slug: str
    price: float
    currency: str
    image: str | None
    images: list[str]
    category_id: str | None
    description: str
    variant_count: int
    total_stock: int | None
    is_sold_out: bool


@dataclass(frozen=True)
class GetProductDetailQuery:
    business_id: uuid.UUID
    product_id: uuid.UUID


@dataclass(frozen=True)
class ListStorefrontProductsQuery:
    business_id: uuid.UUID
    category_id: uuid.UUID | None = None
    limit: int = 50
    offset: int = 0


class ProductQueryHandler:
    """Handles Query side: bypasses ORM entity tracking, reads from cache or fast read-models."""

    def __init__(self, db: Session, business_id: uuid.UUID):
        self.db = db
        self.business_id = business_id
        self.repo = ProductRepository(db, business_id)

    def handle_detail(self, query: GetProductDetailQuery) -> ProductReadModel | None:
        cache_key = f"aqivo:prod:detail:{self.business_id}:{query.product_id}"
        cached = get_cache(cache_key)
        if cached:
            return ProductReadModel(**cached)

        p = self.repo.get_by_id(query.product_id)
        if not p:
            return None

        variants = self.repo.batch_load_variants([p.id]).get(str(p.id), [])
        total_stock = sum(v.stock_qty for v in variants) if variants else p.stock_qty if p.track_stock else None
        is_sold_out = bool(p.track_stock and (total_stock is not None and total_stock <= 0))

        read_model = ProductReadModel(
            id=str(p.id),
            name=p.name,
            slug=p.slug,
            price=float(p.price),
            currency=p.currency,
            image=p.images[0] if p.images else None,
            images=p.images or [],
            category_id=str(p.category_id) if p.category_id else None,
            description=p.description or "",
            variant_count=len(variants),
            total_stock=total_stock,
            is_sold_out=is_sold_out,
        )

        set_cache(cache_key, read_model.__dict__, ttl=TTL_PRODUCT_DETAIL)
        return read_model

    def handle_list(self, query: ListStorefrontProductsQuery) -> list[ProductReadModel]:
        cache_key = f"aqivo:prod:list:{self.business_id}:c{query.category_id}:l{query.limit}:o{query.offset}"
        cached = get_cache(cache_key)
        if cached:
            return [ProductReadModel(**item) for item in cached]

        products = self.repo.list_active(
            category_id=query.category_id,
            limit=query.limit,
            offset=query.offset,
        )
        if not products:
            return []

        variants_by_pid = self.repo.batch_load_variants([p.id for p in products])
        results: list[ProductReadModel] = []
        for p in products:
            vs = variants_by_pid.get(str(p.id), [])
            total_stock = sum(v.stock_qty for v in vs) if vs else p.stock_qty if p.track_stock else None
            is_sold_out = bool(p.track_stock and (total_stock is not None and total_stock <= 0))

            results.append(
                ProductReadModel(
                    id=str(p.id),
                    name=p.name,
                    slug=p.slug,
                    price=float(p.price),
                    currency=p.currency,
                    image=p.images[0] if p.images else None,
                    images=p.images or [],
                    category_id=str(p.category_id) if p.category_id else None,
                    description=p.description or "",
                    variant_count=len(vs),
                    total_stock=total_stock,
                    is_sold_out=is_sold_out,
                )
            )

        set_cache(cache_key, [r.__dict__ for r in results], ttl=TTL_PRODUCT_LIST)
        return results
