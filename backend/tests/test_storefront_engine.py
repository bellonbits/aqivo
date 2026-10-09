from tests.conftest import add_service


def sections(o):
    return o.get("/api/v1/websites/me").json()["sections"]


def add(o, stype, **settings):
    r = o.post("/api/v1/websites/me/sections", json={"type": stype, "settings": settings})
    assert r.status_code == 201, r.text
    return r.json()["added_id"]


def product(o, name="Kitenge Dress", price="2500", **extra):
    r = o.post("/api/v1/products", json={"name": name, "price": price, **extra})
    assert r.status_code == 201, r.text
    return r.json()


def test_registry_lists_section_types_and_fields(owner):
    reg = owner.get("/api/v1/websites/me/registry").json()
    types = {t["type"]: t for t in reg["types"]}
    assert {"hero", "product_grid", "service_grid", "faq", "video", "rich_text", "custom_html", "spacer"} <= set(types)
    assert types["product_grid"]["group"] == "Catalogue" and any(f["key"] == "limit" for f in types["product_grid"]["fields"])
    assert reg["presets"] and reg["style_options"]["bg"]


def test_default_storefront_is_generated_from_business(make_owner):
    o = make_owner("shop2@example.com", "S", "Zuri Shop", industry="retail")
    kinds = [s["type"] for s in sections(o)]
    assert kinds[0] == "hero" and "product_grid" in kinds and "category_grid" in kinds and "whatsapp_cta" in kinds


def test_add_duplicate_reorder_delete_sections(owner):
    before = [s["id"] for s in sections(owner)]
    new = add(owner, "faq", title="Questions", items=[{"q": "Do you deliver?", "a": "Yes."}])
    dup = owner.post(f"/api/v1/websites/me/sections/{new}/duplicate").json()["added_id"]
    ids = [s["id"] for s in sections(owner)]
    assert ids.index(dup) == ids.index(new) + 1 and len(ids) == len(before) + 2  # two sections of one type can coexist
    reordered = list(reversed(ids))
    assert [s["id"] for s in owner.put("/api/v1/websites/me/order", json={"order": reordered}).json()["sections"]] == reordered
    assert owner.put("/api/v1/websites/me/order", json={"order": reordered[:-1]}).status_code == 400  # must list every section
    assert len(owner.delete(f"/api/v1/websites/me/sections/{dup}").json()["sections"]) == len(before) + 1
    assert owner.get("/api/v1/websites/me").json()["has_unpublished_changes"] is True


def test_section_settings_are_validated(owner):
    assert owner.post("/api/v1/websites/me/sections", json={"type": "nope"}).status_code == 400
    sid = add(owner, "image")
    patch = lambda **kw: owner.patch(f"/api/v1/websites/me/sections/{sid}", json=kw)
    assert patch(settings={"image_url": "javascript:alert(1)"}).status_code == 400
    assert patch(settings={"ratio": "huge"}).status_code == 400
    assert patch(styles={"bg": "red"}).status_code == 400
    ok = patch(settings={"image_url": "/media/x.webp", "<script>": "x"}, styles={"bg": "tint", "pad": "lg"}).json()
    sec = next(s for s in ok["sections"] if s["id"] == sid)
    assert sec["settings"]["image_url"] == "/media/x.webp" and "<script>" not in sec["settings"] and sec["styles"] == {"bg": "tint", "pad": "lg"}
    vid = add(owner, "video")
    assert owner.patch(f"/api/v1/websites/me/sections/{vid}", json={"settings": {"url": "https://evil.example/x"}}).status_code == 400


def test_section_ids_are_tenant_scoped(make_owner):
    a, b = make_owner("a2@example.com", "A", "Alpha"), make_owner("b2@example.com", "B", "Bravo")
    sid = a.section("hero")
    assert b.patch(f"/api/v1/websites/me/sections/{sid}", json={"settings": {"headline": "hijack"}}).status_code == 404
    assert b.delete(f"/api/v1/websites/me/sections/{sid}").status_code == 404
    assert b.post(f"/api/v1/websites/me/sections/{sid}/duplicate").status_code == 404
    assert b.post("/api/v1/websites/me/sections", json={"type": "text", "after_id": sid}).status_code == 404
    assert b.put("/api/v1/websites/me/order", json={"order": [sid]}).status_code == 400


def test_products_render_in_published_grid_and_draft_stays_private(owner, client):
    p = product(owner, "Kitenge Dress", "2500", compare_at_price="3500", short_description="Hand-sewn", track_stock=True, stock_qty=5, featured=True)
    product(owner, "Sold Out Hat", "900", track_stock=True, stock_qty=0)
    product(owner, "Hidden Draft", "100", status="DRAFT")
    add(owner, "product_grid", title="Shop the range", source="all")
    assert "Hidden Draft" not in owner.get("/api/v1/websites/me/preview").text  # drafts are never shown to customers
    assert "Shop the range" not in client.get(f"/{owner.slug}").text  # site not published yet
    owner.post("/api/v1/websites/me/publish")
    html = client.get(f"/{owner.slug}").text
    assert "Shop the range" in html and "Kitenge Dress" in html and "Hand-sewn" in html and "Save 29%" in html
    assert "Sold out" in html and "Hidden Draft" not in html and f'data-id="{p["id"]}"' in html
    assert 'id="bag"' in html  # a shop with products gets the WhatsApp bag


def test_empty_sections_hide_when_published_but_show_hint_while_editing(owner, client):
    add(owner, "product_grid", title="Empty shelf")
    owner.post("/api/v1/websites/me/publish")
    assert "Empty shelf" not in client.get(f"/{owner.slug}").text
    draft = owner.get("/api/v1/websites/me/preview").text
    assert "Add products to show this section" in draft


def test_rich_text_is_escaped_and_custom_html_is_sandboxed(owner, client):
    add(owner, "rich_text", title="Policies", body="**Bold** <img src=x onerror=alert(1)> [ok](https://example.com) [bad](javascript:alert(1))")
    add(owner, "custom_html", html="<script>alert(document.cookie)</script>", height=200)
    owner.post("/api/v1/websites/me/publish")
    html = client.get(f"/{owner.slug}").text
    assert "<strong>Bold</strong>" in html and "<img src=x" not in html and 'href="https://example.com"' in html
    assert 'href="javascript' not in html  # unsafe link schemes stay plain text
    frame = html.split('title="Embedded content"')[1].split(">")[0]
    assert 'sandbox="allow-scripts allow-popups"' in html and "allow-same-origin" not in html and "&lt;script&gt;alert(document.cookie)" in frame


def test_video_embeds_only_known_hosts(owner, client):
    add(owner, "video", title="Tour", url="https://youtu.be/dQw4w9WgXcQ")
    owner.post("/api/v1/websites/me/publish")
    assert "youtube-nocookie.com/embed/dQw4w9WgXcQ" in client.get(f"/{owner.slug}").text


def test_styles_become_classes_and_buttons_resolve_actions(owner, client):
    sid = add(owner, "custom_button", label="Message us", action="whatsapp")
    owner.patch(f"/api/v1/websites/me/sections/{sid}", json={"styles": {"bg": "contrast", "pad": "none"}})
    owner.post("/api/v1/websites/me/publish")
    html = client.get(f"/{owner.slug}").text
    assert "sx-bg-contrast" in html and "sx-pad-none" in html and "wa.me/254711222333" in html


def test_regenerate_rebuilds_from_business_data(make_owner):
    o = make_owner("rg@example.com", "R", "Regen Shop", industry="retail")
    add(o, "spacer")
    n = len(sections(o))
    r = o.post("/api/v1/websites/me/regenerate").json()
    assert len(r["sections"]) == n - 1 and r["sections"][0]["type"] == "hero"


# ---------------------------------------------------------------- products & categories API
def test_product_crud_slug_and_price_rules(owner):
    p = product(owner, "Red Shoes", "1000", compare_at_price="900")  # a 'was' price below the price is dropped
    assert p["slug"] == "red-shoes" and p["compare_at_price"] is None and p["currency"] == "KES"
    assert product(owner, "Red Shoes", "1200")["slug"] == "red-shoes-2"
    r = owner.patch(f"/api/v1/products/{p['id']}", json={"price": "1100", "compare_at_price": "1500", "featured": True, "tags": ["sale", " new "]}).json()
    assert float(r["compare_at_price"]) == 1500.0 and r["tags"] == ["sale", "new"] and r["featured"] is True
    assert owner.post("/api/v1/products", json={"name": "Bad", "price": "-1"}).status_code == 422
    assert owner.post("/api/v1/products", json={"name": "Bad", "price": "1", "images": ["javascript:x"]}).status_code == 422
    assert owner.get("/api/v1/products", params={"q": "red"}).json()["total"] == 2
    assert owner.get("/api/v1/products", params={"featured": True}).json()["total"] == 1
    assert owner.delete(f"/api/v1/products/{p['id']}").status_code == 204
    assert owner.get(f"/api/v1/products/{p['id']}").status_code == 404


def test_low_stock_filter(owner):
    product(owner, "A", "10", track_stock=True, stock_qty=1, low_stock_threshold=3)
    product(owner, "B", "10", track_stock=True, stock_qty=50)
    product(owner, "C", "10")
    assert [p["name"] for p in owner.get("/api/v1/products", params={"low_stock": True}).json()["items"]] == ["A"]


def test_products_and_categories_are_tenant_scoped(make_owner):
    a, b = make_owner("a3@example.com", "A", "Alpha"), make_owner("b3@example.com", "B", "Bravo")
    p = product(a, "Secret Item", "50")
    cat = a.post("/api/v1/categories", json={"name": "Alpha cat"}).json()
    assert b.get(f"/api/v1/products/{p['id']}").status_code == 404
    assert b.patch(f"/api/v1/products/{p['id']}", json={"name": "hijack"}).status_code == 404
    assert b.delete(f"/api/v1/products/{p['id']}").status_code == 404
    assert b.get("/api/v1/products").json()["total"] == 0 and b.get("/api/v1/categories").json() == []
    assert b.post("/api/v1/products", json={"name": "X", "price": "1", "category_id": cat["id"]}).status_code == 400  # someone else's category
    assert b.post("/api/v1/categories", json={"name": "Child", "parent_id": cat["id"]}).status_code == 400
    assert b.patch(f"/api/v1/categories/{cat['id']}", json={"name": "x"}).status_code == 404


def test_nested_categories_and_loop_protection(owner):
    men = owner.post("/api/v1/categories", json={"name": "Men"}).json()
    shirts = owner.post("/api/v1/categories", json={"name": "Shirts", "parent_id": men["id"]}).json()
    polo = owner.post("/api/v1/categories", json={"name": "Polo", "parent_id": shirts["id"]}).json()
    assert shirts["slug"] == "shirts" and polo["parent_id"] == shirts["id"]
    assert owner.post("/api/v1/categories", json={"name": "Too deep", "parent_id": polo["id"]}).status_code == 400
    assert owner.patch(f"/api/v1/categories/{men['id']}", json={"parent_id": polo["id"]}).status_code == 400  # would make a loop
    assert owner.patch(f"/api/v1/categories/{men['id']}", json={"parent_id": men["id"]}).status_code == 400
    product(owner, "Polo tee", "700", category_id=polo["id"])
    assert owner.get("/api/v1/products", params={"category_id": men["id"]}).json()["total"] == 1  # a parent lists its children's products
    assert owner.delete(f"/api/v1/categories/{shirts['id']}").status_code == 204
    assert next(c for c in owner.get("/api/v1/categories").json() if c["id"] == polo["id"])["parent_id"] is None


def test_category_grid_and_filtering_render(owner, client):
    c = owner.post("/api/v1/categories", json={"name": "Dresses"}).json()
    product(owner, "Maxi", "3000", category_id=c["id"])
    add(owner, "category_grid", title="Shop by type")
    add(owner, "product_grid", title="By category", source="category", category_id=c["id"])
    owner.post("/api/v1/websites/me/publish")
    html = client.get(f"/{owner.slug}").text
    assert "Shop by type" in html and "Dresses" in html and "1 item" in html and "Maxi" in html


# ---------------------------------------------------------------- media library
def _png():
    import io
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (64, 48), (200, 30, 90)).save(buf, "PNG")
    return buf.getvalue()


def test_media_upload_list_rename_delete_and_isolation(make_owner):
    a, b = make_owner("m1@example.com", "A", "Alpha"), make_owner("m2@example.com", "B", "Bravo")
    r = a.post("/api/v1/media", files={"file": ("dress.png", _png(), "image/png")}, data={"folder": "products"})
    assert r.status_code == 201, r.text
    asset = r.json()
    assert asset["name"] == "dress" and asset["folder"] == "products" and asset["url"].startswith("/media/") and asset["width"] == 64
    assert a.get("/api/v1/media", params={"folder": "products"}).json()["total"] == 1
    assert a.get("/api/v1/media", params={"q": "dre"}).json()["total"] == 1 and a.get("/api/v1/media", params={"folder": "logo"}).json()["total"] == 0
    assert b.get("/api/v1/media").json()["total"] == 0
    assert b.patch(f"/api/v1/media/{asset['id']}", json={"name": "x"}).status_code == 404
    assert b.delete(f"/api/v1/media/{asset['id']}").status_code == 404
    assert a.patch(f"/api/v1/media/{asset['id']}", json={"name": "Summer dress", "folder": "storefront"}).json()["folder"] == "storefront"
    assert a.post("/api/v1/media", files={"file": ("x.png", _png(), "image/png")}, data={"folder": "../etc"}).status_code == 400
    assert a.post("/api/v1/media", files={"file": ("x.png", b"not an image", "image/png")}, data={"folder": "logo"}).status_code == 400
    assert a.delete(f"/api/v1/media/{asset['id']}").status_code == 204 and a.get("/api/v1/media").json()["total"] == 0


def test_catch_all_rejects_scanner_probes_without_hitting_business(client, owner):
    # Common scanner probe paths should safely return 404 without querying business slugs
    for path in ["/env-config.js", "/env.js", "/env.txt", "/.env", "/wp-login.php", "/config.json"]:
        r = client.get(path)
        assert r.status_code == 404

