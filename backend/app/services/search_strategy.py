"""Pattern C: Strategy.
Defines interchangeable algorithms for catalogue searching and ranking,
conforming to a shared protocol, with runtime strategy selection.
"""
from __future__ import annotations

import uuid
from typing import Protocol

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.business import Product


class CatalogSearchStrategy(Protocol):
    """Protocol for interchangeable product search & ranking strategies."""

    strategy_name: str

    def search(
        self,
        db: Session,
        business_id: uuid.UUID,
        query: str,
        limit: int = 50,
    ) -> list[Product]: ...


class ExactPrefixSearchStrategy:
    """Strategy A: Fast, index-optimised prefix match on product name and SKU."""

    strategy_name = "exact_prefix"

    def search(
        self,
        db: Session,
        business_id: uuid.UUID,
        query: str,
        limit: int = 50,
    ) -> list[Product]:
        term = query.strip()
        prefix = f"{term}%"
        stmt = (
            select(Product)
            .where(
                Product.business_id == business_id,
                Product.deleted_at.is_(None),
                Product.status == "ACTIVE",
                or_(Product.name.ilike(prefix), Product.sku.ilike(prefix)),
            )
            .order_by(Product.name)
            .limit(limit)
        )
        return list(db.scalars(stmt))


class FuzzyTokenSearchStrategy:
    """Strategy B: Multi-token match across name, description, and short_description."""

    strategy_name = "fuzzy_token"

    def search(
        self,
        db: Session,
        business_id: uuid.UUID,
        query: str,
        limit: int = 50,
    ) -> list[Product]:
        tokens = [t.strip() for t in query.split() if len(t.strip()) > 1]
        if not tokens:
            return []

        conditions = []
        for t in tokens:
            like_pattern = f"%{t}%"
            conditions.append(
                or_(
                    Product.name.ilike(like_pattern),
                    Product.description.ilike(like_pattern),
                    Product.short_description.ilike(like_pattern),
                )
            )

        stmt = (
            select(Product)
            .where(
                Product.business_id == business_id,
                Product.deleted_at.is_(None),
                Product.status == "ACTIVE",
                *conditions,
            )
            .order_by(Product.position, Product.created_at.desc())
            .limit(limit)
        )
        return list(db.scalars(stmt))


class PopularityRankedSearchStrategy:
    """Strategy C: Default browse strategy ranking by position, recency, and featured flag."""

    strategy_name = "popularity_ranked"

    def search(
        self,
        db: Session,
        business_id: uuid.UUID,
        query: str = "",
        limit: int = 50,
    ) -> list[Product]:
        stmt = (
            select(Product)
            .where(
                Product.business_id == business_id,
                Product.deleted_at.is_(None),
                Product.status == "ACTIVE",
            )
            .order_by(Product.featured.desc(), Product.position, Product.created_at.desc())
            .limit(limit)
        )
        return list(db.scalars(stmt))


class CatalogSearchContext:
    """Context that maintains a reference to a Strategy and executes it."""

    def __init__(self, strategy: CatalogSearchStrategy | None = None):
        self._strategy = strategy or PopularityRankedSearchStrategy()

    def set_strategy(self, strategy: CatalogSearchStrategy) -> None:
        self._strategy = strategy

    def execute_search(
        self,
        db: Session,
        business_id: uuid.UUID,
        query: str,
        limit: int = 50,
    ) -> list[Product]:
        return self._strategy.search(db, business_id, query, limit=limit)

    @classmethod
    def select_strategy(cls, query: str) -> CatalogSearchStrategy:
        """Runtime strategy selector based on search query properties."""
        q = (query or "").strip()
        if not q:
            return PopularityRankedSearchStrategy()
        if len(q.split()) > 1:
            return FuzzyTokenSearchStrategy()
        return ExactPrefixSearchStrategy()
