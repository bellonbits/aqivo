from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from app.services.payments import base as pbase
from tests.conftest import add_service, set_plan


class FakeProvider(pbase.PaymentProvider):
    name = "MPESA"

    def is_configured(self): return True

    def initiate(self, *, amount, currency, phone, reference, description):
        return pbase.ProviderResult(True, "PENDING", reference=f"ref-{reference}", message="Enter PIN")

    def verify_webhook(self, headers, body, query): return query.get("secret") == "s3cret"

    def parse_webhook(self, payload):
        return pbase.WebhookEventData(event_id=payload["id"], reference=payload["ref"], status=payload["status"],
                                      amount=Decimal(payload["amount"]) if payload.get("amount") else None, raw=payload)


@pytest.fixture
def fake_mpesa():
    pbase._load()
    original = pbase._REGISTRY["MPESA"]
    pbase._REGISTRY["MPESA"] = FakeProvider()
    yield
    pbase._REGISTRY["MPESA"] = original


def test_checkout_not_configured_creates_upgrade_request_not_fake_success(owner, admin, client):
    r = owner.post("/api/v1/subscriptions/checkout", json={"plan_key": "PRO"}).json()
    assert r["status"] == "NOT_CONFIGURED"
    tickets = client.get("/api/v1/admin/support-tickets", headers=admin).json()
    assert tickets[0]["subject"].startswith("Upgrade request") and tickets[0]["priority"] == "HIGH"
    assert owner.get("/api/v1/subscriptions/me").json()["subscription"]["plan_key"] == "GROW"  # plan unchanged


def test_webhook_authenticated_validated_idempotent(owner, client, fake_mpesa):
    res = owner.post("/api/v1/subscriptions/checkout", json={"plan_key": "PRO", "phone": "0711222333"}).json()
    assert res["status"] == "PENDING"
    url = "/api/v1/subscriptions/webhooks/mpesa"
    good = {"id": "evt-1", "ref": [t for t in owner.get("/api/v1/subscriptions/me").json()["transactions"]][0] and None}
    from app.core.db import SessionLocal
    from app.models import Transaction
    s = SessionLocal(); ref = s.query(Transaction).one().provider_reference; s.close()
    evt = {"id": "evt-1", "ref": ref, "status": "PAID", "amount": "3000"}
    assert client.post(url, json=evt).status_code == 401  # no secret
    assert client.post(url + "?secret=wrong", json=evt).status_code == 401
    assert client.post(url + "?secret=s3cret", content=b"not json").status_code == 400
    assert client.post(url + "?secret=s3cret", json=evt).status_code == 200
    me = owner.get("/api/v1/subscriptions/me").json()
    assert me["subscription"]["status"] == "ACTIVE" and me["subscription"]["plan_key"] == "PRO"
    end1 = me["subscription"]["current_period_end"]
    for _ in range(3):  # replays must not extend the period or double-process
        assert client.post(url + "?secret=s3cret", json=evt).status_code == 200
    assert owner.get("/api/v1/subscriptions/me").json()["subscription"]["current_period_end"] == end1
    s = SessionLocal()
    from app.models import WebhookEvent
    assert s.query(WebhookEvent).count() == 1
    s.close()


def test_webhook_underpayment_is_not_activated(owner, client, fake_mpesa):
    owner.post("/api/v1/subscriptions/checkout", json={"plan_key": "PRO", "phone": "0711222333"})
    from app.core.db import SessionLocal
    from app.models import Transaction
    s = SessionLocal(); ref = s.query(Transaction).one().provider_reference; s.close()
    client.post("/api/v1/subscriptions/webhooks/mpesa?secret=s3cret", json={"id": "evt-x", "ref": ref, "status": "PAID", "amount": "10"})
    assert owner.get("/api/v1/subscriptions/me").json()["subscription"]["plan_key"] == "GROW"


def test_subscription_state_machine_and_grace(owner, db):
    from sqlalchemy import select
    from app.models import Business, Subscription
    from app.services.plans import effective_plan, refresh_subscription_state
    biz = db.scalars(select(Business)).one()
    sub = db.scalars(select(Subscription)).one()
    assert effective_plan(db, biz).key == "GROW"
    sub.trial_ends_at = datetime.now(timezone.utc) - timedelta(days=1)
    db.commit()
    assert effective_plan(db, biz).key == "FREE" and sub.status == "EXPIRED"  # locks paid features, keeps data
    assert sub.data_retained_until is not None
    # active -> past_due (grace keeps features) -> expired
    set_plan(str(biz.id), "PRO")
    db.refresh(sub)
    sub.current_period_end = datetime.now(timezone.utc) - timedelta(days=2)
    db.commit()
    assert effective_plan(db, biz).key == "PRO" and sub.status == "PAST_DUE"
    sub.grace_ends_at = datetime.now(timezone.utc) - timedelta(hours=1)
    db.commit()
    assert effective_plan(db, biz).key == "FREE" and sub.status == "EXPIRED"


def test_lapsed_business_keeps_data_and_profile(owner, client, db):
    add_service(owner)
    set_plan(owner.id, "FREE")
    assert client.get(f"/{owner.slug}").status_code == 200 and "Knotless Braids" in client.get(f"/{owner.slug}").text
    assert len(owner.get("/api/v1/services").json()) == 1


def test_cancel_keeps_access_until_period_end(owner):
    set_plan(owner.id, "PRO")
    r = owner.post("/api/v1/subscriptions/cancel").json()
    assert r["cancel_at_period_end"] is True and r["status"] == "ACTIVE" and "nothing is deleted" in r["message"]
    assert owner.post("/api/v1/subscriptions/resume").status_code == 200


def test_plans_are_configurable_from_admin(owner, admin, client):
    public = {p["key"]: p for p in client.get("/api/v1/subscriptions/plans").json()}
    assert public["GROW"]["price"] == "1500"
    r = client.patch("/api/v1/admin/plans/GROW", headers=admin, json={"prices": {"KES": "1800", "USD": "14"}})
    assert r.status_code == 200
    assert {p["key"]: p for p in client.get("/api/v1/subscriptions/plans").json()}["GROW"]["price"] == "1800"
    assert client.patch("/api/v1/admin/plans/GROW", headers=owner.h, json={"prices": {"KES": "1"}}).status_code == 403


def test_admin_manual_onboarding_flow(client, admin):
    r = client.post("/api/v1/admin/businesses", headers=admin, json={"name": "Glow Salon", "owner_email": "glow@example.com", "owner_name": "Glow Owner", "phone": "0700000001",
                                                                   "city": "Nairobi", "trial": False, "plan_key": "GROW"})
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["temporary_password"] and data["business"]["slug"] == "glowsalon"
    login = client.post("/api/v1/auth/login", json={"email": "glow@example.com", "password": data["temporary_password"]})
    assert login.status_code == 200
    bid = data["business"]["id"]
    assert client.post(f"/api/v1/admin/businesses/{bid}/publish", headers=admin).json()["status"] == "PUBLISHED"
    sub = client.post(f"/api/v1/admin/businesses/{bid}/subscription", headers=admin, json={"plan_key": "PRO", "action": "activate", "months": 2}).json()
    assert sub["status"] == "ACTIVE" and sub["plan"] == "PRO"
    dash = client.get("/api/v1/admin/dashboard", headers=admin).json()
    assert dash["total_businesses"] == 1 and dash["websites_live"] == 1 and dash["mrr"] == {"KES": 3000.0}
    assert client.post(f"/api/v1/admin/businesses/{bid}/suspend", headers=admin).status_code == 200
    h = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert client.get("/api/v1/customers", headers=h).status_code == 403  # suspended
    assert client.get("/glowsalon").status_code == 503


def test_impersonation_is_audited(client, admin, owner):
    r = client.post(f"/api/v1/admin/businesses/{owner.id}/impersonate", headers=admin).json()
    ih = {"Authorization": f"Bearer {r['access_token']}"}
    assert client.get("/api/v1/businesses/me", headers=ih).json()["impersonating"] is True
    assert client.post("/api/v1/services", headers=ih, json={"name": "Added by support", "price": "10"}).status_code == 201
    assert client.get("/api/v1/admin/dashboard", headers=ih).status_code == 403  # can't use admin tools while impersonating
    logs = client.get("/api/v1/admin/audit-logs", headers=admin).json()
    actions = [l["action"] for l in logs]
    assert "admin.impersonation_started" in actions and "impersonation.action" in actions
    started = next(l for l in logs if l["action"] == "admin.impersonation_started")
    assert started["impersonator_id"] is not None and started["business_id"] == owner.id


def test_sales_crm(client, admin):
    r = client.post("/api/v1/admin/sales-leads", headers=admin, json={"business_name": "Nails by Amy", "phone": "0700", "status": "DEMO", "follow_up_on": "2026-10-10"})
    assert r.status_code == 201
    sid = r.json()["id"]
    assert client.patch(f"/api/v1/admin/sales-leads/{sid}", headers=admin, json={"status": "INTERESTED"}).json()["status"] == "INTERESTED"
    assert client.patch(f"/api/v1/admin/sales-leads/{sid}", headers=admin, json={"status": "BOGUS"}).status_code == 422
    assert len(client.get("/api/v1/admin/sales-leads", headers=admin).json()) == 1


def test_audit_log_records_key_actions(owner, client, admin):
    add_service(owner)
    owner.post("/api/v1/websites/me/publish")
    actions = {l["action"] for l in client.get("/api/v1/admin/audit-logs", headers=admin, params={"limit": 200}).json()}
    assert {"auth.register", "business.created", "service.created", "website.published"} <= actions


def test_health_endpoints(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/readiness").json()["database"] == "ok"
    r = client.get("/health")
    assert r.headers["x-content-type-options"] == "nosniff" and "x-request-id" in r.headers


def test_subdomain_host_routing(owner, client):
    r = client.get("/", headers={"host": f"{owner.slug}.aqivo.shop"})
    assert r.status_code == 200 and owner.business["name"] in r.text
    assert client.get("/", headers={"host": "www.aqivo.shop"}).status_code in (200, 404)
