"""Opt-in automation. Without a WhatsApp Business API, Bizora can't send on the owner's behalf — and shouldn't. So "automation" means: once a day,
for the things the owner turned on, we *prepare* the draft (win-back list, review requests, lead follow-ups) and tell them it's ready. They review and send."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Business, MarketingCampaign
from app.services import growth_plan as gp
from app.services import marketing as mk
from app.services.notifications import notify
from app.services.plans import has_feature

AUTOMATIONS = {
    "auto_followups": {"label": "Prepare follow-ups for leads waiting 2+ hours", "kind": "FOLLOWUP"},
    "auto_winback": {"label": "Prepare win-back messages for customers inactive 45+ days", "kind": "REACTIVATION"},
    "auto_review_requests": {"label": "Prepare review requests after completed visits and orders", "kind": "REVIEW_REQUEST"},
}


def settings(b: Business) -> dict:
    s = b.growth_settings or {}
    return {**{k: False for k in AUTOMATIONS}, **{k: bool(s.get(k)) for k in AUTOMATIONS}, "last_run": s.get("last_run")}


def update(b: Business, data: dict) -> dict:
    cur = dict(b.growth_settings or {})
    for k in AUTOMATIONS:
        if k in data:
            if not isinstance(data[k], bool):
                from app.core.errors import bad_request
                raise bad_request(f"{k} must be on or off")
            cur[k] = data[k]
    b.growth_settings = cur
    return settings(b)


def _open_recently(db: Session, b: Business, kind: str) -> bool:
    since = datetime.now(timezone.utc) - timedelta(days=7)
    return bool(db.scalar(select(MarketingCampaign.id).where(MarketingCampaign.business_id == b.id, MarketingCampaign.kind == kind, MarketingCampaign.created_by_ai.is_(True),
                                                             MarketingCampaign.status.in_(("DRAFT", "SCHEDULED")), MarketingCampaign.created_at >= since)))


def run_daily(db: Session, b: Business, *, force: bool = False) -> list[dict]:
    """Idempotent per day. Returns what was prepared."""
    today = date.today().isoformat()
    cfg = settings(b)
    if not force and cfg["last_run"] == today:
        return []
    made: list[dict] = []
    if not has_feature(db, b, "marketing"):
        return made
    if cfg["auto_followups"] and not _open_recently(db, b, "FOLLOWUP"):
        item = gp.leads_waiting(db, b)
        if item and item["action"]["type"] == "follow_up_leads":
            c = mk.create_followup_campaign(db, b, item["action"]["payload"]["lead_ids"], by_ai=True)
            made.append({"kind": "FOLLOWUP", "campaign": c, "title": f"{len(c.messages)} lead follow-ups are ready"})
    if cfg["auto_winback"] and not _open_recently(db, b, "REACTIVATION"):
        item = gp.winback(db, b)
        if item:
            p = item["action"]["payload"]
            c = mk.create_campaign(db, b, name=p["name"], kind=p["kind"], message_template=p["message_template"], audience=p["audience"], by_ai=True)
            if c.messages:
                made.append({"kind": "REACTIVATION", "campaign": c, "title": f"{len(c.messages)} win-back messages are ready"})
    if cfg["auto_review_requests"] and not _open_recently(db, b, "REVIEW_REQUEST"):
        item = gp.reviews_due(db, b)
        if item:
            p = item["action"]["payload"]
            c = mk.create_review_campaign(db, b, booking_ids=p["booking_ids"], order_ids=p["order_ids"], by_ai=True)
            made.append({"kind": "REVIEW_REQUEST", "campaign": c, "title": f"{len(c.messages)} review requests are ready"})
    for m in made:
        notify(db, "growth_ready", b.email, business_id=b.id, title=m["title"], body="Aqivo prepared this from your latest activity.", href=f"/dashboard/marketing?open={m['campaign'].id}")
    if not force and any(cfg[k] for k in AUTOMATIONS):  # a manual "run now" doesn't use up the daily slot
        cur = dict(b.growth_settings or {})
        cur["last_run"] = today
        b.growth_settings = cur
    db.flush()
    return made
