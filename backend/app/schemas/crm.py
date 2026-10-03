import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import BookingStatus, LeadSource, LeadStatus
from app.schemas.common import ORM, Name


class LeadIn(BaseModel):
    name: Name
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    message: str = Field(default="", max_length=2000)
    source: LeadSource = LeadSource.OTHER
    service_id: uuid.UUID | None = None


class LeadUpdate(BaseModel):
    status: LeadStatus | None = None
    name: Name | None = None
    message: str | None = Field(default=None, max_length=2000)


class LeadOut(ORM):
    id: uuid.UUID
    name: str
    phone: str | None
    email: str | None
    message: str
    source: str
    service_id: uuid.UUID | None
    service_name: str | None
    status: str
    created_at: datetime


class CustomerIn(BaseModel):
    name: Name
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    birthday: date | None = None
    notes: str = Field(default="", max_length=4000)
    source: str = "WALK_IN"


class CustomerUpdate(BaseModel):
    name: Name | None = None
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    birthday: date | None = None
    notes: str | None = Field(default=None, max_length=4000)
    whatsapp_opt_out: bool | None = None


class CustomerOut(ORM):
    id: uuid.UUID
    name: str
    phone: str | None
    email: str | None
    birthday: date | None
    notes: str
    source: str
    whatsapp_opt_out: bool
    last_contacted_at: datetime | None
    created_at: datetime
    total_bookings: int = 0
    completed_bookings: int = 0
    total_spent: Decimal = Decimal("0")
    last_visit: datetime | None = None
    next_booking: datetime | None = None
    favourite_service: str | None = None
    total_orders: int = 0
    acquisition_source: str | None = None
    acquisition_campaign: str | None = None


class NoteIn(BaseModel):
    kind: str = Field(default="NOTE", pattern="^(NOTE|WHATSAPP|CALL|SMS|EMAIL)$")
    body: str = Field(min_length=1, max_length=2000)


class NoteOut(ORM):
    id: uuid.UUID
    kind: str
    body: str
    created_at: datetime


class BookingIn(BaseModel):
    service_ids: list[uuid.UUID] = Field(min_length=1)
    starts_at: datetime
    customer_id: uuid.UUID | None = None
    customer_name: str | None = Field(default=None, max_length=160)
    customer_phone: str | None = Field(default=None, max_length=32)
    staff_id: uuid.UUID | None = None
    notes: str = Field(default="", max_length=1000)
    source: str = "WALK_IN"
    ignore_availability: bool = False


class BookingUpdate(BaseModel):
    status: BookingStatus | None = None
    notes: str | None = Field(default=None, max_length=1000)
    staff_id: uuid.UUID | None = None
    starts_at: datetime | None = None


class BookingItemOut(ORM):
    service_id: uuid.UUID | None
    name: str
    price: Decimal
    duration_minutes: int


class BookingOut(ORM):
    id: uuid.UUID
    customer_id: uuid.UUID | None
    staff_id: uuid.UUID | None
    customer_name: str
    customer_phone: str | None
    starts_at: datetime
    ends_at: datetime
    status: str
    source: str
    total_amount: Decimal
    currency: str
    notes: str
    review_requested_at: datetime | None
    items: list[BookingItemOut]


class ReviewOut(ORM):
    id: uuid.UUID
    author_name: str
    rating: int
    comment: str
    verified: bool
    is_published: bool
    response: str | None
    responded_at: datetime | None
    created_at: datetime


class ReviewRespond(BaseModel):
    response: str = Field(min_length=1, max_length=1000)


class ReviewRequestIn(BaseModel):
    booking_id: uuid.UUID | None = None
    customer_id: uuid.UUID | None = None


# ---- public (unauthenticated) inputs
class PublicBookingIn(BaseModel):
    service_ids: list[uuid.UUID] = Field(min_length=1, max_length=8)
    starts_at: datetime
    name: Name
    phone: str = Field(min_length=5, max_length=32)
    notes: str = Field(default="", max_length=500)
    source: str | None = Field(default=None, max_length=48)
    campaign: str | None = Field(default=None, max_length=64)
    referrer: str | None = Field(default=None, max_length=300)
    website: str = ""  # honeypot


class PublicLeadIn(BaseModel):
    name: Name
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    message: str = Field(default="", max_length=1500)
    service_id: uuid.UUID | None = None
    source: str = "WEBSITE"
    campaign: str | None = Field(default=None, max_length=64)
    referrer: str | None = Field(default=None, max_length=300)
    website: str = ""


class PublicReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    name: Name
    comment: str = Field(default="", max_length=1500)
    token: str | None = Field(default=None, max_length=64)
    product_id: uuid.UUID | None = None
    website: str = ""


class PublicEventIn(BaseModel):
    event_type: str
    service_id: uuid.UUID | None = None
    product_id: uuid.UUID | None = None
    source: str | None = Field(default=None, max_length=48)
    campaign: str | None = Field(default=None, max_length=64)
    session_id: str | None = Field(default=None, max_length=40)
    path: str | None = Field(default=None, max_length=200)
    referrer: str | None = Field(default=None, max_length=300)
