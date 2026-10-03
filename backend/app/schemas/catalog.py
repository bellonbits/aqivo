import uuid
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import ORM, Money, Name


class ServiceIn(BaseModel):
    name: Name
    description: str = Field(default="", max_length=1000)
    price: Money
    duration_minutes: int = Field(default=60, ge=5, le=720)
    category_id: uuid.UUID | None = None
    image_url: str | None = Field(default=None, max_length=500)
    is_active: bool = True


class ServiceUpdate(BaseModel):
    name: Name | None = None
    description: str | None = Field(default=None, max_length=1000)
    price: Money | None = None
    duration_minutes: int | None = Field(default=None, ge=5, le=720)
    category_id: uuid.UUID | None = None
    image_url: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None


class ServiceOut(ORM):
    id: uuid.UUID
    name: str
    slug: str | None = None
    description: str
    price: Decimal
    currency: str
    duration_minutes: int
    category_id: uuid.UUID | None
    image_url: str | None
    position: int
    is_active: bool


class CategoryIn(BaseModel):
    name: Name


class CategoryOut(ORM):
    id: uuid.UUID
    name: str
    position: int


class ReorderIn(BaseModel):
    ids: list[uuid.UUID]


class GalleryOut(ORM):
    id: uuid.UUID
    url: str
    thumb_url: str | None
    caption: str
    position: int


class GalleryUpdate(BaseModel):
    caption: str = Field(max_length=200)


class StaffIn(BaseModel):
    name: Name
    phone: str | None = Field(default=None, max_length=32)
    working_hours: dict = Field(default_factory=dict)
    service_ids: list[uuid.UUID] = Field(default_factory=list)
    is_active: bool = True


class StaffOut(ORM):
    id: uuid.UUID
    name: str
    phone: str | None
    photo_url: str | None
    working_hours: dict
    is_active: bool
    service_ids: list[uuid.UUID] = Field(default_factory=list)


class TestimonialIn(BaseModel):
    author: Name
    quote: str = Field(min_length=1, max_length=600)


class TestimonialOut(ORM):
    id: uuid.UUID
    author: str
    quote: str


class SectionUpdate(BaseModel):
    settings: dict | None = None
    styles: dict | None = None
    enabled: bool | None = None


class SectionAdd(BaseModel):
    type: str
    page_id: uuid.UUID | None = None
    after_id: uuid.UUID | None = None
    settings: dict | None = None


class SectionOrder(BaseModel):
    order: list[str]
    page_id: uuid.UUID | None = None


class PageIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    template: str = "blank"


class PageUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=120)
    slug: str | None = Field(default=None, max_length=60)
    enabled: bool | None = None
    seo_title: str | None = Field(default=None, max_length=200)
    seo_description: str | None = Field(default=None, max_length=320)


class NavigationIn(BaseModel):
    items: list[dict] = Field(max_length=12)


class TemplateChange(BaseModel):
    template_key: str


class SeoUpdate(BaseModel):
    seo_title: str | None = Field(default=None, max_length=200)
    seo_description: str | None = Field(default=None, max_length=320)
    og_image: str | None = Field(default=None, max_length=500)
