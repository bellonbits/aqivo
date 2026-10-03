"""SubscriptionService / BillingService / WebhookService — provider-independent."""
import logging
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import bad_request
from app.models import Business, Plan, Subscription, SupportTicket, Transaction, User, WebhookEvent
from app.models.enums import PaymentStatus, SubscriptionStatus
from app.services.audit import audit
from app.services.notifications import notify
from app.services.payments import get_provider
from app.services.plans import get_plan, get_subscription, refresh_subscription_state

log = logging.getLogger("bizora.billing")


def price_for(plan: Plan, currency: str) -> Decimal | None:
    v = (plan.prices or {}).get(currency)
    return Decimal(str(v)) if v is not None else None


class SubscriptionService:
    @staticmethod
    def activate(db: Session, business: Business, plan: Plan, *, now: datetime | None = None, actor: User | None = None, source: str = "payment") -> Subscription:
        now = now or datetime.now(timezone.utc)
        sub = get_subscription(db, business.id)
        if sub is None:
            sub = Subscription(business_id=business.id, plan_id=plan.id, currency=business.currency)
            db.add(sub)
        # renewing early extends from the current period end so the customer never loses paid days
        start = now
        if sub.status == SubscriptionStatus.ACTIVE and sub.plan_id == plan.id and sub.current_period_end and sub.current_period_end > now:
            start = sub.current_period_end
        sub.plan_id, sub.plan = plan.id, plan
        sub.status = SubscriptionStatus.ACTIVE
        sub.current_period_start = start
        sub.current_period_end = start + timedelta(days=plan.billing_interval_days)
        sub.cancel_at_period_end, sub.cancelled_at, sub.grace_ends_at, sub.data_retained_until = False, None, None, None
        db.flush()
        audit(db, "subscription.activated", user_id=actor.id if actor else None, business_id=business.id, resource_type="subscription", resource_id=sub.id,
              meta={"plan": plan.key, "source": source, "period_end": sub.current_period_end.isoformat()})
        return sub

    @staticmethod
    def cancel(db: Session, sub: Subscription, actor: User | None = None, immediate: bool = False) -> Subscription:
        s = get_settings()
        now = datetime.now(timezone.utc)
        if sub.status == SubscriptionStatus.TRIAL or immediate or not sub.current_period_end:
            sub.status, sub.cancelled_at = SubscriptionStatus.CANCELLED, now
            sub.data_retained_until = now + timedelta(days=s.data_retention_days)
        else:  # keep what they paid for until the period ends
            sub.cancel_at_period_end, sub.cancelled_at = True, now
        db.flush()
        audit(db, "subscription.cancelled", user_id=actor.id if actor else None, business_id=sub.business_id, resource_type="subscription", resource_id=sub.id,
              meta={"immediate": immediate})
        return sub

    @staticmethod
    def resume(db: Session, sub: Subscription) -> Subscription:
        if sub.status == SubscriptionStatus.ACTIVE and sub.cancel_at_period_end:
            sub.cancel_at_period_end, sub.cancelled_at = False, None
        else:
            raise bad_request("Nothing to resume")
        db.flush()
        return sub

    @staticmethod
    def set_status(db: Session, sub: Subscription, status: str, actor: User) -> Subscription:
        old = sub.status
        sub.status = status
        db.flush()
        audit(db, "subscription.status_changed", user_id=actor.id, business_id=sub.business_id, resource_type="subscription", resource_id=sub.id, meta={"from": old, "to": status})
        return sub


class BillingService:
    @staticmethod
    def checkout(db: Session, business: Business, plan: Plan, *, phone: str | None, provider_name: str, user: User) -> dict:
        amount = price_for(plan, business.currency)
        if plan.key == "FREE" or amount is None or amount <= 0:
            raise bad_request("This plan can't be purchased")
        provider = get_provider(provider_name)
        if provider is None or not provider.is_configured():
            ticket = SupportTicket(business_id=business.id, opened_by_id=user.id, subject=f"Upgrade request: {plan.name}",
                                   body=f"{business.name} asked to upgrade to {plan.name} ({business.currency} {amount}/month). Online payment is not configured; activate manually after receiving payment.",
                                   priority="HIGH")
            db.add(ticket)
            db.flush()
            return {"status": "NOT_CONFIGURED", "message": "Online payment isn't enabled yet. We've sent your upgrade request to the Aqivo team — they'll contact you to complete payment and activate your plan."}
        txn = Transaction(business_id=business.id, purpose="SUBSCRIPTION", provider=provider.name, amount=amount, currency=business.currency, status=PaymentStatus.PENDING,
                          raw={"plan": plan.key})
        db.add(txn)
        db.flush()
        result = provider.initiate(amount=amount, currency=business.currency, phone=phone, reference=f"BZ{str(txn.id)[:8]}", description="Aqivo")
        txn.provider_reference = result.reference
        if not result.ok:
            txn.status = PaymentStatus.FAILED
            notify(db, "payment_failed", business.email, business_id=business.id, business=business.name)
        db.flush()
        return {"status": result.status, "message": result.message, "transaction_id": str(txn.id)}


class WebhookService:
    @staticmethod
    def process(db: Session, provider_name: str, *, headers: dict, body: bytes, query: dict, payload: dict) -> dict:
        provider = get_provider(provider_name)
        if provider is None or not provider.is_configured():
            return {"ok": False, "error": "provider_not_configured", "code": 404}
        if not provider.verify_webhook(headers, body, query):  # authenticated
            return {"ok": False, "error": "unauthorized", "code": 401}
        event = provider.parse_webhook(payload)  # validated
        if event is None:
            return {"ok": False, "error": "invalid_payload", "code": 400}
        rec = WebhookEvent(provider=provider.name, event_id=event.event_id, payload=payload)
        try:  # idempotent: the unique (provider, event_id) row is the lock
            with db.begin_nested():
                db.add(rec)
                db.flush()
        except IntegrityError:
            return {"ok": True, "duplicate": True, "code": 200}
        txn = db.scalars(select(Transaction).where(Transaction.provider == provider.name, Transaction.provider_reference == event.reference)).first()
        if txn is None:
            rec.outcome, rec.processed_at = "unknown_transaction", datetime.now(timezone.utc)
            return {"ok": True, "code": 200}
        business = db.get(Business, txn.business_id)
        if txn.status == PaymentStatus.PAID:
            rec.outcome, rec.processed_at = "already_paid", datetime.now(timezone.utc)
            return {"ok": True, "code": 200}
        if event.status == "PAID":
            if event.amount is not None and event.amount < txn.amount:
                txn.status, txn.raw = PaymentStatus.FAILED, {**(txn.raw or {}), "error": "amount_mismatch", "received": str(event.amount)}
                rec.outcome = "amount_mismatch"
            else:
                txn.status = PaymentStatus.PAID
                plan = get_plan(db, (txn.raw or {}).get("plan", "GROW"))
                sub = SubscriptionService.activate(db, business, plan, source=provider.name)
                txn.subscription_id = sub.id
                notify(db, "payment_success", business.email, business_id=business.id, business=business.name, amount=f"{txn.amount:,.0f}", currency=txn.currency)
                rec.outcome = "paid"
        else:
            txn.status = PaymentStatus.FAILED
            notify(db, "payment_failed", business.email, business_id=business.id, business=business.name)
            rec.outcome = "failed"
        rec.processed_at = datetime.now(timezone.utc)
        audit(db, f"payment.{rec.outcome}", business_id=business.id, resource_type="transaction", resource_id=txn.id, meta={"provider": provider.name})
        return {"ok": True, "code": 200}
