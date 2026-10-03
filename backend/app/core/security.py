import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

from app.core.config import get_settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode()[:72], hashed.encode())
    except ValueError:
        return False


def _encode(payload: dict[str, Any], minutes: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {**payload, "iat": now, "exp": now + timedelta(minutes=minutes)}
    return jwt.encode(payload, get_settings().secret_key, algorithm="HS256")


def create_access_token(user_id: str, extra: dict[str, Any] | None = None, minutes: int | None = None) -> str:
    s = get_settings()
    return _encode({"sub": user_id, "typ": "access", **(extra or {})}, minutes or s.access_token_minutes)


def create_refresh_token(user_id: str, token_version: int) -> str:
    s = get_settings()
    return _encode({"sub": user_id, "typ": "refresh", "tv": token_version}, s.refresh_token_days * 24 * 60)


def decode_token(token: str, expected_type: str) -> dict[str, Any]:
    payload = jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])
    if payload.get("typ") != expected_type:
        raise jwt.InvalidTokenError("wrong token type")
    return payload


def random_token(nbytes: int = 24) -> str:
    return secrets.token_urlsafe(nbytes)


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()
