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
    assert f'<base href="/ecomm-templates/{key}/">' in html and "/ecomm-templates/_bridge.js" in html
    data = _bz(html)
    assert data["slug"] == o.slug and data["key"] == key
    assert [i["name"] for i in data["items"]] == ["Summer Dress"] and data["items"][0]["price"] == 2500
    assert "Zuri <Shop>" not in html.split("window.__BZ")[0]  # business name is HTML-escaped in the page
    assert client.get(f"/ecomm-templates/{key}/").status_code == 200
    assert client.get(f"/ecomm-templates/{key}/cart.html").status_code == 200
    assert client.get(f"/ecomm-templates/{key}/checkout.html").status_code == 200
    assert client.get(f"/ecomm-templates/{key}/product.html").status_code == 200
    assert client.get(f"/ecomm-templates/{key}/service.html").status_code == 200
    assert client.get(f"/ecomm-templates/_bridge.js").status_code == 200

    # Multi-page routing on merchant slug
    for sub in ["cart", "cart.html", "checkout", "checkout.html", "product.html", "service.html"]:
        resp = client.get(f"/{o.slug}/{sub}")
        assert resp.status_code == 200
        assert f'<base href="/ecomm-templates/{key}/">' in resp.text


def test_templates_list_only_ecomm(client):
    keys = {t["key"] for t in client.get("/api/v1/templates").json()}
    assert keys == set(KEYS)
    assert client.get(f"/api/v1/templates/{KEYS[0]}/preview", follow_redirects=False).status_code == 307
