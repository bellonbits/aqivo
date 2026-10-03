from typing import Any

from fastapi import Request

from app.api.deps import TenantContext
from app.services.audit import audit


def log(ctx: TenantContext, action: str, request: Request | None = None, resource_type: str | None = None, resource_id: Any = None, **meta) -> None:
    audit(ctx.db, action, user_id=ctx.user.id, business_id=ctx.business.id, impersonator_id=ctx.impersonator_id,
          resource_type=resource_type, resource_id=resource_id, request=request, meta=meta)
