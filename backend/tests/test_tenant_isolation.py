"""CRITICAL: Business A must never touch Business B's data — by id, by list, or by forging business_id."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from tests.conftest import add_service, set_plan


@pytest.fixture
def two(make_owner):
    a = make_owner("a@example.com", "Owner A", "Alpha Salon")
    b = make_owner("b@example.com", "Owner B", "Bravo Salon")
    set_plan(a.id, "BUSINESS")
    set_plan(b.id, "BUSINESS")
    return a, b


def _seed_b(b):
    svc = add_service(b)
    cust = b.post("/api/v1/customers", json={"name": "B Customer", "phone": "0700111222"}).json()
    lead = b.post("/api/v1/leads", json={"name": "B Lead", "phone": "0700111333"}).json()
    start = (datetime.now(timezone.utc) + timedelta(days=3)).replace(hour=9, minute=0, second=0, microsecond=0)
    bk = b.post("/api/v1/bookings", json={"service_ids": [svc["id"]], "starts_at": start.isoformat(), "customer_id": cust["id"], "ignore_availability": True})
    assert bk.status_code == 201, bk.text
    pay = b.post("/api/v1/payments", json={"amount": "1500", "customer_id": cust["id"]}).json()
    inv = b.post("/api/v1/invoices", json={"customer_id": cust["id"], "items": [{"description": "x", "unit_price": "100"}]})
    return {"service": svc, "customer": cust, "lead": lead, "booking": bk.json(), "payment": pay, "invoice": inv}


def test_lists_only_contain_own_data(two):
    a, b = two
    _seed_b(b)
    for path in ("/api/v1/customers", "/api/v1/leads", "/api/v1/bookings"):
        assert a.get(path).json()["total"] == 0, path
    assert a.get("/api/v1/services").json() == []
    assert a.get("/api/v1/payments").json() == []
    assert a.get("/api/v1/invoices").json() == []


def test_direct_id_access_is_404_not_403(two):
    a, b = two
    seeded = _seed_b(b)
    cid, lid, bid = seeded["customer"]["id"], seeded["lead"]["id"], seeded["booking"]["id"]
    assert a.get(f"/api/v1/customers/{cid}").status_code == 404
    assert a.patch(f"/api/v1/customers/{cid}", json={"name": "hacked"}).status_code == 404
    assert a.delete(f"/api/v1/customers/{cid}").status_code == 404
    assert a.post(f"/api/v1/customers/{cid}/notes", json={"body": "x"}).status_code == 404
    assert a.patch(f"/api/v1/leads/{lid}", json={"status": "LOST"}).status_code == 404
    assert a.post(f"/api/v1/leads/{lid}/convert").status_code == 404
    assert a.patch(f"/api/v1/bookings/{bid}", json={"status": "CANCELLED"}).status_code == 404
    assert a.patch(f"/api/v1/services/{seeded['service']['id']}", json={"name": "hacked"}).status_code == 404
    assert a.delete(f"/api/v1/services/{seeded['service']['id']}").status_code == 404
    assert a.patch(f"/api/v1/payments/{seeded['payment']['id']}", json={"status": "REFUNDED"}).status_code == 404
    assert a.get(f"/api/v1/invoices/{seeded['invoice'].json()['id']}").status_code == 404
    assert a.get(f"/api/v1/invoices/{seeded['invoice'].json()['id']}/pdf").status_code == 404
    # B's data is untouched
    assert b.get(f"/api/v1/customers/{cid}").json()["customer"]["name"] == "B Customer"


def test_cannot_attach_own_records_to_foreign_ids(two):
    a, b = two
    seeded = _seed_b(b)
    svc_a = add_service(a, "A service")
    start = (datetime.now(timezone.utc) + timedelta(days=4)).isoformat()
    assert a.post("/api/v1/bookings", json={"service_ids": [seeded["service"]["id"]], "starts_at": start, "customer_name": "x", "ignore_availability": True}).status_code == 400
    assert a.post("/api/v1/bookings", json={"service_ids": [svc_a["id"]], "starts_at": start, "customer_id": seeded["customer"]["id"], "ignore_availability": True}).status_code == 404
    assert a.post("/api/v1/payments", json={"amount": "10", "customer_id": seeded["customer"]["id"]}).status_code == 404
    assert a.patch(f"/api/v1/services/{svc_a['id']}", json={"category_id": str(uuid.uuid4())}).status_code == 400


def test_client_supplied_business_id_is_ignored(two):
    a, b = two
    r = a.post("/api/v1/services", json={"name": "Sneaky", "price": "1", "business_id": b.id})
    assert r.status_code == 201
    assert [s["name"] for s in b.get("/api/v1/services").json()] == []
    assert [s["name"] for s in a.get("/api/v1/services").json()] == ["Sneaky"]
    # X-Business-Id header is only a selector among the caller's own memberships
    r = a.client.get("/api/v1/services", headers={**a.h, "X-Business-Id": b.id})
    assert r.status_code == 403


def test_analytics_website_and_settings_are_scoped(two):
    a, b = two
    add_service(b, "Bravo Only")
    b.edit_section("hero", headline="BRAVO SECRET HEADLINE")
    assert "BRAVO SECRET" not in a.get("/api/v1/websites/me").text
    assert "BRAVO SECRET" in b.get("/api/v1/websites/me").text
    assert a.get("/api/v1/businesses/me").json()["business"]["name"] == "Alpha Salon"
    assert a.get("/api/v1/analytics/summary").json()["leads"] == 0
    assert "Bravo Only" not in a.get("/api/v1/websites/me/preview").text


def test_public_endpoints_write_only_to_slug_business(client, two):
    a, b = two
    svc = add_service(a)
    r = client.post(f"/api/v1/public/{a.slug}/leads", json={"name": "Visitor", "phone": "0700999888"})
    assert r.status_code == 201
    assert a.get("/api/v1/leads").json()["total"] == 1
    assert b.get("/api/v1/leads").json()["total"] == 0
    # a service from A can't be used against B's public booking endpoint
    r = client.get(f"/api/v1/public/{b.slug}/slots", params={"date": (datetime.now() + timedelta(days=2)).date().isoformat(), "service_ids": svc["id"]})
    assert r.status_code == 400


def test_admin_routes_forbidden_to_business_users(two):
    a, _ = two
    for path in ("/api/v1/admin/dashboard", "/api/v1/admin/businesses", "/api/v1/admin/audit-logs", "/api/v1/admin/sales-leads"):
        assert a.get(path).status_code == 403, path
    assert a.post("/api/v1/admin/businesses/" + a.id + "/impersonate").status_code == 403
