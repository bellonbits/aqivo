import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import func, JSON, Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, SoftDeleteMixin, TenantMixin, TimestampMixin, fk


class Customer(Base, IdMixin, TimestampMixin, SoftDeleteMixin, TenantMixin):
    __tablename__ = "customers"
    __table_args__ = (Index("ix_customers_business_phone", "business_id", "phone"),)
    name: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str | None] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(255))
    birthday: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str] = mapped_column(Text, default="")
    whatsapp_opt_out: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(24), default="OTHER")
    last_contacted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    lead_id: Mapped[uuid.UUID | None] = fk("leads.id", nullable=True, ondelete="SET NULL")
    acquisition_source: Mapped[str | None] = mapped_column(String(48))  # where they first came from (instagram, google, qr…)
    acquisition_campaign: Mapped[str | None] = mapped_column(String(64))


class CustomerNote(Base, IdMixin, TimestampMixin, TenantMixin):
    """Notes and communication history entries (kind: NOTE | WHATSAPP | CALL | SMS | EMAIL)."""
    __tablename__ = "customer_notes"
    customer_id: Mapped[uuid.UUID] = fk("customers.id")
    author_id: Mapped[uuid.UUID | None] = fk("users.id", nullable=True, ondelete="SET NULL")
    kind: Mapped[str] = mapped_column(String(16), default="NOTE")
    body: Mapped[str] = mapped_column(Text)


class Lead(Base, IdMixin, TimestampMixin, SoftDeleteMixin, TenantMixin):
    __tablename__ = "leads"
    __table_args__ = (Index("ix_leads_business_status", "business_id", "status"),)
    name: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str | None] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(24), default="WEBSITE")
    service_id: Mapped[uuid.UUID | None] = fk("services.id", nullable=True, ondelete="SET NULL")
    service_name: Mapped[str | None] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(16), default="NEW")
    first_response_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    campaign: Mapped[str | None] = mapped_column(String(64))


class Booking(Base, IdMixin, TimestampMixin, SoftDeleteMixin, TenantMixin):
    __tablename__ = "bookings"
    __table_args__ = (Index("ix_bookings_business_start", "business_id", "starts_at"),)
    customer_id: Mapped[uuid.UUID | None] = fk("customers.id", nullable=True, ondelete="SET NULL")
    lead_id: Mapped[uuid.UUID | None] = fk("leads.id", nullable=True, ondelete="SET NULL")
    staff_id: Mapped[uuid.UUID | None] = fk("staff.id", nullable=True, ondelete="SET NULL")
    customer_name: Mapped[str] = mapped_column(String(160))
    customer_phone: Mapped[str | None] = mapped_column(String(32))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(16), default="PENDING")
    source: Mapped[str] = mapped_column(String(24), default="WEBSITE")
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    currency: Mapped[str] = mapped_column(String(3), default="KES")
    notes: Mapped[str] = mapped_column(Text, default="")
    review_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    campaign: Mapped[str | None] = mapped_column(String(64))

    items: Mapped[list["BookingService"]] = relationship(cascade="all, delete-orphan", lazy="selectin")


class BookingService(Base, IdMixin, TenantMixin):
    __tablename__ = "booking_services"
    booking_id: Mapped[uuid.UUID] = fk("bookings.id")
    service_id: Mapped[uuid.UUID | None] = fk("services.id", nullable=True, ondelete="SET NULL")
    name: Mapped[str] = mapped_column(String(160))  # snapshot
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    duration_minutes: Mapped[int] = mapped_column(Integer)


class Review(Base, IdMixin, TimestampMixin, SoftDeleteMixin, TenantMixin):
    __tablename__ = "reviews"
    customer_id: Mapped[uuid.UUID | None] = fk("customers.id", nullable=True, ondelete="SET NULL")
    booking_id: Mapped[uuid.UUID | None] = fk("bookings.id", nullable=True, ondelete="SET NULL")
    product_id: Mapped[uuid.UUID | None] = fk("products.id", nullable=True, ondelete="SET NULL")
    request_id: Mapped[uuid.UUID | None] = fk("review_requests.id", nullable=True, ondelete="SET NULL")
    author_name: Mapped[str] = mapped_column(String(120))
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(Text, default="")
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    response: Mapped[str | None] = mapped_column(Text)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ReviewRequest(Base, IdMixin, TimestampMixin, TenantMixin):
    __tablename__ = "review_requests"
    token: Mapped[str] = mapped_column(String(64), unique=True)
    customer_id: Mapped[uuid.UUID | None] = fk("customers.id", nullable=True, ondelete="SET NULL")
    booking_id: Mapped[uuid.UUID | None] = fk("bookings.id", nullable=True, ondelete="SET NULL")
    sent_via: Mapped[str | None] = mapped_column(String(16))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AnalyticsEvent(Base, IdMixin, TenantMixin):
    __tablename__ = "analytics_events"
    __table_args__ = (Index("ix_events_business_type_time", "business_id", "event_type", "created_at"),)
    event_type: Mapped[str] = mapped_column(String(24))
    visitor_hash: Mapped[str | None] = mapped_column(String(64))
    source: Mapped[str | None] = mapped_column(String(48))
    service_id: Mapped[uuid.UUID | None] = fk("services.id", nullable=True, ondelete="SET NULL")
    product_id: Mapped[uuid.UUID | None] = fk("products.id", nullable=True, ondelete="SET NULL")
    session_id: Mapped[str | None] = mapped_column(String(40))
    campaign: Mapped[str | None] = mapped_column(String(64))
    path: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
