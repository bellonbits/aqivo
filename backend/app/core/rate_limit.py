"""Rate limiter. With REDIS_URL set, counters live in Redis (fixed window, shared by every worker); otherwise — or if Redis is unreachable — an
in-process sliding window is used, so a Redis outage degrades protection to per-worker instead of taking the site down."""
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status

from app.core.config import get_settings

_hits: dict[str, deque] = defaultdict(deque)
_lock = Lock()


def _ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    return fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown")


_redis_client = None
_redis_failed_at = 0.0


def _redis():
    """A Redis client, or None when not configured / recently failing (retry after 30s)."""
    global _redis_client, _redis_failed_at
    url = get_settings().redis_url
    if not url or time.monotonic() - _redis_failed_at < 30:
        return None
    if _redis_client is None:
        try:
            import redis
            _redis_client = redis.Redis.from_url(url, socket_timeout=0.25, socket_connect_timeout=0.25, decode_responses=True)
        except Exception:  # noqa: BLE001
            _redis_failed_at = time.monotonic()
            return None
    return _redis_client


def _redis_hit(r, key: str, limit: int, window: int) -> bool | None:
    """True = allowed, False = limited, None = Redis failed (fall back)."""
    global _redis_failed_at
    try:
        bucket = int(time.time() // window)
        k = f"rl:{key}:{bucket}"
        n = r.incr(k)
        if n == 1:
            r.expire(k, window + 1)
        return n <= limit
    except Exception:  # noqa: BLE001
        _redis_failed_at = time.monotonic()
        return None


def rate_limit(name: str, limit: int, window_seconds: int):
    def dep(request: Request) -> None:
        key = f"{name}:{_ip(request)}"
        r = _redis()
        if r is not None:
            ok = _redis_hit(r, key, limit, window_seconds)
            if ok is False:
                raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests. Please slow down.", headers={"Retry-After": str(window_seconds)})
            if ok is True:
                return
        now = time.monotonic()
        with _lock:
            q = _hits[key]
            while q and q[0] < now - window_seconds:
                q.popleft()
            if len(q) >= limit:
                raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests. Please slow down.",
                                    headers={"Retry-After": str(window_seconds)})
            q.append(now)

    return dep


def reset_rate_limits() -> None:  # used by tests
    with _lock:
        _hits.clear()
