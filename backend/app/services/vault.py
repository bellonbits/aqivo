"""Encrypts a business's third-party credentials at rest (Fernet, key derived from SECRET_KEY). The API only ever returns masked hints."""
from __future__ import annotations

import base64
import hashlib
import json

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


def _fernet() -> Fernet:
    key = hashlib.sha256(("bizora-vault|" + get_settings().secret_key).encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def seal(data: dict) -> str:
    return _fernet().encrypt(json.dumps(data).encode()).decode()


def unseal(blob: str | None) -> dict:
    if not blob:
        return {}
    try:
        return json.loads(_fernet().decrypt(blob.encode()))
    except (InvalidToken, ValueError):
        return {}  # key rotated or data damaged: treat as not connected rather than crash


def mask(v: str) -> str:
    v = str(v or "")
    return "•" * 6 + v[-4:] if len(v) > 8 else "•" * len(v)
