"""A business's own connections to payment gateways, WhatsApp Cloud API, Instagram and Google Places.
Each provider declares its fields; secrets are sealed in the vault and only masked hints leave the server."""
from __future__ import annotations

import secrets as _secrets
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import bad_request
from app.models import Business, MerchantConnection
from app.services import vault


def F(key, label, *, secret=False, required=True, help="", default=None, options=None):
    return {"key": key, "label": label, "secret": secret, "required": required, "help": help, "default": default, "options": options}


PROVIDERS: dict[str, dict] = {
    "paystack": {"label": "Paystack", "kind": "payment", "blurb": "Cards, bank and mobile money in Nigeria, Ghana, Kenya, South Africa and more.",
                 "fields": [F("secret_key", "Secret key", secret=True, help="Paystack dashboard → Settings → API keys (starts with sk_)")],
                 "setup": "Paystack dashboard → Settings → API & Webhooks: set the webhook URL shown below."},
    "flutterwave": {"label": "Flutterwave", "kind": "payment", "blurb": "Cards, bank transfer and mobile money across Africa.",
                    "fields": [F("secret_key", "Secret key", secret=True, help="Flutterwave → Settings → API keys"), F("webhook_hash", "Secret hash", secret=True, help="Flutterwave → Settings → Webhooks → Secret hash (you choose it)")],
                    "setup": "Flutterwave → Settings → Webhooks: set the URL shown below and the same secret hash."},
    "daraja": {"label": "M-Pesa STK push (your own Daraja)", "kind": "payment", "blurb": "Send an M-Pesa PIN prompt straight to the customer's phone. Money goes to your till/paybill.",
               "fields": [F("consumer_key", "Consumer key", secret=True), F("consumer_secret", "Consumer secret", secret=True), F("passkey", "Passkey", secret=True)],
               "config": [F("shortcode", "Till / paybill number"), F("txn_type", "Type", default="CustomerBuyGoodsOnline", options=["CustomerBuyGoodsOnline", "CustomerPayBillOnline"]), F("env", "Environment", default="production", options=["production", "sandbox"])],
               "setup": "Safaricom Daraja portal: create an app with Lipa na M-Pesa Online. The callback URL is set automatically on every request."},
    "whatsapp_cloud": {"label": "WhatsApp Business (Cloud API)", "kind": "messaging", "blurb": "Send order updates, campaigns and login codes from your own WhatsApp number, and read replies in the inbox.",
                       "fields": [F("access_token", "Permanent access token", secret=True, help="Meta Business → System users → generate token with whatsapp_business_messaging"), F("app_secret", "App secret", secret=True, help="Meta app → Settings → Basic")],
                       "config": [F("phone_number_id", "Phone number ID", help="WhatsApp → API setup"), F("order_template", "Order-update template name", required=False, help="Approved template with 3 variables: customer, order number, status"),
                                  F("campaign_template", "Campaign template name", required=False, help="Approved template with 1 variable: message"), F("otp_template", "Login-code template name", required=False, help="Approved authentication template with 1 variable: the code"), F("language", "Template language", required=False, default="en")],
                       "setup": "Meta app → WhatsApp → Configuration: set the callback URL and verify token shown below and subscribe to “messages”."},
    "instagram": {"label": "Instagram feed", "kind": "social", "blurb": "Show your latest posts on your storefront.",
                  "fields": [F("access_token", "Long-lived access token", secret=True, help="Instagram Graph API token for your professional account")], "config": [F("user_id", "Instagram user ID")]},
    "google_places": {"label": "Google reviews", "kind": "social", "blurb": "Show your Google rating and recent reviews on your storefront.",
                      "fields": [F("api_key", "Places API key", secret=True, help="Google Cloud → APIs → Places API (New)")], "config": [F("place_id", "Place ID", help="Find it with Google's Place ID finder")]},
}


def get_row(db: Session, business: Business, provider: str) -> MerchantConnection | None:
    return db.scalars(select(MerchantConnection).where(MerchantConnection.business_id == business.id, MerchantConnection.provider == provider)).first()


def creds(db: Session, business: Business, provider: str) -> tuple[dict, dict] | None:
    """(config, secrets) for a connected, enabled provider; None otherwise."""
    row = get_row(db, business, provider)
    if row is None or not row.enabled or not row.secrets_enc:
        return None
    return dict(row.config or {}), vault.unseal(row.secrets_enc)


def connected(db: Session, business: Business, provider: str) -> bool:
    row = get_row(db, business, provider)
    return bool(row and row.enabled and row.secrets_enc)


def save(db: Session, business: Business, provider: str, config: dict | None, secrets: dict | None, enabled: bool | None = None) -> MerchantConnection:
    spec = PROVIDERS.get(provider)
    if spec is None:
        raise bad_request("Unknown connection")
    row = get_row(db, business, provider)
    if row is None:
        row = MerchantConnection(business_id=business.id, provider=provider, config={}, status="UNTESTED")
        db.add(row)
    cfg = dict(row.config or {})
    for f in spec.get("config", []):
        if config and f["key"] in config:
            v = str(config[f["key"]] or "").strip()[:200]
            if f.get("options") and v and v not in f["options"]:
                raise bad_request(f"Invalid {f['label']}")
            cfg[f["key"]] = v
        elif f["key"] not in cfg and f.get("default") is not None:
            cfg[f["key"]] = f["default"]
    sec = vault.unseal(row.secrets_enc)
    for f in spec["fields"]:
        v = (secrets or {}).get(f["key"])
        if v:  # an empty value keeps the stored secret
            sec[f["key"]] = str(v).strip()[:500]
    if provider == "daraja" and not sec.get("callback_secret"):
        sec["callback_secret"] = _secrets.token_urlsafe(24)
    if provider == "whatsapp_cloud" and not sec.get("verify_token"):
        sec["verify_token"] = _secrets.token_urlsafe(16)
    missing = [f["label"] for f in spec["fields"] + spec.get("config", []) if f["required"] and not (sec.get(f["key"]) if f in spec["fields"] else cfg.get(f["key"]))]
    row.config, row.secrets_enc = cfg, vault.seal(sec)
    if enabled is not None:
        row.enabled = enabled
    row.status = "UNTESTED"
    row.last_error = ("Missing: " + ", ".join(missing)) if missing else None
    row.cache = {}
    db.flush()
    return row


def public_view(db: Session, business: Business, provider: str) -> dict:
    from app.core.config import get_settings
    spec = PROVIDERS[provider]
    row = get_row(db, business, provider)
    sec = vault.unseal(row.secrets_enc) if row else {}
    base = get_settings().public_base_url.rstrip("/")
    hooks = {"paystack": f"{base}/api/v1/webhooks/payments/paystack/{business.slug}", "flutterwave": f"{base}/api/v1/webhooks/payments/flutterwave/{business.slug}",
             "whatsapp_cloud": f"{base}/api/v1/webhooks/whatsapp/{business.slug}"}
    out = {"provider": provider, "label": spec["label"], "kind": spec["kind"], "blurb": spec["blurb"], "setup": spec.get("setup"), "webhook_url": hooks.get(provider),
           "fields": [{**f, "has_value": bool(sec.get(f["key"])), "hint": vault.mask(sec.get(f["key"], "")) if sec.get(f["key"]) else None} for f in spec["fields"]],
           "config_fields": [{**f, "value": (row.config or {}).get(f["key"], f.get("default")) if row else f.get("default")} for f in spec.get("config", [])],
           "enabled": bool(row and row.enabled), "status": row.status if row else "NOT_SET", "last_error": row.last_error if row else None,
           "last_tested_at": row.last_tested_at if row else None, "configured": bool(row and row.secrets_enc and not row.last_error)}
    if provider == "whatsapp_cloud" and sec.get("verify_token"):
        out["verify_token"] = sec["verify_token"]  # not a credential: Meta needs it pasted into their console
    return out


def mark_tested(db: Session, row: MerchantConnection, ok: bool, error: str | None = None) -> None:
    row.status = "CONNECTED" if ok else "ERROR"
    row.last_error = None if ok else (error or "Test failed")[:300]
    row.last_tested_at = datetime.now(timezone.utc)
    db.flush()
