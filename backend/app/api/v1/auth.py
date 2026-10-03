from datetime import datetime, timedelta, timezone

import jwt
from pydantic import BaseModel
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AuthState, get_auth, get_current_user
from app.core.config import get_settings
from app.core.db import get_db
from app.core.errors import bad_request, conflict
from app.core.rate_limit import rate_limit
from app.core.security import (create_access_token, create_refresh_token, decode_token, hash_password, verify_password)
from app.models import Business, BusinessMember, User
from app.schemas.auth import (ForgotIn, LoginIn, MeOut, PasswordChangeIn, RegisterIn, ResetIn, TokenOut, UserOut)
from app.services.audit import audit
from app.services.notifications import notify

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE = "bz_refresh"
_DUMMY_HASH = hash_password("dummy-password-for-timing")


def _set_refresh(response: Response, user: User) -> None:
    s = get_settings()
    response.set_cookie(COOKIE, create_refresh_token(str(user.id), user.token_version), max_age=s.refresh_token_days * 86400, httponly=True,
                        secure=s.is_production, samesite="lax", path="/api/v1/auth")


@router.post("/register", response_model=TokenOut, status_code=201, dependencies=[Depends(rate_limit("register", 10, 3600))])
def register(body: RegisterIn, request: Request, response: Response, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise conflict("An account with this email already exists. Try signing in.")
    user = User(email=email, password_hash=hash_password(body.password), full_name=body.full_name, phone=body.phone)
    db.add(user)
    db.flush()
    audit(db, "auth.register", user_id=user.id, resource_type="user", resource_id=user.id, request=request)
    db.commit()
    _set_refresh(response, user)
    return TokenOut(access_token=create_access_token(str(user.id)))


class GuestIn(BaseModel):
    industry: str = "retail"


GUEST_DOMAIN = "guest.example.com"  # IANA-reserved: can never receive mail


@router.post("/guest", response_model=TokenOut, status_code=201, dependencies=[Depends(rate_limit("guest", 6, 3600))])
def guest(body: GuestIn, request: Request, response: Response, db: Session = Depends(get_db)):
    """A throwaway account with its own sample business so anyone can try the dashboard. Each guest is a separate tenant: it can't see or touch anyone else's data.
    It can't be signed into again (the password is random), sends no emails, and is never a platform admin."""
    import secrets as _s
    from app.services import business as biz
    uid = _s.token_hex(5)
    user = User(email=f"guest-{uid}@{GUEST_DOMAIN}", password_hash=hash_password(_s.token_urlsafe(24)), full_name="Guest", email_verified=True)
    db.add(user)
    db.flush()
    b = biz.create_business(db, owner=user, name=f"Demo Shop {uid[:4].upper()}", industry=body.industry, city="Nairobi", description="A sample business to try Aqivo. Guest data is temporary.")
    audit(db, "auth.guest", user_id=user.id, business_id=b.id, resource_type="user", resource_id=user.id, request=request)
    db.commit()
    _set_refresh(response, user)
    return TokenOut(access_token=create_access_token(str(user.id)))


@router.post("/login", response_model=TokenOut, dependencies=[Depends(rate_limit("login", 20, 300))])
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    s = get_settings()
    user = db.scalars(select(User).where(User.email == body.email.lower(), User.deleted_at.is_(None))).first()
    now = datetime.now(timezone.utc)
    if user and user.locked_until and user.locked_until > now:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many failed attempts. Try again in a few minutes.")
    ok = verify_password(body.password, user.password_hash if user else _DUMMY_HASH)  # constant-ish time either way
    if not user or not ok or not user.is_active:
        if user:
            user.failed_logins += 1
            if user.failed_logins >= s.login_max_attempts:
                user.locked_until, user.failed_logins = now + timedelta(minutes=s.login_lock_minutes), 0
            audit(db, "auth.login_failed", user_id=user.id, request=request)
            db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    user.failed_logins, user.locked_until, user.last_login_at = 0, None, now
    audit(db, "auth.login", user_id=user.id, request=request)
    db.commit()
    _set_refresh(response, user)
    return TokenOut(access_token=create_access_token(str(user.id)))


@router.post("/refresh", response_model=TokenOut, dependencies=[Depends(rate_limit("refresh", 60, 300))])
def refresh(response: Response, bz_refresh: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    if not bz_refresh:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    try:
        claims = decode_token(bz_refresh, "refresh")
        user = db.get(User, claims["sub"])
    except (jwt.PyJWTError, ValueError, KeyError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")
    if not user or user.deleted_at or not user.is_active or claims.get("tv") != user.token_version:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")
    return TokenOut(access_token=create_access_token(str(user.id)))


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(COOKIE, path="/api/v1/auth")


@router.get("/me", response_model=MeOut)
def me(auth: AuthState = Depends(get_auth), db: Session = Depends(get_db)):
    user = auth.user
    imp = auth.claims.get("imp")
    rows = db.execute(select(BusinessMember, Business).join(Business, Business.id == BusinessMember.business_id)
                      .where(BusinessMember.user_id == user.id, BusinessMember.is_active.is_(True), Business.deleted_at.is_(None))).all()
    memberships = [{"business_id": str(b.id), "business_name": b.name, "slug": b.slug, "role": m.role} for m, b in rows]
    if imp:
        b = db.get(Business, imp["business_id"])
        memberships = [{"business_id": str(b.id), "business_name": b.name, "slug": b.slug, "role": "BUSINESS_OWNER"}] if b else []
    return MeOut(user=UserOut.model_validate(user), memberships=memberships, impersonating=bool(imp),
                 impersonated_business_id=imp["business_id"] if imp else None)


@router.post("/change-password", status_code=204)
def change_password(body: PasswordChangeIn, request: Request, response: Response, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current_password, user.password_hash):
        raise bad_request("Current password is incorrect")
    user.password_hash = hash_password(body.new_password)
    user.token_version += 1  # invalidates other sessions' refresh tokens
    audit(db, "auth.password_changed", user_id=user.id, request=request)
    db.commit()
    _set_refresh(response, user)


@router.post("/forgot-password", status_code=202, dependencies=[Depends(rate_limit("forgot", 5, 900))])
def forgot_password(body: ForgotIn, db: Session = Depends(get_db)):
    user = db.scalars(select(User).where(User.email == body.email.lower(), User.deleted_at.is_(None))).first()
    if user:
        s = get_settings()
        now = datetime.now(timezone.utc)
        token = jwt.encode({"sub": str(user.id), "typ": "reset", "tv": user.token_version, "iat": now, "exp": now + timedelta(minutes=30)}, s.secret_key, algorithm="HS256")
        from app.services.notifications import TEMPLATES
        TEMPLATES.setdefault("password_reset", ("Reset your Aqivo password", "Use this link to reset your password (valid 30 minutes):\n{app_url}/reset-password?token={token}\n\nIf you didn't ask for this, ignore this email."))
        notify(db, "password_reset", user.email, user_id=user.id, token=token)
        db.commit()
    return {"message": "If that email has an account, we've sent a reset link."}  # same answer either way


@router.post("/reset-password", status_code=204, dependencies=[Depends(rate_limit("reset", 10, 900))])
def reset_password(body: ResetIn, db: Session = Depends(get_db)):
    try:
        claims = decode_token(body.token, "reset")
        user = db.get(User, claims["sub"])
    except (jwt.PyJWTError, ValueError, KeyError):
        raise bad_request("This reset link is invalid or has expired")
    if not user or claims.get("tv") != user.token_version:
        raise bad_request("This reset link is invalid or has expired")
    user.password_hash = hash_password(body.new_password)
    user.token_version += 1  # one-time: the link dies with the password change
    user.failed_logins, user.locked_until = 0, None
    audit(db, "auth.password_reset", user_id=user.id)
    db.commit()
