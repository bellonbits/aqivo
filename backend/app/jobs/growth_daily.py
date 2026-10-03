"""Run once a day (cron / scheduler): prepares drafts for every business that turned automations on.  python -m app.jobs.growth_daily"""
import logging

from sqlalchemy import select

from app.core.db import SessionLocal
from app.models import Business
from app.services import automation

log = logging.getLogger("bizora.jobs")


def main() -> int:
    db = SessionLocal()
    total = 0
    try:
        for b in db.scalars(select(Business).where(Business.deleted_at.is_(None), Business.status == "ACTIVE")):
            s = automation.settings(b)
            if not any(s[k] for k in automation.AUTOMATIONS):
                continue
            try:
                total += len(automation.run_daily(db, b))
                db.commit()
            except Exception:  # noqa: BLE001 - one business must never stop the rest
                db.rollback()
                log.exception("growth automation failed", extra={"business": str(b.id)})
    finally:
        db.close()
    return total


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(f"prepared {main()} drafts")
