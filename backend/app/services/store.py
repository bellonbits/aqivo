"""Store settings: checkout, delivery, tax and payment methods. Validated server-side; the public checkout reads only what is here,
never prices or fees sent by the browser."""
from __future__ import annotations

from decimal import Decimal, InvalidOperation

from app.core.errors import bad_request
from app.models import Business

PAYMENT_METHODS = {
    "cash": {"label": "Pay on delivery / pickup", "method": "CASH", "kind": "manual"},
    "mpesa": {"label": "M-Pesa (pay to our till / paybill)", "method": "MPESA", "kind": "manual"},
    "bank": {"label": "Bank transfer", "method": "BANK", "kind": "manual"},
    "whatsapp": {"label": "Arrange on WhatsApp", "method": "WHATSAPP", "kind": "manual"},
    "online": {"label": "Pay now — card or mobile money", "method": "ONLINE", "kind": "online"},
    "mpesa_stk": {"label": "M-Pesa prompt on your phone", "method": "MPESA", "kind": "online"},
}
ONLINE_GATEWAYS = ("paystack", "flutterwave")
# Online providers plug into services.payments; none are connected for merchant checkouts yet, so none are offered to customers.
ONLINE_PROVIDERS = ["Pesapal", "DPO", "PawaPay", "Airtel Money"]  # not available; Paystack, Flutterwave and M-Pesa STK are connected under Connections

DEFAULTS: dict = {
    "tax_rate": 0, "tax_inclusive": True, "min_order": None, "require_email": False,
    "fulfilment": {"pickup": True, "delivery": True},
    "delivery": {"flat_fee": 0, "free_over": None, "zones": [], "estimate": ""},
    "payments": {"cash": True, "mpesa": False, "bank": False, "whatsapp": True, "online": False, "mpesa_stk": False},
    "mpesa_number": "", "mpesa_kind": "TILL", "bank_details": "", "pickup_note": "", "thank_you": "",
}


def _money(v, label: str, allow_none=True) -> Decimal | None:
    if v in (None, ""):
        if allow_none:
            return None
        return Decimal("0")
    try:
        d = Decimal(str(v))
    except InvalidOperation:
        raise bad_request(f"{label} must be a number")
    if d < 0 or d > Decimal("100000000"):
        raise bad_request(f"{label} is out of range")
    return d.quantize(Decimal("0.01"))


def _bool(v, label):
    if not isinstance(v, bool):
        raise bad_request(f"{label} must be on or off")
    return v


def _text(v, label, limit):
    if v is None:
        return ""
    if not isinstance(v, str):
        raise bad_request(f"{label} must be text")
    return v.strip()[:limit]


def clean(data: dict) -> dict:
    out: dict = {}
    if "tax_rate" in data:
        r = _money(data["tax_rate"], "Tax rate", allow_none=False)
        if r > 40:
            raise bad_request("Tax rate must be between 0 and 40%")
        out["tax_rate"] = float(r)
    if "tax_inclusive" in data:
        out["tax_inclusive"] = _bool(data["tax_inclusive"], "Tax inclusive")
    if "require_email" in data:
        out["require_email"] = _bool(data["require_email"], "Require email")
    if "min_order" in data:
        m = _money(data["min_order"], "Minimum order")
        out["min_order"] = float(m) if m is not None else None
    if "fulfilment" in data:
        f = data["fulfilment"] or {}
        out["fulfilment"] = {"pickup": _bool(f.get("pickup", True), "Pickup"), "delivery": _bool(f.get("delivery", True), "Delivery")}
        if not (out["fulfilment"]["pickup"] or out["fulfilment"]["delivery"]):
            raise bad_request("Turn on at least pickup or delivery")
    if "delivery" in data:
        d = data["delivery"] or {}
        zones = []
        for z in (d.get("zones") or [])[:30]:
            name = _text(z.get("name"), "Zone name", 80)
            if name:
                zones.append({"name": name, "fee": float(_money(z.get("fee"), "Zone fee", allow_none=False))})
        free = _money(d.get("free_over"), "Free delivery threshold")
        out["delivery"] = {"flat_fee": float(_money(d.get("flat_fee"), "Delivery fee", allow_none=False)), "free_over": float(free) if free is not None else None,
                           "zones": zones, "estimate": _text(d.get("estimate"), "Estimate", 80)}
    if "payments" in data:
        p = data["payments"] or {}
        out["payments"] = {k: _bool(p.get(k, DEFAULTS["payments"][k]), PAYMENT_METHODS[k]["label"]) for k in PAYMENT_METHODS}
        if not any(out["payments"].values()):
            raise bad_request("Turn on at least one payment option")
    if "online_gateway" in data:
        if data["online_gateway"] not in (None, "", *ONLINE_GATEWAYS):
            raise bad_request("Choose Paystack or Flutterwave")
        out["online_gateway"] = data["online_gateway"] or None
    if "mpesa_number" in data:
        n = "".join(ch for ch in _text(data["mpesa_number"], "M-Pesa number", 20) if ch.isdigit())
        out["mpesa_number"] = n
    if "mpesa_kind" in data:
        if data["mpesa_kind"] not in ("TILL", "PAYBILL", "SEND"):
            raise bad_request("Choose Till, Paybill or Send money")
        out["mpesa_kind"] = data["mpesa_kind"]
    if "wa_order_updates" in data:
        out["wa_order_updates"] = _bool(data["wa_order_updates"], "WhatsApp order updates")
    for k, lim in (("bank_details", 400), ("pickup_note", 200), ("thank_you", 300)):
        if k in data:
            out[k] = _text(data[k], k.replace("_", " ").capitalize(), lim)
    return out


def get(business: Business) -> dict:
    s = business.store_settings or {}
    out = {k: (dict(v) if isinstance(v, dict) else v) for k, v in DEFAULTS.items()}
    for k, v in s.items():
        if k in out and isinstance(out[k], dict) and isinstance(v, dict):
            out[k].update(v)
        elif k in out:
            out[k] = v
    return out


def update(business: Business, data: dict) -> dict:
    cleaned = clean(data)
    merged = {**(business.store_settings or {}), **cleaned}
    business.store_settings = merged
    return get(business)


def online_gateway(db, business: Business) -> str | None:
    """The card/mobile-money gateway to use: the owner's pick if connected, else the first connected one."""
    if db is None:
        return None
    from app.services import connections as cx
    pick = (business.store_settings or {}).get("online_gateway")
    for key in ([pick] if pick in ONLINE_GATEWAYS else []) + list(ONLINE_GATEWAYS):
        if cx.connected(db, business, key):
            return key
    return None


def enabled_payments(business: Business, db=None) -> list[dict]:
    """Payment options the customer may choose, including the instructions shown for each."""
    s = get(business)
    out = []
    for key, on in s["payments"].items():
        if not on or key not in PAYMENT_METHODS:
            continue
        info = {"key": key, "label": PAYMENT_METHODS[key]["label"], "method": PAYMENT_METHODS[key]["method"], "instructions": ""}
        if key == "mpesa":
            if not s["mpesa_number"]:
                continue  # not usable until the owner says where to pay
            kind = {"TILL": "Buy Goods till", "PAYBILL": "Paybill", "SEND": "Send money to"}[s["mpesa_kind"]]
            info["instructions"] = f"Pay with M-Pesa — {kind} {s['mpesa_number']}. You can add the M-Pesa code after placing the order."
        if key == "bank":
            if not s["bank_details"]:
                continue
            info["instructions"] = s["bank_details"]
        if key == "whatsapp" and not business.whatsapp:
            continue
        if key == "cash":
            info["instructions"] = "Pay when you receive or collect your order."
        if key == "online":
            gw = online_gateway(db, business)
            if gw is None:
                continue
            info["gateway"], info["instructions"] = gw, "You'll be taken to a secure page to pay. Your order is confirmed automatically."
        if key == "mpesa_stk":
            from app.services import connections as cx
            if db is None or not cx.connected(db, business, "daraja") or business.currency != "KES":
                continue
            info["gateway"], info["instructions"] = "daraja", "We'll send an M-Pesa prompt to your phone. Enter your PIN to pay."
        out.append(info)
    return out


def public_config(business: Business, db=None) -> dict:
    s = get(business)
    return {"fulfilment": s["fulfilment"], "delivery": {"zones": s["delivery"]["zones"], "estimate": s["delivery"]["estimate"], "flat_fee": s["delivery"]["flat_fee"],
                                                       "free_over": s["delivery"]["free_over"]},
            "payments": enabled_payments(business, db), "require_email": s["require_email"], "min_order": s["min_order"], "tax_rate": s["tax_rate"], "tax_inclusive": s["tax_inclusive"],
            "pickup_note": s["pickup_note"], "currency": business.currency}
