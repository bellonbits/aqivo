import uuid
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import (JSON, Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, Time,
                        UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, SoftDeleteMixin, TenantMixin, TimestampMixin, fk


class Business(Base, IdMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "businesses"

    name: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(63), unique=True, index=True)
    industry: Mapped[str] = mapped_column(String(32), default="beauty")
    category: Mapped[str] = mapped_column(String(64), default="Beauty Salon")
    description: Mapped[str] = mapped_column(Text, default="")
    tagline: Mapped[str] = mapped_column(String(200), default="")
    phone: Mapped[str | None] = mapped_column(String(32))
    whatsapp: Mapped[str | None] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(255))
    country_code: Mapped[str] = mapped_column(String(2), default="KE")
    currency: Mapped[str] = mapped_column(String(3), default="KES")
    locale: Mapped[str] = mapped_column(String(8), default="en")
    timezone: Mapped[str] = mapped_column(String(48), default="Africa/Nairobi")
    city: Mapped[str] = mapped_column(String(120), default="")
    address: Mapped[str] = mapped_column(String(255), default="")
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    # {"mon": {"open": "09:00", "close": "18:00"}, "sun": null}
    opening_hours: Mapped[dict] = mapped_column(JSON, default=dict)
    blocked_dates: Mapped[list] = mapped_column(JSON, default=list)  # ["2026-12-25"]
    slot_interval_minutes: Mapped[int] = mapped_column(Integer, default=30)
    booking_lead_hours: Mapped[int] = mapped_column(Integer, default=2)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    primary_color: Mapped[str] = mapped_column(String(9), default="#0F0F0F")
    secondary_color: Mapped[str] = mapped_column(String(9), default="#E6F26A")
    social_links: Mapped[dict] = mapped_column(JSON, default=dict)  # instagram, facebook, tiktok
    whatsapp_greeting: Mapped[str] = mapped_column(String(300), default="Hi {business}, ")
    whatsapp_default_message: Mapped[str] = mapped_column(
        String(500), default="Hi {business}, I'd like to book {service}."
    )
    status: Mapped[str] = mapped_column(String(16), default="ACTIVE")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    referral_code: Mapped[str | None] = mapped_column(String(16), unique=True)
    referred_by_id: Mapped[uuid.UUID | None] = fk("businesses.id", nullable=True, ondelete="SET NULL")
    created_by_admin_id: Mapped[uuid.UUID | None] = fk("users.id", nullable=True, ondelete="SET NULL")
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    primary_domain: Mapped[str | None] = mapped_column(String(255))  # verified custom domain used for canonical URLs and redirects
    integrations: Mapped[dict] = mapped_column(JSON, default=dict)  # google_review_url, google_maps_url
    growth_settings: Mapped[dict] = mapped_column(JSON, default=dict)  # automations: {"auto_winback": true, ...}
    store_settings: Mapped[dict] = mapped_column(JSON, default=dict)  # checkout, delivery, payment methods, tax (validated in services.store)

    website: Mapped["Website | None"] = relationship(back_populates="business", uselist=False)


class ServiceCategory(Base, IdMixin, TimestampMixin, TenantMixin):
    """A catalogue category shared by products and services. Supports nesting via parent_id."""
    __tablename__ = "service_categories"
    name: Mapped[str] = mapped_column(String(120))
    position: Mapped[int] = mapped_column(Integer, default=0)
    slug: Mapped[str | None] = mapped_column(String(140))
    description: Mapped[str] = mapped_column(String(500), default="")
    image_url: Mapped[str | None] = mapped_column(String(500))
    parent_id: Mapped[uuid.UUID | None] = fk("service_categories.id", nullable=True, ondelete="SET NULL")
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    seo_title: Mapped[str | None] = mapped_column(String(200))
    seo_description: Mapped[str | None] = mapped_column(String(320))


class Product(Base, IdMixin, TimestampMixin, SoftDeleteMixin, TenantMixin):
    __tablename__ = "products"
    __table_args__ = (UniqueConstraint("business_id", "slug", name="uq_product_slug"),)
    category_id: Mapped[uuid.UUID | None] = fk("service_categories.id", nullable=True, ondelete="SET NULL")
    name: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(180))
    short_description: Mapped[str] = mapped_column(String(300), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    images: Mapped[list] = mapped_column(JSON, default=list)  # ordered list of image URLs; first is the cover
    video_url: Mapped[str | None] = mapped_column(String(500))
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    compare_at_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    cost_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3), default="KES")
    sku: Mapped[str | None] = mapped_column(String(64))
    barcode: Mapped[str | None] = mapped_column(String(64))
    tags: Mapped[list] = mapped_column(JSON, default=list)
    options: Mapped[list] = mapped_column(JSON, default=list)  # [{"name": "Size", "values": ["S", "M"]}]; variants are the combinations
    is_digital: Mapped[bool] = mapped_column(Boolean, default=False)
    track_stock: Mapped[bool] = mapped_column(Boolean, default=False)
    stock_qty: Mapped[int] = mapped_column(Integer, default=0)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=3)
    weight_grams: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(12), default="ACTIVE")  # ACTIVE | DRAFT | ARCHIVED
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    seo_title: Mapped[str | None] = mapped_column(String(200))
    seo_description: Mapped[str | None] = mapped_column(String(320))


class Service(Base, IdMixin, TimestampMixin, SoftDeleteMixin, TenantMixin):
    __tablename__ = "services"
    category_id: Mapped[uuid.UUID | None] = fk("service_categories.id", nullable=True, ondelete="SET NULL")
    name: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str | None] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    currency: Mapped[str] = mapped_column(String(3), default="KES")
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    image_url: Mapped[str | None] = mapped_column(String(500))
    position: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class GalleryImage(Base, IdMixin, TimestampMixin, TenantMixin):
    __tablename__ = "gallery_images"
    url: Mapped[str] = mapped_column(String(500))
    thumb_url: Mapped[str | None] = mapped_column(String(500))
    caption: Mapped[str] = mapped_column(String(200), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)


class MediaAsset(Base, IdMixin, TimestampMixin, TenantMixin):
    """An uploaded image in the business's media library (the picker for storefront sections, products and categories)."""
    __tablename__ = "media_assets"
    folder: Mapped[str] = mapped_column(String(24), default="storefront")  # storefront | products | services | logo | gallery
    name: Mapped[str] = mapped_column(String(160))
    url: Mapped[str] = mapped_column(String(500))  # medium variant, used on pages
    large_url: Mapped[str | None] = mapped_column(String(500))
    thumb_url: Mapped[str | None] = mapped_column(String(500))
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)


class Staff(Base, IdMixin, TimestampMixin, SoftDeleteMixin, TenantMixin):
    __tablename__ = "staff"
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(32))
    photo_url: Mapped[str | None] = mapped_column(String(500))
    working_hours: Mapped[dict] = mapped_column(JSON, default=dict)  # same shape as business.opening_hours; empty => business hours
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class StaffService(Base, IdMixin, TenantMixin):
    __tablename__ = "staff_services"
    __table_args__ = (UniqueConstraint("staff_id", "service_id", name="uq_staff_service"),)
    staff_id: Mapped[uuid.UUID] = fk("staff.id")
    service_id: Mapped[uuid.UUID] = fk("services.id")


class Testimonial(Base, IdMixin, TimestampMixin, TenantMixin):
    """Owner-curated testimonials (clearly separate from verified reviews)."""
    __tablename__ = "testimonials"
    author: Mapped[str] = mapped_column(String(120))
    quote: Mapped[str] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer, default=0)


# ----------------------------- Website ---------------------------------------
class Template(Base, IdMixin, TimestampMixin):
    __tablename__ = "templates"
    key: Mapped[str] = mapped_column(String(48), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    industry: Mapped[str] = mapped_column(String(32))
    description: Mapped[str] = mapped_column(String(400), default="")
    features: Mapped[list] = mapped_column(JSON, default=list)
    default_sections: Mapped[list] = mapped_column(JSON, default=list)
    theme: Mapped[dict] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Website(Base, IdMixin, TimestampMixin, TenantMixin):
    __tablename__ = "websites"
    __table_args__ = (UniqueConstraint("business_id", name="uq_website_business"),)
    template_id: Mapped[uuid.UUID] = fk("templates.id", ondelete="RESTRICT")
    status: Mapped[str] = mapped_column(String(16), default="DRAFT")  # DRAFT | PUBLISHED | UNPUBLISHED
    seo_title: Mapped[str | None] = mapped_column(String(200))
    seo_description: Mapped[str | None] = mapped_column(String(320))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    has_unpublished_changes: Mapped[bool] = mapped_column(Boolean, default=True)
    theme_overrides: Mapped[dict] = mapped_column(JSON, default=dict)  # draft: accent, bg, ink, fonts, hero, radius
    settings: Mapped[dict] = mapped_column(JSON, default=dict)  # draft: whatsapp float, cart, announcement...
    published_style: Mapped[dict | None] = mapped_column(JSON)  # snapshot {theme_overrides, settings, navigation} at publish
    og_image: Mapped[str | None] = mapped_column(String(500))  # social-share image
    navigation: Mapped[list] = mapped_column(JSON, default=list)  # draft menu: [{id,label,type,ref,url,children:[…]}]

    business: Mapped[Business] = relationship(back_populates="website")
    template: Mapped[Template] = relationship()
    sections: Mapped[list["WebsiteSection"]] = relationship(
        back_populates="website", cascade="all, delete-orphan", order_by="WebsiteSection.position"
    )


class WebsiteSection(Base, IdMixin, TimestampMixin, TenantMixin):
    __tablename__ = "website_sections"
    website_id: Mapped[uuid.UUID] = fk("websites.id")
    page_id: Mapped[uuid.UUID | None] = fk("website_pages.id", nullable=True)
    type: Mapped[str] = mapped_column(String(32))  # a key of services.sections.REGISTRY; a page can hold several of one type
    position: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    content: Mapped[dict] = mapped_column(JSON, default=dict)  # draft settings (validated against the section registry)
    styles: Mapped[dict] = mapped_column(JSON, default=dict)  # draft: background / spacing / alignment
    published_styles: Mapped[dict | None] = mapped_column(JSON)
    published_content: Mapped[dict | None] = mapped_column(JSON)
    published_enabled: Mapped[bool | None] = mapped_column(Boolean)

    website: Mapped[Website] = relationship(back_populates="sections")


class Domain(Base, IdMixin, TimestampMixin, TenantMixin):
    __tablename__ = "domains"
    domain: Mapped[str] = mapped_column(String(255), unique=True)
    type: Mapped[str] = mapped_column(String(16), default="PATH")  # PATH | SUBDOMAIN | CUSTOM
    status: Mapped[str] = mapped_column(String(16), default="ACTIVE")
    verification_status: Mapped[str] = mapped_column(String(16), default="PENDING")
    verification_token: Mapped[str | None] = mapped_column(String(64))
    ssl_status: Mapped[str] = mapped_column(String(16), default="NONE")
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    dns_ok: Mapped[bool] = mapped_column(Boolean, default=False)  # points at the platform
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(String(300))
