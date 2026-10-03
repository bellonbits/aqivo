from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Review


def rating_summary(db: Session, business_id) -> dict:
    row = db.execute(
        select(func.count(Review.id), func.avg(Review.rating)).where(
            Review.business_id == business_id, Review.deleted_at.is_(None), Review.is_published.is_(True))
    ).one()
    count = row[0] or 0
    return {"count": count, "average": round(float(row[1]), 1) if count else None}
