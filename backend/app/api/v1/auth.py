from datetime import datetime, timedelta, timezone
import hmac
import logging
import uuid

import jwt
from pydantic import BaseModel
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AuthState, get_auth, get_current_user
from app.core.config import get_settings
from app.core.db import get_db
from app.core.errors import bad_request, conflict
from app.core.rate_limit import rate_limit
from app.core.security import (create_access_token, create_refresh_token, create_verification_token, decode_token, hash_password, verify_password)
from app.models import Business, BusinessMember, SignupOTP, User
from app.schemas.auth import (ForgotIn, ForgotPhoneIn, LoginIn, MeOut, PasswordChangeIn, ProfileUpdateIn, RegisterIn, RequestPhoneCodeIn, ResendVerificationIn, ResetIn, ResetPhoneIn, SignupRequestCodeIn, TokenOut, UserOut, VerifyEmailIn, VerifyPhoneIn)
from app.services.audit import audit
from app.services.notifications import notify
from app.services.sms import (clean_phone, generate_otp, hash_otp, hash_signup_otp, is_disposable_email, is_valid_mobile_phone, send_sms)

log = logging.getLogger("bizora.auth")
router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE = "bz_refresh"
_DUMMY_HASH = hash_password("dummy-password-for-timing")


def _set_refresh(response: Response, user: User) -> None:
    s = get_settings()
    response.set_cookie(COOKIE, create_refresh_token(str(user.id), user.token_version), max_age=s.refresh_token_days * 86400, httponly=True,
                        secure=s.is_production, samesite="lax", path="/api/v1/auth")


@router.post("/signup/request-code", dependencies=[Depends(rate_limit("signup_code_req", 6, 600))])
def request_signup_code(body: SignupRequestCodeIn, db: Session = Depends(get_db)):
    """Request an OTP verification code sent via SMS or Email before creating an account.
    Validates that the phone or email is not fake/disposable and is not already registered."""
    s = get_settings()
    raw = (body.identifier or "").strip()
    channel = body.channel.strip().lower()

    if channel == "email" or "@" in raw:
        clean_email = raw.lower()
        if "@" not in clean_email or "." not in clean_email:
            raise bad_request("Please enter a valid email address.")
        if is_disposable_email(clean_email):
            raise bad_request("Disposable or temporary email addresses are not allowed. Please use your permanent email.")
        if db.scalar(select(User.id).where(User.email == clean_email, User.deleted_at.is_(None))):
            raise conflict("An account with this email already exists. Please sign in.")

        norm_identifier = clean_email
        actual_channel = "EMAIL"
    else:
        norm_phone = clean_phone(raw)
        if not is_valid_mobile_phone(norm_phone):
            raise bad_request("Please enter a valid active Kenyan mobile number (e.g. 0712 345 678 or 0110 123 456).")
        phone_variants = {raw, norm_phone, f"+{norm_phone}"}
        if norm_phone.startswith("254") and len(norm_phone) == 12:
            phone_variants.add("0" + norm_phone[3:])
            phone_variants.add(norm_phone[3:])
        if db.scalar(select(User.id).where(User.phone.in_(phone_variants), User.deleted_at.is_(None))):
            raise conflict("An account with this phone number already exists. Please sign in.")

        norm_identifier = norm_phone
        actual_channel = "SMS"

    code = generate_otp()
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=10)

    # Invalidate previous unexpired signup OTPs for this identifier
    db.query(SignupOTP).filter(SignupOTP.identifier == norm_identifier, SignupOTP.used.is_(False)).delete()

    otp_row = SignupOTP(
        identifier=norm_identifier,
        channel=actual_channel,
        code_hash=hash_signup_otp(norm_identifier, code),
        expires_at=expires,
        attempts=0,
        used=False,
    )
    db.add(otp_row)
    db.commit()

    if actual_channel == "SMS":
        sms_res = send_sms(
            recipient=norm_identifier,
            message=f"Your Aqivo verification code is {code}. Enter this code to create your store account. Valid for 10 minutes.",
        )
        if sms_res.get("status") == "error":
            log.warning("Failed to send signup SMS to %s: %s", norm_identifier, sms_res.get("message"))
    else:
        name = (body.full_name or "").strip() or "there"
        notify(db, "signup_code", norm_identifier, name=name, code=code, minutes=10)

    res = {
        "ok": True,
        "message": f"Verification code sent via {'SMS' if actual_channel == 'SMS' else 'email'}.",
        "identifier": norm_identifier,
        "channel": actual_channel,
    }
    if s.environment != "production":
        res["dev_code"] = code
    return res


@router.post("/register", response_model=TokenOut, status_code=201, dependencies=[Depends(rate_limit("register", 10, 3600))])
def register(body: RegisterIn, request: Request, response: Response, db: Session = Depends(get_db)):
    s = get_settings()
    email = body.email.strip().lower() if body.email and body.email.strip() else None
    raw_phone = body.phone.strip() if body.phone and body.phone.strip() else None
    norm_phone = clean_phone(raw_phone) if raw_phone else None

    if email:
        if is_disposable_email(email):
            raise bad_request("Disposable or temporary email addresses are not allowed. Please use your permanent email.")
        if db.scalar(select(User.id).where(User.email == email, User.deleted_at.is_(None))):
            raise conflict("An account with this email already exists. Try signing in.")

    if norm_phone:
        if not is_valid_mobile_phone(norm_phone):
            raise bad_request("Please enter a valid active Kenyan mobile number.")
        phone_variants = {raw_phone, norm_phone, f"+{norm_phone}"}
        if norm_phone.startswith("254") and len(norm_phone) == 12:
            phone_variants.add("0" + norm_phone[3:])
            phone_variants.add(norm_phone[3:])
        if db.scalar(select(User.id).where(User.phone.in_(phone_variants), User.deleted_at.is_(None))):
            raise conflict("An account with this phone number already exists. Try signing in.")

    primary_ident = norm_phone or email
    now = datetime.now(timezone.utc)
    otp_row = None

    # In non-test mode (dev and production), require and verify valid OTP code
    if s.environment != "test":
        if not body.code:
            raise bad_request("Verification code is required. Please verify your phone number or email first.")

        otp_row = db.query(SignupOTP).filter(
            SignupOTP.identifier == primary_ident,
            SignupOTP.used.is_(False),
            SignupOTP.expires_at > now,
        ).order_by(SignupOTP.created_at.desc()).first()

        if not otp_row:
            raise bad_request("Verification code has expired or was not requested. Please request a new code.")

        if otp_row.attempts >= 5:
            raise bad_request("Too many incorrect attempts. Please request a new verification code.")

        expected_hash = hash_signup_otp(primary_ident, body.code.strip())
        if not hmac.compare_digest(otp_row.code_hash, expected_hash):
            otp_row.attempts += 1
            db.commit()
            raise bad_request("Invalid verification code. Please check and try again.")

        otp_row.used = True
    else:
        # In test mode, if code is supplied, check it if a SignupOTP exists
        if body.code:
            otp_row = db.query(SignupOTP).filter(
                SignupOTP.identifier == primary_ident,
                SignupOTP.used.is_(False),
                SignupOTP.expires_at > now,
            ).order_by(SignupOTP.created_at.desc()).first()
            if otp_row:
                expected_hash = hash_signup_otp(primary_ident, body.code.strip())
                if not hmac.compare_digest(otp_row.code_hash, expected_hash):
                    otp_row.attempts += 1
                    db.commit()
                    raise bad_request("Invalid verification code.")
                otp_row.used = True

    verified_by_phone = False
    verified_by_email = False
    if otp_row and otp_row.used:
        if otp_row.channel == "SMS":
            verified_by_phone = True
        elif otp_row.channel == "EMAIL":
            verified_by_email = True

    user = User(
        email=email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        phone=norm_phone,
        phone_verified=verified_by_phone,
        email_verified=verified_by_email,
    )
    db.add(user)
    db.flush()
    audit(db, "auth.register", user_id=user.id, resource_type="user", resource_id=user.id, request=request)

    if user.email and not user.email_verified:
        v_token = create_verification_token(str(user.id), user.email)
        notify(db, "verify_email", user.email, user_id=user.id, name=user.full_name, token=v_token)
    elif user.phone and not user.phone_verified:
        send_sms(
            recipient=user.phone,
            message=f"Welcome to Aqivo, {user.full_name}! Your store account has been created. Start building your store at aqivo.shop",
        )

    db.commit()
    _set_refresh(response, user)
    return TokenOut(access_token=create_access_token(str(user.id), user.token_version))


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
    return TokenOut(access_token=create_access_token(str(user.id), user.token_version))


@router.post("/login", response_model=TokenOut, dependencies=[Depends(rate_limit("login", 20, 300))])
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    s = get_settings()
    raw_id = (body.identifier or body.email or body.phone or "").strip()
    if not raw_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email or phone number is required")

    user = None
    if "@" in raw_id:
        user = db.scalars(select(User).where(User.email == raw_id.lower(), User.deleted_at.is_(None))).first()
    else:
        norm = clean_phone(raw_id)
        phone_variants = {raw_id, norm, f"+{norm}"}
        if norm.startswith("254") and len(norm) == 12:
            phone_variants.add("0" + norm[3:])
            phone_variants.add(norm[3:])
        user = db.scalars(
            select(User).where(
                User.phone.in_(phone_variants),
                User.deleted_at.is_(None),
            ).order_by(User.last_login_at.desc().nullslast(), User.created_at.desc())
        ).first()

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
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email, phone number, or password")
    user.failed_logins, user.locked_until, user.last_login_at = 0, None, now
    audit(db, "auth.login", user_id=user.id, request=request)
    db.commit()
    _set_refresh(response, user)
    return TokenOut(access_token=create_access_token(str(user.id), user.token_version))


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
    return TokenOut(access_token=create_access_token(str(user.id), user.token_version))


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    auth_h = request.headers.get("authorization", "")
    if auth_h.lower().startswith("bearer "):
        try:
            claims = decode_token(auth_h.split(" ", 1)[1], "access")
            uid = uuid.UUID(claims["sub"])
            user = db.get(User, uid)
            if user and not user.deleted_at:
                user.token_version += 1
                db.commit()
        except Exception:
            pass

    refresh_tok = request.cookies.get(COOKIE)
    if refresh_tok:
        try:
            claims = decode_token(refresh_tok, "refresh")
            uid = uuid.UUID(claims["sub"])
            user = db.get(User, uid)
            if user and not user.deleted_at:
                user.token_version += 1
                db.commit()
        except Exception:
            pass

    response.delete_cookie(COOKIE, path="/api/v1/auth")
    response.delete_cookie(COOKIE, path="/")


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


@router.patch("/me", response_model=UserOut)
def update_profile(body: ProfileUpdateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.full_name is not None and body.full_name.strip():
        user.full_name = body.full_name.strip()
    if body.locale is not None and body.locale.strip():
        user.locale = body.locale.strip()
    if body.phone is not None:
        raw_phone = body.phone.strip()
        norm = clean_phone(raw_phone) if raw_phone else None
        if norm != user.phone:
            user.phone = norm
            user.phone_verified = False  # Phone change requires fresh verification
    db.commit()
    return UserOut.model_validate(user)


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


@router.post("/forgot-password-phone", status_code=202, dependencies=[Depends(rate_limit("forgot_phone", 5, 900))])
def forgot_password_phone(body: ForgotPhoneIn, db: Session = Depends(get_db)):
    raw_phone = body.phone.strip()
    norm = clean_phone(raw_phone)
    phone_variants = {raw_phone, norm, f"+{norm}"}
    if norm.startswith("254") and len(norm) == 12:
        phone_variants.add("0" + norm[3:])
        phone_variants.add(norm[3:])
    user = db.scalars(
        select(User).where(
            User.phone.in_(phone_variants),
            User.deleted_at.is_(None),
        ).order_by(User.last_login_at.desc().nullslast(), User.created_at.desc())
    ).first()

    if user and user.is_active:
        code = generate_otp()
        target_phone = user.phone or norm
        user.phone = target_phone
        user.phone_otp_hash = hash_otp(target_phone, code)
        user.phone_otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        db.commit()
        send_sms(
            recipient=target_phone,
            message=f"Your Aqivo password reset code is {code}. It expires in 10 minutes. Do not share this code.",
        )
    return {"message": "If that phone number has an account, a verification code has been sent via SMS.", "phone": norm}


@router.post("/reset-password-phone", dependencies=[Depends(rate_limit("reset_phone", 10, 900))])
def reset_password_phone(body: ResetPhoneIn, response: Response, db: Session = Depends(get_db)):
    raw_phone = body.phone.strip()
    norm = clean_phone(raw_phone)
    phone_variants = {raw_phone, norm, f"+{norm}"}
    if norm.startswith("254") and len(norm) == 12:
        phone_variants.add("0" + norm[3:])
        phone_variants.add(norm[3:])
    user = db.scalars(
        select(User).where(
            User.phone.in_(phone_variants),
            User.deleted_at.is_(None),
        ).order_by(User.last_login_at.desc().nullslast(), User.created_at.desc())
    ).first()
    if not user or not user.is_active:
        raise bad_request("Account not found for this phone number")

    if not user.phone_otp_expires_at or user.phone_otp_expires_at < datetime.now(timezone.utc):
        raise bad_request("Verification code has expired. Please request a new code.")

    target_phone = user.phone or norm
    expected_hash = hash_otp(target_phone, body.code.strip())
    if not user.phone_otp_hash or user.phone_otp_hash != expected_hash:
        raise bad_request("Invalid verification code")

    user.password_hash = hash_password(body.new_password)
    user.token_version += 1
    user.failed_logins, user.locked_until = 0, None
    user.phone_otp_hash = None
    user.phone_otp_expires_at = None
    user.phone_verified = True
    audit(db, "auth.password_reset_phone", user_id=user.id)
    db.commit()

    acc = create_access_token(str(user.id), user.token_version)
    _set_refresh(response, user)
    return {
        "message": "Password reset successfully",
        "access_token": acc,
        "user": UserOut.model_validate(user),
    }


@router.post("/verify-email", dependencies=[Depends(rate_limit("verify_email", 15, 900))])
def verify_email(body: VerifyEmailIn, response: Response, db: Session = Depends(get_db)):
    try:
        claims = decode_token(body.token, "verify_email")
        sub = claims.get("sub")
        try:
            uid = uuid.UUID(str(sub)) if sub else None
        except (ValueError, TypeError):
            uid = None
        user = db.get(User, uid) if uid else None
        if not user and claims.get("email"):
            user = db.scalars(select(User).where(User.email == str(claims["email"]).lower(), User.deleted_at.is_(None))).first()
    except (jwt.PyJWTError, ValueError, KeyError):
        raise bad_request("This verification link is invalid or has expired")
    if not user or user.deleted_at or not user.is_active:
        raise bad_request("This verification link is invalid or has expired")
    if not user.email_verified:
        user.email_verified = True
        audit(db, "auth.email_verified", user_id=user.id)
        db.commit()

    # Automatically issue access token & refresh cookie so user is logged in
    acc = create_access_token(str(user.id), user.token_version)
    _set_refresh(response, user)
    return {
        "message": "Email verified successfully",
        "email_verified": True,
        "access_token": acc,
        "user": UserOut.model_validate(user),
    }


@router.get("/verify-email")
def verify_email_link(token: str, db: Session = Depends(get_db)):
    """Handles direct browser clicks from the verification email link."""
    from fastapi.responses import HTMLResponse, RedirectResponse
    s = get_settings()
    try:
        claims = decode_token(token, "verify_email")
        sub = claims.get("sub")
        try:
            uid = uuid.UUID(str(sub)) if sub else None
        except (ValueError, TypeError):
            uid = None
        user = db.get(User, uid) if uid else None
        if not user and claims.get("email"):
            user = db.scalars(select(User).where(User.email == str(claims["email"]).lower(), User.deleted_at.is_(None))).first()
    except (jwt.PyJWTError, ValueError, KeyError):
        return HTMLResponse(
            "<html><body style='font-family:-apple-system,sans-serif;text-align:center;padding:48px;background:#f8fafc;'>"
            "<div style='max-width:440px;margin:40px auto;background:#fff;padding:36px;border-radius:12px;border:1px solid #e2e8f0;'>"
            "<h2 style='color:#e11d48;margin-top:0;'>Invalid or Expired Link</h2>"
            "<p style='color:#475569;'>This verification link is no longer valid or has expired.</p>"
            f"<a href='{s.app_base_url}/login' style='display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;'>Return to Sign In</a>"
            "</div></body></html>",
            status_code=400,
        )
    if not user or user.deleted_at or not user.is_active:
        return HTMLResponse("<html><body><h2>User account not found.</h2></body></html>", status_code=400)
    if not user.email_verified:
        user.email_verified = True
        audit(db, "auth.email_verified", user_id=user.id)
        db.commit()
    redir = RedirectResponse(f"{s.app_base_url}/dashboard?verified=true", status_code=302)
    _set_refresh(redir, user)
    return redir


@router.post("/resend-verification", dependencies=[Depends(rate_limit("resend_verify", 5, 900))])
def resend_verification(body: ResendVerificationIn, db: Session = Depends(get_db)):
    email = body.email.lower() if body.email else None
    if email:
        user = db.scalars(select(User).where(User.email == email, User.deleted_at.is_(None))).first()
        if user and not user.email_verified:
            v_token = create_verification_token(str(user.id), user.email)
            notify(db, "verify_email", user.email, user_id=user.id, name=user.full_name, token=v_token)
            db.commit()
    return {"message": "If that email is registered and unverified, a verification link has been sent."}


def _resolve_user_for_phone_flow(
    authorization: str | None,
    email: str | None,
    phone: str | None,
    db: Session,
) -> User | None:
    if authorization and authorization.lower().startswith("bearer "):
        try:
            claims = decode_token(authorization.split(" ", 1)[1], "access")
            uid = uuid.UUID(claims["sub"])
            user = db.get(User, uid)
            if user and not user.deleted_at and user.is_active:
                if claims.get("tv") is not None and claims.get("tv") == user.token_version:
                    return user
        except Exception:
            pass
    if email:
        user = db.scalars(select(User).where(User.email == email.lower(), User.deleted_at.is_(None))).first()
        if user and user.is_active:
            return user
    if phone:
        norm = clean_phone(phone)
        user = db.scalars(select(User).where(User.phone == norm, User.deleted_at.is_(None))).first()
        if user and user.is_active:
            return user
    return None


@router.post("/request-phone-code", dependencies=[Depends(rate_limit("phone_otp_req", 5, 900))])
def request_phone_code(
    body: RequestPhoneCodeIn,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    user = _resolve_user_for_phone_flow(authorization, body.email, body.phone, db)
    if not user:
        raise bad_request("User account not found. Please sign in or provide a registered email.")

    target_phone = body.phone or user.phone
    if not target_phone:
        raise bad_request("Phone number is required")
    norm_phone = clean_phone(target_phone)
    if len(norm_phone) < 9:
        raise bad_request("Invalid phone number format")

    code = generate_otp()
    user.phone = norm_phone
    user.phone_otp_hash = hash_otp(norm_phone, code)
    user.phone_otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    user.phone_verified = False
    db.commit()

    sms_res = send_sms(
        recipient=norm_phone,
        message=f"Your Aqivo verification code is {code}. It expires in 10 minutes. Do not share this code.",
    )
    if sms_res.get("status") == "error":
        log.warning("Failed to dispatch phone verification SMS to %s: %s", norm_phone, sms_res.get("message"))

    return {"message": "Verification code sent to your phone", "phone": norm_phone}


@router.post("/verify-phone", dependencies=[Depends(rate_limit("phone_otp_verify", 10, 900))])
def verify_phone(
    body: VerifyPhoneIn,
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    user = _resolve_user_for_phone_flow(authorization, body.email, body.phone, db)
    if not user:
        raise bad_request("User account not found")

    target_phone = body.phone or user.phone
    if not target_phone:
        raise bad_request("Phone number is required")
    norm_phone = clean_phone(target_phone)

    if not user.phone_otp_expires_at or user.phone_otp_expires_at < datetime.now(timezone.utc):
        raise bad_request("Verification code has expired. Please request a new code.")

    expected_hash = hash_otp(norm_phone, body.code.strip())
    if not user.phone_otp_hash or user.phone_otp_hash != expected_hash:
        raise bad_request("Invalid verification code")

    user.phone = norm_phone
    user.phone_verified = True
    user.phone_otp_hash = None
    user.phone_otp_expires_at = None
    audit(db, "auth.phone_verified", user_id=user.id, request=request)
    db.commit()

    return {"message": "Phone number verified successfully", "phone_verified": True, "phone": norm_phone}

