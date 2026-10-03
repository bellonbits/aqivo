import uuid
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORM, Money, Name


def _clean_urls(v: list[str]) -> list[str]:
    for u in v:
        if not u.startswith(("/", "https://", "http://")):
            raise ValueError("Image links must start with / or https://")
    return v


class ProductIn(BaseModel):
    name: Name
    short_description: str = Field(default="", max_length=300)
    description: str = Field(default="", max_length=5000)
    price: Money
    compare_at_price: Money | None = None
    cost_price: Money | None = None
    category_id: uuid.UUID | None = None
    images: list[str] = Field(default_factory=list, max_length=12)
    video_url: str | None = Field(default=None, max_length=500)
    sku: str | None = Field(default=None, max_length=64)
    barcode: str | None = Field(default=None, max_length=64)
    tags: list[str] = Field(default_factory=list, max_length=20)
    is_digital: bool = False
    track_stock: bool = False
    stock_qty: int = Field(default=0, ge=0, le=1_000_000)
    low_stock_threshold: int = Field(default=3, ge=0, le=10_000)
    weight_grams: int | None = Field(default=None, ge=0, le=1_000_000)
    status: Literal["ACTIVE", "DRAFT", "ARCHIVED"] = "ACTIVE"
    featured: bool = False
    seo_title: str | None = Field(default=None, max_length=200)
    seo_description: str | None = Field(default=None, max_length=320)

    _imgs = field_validator("images")(_clean_urls)

    @field_validator("tags")
    @classmethod
    def _tags(cls, v: list[str]) -> list[str]:
        return [t.strip()[:30] for t in v if t.strip()][:20]


class ProductUpdate(BaseModel):
    name: Name | None = None
    short_description: str | None = Field(default=None, max_length=300)
    description: str | None = Field(default=None, max_length=5000)
    price: Money | None = None
    compare_at_price: Money | None = None
    cost_price: Money | None = None
    category_id: uuid.UUID | None = None
    images: list[str] | None = Field(default=None, max_length=12)
    video_url: str | None = Field(default=None, max_length=500)
    sku: str | None = Field(default=None, max_length=64)
    barcode: str | None = Field(default=None, max_length=64)
    tags: list[str] | None = Field(default=None, max_length=20)
    is_digital: bool | None = None
    track_stock: bool | None = None
    stock_qty: int | None = Field(default=None, ge=0, le=1_000_000)
    low_stock_threshold: int | None = Field(default=None, ge=0, le=10_000)
    weight_grams: int | None = Field(default=None, ge=0, le=1_000_000)
    status: Literal["ACTIVE", "DRAFT", "ARCHIVED"] | None = None
    featured: bool | None = None
    seo_title: str | None = Field(default=None, max_length=200)
    seo_description: str | None = Field(default=None, max_length=320)

    _imgs = field_validator("images")(lambda v: v if v is None else _clean_urls(v))

    @field_validator("tags")
    @classmethod
    def _tags(cls, v: list[str] | None) -> list[str] | None:
        return v if v is None else [t.strip()[:30] for t in v if t.strip()][:20]


class ProductOut(ORM):
    id: uuid.UUID
    name: str
    slug: str
    short_description: str
    description: str
    price: Decimal
    compare_at_price: Decimal | None
    cost_price: Decimal | None
    currency: str
    category_id: uuid.UUID | None
    images: list[str]
    video_url: str | None
    sku: str | None
    barcode: str | None
    tags: list[str]
    is_digital: bool
    track_stock: bool
    stock_qty: int
    low_stock_threshold: int
    weight_grams: int | None
    status: str
    featured: bool
    position: int
    seo_title: str | None
    seo_description: str | None
    options: list = []
    variant_count: int = 0
    total_stock: int | None = None


def _clean_url(v: str | None) -> str | None:
    if v and not v.startswith(("/", "https://", "http://")):
        raise ValueError("Image links must start with / or https://")
    return v or None


class CategoryIn2(BaseModel):
    name: Name
    description: str = Field(default="", max_length=500)
    image_url: str | None = Field(default=None, max_length=500)
    parent_id: uuid.UUID | None = None
    is_visible: bool = True
    seo_title: str | None = Field(default=None, max_length=200)
    seo_description: str | None = Field(default=None, max_length=320)

    _img = field_validator("image_url")(_clean_url)


class CategoryUpdate(BaseModel):
    name: Name | None = None
    description: str | None = Field(default=None, max_length=500)
    image_url: str | None = Field(default=None, max_length=500)
    parent_id: uuid.UUID | None = None
    is_visible: bool | None = None
    seo_title: str | None = Field(default=None, max_length=200)
    seo_description: str | None = Field(default=None, max_length=320)

    _img = field_validator("image_url")(_clean_url)


class CategoryOut2(ORM):
    id: uuid.UUID
    name: str
    slug: str | None
    description: str
    image_url: str | None
    parent_id: uuid.UUID | None
    position: int
    is_visible: bool
    seo_title: str | None
    seo_description: str | None
