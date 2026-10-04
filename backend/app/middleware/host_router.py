"""Serves a business at its own host: {slug}.aqivo.shop or a verified custom domain, by rewriting the path
to /{slug}/... before routing. Requests to the platform host pass through untouched."""
import time
from typing import Any

from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.models import Business, Domain

PLATFORM_SUBS = {"www", "app", "api", "admin", "mail"}
_cache: dict[str, tuple[float, str | None]] = {}
TTL = 60


def _lookup(host: str) -> str | None:
    s = get_settings()
    base = s.base_domain.lower()
    if host == base or host.startswith("localhost") or host.startswith("127.") or host.replace(".", "").isdigit():
        return None
    hit = _cache.get(host)
    if hit and time.monotonic() - hit[0] < TTL:
        return hit[1]
    slug = None
    if host.endswith("." + base):
        sub = host[: -len(base) - 1]
        if "." not in sub and sub not in PLATFORM_SUBS:
            slug = sub
    else:
        db = SessionLocal()
        try:
            d = db.scalars(select(Domain).where(Domain.domain == host, Domain.type == "CUSTOM", Domain.verification_status == "VERIFIED", Domain.status == "ACTIVE")).first()
            if d:
                slug = db.scalar(select(Business.slug).where(Business.id == d.business_id))
        finally:
            db.close()
    _cache[host] = (time.monotonic(), slug)
    return slug


class HostRouterMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope: dict[str, Any], receive, send):
        if scope["type"] == "http":
            host = dict(scope["headers"]).get(b"host", b"").decode().split(":")[0].lower()
            path = scope["path"]
            if not path.startswith(("/api", "/static", "/media", "/health", "/readiness", "/docs", "/redoc", "/openapi.json")):
                slug = _lookup(host)
                if slug:
                    scope = {**scope, "path": f"/{slug}{'' if path == '/' else path}", "raw_path": f"/{slug}{'' if path == '/' else path}".encode(), "aqivo_host": slug, "bizora_host": slug}
        await self.app(scope, receive, send)
