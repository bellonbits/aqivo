import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.countries import COUNTRIES, SUPPORTED_LOCALES
from app.schemas.common import ORM, Money, Name


class BusinessCreate(BaseModel):
    name: Name
    industry: str = "beauty"
    category: str | None = Field(default=None, max_length=64)
    country_code: str = Field(default="KE", min_length=2, max_length=2)
    city: str = Field(default="", max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    whatsapp: str | None = Field(default=None, max_length=32)
    description: str = Field(default="", max_length=2000)
    slug: str | None = Field(default=None, max_length=40)
    template_key: str | None = None
    referral_code: str | None = Field(default=None, max_length=16)

    @field_validator("industry")
    @classmethod
    def _ind(cls, v: str) -> str:
        from app.services.industries import INDUSTRIES
        if v not in INDUSTRIES:
            raise ValueError("Unsupported industry")
        return v

    @field_validator("country_code")
    @classmethod
    def _cc(cls, v: str) -> str:
        v = v.upper()
        if v not in COUNTRIES:
            raise ValueError("Unsupported country")
        return v


class BusinessUpdate(BaseModel):
    name: Name | None = None
    category: str | None = Field(default=None, max_length=64)
    description: str | None = Field(default=None, max_length=2000)
    tagline: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=32)
    whatsapp: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    city: str | None = Field(default=None, max_length=120)
    address: str | None = Field(default=None, max_length=255)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)
    opening_hours: dict | None = None
    blocked_dates: list[str] | None = None
    slot_interval_minutes: int | None = Field(default=None, ge=15, le=240)
    booking_lead_hours: int | None = Field(default=None, ge=0, le=168)
    primary_color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    social_links: dict[str, str] | None = None
    whatsapp_greeting: str | None = Field(default=None, max_length=300)
    whatsapp_default_message: str | None = Field(default=None, max_length=500)
    locale: str | None = None
    slug: str | None = Field(default=None, max_length=40)

    @field_validator("locale")
    @classmethod
    def _loc(cls, v):
        if v is not None and v not in SUPPORTED_LOCALES:
            raise ValueError("Unsupported language")
        return v

    @field_validator("social_links")
    @classmethod
    def _social(cls, v):
        if v is None:
            return v
        out = {}
        for k, url in v.items():
            if k not in ("instagram", "facebook", "tiktok", "x", "youtube", "website"):
                continue
            url = url.strip()
            if url and not url.lower().startswith(("https://", "http://")):
                raise ValueError(f"{k}: enter a full link starting with https://")
            out[k] = url[:300]
        return out


class BusinessOut(ORM):
    id: uuid.UUID
    name: str
    slug: str
    industry: str
    category: str
    description: str
    tagline: str
    phone: str | None
    whatsapp: str | None
    email: str | None
    country_code: str
    currency: str
    locale: str
    timezone: str
    city: str
    address: str
    latitude: Decimal | None
    longitude: Decimal | None
    opening_hours: dict
    blocked_dates: list
    slot_interval_minutes: int
    booking_lead_hours: int
    logo_url: str | None
    primary_color: str
    secondary_color: str
    social_links: dict
    whatsapp_greeting: str
    whatsapp_default_message: str
    status: str
    is_demo: bool
    referral_code: str | None
    onboarding_completed: bool
    created_at: datetime


class MemberInvite(BaseModel):
    email: EmailStr
    full_name: Name
    role: str = Field(pattern="^(BUSINESS_ADMIN|BUSINESS_MANAGER|SALES|EDITOR|STAFF)$")
    staff_id: uuid.UUID | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
