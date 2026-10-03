"""Commerce tables: variants, inventory, orders, discounts, storefront pages."""
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import JSON, Boolean, DateTime, Index, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TenantMixin, TimestampMixin, fk


class ProductVariant(Base, IdMixin, TimestampMixin, TenantMixin):
    """One purchasable combination of a product's options (e.g. Size M / Colour Black). Stock is tracked here when the product has variants."""
    __tablename__ = "product_variants"
    __table_args__ = (UniqueConstraint("product_id", "title", name="uq_variant_title"),)
    product_id: Mapped[uuid.UUID] = fk("products.id")
    title: Mapped[str] = mapped_column(String(160))
    options: Mapped[dict] = mapped_column(JSON, default=dict)
    sku: Mapped[str | None] = mapped_column(String(64))
    price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))  # None = product price
    compare_at_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    stock_qty: Mapped[int] = mapped_column(Integer, default=0)
    image_url: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    position: Mapped[int] = mapped_column(Integer, default=0)


class InventoryMovement(Base, IdMixin, TenantMixin):
    """Append-only stock ledger. Stock levels change only through services.inventory.adjust_stock."""
    __tablename__ = "inventory_movements"
    __table_args__ = (Index("ix_inv_business_time", "business_id", "created_at"),)
    product_id: Mapped[uuid.UUID | None] = fk("products.id", nullable=True, ondelete="SET NULL")
    variant_id: Mapped[uuid.UUID | None] = fk("product_variants.id", nullable=True, ondelete="SET NULL")
    product_name: Mapped[str] = mapped_column(String(200))  # snapshot, survives deletes
    delta: Mapped[int] = mapped_column(Integer)
    qty_after: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String(16))  # SALE | RESTOCK | ADJUSTMENT | RETURN | CANCELLED | INITIAL
    note: Mapped[str] = mapped_column(String(200), default="")
    order_id: Mapped[uuid.UUID | None] = fk("orders.id", nullable=True, ondelete="SET NULL")
    created_by: Mapped[uuid.UUID | None] = fk("users.id", nullable=True, ondelete="SET NULL")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Order(Base, IdMixin, TimestampMixin, TenantMixin):
    __tablename__ = "orders"
    __table_args__ = (UniqueConstraint("business_id", "number", name="uq_order_number"), Index("ix_orders_business_status", "business_id", "status"))
    number: Mapped[int] = mapped_column(Integer)
    token: Mapped[str] = mapped_column(String(48), unique=True)  # unguessable id for the customer's tracking link
    customer_id: Mapped[uuid.UUID | None] = fk("customers.id", nullable=True, ondelete="SET NULL")
    customer_name: Mapped[str] = mapped_column(String(160))
    customer_phone: Mapped[str | None] = mapped_column(String(32))
    customer_email: Mapped[str | None] = mapped_column(String(255))
    delivery_method: Mapped[str] = mapped_column(String(12), default="PICKUP")  # PICKUP | DELIVERY
    delivery_zone: Mapped[str | None] = mapped_column(String(80))
    address: Mapped[str] = mapped_column(String(400), default="")
    notes: Mapped[str] = mapped_column(String(600), default="")
    status: Mapped[str] = mapped_column(String(16), default="PENDING")  # PENDING CONFIRMED PREPARING READY COMPLETED CANCELLED REFUNDED
    payment_method: Mapped[str] = mapped_column(String(16), default="CASH")  # CASH | MPESA | BANK | WHATSAPP
    payment_status: Mapped[str] = mapped_column(String(12), default="UNPAID")  # UNPAID | PENDING | PAID | REFUNDED
    currency: Mapped[str] = mapped_column(String(3), default="KES")
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    discount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    delivery_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    tax: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    discount_code: Mapped[str | None] = mapped_column(String(32))
    source: Mapped[str | None] = mapped_column(String(48))
    campaign: Mapped[str | None] = mapped_column(String(64))
    channel: Mapped[str] = mapped_column(String(12), default="WEBSITE")
    stock_restored: Mapped[bool] = mapped_column(Boolean, default=False)
    scheduled_for: Mapped[str | None] = mapped_column(String(16))  # customer's requested date/time, local to the business (YYYY-MM-DDTHH:MM)
    courier_name: Mapped[str | None] = mapped_column(String(120))
    courier_phone: Mapped[str | None] = mapped_column(String(32))
    tracking_url: Mapped[str | None] = mapped_column(String(500))
    payment_reference: Mapped[str | None] = mapped_column(String(120))  # provider reference for online payments
    payment_provider: Mapped[str | None] = mapped_column(String(24))

    items: Mapped[list["OrderItem"]] = relationship(cascade="all, delete-orphan", lazy="selectin", order_by="OrderItem.created_at")
    events: Mapped[list["OrderEvent"]] = relationship(cascade="all, delete-orphan", lazy="selectin", order_by="OrderEvent.created_at")


class OrderItem(Base, IdMixin, TenantMixin):
    __tablename__ = "order_items"
    order_id: Mapped[uuid.UUID] = fk("orders.id")
    kind: Mapped[str] = mapped_column(String(8), default="product")  # product | service
    product_id: Mapped[uuid.UUID | None] = fk("products.id", nullable=True, ondelete="SET NULL")
    variant_id: Mapped[uuid.UUID | None] = fk("product_variants.id", nullable=True, ondelete="SET NULL")
    service_id: Mapped[uuid.UUID | None] = fk("services.id", nullable=True, ondelete="SET NULL")
    name: Mapped[str] = mapped_column(String(200))
    variant_title: Mapped[str | None] = mapped_column(String(160))
    image_url: Mapped[str | None] = mapped_column(String(500))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OrderEvent(Base, IdMixin, TenantMixin):
    """The order timeline: placed, payment received, status changes, notes."""
    __tablename__ = "order_events"
    order_id: Mapped[uuid.UUID] = fk("orders.id")
    kind: Mapped[str] = mapped_column(String(12))  # PLACED | STATUS | PAYMENT | NOTE
    status: Mapped[str | None] = mapped_column(String(16))
    message: Mapped[str] = mapped_column(String(300), default="")
    actor_id: Mapped[uuid.UUID | None] = fk("users.id", nullable=True, ondelete="SET NULL")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Discount(Base, IdMixin, TimestampMixin, TenantMixin):
    __tablename__ = "discounts"
    __table_args__ = (UniqueConstraint("business_id", "code", name="uq_discount_code"),)
    code: Mapped[str] = mapped_column(String(32))
    description: Mapped[str] = mapped_column(String(160), default="")
    type: Mapped[str] = mapped_column(String(14), default="PERCENT")  # PERCENT | FIXED | FREE_DELIVERY
    value: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    min_order: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    product_ids: Mapped[list] = mapped_column(JSON, default=list)  # empty = every product
    category_ids: Mapped[list] = mapped_column(JSON, default=list)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    usage_limit: Mapped[int | None] = mapped_column(Integer)
    used_count: Mapped[int] = mapped_column(Integer, default=0)
    once_per_customer: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class WebsitePage(Base, IdMixin, TimestampMixin, TenantMixin):
    """A page of the storefront. Each page is its own ordered list of sections."""
    __tablename__ = "website_pages"
    __table_args__ = (UniqueConstraint("website_id", "slug", name="uq_page_slug"),)
    website_id: Mapped[uuid.UUID] = fk("websites.id")
    slug: Mapped[str] = mapped_column(String(60))
    title: Mapped[str] = mapped_column(String(120))
    is_home: Mapped[bool] = mapped_column(Boolean, default=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    seo_title: Mapped[str | None] = mapped_column(String(200))
    seo_description: Mapped[str | None] = mapped_column(String(320))
    published: Mapped[dict | None] = mapped_column(JSON)  # snapshot {title, slug, enabled, seo_*} taken at publish; None = never published


class QRCode(Base, IdMixin, TimestampMixin, TenantMixin):
    """A saved QR code. It points at a storefront page with ?source=qr&campaign=<campaign>, so scans and what they lead to are tracked."""
    __tablename__ = "qr_codes"
    __table_args__ = (UniqueConstraint("business_id", "campaign", name="uq_qr_campaign"),)
    name: Mapped[str] = mapped_column(String(120))
    target_type: Mapped[str] = mapped_column(String(16), default="storefront")  # storefront | product | service | category | booking | page | checkout
    target_ref: Mapped[str | None] = mapped_column(String(64))
    path: Mapped[str] = mapped_column(String(300), default="")
    campaign: Mapped[str] = mapped_column(String(64))
    headline: Mapped[str] = mapped_column(String(80), default="")  # poster text, e.g. "Scan to order"


class SiteRedirect(Base, IdMixin, TimestampMixin, TenantMixin):
    """A redirect on the storefront, e.g. /old-dress -> /products/new-dress. Paths are relative to the store root."""
    __tablename__ = "site_redirects"
    __table_args__ = (UniqueConstraint("business_id", "from_path", name="uq_redirect_from"),)
    from_path: Mapped[str] = mapped_column(String(200))
    to_path: Mapped[str] = mapped_column(String(500))  # "/…" inside the store, or an https:// address
    permanent: Mapped[bool] = mapped_column(Boolean, default=True)
    hits: Mapped[int] = mapped_column(Integer, default=0)


class MerchantConnection(Base, IdMixin, TimestampMixin, TenantMixin):
    """A business's own credentials for a third-party service (payment gateway, WhatsApp Cloud API, Instagram, Google Places).
    Secrets are encrypted at rest (services.vault) and never returned by the API."""
    __tablename__ = "merchant_connections"
    __table_args__ = (UniqueConstraint("business_id", "provider", name="uq_connection_provider"),)
    provider: Mapped[str] = mapped_column(String(24))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    config: Mapped[dict] = mapped_column(JSON, default=dict)  # non-secret settings
    secrets_enc: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(12), default="UNTESTED")  # UNTESTED | CONNECTED | ERROR
    last_error: Mapped[str | None] = mapped_column(String(300))
    last_tested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cache: Mapped[dict] = mapped_column(JSON, default=dict)  # fetched data (e.g. Instagram posts) with fetched_at


class WhatsAppMessage(Base, IdMixin, TenantMixin):
    """Every WhatsApp Cloud API message in or out, for the inbox, delivery status and the 24-hour window rule."""
    __tablename__ = "whatsapp_messages"
    __table_args__ = (Index("ix_wa_business_phone", "business_id", "phone", "created_at"),)
    phone: Mapped[str] = mapped_column(String(32))  # digits, international
    direction: Mapped[str] = mapped_column(String(3))  # IN | OUT
    body: Mapped[str] = mapped_column(Text, default="")
    kind: Mapped[str] = mapped_column(String(12), default="text")  # text | template | other
    template: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(12), default="QUEUED")  # QUEUED SENT DELIVERED READ FAILED RECEIVED
    provider_id: Mapped[str | None] = mapped_column(String(120), index=True)
    error: Mapped[str | None] = mapped_column(String(300))
    purpose: Mapped[str | None] = mapped_column(String(24))  # campaign | order | otp | reply
    ref_id: Mapped[str | None] = mapped_column(String(64))
    contact_name: Mapped[str | None] = mapped_column(String(160))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CustomerOTP(Base, IdMixin, TenantMixin):
    __tablename__ = "customer_otps"
    identifier: Mapped[str] = mapped_column(String(255), index=True)  # normalised phone or lower-case email
    channel: Mapped[str] = mapped_column(String(10))  # WHATSAPP | EMAIL | LOG
    code_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CustomerAddress(Base, IdMixin, TimestampMixin, TenantMixin):
    __tablename__ = "customer_addresses"
    customer_id: Mapped[uuid.UUID] = fk("customers.id")
    label: Mapped[str] = mapped_column(String(40), default="Home")
    line: Mapped[str] = mapped_column(String(300))
    zone: Mapped[str | None] = mapped_column(String(80))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)


class SavedProduct(Base, IdMixin, TenantMixin):
    __tablename__ = "saved_products"
    __table_args__ = (UniqueConstraint("customer_id", "product_id", name="uq_saved_product"),)
    customer_id: Mapped[uuid.UUID] = fk("customers.id")
    product_id: Mapped[uuid.UUID] = fk("products.id")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Collection(Base, IdMixin, TimestampMixin, TenantMixin):
    """A hand-picked group of products (e.g. “Summer edit”) that can be shown as a section, a page and a menu link."""
    __tablename__ = "collections"
    __table_args__ = (UniqueConstraint("business_id", "slug", name="uq_collection_slug"),)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(140))
    description: Mapped[str] = mapped_column(String(500), default="")
    image_url: Mapped[str | None] = mapped_column(String(500))
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    position: Mapped[int] = mapped_column(Integer, default=0)


class CollectionProduct(Base, IdMixin, TenantMixin):
    __tablename__ = "collection_products"
    __table_args__ = (UniqueConstraint("collection_id", "product_id", name="uq_collection_product"),)
    collection_id: Mapped[uuid.UUID] = fk("collections.id")
    product_id: Mapped[uuid.UUID] = fk("products.id")
    position: Mapped[int] = mapped_column(Integer, default=0)
