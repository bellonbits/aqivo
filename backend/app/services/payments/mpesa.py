"""Safaricom Daraja STK Push (Lipa na M-Pesa Online). Only active when credentials are configured."""
import base64
import hmac
import logging
from datetime import datetime
from decimal import Decimal

import httpx

from app.core.config import get_settings
from app.services.payments.base import PaymentProvider, ProviderResult, WebhookEventData

log = logging.getLogger("bizora.mpesa")


class MpesaProvider(PaymentProvider):
    name = "MPESA"

    @property
    def _base(self) -> str:
        return "https://api.safaricom.co.ke" if get_settings().mpesa_env == "production" else "https://sandbox.safaricom.co.ke"

    def is_configured(self) -> bool:
        s = get_settings()
        return all([s.mpesa_consumer_key, s.mpesa_consumer_secret, s.mpesa_shortcode, s.mpesa_passkey, s.mpesa_callback_secret])

    def _token(self) -> str:
        s = get_settings()
        r = httpx.get(f"{self._base}/oauth/v1/generate?grant_type=client_credentials", auth=(s.mpesa_consumer_key, s.mpesa_consumer_secret), timeout=15)
        r.raise_for_status()
        return r.json()["access_token"]

    def initiate(self, *, amount: Decimal, currency: str, phone: str | None, reference: str, description: str) -> ProviderResult:
        if not self.is_configured():
            return ProviderResult(False, "FAILED", message="M-Pesa is not configured")
        if currency != "KES" or not phone:
            return ProviderResult(False, "FAILED", message="M-Pesa needs a Kenyan phone number and KES amount")
        s = get_settings()
        ts = datetime.now().strftime("%Y%m%d%H%M%S")
        password = base64.b64encode(f"{s.mpesa_shortcode}{s.mpesa_passkey}{ts}".encode()).decode()
        msisdn = "".join(ch for ch in phone if ch.isdigit())
        body = {"BusinessShortCode": s.mpesa_shortcode, "Password": password, "Timestamp": ts, "TransactionType": "CustomerPayBillOnline",
                "Amount": int(amount), "PartyA": msisdn, "PartyB": s.mpesa_shortcode, "PhoneNumber": msisdn,
                "CallBackURL": f"{s.public_base_url.rstrip('/')}/api/v1/subscriptions/webhooks/mpesa?secret={s.mpesa_callback_secret}",
                "AccountReference": reference[:12], "TransactionDesc": description[:13]}
        try:
            r = httpx.post(f"{self._base}/mpesa/stkpush/v1/processrequest", json=body, headers={"Authorization": f"Bearer {self._token()}"}, timeout=20)
            data = r.json()
        except Exception as exc:  # noqa: BLE001
            log.warning("mpesa initiate failed", extra={"error": str(exc)})
            return ProviderResult(False, "FAILED", message="Couldn't reach M-Pesa. Try again.")
        if r.status_code == 200 and data.get("ResponseCode") == "0":
            return ProviderResult(True, "PENDING", reference=data.get("CheckoutRequestID"), message="Check your phone and enter your M-Pesa PIN.", raw=data)
        return ProviderResult(False, "FAILED", message=data.get("errorMessage") or data.get("ResponseDescription") or "M-Pesa request failed", raw=data)

    def verify_webhook(self, headers: dict, body: bytes, query: dict) -> bool:
        secret = get_settings().mpesa_callback_secret
        return bool(secret) and hmac.compare_digest(query.get("secret", ""), secret)

    def parse_webhook(self, payload: dict) -> WebhookEventData | None:
        cb = payload.get("Body", {}).get("stkCallback")
        if not cb or "CheckoutRequestID" not in cb:
            return None
        ok = cb.get("ResultCode") == 0
        amount = None
        for it in (cb.get("CallbackMetadata") or {}).get("Item", []):
            if it.get("Name") == "Amount":
                amount = Decimal(str(it.get("Value")))
        receipt = next((it.get("Value") for it in (cb.get("CallbackMetadata") or {}).get("Item", []) if it.get("Name") == "MpesaReceiptNumber"), None)
        return WebhookEventData(event_id=str(receipt or cb["CheckoutRequestID"]) + (":ok" if ok else ":fail"), reference=cb["CheckoutRequestID"],
                                status="PAID" if ok else "FAILED", amount=amount, raw=payload)
