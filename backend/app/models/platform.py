import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (JSON, Boolean, Date, DateTime, Index, Integer, Numeric, String, Text, UniqueConstraint, func)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, SoftDeleteMixin, TenantMixin, TimestampMixin, fk


class Plan(Base, IdMixin, TimestampMixin):
    """Pricing lives here and is editable from /admin — never hardcode prices in the frontend."""
    __tablename__ = "plans"
    key: Mapped[str] = mapped_column(String(16), unique=True)  # FREE | GROW | PRO | BUSINESS
    name: Mapped[str] = mapped_column(String(64))
    description: Mapped[str] = mapped_column(String(300), default="")
    prices: Mapped[dict] = mapped_column(JSON, default=dict)  # {"KES": "1500.00", "USD": "12.00"}
    billing_interval_days: Mapped[int] = mapped_column(Integer, default=30)
    features: Mapped[list] = mapped_column(JSON, default=list)  # feature keys, see services/plans.py
    highlights: Mapped[list] = mapped_column(JSON, default=list)  # marketing bullets
    position: Mapped[int] = mapped_column(Integer, default=0)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    limits: Mapped[dict] = mapped_column(JSON, default=dict)  # {"products": 30, "services": 15, ...}; a missing key means unlimited
    version: Mapped[int] = mapped_column(Integer, default=1)  # bumped when default features/limits change; seeding upgrades older rows


class Subscription(Base, IdMixin, TimestampMixin, TenantMixin):
    __tablename__ = "subscriptions"
    __table_args__ = (UniqueConstraint("business_id", name="uq_subscription_business"),)
    plan_id: Mapped[uuid.UUID] = fk("plans.id", ondelete="RESTRICT")
    status: Mapped[str] = mapped_column(String(16), default="TRIAL")
    currency: Mapped[str] = mapped_column(String(3), default="KES")
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    current_period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)
    grace_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    data_retained_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    price_override: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))

    plan: Mapped[Plan] = relationship(lazy="joined")


class Payment(Base, IdMixin, TimestampMixin, TenantMixin):
    """A payment a business's *customer* makes (booking/invoice). Not card data — references only."""
    __tablename__ = "payments"
    customer_id: Mapped[uuid.UUID | None] = fk("customers.id", nullable=True, ondelete="SET NULL")
    booking_id: Mapped[uuid.UUID | None] = fk("bookings.id", nullable=True, ondelete="SET NULL")
    order_id: Mapped[uuid.UUID | None] = fk("orders.id", nullable=True, ondelete="SET NULL")
    invoice_id: Mapped[uuid.UUID | None] = fk("invoices.id", nullable=True, ondelete="SET NULL")
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3))
    method: Mapped[str] = mapped_column(String(16), default="CASH")  # CASH | MPESA | CARD | BANK | OTHER
    provider: Mapped[str] = mapped_column(String(16), default="MANUAL")
    provider_reference: Mapped[str | None] = mapped_column(String(120))
    payer_phone: Mapped[str | None] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(16), default="PENDING")
    note: Mapped[str] = mapped_column(String(300), default="")
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Transaction(Base, IdMixin, TimestampMixin):
    """Provider-level ledger. purpose=SUBSCRIPTION rows bill the business; CUSTOMER_PAYMENT mirror Payment."""
    __tablename__ = "transactions"
    business_id: Mapped[uuid.UUID] = fk("businesses.id")
    purpose: Mapped[str] = mapped_column(String(24))
    subscription_id: Mapped[uuid.UUID | None] = fk("subscriptions.id", nullable=True, ondelete="SET NULL")
    payment_id: Mapped[uuid.UUID | None] = fk("payments.id", nullable=True, ondelete="SET NULL")
    provider: Mapped[str] = mapped_column(String(16))
    provider_reference: Mapped[str | None] = mapped_column(String(120), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3))
    status: Mapped[str] = mapped_column(String(16), default="PENDING")
    raw: Mapped[dict] = mapped_column(JSON, default=dict)


class WebhookEvent(Base, IdMixin, TimestampMixin):
    """Idempotency ledger: a (provider, event_id) pair is processed at most once."""
    __tablename__ = "webhook_events"
    __table_args__ = (UniqueConstraint("provider", "event_id", name="uq_webhook_provider_event"),)
    provider: Mapped[str] = mapped_column(String(16))
    event_id: Mapped[str] = mapped_column(String(160))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    outcome: Mapped[str | None] = mapped_column(String(200))


class Invoice(Base, IdMixin, TimestampMixin, SoftDeleteMixin, TenantMixin):
    __tablename__ = "invoices"
    __table_args__ = (UniqueConstraint("business_id", "number", name="uq_invoice_number"),)
    number: Mapped[str] = mapped_column(String(32))
    customer_id: Mapped[uuid.UUID | None] = fk("customers.id", nullable=True, ondelete="SET NULL")
    booking_id: Mapped[uuid.UUID | None] = fk("bookings.id", nullable=True, ondelete="SET NULL")
    customer_name: Mapped[str] = mapped_column(String(160))
    customer_phone: Mapped[str | None] = mapped_column(String(32))
    currency: Mapped[str] = mapped_column(String(3))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    discount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    tax: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    payment_status: Mapped[str] = mapped_column(String(16), default="PENDING")
    issued_on: Mapped[date] = mapped_column(Date)
    due_on: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str] = mapped_column(Text, default="")

    items: Mapped[list["InvoiceItem"]] = relationship(cascade="all, delete-orphan", lazy="selectin")


class InvoiceItem(Base, IdMixin, TenantMixin):
    __tablename__ = "invoice_items"
    invoice_id: Mapped[uuid.UUID] = fk("invoices.id")
    description: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2))


class MarketingCampaign(Base, IdMixin, TimestampMixin, TenantMixin):
    __tablename__ = "marketing_campaigns"
    name: Mapped[str] = mapped_column(String(160))
    kind: Mapped[str] = mapped_column(String(24), default="WHATSAPP")
    status: Mapped[str] = mapped_column(String(16), default="DRAFT")
    message_template: Mapped[str] = mapped_column(Text)
    audience: Mapped[dict] = mapped_column(JSON, default=dict)  # {"type": "inactive", "days": 45}
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by_ai: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_id: Mapped[uuid.UUID | None] = fk("users.id", nullable=True, ondelete="SET NULL")
    # growth-campaign fields (kind == "GROWTH"): one offer promoted across channels with tracked links
    slug: Mapped[str | None] = mapped_column(String(64))
    objective: Mapped[str | None] = mapped_column(String(16))  # BOOKINGS | SALES | LEADS | REVIEWS | WINBACK | AWARENESS
    offer_text: Mapped[str] = mapped_column(String(300), default="")
    discount_code: Mapped[str | None] = mapped_column(String(32))
    target_type: Mapped[str | None] = mapped_column(String(16))
    target_ref: Mapped[str | None] = mapped_column(String(64))
    channels: Mapped[list] = mapped_column(JSON, default=list)
    content: Mapped[dict] = mapped_column(JSON, default=dict)  # {channel: {"text": ..., "link": ...}}
    starts_on: Mapped[date | None] = mapped_column(Date)
    ends_on: Mapped[date | None] = mapped_column(Date)

    messages: Mapped[list["MarketingMessage"]] = relationship(cascade="all, delete-orphan")


class MarketingMessage(Base, IdMixin, TimestampMixin, TenantMixin):
    """One recipient of a campaign. Without a WhatsApp Business API integration, delivery is the owner tapping
    the wa.me link, so status is honest: PREPARED -> OPENED (owner clicked send)."""
    __tablename__ = "marketing_messages"
    campaign_id: Mapped[uuid.UUID] = fk("marketing_campaigns.id")
    customer_id: Mapped[uuid.UUID | None] = fk("customers.id", nullable=True, ondelete="SET NULL")
    recipient_name: Mapped[str] = mapped_column(String(160))
    recipient_phone: Mapped[str | None] = mapped_column(String(32))
    body: Mapped[str] = mapped_column(Text)
    channel: Mapped[str] = mapped_column(String(16), default="WHATSAPP")
    status: Mapped[str] = mapped_column(String(16), default="PREPARED")
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Notification(Base, IdMixin, TimestampMixin):
    __tablename__ = "notifications"
    business_id: Mapped[uuid.UUID | None] = fk("businesses.id", nullable=True)
    user_id: Mapped[uuid.UUID | None] = fk("users.id", nullable=True)
    kind: Mapped[str] = mapped_column(String(32))
    channel: Mapped[str] = mapped_column(String(16), default="EMAIL")
    recipient: Mapped[str | None] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(255), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(16), default="QUEUED")  # QUEUED | SENT | LOGGED | FAILED
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error: Mapped[str | None] = mapped_column(String(300))


class SalesLead(Base, IdMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "sales_leads"
    business_name: Mapped[str] = mapped_column(String(160))
    owner_name: Mapped[str] = mapped_column(String(160), default="")
    phone: Mapped[str | None] = mapped_column(String(32))
    industry: Mapped[str] = mapped_column(String(32), default="beauty")
    location: Mapped[str] = mapped_column(String(160), default="")
    source: Mapped[str] = mapped_column(String(48), default="")
    status: Mapped[str] = mapped_column(String(16), default="NEW")
    notes: Mapped[str] = mapped_column(Text, default="")
    follow_up_on: Mapped[date | None] = mapped_column(Date)
    business_id: Mapped[uuid.UUID | None] = fk("businesses.id", nullable=True, ondelete="SET NULL")
    assigned_to_id: Mapped[uuid.UUID | None] = fk("users.id", nullable=True, ondelete="SET NULL")


class SupportTicket(Base, IdMixin, TimestampMixin):
    __tablename__ = "support_tickets"
    business_id: Mapped[uuid.UUID | None] = fk("businesses.id", nullable=True)
    opened_by_id: Mapped[uuid.UUID | None] = fk("users.id", nullable=True, ondelete="SET NULL")
    subject: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(16), default="OPEN")  # OPEN | PENDING | RESOLVED
    priority: Mapped[str] = mapped_column(String(8), default="NORMAL")
    admin_notes: Mapped[str] = mapped_column(Text, default="")


class Referral(Base, IdMixin, TimestampMixin):
    __tablename__ = "referrals"
    referrer_business_id: Mapped[uuid.UUID] = fk("businesses.id")
    referred_business_id: Mapped[uuid.UUID] = fk("businesses.id")
    reward_type: Mapped[str] = mapped_column(String(24), default="FREE_MONTH")
    reward_status: Mapped[str] = mapped_column(String(16), default="PENDING")  # PENDING | GRANTED | VOID


class AuditLog(Base, IdMixin):
    __tablename__ = "audit_logs"
    __table_args__ = (Index("ix_audit_business_time", "business_id", "created_at"),)
    business_id: Mapped[uuid.UUID | None] = fk("businesses.id", nullable=True, ondelete="SET NULL")
    user_id: Mapped[uuid.UUID | None] = fk("users.id", nullable=True, ondelete="SET NULL")
    impersonator_id: Mapped[uuid.UUID | None] = fk("users.id", nullable=True, ondelete="SET NULL")
    action: Mapped[str] = mapped_column(String(64), index=True)
    resource_type: Mapped[str | None] = mapped_column(String(48))
    resource_id: Mapped[str | None] = mapped_column(String(64))
    ip: Mapped[str | None] = mapped_column(String(64))
    meta: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
