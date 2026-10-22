import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas.common import ORM, Name


class RegisterIn(BaseModel):
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    identifier: str | None = Field(default=None, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: Name

    @field_validator("email", mode="before")
    @classmethod
    def clean_email(cls, v):
        if not v or not str(v).strip():
            return None
        return str(v).strip().lower()

    @field_validator("phone", mode="before")
    @classmethod
    def clean_phone_val(cls, v):
        if not v or not str(v).strip():
            return None
        return str(v).strip()

    @model_validator(mode="after")
    def validate_contact(self):
        if self.identifier and self.identifier.strip():
            raw = self.identifier.strip()
            if "@" in raw:
                if not self.email:
                    self.email = raw.lower()
            else:
                if not self.phone:
                    self.phone = raw
        if not self.email and not self.phone:
            raise ValueError("Please provide either an email address or a phone number.")
        if self.email and ("@" not in self.email or "." not in self.email):
            raise ValueError("Invalid email address format.")
        return self


class LoginIn(BaseModel):
    email: str | None = Field(default=None, max_length=255)
    identifier: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    password: str = Field(max_length=128)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MembershipOut(ORM):
    business_id: uuid.UUID
    role: str


class UserOut(ORM):
    id: uuid.UUID
    email: str | None = None
    full_name: str
    phone: str | None = None
    platform_role: str | None = None
    locale: str = "en"
    email_verified: bool = False
    phone_verified: bool = False


class MeOut(BaseModel):
    user: UserOut
    memberships: list[dict]
    impersonating: bool = False
    impersonated_business_id: uuid.UUID | None = None


class PasswordChangeIn(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPhoneIn(BaseModel):
    phone: str = Field(min_length=6, max_length=32)


class ResetPhoneIn(BaseModel):
    phone: str = Field(min_length=6, max_length=32)
    code: str = Field(min_length=4, max_length=10)
    new_password: str = Field(min_length=8, max_length=128)


class VerifyEmailIn(BaseModel):
    token: str


class ResendVerificationIn(BaseModel):
    email: EmailStr | None = None


class RequestPhoneCodeIn(BaseModel):
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None


class VerifyPhoneIn(BaseModel):
    code: str = Field(min_length=4, max_length=8)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None


class ProfileUpdateIn(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=160)
    phone: str | None = Field(default=None, max_length=32)
    locale: str | None = Field(default=None, max_length=8)
