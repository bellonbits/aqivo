import io
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import bad_request
from app.models import Business, Invoice, InvoiceItem
from app.services.site_render import money

CENT = Decimal("0.01")


def q(v: Decimal) -> Decimal:
    return v.quantize(CENT, rounding=ROUND_HALF_UP)


def next_number(db: Session, business_id) -> str:
    n = (db.scalar(select(func.count()).select_from(Invoice).where(Invoice.business_id == business_id)) or 0) + 1
    return f"INV-{n:05d}"


def create_invoice(db: Session, business: Business, *, customer_id, booking_id, customer_name: str, customer_phone: str | None,
                   items: list[dict], discount: Decimal = Decimal("0"), tax_rate: Decimal = Decimal("0"), issued_on: date | None = None,
                   due_on: date | None = None, notes: str = "") -> Invoice:
    if not items:
        raise bad_request("Add at least one line item")
    lines = [(i["description"], int(i.get("quantity", 1)), Decimal(str(i["unit_price"]))) for i in items]
    subtotal = q(sum((qty * price for _, qty, price in lines), Decimal("0")))
    discount = q(Decimal(str(discount)))
    if discount < 0 or discount > subtotal:
        raise bad_request("Discount must be between 0 and the subtotal")
    tax = q((subtotal - discount) * Decimal(str(tax_rate)))
    total = q(subtotal - discount + tax)
    for attempt in range(3):
        inv = Invoice(business_id=business.id, number=next_number(db, business.id), customer_id=customer_id, booking_id=booking_id,
                      customer_name=customer_name, customer_phone=customer_phone, currency=business.currency, subtotal=subtotal, discount=discount,
                      tax=tax, total=total, issued_on=issued_on or date.today(), due_on=due_on, notes=notes)
        try:
            with db.begin_nested():
                db.add(inv)
                db.flush()
            break
        except IntegrityError:
            if attempt == 2:
                raise
    for desc, qty, price in lines:
        db.add(InvoiceItem(business_id=business.id, invoice_id=inv.id, description=desc, quantity=qty, unit_price=q(price), line_total=q(qty * price)))
    db.flush()
    db.refresh(inv)
    return inv


def render_pdf(business: Business, inv: Invoice) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=20 * mm, bottomMargin=20 * mm, title=f"Invoice {inv.number}")
    ss = getSampleStyleSheet()
    h = ParagraphStyle("h", parent=ss["Title"], fontName="Helvetica-Bold", fontSize=22, alignment=0, spaceAfter=2)
    small = ParagraphStyle("s", parent=ss["Normal"], fontSize=9, textColor=colors.HexColor("#555555"), leading=13)
    norm = ParagraphStyle("n", parent=ss["Normal"], fontSize=10, leading=14)
    els = [Paragraph(business.name, h),
           Paragraph("<br/>".join(filter(None, [business.address, business.city, business.phone, business.email])), small), Spacer(1, 10 * mm),
           Paragraph(f"<b>INVOICE {inv.number}</b>", ss["Heading2"]),
           Paragraph(f"Date: {inv.issued_on:%d %b %Y}" + (f" &nbsp;·&nbsp; Due: {inv.due_on:%d %b %Y}" if inv.due_on else ""), norm),
           Paragraph(f"Status: <b>{inv.payment_status}</b>", norm), Spacer(1, 6 * mm),
           Paragraph("<b>Bill to</b>", norm), Paragraph("<br/>".join(filter(None, [inv.customer_name, inv.customer_phone])), norm), Spacer(1, 8 * mm)]
    rows = [["Description", "Qty", "Unit price", "Amount"]] + [[i.description, str(i.quantity), money(i.unit_price, inv.currency), money(i.line_total, inv.currency)] for i in inv.items]
    rows += [["", "", "Subtotal", money(inv.subtotal, inv.currency)]]
    if inv.discount:
        rows += [["", "", "Discount", "- " + money(inv.discount, inv.currency)]]
    if inv.tax:
        rows += [["", "", "Tax", money(inv.tax, inv.currency)]]
    rows += [["", "", "Total", money(inv.total, inv.currency)]]
    t = Table(rows, colWidths=[80 * mm, 15 * mm, 35 * mm, 35 * mm])
    n = len(inv.items)
    t.setStyle(TableStyle([("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F1EE")),
                           ("LINEBELOW", (0, 0), (-1, n), 0.4, colors.HexColor("#DDDDDD")), ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                           ("FONT", (2, -1), (-1, -1), "Helvetica-Bold", 11), ("FONTSIZE", (0, 1), (-1, -2), 10), ("TOPPADDING", (0, 0), (-1, -1), 6),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    els.append(t)
    if inv.notes:
        els += [Spacer(1, 8 * mm), Paragraph(f"<b>Notes</b><br/>{inv.notes}", norm)]
    els += [Spacer(1, 14 * mm), Paragraph("Generated with Aqivo.shop", small)]
    doc.build(els)
    return buf.getvalue()
