import uuid

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import TenantContext, get_tenant, require
from app.api.helpers import log
from app.core.db import get_db
from app.core.config import get_settings
from app.core.errors import bad_request, not_found, upgrade_required
from app.core.rate_limit import rate_limit
from app.models import Domain, SupportTicket
from app.services import domains as dom
from app.services.business import business_urls
from app.services.plans import check_limit, has_feature, usage
from app.core.security import random_token

domains_router = APIRouter(prefix="/domains", tags=["domains"])
support_router = APIRouter(prefix="/support", tags=["support"])


@domains_router.get("/check-caddy", include_in_schema=False)
def check_caddy_domain(domain: str = "", db: Session = Depends(get_db)):
    """Used by Caddy's on_demand_tls ask endpoint to verify whether a domain is authorized for automatic TLS certificate issuance."""
    if not domain:
        return Response(status_code=400)
    d_clean = domain.lower().strip()
    s = get_settings()
    base = s.base_domain.lower()
    if d_clean == base or d_clean.endswith("." + base):
        return Response(status_code=200)
    exists = db.scalar(
        select(Domain.id).where(
            Domain.domain == d_clean,
            Domain.type == "CUSTOM",
            Domain.verification_status == "VERIFIED",
            Domain.status == "ACTIVE",
        ).limit(1)
    )
    if exists:
        return Response(status_code=200)
    return Response(status_code=403)


class DomainIn(BaseModel):
    domain: str = Field(min_length=4, max_length=253)


def _domain_out(d: Domain) -> dict:
    out = {"id": str(d.id), "domain": d.domain, "type": d.type, "status": d.status, "verification_status": d.verification_status, "ssl_status": d.ssl_status,
           "is_primary": d.is_primary, "dns_ok": d.dns_ok, "last_checked_at": d.last_checked_at, "last_error": d.last_error}
    if d.type == "CUSTOM":
        out["verification_token"] = d.verification_token
        out["setup"] = dom.instructions(d.domain, d.verification_token or "")
    return out


@domains_router.get("")
def list_domains(ctx: TenantContext = Depends(require("business:read")), db: Session = Depends(get_db)):
    rows = list(db.scalars(select(Domain).where(Domain.business_id == ctx.business_id).order_by(Domain.created_at)))
    u = usage(db, ctx.business)["custom_domains"]
    return {"domains": [_domain_out(d) for d in rows], "urls": business_urls(ctx.business), "primary_domain": ctx.business.primary_domain,
            "custom_domains": {"available": has_feature(db, ctx.business, "custom_domain"), "used": u["used"], "limit": u["limit"], "cname_target": get_settings().custom_domain_cname}}


@domains_router.post("", status_code=201)
def add_domain(body: DomainIn, request: Request, ctx: TenantContext = Depends(require("members:manage")), db: Session = Depends(get_db)):
    """Registers a custom domain and returns the DNS records to add. It serves traffic once ownership is verified."""
    if not has_feature(db, ctx.business, "custom_domain"):
        raise upgrade_required("custom_domain", "Custom domains are part of the Grow plan and above.")
    domain = dom.normalise(body.domain)
    check_limit(db, ctx.business, "custom_domains", usage(db, ctx.business)["custom_domains"]["used"])
    if db.scalar(select(Domain.id).where(Domain.domain == domain)):
        raise bad_request("That domain is already registered")
    d = Domain(business_id=ctx.business_id, domain=domain, type="CUSTOM", status="PENDING", verification_status="PENDING", ssl_status="NONE", verification_token=f"bizora-verify-{random_token(12)}")
    db.add(d)
    db.flush()
    log(ctx, "domain.added", request, "domain", d.id, domain=domain)
    db.commit()
    return _domain_out(d)


def _get(db: Session, ctx: TenantContext, did: uuid.UUID) -> Domain:
    d = db.scalars(select(Domain).where(Domain.id == did, Domain.business_id == ctx.business_id, Domain.type == "CUSTOM")).first()
    if d is None:
        raise not_found("Domain")
    return d


@domains_router.post("/{did}/verify")
def verify_domain(did: uuid.UUID, request: Request, ctx: TenantContext = Depends(require("members:manage")), db: Session = Depends(get_db),
                  _rl=Depends(rate_limit("domain-verify", 20, 600))):
    d = dom.run_checks(db, _get(db, ctx, did))
    log(ctx, "domain.checked", request, "domain", d.id, verified=d.verification_status == "VERIFIED", dns_ok=d.dns_ok, tls=d.ssl_status)
    db.commit()
    return _domain_out(d)


class PrimaryIn(BaseModel):
    primary: bool = True


@domains_router.post("/{did}/primary")
def make_primary(did: uuid.UUID, body: PrimaryIn, request: Request, ctx: TenantContext = Depends(require("members:manage")), db: Session = Depends(get_db)):
    d = _get(db, ctx, did)
    dom.set_primary(db, ctx.business, d if body.primary else None)
    log(ctx, "domain.primary", request, "domain", d.id, primary=body.primary)
    db.commit()
    return {"domains": [_domain_out(x) for x in db.scalars(select(Domain).where(Domain.business_id == ctx.business_id).order_by(Domain.created_at))], "primary_domain": ctx.business.primary_domain}


@domains_router.delete("/{did}", status_code=204)
def remove_domain(did: uuid.UUID, request: Request, ctx: TenantContext = Depends(require("members:manage")), db: Session = Depends(get_db)):
    d = _get(db, ctx, did)
    if d.is_primary:
        dom.set_primary(db, ctx.business, None)
    dom._forget(d.domain)
    log(ctx, "domain.removed", request, "domain", d.id, domain=d.domain)
    db.delete(d)
    db.commit()


@support_router.post("/tickets", status_code=201)
def open_ticket(subject: str, body: str = "", ctx: TenantContext = Depends(get_tenant), db: Session = Depends(get_db)):
    if not subject.strip():
        raise bad_request("Subject required")
    t = SupportTicket(business_id=ctx.business_id, opened_by_id=ctx.user.id, subject=subject[:200], body=body[:4000])
    db.add(t)
    db.commit()
    return {"id": str(t.id)}
