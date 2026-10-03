from app.core.security import create_access_token


def test_register_login_me(client):
    r = client.post("/api/v1/auth/register", json={"email": "A@Example.com", "password": "correct-horse-1", "full_name": "A"})
    assert r.status_code == 201
    r = client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": "correct-horse-1"})
    assert r.status_code == 200
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    me = client.get("/api/v1/auth/me", headers=h).json()
    assert me["user"]["email"] == "a@example.com" and me["memberships"] == []


def test_duplicate_email_and_weak_password(client):
    body = {"email": "a@example.com", "password": "correct-horse-1", "full_name": "A"}
    assert client.post("/api/v1/auth/register", json=body).status_code == 201
    assert client.post("/api/v1/auth/register", json=body).status_code == 409
    assert client.post("/api/v1/auth/register", json={**body, "email": "b@example.com", "password": "short"}).status_code == 422


def test_wrong_password_and_lockout(client, owner):
    for _ in range(5):
        assert client.post("/api/v1/auth/login", json={"email": owner.email, "password": "nope-nope-nope"}).status_code == 401
    r = client.post("/api/v1/auth/login", json={"email": owner.email, "password": "correct-horse-1"})
    assert r.status_code == 429  # locked even with the right password


def test_protected_routes_need_token(client):
    assert client.get("/api/v1/businesses/me").status_code == 401
    assert client.get("/api/v1/customers", headers={"Authorization": "Bearer garbage"}).status_code == 401
    forged = create_access_token("00000000-0000-0000-0000-000000000000")
    assert client.get("/api/v1/businesses/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


def test_refresh_cookie_flow_and_password_change_revokes(client, owner):
    r = client.post("/api/v1/auth/login", json={"email": owner.email, "password": "correct-horse-1"})
    assert client.post("/api/v1/auth/refresh").status_code == 200
    r = client.post("/api/v1/auth/change-password", headers=owner.h, json={"current_password": "correct-horse-1", "new_password": "another-good-pass-2"})
    assert r.status_code == 204
    old = client.cookies.get("bz_refresh")
    assert old  # cookie reissued with new token version
    assert client.post("/api/v1/auth/login", json={"email": owner.email, "password": "another-good-pass-2"}).status_code == 200


def test_password_reset_is_one_time(client, owner, db):
    from app.models import Notification
    assert client.post("/api/v1/auth/forgot-password", json={"email": owner.email}).status_code == 202
    assert client.post("/api/v1/auth/forgot-password", json={"email": "nobody@example.com"}).status_code == 202  # no account enumeration
    n = db.query(Notification).filter(Notification.kind == "password_reset").one()
    token = n.body.split("token=")[1].split("\n")[0]
    assert client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "brand-new-pass-3"}).status_code == 204
    assert client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "brand-new-pass-4"}).status_code == 400
    assert client.post("/api/v1/auth/login", json={"email": owner.email, "password": "brand-new-pass-3"}).status_code == 200
