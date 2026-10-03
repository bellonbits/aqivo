"""Inbound webhooks from payment gateways and WhatsApp. No login: each request is authenticated by the provider's signature or secret,
using the credentials of the business named in the URL."""
from fastapi import APIRouter, Depends, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.errors import not_found
from app.models import Business
from app.services import online_payments, whatsapp

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _biz(db: Session, slug: str) -> Business:
    b = db.scalars(select(Business).where(Business.slug == slug.lower(), Business.deleted_at.is_(None))).first()
    if b is None:
        raise not_found("Business")
    return b


@router.post("/payments/{provider}/{slug}")
async def payment_webhook(provider: str, slug: str, request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    code, outcome = online_payments.handle_webhook(db, _biz(db, slug), provider, dict(request.headers), body, dict(request.query_params))
    db.commit()
    return PlainTextResponse(outcome, status_code=code)


@router.get("/whatsapp/{slug}")
def whatsapp_verify(slug: str, request: Request, db: Session = Depends(get_db)):
    """Meta's one-time handshake: echo hub.challenge when the verify token matches."""
    q = request.query_params
    ok = whatsapp.verify_handshake(db, _biz(db, slug), q.get("hub.mode"), q.get("hub.verify_token"))
    return PlainTextResponse(q.get("hub.challenge", "") if ok else "forbidden", status_code=200 if ok else 403)


@router.post("/whatsapp/{slug}")
async def whatsapp_events(slug: str, request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    code = whatsapp.handle_webhook(db, _biz(db, slug), request.headers.get("x-hub-signature-256", ""), body)
    db.commit()
    return PlainTextResponse("ok" if code == 200 else "forbidden", status_code=code)
