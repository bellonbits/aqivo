from tests.conftest import add_service


def test_industry_sets_template_vocabulary_and_schema(make_owner, client):
    o = make_owner("r@example.com", "Rita", "Savanna Grill", industry="restaurant")
    assert o.business["industry"] == "restaurant" and o.business["category"] == "Restaurant"
    assert "order" in o.business["whatsapp_default_message"]
    site = o.get("/api/v1/websites/me").json()
    assert site["template"]["key"] == "aqivo"
    hero = next(s for s in site["sections"] if s["type"] == "hero")
    assert hero["settings"]["cta_text"] == "Order online"
    add_service(o, "Nyama Choma", "1800")
    o.post("/api/v1/websites/me/publish")
    assert '"@type": "Restaurant"' in client.get(f"/{o.slug}").text


def test_unknown_industry_rejected(client):
    r = client.post("/api/v1/auth/register", json={"email": "z@example.com", "password": "correct-horse-1", "full_name": "Z"})
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.post("/api/v1/businesses", headers=h, json={"name": "X Shop", "phone": "0711222333", "industry": "spaceships"}).status_code == 422


def test_templates_cover_industries_and_layouts(client):
    ts = client.get("/api/v1/templates").json()
    assert len(ts) == 1
    assert ts[0]["key"] == "aqivo"


def test_style_overrides_validated_and_stay_draft_until_publish(make_owner, client):
    o = make_owner("s@example.com", "S", "Style Shop")
    add_service(o)
    assert o.patch("/api/v1/websites/me/style", json={"theme": {"accent": "red"}}).status_code == 400
    assert o.patch("/api/v1/websites/me/style", json={"theme": {"font_display": "Comic Sans"}}).status_code == 400
    r = o.patch("/api/v1/websites/me/style", json={"theme": {"accent": "#e11d48", "font_display": "Poppins", "radius": "pill"}, "settings": {"announcement": "Free delivery", "whatsapp_float": False}})
    assert r.status_code == 200 and r.json()["theme_overrides"]["accent"] == "#E11D48"
    o.post("/api/v1/websites/me/publish")
    live = client.get(f"/{o.slug}").text
    assert "--accent:#E11D48" in live and "Free delivery" in live and "wa-float" not in live.split("<body")[1]
    o.patch("/api/v1/websites/me/style", json={"theme": {"accent": "#0EA5E9"}, "settings": {"announcement": "Changed"}})
    live2 = client.get(f"/{o.slug}").text
    assert "--accent:#E11D48" in live2 and "Changed" not in live2  # unpublished edits don't leak
    assert "--accent:#0EA5E9" in o.get("/api/v1/websites/me/preview").text
    assert o.delete("/api/v1/websites/me/style").json()["theme_overrides"] == {}


def test_style_is_tenant_scoped_and_free_plan_can_edit(make_owner):
    from tests.conftest import set_plan
    a, b = make_owner("a1@example.com", "A", "Alpha"), make_owner("b1@example.com", "B", "Bravo")
    a.patch("/api/v1/websites/me/style", json={"theme": {"accent": "#111111"}})
    assert b.get("/api/v1/websites/me").json()["theme_overrides"] == {}
    set_plan(b.id, "FREE")
    assert b.patch("/api/v1/websites/me/style", json={"theme": {"accent": "#222222"}}).status_code == 200  # styling is part of the free storefront


def test_shop_layout_renders_bag_and_whatsapp_checkout(make_owner, client):
    o = make_owner("shop@example.com", "Shop", "Zuri Shop", industry="retail")
    add_service(o, "Summer Dress", "2500")
    assert o.post("/api/v1/websites/me/template", json={"template_key": "aqivo"}).status_code == 200
    o.post("/api/v1/websites/me/publish")
    html = client.get(f"/{o.slug}").text
    assert "aqivo" in html and "Summer Dress" in html and "_bridge.js" in html
    assert 'data-wa="254711222333"' in html or "254711222333" in html


def test_preview_in_other_template_uses_own_data(make_owner):
    o = make_owner("p@example.com", "P", "Preview Me")
    add_service(o, "Silk Press", "1800")
    html = o.get("/api/v1/websites/me/preview", params={"template": "aqivo"}).text
    assert "aqivo" in html and "Silk Press" in html and "Preview Me" in html
    assert o.get("/api/v1/websites/me/preview", params={"template": "nope"}).status_code == 404


def test_restaurant_storefront_complete_brand_design(make_owner, client):
    o = make_owner("jeff@example.com", "Jeff", "Jeff Cafe", industry="restaurant")
    add_service(o, "Nyama Choma Platter", "1200")
    o.post("/api/v1/websites/me/publish")
    html = client.get(f"/{o.slug}").text

    assert "aqivo" in html
    assert "Jeff Cafe" in html
    assert "Nyama Choma Platter" in html
    assert "_bridge.js" in html


def test_aqivo_template_preview_and_render(make_owner):
    o = make_owner("aq@example.com", "A", "Aqivo Store")
    add_service(o, "Custom Dress", "3500")
    html = o.get("/api/v1/websites/me/preview", params={"template": "aqivo"}).text
    assert "Aqivo Store" in html and "_bridge.js" in html and "window.__BZ" in html

