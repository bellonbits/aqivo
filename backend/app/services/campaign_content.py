"""Channel copy for a growth campaign. Built from the owner's own words (offer, target, code, dates) — nothing is invented.
An LLM only polishes the wording when ANTHROPIC_API_KEY is set; otherwise templates are used and labelled as such."""
from __future__ import annotations

from datetime import date

from app.models import Business, MarketingCampaign
from app.services import ai as ai_svc
from app.services.links import CHANNEL_LABELS, tracked_url

CHANNELS = ("whatsapp", "instagram", "facebook", "tiktok", "google", "website", "qr")
OBJECTIVES = {"BOOKINGS": "get bookings", "SALES": "sell products", "LEADS": "get enquiries", "REVIEWS": "collect reviews", "WINBACK": "win customers back", "AWARENESS": "get found"}
CTA = {"BOOKINGS": "Book your slot", "SALES": "Shop now", "LEADS": "Message us", "REVIEWS": "Leave a review", "WINBACK": "Come back and see us", "AWARENESS": "Take a look"}


def _when(c: MarketingCampaign) -> str:
    if c.starts_on and c.ends_on:
        return f" {c.starts_on:%d %b} – {c.ends_on:%d %b}."
    if c.ends_on:
        return f" Until {c.ends_on:%d %b}."
    return ""


def _hashtags(b: Business) -> str:
    import re
    tags = [re.sub(r"[^a-z0-9]", "", x.lower()) for x in (b.city.split(",")[0] if b.city else "", b.category, b.name)]
    return " ".join(f"#{t}" for t in tags if t)[:90]


def generate(b: Business, c: MarketingCampaign, target_label: str, base_path: str) -> dict:
    cta = CTA.get(c.objective or "AWARENESS", "Take a look")
    offer = c.offer_text.strip()
    code = f" Use code {c.discount_code} at checkout." if c.discount_code else ""
    focus = f"{target_label}" if target_label and target_label not in ("Storefront", "Shop", "Booking page") else b.name
    headline = offer or f"{focus} at {b.name}"
    out: dict[str, dict] = {}
    for ch in c.channels or []:
        if ch not in CHANNELS:
            continue
        link = tracked_url(b, base_path, ch, c.slug)
        if ch == "whatsapp":
            text = f"Hi {{name}}, it's {b.name}. {headline}.{_when(c)}{code} {cta}: {link}"
        elif ch == "instagram":
            text = f"{headline}{'.' if not headline.endswith('.') else ''}{_when(c)}{code}\n{cta} — link in bio.\n\n{_hashtags(b)}"
        elif ch == "facebook":
            text = f"{headline}{'.' if not headline.endswith('.') else ''}{_when(c)}{code}\n{cta}: {link}"
        elif ch == "tiktok":
            text = f"{headline}{'.' if not headline.endswith('.') else ''} {cta.lower()} — link in bio.\n{_hashtags(b)}"
        elif ch == "google":
            text = f"{headline}.{_when(c)}{code} {cta}."
        elif ch == "website":
            text = headline
        else:  # qr
            text = {"BOOKINGS": "Scan to book", "SALES": "Scan to order", "REVIEWS": "Scan to review us", "LEADS": "Scan to message us"}.get(c.objective or "", "Scan to visit us")
        used = "template"
        if ch in ("instagram", "facebook", "tiktok", "google", "whatsapp"):
            polished = ai_svc._llm(f"Rewrite this {CHANNEL_LABELS[ch]} post so it sounds natural and warm. Keep every fact, date, code and link exactly as given; max 60 words.\n\n{text}", b, 300)
            if polished:
                text, used = polished, "llm"
        out[ch] = {"text": text, "link": link, "label": CHANNEL_LABELS.get(ch, ch), "source": used}
    return out
