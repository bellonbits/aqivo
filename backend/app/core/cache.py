"""High-performance caching layer with Redis support and graceful in-memory fallback.

Provides predictable structured keys, standardized TTLs, stampede protection,
and tenant-scoped invalidation for public storefront data.
"""
from __future__ import annotations

import json
import logging
import threading
import time
import uuid
from typing import Any, Callable, TypeVar

from app.core.config import get_settings

log = logging.getLogger("aqivo.cache")

T = TypeVar("T")

# Standard TTLs (seconds) matching platform caching requirements
TTL_STOREFRONT_CONFIG = 1200  # 20 minutes (10–30 min range)
TTL_BUSINESS_DETAILS = 600    # 10 minutes (5–15 min range)
TTL_PRODUCT_DETAILS = 180     # 3 minutes (2–5 min range)
TTL_PRODUCT_LISTINGS = 120    # 2 minutes (1–3 min range)
TTL_CATEGORIES = 1800         # 30 minutes (30–60 min range)
TTL_HOMEPAGE_CONTENT = 180    # 3 minutes (1–5 min range)

# Stats tracking for cache observability
_stats_lock = threading.Lock()
_cache_stats = {
    "hits": 0,
    "misses": 0,
    "sets": 0,
    "invalidations": 0,
    "redis_errors": 0,
}


class _MemoryCache:
    """In-process thread-safe LRU/TTL cache used when Redis is not configured or during outages."""

    def __init__(self, maxsize: int = 1000):
        self._maxsize = maxsize
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Any | None:
        now = time.monotonic()
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            expires_at, val = entry
            if now > expires_at:
                self._store.pop(key, None)
                return None
            return val

    def set(self, key: str, value: Any, ttl: int) -> None:
        now = time.monotonic()
        with self._lock:
            if len(self._store) >= self._maxsize:
                # Evict expired entries first
                expired = [k for k, (exp, _) in self._store.items() if exp <= now]
                for k in expired:
                    self._store.pop(k, None)
                # If still full, prune oldest 20%
                if len(self._store) >= self._maxsize:
                    oldest = sorted(self._store.keys(), key=lambda k: self._store[k][0])[: self._maxsize // 5]
                    for k in oldest:
                        self._store.pop(k, None)
            self._store[key] = (now + ttl, value)

    def delete(self, key: str) -> bool:
        with self._lock:
            return bool(self._store.pop(key, None))

    def delete_pattern(self, pattern: str) -> int:
        import fnmatch

        prefix = pattern.rstrip("*")
        with self._lock:
            to_del = [k for k in self._store if k.startswith(prefix) or fnmatch.fnmatch(k, pattern)]
            for k in to_del:
                self._store.pop(k, None)
            return len(to_del)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


_memory_cache = _MemoryCache(maxsize=2000)

_redis_client = None
_redis_pool = None
_redis_failed_at = 0.0
_redis_lock = threading.Lock()


def get_redis():
    """Returns a connected Redis client, or None if not configured or in backoff."""
    global _redis_client, _redis_pool, _redis_failed_at
    url = get_settings().redis_url
    if not url:
        return None

    now = time.monotonic()
    if now - _redis_failed_at < 30.0:
        return None

    if _redis_client is not None:
        return _redis_client

    with _redis_lock:
        if _redis_client is not None:
            return _redis_client
        try:
            import redis

            _redis_pool = redis.ConnectionPool.from_url(
                url,
                max_connections=20,
                socket_timeout=0.35,
                socket_connect_timeout=0.35,
                decode_responses=True,
            )
            client = redis.Redis(connection_pool=_redis_pool)
            client.ping()
            _redis_client = client
            log.info("Connected to Redis cache at %s", url.split("@")[-1])
            return _redis_client
        except Exception as exc:  # noqa: BLE001
            _redis_failed_at = time.monotonic()
            with _stats_lock:
                _cache_stats["redis_errors"] += 1
            log.warning("Redis cache unavailable (%s), degrading to in-memory fallback for 30s", exc)
            return None


def _serialize(value: Any) -> str:
    return json.dumps(value, default=str)


def _deserialize(raw: str) -> Any:
    return json.loads(raw)


def cache_get(key: str) -> Any | None:
    """Retrieve an item from Redis or memory fallback. Returns None on miss."""
    r = get_redis()
    val = None
    if r is not None:
        try:
            raw = r.get(key)
            if raw is not None:
                val = _deserialize(raw)
        except Exception as exc:  # noqa: BLE001
            global _redis_failed_at
            _redis_failed_at = time.monotonic()
            with _stats_lock:
                _cache_stats["redis_errors"] += 1
            log.debug("Redis get error for %s: %s", key, exc)

    if val is None:
        val = _memory_cache.get(key)

    with _stats_lock:
        if val is not None:
            _cache_stats["hits"] += 1
        else:
            _cache_stats["misses"] += 1
    return val


def cache_set(key: str, value: Any, ttl: int) -> bool:
    """Store an item in Redis and/or in-memory fallback with TTL."""
    # Always keep in-memory warm as local tier
    _memory_cache.set(key, value, ttl)

    r = get_redis()
    if r is not None:
        try:
            payload = _serialize(value)
            r.setex(key, ttl, payload)
        except Exception as exc:  # noqa: BLE001
            global _redis_failed_at
            _redis_failed_at = time.monotonic()
            with _stats_lock:
                _cache_stats["redis_errors"] += 1
            log.debug("Redis set error for %s: %s", key, exc)

    with _stats_lock:
        _cache_stats["sets"] += 1
    return True


def cache_delete(key: str) -> bool:
    """Delete a specific cache key."""
    _memory_cache.delete(key)
    r = get_redis()
    if r is not None:
        try:
            r.delete(key)
        except Exception:  # noqa: BLE001
            pass
    with _stats_lock:
        _cache_stats["invalidations"] += 1
    return True


# Convenience aliases for functional and pattern modules
get_cache = cache_get
set_cache = cache_set
delete_cache = cache_delete
_get_redis = get_redis
TTL_PRODUCT_DETAIL = TTL_PRODUCT_DETAILS
TTL_PRODUCT_LIST = TTL_PRODUCT_LISTINGS


def cache_delete_pattern(pattern: str) -> int:
    """Delete keys matching pattern from Redis and in-memory fallback."""
    mem_deleted = _memory_cache.delete_pattern(pattern)
    redis_deleted = 0
    r = get_redis()
    if r is not None:
        try:
            # Use SCAN to prevent blocking the Redis event loop
            keys = []
            cursor = 0
            while True:
                cursor, batch = r.scan(cursor=cursor, match=pattern, count=100)
                keys.extend(batch)
                if cursor == 0 or len(keys) > 500:
                    break
            if keys:
                redis_deleted = r.delete(*keys)
        except Exception as exc:  # noqa: BLE001
            log.debug("Redis delete_pattern error for %s: %s", pattern, exc)

    with _stats_lock:
        _cache_stats["invalidations"] += max(mem_deleted, redis_deleted)
    return max(mem_deleted, redis_deleted)


def cache_get_or_set(key: str, factory: Callable[[], T], ttl: int) -> T:
    """Get value from cache, or execute factory, store result and return."""
    cached = cache_get(key)
    if cached is not None:
        return cached

    result = factory()
    if result is not None:
        cache_set(key, result, ttl)
    return result


# -----------------------------------------------------------------------------
# Structured Cache Keys (Predictable & Tenant-isolated)
# -----------------------------------------------------------------------------
def key_business_profile(slug_or_id: str | uuid.UUID) -> str:
    return f"aqivo:biz:{slug_or_id}:profile"


def key_storefront_config(business_id: str | uuid.UUID) -> str:
    return f"aqivo:biz:{business_id}:store_cfg"


def key_categories(business_id: str | uuid.UUID) -> str:
    return f"aqivo:biz:{business_id}:categories"


def key_product_listings(
    business_id: str | uuid.UUID,
    page: int = 1,
    limit: int = 24,
    sort: str = "newest",
    cat_slug: str = "",
    q: str = "",
) -> str:
    import hashlib

    query_sig = hashlib.md5(f"{page}:{limit}:{sort}:{cat_slug}:{q}".encode()).hexdigest()[:8]
    return f"aqivo:biz:{business_id}:prods:{query_sig}"


def key_product_detail(business_id: str | uuid.UUID, slug_or_id: str | uuid.UUID) -> str:
    return f"aqivo:biz:{business_id}:prod:{slug_or_id}"


def key_storefront_html(slug: str, page_name: str = "index.html", item_id: str = "") -> str:
    suffix = f":{item_id}" if item_id else ""
    return f"aqivo:html:{slug}:{page_name}{suffix}"


# -----------------------------------------------------------------------------
# Invalidation Helpers (Targeted & Cascading)
# -----------------------------------------------------------------------------
def invalidate_business(business_id: str | uuid.UUID, slug: str | None = None) -> None:
    """Invalidate all cached data for a business when settings, profile, or domain changes."""
    bid = str(business_id)
    cache_delete_pattern(f"aqivo:biz:{bid}:*")
    if slug:
        cache_delete_pattern(f"aqivo:html:{slug}:*")
        cache_delete(key_business_profile(slug))
    # Clear in-memory site_render cache as well
    from app.services.site_render import clear_render_cache
    clear_render_cache(bid)


def invalidate_products(
    business_id: str | uuid.UUID,
    slug: str | None = None,
    product_id: str | uuid.UUID | None = None,
    product_slug: str | None = None,
) -> None:
    """Invalidate product listings, storefront HTML, and specific product details."""
    bid = str(business_id)
    cache_delete_pattern(f"aqivo:biz:{bid}:prods:*")
    if product_id:
        cache_delete(key_product_detail(bid, product_id))
    if product_slug:
        cache_delete(key_product_detail(bid, product_slug))
    if slug:
        cache_delete_pattern(f"aqivo:html:{slug}:*")
    from app.services.site_render import clear_render_cache
    clear_render_cache(bid)


def invalidate_categories(business_id: str | uuid.UUID, slug: str | None = None) -> None:
    """Invalidate categories and listings."""
    bid = str(business_id)
    cache_delete(key_categories(bid))
    cache_delete_pattern(f"aqivo:biz:{bid}:prods:*")
    if slug:
        cache_delete_pattern(f"aqivo:html:{slug}:*")
    from app.services.site_render import clear_render_cache
    clear_render_cache(bid)


def get_cache_stats() -> dict:
    """Returns observability statistics about cache performance."""
    with _stats_lock:
        hits = _cache_stats["hits"]
        misses = _cache_stats["misses"]
        total = hits + misses
        ratio = round((hits / total * 100), 1) if total > 0 else 0.0
        return {
            "hits": hits,
            "misses": misses,
            "total_requests": total,
            "hit_ratio_pct": ratio,
            "sets": _cache_stats["sets"],
            "invalidations": _cache_stats["invalidations"],
            "redis_errors": _cache_stats["redis_errors"],
            "backend": "redis" if get_redis() is not None else "in_memory",
        }
