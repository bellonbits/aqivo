import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORM, Money


class OptionIn(BaseModel):
    name: str = Field(min_length=1, max_length=30)
    values: list[str] = Field(min_length=1, max_length=40)


class OptionsIn(BaseModel):
    options: list[OptionIn] = Field(max_length=3)


class VariantUpdate(BaseModel):
    sku: str | None = Field(default=None, max_length=64)
    price: Money | None = None
    compare_at_price: Money | None = None
    image_url: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None
    stock_qty: int | None = Field(default=None, ge=0, le=1_000_000)
    clear_price: bool = False


class VariantOut(ORM):
    id: uuid.UUID
    product_id: uuid.UUID
    title: str
    options: dict
    sku: str | None
    price: Decimal | None
    compare_at_price: Decimal | None
    stock_qty: int
    image_url: str | None
    is_active: bool
    position: int


class AdjustIn(BaseModel):
    product_id: uuid.UUID
    variant_id: uuid.UUID | None = None
    delta: int | None = Field(default=None, ge=-1_000_000, le=1_000_000)
    set_to: int | None = Field(default=None, ge=0, le=1_000_000)
    reason: Literal["RESTOCK", "ADJUSTMENT", "RETURN"] = "ADJUSTMENT"
    note: str = Field(default="", max_length=200)


class MovementOut(ORM):
    id: uuid.UUID
    product_id: uuid.UUID | None
    variant_id: uuid.UUID | None
    product_name: str
    delta: int
    qty_after: int
    reason: str
    note: str
    order_id: uuid.UUID | None
    created_at: datetime


class OrderItemOut(ORM):
    id: uuid.UUID
    kind: str
    product_id: uuid.UUID | None
    variant_id: uuid.UUID | None
    name: str
    variant_title: str | None
    image_url: str | None
    unit_price: Decimal
    quantity: int
    line_total: Decimal


class OrderEventOut(ORM):
    id: uuid.UUID
    kind: str
    status: str | None
    message: str
    created_at: datetime


class OrderOut(ORM):
    id: uuid.UUID
    number: int
    token: str
    customer_id: uuid.UUID | None
    customer_name: str
    customer_phone: str | None
    customer_email: str | None
    delivery_method: str
    delivery_zone: str | None
    address: str
    notes: str
    scheduled_for: str | None = None
    status: str
    payment_method: str
    payment_status: str
    currency: str
    subtotal: Decimal
    discount: Decimal
    delivery_fee: Decimal
    tax: Decimal
    total: Decimal
    discount_code: str | None
    source: str | None
    channel: str
    created_at: datetime
    items: list[OrderItemOut]
    events: list[OrderEventOut]
    payment_reference: str | None = None
    payment_provider: str | None = None
    courier_name: str | None = None
    courier_phone: str | None = None
    tracking_url: str | None = None


class DeliveryIn(BaseModel):
    courier_name: str | None = Field(default=None, max_length=120)
    courier_phone: str | None = Field(default=None, max_length=32)
    tracking_url: str | None = Field(default=None, max_length=500)


class StatusIn(BaseModel):
    status: str
    note: str = Field(default="", max_length=200)


class PaidIn(BaseModel):
    reference: str | None = Field(default=None, max_length=60)


class RefundIn(BaseModel):
    restock: bool = True
    note: str = Field(default="", max_length=200)


class NoteIn(BaseModel):
    message: str = Field(min_length=1, max_length=300)


class ManualLine(BaseModel):
    kind: Literal["product", "service"] = "product"
    id: uuid.UUID
    variant_id: uuid.UUID | None = None
    qty: int = Field(ge=1, le=99)


class ManualOrderIn(BaseModel):
    lines: list[ManualLine] = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    email: str | None = Field(default=None, max_length=200)
    delivery_method: Literal["PICKUP", "DELIVERY"] = "PICKUP"
    zone: str | None = Field(default=None, max_length=80)
    address: str = Field(default="", max_length=400)
    notes: str = Field(default="", max_length=600)
    scheduled_for: str | None = Field(default=None, max_length=16)
    payment: str = Field(default="cash", max_length=16)
    code: str | None = Field(default=None, max_length=32)
    channel: Literal["WHATSAPP", "WEBSITE"] = "WHATSAPP"


class DiscountIn(BaseModel):
    code: str = Field(min_length=3, max_length=32)
    description: str = Field(default="", max_length=160)
    type: Literal["PERCENT", "FIXED", "FREE_DELIVERY"] = "PERCENT"
    value: Money = Decimal("0")
    min_order: Money | None = None
    product_ids: list[uuid.UUID] = Field(default_factory=list, max_length=200)
    category_ids: list[uuid.UUID] = Field(default_factory=list, max_length=50)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    usage_limit: int | None = Field(default=None, ge=1, le=1_000_000)
    once_per_customer: bool = False
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def _code(cls, v: str) -> str:
        c = "".join(ch for ch in v.upper().strip() if ch.isalnum() or ch in "-_")
        if len(c) < 3:
            raise ValueError("Use at least 3 letters or numbers")
        return c


class DiscountUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=160)
    type: Literal["PERCENT", "FIXED", "FREE_DELIVERY"] | None = None
    value: Money | None = None
    min_order: Money | None = None
    product_ids: list[uuid.UUID] | None = None
    category_ids: list[uuid.UUID] | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    usage_limit: int | None = Field(default=None, ge=1, le=1_000_000)
    once_per_customer: bool | None = None
    is_active: bool | None = None


class DiscountOut(ORM):
    id: uuid.UUID
    code: str
    description: str
    type: str
    value: Decimal
    min_order: Decimal | None
    product_ids: list
    category_ids: list
    starts_at: datetime | None
    ends_at: datetime | None
    usage_limit: int | None
    used_count: int
    once_per_customer: bool
    is_active: bool
