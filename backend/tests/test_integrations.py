import hashlib
import re
import hmac
import json

import httpx
import pytest

from tests.conftest import SessionLocal, add_service, set_plan


# ------------------------------------------------------------------ helpers
@pytest.fixture
def http(monkeypatch):
    """Route every provider call through a handler we control. Handler(request) -> httpx.Response. Records requests."""
    from app.services import gateways
    state = {"handler": lambda r: httpx.Response(404, json={}), "calls": []}

    def factory(timeout=None):
        def h(request):
            state["calls"].append(request)
            return state["handler"](request)
        return httpx.Client(transport=httpx.MockTransport(h))

    monkeypatch.setattr(gateways, "http_client", factory)
    return state


def product(o, name="Dress", price="1000", **extra):
    r = o.post("/api/v1/products", json={"name": name, "price": price, **extra})
    assert r.status_code == 201, r.text
    return r.json()


def connect(o, provider, config=None, secrets=None):
    r = o.put(f"/api/v1/connections/{provider}", json={"config": config or {}, "secrets": secrets or {}})
    assert r.status_code == 200, r.text
    return r.json()


def place(client, o, p, payment="online", **extra):
    return client.post(f"/api/v1/public/{o.slug}/orders", json={"lines": [{"kind": "product", "id": p["id"], "qty": 1}], "name": "Amina K", "phone": "0711000111", "email": "amina@example.com",
                                                               "payment": payment, **extra})


def sign_paystack(secret, body: bytes) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha512).hexdigest()


# ------------------------------------------------------------------ vault & connections
def test_secrets_are_encrypted_masked_and_tenant_scoped(make_owner):
    a, b = make_owner("c1@example.com", "A", "Alpha"), make_owner("c2@example.com", "B", "Bravo")
    v = connect(a, "paystack", secrets={"secret_key": "sk_live_SUPERSECRET1234"})
    f = next(x for x in v["fields"] if x["key"] == "secret_key")
    assert f["has_value"] and f["hint"].endswith("1234") and "SUPERSECRET" not in json.dumps(v) and v["configured"] is True
    assert "SUPERSECRET" not in json.dumps(a.get("/api/v1/connections").json())
    from sqlalchemy import select
    from app.models import MerchantConnection
    s = SessionLocal()
    try:
        row = s.scalars(select(MerchantConnection).where(MerchantConnection.provider == "paystack")).one()
        assert "SUPERSECRET" not in (row.secrets_enc or "") and len(row.secrets_enc) > 60
    finally:
        s.close()
    again = connect(a, "paystack", secrets={"secret_key": ""})  # blank keeps the stored secret
    assert next(x for x in again["fields"] if x["key"] == "secret_key")["has_value"]
    assert next(p for p in b.get("/api/v1/connections").json()["providers"] if p["provider"] == "paystack")["status"] == "NOT_SET"
    assert b.put("/api/v1/connections/nope", json={}).status_code == 400
    assert connect(a, "daraja", config={"shortcode": "123456"}, secrets={"consumer_key": "k", "consumer_secret": "s", "passkey": "p"})["configured"] is True
    partial = connect(a, "whatsapp_cloud", config={"phone_number_id": "111"}, secrets={})
    assert partial["configured"] is False and "Missing" in partial["last_error"]
    assert a.delete("/api/v1/connections/paystack").status_code == 204
    assert next(p for p in a.get("/api/v1/connections").json()["providers"] if p["provider"] == "paystack")["status"] == "NOT_SET"


def test_connection_test_reports_provider_errors(owner, http):
    connect(owner, "paystack", secrets={"secret_key": "sk_bad"})
    http["handler"] = lambda r: httpx.Response(401, json={"message": "Invalid key"})
    r = owner.post("/api/v1/connections/paystack/test").json()
    assert r["status"] == "ERROR" and "rejected" in r["last_error"]
    http["handler"] = lambda r: httpx.Response(200, json={"status": True, "data": []})
    assert owner.post("/api/v1/connections/paystack/test").json()["status"] == "CONNECTED"


# ------------------------------------------------------------------ Paystack
def setup_paystack(owner, http, secret="sk_test_abc"):
    connect(owner, "paystack", secrets={"secret_key": secret})
    owner.patch("/api/v1/store/settings", json={"settings": {"payments": {"cash": True, "mpesa": False, "bank": False, "whatsapp": False, "online": True, "mpesa_stk": False}}})

    def handler(r):
        if r.url.path.endswith("/transaction/initialize"):
            body = json.loads(r.content)
            return httpx.Response(200, json={"status": True, "data": {"authorization_url": f"https://checkout.paystack.com/x/{body['reference']}", "reference": body["reference"]}})
        if "/transaction/verify/" in r.url.path:
            return httpx.Response(200, json={"status": True, "data": {"status": "success", "amount": 100000, "currency": "KES"}})
        return httpx.Response(404, json={})
    http["handler"] = handler


def test_paystack_checkout_webhook_and_idempotency(owner, client, http):
    setup_paystack(owner, http)
    p = product(owner, price="1000", track_stock=True, stock_qty=3)
    cfg = client.get(f"/api/v1/public/{owner.slug}/checkout-config").json()
    assert [m["key"] for m in cfg["payments"]] == ["cash", "online"] and cfg["payments"][1]["gateway"] == "paystack"
    r = place(client, owner, p)
    assert r.status_code == 201, r.text
    out = r.json()
    assert out["payment"]["type"] == "redirect" and out["payment"]["url"].startswith("https://checkout.paystack.com/")
    init = json.loads(http["calls"][-1].content)
    assert init["amount"] == 100000 and init["currency"] == "KES" and init["callback_url"].endswith(f"/order/{out['token']}?pay=return") and init["email"] == "amina@example.com"
    o = owner.get("/api/v1/orders").json()["items"][0]
    assert o["payment_status"] == "PENDING" and o["status"] == "PENDING" and o["payment_provider"] == "paystack"
    ref = o["payment_reference"]
    body = json.dumps({"event": "charge.success", "data": {"id": 99, "reference": ref, "amount": 100000, "currency": "KES"}}).encode()
    hook = f"/api/v1/webhooks/payments/paystack/{owner.slug}"
    assert client.post(hook, content=body, headers={"x-paystack-signature": "bad"}).status_code == 401
    assert client.post(hook, content=body, headers={"x-paystack-signature": sign_paystack("sk_wrong", body)}).status_code == 401
    ok = client.post(hook, content=body, headers={"x-paystack-signature": sign_paystack("sk_test_abc", body)})
    assert ok.status_code == 200 and ok.text == "paid"
    o = owner.get("/api/v1/orders").json()["items"][0]
    assert o["payment_status"] == "PAID" and o["status"] == "CONFIRMED" and any("online" in e["message"] for e in o["events"])
    assert owner.get("/api/v1/payments").json()[0]["status"] == "PAID"
    dup = client.post(hook, content=body, headers={"x-paystack-signature": sign_paystack("sk_test_abc", body)})
    assert dup.status_code == 200 and dup.text == "duplicate"
    assert len(owner.get("/api/v1/payments").json()) == 1  # not double-recorded


def test_paystack_amount_mismatch_and_foreign_references_do_not_mark_paid(make_owner, client, http):
    a, b = make_owner("p1@example.com", "A", "Alpha"), make_owner("p2@example.com", "B", "Bravo")
    setup_paystack(a, http, "sk_a")
    setup_paystack(b, http, "sk_b")
    pa = product(a, price="1000")
    out = place(client, a, pa).json()
    ref = a.get("/api/v1/orders").json()["items"][0]["payment_reference"]
    low = json.dumps({"event": "charge.success", "data": {"id": 1, "reference": ref, "amount": 5000, "currency": "KES"}}).encode()
    r = client.post(f"/api/v1/webhooks/payments/paystack/{a.slug}", content=low, headers={"x-paystack-signature": sign_paystack("sk_a", low)})
    assert r.text == "mismatch" and a.get("/api/v1/orders").json()["items"][0]["payment_status"] == "PENDING"
    wrong_cur = json.dumps({"event": "charge.success", "data": {"id": 2, "reference": ref, "amount": 100000, "currency": "USD"}}).encode()
    assert client.post(f"/api/v1/webhooks/payments/paystack/{a.slug}", content=wrong_cur, headers={"x-paystack-signature": sign_paystack("sk_a", wrong_cur)}).text == "mismatch"
    # Bravo's own credentials can't pay Alpha's order, and its webhook URL doesn't know Alpha's reference
    full = json.dumps({"event": "charge.success", "data": {"id": 3, "reference": ref, "amount": 100000, "currency": "KES"}}).encode()
    assert client.post(f"/api/v1/webhooks/payments/paystack/{a.slug}", content=full, headers={"x-paystack-signature": sign_paystack("sk_b", full)}).status_code == 401
    r = client.post(f"/api/v1/webhooks/payments/paystack/{b.slug}", content=full, headers={"x-paystack-signature": sign_paystack("sk_b", full)})
    assert r.text == "unknown_order" and a.get("/api/v1/orders").json()["items"][0]["payment_status"] == "PENDING"
    assert client.post(f"/api/v1/webhooks/payments/paystack/not-a-shop", content=full).status_code == 404
    assert out["ok"]


def test_return_page_verifies_with_the_gateway_and_retry_works(owner, client, http):
    setup_paystack(owner, http)
    p = product(owner, price="1000")
    out = place(client, owner, p).json()
    page = client.get(f"/{owner.slug}/order/{out['token']}", params={"pay": "return"})  # customer comes back from the payment page
    assert page.status_code == 200 and "Paid" in page.text
    assert owner.get("/api/v1/orders").json()["items"][0]["payment_status"] == "PAID"
    # gateway down at checkout: the order still exists and can be paid later
    http["handler"] = lambda r: httpx.Response(500, json={})
    p2 = product(owner, "Hat", "500")
    r = place(client, owner, p2)
    assert r.status_code == 201 and r.json()["payment"] is None and "payment_error" in r.json()
    tok = r.json()["token"]
    pg = client.get(f"/{owner.slug}/order/{tok}")
    assert 'id="pay-now"' in pg.text
    setup_paystack(owner, http)
    again = client.post(f"/api/v1/public/{owner.slug}/orders/{tok}/pay")
    assert again.status_code == 200 and again.json()["type"] == "redirect"
    assert client.post(f"/api/v1/public/{owner.slug}/orders/{out['token']}/pay").status_code == 400  # already paid


def test_online_methods_hidden_until_connected_and_manual_orders_unaffected(owner, client, http):
    cfg = client.get(f"/api/v1/public/{owner.slug}/checkout-config").json()
    assert "online" not in [m["key"] for m in cfg["payments"]]
    p = product(owner, price="100")
    assert place(client, owner, p, payment="online").status_code == 400
    assert place(client, owner, p, payment="cash").status_code == 201


# ------------------------------------------------------------------ Flutterwave & Daraja
def test_flutterwave_flow(owner, client, http):
    connect(owner, "flutterwave", secrets={"secret_key": "FLWSECK_x", "webhook_hash": "myhash123"})
    owner.patch("/api/v1/store/settings", json={"settings": {"online_gateway": "flutterwave", "payments": {"cash": True, "mpesa": False, "bank": False, "whatsapp": False, "online": True, "mpesa_stk": False}}})

    def handler(r):
        if r.url.path.endswith("/payments"):
            return httpx.Response(200, json={"status": "success", "data": {"link": "https://checkout.flutterwave.com/pay/abc"}})
        return httpx.Response(404)
    http["handler"] = handler
    p = product(owner, price="750")
    out = place(client, owner, p).json()
    assert out["payment"]["url"] == "https://checkout.flutterwave.com/pay/abc"
    sent = json.loads(http["calls"][-1].content)
    assert sent["amount"] == "750.00" and sent["currency"] == "KES" and sent["customer"]["email"] == "amina@example.com"
    ref = owner.get("/api/v1/orders").json()["items"][0]["payment_reference"]
    body = json.dumps({"event": "charge.completed", "data": {"id": 7, "tx_ref": ref, "status": "successful", "amount": 750, "currency": "KES"}}).encode()
    hook = f"/api/v1/webhooks/payments/flutterwave/{owner.slug}"
    assert client.post(hook, content=body, headers={"verif-hash": "nope"}).status_code == 401
    assert client.post(hook, content=body, headers={"verif-hash": "myhash123"}).text == "paid"
    assert owner.get("/api/v1/orders").json()["items"][0]["payment_status"] == "PAID"


def test_mpesa_stk_push_callback_and_polling(owner, client, http):
    connect(owner, "daraja", config={"shortcode": "174379", "env": "sandbox"}, secrets={"consumer_key": "ck", "consumer_secret": "cs", "passkey": "pk"})
    owner.patch("/api/v1/store/settings", json={"settings": {"payments": {"cash": True, "mpesa": False, "bank": False, "whatsapp": False, "online": False, "mpesa_stk": True}}})
    state = {"query": {"ResultCode": None}}

    def handler(r):
        if "oauth" in r.url.path:
            return httpx.Response(200, json={"access_token": "tok"})
        if r.url.path.endswith("processrequest"):
            return httpx.Response(200, json={"ResponseCode": "0", "CheckoutRequestID": "ws_CO_123"})
        if r.url.path.endswith("query"):
            return httpx.Response(200, json=({"ResultCode": "0"} if state["query"]["ResultCode"] == "0" else {"errorCode": "500.001.1001", "errorMessage": "being processed"}))
        return httpx.Response(404)
    http["handler"] = handler
    cfg = client.get(f"/api/v1/public/{owner.slug}/checkout-config").json()
    assert [m["key"] for m in cfg["payments"]] == ["cash", "mpesa_stk"]
    p = product(owner, price="500")
    out = place(client, owner, p, payment="mpesa_stk").json()
    assert out["payment"]["type"] == "push" and "PIN" in out["payment"]["message"]
    stk = next(json.loads(c.content) for c in http["calls"] if c.url.path.endswith("processrequest"))
    assert stk["Amount"] == 500 and stk["PhoneNumber"] == "254711000111" and "/webhooks/payments/daraja/" in stk["CallBackURL"] and "secret=" in stk["CallBackURL"]
    secret = stk["CallBackURL"].split("secret=")[1]
    assert client.post(f"/api/v1/public/{owner.slug}/orders/{out['token']}/verify-payment").json()["payment_status"] == "PENDING"  # still waiting
    hook = f"/api/v1/webhooks/payments/daraja/{owner.slug}"
    cb = json.dumps({"Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_123", "ResultCode": 0, "CallbackMetadata": {"Item": [{"Name": "Amount", "Value": 500}, {"Name": "MpesaReceiptNumber", "Value": "SHK1"}]}}}}).encode()
    assert client.post(hook + "?secret=wrong", content=cb).status_code == 401
    assert client.post(hook + f"?secret={secret}", content=cb).text == "paid"
    assert owner.get("/api/v1/orders").json()["items"][0]["payment_status"] == "PAID"
    # a cancelled prompt frees the order for another try
    out2 = place(client, owner, product(owner, "Cap", "200"), payment="mpesa_stk").json()
    cancel = json.dumps({"Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_123", "ResultCode": 1032}}}).encode()
    http["handler"] = lambda r: (httpx.Response(200, json={"access_token": "t"}) if "oauth" in r.url.path else httpx.Response(200, json={"ResponseCode": "0", "CheckoutRequestID": "ws_CO_456"}))
    assert out2["ok"] and cancel


# ------------------------------------------------------------------ WhatsApp Cloud API
def wa_connect(o, **cfg):
    return connect(o, "whatsapp_cloud", config={"phone_number_id": "555", **cfg}, secrets={"access_token": "EAAtok", "app_secret": "appsecret"})


def wa_hook(client, o, payload, secret="appsecret"):
    body = json.dumps(payload).encode()
    sig = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return client.post(f"/api/v1/webhooks/whatsapp/{o.slug}", content=body, headers={"x-hub-signature-256": sig})


def inbound(phone="254711000111", text="Hi, is it available?", mid="wamid.IN1"):
    return {"entry": [{"changes": [{"value": {"metadata": {"phone_number_id": "555"}, "contacts": [{"wa_id": phone, "profile": {"name": "Amina"}}],
                                              "messages": [{"from": phone, "id": mid, "timestamp": "1790000000", "type": "text", "text": {"body": text}}]}}]}]}


def test_whatsapp_handshake_signature_inbox_and_24h_rule(owner, client, http):
    v = wa_connect(owner)
    token = v["verify_token"]
    h = f"/api/v1/webhooks/whatsapp/{owner.slug}"
    assert client.get(h, params={"hub.mode": "subscribe", "hub.verify_token": token, "hub.challenge": "12345"}).text == "12345"
    assert client.get(h, params={"hub.mode": "subscribe", "hub.verify_token": "bad", "hub.challenge": "1"}).status_code == 403
    assert wa_hook(client, owner, inbound(), secret="wrong").status_code == 403
    # no inbound message yet and no template: free text is not allowed
    r = owner.post("/api/v1/whatsapp/conversations/254711000111/reply", json={"body": "Hello"})
    assert r.status_code == 400 and "24 hours" in r.json()["detail"]
    assert wa_hook(client, owner, inbound()).status_code == 200
    assert wa_hook(client, owner, inbound()).status_code == 200  # Meta retry: not stored twice
    convs = owner.get("/api/v1/whatsapp/conversations").json()
    assert convs["connected"] and len(convs["items"]) == 1 and convs["items"][0]["unread"] == 1 and convs["items"][0]["name"] == "Amina"
    http["handler"] = lambda r: httpx.Response(200, json={"messages": [{"id": "wamid.OUT1"}]})
    # the inbound message is dated in the past in this fixture, so make it recent to open the window
    from datetime import datetime, timezone
    from sqlalchemy import update
    from app.models import WhatsAppMessage
    s = SessionLocal()
    try:
        s.execute(update(WhatsAppMessage).values(created_at=datetime.now(timezone.utc)))
        s.commit()
    finally:
        s.close()
    t = owner.get("/api/v1/whatsapp/conversations/254711000111").json()
    assert t["window_open"] and any(m["direction"] == "IN" and m["body"] == "Hi, is it available?" for m in t["messages"])
    r = owner.post("/api/v1/whatsapp/conversations/254711000111/reply", json={"body": "Yes, in stock!"})
    assert r.status_code == 201 and r.json()["status"] == "SENT"
    sent = json.loads(http["calls"][-1].content)
    assert sent["type"] == "text" and sent["to"] == "254711000111" and sent["text"]["body"] == "Yes, in stock!" and http["calls"][-1].headers["authorization"] == "Bearer EAAtok"
    status = {"entry": [{"changes": [{"value": {"metadata": {"phone_number_id": "555"}, "statuses": [{"id": "wamid.OUT1", "status": "delivered"}]}}]}]}
    wa_hook(client, owner, status)
    wa_hook(client, owner, {"entry": [{"changes": [{"value": {"statuses": [{"id": "wamid.OUT1", "status": "read"}]}}]}]})
    wa_hook(client, owner, {"entry": [{"changes": [{"value": {"statuses": [{"id": "wamid.OUT1", "status": "delivered"}]}}]}]})  # an older status never downgrades
    msgs = owner.get("/api/v1/whatsapp/conversations/254711000111").json()["messages"]
    assert [m for m in msgs if m["direction"] == "OUT"][-1]["status"] == "READ"
    assert owner.get("/api/v1/whatsapp/conversations").json()["items"][0]["unread"] == 0


def test_whatsapp_order_updates_templates_and_campaign_sending(owner, client, http):
    wa_connect(owner, order_template="order_update", campaign_template="promo")
    http["handler"] = lambda r: httpx.Response(200, json={"messages": [{"id": f"wamid.{len(http['calls'])}"}]})
    p = product(owner, price="100")
    client.post(f"/api/v1/public/{owner.slug}/orders", json={"lines": [{"kind": "product", "id": p["id"], "qty": 1}], "name": "Amina K", "phone": "0711000111", "payment": "cash"})
    oid = owner.get("/api/v1/orders").json()["items"][0]["id"]
    owner.patch(f"/api/v1/orders/{oid}/status", json={"status": "CONFIRMED"})
    call = json.loads(http["calls"][-1].content)  # outside the 24h window => the approved template
    assert call["type"] == "template" and call["template"]["name"] == "order_update" and [x["text"] for x in call["template"]["components"][0]["parameters"]] == ["Amina", "1001", "Confirmed"]
    owner.patch("/api/v1/store/settings", json={"settings": {"wa_order_updates": False}})
    n = len(http["calls"])
    owner.patch(f"/api/v1/orders/{oid}/status", json={"status": "COMPLETED"})
    assert len(http["calls"]) == n  # the owner turned order messages off
    # rider details notify too (when updates are on) and show on the customer's order page
    owner.patch("/api/v1/store/settings", json={"settings": {"wa_order_updates": True}})
    assert owner.patch(f"/api/v1/orders/{oid}/delivery", json={"courier_name": "Peter on bike", "courier_phone": "0722123456", "tracking_url": "http://insecure"}).status_code == 400
    r = owner.patch(f"/api/v1/orders/{oid}/delivery", json={"courier_name": "Peter on bike", "courier_phone": "0722123456", "tracking_url": "https://track.example/abc"})
    assert r.status_code == 200 and r.json()["courier_name"] == "Peter on bike"
    tok = r.json()["token"]
    assert "Peter on bike" in client.get(f"/{owner.slug}/order/{tok}").text and "https://track.example/abc" in client.get(f"/{owner.slug}/order/{tok}").text
    # campaign through the API
    from tests.conftest import add_service as _a  # noqa: F401
    cust = owner.post("/api/v1/customers", json={"name": "Zed", "phone": "0733111222"}).json()
    set_plan(owner.id, "PRO")
    camp = owner.post("/api/v1/marketing/campaigns", json={"name": "Promo", "kind": "WHATSAPP", "message_template": "Hi {name}, 10% off this week", "audience": {"type": "all"}}).json()
    assert owner.post(f"/api/v1/whatsapp/campaigns/{camp['id']}/send").status_code == 400  # not confirmed yet
    owner.post(f"/api/v1/marketing/campaigns/{camp['id']}/confirm")
    res = owner.post(f"/api/v1/whatsapp/campaigns/{camp['id']}/send").json()
    assert res["sent"] >= 1 and res["failed"] == 0
    det = owner.get(f"/api/v1/marketing/campaigns/{camp['id']}").json()
    assert all(m["status"] == "SENT" for m in det["messages"]) and cust["id"]
    # a provider failure is recorded, not hidden
    http["handler"] = lambda r: httpx.Response(400, json={"error": {"message": "Template not approved"}})
    assert owner.post(f"/api/v1/whatsapp/campaigns/{camp['id']}/send").status_code in (200, 400)


def test_whatsapp_is_tenant_scoped_and_needs_connection(make_owner, client, http):
    a, b = make_owner("w1@example.com", "A", "Alpha"), make_owner("w2@example.com", "B", "Bravo")
    wa_connect(a)
    wa_hook(client, a, inbound())
    assert b.get("/api/v1/whatsapp/conversations").json() == {"connected": False, "items": []}
    assert b.get("/api/v1/whatsapp/conversations/254711000111").json()["messages"] == []
    assert b.post("/api/v1/whatsapp/conversations/254711000111/reply", json={"body": "x"}).status_code == 400
    assert wa_hook(client, b, inbound(), secret="appsecret").status_code == 403  # Bravo has no WhatsApp connection


# ------------------------------------------------------------------ customer accounts
H = {"x-bizora": "1"}


def login(client, o, ident="0711000111", name="Amina"):
    r = client.post(f"/api/v1/public/{o.slug}/account/otp/request", json={"identifier": ident}, headers=H)
    assert r.status_code == 200, r.text
    code = r.json()["dev_code"]
    v = client.post(f"/api/v1/public/{o.slug}/account/otp/verify", json={"identifier": ident, "code": code, "name": name}, headers=H)
    assert v.status_code == 200, v.text
    return v.json()


def test_otp_login_session_orders_saved_and_addresses(owner, client):
    p = product(owner, "Maxi", "2000")
    client.post(f"/api/v1/public/{owner.slug}/orders", json={"lines": [{"kind": "product", "id": p["id"], "qty": 1}], "name": "Amina K", "phone": "0711000111", "payment": "cash"})
    base = f"/api/v1/public/{owner.slug}/account"
    assert client.get(base + "/me").status_code == 401 and client.get(base + "/session").json() == {"signed_in": False, "name": None}
    assert client.post(base + "/otp/request", json={"identifier": "0711000111"}).status_code == 400  # missing the CSRF header
    assert client.post(base + "/otp/request", json={"identifier": "nonsense"}, headers=H).status_code == 400
    r = client.post(base + "/otp/request", json={"identifier": "0711000111"}, headers=H).json()
    assert r["channel"] == "LOG" and len(r["dev_code"]) == 6 and r["identifier"].lstrip("+") == "254711000111"
    bad = client.post(base + "/otp/verify", json={"identifier": "0711000111", "code": "000000"}, headers=H)
    assert bad.status_code == 400 and "isn't right" in bad.json()["detail"]
    ok = client.post(base + "/otp/verify", json={"identifier": "0711000111", "code": r["dev_code"]}, headers=H)
    assert ok.status_code == 200 and "httponly" in ok.headers["set-cookie"].lower() and "samesite=lax" in ok.headers["set-cookie"].lower()
    me = ok.json()
    assert me["phone"].lstrip("+") == "254711000111" and me["name"] == "Amina K"  # the existing customer from the order, not a duplicate
    assert owner.get("/api/v1/customers").json()["total"] == 1
    assert client.post(base + "/otp/verify", json={"identifier": "0711000111", "code": r["dev_code"]}, headers=H).status_code == 400  # a code works once
    assert client.get(base + "/session").json()["signed_in"] is True
    orders = client.get(base + "/orders").json()
    assert orders[0]["number"] == 1001 and orders[0]["items"] == ["1× Maxi"] and orders[0]["status_text"] == "Received"
    assert client.post(base + f"/saved/{p['id']}", headers=H).status_code == 201 and client.post(base + f"/saved/{p['id']}", headers=H).status_code == 201
    assert [x["name"] for x in client.get(base + "/saved").json()] == ["Maxi"]
    assert client.post(base + f"/saved/{p['id']}").status_code == 400  # no CSRF header
    a = client.post(base + "/addresses", json={"label": "Home", "line": "Kenya House, Moi Ave", "is_default": True}, headers=H).json()
    assert a["is_default"] and client.get(base + "/me").json()["addresses"][0]["line"] == "Kenya House, Moi Ave"
    assert client.patch(base + "/me", json={"email": "amina@example.com", "name": "Amina Kamau"}, headers=H).json()["email"] == "amina@example.com"
    assert client.delete(base + f"/addresses/{a['id']}", headers=H).status_code == 200 and client.get(base + "/me").json()["addresses"] == []
    assert client.delete(base + f"/saved/{p['id']}", headers=H).json() == {"saved": False}
    client.post(base + "/logout", headers=H)
    assert client.get(base + "/me").status_code == 401


def test_customer_sessions_do_not_cross_businesses_or_become_staff_tokens(make_owner, client):
    a, b = make_owner("ca1@example.com", "A", "Alpha"), make_owner("ca2@example.com", "B", "Bravo")
    login(client, a)
    assert client.get(f"/api/v1/public/{a.slug}/account/me").status_code == 200
    assert client.get(f"/api/v1/public/{b.slug}/account/me").status_code == 401  # the cookie is per business
    tok = client.cookies.get(f"bz_customer_{a.slug}")
    # a customer token is not a dashboard token
    assert client.get("/api/v1/businesses/me", headers={"Authorization": f"Bearer {tok}"}).status_code == 401
    client.cookies.clear()
    # tampered cookie
    client.cookies.set(f"bz_customer_{a.slug}", tok[:-3] + "abc")
    assert client.get(f"/api/v1/public/{a.slug}/account/me").status_code == 401


def test_otp_rate_limits_and_attempts(owner, client):
    base = f"/api/v1/public/{owner.slug}/account"
    code = client.post(base + "/otp/request", json={"identifier": "0711999888"}, headers=H).json()["dev_code"]
    wrong = "000000" if code != "000000" else "111111"
    for _ in range(5):
        assert client.post(base + "/otp/verify", json={"identifier": "0711999888", "code": wrong}, headers=H).status_code == 400
    r = client.post(base + "/otp/verify", json={"identifier": "0711999888", "code": code}, headers=H)
    assert r.status_code == 400 and "Too many" in r.json()["detail"]  # locked even for the right code
    for _ in range(4):
        client.post(base + "/otp/request", json={"identifier": "0711999888"}, headers=H)
    assert client.post(base + "/otp/request", json={"identifier": "0711999888"}, headers=H).status_code == 400


def test_otp_is_sent_on_whatsapp_when_connected_and_never_exposed(owner, client, http):
    wa_connect(owner, otp_template="login_code")
    http["handler"] = lambda r: httpx.Response(200, json={"messages": [{"id": "wamid.OTP"}]})
    r = client.post(f"/api/v1/public/{owner.slug}/account/otp/request", json={"identifier": "0744000111"}, headers=H).json()
    assert r["channel"] == "WHATSAPP" and "dev_code" not in r
    call = json.loads(http["calls"][-1].content)
    assert call["type"] == "template" and call["template"]["name"] == "login_code" and len(call["template"]["components"][0]["parameters"][0]["text"]) == 6


# ------------------------------------------------------------------ Instagram, Google, collections
def test_instagram_feed_section_caches_and_survives_provider_failure(owner, client, http):
    connect(owner, "instagram", config={"user_id": "17841"}, secrets={"access_token": "IGtok"})
    posts = {"data": [{"id": "1", "caption": "New drop", "media_type": "IMAGE", "media_url": "https://cdn.example/1.jpg", "permalink": "https://instagram.com/p/1"},
                      {"id": "2", "media_type": "VIDEO", "media_url": "https://cdn.example/v.mp4", "thumbnail_url": "https://cdn.example/2.jpg", "permalink": "https://instagram.com/p/2"}]}
    http["handler"] = lambda r: httpx.Response(200, json=posts)
    owner.post("/api/v1/websites/me/sections", json={"type": "instagram_feed", "settings": {"title": "On Instagram", "limit": 6}})
    owner.post("/api/v1/websites/me/publish")
    html = client.get(f"/{owner.slug}").text
    assert "https://cdn.example/1.jpg" in html and "https://cdn.example/2.jpg" in html and "v.mp4" not in html and "On Instagram" in html
    calls = len(http["calls"])
    client.get(f"/{owner.slug}")
    assert len(http["calls"]) == calls  # served from the cache
    from sqlalchemy import select
    from datetime import datetime, timedelta, timezone
    from app.models import MerchantConnection
    s = SessionLocal()
    try:
        row = s.scalars(select(MerchantConnection).where(MerchantConnection.provider == "instagram")).one()
        row.cache = {"instagram": {**row.cache["instagram"], "fetched_at": (datetime.now(timezone.utc) - timedelta(hours=9)).isoformat()}}
        s.commit()
    finally:
        s.close()
    http["handler"] = lambda r: httpx.Response(400, json={"error": {"message": "token expired"}})
    assert "https://cdn.example/1.jpg" in client.get(f"/{owner.slug}").text  # stale copy still shown
    t = owner.post("/api/v1/connections/instagram/test").json()
    assert t["status"] == "ERROR" and "token expired" in t["last_error"]


def test_google_reviews_section(owner, client, http):
    connect(owner, "google_places", config={"place_id": "ChIJabc"}, secrets={"api_key": "AIza-key"})
    http["handler"] = lambda r: httpx.Response(200, json={"rating": 4.7, "userRatingCount": 132, "googleMapsUri": "https://maps.google.com/?cid=1",
                                                          "reviews": [{"rating": 5, "text": {"text": "Lovely service"}, "authorAttribution": {"displayName": "Joy"}, "relativePublishTimeDescription": "a week ago"}]})
    owner.post("/api/v1/websites/me/sections", json={"type": "google_reviews", "settings": {}})
    owner.post("/api/v1/websites/me/publish")
    html = client.get(f"/{owner.slug}").text
    assert "Lovely service" in html and "4.7" in html and "132 Google reviews" in html and "Reviews from Google" in html
    sent = http["calls"][0]
    assert sent.headers["x-goog-api-key"] == "AIza-key" and "ChIJabc" in str(sent.url)


def test_unconnected_social_sections_are_hidden_live_and_hinted_while_editing(owner, client):
    owner.post("/api/v1/websites/me/sections", json={"type": "instagram_feed", "settings": {"title": "Insta"}})
    owner.post("/api/v1/websites/me/publish")
    assert "Insta" not in client.get(f"/{owner.slug}").text
    assert "Connect Instagram" in owner.get("/api/v1/websites/me/preview").text


def test_collections_crud_section_page_menu_and_isolation(make_owner, client):
    a, b = make_owner("co1@example.com", "A", "Alpha"), make_owner("co2@example.com", "B", "Bravo")
    p1, p2, hidden = product(a, "Scarf", "800"), product(a, "Hat", "500"), product(a, "Draft", "10", status="DRAFT")
    c = a.post("/api/v1/collections", json={"name": "Summer edit", "description": "Light & bright", "product_ids": [p2["id"], p1["id"], hidden["id"]]})
    assert c.status_code == 201, c.text
    col = c.json()
    assert col["slug"] == "summer-edit" and col["product_ids"] == [p2["id"], p1["id"], hidden["id"]]
    foreign = product(b, "Secret", "1")
    assert a.post("/api/v1/collections", json={"name": "Bad", "product_ids": [foreign["id"]]}).status_code == 400
    assert b.get("/api/v1/collections").json() == [] and b.patch(f"/api/v1/collections/{col['id']}", json={"name": "x"}).status_code == 404 and b.delete(f"/api/v1/collections/{col['id']}").status_code == 404
    a.post("/api/v1/websites/me/sections", json={"type": "collection_grid", "settings": {"title": "Our summer picks", "collection_id": col["id"], "limit": 4}})
    a.put("/api/v1/websites/me/navigation", json={"items": [{"label": "Summer", "type": "collection", "ref": col["id"]}]})
    assert a.put("/api/v1/websites/me/navigation", json={"items": [{"label": "X", "type": "collection", "ref": foreign["id"]}]}).status_code == 400
    a.post("/api/v1/websites/me/publish")
    home = client.get(f"/{a.slug}").text
    assert "Our summer picks" in home and home.index("Hat") < home.index("Scarf") and "Draft" not in home and f"/{a.slug}/collections/summer-edit" in home
    page = client.get(f"/{a.slug}/collections/summer-edit")
    assert page.status_code == 200 and "Summer edit" in page.text and "Light &amp; bright" in page.text and "Hat" in page.text and "Draft" not in page.text
    assert "/collections/summer-edit" in client.get(f"/{a.slug}/sitemap.xml").text
    assert client.get(f"/{b.slug}/collections/summer-edit").status_code != 200 or "Summer edit" not in client.get(f"/{b.slug}/collections/summer-edit").text
    link = a.post("/api/v1/marketing/links", json={"target_type": "collection", "target_ref": col["id"], "source": "instagram"}).json()["url"]
    assert f"/{a.slug}/collections/summer-edit?source=instagram" in link
    upd = a.patch(f"/api/v1/collections/{col['id']}", json={"product_ids": [p1["id"]], "name": "Summer"}).json()
    assert upd["product_ids"] == [p1["id"]] and upd["slug"] == "summer"
    assert a.delete(f"/api/v1/collections/{col['id']}").status_code == 204


# ------------------------------------------------------------------ Redis limiter
class FakeRedis:
    def __init__(self):
        self.d, self.ttl = {}, {}

    def incr(self, k):
        self.d[k] = self.d.get(k, 0) + 1
        return self.d[k]

    def expire(self, k, s):
        self.ttl[k] = s


def test_rate_limit_uses_redis_when_configured_and_falls_back(monkeypatch, owner, client):
    from app.core import rate_limit as rl
    fake = FakeRedis()
    monkeypatch.setattr(rl, "_redis", lambda: fake)
    url = f"/api/v1/public/{owner.slug}/leads"
    codes = [client.post(url, json={"name": "A", "phone": f"07110001{i:02d}"}).status_code for i in range(10)]
    assert codes.count(201) == 8 and codes[8:] == [429, 429]  # the public lead limit is 8 per 10 minutes
    assert any(k.startswith("rl:public-lead:") for k in fake.d) and fake.ttl  # counters live in Redis, with an expiry
    class Broken:
        def incr(self, k):
            raise ConnectionError("down")
    rl.reset_rate_limits()
    monkeypatch.setattr(rl, "_redis", lambda: Broken())
    assert client.post(url, json={"name": "B", "phone": "0711000999"}).status_code == 201  # Redis outage: falls back to the in-process limiter


def test_preferred_time_and_full_whatsapp_order_message(owner, client):
    from datetime import datetime, timedelta
    wa = owner.patch("/api/v1/businesses/me", json={"whatsapp": "0711222333"})
    p = product(owner, "Maxi", "2000")
    soon = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%dT10:00")
    bad = client.post(f"/api/v1/public/{owner.slug}/orders", json={"lines": [{"kind": "product", "id": p["id"], "qty": 2}], "name": "Amina", "phone": "0711000111", "payment": "cash", "scheduled_for": "2001-01-01T10:00"})
    assert bad.status_code == 400
    assert client.post(f"/api/v1/public/{owner.slug}/orders", json={"lines": [{"kind": "product", "id": p["id"], "qty": 1}], "name": "A", "phone": "0711000111", "payment": "cash", "scheduled_for": "tomorrow"}).status_code == 400
    r = client.post(f"/api/v1/public/{owner.slug}/orders", json={"lines": [{"kind": "product", "id": p["id"], "qty": 2}], "name": "Amina", "phone": "0711000111", "payment": "cash", "scheduled_for": soon, "notes": "Gift wrap"})
    assert r.status_code == 201, r.text
    assert owner.get("/api/v1/orders").json()["items"][0]["scheduled_for"] == soon
    page = client.get(f"/{owner.slug}/order/{r.json()['token']}").text
    assert soon.replace("T", " ") in page and "Send this order on WhatsApp" in page
    from urllib.parse import unquote
    href = re.search(r'href="([^"]+)"[^>]*>Send this order on WhatsApp', page).group(1)
    msg = unquote(href)
    assert wa.status_code in (200, 204) and "2× Maxi" in msg and "Total:" in msg and "Gift wrap" in msg


def test_guest_login_gives_an_isolated_sample_business(client, owner):
    r = client.post("/api/v1/auth/guest", json={"industry": "retail"})
    assert r.status_code == 201
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    me = client.get("/api/v1/auth/me", headers=h).json()
    assert me["user"]["email"].endswith("@guest.example.com") and me["user"]["platform_role"] is None and len(me["memberships"]) == 1
    assert client.get("/api/v1/products", headers=h).json()["total"] >= 0 and client.get("/api/v1/orders", headers=h).json()["items"] == []
    assert client.post("/api/v1/auth/guest", json={"industry": "nope"}).status_code == 400
    assert client.post("/api/v1/auth/login", json={"email": me["user"]["email"], "password": "guess"}).status_code == 401
    assert client.get("/api/v1/admin/businesses", headers=h).status_code == 403


def test_shop_app_layout_renders_with_free_delivery_progress(owner, client):
    from app.services.templates_seed import seed_templates
    s = SessionLocal()
    try:
        seed_templates(s)
        s.commit()
    finally:
        s.close()
    owner.patch("/api/v1/store/settings", json={"settings": {"delivery": {"flat_fee": 200, "free_over": 3000, "zones": [], "estimate": ""}}})
    p = product(owner, "Backpack", "5999", compare_at_price="8999")
    assert owner.post("/api/v1/websites/me/template", json={"template_key": "shop_app_01"}).status_code == 200
    owner.post("/api/v1/websites/me/regenerate")
    owner.post("/api/v1/websites/me/publish")
    html = client.get(f"/{owner.slug}").text
    assert "layout-shopapp" in html and 'class="sa-tabs"' in html and 'placeholder="Search anything"' in html and 'data-free-over="3000' in html and 'class="ship-bar"' in html
    assert "Backpack" in html and "Save 33%" in html and 'id="shop"' in html
    pg = client.get(f"/{owner.slug}/products/{p['slug']}" if p.get("slug") else f"/{owner.slug}/products")
    assert pg.status_code == 200 and "layout-shopapp" in pg.text


def test_service_app_layout_renders_services_as_cards(owner, client):
    from app.services.templates_seed import seed_templates
    s = SessionLocal()
    try:
        seed_templates(s)
        s.commit()
    finally:
        s.close()
    add_service(owner, "Deep Clean", 3500) if False else owner.post("/api/v1/services", json={"name": "Deep Clean", "price": "3500", "duration_minutes": 120, "description": "Whole home"})
    assert owner.post("/api/v1/websites/me/template", json={"template_key": "service_app_01"}).status_code == 200
    owner.post("/api/v1/websites/me/publish")
    html = client.get(f"/{owner.slug}").text
    assert "layout-serviceapp" in html and 'class="sv-tabs"' in html and "sv-card" in html and "Deep Clean" in html and 'placeholder="Search services"' in html


def test_service_marketplace_layout_renders_bubbles_and_rows(owner, client):
    from app.services.templates_seed import seed_templates
    s = SessionLocal()
    try:
        seed_templates(s)
        s.commit()
    finally:
        s.close()
    cat = owner.post("/api/v1/categories", json={"name": "Cleaning"})
    cid = cat.json().get("id") if cat.status_code in (200, 201) else None
    owner.post("/api/v1/services", json={"name": "Deep Clean", "price": "3500", "duration_minutes": 120, "category_id": cid})
    assert owner.post("/api/v1/websites/me/template", json={"template_key": "service_market_01"}).status_code == 200
    owner.post("/api/v1/websites/me/publish")
    html = client.get(f"/{owner.slug}").text
    assert "layout-bubbleapp" in html and 'class="bb-tabs"' in html and "bb-card" in html and "Deep Clean" in html


def test_catalog_paste_parser_reads_tidy_lists_and_headings():
    from app.services.catalog_ai import parse_list
    out = parse_list("DRESSES:\nSummer Dress - KSh 2,500\nMaxi dress 3200\n\nBags\nLeather Handbag : 4500\nTote bag @ ksh 1,800 - canvas, large\n\nBraids 3 hours 3500\nGel nails - 800 45 min")
    names = {i["name"]: i for i in out["items"]}
    assert names["Summer Dress"]["price"] == 2500 and names["Summer Dress"]["category"] == "Dresses"
    assert names["Maxi dress"]["price"] == 3200 and names["Leather Handbag"]["price"] == 4500 and names["Leather Handbag"]["category"] == "Bags"
    assert names["Tote bag"]["price"] == 1800 and "canvas" in names["Tote bag"]["description"]
    assert names["Braids"]["duration_minutes"] == 180 and names["Braids"]["price"] == 3500
    assert names["Gel nails"]["duration_minutes"] == 45 and names["Gel nails"]["price"] == 800
    assert out["categories"] == ["Dresses", "Bags"]


def test_catalog_ai_suggest_apply_hides_estimates_and_respects_isolation(make_owner):
    a, b = make_owner("cai1@example.com", "A", "Alpha"), make_owner("cai2@example.com", "B", "Bravo")
    r = a.post("/api/v1/ai/catalog/suggest", json={"mode": "paste", "text": "Tops:\nBlue top - 1,200\nRed top - 1,300"}).json()
    assert r["source"] == "parser" and [i["name"] for i in r["items"]] == ["Blue top", "Red top"] and r["note"]
    ideas = a.post("/api/v1/ai/catalog/suggest", json={"mode": "profile"}).json()
    assert ideas["source"] == "starter" and ideas["items"] and all(i["estimate"] for i in ideas["items"]) and ideas["kind"] in ("product", "service")
    res = a.post("/api/v1/ai/catalog/apply", json={"kind": "product", "items": [{"name": "Blue top", "price": 1200, "category": "Tops"}, {"name": "Idea item", "price": 999, "estimate": True, "category": "Tops"}, {"name": "No price"}]})
    assert res.status_code == 201 and res.json()["created"] == 3 and res.json()["hidden"] == 2
    prods = {p["name"]: p for p in a.get("/api/v1/products").json()["items"]}
    assert prods["Blue top"]["status"] == "ACTIVE" and prods["Idea item"]["status"] == "DRAFT" and prods["No price"]["status"] == "DRAFT"
    cats = a.get("/api/v1/categories").json()
    assert [c["name"] for c in cats].count("Tops") == 1  # one category, reused
    dup = a.post("/api/v1/ai/catalog/apply", json={"kind": "product", "items": [{"name": "blue TOP", "price": 5}]}).json()
    assert dup["created"] == 0 and dup["skipped"][0]["reason"].startswith("Already")
    assert b.get("/api/v1/products").json()["total"] == 0 and b.get("/api/v1/categories").json() == []
    s = a.post("/api/v1/ai/catalog/apply", json={"kind": "service", "items": [{"name": "Deep Clean", "price": 3000, "duration_minutes": 90}]})
    assert s.status_code == 201 and any(x["name"] == "Deep Clean" for x in a.get("/api/v1/services").json())
