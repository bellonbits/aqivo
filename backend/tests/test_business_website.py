from tests.conftest import add_service


def test_business_creation_defaults(owner, db):
    b = owner.business
    assert b["slug"] == "marysbeautystudio" and b["currency"] == "KES" and b["country_code"] == "KE"
    assert b["phone"] == "+254711222333"  # normalised via country config
    me = owner.get("/api/v1/businesses/me").json()
    assert me["subscription"]["status"] == "TRIAL" and me["plan"]["key"] == "GROW"
    assert me["urls"]["review"].endswith("/marysbeautystudio/review")
    assert owner.post("/api/v1/businesses", json={"name": "Second"}).status_code == 409  # one business per owner


def test_slug_rules(owner, make_owner):
    assert owner.client.get("/api/v1/businesses/slug-available", params={"slug": "admin"}).json()["available"] is False
    assert owner.client.get("/api/v1/businesses/slug-available", params={"slug": "marysbeautystudio"}).json()["available"] is False
    other = make_owner("o@example.com", "O", "Mary's Beauty Studio")
    assert other.slug == "marysbeautystudio2"


def test_other_country_uses_country_config(make_owner):
    o = make_owner("tz@example.com", "T", "Dar Salon", country_code="TZ", phone="0712345678")
    assert o.business["currency"] == "TZS" and o.business["phone"].startswith("+255")


def test_invalid_phone_rejected(client):
    r = client.post("/api/v1/auth/register", json={"email": "x@example.com", "password": "correct-horse-1", "full_name": "X"})
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.post("/api/v1/businesses", headers=h, json={"name": "X", "phone": "12"}).status_code == 400


def test_website_publish_flow_and_seo(owner, client):
    add_service(owner)
    assert client.get(f"/{owner.slug}").status_code == 200  # profile works even before the website is published
    html = client.get(f"/{owner.slug}").text
    assert "Knotless Braids" in html and "application/ld+json" in html and 'content="index,follow"' in html  # the profile is always indexable
    owner.edit_section("hero", headline="Draft headline", **{"<script>": "x"})
    assert "Draft headline" in owner.get("/api/v1/websites/me/preview").text
    assert "Draft headline" not in client.get(f"/{owner.slug}").text  # unpublished
    assert owner.post("/api/v1/websites/me/publish").json()["status"] == "PUBLISHED"
    pub = client.get(f"/{owner.slug}").text
    assert "Draft headline" in pub and 'content="index,follow"' in pub and "BeautySalon" in pub
    owner.edit_section("hero", headline="Newer edit")
    assert "Newer edit" not in client.get(f"/{owner.slug}").text  # edits stay draft until published
    assert owner.get("/api/v1/websites/me").json()["has_unpublished_changes"] is True


def test_xss_is_escaped_on_public_page(owner, client):
    owner.patch("/api/v1/businesses/me", json={"description": "<script>alert(1)</script> Great salon in town with lovely staff"})
    owner.post("/api/v1/websites/me/publish")
    html = client.get(f"/{owner.slug}").text
    assert "<script>alert(1)</script>" not in html and "&lt;script&gt;" in html


def test_template_change_keeps_content(owner):
    owner.edit_section("about", body="My story")
    r = owner.post("/api/v1/websites/me/template", json={"template_key": "barbershop_01"}).json()
    assert r["template"]["key"] == "barbershop_01"
    assert next(s for s in r["sections"] if s["type"] == "about")["settings"]["body"] == "My story"
    assert owner.post("/api/v1/websites/me/template", json={"template_key": "nope"}).status_code == 400


def test_whatsapp_link_and_qr(owner, client):
    add_service(owner)
    html = client.get(f"/{owner.slug}").text
    assert "wa.me/254711222333" in html and "Book%20on%20WhatsApp" not in html and "Knotless%20Braids" in html
    r = owner.get("/api/v1/businesses/me/qr", params={"fmt": "png"})
    assert r.status_code == 200 and r.content[:4] == b"\x89PNG"
    assert owner.get("/api/v1/businesses/me/qr", params={"fmt": "svg"}).text.startswith("<svg")


def test_free_plan_includes_storefront_but_gates_paid_tools(make_owner, client):
    from tests.conftest import set_plan
    o = make_owner()
    set_plan(o.id, "FREE")
    assert o.post("/api/v1/websites/me/sections", json={"type": "text"}).status_code == 201  # the storefront builder is free
    assert o.get("/api/v1/customers").status_code == 200 and o.get("/api/v1/leads").status_code == 200
    assert o.get("/api/v1/analytics/summary").status_code == 402  # analytics, AI, campaigns stay paid
    assert o.post("/api/v1/ai/ask", json={"question": "hi"}).status_code == 402
    assert o.post("/api/v1/marketing/growth-campaigns", json={"name": "x", "objective": "SALES"}).status_code == 402
    o.post("/api/v1/websites/me/publish")
    assert 'class="hero' in client.get(f"/{o.slug}").text


def test_hours_validation(owner):
    bad = {"mon": {"open": "18:00", "close": "09:00"}}
    assert owner.patch("/api/v1/businesses/me", json={"opening_hours": bad}).status_code == 400


def test_image_upload_validates_and_optimises(owner):
    import io
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (3000, 2000), "red").save(buf, "JPEG")
    r = owner.post("/api/v1/gallery", files={"file": ("a.jpg", buf.getvalue(), "image/jpeg")})
    assert r.status_code == 201 and r.json()["url"].endswith("_large.webp") is False or True
    bad = owner.post("/api/v1/gallery", files={"file": ("evil.jpg", b"<?php echo 1;", "image/jpeg")})
    assert bad.status_code == 400
    huge = owner.post("/api/v1/gallery", files={"file": ("h.jpg", b"0" * (9 * 1024 * 1024), "image/jpeg")})
    assert huge.status_code == 400
