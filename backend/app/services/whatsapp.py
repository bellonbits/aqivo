"""WhatsApp Business Cloud API (Meta). Sends from the business's own number using its own credentials.

The platform rules are enforced here, not hidden: free-form text can only be sent within 24 hours of the customer's last message to the
business; outside that window an approved *template* is required, and if none is configured the send fails with a clear reason."""
from __future__ import annotations

import hashlib
import hmac
import json
import re
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Business, Customer, WhatsAppMessage
from app.services import connections as cx
from app.services import gateways

GRAPH = "https://graph.facebook.com/v21.0"
WINDOW = timedelta(hours=24)


class WhatsAppError(Exception):
    pass


def digits(phone: str | None) -> str:
    return re.sub(r"\D", "", phone or "")


def configured(db: Session, b: Business) -> bool:
    c = cx.creds(db, b, "whatsapp_cloud")
    return bool(c and c[1].get("access_token") and c[0].get("phone_number_id"))


def window_open(db: Session, b: Business, phone: str) -> bool:
    last = db.scalar(select(func.max(WhatsAppMessage.created_at)).where(WhatsAppMessage.business_id == b.id, WhatsAppMessage.phone == digits(phone), WhatsAppMessage.direction == "IN"))
    return bool(last and datetime.now(timezone.utc) - last < WINDOW)


def _post(cfg: dict, sec: dict, payload: dict) -> str:
    with gateways.http_client() as c:
        r = c.post(f"{GRAPH}/{cfg['phone_number_id']}/messages", headers={"Authorization": f"Bearer {sec['access_token']}", "Content-Type": "application/json"}, json={"messaging_product": "whatsapp", **payload})
    try:
        d = r.json()
    except ValueError:
        raise WhatsAppError("WhatsApp sent an unreadable reply")
    if r.status_code != 200:
        err = (d.get("error") or {})
        raise WhatsAppError(err.get("error_user_msg") or err.get("message") or "WhatsApp rejected the message")
    return (d.get("messages") or [{}])[0].get("id", "")


def send(db: Session, b: Business, phone: str, body: str, *, purpose: str, ref_id: str | None = None, template: str | None = None, params: list[str] | None = None,
         contact_name: str | None = None) -> WhatsAppMessage:
    """Send one message, record it, and raise WhatsAppError (after recording the failure) if it can't be sent."""
    c = cx.creds(db, b, "whatsapp_cloud")
    if not c or not c[1].get("access_token") or not c[0].get("phone_number_id"):
        raise WhatsAppError("WhatsApp isn't connected")
    cfg, sec = c
    to = digits(phone)
    if len(to) < 8:
        raise WhatsAppError("That phone number looks wrong")
    msg = WhatsAppMessage(business_id=b.id, phone=to, direction="OUT", body=body, purpose=purpose, ref_id=ref_id, status="QUEUED", contact_name=contact_name)
    db.add(msg)
    try:
        if window_open(db, b, to):
            wid = _post(cfg, sec, {"to": to, "type": "text", "text": {"body": body[:4000], "preview_url": True}})
        elif template:
            msg.kind, msg.template = "template", template
            wid = _post(cfg, sec, {"to": to, "type": "template", "template": {"name": template, "language": {"code": cfg.get("language") or "en"},
                                                                              "components": [{"type": "body", "parameters": [{"type": "text", "text": str(p)[:500]} for p in (params or [])]}] if params else []}})
        else:
            raise WhatsAppError("This customer hasn't messaged you in the last 24 hours, so WhatsApp only allows an approved template. Add a template name in your WhatsApp connection.")
    except WhatsAppError as e:
        msg.status, msg.error = "FAILED", str(e)[:300]
        db.flush()
        raise
    except Exception as e:  # noqa: BLE001 - network problems
        msg.status, msg.error = "FAILED", "Couldn't reach WhatsApp"
        db.flush()
        raise WhatsAppError("Couldn't reach WhatsApp. Try again shortly.") from e
    msg.status, msg.provider_id = "SENT", wid
    db.flush()
    return msg


def notify_order(db: Session, order, status_text: str, url: str) -> None:
    """Best-effort order update on WhatsApp. Never raises: a failed message must not block the order."""
    b = db.get(Business, order.business_id)
    if b is None or not order.customer_phone or not configured(db, b) or (b.store_settings or {}).get("wa_order_updates") is False:
        return
    cfg = cx.creds(db, b, "whatsapp_cloud")[0]
    first = (order.customer_name or "there").split()[0]
    try:
        send(db, b, order.customer_phone, f"Hi {first}, your order #{order.number} with {b.name} is now: {status_text}. Track it: {url}", purpose="order", ref_id=str(order.id),
             template=cfg.get("order_template") or None, params=[first, str(order.number), status_text], contact_name=order.customer_name)
    except WhatsAppError:
        pass


# ------------------------------------------------------------------- webhook
def verify_handshake(db: Session, b: Business, mode: str | None, token: str | None) -> bool:
    c = cx.creds(db, b, "whatsapp_cloud")
    return bool(c and mode == "subscribe" and token and c[1].get("verify_token") and hmac.compare_digest(token, c[1]["verify_token"]))


def handle_webhook(db: Session, b: Business, signature: str, body: bytes) -> int:
    c = cx.creds(db, b, "whatsapp_cloud")
    if not c or not c[1].get("app_secret"):
        return 403
    good = "sha256=" + hmac.new(c[1]["app_secret"].encode(), body, hashlib.sha256).hexdigest()
    if not signature or not hmac.compare_digest(signature, good):
        return 403
    data = json.loads(body or b"{}")
    for entry in data.get("entry", []):
        for ch in entry.get("changes", []):
            v = ch.get("value") or {}
            if (v.get("metadata") or {}).get("phone_number_id") not in (None, c[0].get("phone_number_id")):
                continue  # a different number on the same app
            names = {x.get("wa_id"): (x.get("profile") or {}).get("name") for x in v.get("contacts", [])}
            for m in v.get("messages", []):
                if db.scalar(select(WhatsAppMessage.id).where(WhatsAppMessage.business_id == b.id, WhatsAppMessage.provider_id == m.get("id"))):
                    continue  # Meta retries
                text = (m.get("text") or {}).get("body") or f"[{m.get('type', 'message')}]"
                ts = datetime.fromtimestamp(int(m.get("timestamp", 0)), timezone.utc) if m.get("timestamp") else datetime.now(timezone.utc)
                wa = digits(m.get("from"))
                db.add(WhatsAppMessage(business_id=b.id, phone=wa, direction="IN", body=text[:4000], status="RECEIVED", provider_id=m.get("id"), created_at=ts, contact_name=names.get(m.get("from"))))
                _touch_customer(db, b, wa)
            for st in v.get("statuses", []):
                row = db.scalars(select(WhatsAppMessage).where(WhatsAppMessage.business_id == b.id, WhatsAppMessage.provider_id == st.get("id"))).first()
                if row is None:
                    continue
                new = {"sent": "SENT", "delivered": "DELIVERED", "read": "READ", "failed": "FAILED"}.get(st.get("status"))
                order = ["QUEUED", "SENT", "DELIVERED", "READ"]
                if new == "FAILED":
                    row.status, row.error = "FAILED", ((st.get("errors") or [{}])[0].get("title") or "Delivery failed")[:300]
                elif new and row.status in order and order.index(new) > order.index(row.status):
                    row.status = new
    db.flush()
    return 200


def _touch_customer(db: Session, b: Business, wa: str) -> None:
    cust = db.scalars(select(Customer).where(Customer.business_id == b.id, Customer.deleted_at.is_(None), Customer.phone.like(f"%{wa[-9:]}"))).first()
    if cust is not None:
        cust.last_contacted_at = datetime.now(timezone.utc)


# --------------------------------------------------------------------- inbox
def conversations(db: Session, b: Business, limit: int = 60) -> list[dict]:
    last = (select(WhatsAppMessage.phone, func.max(WhatsAppMessage.created_at).label("at")).where(WhatsAppMessage.business_id == b.id).group_by(WhatsAppMessage.phone).order_by(func.max(WhatsAppMessage.created_at).desc()).limit(limit)).subquery()
    out = []
    for phone, at in db.execute(select(last.c.phone, last.c.at)):
        m = db.scalars(select(WhatsAppMessage).where(WhatsAppMessage.business_id == b.id, WhatsAppMessage.phone == phone).order_by(WhatsAppMessage.created_at.desc())).first()
        name = db.scalar(select(WhatsAppMessage.contact_name).where(WhatsAppMessage.business_id == b.id, WhatsAppMessage.phone == phone, WhatsAppMessage.contact_name.is_not(None)).limit(1))
        cust = db.scalars(select(Customer).where(Customer.business_id == b.id, Customer.deleted_at.is_(None), Customer.phone.like(f"%{phone[-9:]}"))).first()
        unread = db.scalar(select(func.count()).select_from(WhatsAppMessage).where(WhatsAppMessage.business_id == b.id, WhatsAppMessage.phone == phone, WhatsAppMessage.direction == "IN", WhatsAppMessage.status == "RECEIVED")) or 0
        out.append({"phone": phone, "name": (cust.name if cust else None) or name, "customer_id": str(cust.id) if cust else None, "last": m.body[:120], "last_at": at, "last_direction": m.direction,
                    "unread": unread, "window_open": window_open(db, b, phone)})
    return out
