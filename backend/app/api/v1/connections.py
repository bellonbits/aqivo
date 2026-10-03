"""Connect your own payment gateway, WhatsApp number, Instagram and Google reviews. Secrets are write-only."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import TenantContext, require
from app.api.helpers import log
from app.core.db import get_db
from app.core.errors import bad_request, or404
from app.core.rate_limit import rate_limit
from app.models import MarketingCampaign, MarketingMessage, WhatsAppMessage
from app.services import connections as cx
from app.services import gateways, social, whatsapp
from app.services import marketing as mk

router = APIRouter(prefix="/connections", tags=["connections"])
wa_router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


class ConnIn(BaseModel):
    config: dict = Field(default_factory=dict)
    secrets: dict = Field(default_factory=dict)
    enabled: bool | None = None


@router.get("")
def list_connections(ctx: TenantContext = Depends(require("store:read")), db: Session = Depends(get_db)):
    return {"providers": [cx.public_view(db, ctx.business, k) for k in cx.PROVIDERS]}


@router.put("/{provider}")
def save_connection(provider: str, body: ConnIn, request: Request, ctx: TenantContext = Depends(require("store:write")), db: Session = Depends(get_db)):
    if provider not in cx.PROVIDERS:
        raise bad_request("Unknown connection")
    cx.save(db, ctx.business, provider, body.config, body.secrets, body.enabled)
    log(ctx, "connection.saved", request, "connection", None, provider=provider)  # never log the values
    db.commit()
    return cx.public_view(db, ctx.business, provider)


@router.delete("/{provider}", status_code=204)
def remove_connection(provider: str, request: Request, ctx: TenantContext = Depends(require("store:write")), db: Session = Depends(get_db)):
    row = cx.get_row(db, ctx.business, provider)
    if row is not None:
        db.delete(row)
        log(ctx, "connection.removed", request, "connection", None, provider=provider)
        db.commit()


@router.post("/{provider}/test")
def test_connection(provider: str, ctx: TenantContext = Depends(require("store:write")), db: Session = Depends(get_db), _rl=Depends(rate_limit("conn-test", 15, 600))):
    row = or404(cx.get_row(db, ctx.business, provider), "Connection")
    cfg, sec = dict(row.config or {}), None
    from app.services import vault
    sec = vault.unseal(row.secrets_enc)
    if row.last_error and row.last_error.startswith("Missing"):
        raise bad_request(row.last_error)
    try:
        if provider in gateways.GATEWAYS:
            gateways.GATEWAYS[provider].test(cfg, sec)
        elif provider == "whatsapp_cloud":
            whatsapp_test(cfg, sec)
        elif provider == "instagram":
            social.instagram_refresh(db, ctx.business, force=True)
        elif provider == "google_places":
            social.google_refresh(db, ctx.business, force=True)
        cx.mark_tested(db, row, True)
    except Exception as e:  # noqa: BLE001
        cx.mark_tested(db, row, False, str(e))
    db.commit()
    return cx.public_view(db, ctx.business, provider)


def whatsapp_test(cfg: dict, sec: dict) -> None:
    with gateways.http_client() as c:
        r = c.get(f"{whatsapp.GRAPH}/{cfg['phone_number_id']}", headers={"Authorization": f"Bearer {sec['access_token']}"}, params={"fields": "display_phone_number,verified_name"})
    if r.status_code in (400, 401, 403):
        raise gateways.GatewayError("WhatsApp rejected the token or phone number ID")
    if r.status_code != 200:
        raise gateways.GatewayError("Couldn't reach WhatsApp")


# ------------------------------------------------------------------- inbox
class ReplyIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


def _msg(m: WhatsAppMessage) -> dict:
    return {"id": str(m.id), "direction": m.direction, "body": m.body, "status": m.status, "kind": m.kind, "template": m.template, "error": m.error, "purpose": m.purpose, "created_at": m.created_at}


@wa_router.get("/status")
def wa_status(ctx: TenantContext = Depends(require("leads:read")), db: Session = Depends(get_db)):
    return {"connected": whatsapp.configured(db, ctx.business)}


@wa_router.get("/conversations")
def conversations(ctx: TenantContext = Depends(require("leads:read")), db: Session = Depends(get_db)):
    return {"connected": whatsapp.configured(db, ctx.business), "items": whatsapp.conversations(db, ctx.business)}


@wa_router.get("/conversations/{phone}")
def thread(phone: str, ctx: TenantContext = Depends(require("leads:read")), db: Session = Depends(get_db)):
    p = whatsapp.digits(phone)
    rows = db.scalars(select(WhatsAppMessage).where(WhatsAppMessage.business_id == ctx.business_id, WhatsAppMessage.phone == p).order_by(WhatsAppMessage.created_at).limit(300)).all()
    for m in rows:
        if m.direction == "IN" and m.status == "RECEIVED":
            m.status = "SEEN"
    db.commit()
    return {"phone": p, "window_open": whatsapp.window_open(db, ctx.business, p), "messages": [_msg(m) for m in rows]}


@wa_router.post("/conversations/{phone}/reply", status_code=201)
def reply(phone: str, body: ReplyIn, request: Request, ctx: TenantContext = Depends(require("leads:write")), db: Session = Depends(get_db), _rl=Depends(rate_limit("wa-reply", 60, 600))):
    try:
        m = whatsapp.send(db, ctx.business, phone, body.body.strip(), purpose="reply")
    except whatsapp.WhatsAppError as e:
        db.commit()  # keep the failed attempt visible in the thread
        raise bad_request(str(e))
    log(ctx, "whatsapp.reply", request, "whatsapp", m.id)
    db.commit()
    return _msg(m)


# ---------------------------------------------------- campaigns sent through the API
@wa_router.post("/campaigns/{cid}/send")
def send_campaign(cid: uuid.UUID, request: Request, ctx: TenantContext = Depends(require("marketing:write")), db: Session = Depends(get_db), _rl=Depends(rate_limit("wa-camp", 5, 600))):
    """Send every unsent message of a *confirmed* campaign through your WhatsApp number. Messages outside the 24-hour window use your campaign template."""
    c = or404(db.scalars(select(MarketingCampaign).where(MarketingCampaign.id == cid, MarketingCampaign.business_id == ctx.business_id)).first(), "Campaign")
    if c.status not in ("SCHEDULED", "SENT"):
        raise bad_request("Confirm the campaign before sending it")
    if not whatsapp.configured(db, ctx.business):
        raise bad_request("Connect your WhatsApp number first")
    cfg = cx.creds(db, ctx.business, "whatsapp_cloud")[0]
    sent = failed = 0
    errors: list[str] = []
    for m in [m for m in c.messages if m.status != "SENT"][:200]:
        if not m.recipient_phone:
            continue
        try:
            wm = whatsapp.send(db, ctx.business, m.recipient_phone, m.body, purpose="campaign", ref_id=str(m.id), template=cfg.get("campaign_template") or None, params=[m.body], contact_name=m.recipient_name)
            mk.mark_message_sent(db, c, m)
            m.status = "SENT"
            sent += 1
        except whatsapp.WhatsAppError as e:
            m.status = "FAILED"
            failed += 1
            if str(e) not in errors:
                errors.append(str(e))
    log(ctx, "whatsapp.campaign_sent", request, "campaign", c.id, sent=sent, failed=failed)
    db.commit()
    return {"sent": sent, "failed": failed, "errors": errors[:3]}
