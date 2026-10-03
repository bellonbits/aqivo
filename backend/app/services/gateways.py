"""Merchant payment gateways. Each adapter talks to the provider's documented HTTP API using the *business's own* credentials, so money goes
straight to the business. Adapters are pure functions of (credentials, request) -> result, which keeps them testable with a mocked HTTP client."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal

import httpx

TIMEOUT = 15.0


def http_client(timeout: float | None = None) -> httpx.Client:  # patched in tests
    return httpx.Client(timeout=timeout or TIMEOUT)


@dataclass
class InitResult:
    ok: bool
    reference: str | None = None
    redirect_url: str | None = None
    push: bool = False
    message: str = ""
    raw: dict = field(default_factory=dict)


@dataclass
class VerifyResult:
    status: str  # PAID | FAILED | PENDING
    amount: Decimal | None = None
    currency: str | None = None
    raw: dict = field(default_factory=dict)


@dataclass
class WebhookResult:
    event_id: str
    reference: str
    status: str  # PAID | FAILED
    amount: Decimal | None = None
    currency: str | None = None


class GatewayError(Exception):
    pass


def _json(r: httpx.Response) -> dict:
    try:
        return r.json()
    except ValueError:
        raise GatewayError("The payment provider sent an unreadable reply")


class Gateway:
    key = ""
    label = ""
    methods = "Card & mobile money"

    def init(self, cfg: dict, sec: dict, *, amount: Decimal, currency: str, reference: str, email: str | None, phone: str | None, name: str, callback_url: str, hook_url: str, description: str) -> InitResult: ...
    def verify(self, cfg: dict, sec: dict, reference: str) -> VerifyResult: ...
    def parse_webhook(self, cfg: dict, sec: dict, headers: dict, body: bytes, query: dict) -> WebhookResult | None: ...
    def test(self, cfg: dict, sec: dict) -> None: ...


class Paystack(Gateway):
    key, label = "paystack", "Paystack"
    base = "https://api.paystack.co"

    def _h(self, sec):
        return {"Authorization": f"Bearer {sec['secret_key']}", "Content-Type": "application/json"}

    def init(self, cfg, sec, *, amount, currency, reference, email, phone, name, callback_url, hook_url, description):
        with http_client() as c:
            r = c.post(f"{self.base}/transaction/initialize", headers=self._h(sec), json={"email": email or f"{reference.lower()}@customer.invalid", "amount": int((amount * 100).to_integral_value()), "currency": currency,
                                                                                         "reference": reference, "callback_url": callback_url, "metadata": {"description": description, "name": name, "phone": phone}})
        d = _json(r)
        if r.status_code != 200 or not d.get("status"):
            return InitResult(False, message=d.get("message") or "Paystack couldn't start the payment", raw=d)
        return InitResult(True, reference=d["data"].get("reference", reference), redirect_url=d["data"]["authorization_url"], raw=d)

    def verify(self, cfg, sec, reference):
        with http_client() as c:
            r = c.get(f"{self.base}/transaction/verify/{reference}", headers=self._h(sec))
        d = _json(r)
        if r.status_code == 404:
            return VerifyResult("PENDING", raw=d)
        if r.status_code != 200 or not d.get("status"):
            raise GatewayError(d.get("message") or "Paystack couldn't check the payment")
        x = d["data"]
        st = {"success": "PAID", "failed": "FAILED", "abandoned": "FAILED", "reversed": "FAILED"}.get(x.get("status"), "PENDING")
        return VerifyResult(st, Decimal(str(x.get("amount", 0))) / 100, x.get("currency"), d)

    def parse_webhook(self, cfg, sec, headers, body, query):
        sig = headers.get("x-paystack-signature", "")
        good = hmac.new(sec.get("secret_key", "").encode(), body, hashlib.sha512).hexdigest()
        if not sig or not hmac.compare_digest(sig, good):
            return None
        d = json.loads(body or b"{}")
        x = d.get("data") or {}
        if d.get("event") == "charge.success":
            return WebhookResult(f"charge.success:{x.get('id') or x.get('reference')}", x.get("reference", ""), "PAID", Decimal(str(x.get("amount", 0))) / 100, x.get("currency"))
        if d.get("event") in ("charge.failed", "paymentrequest.failed"):
            return WebhookResult(f"{d['event']}:{x.get('id') or x.get('reference')}", x.get("reference", ""), "FAILED")
        return None

    def test(self, cfg, sec):
        with http_client() as c:
            r = c.get(f"{self.base}/balance", headers=self._h(sec))
        if r.status_code == 401:
            raise GatewayError("Paystack rejected that secret key")
        if r.status_code != 200:
            raise GatewayError("Couldn't reach Paystack")


class Flutterwave(Gateway):
    key, label = "flutterwave", "Flutterwave"
    base = "https://api.flutterwave.com/v3"

    def _h(self, sec):
        return {"Authorization": f"Bearer {sec['secret_key']}", "Content-Type": "application/json"}

    def init(self, cfg, sec, *, amount, currency, reference, email, phone, name, callback_url, hook_url, description):
        with http_client() as c:
            r = c.post(f"{self.base}/payments", headers=self._h(sec), json={"tx_ref": reference, "amount": str(amount), "currency": currency, "redirect_url": callback_url,
                                                                           "customer": {"email": email or f"{reference.lower()}@customer.invalid", "phonenumber": phone or "", "name": name},
                                                                           "customizations": {"title": description[:60]}})
        d = _json(r)
        if r.status_code != 200 or d.get("status") != "success":
            return InitResult(False, message=d.get("message") or "Flutterwave couldn't start the payment", raw=d)
        return InitResult(True, reference=reference, redirect_url=d["data"]["link"], raw=d)

    def verify(self, cfg, sec, reference):
        with http_client() as c:
            r = c.get(f"{self.base}/transactions/verify_by_reference", params={"tx_ref": reference}, headers=self._h(sec))
        d = _json(r)
        if r.status_code == 404 or (d.get("status") == "error" and "No transaction" in str(d.get("message"))):
            return VerifyResult("PENDING", raw=d)
        if r.status_code != 200 or d.get("status") != "success":
            raise GatewayError(d.get("message") or "Flutterwave couldn't check the payment")
        x = d["data"]
        st = {"successful": "PAID", "failed": "FAILED", "cancelled": "FAILED"}.get(x.get("status"), "PENDING")
        return VerifyResult(st, Decimal(str(x.get("amount", 0))), x.get("currency"), d)

    def parse_webhook(self, cfg, sec, headers, body, query):
        h = headers.get("verif-hash", "")
        if not h or not sec.get("webhook_hash") or not hmac.compare_digest(h, sec["webhook_hash"]):
            return None
        d = json.loads(body or b"{}")
        x = d.get("data") or {}
        if d.get("event") != "charge.completed":
            return None
        st = "PAID" if x.get("status") == "successful" else "FAILED"
        return WebhookResult(f"charge.completed:{x.get('id') or x.get('tx_ref')}", x.get("tx_ref", ""), st, Decimal(str(x.get("amount", 0))), x.get("currency"))

    def test(self, cfg, sec):
        with http_client() as c:
            r = c.get(f"{self.base}/balances", headers=self._h(sec))
        if r.status_code in (401, 403):
            raise GatewayError("Flutterwave rejected that secret key")
        if r.status_code != 200:
            raise GatewayError("Couldn't reach Flutterwave")


class Daraja(Gateway):
    key, label = "daraja", "M-Pesa"
    methods = "M-Pesa prompt"

    def _base(self, cfg):
        return "https://api.safaricom.co.ke" if cfg.get("env", "production") == "production" else "https://sandbox.safaricom.co.ke"

    def _token(self, cfg, sec) -> str:
        with http_client() as c:
            r = c.get(f"{self._base(cfg)}/oauth/v1/generate", params={"grant_type": "client_credentials"}, auth=(sec["consumer_key"], sec["consumer_secret"]))
        if r.status_code != 200:
            raise GatewayError("Safaricom rejected those Daraja credentials")
        return _json(r)["access_token"]

    def _pw(self, cfg, sec):
        ts = datetime.now().strftime("%Y%m%d%H%M%S")
        return base64.b64encode(f"{cfg['shortcode']}{sec['passkey']}{ts}".encode()).decode(), ts

    def init(self, cfg, sec, *, amount, currency, reference, email, phone, name, callback_url, hook_url, description):
        if currency != "KES":
            return InitResult(False, message="M-Pesa works with KES only")
        msisdn = "".join(ch for ch in (phone or "") if ch.isdigit())
        if len(msisdn) < 11:
            return InitResult(False, message="Enter a Kenyan M-Pesa number")
        pw, ts = self._pw(cfg, sec)
        tok = self._token(cfg, sec)
        with http_client() as c:
            r = c.post(f"{self._base(cfg)}/mpesa/stkpush/v1/processrequest", headers={"Authorization": f"Bearer {tok}"}, json={
                "BusinessShortCode": cfg["shortcode"], "Password": pw, "Timestamp": ts, "TransactionType": cfg.get("txn_type", "CustomerBuyGoodsOnline"), "Amount": int(amount),
                "PartyA": msisdn, "PartyB": cfg["shortcode"], "PhoneNumber": msisdn, "CallBackURL": f"{hook_url}?secret={sec['callback_secret']}", "AccountReference": reference[:12], "TransactionDesc": description[:13]})
        d = _json(r)
        if r.status_code == 200 and d.get("ResponseCode") == "0":
            return InitResult(True, reference=d["CheckoutRequestID"], push=True, message="Check your phone and enter your M-Pesa PIN.", raw=d)
        return InitResult(False, message=d.get("errorMessage") or d.get("ResponseDescription") or "M-Pesa request failed", raw=d)

    def verify(self, cfg, sec, reference):
        pw, ts = self._pw(cfg, sec)
        tok = self._token(cfg, sec)
        with http_client() as c:
            r = c.post(f"{self._base(cfg)}/mpesa/stkpushquery/v1/query", headers={"Authorization": f"Bearer {tok}"}, json={"BusinessShortCode": cfg["shortcode"], "Password": pw, "Timestamp": ts, "CheckoutRequestID": reference})
        d = _json(r)
        code = d.get("ResultCode")
        if code is None:  # still being processed
            return VerifyResult("PENDING", raw=d)
        return VerifyResult("PAID" if str(code) == "0" else "FAILED", raw=d)  # amount isn't returned by the query; the callback carries it

    def parse_webhook(self, cfg, sec, headers, body, query):
        if not sec.get("callback_secret") or not hmac.compare_digest(query.get("secret", ""), sec["callback_secret"]):
            return None
        cb = (json.loads(body or b"{}").get("Body") or {}).get("stkCallback") or {}
        if not cb.get("CheckoutRequestID"):
            return None
        amount = None
        for it in (cb.get("CallbackMetadata") or {}).get("Item", []):
            if it.get("Name") == "Amount":
                amount = Decimal(str(it.get("Value")))
        return WebhookResult(f"stk:{cb['CheckoutRequestID']}", cb["CheckoutRequestID"], "PAID" if str(cb.get("ResultCode")) == "0" else "FAILED", amount, "KES")

    def test(self, cfg, sec):
        self._token(cfg, sec)


GATEWAYS: dict[str, Gateway] = {g.key: g for g in (Paystack(), Flutterwave(), Daraja())}
