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
    "verify_email": ("Verify your Aqivo account", "Hi {name},\n\nWelcome to Aqivo! Please verify your email address to confirm your account and get your online store ready:\n\n{app_url}/verify-email?token={token}\n\nThis verification link expires in 24 hours. If you did not create an account on Aqivo, you can safely ignore this email."),
    "password_reset": ("Reset your Aqivo password", "Hi {name},\n\nWe received a request to reset your password. Use the link below to choose a new password (valid for 30 minutes):\n\n{app_url}/reset-password?token={token}\n\nIf you didn't request a password reset, you can safely ignore this email."),
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


def _build_html_email(subject: str, body: str, kind: str, ctx: dict) -> str:
    import html as _html
    escaped_subject = _html.escape(subject)

    s = get_settings()
    app_base = str(ctx.get('app_url') or s.app_base_url or 'https://www.aqivo.shop').rstrip('/')
    action_url = None
    action_label = "Open Aqivo"
    if kind == "verify_email":
        action_label = "Verify My Email"
        action_url = f"{app_base}/verify-email?token={ctx.get('token', '')}"
    elif kind == "password_reset":
        action_label = "Reset Password"
        action_url = f"{app_base}/reset-password?token={ctx.get('token', '')}"
    elif kind == "welcome":
        action_label = "Sign In to Your Dashboard"
        action_url = f"{app_base}/login"
    elif kind in ("website_published", "order_update") and ctx.get("url"):
        action_label = "View Website" if kind == "website_published" else "Track Order"
        action_url = ctx.get("url")
    elif kind == "new_order":
        action_label = "View Order Details"
        action_url = f"{app_base}/dashboard/orders"

    paragraphs = []
    for line in body.split("\n\n"):
        clean_line = line.strip()
        if clean_line:
            if action_url and clean_line.startswith("http") and action_url in clean_line:
                continue
            line_html = "<br>".join(_html.escape(part) for part in clean_line.split("\n"))
            paragraphs.append(f'<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">{line_html}</p>')

    content_html = "".join(paragraphs)

    button_html = ""
    if action_url:
        button_html = f'''
        <div style="margin:28px 0;text-align:center;">
            <a href="{_html.escape(action_url)}" style="display:inline-block;background-color:#0F172A;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;">
                {action_label} &rarr;
            </a>
        </div>
        <p style="margin:16px 0 0;font-size:12px;color:#94A3B8;word-break:break-all;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="{_html.escape(action_url)}" style="color:#2563EB;">{_html.escape(action_url)}</a>
        </p>
        '''

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{escaped_subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;padding:32px 16px;">
        <tr>
            <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
                    <tr>
                        <td style="padding:24px 32px 18px;border-bottom:1px solid #F1F5F9;">
                            <span style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#0F172A;">Aqivo</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#0F172A;line-height:1.3;">{escaped_subject}</h1>
                            {content_html}
                            {button_html}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;background-color:#F8FAFC;border-top:1px solid #F1F5F9;font-size:12px;color:#64748B;text-align:center;">
                            <div>&copy; 2026 Aqivo &middot; Modern commerce for Africa</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'''


import concurrent.futures
import time

_executor = concurrent.futures.ThreadPoolExecutor(max_workers=6, thread_name_prefix="aqivo-notify")


def _update_notification_status(notification_id, status: str, err: str | None = None) -> None:
    if not notification_id:
        return
    from app.core.db import SessionLocal
    for _ in range(5):
        try:
            with SessionLocal() as s_db:
                n = s_db.get(Notification, notification_id)
                if n is not None:
                    n.status = status
                    if err:
                        n.error = str(err)[:300]
                    s_db.commit()
                    return
        except Exception as exc:  # noqa: BLE001
            log.warning("Failed to update notification status", extra={"id": str(notification_id), "error": str(exc)})
        time.sleep(0.15)


def _send_email_network(to: str, subject: str, body: str, kind: str, ctx: dict) -> tuple[str, str | None]:
    s = get_settings()

    # Attempt Resend API first if configured
    if s.resend_api_key:
        try:
            import httpx
            html_body = _build_html_email(subject, body, kind, ctx)
            res = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {s.resend_api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "aqivo-backend/1.0",
                },
                json={
                    "from": s.email_from,
                    "to": [to],
                    "subject": subject,
                    "text": body,
                    "html": html_body,
                },
                timeout=8.0,
            )
            if res.is_success:
                res_data = res.json()
                log.info("email sent via Resend", extra={"to": to, "id": res_data.get("id"), "subject": subject})
                return "SENT", None
            else:
                err_msg = f"Resend {res.status_code}: {res.text[:250]}"
                log.warning("Resend email delivery failed", extra={"to": to, "status": res.status_code, "response": res.text[:250]})
                if not s.smtp_host:
                    return "FAILED", err_msg
        except Exception as exc:  # noqa: BLE001
            log.warning("Resend API error, trying SMTP fallback if configured", extra={"to": to, "error": str(exc)})
            if not s.smtp_host:
                return "FAILED", str(exc)[:300]

    # Fall back to SMTP when Resend is not configured or fails
    if not s.smtp_host:
        log.info("email not sent (neither Resend nor SMTP configured)", extra={"to": to, "subject": subject})
        return "LOGGED", None

    try:
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = s.email_from, to, subject
        msg.set_content(body)
        with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=8) as smtp:
            smtp.starttls()
            if s.smtp_user:
                smtp.login(s.smtp_user, s.smtp_password)
            smtp.send_message(msg)
        return "SENT", None
    except Exception as exc:  # noqa: BLE001
        log.warning("email failed", extra={"to": to, "error": str(exc)})
        return "FAILED", str(exc)[:300]


def _deliver_email_worker(notification_id, to: str, subject: str, body: str, kind: str, ctx: dict) -> None:
    status, err = _send_email_network(to, subject, body, kind, ctx)
    _update_notification_status(notification_id, status, err)


def _deliver_sms_worker(notification_id, to: str, text: str) -> None:
    from app.services import sms
    res = sms.send_sms(to, text)
    if res.get("status") == "success":
        status, err = "SENT", None
    else:
        status, err = "FAILED", str(res.get("message", "SMS send failed"))[:300]
    _update_notification_status(notification_id, status, err)


def notify(db: Session, kind: str, to: str | None, *, business_id=None, user_id=None, sync: bool = False, **ctx) -> Notification:
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

    # In automated tests, avoid real external network calls
    if s.environment == "test":
        n.status = "SENT" if (s.resend_api_key or s.smtp_host) else "LOGGED"
        return n

    if sync:
        status, err = _send_email_network(to, subject, body, kind, ctx)
        n.status = status
        if err:
            n.error = err
        return n

    # Offload external network delivery to background thread pool so caller is never blocked
    db.flush()
    _executor.submit(_deliver_email_worker, n.id, to, subject, body, kind, ctx)
    return n


def notify_sms(db: Session, to: str | None, text: str, *, business_id=None, user_id=None, kind: str = "sms", sync: bool = False) -> Notification:
    """Queue and attempt SMS delivery via OpenSMS. Never raises."""
    s = get_settings()
    n = Notification(kind=kind, channel="SMS", recipient=to, subject="SMS", body=text,
                     business_id=business_id, user_id=user_id, status="QUEUED")
    db.add(n)
    if not to:
        n.status = "LOGGED"
        return n

    if s.environment == "test":
        n.status = "SENT" if s.opensms_api_token else "LOGGED"
        return n

    if sync:
        from app.services import sms
        res = sms.send_sms(to, text)
        if res.get("status") == "success":
            n.status = "SENT"
        else:
            n.status = "FAILED"
            n.error = str(res.get("message", "SMS send failed"))[:300]
        return n

    db.flush()
    _executor.submit(_deliver_sms_worker, n.id, to, text)
    return n
