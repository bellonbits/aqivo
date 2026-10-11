import json
import re

import pytest

from tests.conftest import add_service

KEYS = ["twosidesboutique", "mavunofresh", "brewandbites", "zuribeauty"]


def _bz(html: str) -> dict:
    m = re.search(r"window\.__BZ=(\{.*?\});</script>", html, re.S)
    assert m, "business data not injected"
    return json.loads(m.group(1))


@pytest.mark.parametrize("key", KEYS)
def test_ecomm_template_renders_real_business_data(make_owner, client, key):
    o = make_owner(f"{key}@example.com", "Owner", "Zuri <Shop>", industry="retail")
    add_service(o, "Summer Dress", "2500")
    assert o.post("/api/v1/websites/me/template", json={"template_key": key}).status_code == 200
    o.post("/api/v1/websites/me/publish")
    r = client.get(f"/{o.slug}")
    assert r.status_code == 200
    html = r.text
    assert f'<base href="/{o.slug}/">' in html and "/ecomm-templates/_bridge.js" in html
    assert 'class="site-storefront-footer"' in html
    assert 'Powered by <a href="https://aqivo.shop"' in html
    data = _bz(html)
    assert data["slug"] == o.slug and data["key"] == key
    assert [i["name"] for i in data["items"]] == ["Summer Dress"] and data["items"][0]["price"] == 2500
    assert "Zuri <Shop>" not in html.split("window.__BZ")[0]  # business name is HTML-escaped in the page
    assert client.get(f"/ecomm-templates/{key}/").status_code == 200
    assert client.get(f"/ecomm-templates/{key}/cart.html").status_code == 200
    assert client.get(f"/ecomm-templates/{key}/checkout.html").status_code == 200
    assert client.get(f"/ecomm-templates/{key}/product.html").status_code == 200
    assert client.get(f"/ecomm-templates/{key}/service.html").status_code == 200
    assert client.get(f"/ecomm-templates/{key}/receipt.html").status_code == 200
    assert client.get(f"/ecomm-templates/_bridge.js").status_code == 200

    # Multi-page routing on merchant slug
    for sub in ["cart", "cart.html", "checkout", "checkout.html", "product", "product.html", "service", "service.html", "receipt", "receipt.html"]:
        resp = client.get(f"/{o.slug}/{sub}")
        assert resp.status_code == 200
        assert f'<base href="/{o.slug}/">' in resp.text
        assert 'class="site-storefront-footer"' in resp.text
        if "checkout" in sub:
            assert "cart-btn-checkout" in resp.text
            assert "cart-btn-whatsapp" in resp.text


def test_templates_list_only_ecomm(client):
    keys = {t["key"] for t in client.get("/api/v1/templates").json()}
    assert keys == set(KEYS)
    assert client.get(f"/api/v1/templates/{KEYS[0]}/preview", follow_redirects=False).status_code == 307


def test_ecomm_pdp_cleans_demo_products_and_renders_real_items(make_owner, client):
    o = make_owner("kinyozi@example.com", "Barber", "Joes Kinyozi", industry="beauty")
    svc = add_service(o, "Classic Haircut & Beard Trim", "800")
    o.post("/api/v1/websites/me/template", json={"template_key": "mavunofresh"})
    o.post("/api/v1/websites/me/publish")

    # 1. PDP accessed via merchant path: /joeskinyozi/service.html?id=...
    r = client.get(f"/{o.slug}/service.html?id={svc['id']}")
    assert r.status_code == 200
    html = r.text
    assert "Classic Haircut" in html
    assert "800" in html
    # Assert demo agriculture strings are purged
    assert "Hass Avocados" not in html
    assert "Murang’a" not in html and "Murang'a" not in html
    assert "Kandara" not in html
    assert "compostable fruit bag" not in html
    assert "530 verified Nairobi households" not in html

    # 2. PDP preview accessed via template preview endpoint: /ecomm-templates/mavunofresh/service.html?id=...
    r2 = client.get(f"/ecomm-templates/mavunofresh/service.html?id={svc['id']}")
    assert r2.status_code == 200
    html2 = r2.text
    assert "Classic Haircut" in html2
    assert "Joes Kinyozi" in html2
    assert "Hass Avocados" not in html2
    assert "Murang’a" not in html2 and "Murang'a" not in html
    assert "Kandara" not in html2
    assert "compostable fruit bag" not in html2


def test_ecomm_template_receipt_redirects_to_merchant_url(make_owner, client):
    o = make_owner("joe@example.com", "Joe", "Joes Kinyozi", industry="beauty")
    add_service(o, "Knotless Braids", "1500")
    o.post("/api/v1/websites/me/template", json={"template_key": "mavunofresh"})
    o.post("/api/v1/websites/me/publish")

    # Access receipt on template URL with merchant auth/cookie -> redirects to /joeskinyozi/receipt.html
    token = o.token
    resp = client.get(
        "/ecomm-templates/mavunofresh/receipt.html?orderId=AQ-20261011-001",
        headers={"Authorization": f"Bearer {token}"},
        follow_redirects=False,
    )
    assert resp.status_code == 302
    assert resp.headers["location"] == f"/{o.slug}/receipt.html?orderId=AQ-20261011-001"

    # Following redirect lands on merchant receipt page with footer and base href
    final_resp = client.get(
        "/ecomm-templates/mavunofresh/receipt.html?orderId=AQ-20261011-001",
        headers={"Authorization": f"Bearer {token}"},
        follow_redirects=True,
    )
    assert final_resp.status_code == 200
    assert f'<base href="/{o.slug}/">' in final_resp.text
    assert 'class="site-storefront-footer"' in final_resp.text
    assert "Joes Kinyozi" in final_resp.text


def test_ecomm_meta_og_image_and_booking_fields(make_owner, client):
    o = make_owner("kinyozi@example.com", "Barber Joe", "Joes Barber", industry="beauty", category="Barbershop")
    # Add service with image
    o.post(
        "/api/v1/services",
        json={
            "name": "Fade & Beard Grooming",
            "price": "800",
            "duration_minutes": 60,
            "image_url": "https://images.unsplash.com/photo-barber.jpg",
        },
    )
    o.post("/api/v1/websites/me/template", json={"template_key": "zuribeauty"})
    o.post("/api/v1/websites/me/publish")

    # Fetch store page
    r = client.get(f"/{o.slug}/")
    assert r.status_code == 200
    html = r.text

    # Verify OpenGraph and Twitter card tags with absolute image URL for WhatsApp preview
    assert '<meta property="og:image" content="https://images.unsplash.com/photo-barber.jpg"' in html
    assert '<meta property="og:image:width" content="1200"' in html
    assert '<meta name="twitter:card" content="summary_large_image"' in html
    assert '<meta property="og:site_name" content="Joes Barber"' in html

    # Verify bridge.js contains booking date / time injections
    from pathlib import Path
    bridge_code = Path("/Users/mac/bazorafrica/backend/app/public/ecomm_templates/_bridge.js").read_text()
    assert "booking-date" in bridge_code
    assert "booking-time" in bridge_code
    assert "Appointment Schedule & Location" in bridge_code
    assert "House Call / Mobile Service" in bridge_code
    assert "Studio / Salon Visit" in bridge_code

    # Verify mobile-store.js contains formatWhatsAppOrderMessage with photo and receipt url
    for tpl in ["mavunofresh", "brewandbites", "zuribeauty", "twosidesboutique"]:
        ms_code = Path(f"/Users/mac/bazorafrica/backend/app/public/ecomm_templates/{tpl}/scripts/mobile-store.js").read_text()
        assert "formatWhatsAppOrderMessage" in ms_code
        assert "📸 Photo:" in ms_code
        assert "BOOKING & SERVICE RECEIPT" in ms_code


def test_store_ai_classification_and_blueprint():
    from app.services.store_ai import classify_business, STORE_GENERATOR_SYSTEM_PROMPT
    assert "STEP 1: CLASSIFY THE BUSINESS" in STORE_GENERATOR_SYSTEM_PROMPT
    assert "SERVICE/BOOKING business" in STORE_GENERATOR_SYSTEM_PROMPT
    assert "SHOP/PRODUCT business" in STORE_GENERATOR_SYSTEM_PROMPT

    # Barbershop / Salon must be SERVICE
    assert classify_business("Joe's Kinyozi", "Barbershop Kilimani", "beauty", "Barbershop") == "SERVICE"
    assert classify_business("Zuri Beauty Studio", "Nails & hair salon", "beauty", "Beauty Salon") == "SERVICE"
    assert classify_business("Nairobi Auto Garage", "Car repair and diagnostics", "auto", "Garage") == "SERVICE"

    # Grocery / Fashion must be PRODUCT
    assert classify_business("Mavuno Fresh", "Farm groceries and produce", "retail", "Grocery") == "PRODUCT"
    assert classify_business("Two Sides Boutique", "Women fashion and dresses", "retail", "Boutique") == "PRODUCT"



