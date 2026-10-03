"""Notification abstraction. Channels are pluggable; EMAIL sends via SMTP when configured,
otherwise the message is stored with status LOGGED (never pretend it was delivered)."""
import logging
import smtplib
from email.message import EmailMessage

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Notification

log = logging.getLogger("bizora.notify")

TEMPLATES = {
    "welcome": ("Welcome to Aqivo, {name}", "Hi {name},\n\nYour business {business} is set up on Aqivo.shop. Build your store, sell online, grow your business.\n\nSign in: {app_url}/login"),
    "website_published": ("Your website is live", "{business} is now live at {url}\n\nShare it on WhatsApp, Instagram and your QR code."),
    "payment_success": ("Payment received", "We received your payment of {currency} {amount} for {business}. Thank you."),
    "payment_failed": ("Payment failed", "Your payment for {business} did not go through. Please retry from Settings → Subscription."),
    "subscription_expiring": ("Your subscription is ending soon", "Your {plan} plan for {business} ends on {date}. Renew to keep your website and tools active."),
    "new_booking": ("New booking: {customer}", "{customer} requested {service} on {when}.\nPhone: {phone}"),
    "new_lead": ("New lead: {customer}", "{customer} enquired about {service} via {source}.\nPhone: {phone}\n\n{message}"),
    "review_received": ("New {rating}★ review", "{author} left a {rating}-star review for {business}:\n\n{comment}"),
    "new_order": ("New order #{number}: {total}", "{customer} placed order #{number} for {total} ({items}).\nPayment: {payment}\nPhone: {phone}\n\nOpen it: {app_url}/dashboard/orders"),
    "order_update": ("Order #{number} — {status}", "Hi {customer},\n\nYour order #{number} with {business} is now: {status}.\n\nTrack it: {url}"),
    "growth_ready": ("{title}", "{body}\n\nOpen it: {app_url}{href}\n\nNothing has been sent to your customers. You review and send it yourself."),
    "login_code": ("Your {business} login code", "Your login code is {code}. It expires in {minutes} minutes.\n\nIf you didn't ask for it, ignore this email."),
    "team_invite": ("You've been added to {business}", "Hi {name},\n\nYou now have access to {business} on Aqivo. Sign in at {app_url}/login"),
}


class _SafeDict(dict):
    def __missing__(self, key):
        return ""


def notify(db: Session, kind: str, to: str | None, *, business_id=None, user_id=None, **ctx) -> Notification:
    """Queue + attempt delivery. Never raises: notification failure must not break the request."""
    s = get_settings()
    subject_t, body_t = TEMPLATES[kind]
    ctx.setdefault("app_url", s.app_base_url)
    subject = subject_t.format_map(_SafeDict(ctx))
    body = body_t.format_map(_SafeDict(ctx))
    n = Notification(kind=kind, channel="EMAIL", recipient=to, subject=subject, body=body, business_id=business_id,
                     user_id=user_id, status="QUEUED")
    db.add(n)
    if not to:
        n.status = "LOGGED"
        return n
    if not s.smtp_host:
        n.status = "LOGGED"
        log.info("email not sent (SMTP not configured)", extra={"to": to, "subject": subject})
        return n
    try:
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = s.email_from, to, subject
        msg.set_content(body)
        with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=10) as smtp:
            smtp.starttls()
            if s.smtp_user:
                smtp.login(s.smtp_user, s.smtp_password)
            smtp.send_message(msg)
        n.status = "SENT"
    except Exception as exc:  # noqa: BLE001
        n.status = "FAILED"
        n.error = str(exc)[:300]
        log.warning("email failed", extra={"to": to, "error": str(exc)})
    return n
