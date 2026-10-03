from tests.conftest import add_service


def product(o, name="Kitenge Dress", price="2500", **extra):
    r = o.post("/api/v1/products", json={"name": name, "price": price, **extra})
    assert r.status_code == 201, r.text
    return r.json()


def pub(client, o, path, **kw):
    return client.post(f"/api/v1/public/{o.slug}{path}", **kw)


def order(client, o, lines, **extra):
    body = {"lines": lines, "name": "Amina", "phone": "0711000111", "payment": "cash", "delivery_method": "PICKUP", **extra}
    return pub(client, o, "/orders", json=body)


def line(p, qty=1, variant=None, kind="product"):
    return {"kind": kind, "id": p["id"], "variant_id": variant, "qty": qty}


def test_quote_ignores_client_prices_and_checks_stock(owner, client):
    p = product(owner, price="1000", track_stock=True, stock_qty=3)
    q = pub(client, owner, "/cart/quote", json={"lines": [line(p, 2)]}).json()
    assert q["subtotal"] == 2000 and q["total"] == 2000
    assert pub(client, owner, "/cart/quote", json={"lines": [line(p, 4)]}).status_code == 400  # only 3 in stock
    assert pub(client, owner, "/cart/quote", json={"lines": [{"kind": "product", "id": p["id"], "qty": 0}]}).status_code == 422
    assert pub(client, owner, "/cart/quote", json={"lines": [{"kind": "product", "id": "00000000-0000-0000-0000-000000000000", "qty": 1}]}).status_code == 400


def test_order_flow_stock_customer_and_numbers(owner, client):
    p = product(owner, price="1000", track_stock=True, stock_qty=5)
    r = order(client, owner, [line(p, 2)])
    assert r.status_code == 201, r.text
    o1 = r.json()
    assert o1["number"] == 1001 and o1["total"] == 2000
    assert order(client, owner, [line(p, 1)]).json()["number"] == 1002
    assert owner.get(f"/api/v1/products/{p['id']}").json()["stock_qty"] == 2  # 5 - 2 - 1
    assert order(client, owner, [line(p, 3)]).status_code == 400  # would oversell
    mv = owner.get("/api/v1/inventory/movements", params={"product_id": p["id"]}).json()["items"]
    assert [m["reason"] for m in mv] == ["SALE", "SALE", "INITIAL"] and mv[0]["qty_after"] == 2
    assert owner.get("/api/v1/customers").json()["total"] == 1  # same phone => one customer
    got = client.get(f"/api/v1/public/{owner.slug}/orders/{o1['token']}").json()
    assert got["status"] == "PENDING" and got["items"][0]["qty"] == 2
    assert client.get(f"/api/v1/public/{owner.slug}/orders/not-a-token").status_code == 404


def test_order_lifecycle_cancel_restocks_and_cash_paid_on_completion(owner, client):
    p = product(owner, price="500", track_stock=True, stock_qty=4)
    o = order(client, owner, [line(p, 2)]).json()
    oid = owner.get("/api/v1/orders").json()["items"][0]["id"]
    assert owner.patch(f"/api/v1/orders/{oid}/status", json={"status": "COMPLETED"}).status_code == 400  # must be confirmed first
    for s in ("CONFIRMED", "PREPARING", "READY", "COMPLETED"):
        r = owner.patch(f"/api/v1/orders/{oid}/status", json={"status": s})
        assert r.status_code == 200, r.text
    done = r.json()
    assert done["payment_status"] == "PAID" and [e["kind"] for e in done["events"]].count("STATUS") == 4  # cash collected at handover
    assert owner.get("/api/v1/payments").json()  # a Payment row exists
    # a second order is cancelled and stock returns
    order(client, owner, [line(p, 2)])
    oid2 = owner.get("/api/v1/orders", params={"status": "PENDING"}).json()["items"][0]["id"]
    assert owner.get(f"/api/v1/products/{p['id']}").json()["stock_qty"] == 0
    assert owner.patch(f"/api/v1/orders/{oid2}/status", json={"status": "CANCELLED"}).status_code == 200
    assert owner.get(f"/api/v1/products/{p['id']}").json()["stock_qty"] == 2
    assert owner.patch(f"/api/v1/orders/{oid2}/status", json={"status": "CONFIRMED"}).status_code == 400  # closed
    # refund the completed one with restock
    r = owner.post(f"/api/v1/orders/{oid}/refund", json={"restock": True}).json()
    assert r["status"] == "REFUNDED" and r["payment_status"] == "REFUNDED"
    assert owner.get(f"/api/v1/products/{p['id']}").json()["stock_qty"] == 4
    assert o["ok"]


def test_variants_have_their_own_stock_and_price(owner, client):
    p = product(owner, "Tee", "1000", track_stock=True)
    vs = owner.put(f"/api/v1/products/{p['id']}/options", json={"options": [{"name": "Size", "values": ["S", "M"]}, {"name": "Colour", "values": ["Black"]}]}).json()
    assert [v["title"] for v in vs] == ["S / Black", "M / Black"]
    s, m = vs
    assert owner.patch(f"/api/v1/products/{p['id']}/variants/{s['id']}", json={"stock_qty": 5}).status_code == 200
    owner.patch(f"/api/v1/products/{p['id']}/variants/{m['id']}", json={"stock_qty": 1, "price": "1200"})
    assert pub(client, owner, "/cart/quote", json={"lines": [line(p)]}).status_code == 400  # must choose a variant
    q = pub(client, owner, "/cart/quote", json={"lines": [line(p, 1, m["id"])]}).json()
    assert q["total"] == 1200
    assert order(client, owner, [line(p, 2, m["id"])]).status_code == 400
    assert order(client, owner, [line(p, 1, m["id"])]).status_code == 201
    inv = owner.get("/api/v1/inventory").json()
    assert {(r["variant"], r["stock"]) for r in inv["items"]} == {("S / Black", 5), ("M / Black", 0)} and inv["counts"]["out"] == 1
    owner.post("/api/v1/inventory/adjust", json={"product_id": p["id"], "variant_id": m["id"], "delta": 10, "reason": "RESTOCK", "note": "delivery"})
    assert owner.get("/api/v1/inventory", params={"view": "out"}).json()["total"] == 0
    # editing options keeps existing stock; removed combos are hidden
    vs2 = owner.put(f"/api/v1/products/{p['id']}/options", json={"options": [{"name": "Size", "values": ["S"]}, {"name": "Colour", "values": ["Black"]}]}).json()
    assert [v["title"] for v in vs2] == ["S / Black"] and vs2[0]["stock_qty"] == 5


def test_discounts_percent_fixed_free_delivery_limits(owner, client):
    p = product(owner, price="1000")
    owner.patch("/api/v1/store/settings", json={"settings": {"delivery": {"flat_fee": 200, "zones": []}}})
    assert owner.post("/api/v1/discounts", json={"code": "ten", "type": "PERCENT", "value": "10", "usage_limit": 1}).status_code == 201
    assert owner.post("/api/v1/discounts", json={"code": "TEN", "type": "PERCENT", "value": "10"}).status_code == 400  # duplicate
    assert owner.post("/api/v1/discounts", json={"code": "BAD", "type": "PERCENT", "value": "150"}).status_code == 400
    q = pub(client, owner, "/cart/quote", json={"lines": [line(p, 2)], "code": "ten"}).json()
    assert q["discount"] == 200 and q["total"] == 1800
    assert pub(client, owner, "/cart/quote", json={"lines": [line(p)], "code": "nope"}).status_code == 400
    assert order(client, owner, [line(p, 2)], code="TEN").status_code == 201
    assert pub(client, owner, "/cart/quote", json={"lines": [line(p)], "code": "TEN"}).status_code == 400  # fully used
    owner.post("/api/v1/discounts", json={"code": "FREESHIP", "type": "FREE_DELIVERY"})
    q = pub(client, owner, "/cart/quote", json={"lines": [line(p)], "delivery_method": "DELIVERY", "code": "FREESHIP"}).json()
    assert q["delivery_fee"] == 0 and q["total"] == 1000
    assert pub(client, owner, "/cart/quote", json={"lines": [line(p)], "delivery_method": "DELIVERY"}).json()["total"] == 1200
    owner.post("/api/v1/discounts", json={"code": "BIG", "type": "FIXED", "value": "50", "min_order": "5000"})
    assert pub(client, owner, "/cart/quote", json={"lines": [line(p)], "code": "BIG"}).status_code == 400  # below minimum


def test_delivery_zones_free_threshold_tax_and_payment_options(owner, client):
    p = product(owner, price="3000")
    r = owner.patch("/api/v1/store/settings", json={"settings": {"delivery": {"flat_fee": 0, "free_over": 5000, "zones": [{"name": "CBD", "fee": 150}, {"name": "Far", "fee": 600}]},
                                                                 "tax_rate": 16, "tax_inclusive": False, "payments": {"cash": True, "mpesa": True, "bank": False, "whatsapp": False},
                                                                 "mpesa_number": "123456", "mpesa_kind": "TILL"}})
    assert r.status_code == 200, r.text
    cfg = client.get(f"/api/v1/public/{owner.slug}/checkout-config").json()
    assert [m["key"] for m in cfg["payments"]] == ["cash", "mpesa"] and "123456" in cfg["payments"][1]["instructions"]
    assert pub(client, owner, "/cart/quote", json={"lines": [line(p)], "delivery_method": "DELIVERY"}).status_code == 400  # needs an area
    q = pub(client, owner, "/cart/quote", json={"lines": [line(p)], "delivery_method": "DELIVERY", "zone": "Far"}).json()
    assert q["delivery_fee"] == 600 and q["tax"] == 480 and q["total"] == 3000 + 480 + 600
    q = pub(client, owner, "/cart/quote", json={"lines": [line(p, 2)], "delivery_method": "DELIVERY", "zone": "Far"}).json()
    assert q["delivery_fee"] == 0  # over the free-delivery threshold
    assert order(client, owner, [line(p)], payment="bank").status_code == 400  # turned off
    r = order(client, owner, [line(p)], payment="mpesa", delivery_method="DELIVERY", zone="CBD", address="Moi Ave, Kenya House")
    assert r.status_code == 201
    tok = r.json()["token"]
    assert client.post(f"/api/v1/public/{owner.slug}/orders/{tok}/payment-reference", json={"reference": "x"}).status_code == 400
    assert client.post(f"/api/v1/public/{owner.slug}/orders/{tok}/payment-reference", json={"reference": "shk4x2y9za"}).status_code == 200
    oid = owner.get("/api/v1/orders").json()["items"][0]
    assert oid["payment_status"] == "PENDING" and oid["payment_reference"] == "SHK4X2Y9ZA"
    paid = owner.post(f"/api/v1/orders/{oid['id']}/payment", json={"reference": "SHK4X2Y9ZA"}).json()
    assert paid["payment_status"] == "PAID"
    assert owner.patch("/api/v1/store/settings", json={"settings": {"payments": {"cash": False, "mpesa": False, "bank": False, "whatsapp": False}}}).status_code == 400
    assert owner.patch("/api/v1/store/settings", json={"settings": {"tax_rate": 99}}).status_code == 400


def test_orders_are_tenant_scoped(make_owner, client):
    a, b = make_owner("oa@example.com", "A", "Alpha"), make_owner("ob@example.com", "B", "Bravo")
    p = product(a, price="100")
    order(client, a, [line(p)])
    oid = a.get("/api/v1/orders").json()["items"][0]["id"]
    assert b.get("/api/v1/orders").json()["total"] == 0
    assert b.get(f"/api/v1/orders/{oid}").status_code == 404
    assert b.patch(f"/api/v1/orders/{oid}/status", json={"status": "CONFIRMED"}).status_code == 404
    assert b.post(f"/api/v1/orders/{oid}/payment", json={}).status_code == 404
    assert pub(client, b, "/cart/quote", json={"lines": [line(p)]}).status_code == 400  # someone else's product
    tok = client.get("/api/v1/public/%s/orders/x" % a.slug)
    assert tok.status_code == 404
    d = a.post("/api/v1/discounts", json={"code": "ALPHA", "type": "PERCENT", "value": "5"}).json()
    assert b.get("/api/v1/discounts").json() == [] and b.patch(f"/api/v1/discounts/{d['id']}", json={"is_active": False}).status_code == 404
    assert b.get("/api/v1/store/settings").json()["settings"]["payments"]["cash"] is True


def test_roles_and_permissions(make_owner, client):
    o = make_owner("rp@example.com", "R", "Role Shop")
    p = product(o, price="100")
    order(client, o, [line(p)])
    from app.core.permissions import role_has
    from tests.conftest import set_plan
    set_plan(o.id, "BUSINESS")
    assert role_has("SALES", "orders:write") and not role_has("SALES", "products:write")
    assert role_has("EDITOR", "website:write") and not role_has("EDITOR", "orders:read")
    assert role_has("STAFF", "orders:read") and not role_has("STAFF", "orders:write")
    assert role_has("BUSINESS_ADMIN", "members:manage") and not role_has("BUSINESS_ADMIN", "subscription:manage")
    r = o.post("/api/v1/businesses/me/members", json={"email": "sales@example.com", "full_name": "Sam Sales", "role": "SALES", "password": "correct-horse-1"})
    assert r.status_code == 201, r.text
    login = client.post("/api/v1/auth/login", json={"email": "sales@example.com", "password": "correct-horse-1"}).json()
    h = {"Authorization": f"Bearer {login['access_token']}"}
    assert client.get("/api/v1/orders", headers=h).status_code == 200
    oid = client.get("/api/v1/orders", headers=h).json()["items"][0]["id"]
    assert client.patch(f"/api/v1/orders/{oid}/status", headers=h, json={"status": "CONFIRMED"}).status_code == 200
    assert client.post("/api/v1/products", headers=h, json={"name": "x", "price": "1"}).status_code == 403
    assert client.patch("/api/v1/store/settings", headers=h, json={"settings": {"tax_rate": 1}}).status_code == 403


def test_manual_order_by_owner(owner):
    p = product(owner, price="750", track_stock=True, stock_qty=3)
    r = owner.post("/api/v1/orders", json={"lines": [line(p, 2)], "name": "Walk-in", "phone": "0722333444", "payment": "cash", "channel": "WHATSAPP"})
    assert r.status_code == 201, r.text
    assert r.json()["channel"] == "WHATSAPP" and r.json()["total"] == "1500.00" or float(r.json()["total"]) == 1500
    assert owner.get(f"/api/v1/products/{p['id']}").json()["stock_qty"] == 1


# ---------------------------------------------------------------- pages & navigation
def sections_of(o, page_id):
    return [s for s in o.get("/api/v1/websites/me").json()["sections"] if s["page_id"] == page_id]


def test_pages_navigation_and_publish_snapshots(owner, client):
    site = owner.get("/api/v1/websites/me").json()
    home = next(p for p in site["pages"] if p["is_home"])
    assert all(s["page_id"] == home["id"] for s in site["sections"])
    r = owner.post("/api/v1/websites/me/pages", json={"title": "About us", "template": "about"})
    assert r.status_code == 201, r.text
    pg = next(p for p in r.json()["pages"] if p["id"] == r.json()["added_id"])
    assert pg["slug"] == "about-us" and len(sections_of(owner, pg["id"])) == 4
    assert owner.post("/api/v1/websites/me/pages", json={"title": "Products"}).json()["pages"][-1]["slug"] == "products-page"  # reserved word avoided
    assert client.get(f"/{owner.slug}/p/about-us").status_code == 404  # not published yet
    sid = sections_of(owner, pg["id"])[0]["id"]
    owner.patch(f"/api/v1/websites/me/sections/{sid}", json={"settings": {"body": "Our little story"}})
    owner.post("/api/v1/websites/me/publish")
    html = client.get(f"/{owner.slug}/p/about-us").text
    assert "Our little story" in html and 'href="/' + owner.slug + '/p/about-us"' in html  # appears in the default menu
    # edits after publishing stay draft; a page added later is not live
    owner.patch(f"/api/v1/websites/me/sections/{sid}", json={"settings": {"body": "CHANGED"}})
    owner.post("/api/v1/websites/me/pages", json={"title": "Later"})
    assert "CHANGED" not in client.get(f"/{owner.slug}/p/about-us").text and client.get(f"/{owner.slug}/p/later").status_code == 404
    # custom menu
    nav = [{"label": "Our story", "type": "page", "ref": pg["id"]}, {"label": "Shop", "type": "products", "children": [{"label": "Dresses", "type": "url", "url": "https://example.com"}]}]
    assert owner.put("/api/v1/websites/me/navigation", json={"items": nav}).status_code == 200
    assert owner.put("/api/v1/websites/me/navigation", json={"items": [{"label": "x", "type": "page", "ref": "00000000-0000-0000-0000-000000000000"}]}).status_code == 400
    assert owner.put("/api/v1/websites/me/navigation", json={"items": [{"label": "x", "type": "url", "url": "javascript:alert(1)"}]}).status_code == 400
    assert "Our story" not in client.get(f"/{owner.slug}").text  # menu is draft until published
    owner.post("/api/v1/websites/me/publish")
    live = client.get(f"/{owner.slug}").text
    assert "Our story" in live and 'href="/' + owner.slug + '/p/about-us"' in live
    # hiding and deleting
    assert owner.patch(f"/api/v1/websites/me/pages/{home['id']}", json={"enabled": False}).status_code == 400
    assert owner.delete(f"/api/v1/websites/me/pages/{home['id']}").status_code == 400
    after = owner.delete(f"/api/v1/websites/me/pages/{pg['id']}").json()
    assert all(p["id"] != pg["id"] for p in after["pages"]) and all(n["ref"] != pg["id"] for n in after["navigation"])


def test_pages_are_tenant_scoped(make_owner):
    a, b = make_owner("pa@example.com", "A", "Alpha"), make_owner("pb@example.com", "B", "Bravo")
    pid = a.post("/api/v1/websites/me/pages", json={"title": "Secret"}).json()["added_id"]
    assert b.patch(f"/api/v1/websites/me/pages/{pid}", json={"title": "x"}).status_code == 404
    assert b.delete(f"/api/v1/websites/me/pages/{pid}").status_code == 404
    assert b.post("/api/v1/websites/me/sections", json={"type": "text", "page_id": pid}).status_code == 404
    assert b.put("/api/v1/websites/me/navigation", json={"items": [{"label": "S", "type": "page", "ref": pid}]}).status_code == 400


# ---------------------------------------------------------------- public pages
def test_public_catalogue_pages_and_seo(owner, client):
    c = owner.post("/api/v1/categories", json={"name": "Dresses"}).json()
    p = product(owner, "Maxi Dress", "3000", compare_at_price="4000", short_description="Flowy", category_id=c["id"], images=["/media/x.webp"], sku="MX1", featured=True)
    product(owner, "Hidden", "10", status="DRAFT")
    r = client.get(f"/{owner.slug}/products/{p['slug']}")
    assert r.status_code == 200
    t = r.text
    assert "Maxi Dress" in t and '"@type": "Product"' in t and "InStock" in t and "BreadcrumbList" in t and 'rel="canonical"' in t and "Flowy" in t
    assert client.get(f"/{owner.slug}/products/hidden").status_code == 404
    lst = client.get(f"/{owner.slug}/products").text
    assert "Maxi Dress" in lst and "Hidden" not in lst and f"/{owner.slug}/products/{p['slug']}" in lst
    assert "Maxi Dress" in client.get(f"/{owner.slug}/categories/dresses").text and client.get(f"/{owner.slug}/categories/nope").status_code == 404
    s = client.get(f"/{owner.slug}/search", params={"q": "maxi"}).text
    assert "Maxi Dress" in s and "noindex" in s
    assert "Nothing matched" in client.get(f"/{owner.slug}/search", params={"q": "zzzz"}).text
    api = client.get(f"/api/v1/public/{owner.slug}/search", params={"q": "max"}).json()
    assert api["results"][0]["url"] == f"/products/{p['slug']}"
    sm = client.get(f"/{owner.slug}/sitemap.xml").text
    assert f"/products/{p['slug']}" in sm and "/categories/dresses" in sm and "hidden" not in sm


def test_service_pages_checkout_and_order_pages(owner, client):
    sv = add_service(owner, "Silk Press", "1800")
    assert sv["slug"] == "silk-press"
    assert "Silk Press" in client.get(f"/{owner.slug}/services/silk-press").text and '"@type": "Service"' in client.get(f"/{owner.slug}/services/silk-press").text
    assert "Silk Press" in client.get(f"/{owner.slug}/services").text
    ck = client.get(f"/{owner.slug}/checkout")
    assert ck.status_code == 200 and 'id="chk-config"' in ck.text and "noindex" in ck.text
    r = order(client, owner, [{"kind": "service", "id": sv["id"], "qty": 1}])
    assert r.status_code == 201, r.text
    page = client.get(f"/{owner.slug}/order/{r.json()['token']}")
    assert page.status_code == 200 and "Silk Press" in page.text and "Order #1001" in page.text
    assert client.get(f"/{owner.slug}/order/wrong").status_code == 404
    assert client.get(f"/{owner.slug}/cart").status_code == 200


def test_variant_product_page_and_card_links(owner, client):
    p = product(owner, "Tee", "1000", track_stock=True)
    owner.put(f"/api/v1/products/{p['id']}/options", json={"options": [{"name": "Size", "values": ["S", "M"]}]})
    t = client.get(f"/{owner.slug}/products/tee").text
    assert 'data-opt="Size"' in t and 'id="pdp-data"' in t
    owner.post("/api/v1/websites/me/sections", json={"type": "product_grid", "settings": {"title": "Shelf"}})
    owner.post("/api/v1/websites/me/publish")
    home = client.get(f"/{owner.slug}").text
    assert "Choose options" in home and f"/{owner.slug}/products/tee" in home  # variant products send you to the product page


def test_product_review_needs_completed_order(owner, client):
    p = product(owner, "Mug", "300")
    tok = order(client, owner, [line(p)]).json()["token"]
    body = {"rating": 5, "name": "Amina", "comment": "Lovely", "product_id": p["id"], "token": tok}
    assert client.post(f"/api/v1/public/{owner.slug}/reviews", json=body).status_code == 400  # order not completed
    oid = owner.get("/api/v1/orders").json()["items"][0]["id"]
    for s in ("CONFIRMED", "COMPLETED"):
        owner.patch(f"/api/v1/orders/{oid}/status", json={"status": s})
    assert client.post(f"/api/v1/public/{owner.slug}/reviews", json=body).status_code == 201
    assert client.post(f"/api/v1/public/{owner.slug}/reviews", json=body).status_code == 400  # once per product
    t = client.get(f"/{owner.slug}/products/mug").text
    assert "Lovely" in t and "Verified purchase" in t
    assert client.post(f"/api/v1/public/{owner.slug}/reviews", json={**body, "token": "x" * 10}).status_code == 400


def test_unpublished_section_is_not_leaked_after_first_publish(owner, client):
    owner.post("/api/v1/websites/me/publish")
    owner.post("/api/v1/websites/me/sections", json={"type": "text", "settings": {"title": "SECRET NEW SECTION"}})
    assert "SECRET NEW SECTION" not in client.get(f"/{owner.slug}").text
    owner.post("/api/v1/websites/me/publish")
    assert "SECRET NEW SECTION" in client.get(f"/{owner.slug}").text
