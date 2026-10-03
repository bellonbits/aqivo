from datetime import datetime, timedelta, timezone

from tests.conftest import SessionLocal, add_service, set_plan


def pro(o):
    set_plan(o.id, "PRO")
    return o


def product(o, name="Dress", price="1000", **extra):
    r = o.post("/api/v1/products", json={"name": name, "price": price, **extra})
    assert r.status_code == 201, r.text
    return r.json()


def place(client, o, p, phone="0711000111", name="Amina", **extra):
    r = client.post(f"/api/v1/public/{o.slug}/orders", json={"lines": [{"kind": "product", "id": p["id"], "qty": 1}], "name": name, "phone": phone, "payment": "cash", **extra})
    assert r.status_code == 201, r.text
    return r.json()


def lead(client, o, name="Lina", phone="0722000111", **kw):
    r = client.post(f"/api/v1/public/{o.slug}/leads", json={"name": name, "phone": phone, **kw})
    assert r.status_code == 201, r.text


def age_leads(hours=5):
    from sqlalchemy import update
    from app.models import Lead
    s = SessionLocal()
    try:
        s.execute(update(Lead).values(created_at=datetime.now(timezone.utc) - timedelta(hours=hours)))
        s.commit()
    finally:
        s.close()


def age_orders(hours=5):
    from sqlalchemy import update
    from app.models import Order
    s = SessionLocal()
    try:
        s.execute(update(Order).values(created_at=datetime.now(timezone.utc) - timedelta(hours=hours)))
        s.commit()
    finally:
        s.close()


def ask(o, q):
    r = o.post("/api/v1/ai/ask", json={"question": q})
    assert r.status_code == 200, r.text
    return r.json()


def act(o, a, confirmed=True):
    return o.post("/api/v1/ai/actions", json={"type": a["type"], "payload": a["payload"], "confirmed": confirmed})


def test_plan_is_built_from_real_data_and_ranked(owner, client):
    pro(owner)
    assert owner.get("/api/v1/ai/plan").json()["items"] == [] or all(i["key"].startswith("setup_") for i in owner.get("/api/v1/ai/plan").json()["items"])
    lead(client, owner)
    assert not [i for i in owner.get("/api/v1/ai/plan").json()["items"] if i["key"] == "leads_waiting"]  # fresh leads aren't "waiting" yet
    age_leads()
    p = product(owner, "Maxi", "2000")
    place(client, owner, p)
    age_orders()
    items = owner.get("/api/v1/ai/plan").json()["items"]
    keys = [i["key"] for i in items]
    assert keys[:2] == ["leads_waiting", "orders_waiting"] or set(keys[:2]) == {"leads_waiting", "orders_waiting"}
    lw = next(i for i in items if i["key"] == "leads_waiting")
    assert lw["action"]["type"] == "follow_up_leads" and lw["action"]["requires_confirmation"] and lw["stats"][0]["value"] == 1
    assert all(i["priority"] in (1, 2, 3) for i in items) and [i["priority"] for i in items] == sorted(i["priority"] for i in items)


def test_follow_up_action_needs_confirmation_and_marks_leads_contacted(owner, client):
    pro(owner)
    lead(client, owner, "Lina", "0722000111", message="hi", source="instagram")
    lead(client, owner, "Ben", "0722000222")
    age_leads()
    a = next(i for i in owner.get("/api/v1/ai/plan").json()["items"] if i["key"] == "leads_waiting")["action"]
    assert act(owner, a, confirmed=False).status_code == 400
    r = act(owner, a).json()
    assert r["ok"] and "2 follow-up" in r["message"]
    cid = r["campaign_id"]
    det = owner.get(f"/api/v1/marketing/campaigns/{cid}").json()
    assert det["campaign"]["kind"] == "FOLLOWUP" and det["campaign"]["created_by_ai"] and len(det["messages"]) == 2 and all(m["status"] == "PREPARED" for m in det["messages"])
    assert "wa.me/254722000111" in det["messages"][0]["whatsapp_url"] or "wa.me/254722000222" in det["messages"][0]["whatsapp_url"]
    owner.post(f"/api/v1/marketing/campaigns/{cid}/confirm")
    owner.post(f"/api/v1/marketing/campaigns/{cid}/messages/{det['messages'][0]['id']}/sent")
    statuses = sorted(l["status"] for l in owner.get("/api/v1/leads").json()["items"])
    assert statuses == ["CONTACTED", "NEW"]
    # once answered, the plan no longer nags about that lead
    again = [i for i in owner.get("/api/v1/ai/plan").json()["items"] if i["key"] == "leads_waiting"]
    assert again and again[0]["stats"][0]["value"] == 1


def test_actions_cannot_touch_other_tenants_data(make_owner, client):
    a, b = pro(make_owner("aa@example.com", "A", "Alpha")), pro(make_owner("ab@example.com", "B", "Bravo"))
    lead(client, a)
    age_leads()
    lid = a.get("/api/v1/leads").json()["items"][0]["id"]
    r = act(b, {"type": "follow_up_leads", "payload": {"lead_ids": [lid]}})
    assert r.status_code == 400  # nothing of theirs matched
    assert b.get("/api/v1/marketing/campaigns").json() == []
    pa = product(a, "Secret", "10")
    assert act(b, {"type": "update_product_description", "payload": {"product_id": pa["id"], "description": "hijacked"}}).status_code == 404
    assert a.get(f"/api/v1/products/{pa['id']}").json()["description"] == ""
    assert b.get("/api/v1/ai/plan").json()["items"] == [] or all(i["key"].startswith("setup_") for i in b.get("/api/v1/ai/plan").json()["items"])
    assert act(b, {"type": "create_growth_campaign", "payload": {"name": "x", "objective": "SALES", "target_type": "product", "target_ref": pa["id"], "channels": ["instagram"]}}).status_code == 400


def test_review_requests_for_completed_orders_have_single_use_links(owner, client):
    pro(owner)
    p = product(owner, "Mug", "300")
    place(client, owner, p, "0733111222", "Joy Buyer")
    oid = owner.get("/api/v1/orders").json()["items"][0]["id"]
    for s in ("CONFIRMED", "COMPLETED"):
        owner.patch(f"/api/v1/orders/{oid}/status", json={"status": s})
    item = next(i for i in owner.get("/api/v1/ai/plan").json()["items"] if i["key"] == "reviews_due")
    r = act(owner, item["action"]).json()
    det = owner.get(f"/api/v1/marketing/campaigns/{r['campaign_id']}").json()
    assert det["campaign"]["kind"] == "REVIEW_REQUEST" and len(det["messages"]) == 1
    link = det["messages"][0]["body"].split("review?t=")[1].split()[0]
    page = client.get(f"/{owner.slug}/review", params={"t": link})
    assert page.status_code == 200 and "Thanks for visiting" in page.text  # the token is recognised => verified review form
    assert client.post(f"/api/v1/public/{owner.slug}/reviews", json={"rating": 5, "name": "Joy", "comment": "Great", "token": link}).status_code == 201
    assert client.post(f"/api/v1/public/{owner.slug}/reviews", json={"rating": 5, "name": "Joy", "comment": "Again", "token": link}).status_code == 400
    assert not [i for i in owner.get("/api/v1/ai/plan").json()["items"] if i["key"] == "reviews_due"]


def test_assistant_answers_plan_sources_and_decline_from_data(owner, client):
    pro(owner)
    assert "Nothing urgent" in ask(owner, "What should I do today?")["answer"] or ask(owner, "What should I do today?")["plan"] is not None
    for sid, src in (("a", "instagram"), ("b", "instagram"), ("c", "tiktok")):
        client.post(f"/api/v1/public/{owner.slug}/events", json={"event_type": "WEBSITE_VISIT", "source": src, "session_id": sid}, headers={"user-agent": "Mozilla/5.0"})
    p = product(owner, "Maxi", "2000")
    place(client, owner, p, source="instagram")
    oid = owner.get("/api/v1/orders").json()["items"][0]["id"]
    owner.patch(f"/api/v1/orders/{oid}/status", json={"status": "CONFIRMED"})
    owner.post(f"/api/v1/orders/{oid}/payment", json={})
    s = ask(owner, "Which source brings me the most customers?")
    assert s["answer"].startswith("Instagram brought the most value") and s["data"][0]["label"] == "Instagram" and s["source"] == "rules"
    d = ask(owner, "Why are my sales down?")
    assert "I don't have the previous 30 days" in d["answer"]
    plan = ask(owner, "what should I do today")
    assert plan["answer"] and isinstance(plan.get("actions"), list)


def test_weekend_promotion_creates_campaign_and_discount_only_on_confirm(owner):
    pro(owner)
    product(owner, "Silk Scarf", "800", featured=True)
    ans = ask(owner, "Create a weekend promotion for the silk scarf with 15% off")
    a = ans["actions"][0]
    assert a["type"] == "create_growth_campaign" and a["payload"]["create_discount"]["percent"] == 15 and "15% off" in a["payload"]["offer_text"]
    assert owner.get("/api/v1/discounts").json() == []  # nothing yet
    assert act(owner, a, confirmed=False).status_code == 400
    r = act(owner, a).json()
    assert r["ok"] and owner.get("/api/v1/discounts").json()[0]["code"] == "WEEKEND15"
    camps = owner.get("/api/v1/marketing/campaigns").json()
    assert camps[0]["kind"] == "GROWTH" and camps[0]["created_by_ai"] and camps[0]["discount_code"] == "WEEKEND15" and "15% off" in camps[0]["content"]["instagram"]["text"]
    ans2 = ask(owner, "Create a weekend promotion")
    assert "haven't added a discount" in ans2["answer"] and "create_discount" not in ans2["actions"][0]["payload"]


def test_product_description_is_a_confirmed_draft_that_uses_only_given_facts(owner):
    pro(owner)
    p = product(owner, "Kitenge Tote", "1800", short_description="Roomy everyday bag", tags=["handmade"])
    ans = ask(owner, "Write a product description for kitenge tote")
    assert "Kitenge Tote" in ans["draft"] and ans["source"] == "template" and ans["actions"][0]["type"] == "update_product_description"
    assert owner.get(f"/api/v1/products/{p['id']}").json()["description"] == ""
    assert act(owner, ans["actions"][0]).status_code == 200
    assert owner.get(f"/api/v1/products/{p['id']}").json()["description"] == ans["draft"]


def test_automations_prepare_drafts_once_a_day_and_never_send(owner, client):
    pro(owner)
    lead(client, owner)
    age_leads()
    assert owner.post("/api/v1/ai/automations/run").json()["prepared"] == []  # off by default
    assert owner.patch("/api/v1/ai/automations", json={"auto_followups": "yes"}).status_code == 400
    s = owner.patch("/api/v1/ai/automations", json={"auto_followups": True, "auto_winback": True}).json()
    assert s["auto_followups"] and s["auto_winback"] and not s["auto_review_requests"]
    plan = owner.get("/api/v1/ai/plan").json()  # lazily runs today's automations
    assert [m["kind"] for m in plan["prepared_today"]] == ["FOLLOWUP"]
    camps = owner.get("/api/v1/marketing/campaigns").json()
    assert len(camps) == 1 and camps[0]["status"] == "DRAFT" and camps[0]["created_by_ai"] and camps[0]["sent_count"] == 0
    assert owner.get("/api/v1/ai/plan").json()["prepared_today"] == []  # idempotent for the day
    assert owner.post("/api/v1/ai/automations/run").json()["prepared"] == []  # an open draft already exists
    notes = owner.get("/api/v1/notifications").json()
    assert any(n["kind"] == "growth_ready" for n in notes)


def test_automations_job_runs_across_businesses(make_owner, client):
    a, b = pro(make_owner("ja@example.com", "A", "Alpha")), pro(make_owner("jb@example.com", "B", "Bravo"))
    lead(client, a); lead(client, b, "Zed", "0744000111")
    age_leads()
    a.patch("/api/v1/ai/automations", json={"auto_followups": True})
    from app.jobs.growth_daily import main
    assert main() == 1  # only the business that opted in
    assert len(a.get("/api/v1/marketing/campaigns").json()) == 1 and b.get("/api/v1/marketing/campaigns").json() == []


def test_decline_explains_with_facts_when_there_is_history(owner, client):
    pro(owner)
    from sqlalchemy import update
    from app.models import AnalyticsEvent
    for sid, src in (("p1", "instagram"), ("p2", "instagram"), ("p3", "instagram"), ("p4", "tiktok")):
        client.post(f"/api/v1/public/{owner.slug}/events", json={"event_type": "WEBSITE_VISIT", "source": src, "session_id": sid}, headers={"user-agent": "Mozilla/5.0"})
    s = SessionLocal()
    try:
        s.execute(update(AnalyticsEvent).values(created_at=datetime.now(timezone.utc) - timedelta(days=40)))
        s.commit()
    finally:
        s.close()
    client.post(f"/api/v1/public/{owner.slug}/events", json={"event_type": "WEBSITE_VISIT", "source": "tiktok", "session_id": "n1"}, headers={"user-agent": "Mozilla/5.0"})
    d = ask(owner, "why are my sales down?")
    assert "Visitors" in " ".join(x["label"] for x in d["data"]) and "instagram" in d["answer"] and "can't tell why customers" in d["answer"]
