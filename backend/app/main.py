import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import quote

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, PlainTextResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.api.v1 import api_router
from app.core.config import get_settings
from app.core.db import SessionLocal, engine, get_db
from app.core.logging import setup_logging
from app.middleware.host_router import HostRouterMiddleware
from app.middleware.security import SecurityMiddleware
from app.models import Business, Domain, ReviewRequest, Website, WebsitePage
from app.models.enums import BusinessStatus
from app.seed import bootstrap
from app.services.business import RESERVED_SLUGS
from app.services.site_render import render, render_business, build_context

log = logging.getLogger("bizora")
settings = get_settings()
import os
BASE = Path(__file__).resolve().parent
_dist_env = os.getenv("FRONTEND_DIST_DIR")
if _dist_env:
    DIST = Path(_dist_env).resolve()
elif (BASE.parent.parent / "frontend" / "dist").exists():
    DIST = BASE.parent.parent / "frontend" / "dist"
elif (BASE.parent / "dist").exists():
    DIST = BASE.parent / "dist"
else:
    DIST = BASE.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    Path(settings.media_dir).mkdir(parents=True, exist_ok=True)
    try:
        bootstrap(demo=settings.environment == "development")
    except Exception:  # noqa: BLE001
        log.exception("bootstrap failed (has `alembic upgrade head` been run?)")
    yield
    engine.dispose()


app = FastAPI(
    title="Aqivo API",
    version="1.0.0",
    description="Aqivo E-Commerce & Multi-Tenant Business Platform API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)
app.add_middleware(GZipMiddleware, minimum_size=800)
app.add_middleware(SecurityMiddleware)
app.add_middleware(HostRouterMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "X-Request-Id", "X-Business-Id"],
    max_age=86400,
)

class CachedStaticFiles(StaticFiles):
    """StaticFiles with explicit browser and proxy Cache-Control headers."""

    def __init__(self, *args, max_age: int = 86400 * 30, is_immutable: bool = False, **kwargs):
        self.max_age = max_age
        self.is_immutable = is_immutable
        super().__init__(*args, **kwargs)

    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 200:
            imm = ", immutable" if self.is_immutable else ""
            response.headers["Cache-Control"] = f"public, max-age={self.max_age}{imm}"
        return response


app.include_router(api_router)
app.mount("/media", CachedStaticFiles(directory=settings.media_dir, check_dir=False, max_age=86400 * 30, is_immutable=True), name="media")
app.mount("/static", CachedStaticFiles(directory=BASE / "public" / "static", max_age=86400 * 7), name="static")
app.mount("/brand", CachedStaticFiles(directory=BASE / "public" / "static" / "brand", max_age=86400 * 30, is_immutable=True), name="brand")


@app.get("/verify-email", include_in_schema=False)
def direct_verify_email(token: str | None = None, db: Session = Depends(get_db)):
    """Handles direct browser clicks from verification email if routed directly to backend."""
    from fastapi.responses import RedirectResponse, HTMLResponse
    s = settings
    app_base = (s.app_base_url or "https://www.aqivo.shop").rstrip("/")
    if not token:
        return RedirectResponse(f"{app_base}/login", status_code=302)
    try:
        from app.core.security import decode_token, create_refresh_token
        from app.models.identity import User
        from app.services.audit import audit
        claims = decode_token(token, "verify_email")
        sub = claims.get("sub")
        try:
            uid = uuid.UUID(str(sub)) if sub else None
        except (ValueError, TypeError):
            uid = None
        user = db.get(User, uid) if uid else None
        if not user and claims.get("email"):
            user = db.scalars(select(User).where(User.email == str(claims["email"]).lower(), User.deleted_at.is_(None))).first()
        if not user or user.deleted_at or not user.is_active:
            return HTMLResponse(
                "<html><body style='font-family:-apple-system,sans-serif;text-align:center;padding:48px;background:#f8fafc;'>"
                "<div style='max-width:440px;margin:40px auto;background:#fff;padding:36px;border-radius:12px;border:1px solid #e2e8f0;'>"
                "<h2 style='color:#e11d48;margin-top:0;'>Invalid or Expired Link</h2>"
                "<p style='color:#475569;'>This verification link is no longer valid or has expired.</p>"
                f"<a href='{app_base}/login' style='display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;'>Return to Sign In</a>"
                "</div></body></html>",
                status_code=400,
            )
        if not user.email_verified:
            user.email_verified = True
            audit(db, "auth.email_verified", user_id=user.id)
            db.commit()

        # Set session cookie and redirect to dashboard
        ref_token = create_refresh_token(str(user.id), user.token_version)
        resp = RedirectResponse(f"{app_base}/dashboard?verified=true", status_code=302)
        resp.set_cookie(
            "bz_refresh",
            ref_token,
            httponly=True,
            secure=(s.environment == "production"),
            samesite="lax",
            max_age=s.refresh_token_days * 86400,
            path="/api/v1/auth",
        )
        return resp
    except Exception:
        return RedirectResponse(f"{app_base}/verify-email?token={token}", status_code=302)


NOSTORE = {"Cache-Control": "no-store"}

_PREVIEW_CTX_CACHE: dict[str, tuple[float, any, dict, dict]] = {}
_PREVIEW_CACHE_TTL = 60.0  # seconds


def _snapshot_business(b: Business):
    from types import SimpleNamespace
    return SimpleNamespace(
        id=getattr(b, "id", None),
        name=getattr(b, "name", "Aqivo Store"),
        slug=getattr(b, "slug", "demo"),
        industry=getattr(b, "industry", "retail"),
        tagline=getattr(b, "tagline", None),
        description=getattr(b, "description", None),
        address=getattr(b, "address", None),
        city=getattr(b, "city", None),
        phone=getattr(b, "phone", None),
        whatsapp=getattr(b, "whatsapp", None),
        email=getattr(b, "email", None),
        currency=getattr(b, "currency", "KES"),
        logo_url=getattr(b, "logo_url", None),
        cover_image_url=getattr(b, "cover_image_url", None),
        website=getattr(b, "website", None),
    )


@app.get("/ecomm-templates/{key}", include_in_schema=False)
@app.get("/ecomm-templates/{key}/", include_in_schema=False)
@app.get("/ecomm-templates/{key}/{page_name:path}", include_in_schema=False)
def ecomm_template_preview_page(key: str, request: Request, page_name: str = "index.html", db: Session = Depends(get_db)):
    from app.services import ecomm_site
    import uuid
    if not ecomm_site.is_ecomm(key):
        direct_file = BASE / "public" / "ecomm_templates" / key
        if direct_file.is_file():
            return FileResponse(direct_file)
        target = direct_file / (page_name.strip("/") or "index.html") if page_name else direct_file
        if target.is_file():
            return FileResponse(target)
        raise HTTPException(404, "Template asset not found")

    cleaned_name = page_name.strip("/") if page_name else ""
    if not cleaned_name:
        cleaned_name = "index.html"
    elif not ("." in cleaned_name.split("/")[-1]):
        cleaned_name = f"{cleaned_name}.html"

    is_html = cleaned_name.endswith(".html")
    is_draft = request.query_params.get("draft") == "1"
    if is_draft:
        from app.services.theme_studio import DRAFTS_ROOT
        draft_asset = DRAFTS_ROOT / key / cleaned_name
        if draft_asset.is_file():
            return FileResponse(draft_asset, headers=NOSTORE)

    target_file = BASE / "public" / "ecomm_templates" / key / cleaned_name
    if not is_html:
        if target_file.is_file():
            return FileResponse(target_file, headers=NOSTORE)
        raise HTTPException(404, "Template asset not found")

    bz_slug = request.query_params.get("bz")
    item_id = request.query_params.get("id")
    order_id = request.query_params.get("orderId")
    has_auth_or_order = bool(request.headers.get("authorization") or order_id or item_id or bz_slug)
    is_preview_mode = (request.query_params.get("preview") == "1" or not bz_slug) and not has_auth_or_order
    root_path = f"/ecomm-templates/{key}"

    cache_key = f"{key}:{bz_slug or 'demo'}:{root_path}"
    cached_entry = _PREVIEW_CTX_CACHE.get(cache_key)
    now = time.time()

    if is_preview_mode and cached_entry and (now - cached_entry[0] < _PREVIEW_CACHE_TTL):
        _, business, ecomm_ctx, precomputed_data = cached_entry
    else:
        business = None
        if bz_slug:
            business = db.scalar(select(Business).where(Business.slug == bz_slug))

        if not business and item_id:
            try:
                uid = uuid.UUID(item_id)
                from app.models import Product, Service
                p = db.scalar(select(Product).where(Product.id == uid))
                if p:
                    business = db.scalar(select(Business).where(Business.id == p.business_id))
                else:
                    s = db.scalar(select(Service).where(Service.id == uid))
                    if s:
                        business = db.scalar(select(Business).where(Business.id == s.business_id))
            except (ValueError, TypeError):
                pass

        if not business and order_id:
            try:
                from app.models import Order
                ord_obj = db.scalar(select(Order).where(Order.token == order_id))
                if ord_obj:
                    business = db.scalar(select(Business).where(Business.id == ord_obj.business_id))
            except Exception:
                pass

        if not business:
            auth_h = request.headers.get("authorization", "")
            if auth_h.lower().startswith("bearer "):
                try:
                    token = auth_h.split(" ", 1)[1]
                    from app.core.security import decode_token
                    claims = decode_token(token, "access")
                    uid = uuid.UUID(claims["sub"])
                    u = db.get(User, uid)
                    if u and not u.deleted_at and u.is_active and claims.get("tv") == u.token_version:
                        from app.models import BusinessMember
                        mem = db.scalar(select(BusinessMember).where(BusinessMember.user_id == uid).order_by(BusinessMember.created_at.desc()))
                        if mem:
                            business = db.scalar(select(Business).where(Business.id == mem.business_id))
                except Exception:
                    pass

        if not business:
            refresh_tok = request.cookies.get("bz_refresh")
            if refresh_tok:
                try:
                    from app.core.security import decode_token
                    claims = decode_token(refresh_tok, "refresh")
                    uid = uuid.UUID(claims["sub"])
                    u = db.get(User, uid)
                    if u and not u.deleted_at and u.is_active and claims.get("tv") == u.token_version:
                        from app.models import BusinessMember
                        mem = db.scalar(select(BusinessMember).where(BusinessMember.user_id == uid).order_by(BusinessMember.created_at.desc()))
                        if mem:
                            business = db.scalar(select(Business).where(Business.id == mem.business_id))
                except Exception:
                    pass

        if not business:
            for c_name in request.cookies:
                if c_name.startswith("bz_customer_"):
                    c_slug = c_name[len("bz_customer_"):]
                    if c_slug:
                        business = db.scalar(select(Business).where(Business.slug == c_slug))
                        if business:
                            break

        if not business:
            referer = request.headers.get("referer", "")
            if referer:
                try:
                    from urllib.parse import urlparse
                    r_path = urlparse(referer).path.strip("/").split("/")
                    if r_path and r_path[0] and r_path[0] not in ("dashboard", "api", "static", "ecomm-templates"):
                        business = db.scalar(select(Business).where(Business.slug == r_path[0]))
                except Exception:
                    pass

        if not business:
            business = db.scalars(select(Business).where(Business.status == BusinessStatus.ACTIVE, Business.deleted_at.is_(None))).first()
        if not business:
            business = db.scalars(select(Business).where(Business.deleted_at.is_(None))).first()

        if not business:
            brand_name = ecomm_site.DEMO_BRANDS.get(key, ["Aqivo Demo Store"])[0]
            business = Business(
                name=brand_name,
                slug=key,
                currency="KSh",
                industry="retail",
                address="Kilimani, Nairobi, Kenya",
                phone="+254700000000",
                email="demo@aqivo.shop",
                description=f"Official {brand_name} catalogue and store preview powered by Aqivo.",
                status=BusinessStatus.ACTIVE,
            )

        # If explicit merchant slug was provided or merchant was identified for receipt, redirect to merchant URL
        should_redirect = (bz_slug or (business and cleaned_name == "receipt.html")) and request.query_params.get("preview") != "1"
        if should_redirect and business and business.slug:
            qs = str(request.url.query)
            target_url = f"/{business.slug}/{cleaned_name}" + (f"?{qs}" if qs else "")
            return RedirectResponse(target_url, status_code=302)

        from app.services.site_render import build_context
        ecomm_ctx = build_context(db, business, draft=True, root=root_path)
        precomputed_data = ecomm_site.build_data(db, ecomm_ctx, business)
        business = _snapshot_business(business)
        if is_preview_mode:
            _PREVIEW_CTX_CACHE[cache_key] = (now, business, ecomm_ctx, precomputed_data)

    try:
        html_out = ecomm_site.render_ecomm(
            db, ecomm_ctx, business, key, cleaned_name,
            item_id=request.query_params.get("id"),
            draft=is_draft,
            precomputed_data=precomputed_data,
            order_id=request.query_params.get("orderId") or request.query_params.get("order") or request.query_params.get("receipt") or request.query_params.get("id"),
            token=request.query_params.get("token"),
            phone=request.query_params.get("phone"),
        )
        return HTMLResponse(html_out, headers=NOSTORE)
    except Exception as exc:
        log.warning("render_ecomm preview fallback for %s/%s: %s", key, cleaned_name, exc)
        if is_draft:
            from app.services.theme_studio import DRAFTS_ROOT
            draft_target = DRAFTS_ROOT / key / cleaned_name
            if draft_target.is_file():
                return FileResponse(draft_target, headers=NOSTORE)
        if target_file.is_file():
            return FileResponse(target_file, headers=NOSTORE)
        raise HTTPException(404, "Page not found")


app.mount("/ecomm-templates", StaticFiles(directory=BASE / "public" / "ecomm_templates", html=True), name="ecomm-templates")


@app.get("/", include_in_schema=False)
def root(request: Request):
    accept = request.headers.get("accept", "")
    if "text/html" in accept:
        spa = _spa("")
        if spa is not None:
            return spa
        return RedirectResponse(url="/docs", status_code=302)
    return {
        "app": "Aqivo API",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json",
        "health": "/health",
        "readiness": "/readiness",
        "api_v1": "/api/v1",
    }


@app.get("/api", include_in_schema=False)
def api_root():
    return {
        "app": "Aqivo API",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
        "endpoints": {
            "v1": "/api/v1",
            "health": "/health",
            "readiness": "/readiness",
        },
    }


@app.get("/api/docs", include_in_schema=False)
def api_docs_redirect():
    return RedirectResponse(url="/docs", status_code=302)


@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}


@app.get("/readiness", include_in_schema=False)
def readiness():
    try:
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
        return {"status": "ready", "database": "ok"}
    except Exception:  # noqa: BLE001
        return JSONResponse({"status": "unavailable", "database": "down"}, status_code=503)


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    log.exception("unhandled error", extra={"path": request.url.path})
    return JSONResponse({"detail": "Something went wrong on our side. Please try again."}, status_code=500)


def _message(title: str, body: str, status: int) -> HTMLResponse:
    return HTMLResponse(render("message.html", title=title, body=body), status_code=status)


CACHE = {"Cache-Control": "public, max-age=60, stale-while-revalidate=300"}


@app.get("/sitemap.xml", include_in_schema=False)
def sitemap(db: Session = Depends(get_db)):
    base = settings.public_base_url.rstrip("/")
    slugs = db.scalars(select(Business.slug).where(Business.deleted_at.is_(None), Business.status == BusinessStatus.ACTIVE).limit(50000)).all()
    urls = "".join(f"<url><loc>{base}/{s}</loc></url>" for s in slugs)
    return Response(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{base}/</loc></url>{urls}</urlset>', media_type="application/xml", headers=CACHE)


@app.get("/robots.txt", include_in_schema=False)
def robots():
    base = settings.public_base_url.rstrip("/")
    return PlainTextResponse(f"User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /dashboard\nDisallow: /admin\nSitemap: {base}/sitemap.xml\n")


NOSTORE = {"Cache-Control": "no-store"}


def _to_primary(b: Business, request: Request, parts: list[str]):
    """Once a verified custom domain is the main address, the aqivo.shop link and any other domain redirect to it (same page, same query)."""
    if not b.primary_domain or request.method not in ("GET", "HEAD"):
        return None
    host = request.headers.get("host", "").split(":")[0].lower()
    if host == b.primary_domain:
        return None
    rest = "/" + "/".join(parts[1:]) if len(parts) > 1 else "/"
    q = request.url.query
    return RedirectResponse(f"https://{b.primary_domain}{rest}{'?' + q if q else ''}", status_code=301)


def _site_redirect(db: Session, b: Business, parts: list[str], root: str):
    from app.models import SiteRedirect
    if len(parts) < 2:
        return None
    path = "/" + "/".join(parts[1:]).lower().rstrip("/")
    r = db.scalars(select(SiteRedirect).where(SiteRedirect.business_id == b.id, SiteRedirect.from_path == path)).first()
    if r is None:
        return None
    r.hits += 1
    db.commit()
    target = r.to_path if r.to_path.startswith("http") else f"{root}{r.to_path}" or "/"
    return RedirectResponse(target, status_code=301 if r.permanent else 302)


def _shop_page(db: Session, b: Business, rest: list[str], request: Request, root: str):
    """Catalogue, search, checkout, order and custom pages of a storefront. Returns None when `rest` isn't one of them."""
    from app.services import shop_pages as sp
    head, n = rest[0].lower(), len(rest)
    q = request.query_params
    try:
        page_no = max(int(q.get("page", "1")), 1)
    except ValueError:
        page_no = 1

    def html(tpl: str, ctx: dict, headers=None):
        if not ctx:
            return _message("Page not found", "We couldn't find that page.", 404)
        return HTMLResponse(render(tpl, **ctx), headers=headers or CACHE)

    from app.services import ecomm_site
    ecomm_key = b.website.template.key if (b.website and b.website.status == "PUBLISHED" and b.website.template) else None
    if ecomm_site.is_ecomm(ecomm_key):
        ecomm_ctx = build_context(db, b, root=root)
        if head in ("index", "index.html", "home"):
            return HTMLResponse(ecomm_site.render_ecomm(db, ecomm_ctx, b, ecomm_key, "index.html"), headers=NOSTORE)
        if head in ("cart", "cart.html"):
            return HTMLResponse(ecomm_site.render_ecomm(db, ecomm_ctx, b, ecomm_key, "cart.html"), headers=NOSTORE)
        if head in ("checkout", "checkout.html"):
            return HTMLResponse(ecomm_site.render_ecomm(db, ecomm_ctx, b, ecomm_key, "checkout.html"), headers=NOSTORE)
        if head in ("receipt", "receipt.html"):
            return HTMLResponse(
                ecomm_site.render_ecomm(
                    db,
                    ecomm_ctx,
                    b,
                    ecomm_key,
                    "receipt.html",
                    order_id=request.query_params.get("orderId") or request.query_params.get("order") or request.query_params.get("receipt") or request.query_params.get("id"),
                    token=request.query_params.get("token"),
                    phone=request.query_params.get("phone"),
                ),
                headers=NOSTORE,
            )
        if head in ("product", "product.html"):
            return HTMLResponse(ecomm_site.render_ecomm(db, ecomm_ctx, b, ecomm_key, "product.html", item_id=request.query_params.get("id")), headers=NOSTORE)
        if head in ("service", "service.html"):
            return HTMLResponse(ecomm_site.render_ecomm(db, ecomm_ctx, b, ecomm_key, "service.html", item_id=request.query_params.get("id")), headers=NOSTORE)
        if head in ("styles", "scripts") and n >= 2:
            from pathlib import Path
            from fastapi.responses import FileResponse
            asset_path = (Path(__file__).resolve().parent / "public" / "ecomm_templates" / ecomm_key).joinpath(*rest)
            if asset_path.is_file():
                return FileResponse(asset_path)
        if head in ("_bridge.js", "aqivo-booking.js", "aqivo-booking-bridge.js"):
            from pathlib import Path
            from fastapi.responses import FileResponse
            asset_path = Path(__file__).resolve().parent / "public" / "ecomm_templates" / head
            if asset_path.is_file():
                return FileResponse(asset_path)
            if ecomm_key:
                cand = Path(__file__).resolve().parent / "public" / "ecomm_templates" / ecomm_key / head
                if cand.is_file():
                    return FileResponse(cand)

    if head == "p" and n == 2:
        site = b.website
        pg = db.scalars(select(WebsitePage).where(WebsitePage.website_id == site.id, WebsitePage.slug == rest[1].lower())).first() if site else None
        if pg is None or pg.is_home or not site or site.status != "PUBLISHED" or not (pg.published or {}).get("enabled"):
            return _message("Page not found", "We couldn't find that page.", 404)
        return HTMLResponse(render_business(db, b, page=pg, root=root), headers=CACHE)
    if head == "products":
        if n == 1:
            return html("shop/listing.html", sp.listing(db, b, root, q=q.get("q", "")[:80], sort=q.get("sort", "newest"), page=page_no))
        if n == 2:
            return html("shop/product.html", sp.product_detail(db, b, root, rest[1].lower(), review_token=q.get("rt", "")[:64]))
    if head == "categories" and n == 2:
        return html("shop/listing.html", sp.listing(db, b, root, category_slug=rest[1].lower(), q=q.get("q", "")[:80], sort=q.get("sort", "newest"), page=page_no))
    if head == "collections" and n == 2:
        return html("shop/listing.html", sp.collection_page(db, b, root, rest[1].lower()))
    if head == "services":
        if n == 1:
            return html("shop/listing.html", sp.services_listing(db, b, root))
        if n == 2:
            return html("shop/service.html", sp.service_detail(db, b, root, rest[1].lower()))
    if head == "search" and n == 1:
        return html("shop/search.html", sp.search_page(db, b, root, q.get("q", "")), {"Cache-Control": "no-store", "X-Robots-Tag": "noindex"})
    if head in ("checkout", "cart") and n == 1:
        return html("shop/checkout.html", sp.checkout(db, b, root), NOSTORE)
    if head == "order" and n == 2:
        if q.get("pay") == "return" or q.get("status"):  # back from the payment page: ask the gateway rather than wait for the webhook
            from app.models import Order
            from app.services import online_payments
            o = db.scalars(select(Order).where(Order.business_id == b.id, Order.token == rest[1])).first()
            if o is not None and o.payment_status != "PAID" and o.payment_provider:
                online_payments.verify_order(db, b, o)
                db.commit()
        return html("shop/order.html", sp.order_page(db, b, root, rest[1]), NOSTORE)
    if head == "account" and n == 1:
        return html("shop/account.html", sp._base(db, b, root, "Your account", canonical_path="/account", noindex=True), NOSTORE)
    if head == "bookings" and n == 1:
        ctx = sp._base(db, b, root, "Book an appointment", canonical_path="/bookings")
        return html("shop/bookings.html", ctx)
    if head in ("review", "google-review") and n == 1:
        # If a single-use review token is present, fall through to the catch-all review form handler
        if q.get("t"):
            return None
        url = (b.integrations or {}).get("google_review_url")
        if url:
            import html as _html
            return HTMLResponse(f'<html><head><meta http-equiv="refresh" content="0;url={_html.escape(url)}"></head><body>Redirecting to <a href="{_html.escape(url)}">{_html.escape(url)}</a>...</body></html>', headers=NOSTORE)
        return _message("Leave a review", f"Leave a review for {b.name}.", 404)
    return None



import re

_SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$")


def is_potential_slug(slug: str) -> bool:
    if not slug or len(slug) > 40 or slug in RESERVED_SLUGS or "." in slug:
        return False
    return bool(_SLUG_RE.match(slug))


def _spa(path: str):
    if not DIST.exists():
        return None
    f = (DIST / path).resolve()
    if path and DIST in f.parents and f.is_file():
        return FileResponse(f, headers={"Cache-Control": "public, max-age=31536000, immutable"} if "/assets/" in f"/{path}" else {})
    filename = Path(path).name
    if "." in filename:
        return None
    idx = DIST / "index.html"
    return FileResponse(idx, headers={"Cache-Control": "no-cache"}) if idx.exists() else None


@app.get("/{full_path:path}", include_in_schema=False)
def catch_all(full_path: str, request: Request):
    if not full_path or full_path.strip("/") == "":
        return root(request)
    parts = [p for p in full_path.split("/") if p]
    first = parts[0].lower() if parts else ""
    if first == "ecomm-templates":
        key = parts[1] if len(parts) > 1 else ""
        subpath = "/".join(parts[2:]) if len(parts) > 2 else "index.html"
        _db = SessionLocal()
        try:
            return ecomm_template_preview_page(key=key, request=request, page_name=subpath, db=_db)
        finally:
            _db.close()
    if any(p.startswith(".") for p in parts) or first in RESERVED_SLUGS:
        resp = _spa(full_path)
        if resp is not None:
            return resp
        return _message("Page not found", "We couldn't find that page.", 404)
    if is_potential_slug(first) and not (DIST / full_path).is_file():
        db = SessionLocal()
        try:
            b = db.scalars(select(Business).where(Business.slug == first, Business.deleted_at.is_(None))).first()
            if b:
                if b.status != BusinessStatus.ACTIVE:
                    return _message("Temporarily unavailable", "This business page is currently unavailable.", 503)
                root = "" if (request.scope.get("aqivo_host") == b.slug or request.scope.get("bizora_host") == b.slug) else f"/{b.slug}"
                moved = _to_primary(b, request, parts)
                if moved is not None:
                    return moved
                redir = _site_redirect(db, b, parts, root)
                if redir is not None:
                    return redir
                if len(parts) == 1:
                    return HTMLResponse(render_business(db, b, root=root), headers=CACHE)
                shop = _shop_page(db, b, parts[1:], request, root)
                if shop is not None:
                    return shop
                if parts[1] == "review" and len(parts) == 2:
                    ctx = build_context(db, b, force_profile=True)
                    token = request.query_params.get("t", "")
                    rr = db.scalars(select(ReviewRequest).where(ReviewRequest.token == token, ReviewRequest.business_id == b.id, ReviewRequest.completed_at.is_(None))).first() if token else None
                    ctx.update(token=token if rr else "", verified=rr is not None, prefill_name="")
                    ctx["seo"] = {**ctx["seo"], "robots": "noindex,follow", "title": f"Review {b.name}"}
                    return HTMLResponse(render("review.html", **ctx), headers={"Cache-Control": "no-store"})
                if parts[1] == "sitemap.xml":
                    from app.models import Product, Service, ServiceCategory
                    base = f"https://{b.primary_domain}" if b.primary_domain else settings.public_base_url.rstrip("/") + f"/{b.slug}"
                    urls = [base] + [f"{base}/products"]
                    urls += [f"{base}/products/{x}" for x in db.scalars(select(Product.slug).where(Product.business_id == b.id, Product.deleted_at.is_(None), Product.status == "ACTIVE").limit(5000))]
                    urls += [f"{base}/categories/{x}" for x in db.scalars(select(ServiceCategory.slug).where(ServiceCategory.business_id == b.id, ServiceCategory.is_visible.is_(True), ServiceCategory.slug.isnot(None)))]
                    from app.models import Collection
                    urls += [f"{base}/collections/{x}" for x in db.scalars(select(Collection.slug).where(Collection.business_id == b.id, Collection.is_visible.is_(True)))]
                    urls += [f"{base}/services/{x}" for x in db.scalars(select(Service.slug).where(Service.business_id == b.id, Service.deleted_at.is_(None), Service.is_active.is_(True), Service.slug.isnot(None)))]
                    if b.website and b.website.status == "PUBLISHED":
                        urls += [f"{base}/p/{x.slug}" for x in db.scalars(select(WebsitePage).where(WebsitePage.website_id == b.website.id, WebsitePage.is_home.is_(False)))
                                 if (x.published or {}).get("enabled")]
                    body = "".join(f"<url><loc>{u}</loc></url>" for u in urls)
                    return Response(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}</urlset>', media_type="application/xml")
                if parts[1] == "robots.txt":
                    return PlainTextResponse(f"User-agent: *\nAllow: /\nSitemap: {settings.public_base_url.rstrip('/')}/{b.slug}/sitemap.xml\n")
        finally:
            db.close()
    resp = _spa(full_path)
    if resp is not None:
        return resp
    if first == "api":
        raise HTTPException(404, "Not found")
    return _message("Page not found", "We couldn't find that page. If you're looking for a business, check the link.", 404)
