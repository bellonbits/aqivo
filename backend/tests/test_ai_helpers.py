from tests.conftest import set_plan


def pro(o):
    set_plan(o.id, "PRO")
    return o


def test_ai_draft_product_copy(owner):
    pro(owner)
    r = owner.post("/api/v1/ai/draft-product", json={"name": "Kanga Jumpsuit", "category": "Fashion", "price": "2500", "tags": "handmade, cotton", "kind": "product"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "short_description" in data and len(data["short_description"]) > 5
    assert "description" in data and len(data["description"]) > 10


def test_ai_draft_review_reply(owner):
    pro(owner)
    r = owner.post("/api/v1/ai/draft-review-reply", json={"author_name": "Amina", "rating": 5, "comment": "Best haircut in town! Super clean and friendly."})
    assert r.status_code == 200, r.text
    assert "reply" in r.json() and len(r.json()["reply"]) > 5


def test_ai_draft_lead_reply(owner):
    pro(owner)
    r = owner.post("/api/v1/ai/draft-lead-reply", json={"customer_name": "David Otieno", "service_name": "Engine Diagnosis", "message": "Can I bring my car tomorrow at 10am?"})
    assert r.status_code == 200, r.text
    assert "reply" in r.json() and len(r.json()["reply"]) > 5


def test_ai_draft_profile(owner):
    pro(owner)
    r = owner.post("/api/v1/ai/draft-profile", json={"name": "Nairobi Fresh Spa", "category": "Wellness & Spa", "city": "Nairobi"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "tagline" in data and len(data["tagline"]) > 3
    assert "description" in data and len(data["description"]) > 10


def test_ai_draft_campaign_message(owner):
    pro(owner)
    r = owner.post("/api/v1/ai/draft-campaign-message", json={"kind": "REACTIVATION", "audience": "inactive45", "offer": "15% off return visit"})
    assert r.status_code == 200, r.text
    assert "message" in r.json() and len(r.json()["message"]) > 5
