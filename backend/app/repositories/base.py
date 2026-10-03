"""Tenant-scoped repository. Every query is filtered by business_id, so a route handler *cannot*
forget the tenant filter. The business_id always comes from the authenticated context."""
import uuid
from datetime import datetime, timezone
from typing import Any, Generic, TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

T = TypeVar("T")


class TenantRepository(Generic[T]):
    model: type[T]

    def __init__(self, db: Session, business_id: uuid.UUID):
        self.db = db
        self.business_id = business_id

    def query(self, include_deleted: bool = False) -> Select:
        q = select(self.model).where(self.model.business_id == self.business_id)  # type: ignore[attr-defined]
        if not include_deleted and hasattr(self.model, "deleted_at"):
            q = q.where(self.model.deleted_at.is_(None))  # type: ignore[attr-defined]
        return q

    def get(self, id: uuid.UUID, include_deleted: bool = False) -> T | None:
        return self.db.scalar(self.query(include_deleted).where(self.model.id == id))  # type: ignore[attr-defined]

    def list(self, *where: Any, order_by: Any = None, limit: int | None = None, offset: int = 0) -> list[T]:
        q = self.query()
        for w in where:
            q = q.where(w)
        if order_by is not None:
            q = q.order_by(*order_by) if isinstance(order_by, (list, tuple)) else q.order_by(order_by)
        if limit:
            q = q.limit(limit).offset(offset)
        return list(self.db.scalars(q))

    def count(self, *where: Any) -> int:
        q = select(func.count()).select_from(self.model).where(self.model.business_id == self.business_id)  # type: ignore[attr-defined]
        if hasattr(self.model, "deleted_at"):
            q = q.where(self.model.deleted_at.is_(None))  # type: ignore[attr-defined]
        for w in where:
            q = q.where(w)
        return self.db.scalar(q) or 0

    def add(self, **data: Any) -> T:
        data.pop("business_id", None)  # never trust a client-supplied tenant
        obj = self.model(business_id=self.business_id, **data)  # type: ignore[call-arg]
        self.db.add(obj)
        self.db.flush()
        return obj

    def update(self, obj: T, **data: Any) -> T:
        for k, v in data.items():
            if k in ("id", "business_id"):
                continue
            setattr(obj, k, v)
        self.db.flush()
        return obj

    def delete(self, obj: T) -> None:
        if hasattr(obj, "deleted_at"):
            obj.deleted_at = datetime.now(timezone.utc)  # type: ignore[attr-defined]
            self.db.flush()
        else:
            self.db.delete(obj)
            self.db.flush()
