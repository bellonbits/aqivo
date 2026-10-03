"""AI-assisted catalogue setup. `suggest` saves nothing; `apply` saves only what the owner confirmed."""
from typing import Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import TenantContext, require
from app.api.helpers import log
from app.core.db import get_db
from app.core.errors import bad_request
from app.core.rate_limit import rate_limit
from app.models import Product, Service
from app.services import catalog as cat
from app.services import catalog_ai as cai
from app.services.plans import check_limit

router = APIRouter(prefix="/ai/catalog", tags=["ai"])


class SuggestIn(BaseModel):
    mode: Literal["paste", "profile"] = "profile"
    kind: Literal["product", "service"] | None = None
    text: str = Field(default="", max_length=8000)


class ItemIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=300)
    price: float | None = Field(default=None, ge=0, lt=100_000_000)
    category: str | None = Field(default=None, max_length=80)
    duration_minutes: int | None = Field(default=None, ge=5, le=1440)
    estimate: bool = False


class ApplyIn(BaseModel):
    kind: Literal["product", "service"]
    items: list[ItemIn] = Field(min_length=1, max_length=cai.MAX_ITEMS)


@router.post("/suggest")
def suggest(body: SuggestIn, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db), _rl=Depends(rate_limit("cat-ai", 20, 600))):
    return cai.suggest(db, ctx.business, body.mode, body.text, body.kind)


@router.post("/apply", status_code=201)
def apply(body: ApplyIn, request: Request, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db), _rl=Depends(rate_limit("cat-apply", 20, 600))):
    b = ctx.business
    if body.kind == "service" and not ctx.can("services:write"):
        raise bad_request("You don't have permission to add services")
    model = Product if body.kind == "product" else Service
    have = {n.lower() for n in db.scalars(select(model.name).where(model.business_id == b.id, model.deleted_at.is_(None)))}
    count = db.scalar(select(func.count()).select_from(model).where(model.business_id == b.id, model.deleted_at.is_(None))) or 0
    pos = (db.scalar(select(func.max(model.position)).where(model.business_id == b.id)) or 0) + 1
    created, skipped, hidden = 0, [], 0
    for it in body.items:
        name = it.name.strip()
        if name.lower() in have:
            skipped.append({"name": name, "reason": "Already in your catalogue"})
            continue
        try:
            check_limit(db, b, "products" if body.kind == "product" else "services", count)
        except Exception:  # noqa: BLE001 - plan limit: stop and say so
            skipped.append({"name": name, "reason": "Plan limit reached"})
            break
        c = cai._category(db, b, it.category)
        hide = it.estimate or it.price is None  # no confirmed price → keep hidden so no guessed price is shown to customers
        if body.kind == "product":
            db.add(Product(business_id=b.id, name=name[:160], slug=cat.unique_product_slug(db, b.id, name), description=it.description, short_description=it.description[:300], price=it.price or 0,
                           category_id=c.id if c else None, currency=b.currency, position=pos, status="DRAFT" if hide else "ACTIVE"))
        else:
            db.add(Service(business_id=b.id, name=name[:160], slug=cat.unique_service_slug(db, b.id, name), description=it.description, price=it.price or 0, currency=b.currency,
                           duration_minutes=it.duration_minutes or 60, category_id=c.id if c else None, position=pos, is_active=not hide))
        db.flush()
        have.add(name.lower())
        created += 1
        count += 1
        pos += 1
        hidden += 1 if hide else 0
    if created and b.website:
        from app.services.website import touch_draft
        touch_draft(b.website)
    log(ctx, "catalog.ai_applied", request, "catalog", None, kind=body.kind, created=created)
    db.commit()
    return {"created": created, "hidden": hidden, "skipped": skipped}
