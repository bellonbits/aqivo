"""SMS notification and mobile phone verification service via OpenSMS (opensms.co.ke)."""
import hashlib
import logging
import re
import secrets
from datetime import datetime, timedelta, timezone

import httpx

from app.core.config import get_settings

log = logging.getLogger("bizora.sms")


def clean_phone(phone: str) -> str:
    """Normalize phone number to Kenyan international 254... format without '+' for OpenSMS."""
    digits = re.sub(r"[^\d]", "", phone)
    if digits.startswith("0") and len(digits) == 10:
        return "254" + digits[1:]
    if digits.startswith("254") and len(digits) == 12:
        return digits
    if (digits.startswith("7") or digits.startswith("1")) and len(digits) == 9:
        return "254" + digits
    return digits


def generate_otp() -> str:
    """Generate a secure 6-digit numeric OTP."""
    return f"{secrets.randbelow(10**6):06d}"


def hash_otp(phone: str, code: str) -> str:
    """SHA-256 hash of the OTP salted with the application secret key and normalized phone."""
    s = get_settings()
    clean = clean_phone(phone)
    return hashlib.sha256(f"{s.secret_key}|{clean}|{code}".encode()).hexdigest()


def send_sms(recipient: str, message: str, sender_id: str | None = None) -> dict:
    """Send an SMS via OpenSMS API v3.

    Returns dict with status ("success", "skipped", "error") and details.
    Never raises exceptions to callers.
    """
    s = get_settings()
    phone = clean_phone(recipient)
    if not phone or len(phone) < 9:
        return {"status": "error", "message": "Invalid recipient phone number", "to": recipient}

    # In automated test mode, simulate success without consuming real credits
    if s.environment == "test":
        return {"status": "success", "message": "Simulated in test mode", "to": phone, "simulated": True}

    if not s.opensms_api_token:
        log.info("SMS not sent (OPENSMS_API_TOKEN not configured): to=%s", phone)
        return {"status": "skipped", "message": "OpenSMS token not configured", "to": phone}

    api_url = f"{s.opensms_api_url.rstrip('/')}/sms/send"
    originator = sender_id or s.opensms_sender_id or "OPENSMS"

    payload = {
        "recipient": phone,
        "sender_id": originator,
        "type": "plain",
        "message": message,
    }
    headers = {
        "Authorization": f"Bearer {s.opensms_api_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "aqivo-backend/1.0",
    }

    try:
        res = httpx.post(api_url, headers=headers, json=payload, timeout=12.0)
        data = res.json() if res.headers.get("content-type", "").startswith("application/json") else {"text": res.text}
        if res.is_success and data.get("status") == "success":
            uid = (data.get("data") or {}).get("uid")
            log.info("SMS sent via OpenSMS: to=%s, uid=%s", phone, uid)
            return {"status": "success", "data": data.get("data"), "to": phone}
        else:
            err_msg = data.get("message") or res.text[:200]
            log.warning("OpenSMS delivery failed: to=%s, error=%s", phone, err_msg)
            return {"status": "error", "message": err_msg, "to": phone}
    except Exception as exc:  # noqa: BLE001
        log.warning("OpenSMS connection error: to=%s, error=%s", phone, str(exc))
        return {"status": "error", "message": str(exc), "to": phone}
