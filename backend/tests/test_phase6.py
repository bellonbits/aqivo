from contextlib import contextmanager

from tests.conftest import SessionLocal, add_service, set_plan


@contextmanager
def plan_limits(key, **limits):
    """Temporarily change a plan's limits (plans aren't reset between tests)."""
    from sqlalchemy import select
    from app.models import Plan
    s = SessionLocal()
    old = None
    try:
        p = s.scalars(select(Plan).where(Plan.key == key)).one()
        old = dict(p.limits or {})
        p.limits = {**old, **limits}
        s.commit()
    finally:
        s.close()
    try:
        yield
    finally:
        s = SessionLocal()
        try:
            p = s.scalars(select(Plan).where(Plan.key == key)).one()
            p.limits = old
            s.commit()
        finally:
            s.close()


def product(o, name="Dress", price="1000", **extra):
    r = o.post("/api/v1/products", json={"name": name, "price": price, **extra})
    return r


# ---------------------------------------------------------------- plans & limits
def test_default_plans_make_the_storefront_free_and_limits_enforced(make_owner):
    o = make_owner("pl@example.com", "P", "Plan Shop")
    set_plan(o.id, "FREE")
    plans = {p["key"]: p for p in o.client.get("/api/v1/subscriptions/plans").json()}
    assert "website" in plans["FREE"]["features"] and "custom_domain" not in plans["FREE"]["features"] and "custom_domain" in plans["GROW"]["features"]
    u = o.get("/api/v1/subscriptions/usage").json()
    assert u["plan"]["key"] == "FREE" and u["usage"]["products"] == {"used": 0, "limit": 30, "label": "products"}
    with plan_limits("FREE", products=2, services=1):
        assert product(o, "A").status_code == 201 and product(o, "B").status_code == 201
        r = product(o, "C")
        assert r.status_code == 402 and r.json()["detail"]["feature"] == "limit:products" and "2 products" in r.json()["detail"]["message"]
        assert o.get("/api/v1/subscriptions/usage").json()["usage"]["products"]["used"] == 2
        add_service(o)
        assert o.post("/api/v1/services", json={"name": "Second", "price": "1", "duration_minutes": 30}).status_code == 402
    set_plan(o.id, "BUSINESS")
    assert o.get("/api/v1/subscriptions/usage").json()["usage"]["products"]["limit"] is None  # unlimited


def test_pages_qr_and_ai_limits_and_admin_limit_validation(make_owner, admin):
    o = make_owner("pl2@example.com", "P", "Limit Shop")
    set_plan(o.id, "PRO")
    with plan_limits("PRO", pages=2, qr_codes=1, ai_requests_month=1):
        assert o.post("/api/v1/websites/me/pages", json={"title": "One"}).status_code == 201  # home + one = 2
        r = o.post("/api/v1/websites/me/pages", json={"title": "Two"})
        assert r.status_code == 402 and "2 pages" in r.json()["detail"]["message"]
        assert o.post("/api/v1/marketing/qr-codes", json={"name": "a"}).status_code == 201
        assert o.post("/api/v1/marketing/qr-codes", json={"name": "b"}).status_code == 402
        assert o.post("/api/v1/ai/ask", json={"question": "how did my business perform?"}).status_code == 200
        r = o.post("/api/v1/ai/ask", json={"question": "again"})
        assert r.status_code == 402 and "AI questions" in r.json()["detail"]["message"]
    super_h = admin
    assert o.client.patch("/api/v1/admin/plans/FREE", headers=super_h, json={"limits": {"products": -1}}).status_code == 400
    assert o.client.patch("/api/v1/admin/plans/FREE", headers=super_h, json={"limits": {"bogus": 3}}).status_code == 400
    ok = o.client.patch("/api/v1/admin/plans/FREE", headers=super_h, json={"limits": {"products": 30, "services": 15, "gallery": 12, "pages": 3, "qr_codes": 3, "media": 100, "custom_domains": 0, "staff": 0, "ai_requests_month": 0}})
    assert ok.status_code == 200
    assert o.client.get("/api/v1/admin/plans", headers=super_h).json()["plans"][0]["limits"]["products"] == 30


def test_seed_upgrades_old_plans_without_touching_prices(db):
    from sqlalchemy import select
    from app.models import Plan
    from app.services.plans import PLAN_VERSION, seed_plans
    p = db.scalars(select(Plan).where(Plan.key == "GROW")).one()
    p.features, p.limits, p.version, p.prices = ["profile", "website"], {}, 1, {"KES": "1234", "USD": "9"}
    db.commit()
    seed_plans(db)
    db.refresh(p)
    assert p.version == PLAN_VERSION and "custom_domain" in p.features and p.limits["products"] == 500 and p.prices["KES"] == "1234"
    p.prices = {"KES": "1500", "USD": "12"}
    db.commit()


# ---------------------------------------------------------------- custom domains
def fake_dns(monkeypatch, txt=True, routing=True, tls=True):
    from app.services import domains
    monkeypatch.setattr(domains, "check_dns", lambda d, t: (txt, routing, None if txt else "We couldn't find the TXT record yet."))
    monkeypatch.setattr(domains, "check_tls", lambda d: (tls, None if tls else "no cert"))


def test_domain_validation_plan_gate_and_limits(make_owner):
    o = make_owner("d1@example.com", "D", "Dom Shop")
    for bad in ("localhost", "aqivo.shop", "shop.aqivo.shop", "123.45.67.89", "not a domain"):
        assert o.post("/api/v1/domains", json={"domain": bad}).status_code == 400, bad
    r = o.post("/api/v1/domains", json={"domain": "https://WWW.Mary-Shop.co.ke/path?x=1"})
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["domain"] == "www.mary-shop.co.ke" and d["verification_status"] == "PENDING"
    recs = {x["type"]: x for x in d["setup"]["records"]}
    assert recs["TXT"]["host"] == "_aqivo-verify.www.mary-shop.co.ke" and recs["TXT"]["value"] == d["verification_token"] and recs["CNAME"]["value"] == "domains.aqivo.shop"
    assert o.post("/api/v1/domains", json={"domain": "www.mary-shop.co.ke"}).status_code in (400, 402)  # duplicate / limit
    set_plan(o.id, "FREE")
    r = o.post("/api/v1/domains", json={"domain": "free.example.com"})
    assert r.status_code == 402 and r.json()["detail"]["feature"] == "custom_domain"
    lst = o.get("/api/v1/domains").json()
    assert lst["custom_domains"]["available"] is False and any(x["type"] == "CUSTOM" for x in lst["domains"])


def test_domain_verification_serving_primary_redirect_and_isolation(make_owner, client, monkeypatch):
    a, b = make_owner("d2@example.com", "A", "Alpha Shop"), make_owner("d3@example.com", "B", "Bravo Shop")
    p = product(a, "Maxi", "2000").json()
    a.post("/api/v1/websites/me/publish")
    d = a.post("/api/v1/domains", json={"domain": "www.alpha.example"}).json()
    fake_dns(monkeypatch, txt=False)
    v = a.post(f"/api/v1/domains/{d['id']}/verify").json()
    assert v["verification_status"] == "PENDING" and v["ssl_status"] == "NONE" and "TXT" in v["last_error"]
    assert client.get("/", headers={"host": "www.alpha.example"}).status_code in (404, 200) and "Alpha Shop" not in client.get("/", headers={"host": "www.alpha.example"}).text
    assert a.post(f"/api/v1/domains/{d['id']}/primary", json={"primary": True}).status_code == 400  # not verified yet
    fake_dns(monkeypatch, txt=True, routing=False)
    v = a.post(f"/api/v1/domains/{d['id']}/verify").json()
    assert v["verification_status"] == "VERIFIED" and v["dns_ok"] is False and "doesn't point" in v["last_error"]
    fake_dns(monkeypatch, txt=True, routing=True, tls=False)
    v = a.post(f"/api/v1/domains/{d['id']}/verify").json()
    assert v["dns_ok"] is True and v["ssl_status"] == "PENDING"
    fake_dns(monkeypatch)
    v = a.post(f"/api/v1/domains/{d['id']}/verify").json()
    assert v["status"] == "ACTIVE" and v["ssl_status"] == "ACTIVE" and v["last_error"] is None
    # the verified domain now serves the storefront
    home = client.get("/", headers={"host": "www.alpha.example"})
    assert home.status_code == 200 and "Alpha Shop" in home.text
    assert "Maxi" in client.get("/products", headers={"host": "www.alpha.example"}).text
    # other tenants can't touch it
    assert b.post(f"/api/v1/domains/{d['id']}/verify").status_code == 404 and b.delete(f"/api/v1/domains/{d['id']}").status_code == 404
    assert b.post(f"/api/v1/domains/{d['id']}/primary", json={"primary": True}).status_code == 404
    assert b.get("/api/v1/domains").json()["domains"][0]["type"] != "CUSTOM" or all(x["domain"] != "www.alpha.example" for x in b.get("/api/v1/domains").json()["domains"])
    # make it primary: the bizora address redirects, canonical URLs use it
    r = a.post(f"/api/v1/domains/{d['id']}/primary", json={"primary": True})
    assert r.status_code == 200 and r.json()["primary_domain"] == "www.alpha.example"
    moved = client.get(f"/{a.slug}/products/maxi", params={"source": "ig"}, follow_redirects=False)
    assert moved.status_code == 301 and moved.headers["location"] == "https://www.alpha.example/products/maxi?source=ig"
    assert client.get(f"/{a.slug}", follow_redirects=False).headers["location"] == "https://www.alpha.example/"
    live = client.get("/products/maxi", headers={"host": "www.alpha.example"}, follow_redirects=False)
    assert live.status_code == 200 and 'rel="canonical" href="https://www.alpha.example/products/maxi"' in live.text
    assert "https://www.alpha.example/products/maxi" in client.get("/sitemap.xml", headers={"host": "www.alpha.example"}).text
    assert a.get("/api/v1/businesses/me").json()["urls"]["profile"] == "https://www.alpha.example"
    # the other tenant's page is unaffected
    assert client.get(f"/{b.slug}", follow_redirects=False).status_code == 200
    # un-primary + remove
    a.post(f"/api/v1/domains/{d['id']}/primary", json={"primary": False})
    assert client.get(f"/{a.slug}", follow_redirects=False).status_code == 200
    assert a.delete(f"/api/v1/domains/{d['id']}").status_code == 204
    assert "Alpha Shop" not in client.get("/", headers={"host": "www.alpha.example"}).text


# ---------------------------------------------------------------- redirects, tracking, branding, SEO
def test_redirects(make_owner, client):
    a, b = make_owner("r1@example.com", "A", "Red Shop"), make_owner("r2@example.com", "B", "Blue Shop")
    product(a, "Maxi", "2000")
    a.post("/api/v1/websites/me/publish")
    r = a.post("/api/v1/seo/redirects", json={"from_path": "Old-Dress/", "to_path": "/products/maxi"})
    assert r.status_code == 201 and r.json()["from_path"] == "/old-dress"
    go = client.get(f"/{a.slug}/old-dress", follow_redirects=False)
    assert go.status_code == 301 and go.headers["location"] == f"/{a.slug}/products/maxi"
    assert a.get("/api/v1/seo/redirects").json()["items"][0]["hits"] == 1
    a.post("/api/v1/seo/redirects", json={"from_path": "/sale", "to_path": "https://example.com/offers", "permanent": False})
    tmp = client.get(f"/{a.slug}/sale", follow_redirects=False)
    assert tmp.status_code == 302 and tmp.headers["location"] == "https://example.com/offers"
    assert client.get(f"/{b.slug}/old-dress", follow_redirects=False).status_code not in (301, 302)  # redirects are per business
    for bad in ({"from_path": "/old-dress", "to_path": "/x"}, {"from_path": "/loop", "to_path": "/loop"}, {"from_path": "/checkout", "to_path": "/x"}, {"from_path": "/x1", "to_path": "javascript:alert(1)"},
                {"from_path": "/x2", "to_path": "//evil.example"}, {"from_path": "/", "to_path": "/x"}):
        assert a.post("/api/v1/seo/redirects", json=bad).status_code in (400, 422), bad
    assert a.post("/api/v1/seo/redirects", json={"from_path": "/products/maxi", "to_path": "/old-dress"}).status_code == 400  # would loop
    rid = a.get("/api/v1/seo/redirects").json()["items"][0]["id"]
    assert b.delete(f"/api/v1/seo/redirects/{rid}").status_code == 404 and b.get("/api/v1/seo/redirects").json()["items"] == []
    set_plan(b.id, "FREE")
    assert b.post("/api/v1/seo/redirects", json={"from_path": "/a", "to_path": "/b"}).status_code == 402
    assert a.delete(f"/api/v1/seo/redirects/{rid}").status_code == 204


def test_tracking_and_branding_are_published_validated_and_gated(make_owner, client):
    o = make_owner("t1@example.com", "T", "Track Shop")
    assert o.patch("/api/v1/seo/tracking", json={"ga4_id": "G-<script>"}).status_code == 400
    assert o.patch("/api/v1/seo/tracking", json={"meta_pixel_id": "abc"}).status_code == 400
    r = o.patch("/api/v1/seo/tracking", json={"ga4_id": "g-abc123xyz1", "meta_pixel_id": "123456789012", "hide_branding": True})
    assert r.status_code == 200 and r.json()["ga4_id"] == "G-ABC123XYZ1"
    o.post("/api/v1/websites/me/publish")
    live = client.get(f"/{o.slug}").text
    assert "googletagmanager.com/gtag/js?id=G-ABC123XYZ1" in live and 'fbq("init","123456789012")' in live and "Powered by" not in live
    assert "gtag/js" not in o.get("/api/v1/websites/me/preview").text  # never in the builder preview
    o.patch("/api/v1/seo/tracking", json={"ga4_id": "G-NEWID123456"})
    assert "G-NEWID123456" not in client.get(f"/{o.slug}").text  # draft until published
    set_plan(o.id, "FREE")  # lapsed plans stop tracking and bring the branding back, data untouched
    again = client.get(f"/{o.slug}").text
    assert "gtag/js" not in again and "Powered by" in again
    assert o.patch("/api/v1/seo/tracking", json={"ga4_id": "G-ABC123XYZ1"}).status_code == 402
    assert o.patch("/api/v1/seo/tracking", json={"hide_branding": True}).status_code == 402
    assert o.patch("/api/v1/seo/tracking", json={"ga4_id": "", "hide_branding": False}).status_code == 200  # clearing is always allowed


def test_social_image_faq_schema_and_google_links(make_owner, client):
    o = make_owner("s1@example.com", "S", "Seo Shop")
    assert o.patch("/api/v1/websites/me/seo", json={"og_image": "javascript:x"}).status_code == 400
    assert o.patch("/api/v1/websites/me/seo", json={"og_image": "/media/share.webp"}).status_code == 200
    o.post("/api/v1/websites/me/sections", json={"type": "faq", "settings": {"title": "FAQ", "items": [{"q": "Do you deliver?", "a": "Yes, in Nairobi."}]}})
    o.post("/api/v1/websites/me/sections", json={"type": "reviews", "settings": {"title": "Reviews"}})
    assert o.patch("/api/v1/integrations", json={"google_review_url": "https://evil.example/x"}).status_code == 400
    assert o.patch("/api/v1/integrations", json={"google_review_url": "http://g.page/r/abc/review"}).status_code == 400
    assert o.patch("/api/v1/integrations", json={"google_review_url": "https://g.page/r/abc123/review"}).status_code == 200
    o.post("/api/v1/websites/me/publish")
    t = client.get(f"/{o.slug}").text
    assert 'property="og:image"' in t and '/media/share.webp' in t and '"@type": "FAQPage"' in t and "Do you deliver?" in t
    assert "https://g.page/r/abc123/review" in client.get(f"/{o.slug}/review").text
    ints = {p["key"]: p for p in o.get("/api/v1/integrations").json()["providers"]}
    assert ints["google_business"]["status"] == "linked" and ints["whatsapp"]["status"] == "connected" and ints["instagram_link"]["status"] == "not_set"
    assert any("Publishing posts to Instagram" in n for n in o.get("/api/v1/integrations").json()["not_available"])
    set_plan(o.id, "FREE")
    assert o.patch("/api/v1/websites/me/seo", json={"og_image": "/media/other.webp"}).status_code == 402


def test_seo_audit_reports_real_problems(make_owner):
    o = make_owner("a1@example.com", "A", "Audit Shop")
    product(o, "Twin", "10"); product(o, "Twin", "20")
    a = o.get("/api/v1/seo/audit").json()
    areas = {(i["area"], i["severity"]) for i in a["issues"]}
    assert ("Storefront", "error") in areas and ("Products", "warn") in areas and a["score"] < 100
    msgs = " ".join(i["message"] for i in a["issues"])
    assert "no photo" in msgs and "used more than once" in msgs and "isn't published" in msgs
    o.post("/api/v1/websites/me/publish")
    b = o.get("/api/v1/seo/audit").json()
    assert not any(i["area"] == "Storefront" for i in b["issues"]) and any("published" in p for p in b["passed"]) and b["score"] > a["score"]


def test_receipts_and_roles_for_domains(make_owner, client):
    o = make_owner("rc@example.com", "R", "Receipt Shop")
    assert o.get("/api/v1/subscriptions/transactions/00000000-0000-0000-0000-000000000000/receipt").status_code == 404
    set_plan(o.id, "BUSINESS")
    r = o.post("/api/v1/businesses/me/members", json={"email": "ed@example.com", "full_name": "Ed", "role": "EDITOR", "password": "correct-horse-1"})
    assert r.status_code == 201
    h = {"Authorization": f"Bearer {client.post('/api/v1/auth/login', json={'email': 'ed@example.com', 'password': 'correct-horse-1'}).json()['access_token']}"}
    assert client.post("/api/v1/domains", headers=h, json={"domain": "ed.example.com"}).status_code == 403  # domains are an owner/admin matter
    assert client.get("/api/v1/seo/audit", headers=h).status_code == 200 and client.get("/api/v1/domains", headers=h).status_code == 200
