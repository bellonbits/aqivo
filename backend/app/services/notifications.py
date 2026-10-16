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
    "order_receipt": ("Thanks for your purchase! Order #{number}", "Hi {customer},\n\nHere is your receipt for order #{number} with {business}.\nTotal: {total}\nItems: {items}\n\nTrack it: {url}"),
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
    from datetime import datetime
    escaped_subject = _html.escape(subject)

    s = get_settings()
    app_base = str(ctx.get('app_url') or s.app_base_url or 'https://aqivo.shop').rstrip('/')
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
        action_label = "View Website" if kind == "website_published" else "Track your order"
        action_url = ctx.get("url")
    elif kind in ("new_order", "order_receipt") and ctx.get("url"):
        action_label = "Track your order"
        action_url = ctx.get("url")
    elif kind == "new_order":
        action_label = "View Order Details"
        action_url = f"{app_base}/dashboard/orders"

    is_order = kind in ("order_receipt", "new_order", "order_update") or bool(ctx.get("order_items") or ctx.get("order_number") or ctx.get("number"))

    # Top Brand / Store Logo
    store_logo = ctx.get("store_logo")
    logo_src = "https://aqivo.shop/brand/logo-full.png"
    if store_logo and str(store_logo).strip():
        logo_html = f'''<img src="{_html.escape(str(store_logo))}" alt="Store Logo" height="38" style="max-height:42px;height:auto;max-width:180px;display:block;border:0;" onerror="this.onerror=null;this.src='https://aqivo.shop/brand/logo-full.png';" />'''
    else:
        logo_html = f'''<img src="{logo_src}" alt="Aqivo" width="132" style="width:132px;max-width:150px;height:auto;display:block;border:0;" onerror="this.onerror=null;this.src='https://aqivo.shop/brand/aqivo-logo.png';" />'''

    if is_order:
        order_num = str(ctx.get("order_number") or ctx.get("number") or "").strip()
        customer_name = str(ctx.get("customer") or ctx.get("customer_name") or ctx.get("name") or "there").strip()
        order_total = str(ctx.get("total") or "").strip()
        subtotal = str(ctx.get("subtotal") or "").strip()
        tax = str(ctx.get("tax") or "").strip()
        delivery_fee = str(ctx.get("delivery_fee") or ctx.get("shipping") or "").strip()
        payment_method = str(ctx.get("payment") or ctx.get("payment_method") or "Credit Card").strip()
        date_str = str(ctx.get("date") or ctx.get("eta") or datetime.now().strftime("%B %d, %Y")).strip()
        raw_address = str(ctx.get("address") or "Store Collection / Delivery").strip()
        address_html = "<br>".join(_html.escape(line) for line in raw_address.split("\n") if line.strip())

        order_heading = "Thanks for your purchase!"
        order_subtitle = f"Hi {customer_name}, here's your receipt"
        if kind == "order_update":
            status_txt = str(ctx.get("status") or "Updated").strip()
            order_heading = f"Order #{order_num} Update"
            order_subtitle = f"Hi {customer_name}, your order status is now: {status_txt}"
        elif kind == "new_order":
            order_heading = f"New Order Received! #{order_num}"
            order_subtitle = f"Hi {customer_name}, a new order has been placed"

        # Line items
        order_items = ctx.get("order_items")
        items_rows_html = []
        product_image = str(ctx.get("product_image") or "").strip()

        if isinstance(order_items, list) and order_items:
            for it in order_items:
                if not isinstance(it, dict):
                    continue
                name_clean = _html.escape(str(it.get("name") or "Item"))
                variant_txt = str(it.get("variant") or "").strip()
                if variant_txt:
                    name_clean += f' <span style="color:#6B7280;font-weight:400;">({_html.escape(variant_txt)})</span>'
                qty_val = int(it.get("qty") or it.get("quantity") or 1)
                if qty_val > 1:
                    name_clean = f'{qty_val}× ' + name_clean
                price_clean = _html.escape(str(it.get("total") or it.get("price") or ""))
                if not product_image and it.get("image"):
                    product_image = str(it.get("image")).strip()
                items_rows_html.append(f'''
                <tr>
                    <td style="font-size:13.5px;color:#1F2937;font-weight:500;padding:5px 0;">{name_clean}</td>
                    <td align="right" style="font-size:13.5px;color:#111827;font-weight:700;padding:5px 0;white-space:nowrap;">{price_clean}</td>
                </tr>''')
        elif ctx.get("items"):
            items_str = str(ctx.get("items"))
            items_rows_html.append(f'''
            <tr>
                <td style="font-size:13.5px;color:#1F2937;font-weight:500;padding:5px 0;">{_html.escape(items_str)}</td>
                <td align="right" style="font-size:13.5px;color:#111827;font-weight:700;padding:5px 0;white-space:nowrap;">{_html.escape(order_total)}</td>
            </tr>''')

        if not items_rows_html:
            items_rows_html.append(f'''
            <tr>
                <td style="font-size:13.5px;color:#1F2937;font-weight:500;padding:5px 0;">Order #{_html.escape(order_num)} Items</td>
                <td align="right" style="font-size:13.5px;color:#111827;font-weight:700;padding:5px 0;white-space:nowrap;">{_html.escape(order_total)}</td>
            </tr>''')

        # Additional financial lines (tax / delivery)
        extra_rows_html = []
        if tax and tax not in ("0", "$ 0.00", "0.00", "KSh 0"):
            extra_rows_html.append(f'''
            <tr>
                <td style="font-size:13px;color:#6B7280;padding:3px 0;">Tax</td>
                <td align="right" style="font-size:13px;color:#374151;font-weight:600;padding:3px 0;">{_html.escape(tax)}</td>
            </tr>''')
        if delivery_fee:
            extra_rows_html.append(f'''
            <tr>
                <td style="font-size:13px;color:#6B7280;padding:3px 0;">Shipping</td>
                <td align="right" style="font-size:13px;color:#374151;font-weight:600;padding:3px 0;">{_html.escape(delivery_fee)}</td>
            </tr>''')

        items_table_html = "".join(items_rows_html) + "".join(extra_rows_html)

        # Right-side Product Image or Clean Fallback
        if product_image:
            product_img_html = f'''<img src="{_html.escape(product_image)}" alt="Purchased Product" width="220" style="width:100%;max-width:220px;height:auto;border-radius:18px;display:block;margin:0 auto;box-shadow:0 6px 18px rgba(0,0,0,0.06);object-fit:cover;" onerror="this.style.display='none';" />'''
        else:
            product_img_html = '''
            <div style="width:100%;max-width:220px;margin:0 auto;height:180px;background-color:#E2E6EA;border-radius:18px;display:flex;align-items:center;justify-content:center;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
                <div style="padding:20px;">
                    <div style="font-size:40px;line-height:1;margin-bottom:8px;">🛍️</div>
                    <div style="font-size:12px;font-weight:700;color:#64748B;letter-spacing:0.5px;text-transform:uppercase;">Confirmed Order</div>
                </div>
            </div>'''

        track_url = action_url or f"{app_base}/receipt.html?orderId={order_num}"
        track_btn_html = f'''
        <div style="margin-top:20px;text-align:center;">
            <a href="{_html.escape(track_url)}" style="display:inline-block;background-color:#FFFFFF;color:#111827;border-radius:9999px;padding:12px 28px;font-size:13.5px;font-weight:700;text-decoration:none;border:1px solid #D1D5DB;box-shadow:0 2px 5px rgba(0,0,0,0.05);text-align:center;">
                Track your order
            </a>
        </div>'''

        card_content = f'''
        <h1 style="margin:20px 0 6px;font-size:25px;font-weight:800;color:#111827;letter-spacing:-0.5px;line-height:1.2;">
            {_html.escape(order_heading)}
        </h1>
        <div style="margin:0 0 20px;font-size:15px;font-weight:500;color:#4B5563;">
            {_html.escape(order_subtitle)}
        </div>

        <div style="border-top:1px solid #D5D9DF;margin-bottom:24px;"></div>

        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <!-- Left Column: Order Items & Metadata -->
                <td width="57%" valign="top" style="padding-right:24px;">
                    <div style="font-size:15px;font-weight:800;color:#111827;margin-bottom:14px;">
                        Order #{_html.escape(order_num)}
                    </div>

                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        {items_table_html}
                    </table>

                    <div style="border-top:1px solid #D5D9DF;margin:14px 0;"></div>

                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td style="font-size:14.5px;font-weight:900;color:#111827;letter-spacing:0.5px;">TOTAL</td>
                            <td align="right" style="font-size:15.5px;font-weight:900;color:#111827;">{_html.escape(order_total)}</td>
                        </tr>
                    </table>

                    <div style="height:26px;"></div>

                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td width="50%" valign="top" style="padding-right:12px;">
                                <div style="font-size:12.5px;font-weight:700;color:#111827;margin-bottom:3px;">Payment Method</div>
                                <div style="font-size:12.5px;color:#4B5563;margin-bottom:14px;">{_html.escape(payment_method)}</div>

                                <div style="font-size:12.5px;font-weight:700;color:#111827;margin-bottom:3px;">ETA / Date</div>
                                <div style="font-size:12.5px;color:#4B5563;">{_html.escape(date_str)}</div>
                            </td>
                            <td width="50%" valign="top">
                                <div style="font-size:12.5px;font-weight:700;color:#111827;margin-bottom:3px;">Ship to</div>
                                <div style="font-size:12.5px;color:#4B5563;line-height:1.45;">{address_html}</div>
                            </td>
                        </tr>
                    </table>
                </td>

                <!-- Right Column: Product Image & Track Button -->
                <td width="43%" valign="top" align="center" style="padding-left:8px;">
                    {product_img_html}
                    {track_btn_html}
                </td>
            </tr>
        </table>
        '''
    else:
        # Standard Transactional / Account Emails
        paragraphs = []
        for line in body.split("\n\n"):
            clean_line = line.strip()
            if clean_line:
                if action_url and clean_line.startswith("http") and action_url in clean_line:
                    continue
                line_html = "<br>".join(_html.escape(part) for part in clean_line.split("\n"))
                paragraphs.append(f'<p style="margin:0 0 16px;font-size:14.5px;line-height:1.65;color:#374151;">{line_html}</p>')

        content_html = "".join(paragraphs)

        button_html = ""
        if action_url:
            button_html = f'''
            <div style="margin:28px 0;text-align:center;">
                <a href="{_html.escape(action_url)}" style="display:inline-block;background-color:#111827;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;padding:13px 34px;border-radius:9999px;box-shadow:0 3px 8px rgba(0,0,0,0.12);">
                    {action_label} &rarr;
                </a>
            </div>
            <p style="margin:18px 0 0;font-size:12px;color:#6B7280;word-break:break-all;text-align:center;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="{_html.escape(action_url)}" style="color:#2563EB;">{_html.escape(action_url)}</a>
            </p>
            '''

        card_content = f'''
        <h1 style="margin:20px 0 8px;font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.4px;line-height:1.25;">
            {escaped_subject}
        </h1>
        <div style="border-top:1px solid #D5D9DF;margin-bottom:24px;"></div>
        {content_html}
        {button_html}
        '''

    # Exact Contact Info Requested: info@aqivo.shop, 0793046776
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>{escaped_subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#E5E7EB;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#E5E7EB;padding:36px 14px 48px;">
        <tr>
            <td align="center">
                <!-- The Modern Rounded Card -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:620px;background-color:#ECEEF0;border:1px solid #DCE0E5;border-radius:28px;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,0.06);">
                    <tr>
                        <td style="padding:36px 40px 32px;">
                            <!-- Real Top Logo -->
                            <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom:4px;">
                                <tr>
                                    <td valign="middle">
                                        {logo_html}
                                    </td>
                                </tr>
                            </table>

                            {card_content}

                            <!-- Official Footer with info@aqivo.shop and 0793046776 -->
                            <div style="margin-top:36px;padding-top:22px;border-top:1px solid #D5D9DF;font-size:12.5px;color:#6B7280;line-height:1.6;text-align:center;">
                                <p style="margin:0 0 5px;font-size:13px;color:#4B5563;">Questions or need help with your order?</p>
                                <p style="margin:0 0 12px;font-weight:600;color:#1F2937;">
                                    Email: <a href="mailto:info@aqivo.shop" style="color:#111827;text-decoration:underline;">info@aqivo.shop</a> &nbsp;&middot;&nbsp; 
                                    Phone: <a href="tel:0793046776" style="color:#111827;text-decoration:underline;">0793046776</a>
                                </p>
                                <p style="margin:0;font-size:11.5px;color:#9CA3AF;">
                                    &copy; 2026 Aqivo &middot; Modern commerce for Africa
                                </p>
                            </div>
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
