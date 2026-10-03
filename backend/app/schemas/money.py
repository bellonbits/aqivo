import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import PaymentStatus
from app.schemas.common import ORM, Money


class PaymentIn(BaseModel):
    amount: Money
    method: str = Field(default="CASH", pattern="^(CASH|MPESA|CARD|BANK|OTHER)$")
    customer_id: uuid.UUID | None = None
    booking_id: uuid.UUID | None = None
    invoice_id: uuid.UUID | None = None
    provider_reference: str | None = Field(default=None, max_length=120)
    payer_phone: str | None = Field(default=None, max_length=32)
    note: str = Field(default="", max_length=300)
    status: PaymentStatus = PaymentStatus.PAID


class PaymentUpdate(BaseModel):
    status: PaymentStatus


class PaymentOut(ORM):
    id: uuid.UUID
    customer_id: uuid.UUID | None
    booking_id: uuid.UUID | None
    invoice_id: uuid.UUID | None
    amount: Decimal
    currency: str
    method: str
    provider: str
    provider_reference: str | None
    status: str
    note: str
    paid_at: datetime | None
    created_at: datetime


class InvoiceItemIn(BaseModel):
    description: str = Field(min_length=1, max_length=255)
    quantity: int = Field(default=1, ge=1, le=1000)
    unit_price: Money


class InvoiceIn(BaseModel):
    customer_id: uuid.UUID | None = None
    booking_id: uuid.UUID | None = None
    customer_name: str | None = Field(default=None, max_length=160)
    customer_phone: str | None = Field(default=None, max_length=32)
    items: list[InvoiceItemIn] = Field(min_length=1, max_length=50)
    discount: Money = Decimal("0")
    apply_tax: bool = False
    due_on: date | None = None
    notes: str = Field(default="", max_length=1000)


class InvoiceItemOut(ORM):
    description: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class InvoiceOut(ORM):
    id: uuid.UUID
    number: str
    customer_id: uuid.UUID | None
    customer_name: str
    customer_phone: str | None
    currency: str
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal
    payment_status: str
    issued_on: date
    due_on: date | None
    notes: str
    items: list[InvoiceItemOut]


class CheckoutIn(BaseModel):
    plan_key: str
    phone: str | None = Field(default=None, max_length=32)
    provider: str = "MPESA"


class PlanOut(ORM):
    key: str
    name: str
    description: str
    prices: dict
    features: list
    highlights: list
    billing_interval_days: int
    position: int


class CampaignIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    kind: str = "WHATSAPP"
    message_template: str = Field(min_length=1, max_length=1000)
    audience: dict = Field(default_factory=lambda: {"type": "all"})
    by_ai: bool = False


class CampaignOut(ORM):
    id: uuid.UUID
    name: str
    kind: str
    status: str
    message_template: str
    audience: dict
    created_by_ai: bool
    sent_at: datetime | None
    created_at: datetime
    recipient_count: int = 0
    sent_count: int = 0
    slug: str | None = None
    objective: str | None = None
    offer_text: str = ""
    discount_code: str | None = None
    target_type: str | None = None
    target_ref: str | None = None
    channels: list = []
    content: dict = {}
    starts_on: date | None = None
    ends_on: date | None = None


class AskIn(BaseModel):
    question: str = Field(min_length=1, max_length=500)


class ActionIn(BaseModel):
    type: str
    payload: dict
    confirmed: bool = False


class GrowthCampaignIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    objective: str = Field(pattern="^(BOOKINGS|SALES|LEADS|REVIEWS|WINBACK|AWARENESS)$")
    offer_text: str = Field(default="", max_length=300)
    discount_code: str | None = Field(default=None, max_length=32)
    target_type: str = "storefront"
    target_ref: str | None = None
    channels: list[str] = Field(default_factory=lambda: ["whatsapp", "instagram"], max_length=8)
    starts_on: date | None = None
    ends_on: date | None = None
    audience: dict | None = None  # optional WhatsApp broadcast list


class GrowthCampaignUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=160)
    offer_text: str | None = Field(default=None, max_length=300)
    discount_code: str | None = Field(default=None, max_length=32)
    channels: list[str] | None = Field(default=None, max_length=8)
    starts_on: date | None = None
    ends_on: date | None = None
    content: dict | None = None


class LinkIn(BaseModel):
    target_type: str
    target_ref: str | None = None
    source: str = Field(max_length=48)
    campaign: str | None = Field(default=None, max_length=64)


class QRIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    target_type: str = "storefront"
    target_ref: str | None = None
    headline: str = Field(default="", max_length=80)
