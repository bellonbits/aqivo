"""Tests for Theme Management and Code Editing Studio (/admin/storefronts)."""
import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.models import User
from app.models.enums import PlatformRole


@pytest.fixture
def admin_user(db):
    user = User(
        email="superadmin@aqivo.shop",
        password_hash=hash_password("adminpass123"),
        full_name="Platform Super Admin",
        platform_role=PlatformRole.SUPER_ADMIN,
        is_active=True,
        email_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def regular_merchant(db):
    user = User(
        email="merchant@shop.co",
        password_hash=hash_password("merchantpass123"),
        full_name="Shop Owner",
        platform_role=None,
        is_active=True,
        email_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth_header(client: TestClient, email: str, password: str) -> dict:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_theme_studio_admin_authorization(client: TestClient, admin_user, regular_merchant):
    # Merchants cannot access theme studio API
    merchant_headers = _auth_header(client, "merchant@shop.co", "merchantpass123")
    res = client.get("/api/v1/admin/storefronts", headers=merchant_headers)
    assert res.status_code == 403

    # Super admin can access
    admin_headers = _auth_header(client, "superadmin@aqivo.shop", "adminpass123")
    res = client.get("/api/v1/admin/storefronts", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "templates" in data
    assert len(data["templates"]) >= 1
    assert any(t["key"] == "twosidesboutique" for t in data["templates"])


def test_theme_file_tree_and_content(client: TestClient, admin_user):
    headers = _auth_header(client, "superadmin@aqivo.shop", "adminpass123")

    # 1. Get file tree
    res = client.get("/api/v1/admin/storefronts/themes/twosidesboutique/files", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "categories" in data
    assert "templates" in data["categories"]
    assert any(f["path"] == "index.html" for f in data["categories"]["templates"])

    # 2. Read file content
    res = client.get("/api/v1/admin/storefronts/themes/twosidesboutique/file?path=index.html", headers=headers)
    assert res.status_code == 200
    f = res.json()
    assert f["language"] == "html"
    assert "<html" in f["content"].lower() or "<!doctype" in f["content"].lower()


def test_theme_draft_save_validate_diff(client: TestClient, admin_user):
    headers = _auth_header(client, "superadmin@aqivo.shop", "adminpass123")

    # 1. Save draft edit
    sample_edit = "<!-- Draft update test -->\n<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Draft Edit</h1></body></html>"
    res = client.put(
        "/api/v1/admin/storefronts/themes/twosidesboutique/file",
        headers=headers,
        json={"path": "index.html", "content": sample_edit}
    )
    assert res.status_code == 200
    assert res.json()["success"] is True

    # 2. Run syntax validation
    res = client.post("/api/v1/admin/storefronts/themes/twosidesboutique/validate", headers=headers)
    assert res.status_code == 200
    val = res.json()
    assert "valid" in val
    assert "files_checked" in val

    # 3. Inspect diff
    res = client.get("/api/v1/admin/storefronts/themes/twosidesboutique/diff", headers=headers)
    assert res.status_code == 200
    diff = res.json()
    assert diff["total_files_changed"] >= 1
    assert any(f["path"] == "index.html" for f in diff["files"])


def test_path_traversal_prevention(client: TestClient, admin_user):
    headers = _auth_header(client, "superadmin@aqivo.shop", "adminpass123")

    # Path traversal ../ must be rejected with 400
    res = client.get("/api/v1/admin/storefronts/themes/twosidesboutique/file?path=../../etc/passwd", headers=headers)
    assert res.status_code == 400

    # Forbidden extension must be rejected with 400
    res = client.get("/api/v1/admin/storefronts/themes/twosidesboutique/file?path=evil.exe", headers=headers)
    assert res.status_code == 400


def test_delete_theme_endpoint(client: TestClient, admin_user):
    headers = _auth_header(client, "superadmin@aqivo.shop", "adminpass123")

    # 1. Create a theme
    create_res = client.post(
        "/api/v1/admin/storefronts/themes",
        headers=headers,
        json={
            "key": "test_deletable_theme",
            "name": "Deletable Theme",
            "industry": "retail",
            "description": "A temporary theme for deletion test",
            "clone_from": "twosidesboutique"
        }
    )
    assert create_res.status_code == 200

    # 2. Delete the theme
    del_res = client.delete("/api/v1/admin/storefronts/themes/test_deletable_theme", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 3. Verify it is gone
    get_res = client.get("/api/v1/admin/storefronts/themes/test_deletable_theme/files", headers=headers)
    assert get_res.status_code == 404


def test_preview_route_renders_demo_store(client: TestClient):
    # GET /ecomm-templates/{key}/index.html?preview=1 should return 200 and HTML
    res = client.get("/ecomm-templates/zuribeauty/index.html?preview=1")
    assert res.status_code == 200
    assert "text/html" in res.headers.get("content-type", "")
    assert "<html" in res.text.lower()

