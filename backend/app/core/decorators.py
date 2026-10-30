"""Pattern G: Decorator.
Demonstrates both:
1. Python function decorators (syntactic wrappers preserving metadata).
2. Classic GoF structural Object Decorator (wrapping an object instance to add caching
   and logging behaviour without changing the wrapped object's interface).
"""
from __future__ import annotations

import functools
import logging
import time
import uuid
from typing import Any, Callable, Sequence, TypeVar

from app.core.cache import get_cache, invalidate_products, set_cache
from app.models.business import Product
from app.models.commerce import ProductVariant
from app.repositories.product import IProductRepository

log = logging.getLogger("bizora.decorators")
R = TypeVar("R")


# ============================================================================
# 1. PYTHON FUNCTION DECORATORS
# ============================================================================

def time_execution(label: str | None = None) -> Callable[[Callable[..., R]], Callable[..., R]]:
    """Function decorator that times execution latency and preserves docstring/metadata."""

    def decorator(fn: Callable[..., R]) -> Callable[..., R]:
        operation_name = label or fn.__name__

        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> R:
            t0 = time.monotonic()
            try:
                result = fn(*args, **kwargs)
                elapsed_ms = (time.monotonic() - t0) * 1000.0
                log.info("Performance: [%s] completed in %.2f ms", operation_name, elapsed_ms)
                return result
            except Exception as e:
                elapsed_ms = (time.monotonic() - t0) * 1000.0
                log.warning("Performance: [%s] failed after %.2f ms: %s", operation_name, elapsed_ms, e)
                raise

        return wrapper

    return decorator


def cached_result(ttl: int = 120, key_prefix: str = "cache:fn") -> Callable[[Callable[..., R]], Callable[..., R]]:
    """Function decorator that transparently memoizes results in cache."""

    def decorator(fn: Callable[..., R]) -> Callable[..., R]:
        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> R:
            # Build deterministic cache key from arguments
            arg_str = ":".join(str(a) for a in args)
            kw_str = ":".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
            cache_key = f"{key_prefix}:{fn.__name__}:{arg_str}:{kw_str}"

            cached = get_cache(cache_key)
            if cached is not None:
                return cached  # type: ignore[return-value]

            result = fn(*args, **kwargs)
            set_cache(cache_key, result, ttl=ttl)
            return result

        return wrapper

    return decorator


# ============================================================================
# 2. CLASSIC OBJECT-ORIENTED STRUCTURAL DECORATOR (GoF Decorator Pattern)
# ============================================================================

class CachedProductRepositoryDecorator(IProductRepository):
    """Classic GoF Decorator: wraps an IProductRepository instance, adding transparent
    caching and cache invalidation without altering the public interface or client code.
    """

    def __init__(self, inner_repo: IProductRepository, business_id: uuid.UUID):
        self._inner = inner_repo
        self._business_id = business_id

    def get_by_id(self, product_id: uuid.UUID) -> Product | None:
        # Transparent caching on read
        cache_key = f"aqivo:prod:repo:{self._business_id}:{product_id}"
        cached = get_cache(cache_key)
        if cached is not None:
            return cached

        product = self._inner.get_by_id(product_id)
        if product is not None:
            set_cache(cache_key, product, ttl=180)
        return product

    def get_by_slug(self, slug: str) -> Product | None:
        return self._inner.get_by_slug(slug)

    def list_active(
        self,
        category_id: uuid.UUID | None = None,
        status: str = "ACTIVE",
        limit: int = 50,
        offset: int = 0,
    ) -> list[Product]:
        return self._inner.list_active(category_id=category_id, status=status, limit=limit, offset=offset)

    def count_active(self, category_id: uuid.UUID | None = None, status: str = "ACTIVE") -> int:
        return self._inner.count_active(category_id=category_id, status=status)

    def batch_load_variants(self, product_ids: Sequence[uuid.UUID]) -> dict[str, list[ProductVariant]]:
        return self._inner.batch_load_variants(product_ids)

    def create_product(self, data: dict[str, Any]) -> Product:
        # Augment write with automatic cache eviction
        product = self._inner.create_product(data)
        invalidate_products(self._business_id)
        return product

    def update_product(self, product: Product, data: dict[str, Any]) -> Product:
        # Augment write with automatic cache eviction
        updated = self._inner.update_product(product, data)
        invalidate_products(self._business_id)
        return updated

    def soft_delete(self, product: Product) -> None:
        # Augment write with automatic cache eviction
        self._inner.soft_delete(product)
        invalidate_products(self._business_id)
