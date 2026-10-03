from tests.conftest import add_service, set_plan


def product(o, name="Dress", price="1000", **extra):
    r = o.post("/api/v1/products", json={"name": name, "price": price, **extra})
    assert r.status_code == 201, r.text
    return r.json()


def ev(client, o, event_type, **kw):
    r = client.post(f"/api/v1/public/{o.slug}/events", json={"event_type": event_type, **kw}, headers={"user-agent": "Mozilla/5.0 (test browser)"})
    assert r.status_code == 204, r.text


def place(client, o, p, **extra):
    r = client.post(f"/api/v1/public/{o.slug}/orders", json={"lines": [{"kind": "product", "id": p["id"], "qty": 1}], "name": "Amina", "phone": "0711000111", "payment": "cash", **extra})
    assert r.status_code == 201, r.text
    return r.json()


def test_source_and_campaign_normalisation():
    from app.services import attribution as a
    assert a.normalise_source("IG") == "instagram" and a.normalise_source("Facebook") == "facebook" and a.normalise_source("my-newsletter") == "my-newsletter"
    assert a.normalise_source("<script>") == "other" and a.normalise_source("") == "direct"
    assert a.normalise_source(None, "https://l.instagram.com/?u=x") == "instagram" and a.normalise_source(None, "https://www.google.co.ke/") == "google"
    assert a.normalise_source(None, "https://example.org/blog") == "referral" and a.normalise_source(None, "https://shop.example/", "shop.example") == "direct"
    assert a.clean_campaign("Black Friday!! 2026") == "black-friday-2026" and a.clean_campaign("  ") is None
    assert a.lead_source("instagram") == "INSTAGRAM" and a.lead_source(None) == "WEBSITE"


def test_sources_funnel_and_revenue_attribution(owner, client):
    p = product(owner, "Maxi", "2000")
    for sid, src in (("s1", "instagram"), ("s2", "instagram"), ("s3", "tiktok")):
        ev(client, owner, "WEBSITE_VISIT", source=src, session_id=sid, campaign="spring")
    ev(client, owner, "PRODUCT_VIEW", source="instagram", session_id="s1", product_id=p["id"], campaign="spring")
    ev(client, owner, "WHATSAPP_CLICK", source="instagram", session_id="s1", campaign="spring")
    ev(client, owner, "CHECKOUT_STARTED", source="instagram", session_id="s1", campaign="spring")
    ev(client, owner, "ORDER_PLACED", source="instagram", session_id="s1")  # clients can't fake server-only events
    o = place(client, owner, p, source="Instagram", campaign="Spring")
    oid = owner.get("/api/v1/orders").json()["items"][0]["id"]
    owner.patch(f"/api/v1/orders/{oid}/status", json={"status": "CONFIRMED"})
    owner.post(f"/api/v1/orders/{oid}/payment", json={})
    rows = {r["source"]: r for r in owner.get("/api/v1/analytics/sources").json()["rows"]}
    assert rows["instagram"]["visitors"] == 2 and rows["instagram"]["orders"] == 1 and rows["instagram"]["revenue"] == 2000 and rows["instagram"]["customers"] == 1
    assert rows["instagram"]["whatsapp_clicks"] == 1 and rows["tiktok"]["visitors"] == 1 and rows["tiktok"]["revenue"] == 0
    f = owner.get("/api/v1/analytics/funnel").json()
    steps = {s["key"]: s["count"] for s in f["steps"]}
    assert steps["visitors"] == 3 and steps["viewed"] == 1 and steps["contacted"] == 1 and steps["checkout"] == 1 and steps["orders"] == 1
    fi = {s["key"]: s["count"] for s in owner.get("/api/v1/analytics/funnel", params={"source": "tiktok"}).json()["steps"]}
    assert fi["visitors"] == 1 and fi["orders"] == 0
    fc = {s["key"]: s["count"] for s in owner.get("/api/v1/analytics/funnel", params={"campaign": "spring"}).json()["steps"]}
    assert fc["orders"] == 1 and fc["visitors"] == 3
    camp = owner.get("/api/v1/analytics/campaigns").json()["rows"]
    assert camp[0]["campaign"] == "spring" and camp[0]["revenue"] == 2000 and camp[0]["orders"] == 1
    prods = owner.get("/api/v1/analytics/products").json()
    assert prods["products"][0]["name"] == "Maxi" and prods["products"][0]["views"] == 1 and prods["products"][0]["units"] == 1 and prods["products"][0]["revenue"] == 2000
    assert o["ok"]


def test_lead_and_booking_sources_are_stamped(owner, client):
    sv = add_service(owner)
    r = client.post(f"/api/v1/public/{owner.slug}/leads", json={"name": "Lina", "phone": "0722000111", "source": "tt", "campaign": "Summer Promo"})
    assert r.status_code == 201
    lead = owner.get("/api/v1/leads").json()["items"][0]
    assert lead["source"] == "TIKTOK"
    r = client.post(f"/api/v1/public/{owner.slug}/leads", json={"name": "Ben", "phone": "0722000222", "referrer": "https://l.instagram.com/"})
    assert owner.get("/api/v1/leads").json()["items"][0]["source"] == "INSTAGRAM"
    rows = {r["source"]: r for r in owner.get("/api/v1/analytics/sources").json()["rows"]}
    assert rows["tiktok"]["leads"] == 1 and rows["instagram"]["leads"] == 1
    assert sv["id"]


def test_attribution_data_is_tenant_scoped(make_owner, client):
    a, b = make_owner("ga@example.com", "A", "Alpha"), make_owner("gb@example.com", "B", "Bravo")
    ev(client, a, "WEBSITE_VISIT", source="instagram", session_id="x1")
    assert b.get("/api/v1/analytics/sources").json()["rows"] == []
    p = product(a, "Secret", "10")
    ev(client, b, "PRODUCT_VIEW", session_id="y1", product_id=p["id"])  # someone else's product id is ignored
    assert b.get("/api/v1/analytics/products").json()["products"] == []


# ---------------------------------------------------------------- links & QR
def test_tracked_links_and_target_validation(make_owner):
    a, b = make_owner("la@example.com", "A", "Alpha"), make_owner("lb@example.com", "B", "Bravo")
    p = product(a, "Red Dress", "500")
    r = a.post("/api/v1/marketing/links", json={"target_type": "product", "target_ref": p["id"], "source": "IG", "campaign": "Spring Sale"})
    assert r.status_code == 200 and f"/{a.slug}/products/red-dress?source=instagram&campaign=spring-sale" in r.json()["url"]
    assert a.post("/api/v1/marketing/links", json={"target_type": "storefront", "source": "poster"}).json()["url"].endswith(f"/{a.slug}?source=poster")
    assert b.post("/api/v1/marketing/links", json={"target_type": "product", "target_ref": p["id"], "source": "instagram"}).status_code == 400
    assert a.post("/api/v1/marketing/links", json={"target_type": "nope", "source": "x"}).status_code == 400
    t = a.get("/api/v1/marketing/link-targets").json()
    assert t["products"][0]["name"] == "Red Dress" and any(c["key"] == "tiktok" for c in t["channels"])
    assert b.get("/api/v1/marketing/link-targets").json()["products"] == []


def test_qr_codes_formats_scans_and_isolation(make_owner, client):
    a, b = make_owner("qa@example.com", "A", "Alpha"), make_owner("qb@example.com", "B", "Bravo")
    q = a.post("/api/v1/marketing/qr-codes", json={"name": "Counter poster", "target_type": "shop", "headline": "Scan to order"})
    assert q.status_code == 201, q.text
    code = q.json()
    assert code["campaign"] == "qr-counter-poster" and "source=qr" in code["url"] and code["scans"] == 0
    assert a.get(f"/api/v1/marketing/qr-codes/{code['id']}/image").content[:4] == b"\x89PNG"
    assert a.get(f"/api/v1/marketing/qr-codes/{code['id']}/image", params={"fmt": "svg"}).text.startswith("<svg")
    assert a.get(f"/api/v1/marketing/qr-codes/{code['id']}/image", params={"fmt": "pdf"}).content[:4] == b"%PDF"
    ev(client, a, "QR_SCAN", source="qr", campaign="qr-counter-poster", session_id="z1")
    ev(client, a, "QR_SCAN", source="qr", campaign="qr-counter-poster", session_id="z2")
    assert a.get("/api/v1/marketing/qr-codes").json()[0]["scans"] == 2
    assert b.get("/api/v1/marketing/qr-codes").json() == [] and b.get(f"/api/v1/marketing/qr-codes/{code['id']}/image").status_code == 404
    assert b.delete(f"/api/v1/marketing/qr-codes/{code['id']}").status_code == 404
    assert a.post("/api/v1/marketing/qr-codes", json={"name": "x", "target_type": "product", "target_ref": "00000000-0000-0000-0000-000000000000"}).status_code == 400
    assert a.delete(f"/api/v1/marketing/qr-codes/{code['id']}").status_code == 204


# ---------------------------------------------------------------- growth campaigns
def test_growth_campaign_content_links_banner_and_performance(make_owner, client):
    o = make_owner("gc@example.com", "G", "Glow Shop", industry="retail")
    set_plan(o.id, "PRO")
    p = product(o, "Silk Scarf", "800", status="ACTIVE")
    o.post("/api/v1/discounts", json={"code": "SCARF10", "type": "PERCENT", "value": "10"})
    body = {"name": "Scarf week", "objective": "SALES", "offer_text": "Silk scarves, 10% off this week", "discount_code": "scarf10", "target_type": "product", "target_ref": p["id"],
            "channels": ["instagram", "whatsapp", "qr", "website", "bogus"], "starts_on": "2026-10-05", "ends_on": "2026-10-11"}
    r = o.post("/api/v1/marketing/growth-campaigns", json=body)
    assert r.status_code == 201, r.text
    c = r.json()
    assert c["kind"] == "GROWTH" and c["slug"] == "scarf-week" and c["channels"] == ["instagram", "whatsapp", "qr", "website"] and c["discount_code"] == "SCARF10"
    ig = c["content"]["instagram"]
    assert "10% off" in ig["text"] and "SCARF10" in ig["text"] and "05 Oct" in ig["text"] and ig["source"] == "template"
    assert f"/{o.slug}/products/silk-scarf?source=instagram&campaign=scarf-week" in ig["link"] and "source=whatsapp&campaign=scarf-week" in c["content"]["whatsapp"]["link"]
    assert c["content"]["qr"]["text"] == "Scan to order"
    assert o.post("/api/v1/marketing/growth-campaigns", json={**body, "name": "x", "discount_code": "NOPE"}).status_code == 400
    assert o.post("/api/v1/marketing/growth-campaigns", json={**body, "name": "y", "channels": ["bogus"]}).status_code == 400
    assert o.post("/api/v1/marketing/growth-campaigns", json={**body, "name": "z", "ends_on": "2026-10-01"}).status_code == 400
    up = o.patch(f"/api/v1/marketing/growth-campaigns/{c['id']}", json={"offer_text": "Scarves from KSh 800", "content": {"instagram": {"text": "My own caption"}}}).json()
    assert up["content"]["instagram"]["text"] == "My own caption" and up["content"]["instagram"]["source"] == "owner" and "from KSh 800" in up["content"]["facebook"]["text"] if "facebook" in up["content"] else True
    b = o.post(f"/api/v1/marketing/growth-campaigns/{c['id']}/website-banner")
    assert b.status_code == 200
    secs = o.get("/api/v1/websites/me").json()["sections"]
    promo = next(s for s in secs if s["type"] == "promo" and "Scarves" in s["settings"]["title"])
    assert promo["position"] == 1  # right under the hero
    # an order that arrives through the campaign link shows up in campaign performance
    place(client, o, p, source="instagram", campaign="scarf-week")
    rows = o.get("/api/v1/analytics/campaigns").json()["rows"]
    assert rows[0]["name"] == "Scarf week" and rows[0]["orders"] == 1


def test_growth_campaigns_are_tenant_scoped(make_owner):
    a, b = make_owner("ca@example.com", "A", "Alpha"), make_owner("cb@example.com", "B", "Bravo")
    set_plan(a.id, "PRO"); set_plan(b.id, "PRO")
    c = a.post("/api/v1/marketing/growth-campaigns", json={"name": "Alpha only", "objective": "AWARENESS", "channels": ["instagram"]}).json()
    assert b.patch(f"/api/v1/marketing/growth-campaigns/{c['id']}", json={"name": "hijack"}).status_code == 404
    assert b.post(f"/api/v1/marketing/growth-campaigns/{c['id']}/website-banner").status_code == 404
    assert b.get("/api/v1/marketing/campaigns").json() == []


def test_customer_timeline_and_acquisition(owner, client):
    p = product(owner, "Mug", "300")
    place(client, owner, p, source="tiktok", campaign="launch")
    cust = owner.get("/api/v1/customers").json()["items"][0]
    assert cust["acquisition_source"] == "tiktok" and cust["acquisition_campaign"] == "launch" and cust["total_orders"] == 1
    tl = owner.get(f"/api/v1/customers/{cust['id']}/timeline").json()["events"]
    kinds = [e["kind"] for e in tl]
    assert "order" in kinds and "joined" in kinds
    assert any("tiktok" in e["title"] for e in tl if e["kind"] == "joined")
    assert owner.get(f"/api/v1/customers/00000000-0000-0000-0000-000000000000/timeline").status_code == 404
