"""Storefront customer accounts: passwordless login with a 6-digit code sent over WhatsApp or email.
A customer is the same `Customer` record the business already has (matched by phone or email) — logging in never creates a second identity."""
from __future__ import annotations

import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.countries import normalize_phone
from app.core.errors import bad_request
from app.core.security import sha256
from app.models import Business, Customer, CustomerOTP
from app.services import connections as cx
from app.services import whatsapp
from app.services.notifications import notify

OTP_MINUTES = 10
MAX_ATTEMPTS = 5
MAX_PER_HOUR = 5
SESSION_DAYS = 30
EMAIL_RE = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


def identify(b: Business, raw: str) -> tuple[str, str]:
    """('PHONE'|'EMAIL', normalised value)"""
    import re
    raw = (raw or "").strip()
    if "@" in raw:
        if not re.match(EMAIL_RE, raw) or len(raw) > 200:
            raise bad_request("Enter a valid email address")
        return "EMAIL", raw.lower()
    try:
        return "PHONE", normalize_phone(raw, b.country_code)
    except ValueError as e:
        raise bad_request(str(e))


def _hash(identifier: str, code: str) -> str:
    return sha256(f"{get_settings().secret_key}|{identifier}|{code}")


def _find_customer(db: Session, b: Business, kind: str, value: str) -> Customer | None:
    col = Customer.phone if kind == "PHONE" else Customer.email
    q = select(Customer).where(Customer.business_id == b.id, Customer.deleted_at.is_(None), (col == value) if kind == "PHONE" else (func.lower(col) == value))
    return db.scalars(q).first()


def request_code(db: Session, b: Business, raw: str) -> dict:
    kind, ident = identify(b, raw)
    since = datetime.now(timezone.utc) - timedelta(hours=1)
    if (db.scalar(select(func.count()).select_from(CustomerOTP).where(CustomerOTP.business_id == b.id, CustomerOTP.identifier == ident, CustomerOTP.created_at >= since)) or 0) >= MAX_PER_HOUR:
        raise bad_request("Too many codes requested. Please try again in an hour.")
    code = f"{secrets.randbelow(10**6):06d}"
    cust = _find_customer(db, b, kind, ident)
    text = f"Your {b.name} login code is {code}. It expires in {OTP_MINUTES} minutes. If you didn't ask for it, ignore this message."
    channel, dev_code = None, None
    if kind == "PHONE" and whatsapp.configured(db, b):
        cfg = cx.creds(db, b, "whatsapp_cloud")[0]
        try:
            whatsapp.send(db, b, ident, text, purpose="otp", template=cfg.get("otp_template") or None, params=[code])
            channel = "WHATSAPP"
        except whatsapp.WhatsAppError:
            channel = None
    if channel is None:
        email = ident if kind == "EMAIL" else (cust.email if cust else None)
        if email and get_settings().smtp_host:
            notify(db, "login_code", email, business_id=b.id, code=code, business=b.name, minutes=OTP_MINUTES)
            channel = "EMAIL"
    if channel is None:
        if get_settings().is_production:
            raise bad_request("We can't send login codes to that number or email right now. Please contact the business.")
        channel, dev_code = "LOG", code  # development only: the code is returned so the flow can be tried without a provider
    db.add(CustomerOTP(business_id=b.id, identifier=ident, channel=channel, code_hash=_hash(ident, code), expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_MINUTES)))
    db.flush()
    out = {"sent": True, "channel": channel, "identifier": ident, "expires_minutes": OTP_MINUTES}
    if dev_code:
        out["dev_code"] = dev_code
    return out


def verify_code(db: Session, b: Business, raw: str, code: str, name: str | None = None) -> Customer:
    kind, ident = identify(b, raw)
    otp = db.scalars(select(CustomerOTP).where(CustomerOTP.business_id == b.id, CustomerOTP.identifier == ident, CustomerOTP.used.is_(False)).order_by(CustomerOTP.created_at.desc())).first()
    if otp is None or otp.expires_at < datetime.now(timezone.utc):
        raise bad_request("That code has expired. Ask for a new one.")
    if otp.attempts >= MAX_ATTEMPTS:
        raise bad_request("Too many wrong tries. Ask for a new code.")
    otp.attempts += 1
    if not hmac.compare_digest(otp.code_hash, _hash(ident, (code or "").strip())):
        db.flush()
        raise bad_request("That code isn't right.")
    otp.used = True
    cust = _find_customer(db, b, kind, ident)
    if cust is None:
        cust = Customer(business_id=b.id, name=(name or "").strip()[:160] or ("Customer" if kind == "PHONE" else ident.split("@")[0]), phone=ident if kind == "PHONE" else None,
                        email=ident if kind == "EMAIL" else None, source="ACCOUNT", acquisition_source="account")
        db.add(cust)
    db.flush()
    return cust


def issue_session(cust: Customer) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"typ": "cust", "sub": str(cust.id), "bid": str(cust.business_id), "iat": now, "exp": now + timedelta(days=SESSION_DAYS)}, get_settings().secret_key, algorithm="HS256")


def read_session(db: Session, b: Business, token: str | None) -> Customer | None:
    if not token:
        return None
    try:
        claims = jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    if claims.get("typ") != "cust" or claims.get("bid") != str(b.id):
        return None
    import uuid
    c = db.get(Customer, uuid.UUID(claims["sub"]))
    return c if c and c.business_id == b.id and not c.deleted_at else None
