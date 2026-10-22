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


def test_register_with_phone_only_and_login(client):
    # User signs up with phone number and no email
    r = client.post(
        "/api/v1/auth/register",
        json={"phone": "0712345678", "password": "correct-horse-1", "full_name": "Phone User"}
    )
    assert r.status_code == 201
    token = r.json()["access_token"]
    assert token

    # Check /me profile reflects phone and null email
    h = {"Authorization": f"Bearer {token}"}
    me = client.get("/api/v1/auth/me", headers=h).json()
    assert me["user"]["phone"] == "254712345678"
    assert me["user"]["email"] is None
    assert me["user"]["full_name"] == "Phone User"

    # User can log in with their phone number in local format or international format
    r2 = client.post("/api/v1/auth/login", json={"identifier": "0712345678", "password": "correct-horse-1"})
    assert r2.status_code == 200
    r3 = client.post("/api/v1/auth/login", json={"phone": "254712345678", "password": "correct-horse-1"})
    assert r3.status_code == 200


def test_duplicate_phone_signup_conflict(client):
    body = {"phone": "0722000111", "password": "correct-horse-1", "full_name": "User One"}
    assert client.post("/api/v1/auth/register", json=body).status_code == 201
    # Duplicate phone in national format
    assert client.post("/api/v1/auth/register", json={"phone": "0722 000 111", "password": "another-password", "full_name": "User Two"}).status_code == 409
    # Duplicate phone in international format
    assert client.post("/api/v1/auth/register", json={"phone": "254722000111", "password": "another-password", "full_name": "User Three"}).status_code == 409


def test_register_without_email_or_phone_fails(client):
    # Both missing
    r = client.post("/api/v1/auth/register", json={"password": "correct-horse-1", "full_name": "No Contact"})
    assert r.status_code == 422

    # Both empty strings
    r2 = client.post("/api/v1/auth/register", json={"email": "", "phone": "", "password": "correct-horse-1", "full_name": "Empty Contact"})
    assert r2.status_code == 422



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
    # The old access token in owner.h is now revoked immediately
    assert client.get("/api/v1/businesses/me", headers=owner.h).status_code == 401
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


def test_email_verification_flow(client, db):
    from app.models import Notification, User
    email = "newuser@example.com"
    r = client.post("/api/v1/auth/register", json={"email": email, "password": "correct-horse-1", "full_name": "New User"})
    assert r.status_code == 201
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}

    me = client.get("/api/v1/auth/me", headers=h).json()
    assert me["user"]["email_verified"] is False

    n = db.query(Notification).filter(Notification.kind == "verify_email", Notification.recipient == email).one()
    assert "token=" in n.body
    token = n.body.split("token=")[1].split("\n")[0]

    # Verify via POST
    vr = client.post("/api/v1/auth/verify-email", json={"token": token})
    assert vr.status_code == 200
    assert vr.json()["email_verified"] is True

    # User is now verified
    u = db.query(User).filter(User.email == email).one()
    assert u.email_verified is True

    # Direct browser GET link
    get_res = client.get(f"/api/v1/auth/verify-email?token={token}", follow_redirects=False)
    assert get_res.status_code == 302
    assert "verified=true" in get_res.headers["location"]


def test_resend_verification_email(client, db):
    from app.models import Notification
    email = "resenduser@example.com"
    assert client.post("/api/v1/auth/register", json={"email": email, "password": "correct-horse-1", "full_name": "Resend User"}).status_code == 201
    assert db.query(Notification).filter(Notification.kind == "verify_email", Notification.recipient == email).count() == 1

    r = client.post("/api/v1/auth/resend-verification", json={"email": email})
    assert r.status_code == 200
    assert db.query(Notification).filter(Notification.kind == "verify_email", Notification.recipient == email).count() == 2


def test_phone_verification_flow(client, owner, db):
    from app.models import User
    from app.services.sms import hash_otp

    # 1. Request verification code as authenticated user
    r = client.post("/api/v1/auth/request-phone-code", headers=owner.h, json={"phone": "0712345678"})
    assert r.status_code == 200
    assert r.json()["phone"] == "254712345678"

    # User in db now has OTP hash and phone_verified False
    u = db.query(User).filter(User.email == owner.email).one()
    assert u.phone_otp_hash is not None
    assert u.phone == "254712345678"
    assert u.phone_verified is False

    # 2. Wrong code fails
    w = client.post("/api/v1/auth/verify-phone", headers=owner.h, json={"phone": "0712345678", "code": "000000"})
    assert w.status_code == 400

    # 3. Known valid code succeeds
    known_code = "789123"
    u.phone_otp_hash = hash_otp("254712345678", known_code)
    db.commit()

    v = client.post("/api/v1/auth/verify-phone", headers=owner.h, json={"phone": "0712345678", "code": known_code})
    assert v.status_code == 200
    assert v.json()["phone_verified"] is True

    # 4. Profile reflects phone_verified True
    me = client.get("/api/v1/auth/me", headers=owner.h).json()
    assert me["user"]["phone_verified"] is True
    assert me["user"]["phone"] == "254712345678"


def test_phone_verification_expired_code(client, owner, db):
    from datetime import datetime, timedelta, timezone
    from app.models import User
    from app.services.sms import hash_otp

    u = db.query(User).filter(User.email == owner.email).one()
    u.phone = "254712345678"
    u.phone_otp_hash = hash_otp("254712345678", "123456")
    u.phone_otp_expires_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    u.phone_verified = False
    db.commit()

    v = client.post("/api/v1/auth/verify-phone", headers=owner.h, json={"phone": "0712345678", "code": "123456"})
    assert v.status_code == 400
    assert "expired" in v.json()["detail"].lower()


def test_phone_verification_unauthenticated_guard(client):
    # Calling request-phone-code with no auth and no registered account
    r = client.post("/api/v1/auth/request-phone-code", json={"phone": "0799999999"})
    assert r.status_code == 400
    assert "account not found" in r.json()["detail"].lower()


def test_update_profile(client, owner, db):
    # Update full_name and locale
    r = client.patch("/api/v1/auth/me", headers=owner.h, json={"full_name": "Updated Name", "locale": "sw"})
    assert r.status_code == 200
    assert r.json()["full_name"] == "Updated Name"
    assert r.json()["locale"] == "sw"

    # Set phone - should normalize and set phone_verified to False
    r = client.patch("/api/v1/auth/me", headers=owner.h, json={"phone": "0712345678"})
    assert r.status_code == 200
    assert r.json()["phone"] == "254712345678"
    assert r.json()["phone_verified"] is False


def test_bearer_access_token_compromise_and_token_version_invalidation(client, db):
    # Register and login to obtain an access token
    r = client.post("/api/v1/auth/register", json={"email": "victim@example.com", "password": "correct-horse-1", "full_name": "Victim"})
    assert r.status_code == 201
    leaked_token = r.json()["access_token"]
    h = {"Authorization": f"Bearer {leaked_token}"}

    # Token works initially
    assert client.get("/api/v1/auth/me", headers=h).status_code == 200

    # Invalidate sessions by incrementing token_version in db (incident response)
    from app.models import User
    u = db.query(User).filter(User.email == "victim@example.com").first()
    u.token_version += 1
    db.commit()

    # The compromised/leaked token is now immediately rejected
    assert client.get("/api/v1/auth/me", headers=h).status_code == 401


def test_logout_revokes_bearer_access_token(client):
    # Login to obtain token
    r = client.post("/api/v1/auth/register", json={"email": "logoutuser@example.com", "password": "correct-horse-1", "full_name": "Logout User"})
    token = r.json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/v1/auth/me", headers=h).status_code == 200

    # Call logout with the bearer token
    logout_res = client.post("/api/v1/auth/logout", headers=h)
    assert logout_res.status_code == 204

    # Stolen/leaked bearer token cannot be reused after logout
    assert client.get("/api/v1/auth/me", headers=h).status_code == 401


def test_customer_cookie_invalidation_and_bypass_prevention(client, owner, db):
    # Setup customer and business
    H = {"X-Bizora": "1"}
    req = client.post(f"/api/v1/public/{owner.slug}/account/otp/request", json={"identifier": "0755112233"}, headers=H).json()
    code = req["dev_code"]
    verify_res = client.post(f"/api/v1/public/{owner.slug}/account/otp/verify", json={"identifier": "0755112233", "code": code, "name": "Store Customer"}, headers=H)
    assert verify_res.status_code == 200

    # Orders endpoint accessible with valid customer session
    assert client.get(f"/api/v1/public/{owner.slug}/account/orders").status_code == 200

    # Clear cookies: Attempting to access orders using only phone parameter without session cookie is BLOCKED
    client.cookies.clear()
    assert client.get(f"/api/v1/public/{owner.slug}/account/orders?phone=0755112233").status_code == 401
    assert client.get(f"/api/v1/public/{owner.slug}/account/orders", headers={"X-Customer-Phone": "0755112233"}).status_code == 401

    # Re-login with OTP
    req2 = client.post(f"/api/v1/public/{owner.slug}/account/otp/request", json={"identifier": "0755112233"}, headers=H).json()
    code2 = req2["dev_code"]
    verify_res2 = client.post(f"/api/v1/public/{owner.slug}/account/otp/verify", json={"identifier": "0755112233", "code": code2, "name": "Store Customer"}, headers=H)
    assert verify_res2.status_code == 200

    # Customer logout revokes session
    assert client.post(f"/api/v1/public/{owner.slug}/account/logout", headers=H).status_code == 200
    # Accessing with revoked cookie returns 401
    assert client.get(f"/api/v1/public/{owner.slug}/account/orders").status_code == 401

    # Attempting to bypass OTP via /identify for an existing customer account is rejected
    ident = client.post(f"/api/v1/public/{owner.slug}/account/identify", json={"name": "Attacker", "phone": "0755112233", "location": "Nairobi"})
    assert ident.status_code == 200
    assert ident.json().get("requires_otp") is True
    assert "token" not in ident.json()



