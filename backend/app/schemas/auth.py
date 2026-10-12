import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORM, Name


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: Name
    phone: str | None = Field(default=None, max_length=32)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MembershipOut(ORM):
    business_id: uuid.UUID
    role: str


class UserOut(ORM):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    phone: str | None
    platform_role: str | None
    locale: str
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
