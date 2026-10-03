import os

os.environ["DATABASE_URL"] = "postgresql+psycopg://mac@localhost:5432/bizora_test"
os.environ["ENVIRONMENT"] = "test"
os.environ["MEDIA_DIR"] = "/tmp/bizora_test_media"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import Base, SessionLocal, engine
from app.core.rate_limit import reset_rate_limits
import app.models  # noqa: F401
from app.seed import bootstrap

SEEDED = {"plans", "templates", "roles"}


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    bootstrap(demo=False)
    yield


@pytest.fixture(autouse=True)
def _clean():
    reset_rate_limits()
    yield
    tables = [t.name for t in Base.metadata.sorted_tables if t.name not in SEEDED]
    with engine.begin() as c:
        c.execute(text("TRUNCATE " + ",".join(f'"{t}"' for t in tables) + " RESTART IDENTITY CASCADE"))


@pytest.fixture
def client():
    from app.main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db():
    s = SessionLocal()
    yield s
    s.close()


class Owner:
    def __init__(self, client, email, name, business_name, **biz):
        self.client, self.email = client, email
        r = client.post("/api/v1/auth/register", json={"email": email, "password": "correct-horse-1", "full_name": name})
        assert r.status_code == 201, r.text
        self.token = r.json()["access_token"]
        self.h = {"Authorization": f"Bearer {self.token}"}
        r = client.post("/api/v1/businesses", headers=self.h, json={"name": business_name, "phone": "0711222333", **biz})
        assert r.status_code == 201, r.text
        self.business = r.json()
        self.id = self.business["id"]
        self.slug = self.business["slug"]

    def get(self, url, **kw): return self.client.get(url, headers=self.h, **kw)
    def post(self, url, **kw): return self.client.post(url, headers=self.h, **kw)
    def patch(self, url, **kw): return self.client.patch(url, headers=self.h, **kw)
    def put(self, url, **kw): return self.client.put(url, headers=self.h, **kw)
    def delete(self, url, **kw): return self.client.delete(url, headers=self.h, **kw)

    def section(self, stype):
        """The id of this business's first section of a type."""
        return next(s["id"] for s in self.get("/api/v1/websites/me").json()["sections"] if s["type"] == stype)

    def edit_section(self, stype, **settings):
        return self.patch(f"/api/v1/websites/me/sections/{self.section(stype)}", json={"settings": settings})


@pytest.fixture
def make_owner(client):
    def _make(email="mary@example.com", name="Mary W", business="Mary's Beauty Studio", **biz):
        return Owner(client, email, name, business, **biz)
    return _make


@pytest.fixture
def owner(make_owner):
    return make_owner()


@pytest.fixture
def admin(client, db):
    from app.core.security import hash_password
    from app.models import User
    u = User(email="admin@bizora.co", password_hash=hash_password("admin-password-1"), full_name="Admin", platform_role="SUPER_ADMIN")
    db.add(u)
    db.commit()
    r = client.post("/api/v1/auth/login", json={"email": "admin@bizora.co", "password": "admin-password-1"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def add_service(owner, name="Knotless Braids", price="1500", minutes=60):
    r = owner.post("/api/v1/services", json={"name": name, "price": price, "duration_minutes": minutes})
    assert r.status_code == 201, r.text
    return r.json()


def set_plan(business_id, key="PRO", status="ACTIVE"):
    """Test helper: put a business on a plan without going through billing."""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import select
    from app.models import Plan, Subscription
    s = SessionLocal()
    try:
        plan = s.scalars(select(Plan).where(Plan.key == key)).one()
        sub = s.scalars(select(Subscription).where(Subscription.business_id == business_id)).one()
        sub.plan_id, sub.status = plan.id, status
        sub.current_period_end = datetime.now(timezone.utc) + timedelta(days=30)
        s.commit()
    finally:
        s.close()
