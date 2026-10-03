import uuid
from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import AuditLog


def client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


def audit(db: Session, action: str, *, user_id: uuid.UUID | None = None, business_id: uuid.UUID | None = None,
          impersonator_id: uuid.UUID | None = None, resource_type: str | None = None, resource_id: Any = None,
          request: Request | None = None, meta: dict | None = None) -> None:
    """Adds an audit row to the current transaction (committed with the caller's work)."""
    db.add(AuditLog(action=action, user_id=user_id, business_id=business_id, impersonator_id=impersonator_id,
                    resource_type=resource_type, resource_id=str(resource_id) if resource_id else None,
                    ip=client_ip(request), meta=meta or {}))
