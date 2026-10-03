"""Campaigns. We never claim a message was delivered: without a WhatsApp Business API integration,
delivery = the owner tapping the prepared wa.me link, and each recipient is tracked individually."""
from datetime import datetime, timezone
from urllib.parse import quote

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import bad_request
from app.models import Business, Customer, MarketingCampaign, MarketingMessage
from app.models.enums import CampaignKind, CampaignStatus
from app.services.crm import inactive_customers

DEFAULT_TEMPLATES = {
    CampaignKind.REACTIVATION: "Hi {name}, it's {business}. We haven't seen you in a while and we miss you! Book your next visit and enjoy a treat on us. Reply here to pick a time.",
    CampaignKind.NEW_SERVICE: "Hi {name}, {business} has something new: {service}. Reply to this message to book your slot.",
    CampaignKind.BIRTHDAY: "Happy birthday {name}! 🎂 {business} has a little gift for you this month. Reply to book.",
    CampaignKind.REVIEW_REQUEST: "Hi {name}, thanks for visiting {business}. Could you spare 30 seconds to leave a review? {review_link}",
    CampaignKind.SPECIAL_OFFER: "Hi {name}, this week only at {business}: {offer}. Reply to book your slot.",
    CampaignKind.WHATSAPP: "Hi {name}, this is {business}. {offer}",
}


def render_message(template: str, business: Business, customer_name: str, **extra) -> str:
    first = (customer_name or "there").split()[0]
    vals = {"name": first, "business": business.name, "service": "", "offer": "", "review_link": "", **extra}
    out = template
    for k, v in vals.items():
        out = out.replace("{" + k + "}", str(v))
    return out


def resolve_audience(db: Session, business: Business, audience: dict) -> list[Customer]:
    t = audience.get("type", "all")
    if t == "inactive":
        return [c for c, _ in inactive_customers(db, business.id, int(audience.get("days", 45)))]
    if t == "ids":
        ids = audience.get("customer_ids", [])
        return list(db.scalars(select(Customer).where(Customer.business_id == business.id, Customer.id.in_(ids), Customer.deleted_at.is_(None),
                                                      Customer.whatsapp_opt_out.is_(False), Customer.phone.is_not(None))))
    if t == "all":
        return list(db.scalars(select(Customer).where(Customer.business_id == business.id, Customer.deleted_at.is_(None),
                                                      Customer.whatsapp_opt_out.is_(False), Customer.phone.is_not(None))))
    if t == "birthday_month":
        month = datetime.now(timezone.utc).month
        return [c for c in db.scalars(select(Customer).where(Customer.business_id == business.id, Customer.deleted_at.is_(None), Customer.birthday.is_not(None),
                                                            Customer.whatsapp_opt_out.is_(False), Customer.phone.is_not(None))) if c.birthday.month == month]
    raise bad_request("Unknown audience")


def create_campaign(db: Session, business: Business, *, name: str, kind: str, message_template: str, audience: dict, user_id=None,
                    by_ai: bool = False, extra: dict | None = None) -> MarketingCampaign:
    from app.services.business import business_urls
    camp = MarketingCampaign(business_id=business.id, name=name, kind=kind, status=CampaignStatus.DRAFT, message_template=message_template,
                             audience=audience, created_by_id=user_id, created_by_ai=by_ai)
    db.add(camp)
    db.flush()
    extra = {"review_link": business_urls(business)["review"], **(extra or {})}
    for c in resolve_audience(db, business, audience):
        db.add(MarketingMessage(business_id=business.id, campaign_id=camp.id, customer_id=c.id, recipient_name=c.name, recipient_phone=c.phone,
                                body=render_message(message_template, business, c.name, **extra)))
    db.flush()
    db.refresh(camp)
    return camp


def wa_link(phone: str | None, body: str) -> str | None:
    if not phone:
        return None
    return f"https://wa.me/{''.join(ch for ch in phone if ch.isdigit())}?text={quote(body)}"


def confirm_campaign(db: Session, camp: MarketingCampaign) -> MarketingCampaign:
    """Owner confirmation gate. Moves DRAFT -> SCHEDULED ('ready to send'). Nothing is sent by Bizora."""
    if camp.status != CampaignStatus.DRAFT:
        raise bad_request("Only draft campaigns can be confirmed")
    if not camp.messages:
        raise bad_request("This campaign has no recipients")
    camp.status = CampaignStatus.SCHEDULED
    db.flush()
    return camp


def mark_message_sent(db: Session, camp: MarketingCampaign, msg: MarketingMessage) -> None:
    if camp.status not in (CampaignStatus.SCHEDULED, CampaignStatus.SENT):
        raise bad_request("Confirm the campaign before sending")
    now = datetime.now(timezone.utc)
    msg.status, msg.sent_at = "SENT", now
    cust = db.get(Customer, msg.customer_id) if msg.customer_id else None
    if cust:
        cust.last_contacted_at = now
    if camp.kind == CampaignKind.FOLLOWUP and msg.recipient_phone:  # the owner has now answered these leads
        from app.models import Lead
        from app.models.enums import LeadStatus
        ids = (camp.audience or {}).get("lead_ids", [])
        for l in db.scalars(select(Lead).where(Lead.business_id == camp.business_id, Lead.id.in_(ids), Lead.phone == msg.recipient_phone, Lead.status == LeadStatus.NEW)):
            l.status, l.first_response_at = LeadStatus.CONTACTED, now
    db.flush()
    if all(m.status == "SENT" for m in camp.messages):
        camp.status, camp.sent_at = CampaignStatus.SENT, now


FOLLOWUP_TEMPLATE = "Hi {name}, it's {business}. Thanks for your enquiry{about}. Would you like to go ahead? Reply here and we'll sort it out."


def create_followup_campaign(db: Session, business: Business, lead_ids: list, *, user_id=None, by_ai: bool = False) -> MarketingCampaign:
    """One prepared WhatsApp message per waiting lead. The owner reviews and taps to send; nothing is transmitted by Bizora."""
    from app.models import Lead
    from app.models.enums import LeadStatus
    leads = list(db.scalars(select(Lead).where(Lead.business_id == business.id, Lead.id.in_(lead_ids), Lead.deleted_at.is_(None), Lead.status == LeadStatus.NEW, Lead.phone.is_not(None))))
    if not leads:
        raise bad_request("Those leads have already been followed up or have no phone number")
    camp = MarketingCampaign(business_id=business.id, name=f"Follow up {len(leads)} lead{'s' if len(leads) != 1 else ''}", kind=CampaignKind.FOLLOWUP, status=CampaignStatus.DRAFT,
                             message_template=FOLLOWUP_TEMPLATE, audience={"type": "leads", "lead_ids": [str(l.id) for l in leads]}, created_by_id=user_id, created_by_ai=by_ai)
    db.add(camp)
    db.flush()
    for l in leads:
        about = f" about {l.service_name}" if l.service_name else ""
        db.add(MarketingMessage(business_id=business.id, campaign_id=camp.id, customer_id=None, recipient_name=l.name, recipient_phone=l.phone,
                                body=render_message(FOLLOWUP_TEMPLATE.replace("{about}", about), business, l.name)))
    db.flush()
    db.refresh(camp)
    return camp


def create_review_campaign(db: Session, business: Business, *, booking_ids: list, order_ids: list, user_id=None, by_ai: bool = False) -> MarketingCampaign:
    """Single-use review links for customers whose visit or order is complete. Booking links make the review 'verified'."""
    import secrets
    from app.models import Booking, Order, ReviewRequest
    from app.services.business import business_urls
    base = business_urls(business)["review"]
    seen: set = set()
    rows: list[tuple[str, str, str]] = []  # name, phone, link
    for b in db.scalars(select(Booking).where(Booking.business_id == business.id, Booking.id.in_(booking_ids), Booking.status == "COMPLETED", Booking.review_requested_at.is_(None), Booking.deleted_at.is_(None))):
        if not b.customer_phone or b.customer_id in seen:
            continue
        rr = ReviewRequest(business_id=business.id, token=secrets.token_urlsafe(18), customer_id=b.customer_id, booking_id=b.id, sent_via="WHATSAPP")
        db.add(rr)
        b.review_requested_at = datetime.now(timezone.utc)
        seen.add(b.customer_id)
        rows.append((b.customer_name, b.customer_phone, f"{base}?t={rr.token}"))
    for o in db.scalars(select(Order).where(Order.business_id == business.id, Order.id.in_(order_ids), Order.status == "COMPLETED")):
        if not o.customer_phone or o.customer_id in seen:
            continue
        rr = ReviewRequest(business_id=business.id, token=secrets.token_urlsafe(18), customer_id=o.customer_id, sent_via="WHATSAPP")
        db.add(rr)
        seen.add(o.customer_id)
        rows.append((o.customer_name, o.customer_phone, f"{base}?t={rr.token}"))
    if not rows:
        raise bad_request("Those customers have already been asked, or have no phone number")
    camp = MarketingCampaign(business_id=business.id, name=f"Review requests ({len(rows)})", kind=CampaignKind.REVIEW_REQUEST, status=CampaignStatus.DRAFT,
                             message_template=DEFAULT_TEMPLATES[CampaignKind.REVIEW_REQUEST], audience={"type": "reviews"}, created_by_id=user_id, created_by_ai=by_ai)
    db.add(camp)
    db.flush()
    for name, phone, link in rows:
        db.add(MarketingMessage(business_id=business.id, campaign_id=camp.id, recipient_name=name, recipient_phone=phone,
                                body=render_message(DEFAULT_TEMPLATES[CampaignKind.REVIEW_REQUEST], business, name, review_link=link)))
    db.flush()
    db.refresh(camp)
    return camp
