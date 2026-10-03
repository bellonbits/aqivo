from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from tests.conftest import add_service, set_plan


def _next_weekday_slot(owner, client, service_id, day_offset=3):
    d = (datetime.now(ZoneInfo("Africa/Nairobi")) + timedelta(days=day_offset)).date()
    while d.weekday() == 6:  # Sunday closed by default
        d += timedelta(days=1)
    r = client.get(f"/api/v1/public/{owner.slug}/slots", params={"date": d.isoformat(), "service_ids": service_id})
    assert r.status_code == 200, r.text
    return d, r.json()["slots"]


def test_public_booking_creates_lead_customer_and_prevents_double_booking(owner, client):
    svc = add_service(owner)
    _, slots = _next_weekday_slot(owner, client, svc["id"])
    assert slots
    payload = {"service_ids": [svc["id"]], "starts_at": slots[0]["starts_at"], "name": "Amina M", "phone": "0722000111"}
    assert client.post(f"/api/v1/public/{owner.slug}/bookings", json=payload).status_code == 201
    assert client.post(f"/api/v1/public/{owner.slug}/bookings", json={**payload, "name": "Other", "phone": "0722000222"}).status_code == 409  # slot taken
    leads = owner.get("/api/v1/leads").json()
    assert leads["total"] == 1 and leads["items"][0]["status"] == "BOOKED" and leads["items"][0]["service_name"] == "Knotless Braids"
    assert owner.get("/api/v1/customers").json()["total"] == 1
    b = owner.get("/api/v1/bookings").json()["items"][0]
    assert b["status"] == "PENDING" and b["total_amount"] == "1500.00"
    _, again = _next_weekday_slot(owner, client, svc["id"])
    assert slots[0]["starts_at"] not in [s["starts_at"] for s in again]


def test_booking_lifecycle_and_customer_stats(owner, client):
    svc = add_service(owner)
    _, slots = _next_weekday_slot(owner, client, svc["id"])
    client.post(f"/api/v1/public/{owner.slug}/bookings", json={"service_ids": [svc["id"]], "starts_at": slots[0]["starts_at"], "name": "Mary", "phone": "0722000111"})
    bid = owner.get("/api/v1/bookings").json()["items"][0]["id"]
    assert owner.patch(f"/api/v1/bookings/{bid}", json={"status": "CONFIRMED"}).status_code == 200
    assert owner.patch(f"/api/v1/bookings/{bid}", json={"status": "COMPLETED"}).status_code == 200
    assert owner.patch(f"/api/v1/bookings/{bid}", json={"status": "PENDING"}).status_code == 400  # completed is final
    cust = owner.get("/api/v1/customers").json()["items"][0]
    assert cust["completed_bookings"] == 1 and cust["total_spent"] == "1500.00" and cust["favourite_service"] == "Knotless Braids"
    lead = owner.get("/api/v1/leads").json()["items"][0]
    assert lead["status"] == "CONVERTED"


def test_honeypot_and_validation(owner, client):
    svc = add_service(owner)
    _, slots = _next_weekday_slot(owner, client, svc["id"])
    base = {"service_ids": [svc["id"]], "starts_at": slots[0]["starts_at"], "name": "Bot", "phone": "0722000111"}
    assert client.post(f"/api/v1/public/{owner.slug}/bookings", json={**base, "website": "http://spam"}).status_code == 400
    assert client.post(f"/api/v1/public/{owner.slug}/bookings", json={**base, "phone": "abcdef"}).status_code == 400
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    assert client.post(f"/api/v1/public/{owner.slug}/bookings", json={**base, "starts_at": past}).status_code == 409


def test_public_rate_limit(owner, client):
    add_service(owner)
    codes = [client.post(f"/api/v1/public/{owner.slug}/leads", json={"name": "S", "phone": "0722000111"}).status_code for _ in range(10)]
    assert codes[:8] == [201] * 8 and 429 in codes


def test_reviews_verified_single_use(owner, client):
    svc = add_service(owner)
    _, slots = _next_weekday_slot(owner, client, svc["id"])
    client.post(f"/api/v1/public/{owner.slug}/bookings", json={"service_ids": [svc["id"]], "starts_at": slots[0]["starts_at"], "name": "Mary", "phone": "0722000111"})
    bid = owner.get("/api/v1/bookings").json()["items"][0]["id"]
    assert owner.post("/api/v1/reviews/requests", json={"booking_id": bid}).status_code == 400  # not completed yet
    owner.patch(f"/api/v1/bookings/{bid}", json={"status": "COMPLETED"})
    req = owner.post("/api/v1/reviews/requests", json={"booking_id": bid}).json()
    token = req["link"].split("t=")[1]
    assert "wa.me/254722000111" in req["whatsapp_url"]
    body = {"rating": 5, "name": "Mary", "comment": "Loved it", "token": token}
    assert client.post(f"/api/v1/public/{owner.slug}/reviews", json=body).status_code == 201
    assert client.post(f"/api/v1/public/{owner.slug}/reviews", json=body).status_code == 400  # link is single-use
    r = owner.get("/api/v1/reviews").json()[0]
    assert r["verified"] is True
    anon = client.post(f"/api/v1/public/{owner.slug}/reviews", json={"rating": 3, "name": "Walk-in", "comment": "ok"})
    assert anon.status_code == 201
    assert sorted(x["verified"] for x in owner.get("/api/v1/reviews").json()) == [False, True]
    assert owner.get("/api/v1/reviews/summary").json()["count"] == 2
    assert owner.post(f"/api/v1/reviews/{r['id']}/respond", json={"response": "Thank you!"}).json()["response"] == "Thank you!"
    assert client.post(f"/api/v1/public/{owner.slug}/reviews", json={"rating": 9, "name": "x"}).status_code == 422


def test_analytics_only_real_data(owner, client):
    add_service(owner)
    s = owner.get("/api/v1/analytics/summary").json()
    assert s["has_data"] is False and s["lead_conversion_rate"] is None and s["average_rating"] is None
    client.post(f"/api/v1/public/{owner.slug}/events", json={"event_type": "WHATSAPP_CLICK"}, headers={"user-agent": "Mozilla/5.0 (iPhone)"})
    client.post(f"/api/v1/public/{owner.slug}/events", json={"event_type": "WHATSAPP_CLICK"}, headers={"user-agent": "Googlebot"})  # bots ignored
    client.post(f"/api/v1/public/{owner.slug}/events", json={"event_type": "WEBSITE_VISIT"}, headers={"user-agent": "Mozilla/5.0"})
    s = owner.get("/api/v1/analytics/summary").json()
    assert s["whatsapp_clicks"] == 1 and s["visitors"] == 1 and s["has_data"] is True
    ts = owner.get("/api/v1/analytics/timeseries", params={"metric": "whatsapp"}).json()
    assert sum(p["value"] for p in ts["points"]) == 1


def test_health_score_uses_only_available_signals(owner):
    h = owner.get("/api/v1/analytics/health").json()
    assert h["components"]["reviews"]["score"] is None and h["components"]["bookings"]["score"] is None
    assert h["components"]["online_presence"]["score"] is not None and 0 <= h["overall"] <= 100
    assert any(r["key"].startswith("setup_") for r in h["recommendations"])


def test_retention_and_reactivation_campaign_requires_confirmation(owner, db):
    from app.models import Booking, Customer
    set_plan(owner.id, "PRO")
    svc = add_service(owner)
    cust = owner.post("/api/v1/customers", json={"name": "Old Client", "phone": "0733000111"}).json()
    long_ago = datetime.now(timezone.utc) - timedelta(days=60)
    r = owner.post("/api/v1/bookings", json={"service_ids": [svc["id"]], "starts_at": long_ago.isoformat(), "customer_id": cust["id"], "ignore_availability": True})
    bid = r.json()["id"]
    owner.patch(f"/api/v1/bookings/{bid}", json={"status": "COMPLETED"})
    assert owner.get("/api/v1/customers/inactive", params={"days": 45}).json()["count"] == 1
    ans = owner.post("/api/v1/ai/ask", json={"question": "Find customers who haven't visited in 45 days"}).json()
    act = ans["actions"][0]
    assert act["type"] == "create_campaign" and act["requires_confirmation"] is True
    assert owner.post("/api/v1/ai/actions", json={"type": act["type"], "payload": act["payload"], "confirmed": False}).status_code == 400
    made = owner.post("/api/v1/ai/actions", json={"type": act["type"], "payload": act["payload"], "confirmed": True}).json()
    camp = owner.get(f"/api/v1/marketing/campaigns/{made['campaign_id']}").json()
    assert camp["campaign"]["status"] == "DRAFT" and len(camp["messages"]) == 1 and camp["messages"][0]["status"] == "PREPARED"
    assert "Hi Old" in camp["messages"][0]["body"] and "wa.me/254733000111" in camp["messages"][0]["whatsapp_url"]
    mid = camp["messages"][0]["id"]
    assert owner.post(f"/api/v1/marketing/campaigns/{made['campaign_id']}/messages/{mid}/sent").status_code == 400  # not confirmed yet
    assert owner.post(f"/api/v1/marketing/campaigns/{made['campaign_id']}/confirm").json()["status"] == "SCHEDULED"
    assert owner.post(f"/api/v1/marketing/campaigns/{made['campaign_id']}/messages/{mid}/sent").json()["status"] == "SENT"


def test_ai_is_honest_without_data_and_gated_by_plan(owner):
    assert owner.post("/api/v1/ai/ask", json={"question": "hi"}).status_code == 402  # Grow trial has no AI
    set_plan(owner.id, "PRO")
    a = owner.post("/api/v1/ai/ask", json={"question": "Which service is getting the most interest?"}).json()
    assert "Not enough data" in a["answer"]
    a = owner.post("/api/v1/ai/ask", json={"question": "How did my business perform this month?"}).json()
    assert "Not enough data" in a["answer"]


def test_invoice_math_uses_decimals_and_pdf(owner):
    set_plan(owner.id, "PRO")
    r = owner.post("/api/v1/invoices", json={"customer_name": "Walk-in", "discount": "100.50", "items": [{"description": "Braids", "quantity": 2, "unit_price": "1500.10"}, {"description": "Gel", "unit_price": "800"}]})
    assert r.status_code == 201, r.text
    inv = r.json()
    assert inv["subtotal"] == "3800.20" and inv["total"] == "3699.70" and inv["number"] == "INV-00001"
    pdf = owner.get(f"/api/v1/invoices/{inv['id']}/pdf")
    assert pdf.content[:4] == b"%PDF"
    assert owner.post(f"/api/v1/invoices/{inv['id']}/mark-paid").json()["payment_status"] == "PAID"
    assert owner.get("/api/v1/payments/summary").json()["revenue_total"] == "3699.70"
    assert owner.post("/api/v1/invoices", json={"customer_name": "x", "discount": "999999", "items": [{"description": "a", "unit_price": "1"}]}).status_code == 400


def test_roles_and_permissions(owner, make_owner, client):
    set_plan(owner.id, "BUSINESS")
    r = owner.post("/api/v1/businesses/me/members", json={"email": "staff@example.com", "full_name": "Jane", "role": "STAFF", "password": "staff-pass-123"})
    assert r.status_code == 201
    login = client.post("/api/v1/auth/login", json={"email": "staff@example.com", "password": "staff-pass-123"}).json()
    h = {"Authorization": f"Bearer {login['access_token']}"}
    assert client.get("/api/v1/services", headers=h).status_code == 200
    assert client.post("/api/v1/services", headers=h, json={"name": "x", "price": "1"}).status_code == 403
    assert client.patch("/api/v1/businesses/me", headers=h, json={"description": "x"}).status_code == 403
    assert client.post("/api/v1/subscriptions/cancel", headers=h).status_code == 403
    assert client.get("/api/v1/payments", headers=h).status_code == 403
    assert client.post("/api/v1/businesses/me/members", headers=h, json={"email": "z@example.com", "full_name": "Z", "role": "STAFF"}).status_code == 403
    r = owner.post("/api/v1/businesses/me/members", json={"email": "mgr@example.com", "full_name": "Mgr", "role": "BUSINESS_MANAGER", "password": "mgr-pass-1234"})
    mh = {"Authorization": f"Bearer {client.post('/api/v1/auth/login', json={'email': 'mgr@example.com', 'password': 'mgr-pass-1234'}).json()['access_token']}"}
    assert client.post("/api/v1/services", headers=mh, json={"name": "x", "price": "1"}).status_code == 201
    assert client.post("/api/v1/subscriptions/cancel", headers=mh).status_code == 403
