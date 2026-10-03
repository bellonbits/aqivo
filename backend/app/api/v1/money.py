import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import TenantContext, get_tenant, require, require_feature
from app.api.helpers import log
from app.core.countries import get_country, normalize_phone
from app.core.db import get_db
from app.core.errors import bad_request, or404
from app.models import Invoice, Payment, Plan, Subscription, SupportTicket, Transaction
from app.models.enums import PaymentStatus
from app.repositories import CustomerRepository, InvoiceRepository, PaymentRepository
from app.schemas.money import CheckoutIn, InvoiceIn, InvoiceOut, PaymentIn, PaymentOut, PaymentUpdate, PlanOut
from app.core.db import get_db as _get_db
from app.services import invoices as inv_svc
from app.services.payments import available_providers
from app.services.plans import effective_plan, get_plan, get_subscription, refresh_subscription_state
from app.services.plans import usage as plan_usage
from app.services.subscriptions import BillingService, SubscriptionService, WebhookService, price_for

payments_router = APIRouter(prefix="/payments", tags=["payments"])
invoices_router = APIRouter(prefix="/invoices", tags=["invoices"])
subs_router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


# ---------------- customer payments (records; provider-based collection is Coming soon) --------------
@payments_router.get("", response_model=list[PaymentOut])
def list_payments(status: str | None = None, limit: int = Query(100, le=300), ctx: TenantContext = Depends(require_feature("customers", "payments:read")), db: Session = Depends(get_db)):
    where = [Payment.status == status] if status else []
    return PaymentRepository(db, ctx.business_id).list(*where, order_by=Payment.created_at.desc(), limit=limit)


@payments_router.get("/summary")
def payment_summary(ctx: TenantContext = Depends(require_feature("customers", "payments:read")), db: Session = Depends(get_db)):
    bid = ctx.business_id
    def total(*w): return db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.business_id == bid, *w)) or Decimal("0")
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    outstanding = db.scalar(select(func.coalesce(func.sum(Invoice.total), 0)).where(Invoice.business_id == bid, Invoice.deleted_at.is_(None), Invoice.payment_status == PaymentStatus.PENDING)) or Decimal("0")
    count = db.scalar(select(func.count()).select_from(Payment).where(Payment.business_id == bid)) or 0
    return {"currency": ctx.business.currency, "revenue_total": str(total(Payment.status == PaymentStatus.PAID)), "revenue_this_month": str(total(Payment.status == PaymentStatus.PAID, Payment.paid_at >= month_start)),
            "pending": str(total(Payment.status == PaymentStatus.PENDING)), "refunded": str(total(Payment.status == PaymentStatus.REFUNDED)),
            "outstanding_invoices": str(outstanding), "transactions": count,
            "providers": [{"name": "MANUAL", "label": "Record payments manually", "configured": True},
                          {"name": "MPESA", "label": "M-Pesa collection from your customers", "configured": False, "note": "Coming soon"}]}


@payments_router.post("", response_model=PaymentOut, status_code=201)
def record_payment(body: PaymentIn, request: Request, ctx: TenantContext = Depends(require_feature("customers", "payments:write")), db: Session = Depends(get_db)):
    if body.customer_id:
        or404(CustomerRepository(db, ctx.business_id).get(body.customer_id), "Customer")
    if body.invoice_id:
        inv = or404(InvoiceRepository(db, ctx.business_id).get(body.invoice_id), "Invoice")
    try:
        phone = normalize_phone(body.payer_phone, ctx.business.country_code) if body.payer_phone else None
    except ValueError as e:
        raise bad_request(str(e))
    p = PaymentRepository(db, ctx.business_id).add(**body.model_dump(exclude={"payer_phone"}), payer_phone=phone, currency=ctx.business.currency, provider="MANUAL",
                                                   paid_at=datetime.now(timezone.utc) if body.status == PaymentStatus.PAID else None)
    db.add(Transaction(business_id=ctx.business_id, purpose="CUSTOMER_PAYMENT", payment_id=p.id, provider="MANUAL", amount=p.amount, currency=p.currency, status=p.status, provider_reference=p.provider_reference))
    if body.invoice_id and body.status == PaymentStatus.PAID:
        paid = db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.invoice_id == inv.id, Payment.status == PaymentStatus.PAID)) or 0
        if Decimal(paid) >= inv.total:
            inv.payment_status = PaymentStatus.PAID
    log(ctx, "payment.recorded", request, "payment", p.id, amount=str(p.amount))
    db.commit()
    return p


@payments_router.patch("/{pid}", response_model=PaymentOut)
def update_payment(pid: uuid.UUID, body: PaymentUpdate, request: Request, ctx: TenantContext = Depends(require_feature("customers", "payments:write")), db: Session = Depends(get_db)):
    p = or404(PaymentRepository(db, ctx.business_id).get(pid), "Payment")
    p.status = body.status
    if body.status == PaymentStatus.PAID and not p.paid_at:
        p.paid_at = datetime.now(timezone.utc)
    log(ctx, "payment.status_changed", request, "payment", p.id, status=body.status)
    db.commit()
    return p


# ---------------- invoices ---------------------------------------------------
@invoices_router.get("", response_model=list[InvoiceOut])
def list_invoices(ctx: TenantContext = Depends(require_feature("invoices", "invoices:read")), db: Session = Depends(get_db)):
    return InvoiceRepository(db, ctx.business_id).list(order_by=Invoice.created_at.desc(), limit=200)


@invoices_router.post("", response_model=InvoiceOut, status_code=201)
def create_invoice(body: InvoiceIn, request: Request, ctx: TenantContext = Depends(require_feature("invoices", "invoices:write")), db: Session = Depends(get_db)):
    cust = or404(CustomerRepository(db, ctx.business_id).get(body.customer_id), "Customer") if body.customer_id else None
    name = cust.name if cust else (body.customer_name or "").strip()
    if not name:
        raise bad_request("Customer name is required")
    tax_rate = Decimal(get_country(ctx.business.country_code).tax_rate) if body.apply_tax else Decimal("0")
    inv = inv_svc.create_invoice(db, ctx.business, customer_id=cust.id if cust else None, booking_id=body.booking_id, customer_name=name,
                                 customer_phone=cust.phone if cust else body.customer_phone, items=[i.model_dump() for i in body.items], discount=body.discount,
                                 tax_rate=tax_rate, due_on=body.due_on, notes=body.notes)
    log(ctx, "invoice.created", request, "invoice", inv.id, number=inv.number)
    db.commit()
    return inv


@invoices_router.get("/{iid}", response_model=InvoiceOut)
def get_invoice(iid: uuid.UUID, ctx: TenantContext = Depends(require_feature("invoices", "invoices:read")), db: Session = Depends(get_db)):
    return or404(InvoiceRepository(db, ctx.business_id).get(iid), "Invoice")


@invoices_router.get("/{iid}/pdf")
def invoice_pdf(iid: uuid.UUID, ctx: TenantContext = Depends(require_feature("invoices", "invoices:read")), db: Session = Depends(get_db)):
    inv = or404(InvoiceRepository(db, ctx.business_id).get(iid), "Invoice")
    return Response(inv_svc.render_pdf(ctx.business, inv), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{inv.number}.pdf"'})


@invoices_router.post("/{iid}/mark-paid", response_model=InvoiceOut)
def mark_paid(iid: uuid.UUID, request: Request, method: str = "CASH", ctx: TenantContext = Depends(require_feature("invoices", "payments:write")), db: Session = Depends(get_db)):
    inv = or404(InvoiceRepository(db, ctx.business_id).get(iid), "Invoice")
    if inv.payment_status == PaymentStatus.PAID:
        return inv
    p = PaymentRepository(db, ctx.business_id).add(amount=inv.total, currency=inv.currency, method=method if method in ("CASH", "MPESA", "CARD", "BANK", "OTHER") else "OTHER", provider="MANUAL",
                                                   customer_id=inv.customer_id, invoice_id=inv.id, status=PaymentStatus.PAID, paid_at=datetime.now(timezone.utc))
    inv.payment_status = PaymentStatus.PAID
    log(ctx, "invoice.paid", request, "invoice", inv.id, payment_id=str(p.id))
    db.commit()
    return inv


# ---------------- subscriptions ---------------------------------------------
@subs_router.get("/plans")
def plans(currency: str = "KES", db: Session = Depends(get_db)):
    """Public. Prices come from the database (editable in /admin) — never hardcoded in the UI."""
    rows = db.scalars(select(Plan).where(Plan.is_public.is_(True), Plan.is_active.is_(True)).order_by(Plan.position))
    return [{**PlanOut.model_validate(p).model_dump(), "price": (p.prices or {}).get(currency), "currency": currency} for p in rows]


@subs_router.get("/providers")
def providers(_: TenantContext = Depends(get_tenant)):
    return available_providers()


@subs_router.get("/me")
def my_subscription(ctx: TenantContext = Depends(get_tenant), db: Session = Depends(get_db)):
    sub = get_subscription(db, ctx.business_id)
    plan = effective_plan(db, ctx.business)
    if sub:
        refresh_subscription_state(db, sub)
        db.commit()
    txns = list(db.scalars(select(Transaction).where(Transaction.business_id == ctx.business_id, Transaction.purpose == "SUBSCRIPTION").order_by(Transaction.created_at.desc()).limit(20)))
    return {"effective_plan": {"key": plan.key, "name": plan.name, "features": plan.features},
            "subscription": None if not sub else {"status": sub.status, "plan_key": sub.plan.key, "plan_name": sub.plan.name, "currency": sub.currency,
                                                  "price": str(sub.price_override if sub.price_override is not None else price_for(sub.plan, sub.currency) or 0),
                                                  "trial_ends_at": sub.trial_ends_at, "current_period_end": sub.current_period_end, "cancel_at_period_end": sub.cancel_at_period_end,
                                                  "grace_ends_at": sub.grace_ends_at, "data_retained_until": sub.data_retained_until},
            "transactions": [{"id": str(t.id), "amount": str(t.amount), "currency": t.currency, "status": t.status, "provider": t.provider, "created_at": t.created_at} for t in txns],
            "providers": available_providers()}


@subs_router.get("/usage")
def my_usage(ctx: TenantContext = Depends(get_tenant), db: Session = Depends(get_db)):
    """What this plan includes and how much is used. A limit of null means unlimited."""
    plan = effective_plan(db, ctx.business)
    return {"plan": {"key": plan.key, "name": plan.name}, "usage": plan_usage(db, ctx.business), "features": plan.features}


@subs_router.get("/transactions/{tid}/receipt")
def receipt(tid: uuid.UUID, ctx: TenantContext = Depends(require("subscription:manage")), db: Session = Depends(get_db)):
    """A simple PDF receipt for a successful subscription payment."""
    import io

    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    t = or404(db.scalars(select(Transaction).where(Transaction.id == tid, Transaction.business_id == ctx.business_id, Transaction.purpose == "SUBSCRIPTION")).first(), "Receipt")
    if t.status != "SUCCESS" and t.status != "PAID":
        raise bad_request("A receipt is available once the payment has succeeded")
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    c.setFont("Helvetica-Bold", 22); c.drawString(60, h - 90, "Receipt")
    c.setFont("Helvetica", 11)
    lines = [("Business", ctx.business.name), ("Description", "Aqivo.shop subscription"), ("Amount", f"{t.currency} {t.amount:,.2f}"), ("Payment method", t.provider.title()),
             ("Reference", t.provider_reference or str(t.id)[:8]), ("Date", t.created_at.strftime("%d %b %Y %H:%M UTC"))]
    y = h - 140
    for k, v in lines:
        c.setFillGray(0.4); c.drawString(60, y, k); c.setFillGray(0); c.drawString(200, y, str(v)); y -= 24
    c.setFillGray(0.5); c.setFont("Helvetica", 9); c.drawString(60, 60, "Aqivo.shop — thank you for your business.")
    c.showPage(); c.save()
    return Response(buf.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="receipt-{str(t.id)[:8]}.pdf"'})


@subs_router.post("/checkout")
def checkout(body: CheckoutIn, request: Request, ctx: TenantContext = Depends(require("subscription:manage")), db: Session = Depends(get_db)):
    plan = db.scalars(select(Plan).where(Plan.key == body.plan_key, Plan.is_active.is_(True))).first()
    if not plan:
        raise bad_request("Unknown plan")
    try:
        phone = normalize_phone(body.phone, ctx.business.country_code) if body.phone else ctx.business.phone
    except ValueError as e:
        raise bad_request(str(e))
    res = BillingService.checkout(db, ctx.business, plan, phone=phone, provider_name=body.provider, user=ctx.user)
    log(ctx, "subscription.checkout", request, "plan", plan.key, result=res["status"])
    db.commit()
    return res


@subs_router.post("/cancel")
def cancel(request: Request, ctx: TenantContext = Depends(require("subscription:manage")), db: Session = Depends(get_db)):
    sub = or404(get_subscription(db, ctx.business_id), "Subscription")
    SubscriptionService.cancel(db, sub, ctx.user)
    db.commit()
    return {"status": sub.status, "cancel_at_period_end": sub.cancel_at_period_end, "current_period_end": sub.current_period_end,
            "message": "Your plan stays active until the end of the paid period. Your data is kept — nothing is deleted."}


@subs_router.post("/resume")
def resume(ctx: TenantContext = Depends(require("subscription:manage")), db: Session = Depends(get_db)):
    sub = or404(get_subscription(db, ctx.business_id), "Subscription")
    SubscriptionService.resume(db, sub)
    db.commit()
    return {"status": sub.status}


@subs_router.post("/webhooks/{provider}")
async def webhook(provider: str, request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    try:
        payload = await request.json()
    except Exception:  # noqa: BLE001
        return Response(status_code=400)
    res = WebhookService.process(db, provider.upper(), headers=dict(request.headers), body=body, query=dict(request.query_params), payload=payload)
    if res["code"] in (200,):
        db.commit()
    else:
        db.rollback()
    return Response(status_code=res["code"])
