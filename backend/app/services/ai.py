"""Bizora AI. Answers are computed from the business's own data (never invented). It can *propose* actions,
but every action is returned as a proposal that the owner must confirm through a separate endpoint —
nothing is sent or changed by the assistant itself. Text drafting uses an LLM only if ANTHROPIC_API_KEY is set;
otherwise built-in templates are used and the response says so."""
import logging
import re
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Business, Customer, Service
from app.services import analytics as an
from app.services.crm import inactive_customers
from app.services.health import health_score, next_actions
from app.services.marketing import DEFAULT_TEMPLATES
from app.models.enums import CampaignKind

log = logging.getLogger("bizora.ai")

SUGGESTIONS = [
    "What should I do today?",
    "Which source brings me the most customers?",
    "Why are my sales down?",
    "Create a weekend promotion.",
    "Write a product description for my best seller.",
    "How did my business perform this month?",
    "Which service is getting the most interest?",
    "Find customers who haven't returned.",
    "What should I promote this week?",
    "Write a WhatsApp promotion.",
    "Write an Instagram caption for my top service.",
    "Improve my business description.",
]


def _llm(prompt: str, business: Business, max_tokens: int = 400) -> str | None:
    key = get_settings().anthropic_api_key
    if not key:
        return None
    try:
        r = httpx.post("https://api.anthropic.com/v1/messages", timeout=25,
                       headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                       json={"model": "claude-haiku-4-5-20251001", "max_tokens": max_tokens,
                             "system": f"You write concise, warm marketing copy for {business.name}, a {business.category} in {business.city or 'Africa'}. "
                                       "Plain text only. Never invent prices, discounts or facts not provided.",
                             "messages": [{"role": "user", "content": prompt}]})
        r.raise_for_status()
        return r.json()["content"][0]["text"].strip()
    except Exception as exc:  # noqa: BLE001
        log.warning("llm draft failed", extra={"error": str(exc)})
        return None


def _days_in(q: str, default: int) -> int:
    m = re.search(r"(\d{2,3})\s*(?:\+)?\s*days?", q)
    return int(m.group(1)) if m else default


def _top_service(db: Session, b: Business) -> tuple[str | None, list[dict]]:
    since = an.period_start("30d", b.timezone)
    top = an.top_services(db, b.id, since)
    if top:
        return top[0]["service"], top
    first = db.scalars(select(Service).where(Service.business_id == b.id, Service.deleted_at.is_(None), Service.is_active.is_(True)).order_by(Service.position)).first()
    return (first.name if first else None), []


def answer(db: Session, b: Business, question: str) -> dict:
    q = question.lower().strip()
    if not q:
        return {"answer": "Ask me something about your business.", "data": [], "actions": [], "source": "rules"}

    # --- today's growth plan
    if re.search(r"what should i (do|focus|work on)|today'?s? (plan|priorit)|growth plan|where (do|should) i start|next step|priorit", q):
        from app.services.growth_plan import todays_plan
        items = todays_plan(db, b)
        if not items:
            return {"answer": "Nothing urgent right now — no waiting leads or orders, and nothing in your numbers that needs attention. Keep sharing your link.", "data": [], "actions": [], "source": "rules"}
        return {"answer": f"Here's what I'd do today, most important first. These come from your real numbers; I've prepared actions where I can — nothing is sent until you confirm.",
                "data": [{"label": i["title"], "value": i["detail"]} for i in items[:5]], "source": "rules", "plan": items[:5],
                "actions": [i["action"] for i in items[:5] if i.get("action")]}

    # --- acquisition channels
    if re.search(r"which (source|channel)|where (do|are|did) (my )?(customers|visitors|sales|orders)|best (source|channel)|bring(s)? (me )?(the )?most|acquisition", q):
        from app.services import growth_analytics as ga
        rows = [r for r in ga.sources(db, b, "30d") if r["visitors"] or r["leads"] or r["orders"] or r["bookings"]]
        if not rows:
            return {"answer": "No source data yet. Share links with ?source= (see Marketing → Links & QR) so I can tell Instagram, TikTok, Google and QR apart.", "data": [], "actions": [{"type": "navigate", "label": "Open links & QR", "payload": {"href": "/dashboard/marketing?tab=links"}, "requires_confirmation": False}], "source": "rules"}
        top = rows[0]
        return {"answer": f"{top['source'].title()} brought the most value in the last 30 days: {top['orders'] + top['bookings']} order/booking(s), {top['leads']} enquiries and {b.currency} {top['revenue']:,.0f} tracked revenue from {top['visitors']} visitors.",
                "data": [{"label": r["source"].title(), "value": f"{r['visitors']} visitors · {r['leads']} leads · {r['orders'] + r['bookings']} orders/bookings · {b.currency} {r['revenue']:,.0f}"} for r in rows[:6]],
                "actions": [{"type": "navigate", "label": "See all sources", "payload": {"href": "/dashboard/analytics?tab=sources"}, "requires_confirmation": False}], "source": "rules"}

    # --- why are sales down? (facts only)
    if re.search(r"why.*(down|drop|fall|fell|declin|lower|less|slow)|(sales|orders|revenue|bookings|visitors).*(down|drop|fell|declin)", q):
        from app.services import growth_analytics as ga
        c = ga.compare(db, b, 30)
        cur, prev = c["current"], c["previous"]
        if not (prev["visitors"] or prev["orders"] or prev["bookings"] or prev["leads"]):
            return {"answer": "I don't have the previous 30 days to compare with yet. Once there's a month of history I can tell you what changed.", "data": [], "actions": [], "source": "rules"}
        lines, facts = [], []
        for key, label in (("revenue", "Tracked revenue"), ("orders", "Orders"), ("bookings", "Booking requests"), ("leads", "Enquiries"), ("visitors", "Visitors")):
            a, p_ = cur[key], prev[key]
            if p_ or a:
                ch = (a - p_) / p_ * 100 if p_ else None
                facts.append({"label": label, "value": f"{a:,.0f} vs {p_:,.0f} before" + (f" ({ch:+.0f}%)" if ch is not None else "")})
        keys = [k for k in ("revenue", "orders", "bookings", "leads", "visitors") if cur[k] or prev[k]]
        down = [label for (label, k) in zip([f["label"] for f in facts], keys) if cur[k] < prev[k]]
        drop = next((d for d in c["source_changes"] if d["now"] < d["before"]), None)
        sales_now, sales_before = cur["orders"] + cur["bookings"], prev["orders"] + prev["bookings"]
        traffic = ""
        if drop and cur["visitors"] < prev["visitors"]:
            traffic = f" Visitors fell from {prev['visitors']} to {cur['visitors']}, mostly from {drop['source']} ({drop['before']} → {drop['now']})."
        if not sales_now and not sales_before:
            ans = "There were no orders or bookings in either of the last two 30-day periods, so there's no sales drop to explain." + traffic
        elif cur["revenue"] >= prev["revenue"] and sales_now >= sales_before:
            ans = "Your sales are not down: the last 30 days are level with or ahead of the 30 before." + traffic
        else:
            ans = "Compared with the previous 30 days, " + (", ".join(x.lower() for x in down) if down else "your totals") + " fell." + traffic
            if cur["visitors"] and prev["visitors"] and cur["conversion"] is not None and prev["conversion"] is not None:
                ans += f" Your visit-to-sale rate went from {prev['conversion']}% to {cur['conversion']}%."
        ans += " I can only see what's recorded here; I can't tell why customers chose differently."
        return {"answer": ans, "data": facts, "actions": [{"type": "navigate", "label": "See sources", "payload": {"href": "/dashboard/analytics?tab=sources"}, "requires_confirmation": False}], "source": "rules"}

    # --- weekend promotion / growth campaign draft
    if re.search(r"(create|plan|make|start|run|launch|draft).*(weekend|holiday|week|growth).*(promo|campaign|offer|special)|weekend (promo|special|offer)|growth campaign", q):
        from app.models import Product
        pct = re.search(r"(\d{1,2})\s*%", q)
        prods = list(db.scalars(select(Product).where(Product.business_id == b.id, Product.deleted_at.is_(None), Product.status == "ACTIVE").order_by(Product.featured.desc(), Product.position).limit(40)))
        named = next((p for p in prods if p.name.lower() in q), None)
        svc_name, _ = _top_service(db, b)
        target = named or (prods[0] if prods and not svc_name else None)
        label = target.name if target else (svc_name or b.name)
        offer = f"Weekend special: {label}" + (f" — {pct.group(1)}% off" if pct else "")
        payload = {"name": "Weekend promotion", "objective": "SALES" if target else "BOOKINGS", "offer_text": offer, "target_type": "product" if target else "storefront",
                   "target_ref": str(target.id) if target else None, "channels": ["instagram", "whatsapp", "qr", "website"]}
        if pct:
            payload["create_discount"] = {"code": f"WEEKEND{pct.group(1)}", "percent": int(pct.group(1))}
        note = f" I'll also create the code WEEKEND{pct.group(1)} ({pct.group(1)}% off) when you confirm." if pct else " I haven't added a discount — tell me a percentage if you want one."
        return {"answer": f"I can draft a weekend campaign for {label} with posts for Instagram and WhatsApp, a QR headline and a website banner — all with tracked links.{note} Nothing is published until you do it.",
                "data": [{"label": "Offer", "value": offer}], "actions": [{"type": "create_growth_campaign", "label": "Create the campaign draft", "requires_confirmation": True, "payload": payload}], "source": "rules"}

    # --- product description
    m = re.search(r"(?:product )?description (?:for|of) (.+?)[.?!]*$", q) or re.search(r"describe (?:my |the )?(.+?)[.?!]*$", q)
    if m or re.search(r"(best.?seller|top product).*(description)|description.*(best.?seller|top product)", q):
        from app.models import Product
        from app.services import growth_analytics as ga
        prods = list(db.scalars(select(Product).where(Product.business_id == b.id, Product.deleted_at.is_(None), Product.status == "ACTIVE")))
        want = (m.group(1).strip().lower() if m else "")
        prod = next((p for p in prods if want and (p.name.lower() in want or want in p.name.lower())), None)
        if prod is None:
            top = ga.products(db, b, "90d", limit=1)["products"]
            prod = next((p for p in prods if top and str(p.id) == top[0]["id"]), prods[0] if prods else None)
        if prod is None:
            return {"answer": "Add a product first and I'll draft its description.", "data": [], "actions": [], "source": "rules"}
        facts = f"Name: {prod.name}. Category/tags: {', '.join(prod.tags or []) or 'none'}. Short description: {prod.short_description or 'none'}. Current description: {prod.description or 'none'}."
        llm = _llm(f"Write a product description (2-3 short sentences) for the product below. Use only these facts; do not invent materials, sizes, prices or claims.\n{facts}", b, 220)
        text = llm or (prod.description or f"{prod.name} from {b.name}{' in ' + b.city if b.city else ''}. " + (prod.short_description or "Order on WhatsApp or add it to your bag at checkout."))
        return {"answer": f"Here's a description for {prod.name}. " + ("Review it before applying." if llm else "I'm using your own words because no AI writer is connected — add details to the product and I'll improve it."), "draft": text, "data": [],
                "actions": [{"type": "update_product_description", "label": f"Use this for {prod.name}", "requires_confirmation": True, "payload": {"product_id": str(prod.id), "description": text}}], "source": "llm" if llm else "template"}

    # --- follow up leads / review requests (explicit asks)
    if re.search(r"follow.?up.*lead|lead.*follow.?up|unanswered leads", q):
        from app.services.growth_plan import leads_waiting
        item = leads_waiting(db, b)
        if not item:
            return {"answer": "No leads have been waiting more than 2 hours.", "data": [], "actions": [], "source": "rules"}
        return {"answer": item["title"] + ". " + item["detail"], "data": item["stats"], "actions": [item["action"]], "source": "rules"}
    if re.search(r"request.*review|ask.*review|get.*reviews|more reviews", q):
        from app.services.growth_plan import reviews_due
        item = reviews_due(db, b)
        if not item:
            return {"answer": "Everyone who recently completed a visit or order has already been asked, or has no phone number on record.", "data": [], "actions": [], "source": "rules"}
        return {"answer": item["title"] + ". " + item["detail"], "data": item["stats"], "actions": [item["action"]], "source": "rules"}

    # --- customers who haven't returned -> proposes a reactivation campaign
    if re.search(r"(haven'?t|have not|not) (returned|visited|been back)|inactive|come back|bring back|win.?back|reactivat", q):
        days = _days_in(q, 45)
        rows = inactive_customers(db, b.id, days)
        if not rows:
            return {"answer": f"No customers are currently inactive for {days}+ days (customers with a completed visit, a phone number and no upcoming booking).",
                    "data": [], "actions": [], "source": "rules"}
        preview = [{"label": c.name, "value": f"last visit {lv.date().isoformat()}"} for c, lv in rows[:8]]
        return {"answer": f"I found {len(rows)} customer{'s' if len(rows) != 1 else ''} who haven't visited in {days}+ days. I can draft a WhatsApp campaign for you to review — nothing is sent until you confirm.",
                "data": preview, "source": "rules",
                "actions": [{"type": "create_campaign", "label": "Create WhatsApp campaign", "requires_confirmation": True,
                             "payload": {"name": f"Come back — {days}+ days", "kind": CampaignKind.REACTIVATION,
                                         "audience": {"type": "inactive", "days": days},
                                         "message_template": DEFAULT_TEMPLATES[CampaignKind.REACTIVATION]}}]}

    # --- performance summary
    if re.search(r"perform|how (is|am|are|did).*(business|doing)|summary|report|overview", q):
        period = "7d" if "week" in q else "30d"
        s = an.summary(db, b, period)
        if not s["has_data"]:
            return {"answer": "Not enough data yet. Share your business link so customers can find you and I'll report on real numbers.", "data": [], "actions": [], "source": "rules"}
        h = health_score(db, b)
        data = [{"label": "Visitors", "value": s["visitors"]}, {"label": "WhatsApp clicks", "value": s["whatsapp_clicks"]},
                {"label": "New leads", "value": s["leads"]}, {"label": "Booking requests", "value": s["booking_requests"]},
                {"label": "Completed bookings", "value": s["completed_bookings"]}, {"label": "Revenue recorded", "value": f"{s['currency']} {float(s['revenue']):,.0f}"}]
        if h["overall"] is not None:
            data.append({"label": "Business health", "value": f"{h['overall']}%"})
        acts = next_actions(db, b)[:3]
        return {"answer": f"Here's your {'last 7 days' if period == '7d' else 'last 30 days'}." + (f" Top priority: {acts[0]['text']}." if acts else ""),
                "data": data, "actions": [{"type": "navigate", "label": a["text"], "payload": {"href": a["href"]}, "requires_confirmation": False} for a in acts], "source": "rules"}

    # --- most interest / what to promote
    if re.search(r"most interest|popular|top service|best.?selling|which service", q) and "promote" not in q:
        name, top = _top_service(db, b)
        if not top:
            return {"answer": "Not enough data yet to rank your services. Once customers book or message about services, I'll rank them here.", "data": [], "actions": [], "source": "rules"}
        return {"answer": f"{name} is getting the most interest over the last 30 days (bookings, leads and WhatsApp taps combined).",
                "data": [{"label": t["service"], "value": f"{t['bookings']} bookings · {t['leads']} leads · {t['whatsapp_clicks']} WhatsApp"} for t in top], "actions": [], "source": "rules"}

    if re.search(r"promote|promotion idea|what should i (sell|push|market)", q) and not re.search(r"write|draft", q):
        since = an.period_start("30d", b.timezone)
        top = an.top_services(db, b.id, since, limit=10)
        services = list(db.scalars(select(Service).where(Service.business_id == b.id, Service.deleted_at.is_(None), Service.is_active.is_(True))))
        if not services:
            return {"answer": "Add your services first so I can suggest what to promote.", "data": [], "actions": [{"type": "navigate", "label": "Add services", "payload": {"href": "/dashboard/services"}, "requires_confirmation": False}], "source": "rules"}
        seen = {t["service"] for t in top}
        unbooked = [s for s in services if s.name not in seen]
        if unbooked:
            s = unbooked[0]
            why = f"{s.name} had no bookings, leads or WhatsApp taps in the last 30 days, so there's room to grow it."
            name = s.name
        else:
            name = top[-1]["service"]
            why = f"{name} has the least interest of your services over the last 30 days."
        return {"answer": f"I'd promote {name} this week. {why}", "data": [{"label": "Service", "value": name}], "source": "rules",
                "actions": [{"type": "create_campaign", "label": f"Draft a {name} promotion", "requires_confirmation": True,
                             "payload": {"name": f"{name} promotion", "kind": CampaignKind.NEW_SERVICE, "audience": {"type": "all"},
                                         "message_template": DEFAULT_TEMPLATES[CampaignKind.NEW_SERVICE].replace("{service}", name)}}]}

    # --- customers this month
    if re.search(r"new customers?|how many customers", q):
        s = an.summary(db, b, "30d")
        return {"answer": f"You added {s['new_customers']} new customer{'s' if s['new_customers'] != 1 else ''} in the last 30 days.", "data": [{"label": "New customers (30d)", "value": s["new_customers"]}, {"label": "Returning customers (30d)", "value": s["returning_customers"]}], "actions": [], "source": "rules"}

    # --- writing tasks
    name, _ = _top_service(db, b)
    if re.search(r"instagram|caption|social post|facebook post|tiktok", q):
        svc = name or "our services"
        text = _llm(f"Write one Instagram caption (max 3 sentences + 3 hashtags) promoting {svc} at our business. Location: {b.city}.", b)
        text = text or f"Ready for a fresh look? Book {svc} at {b.name}{' in ' + b.city if b.city else ''}. Message us on WhatsApp to grab your slot. #{re.sub(r'[^a-z0-9]', '', b.city.lower() or 'beauty')} #{re.sub(r'[^a-z0-9]', '', b.name.lower())}"
        return {"answer": "Here's a caption draft:", "draft": text, "data": [], "actions": [], "source": "llm" if get_settings().anthropic_api_key and text else "template"}
    if re.search(r"whatsapp.*(campaign|promotion|message|promo)|write.*(promotion|campaign|message)|draft.*(campaign|message)", q):
        svc = name or "our services"
        llm = _llm(f"Write a friendly WhatsApp promotion message (max 45 words) for {svc}. Use the placeholders {{name}} for the customer's first name and {{business}} for the business name. No invented discounts.", b)
        tpl = llm or DEFAULT_TEMPLATES[CampaignKind.NEW_SERVICE].replace("{service}", svc)
        return {"answer": "Here's a WhatsApp draft. Review it, then create the campaign — you'll confirm before anything is sent.", "draft": tpl, "data": [], "source": "llm" if llm else "template",
                "actions": [{"type": "create_campaign", "label": "Create campaign from this draft", "requires_confirmation": True,
                             "payload": {"name": f"{svc} promotion", "kind": CampaignKind.WHATSAPP, "audience": {"type": "all"}, "message_template": tpl}}]}
    if re.search(r"description|homepage|about (us|me)|bio", q):
        services = [s.name for s in db.scalars(select(Service).where(Service.business_id == b.id, Service.deleted_at.is_(None)).limit(5))]
        llm = _llm(f"Rewrite this business description in 2-3 warm, professional sentences. Current: '{b.description}'. Services: {', '.join(services)}. Location: {b.city}.", b, 250)
        text = llm or (f"{b.name} is a {b.category.lower()}{' in ' + b.city if b.city else ''}"
                       f"{' offering ' + ', '.join(services[:3]) if services else ''}. Book online or message us on WhatsApp — we'd love to look after you.")
        return {"answer": "Here's an improved description. Apply it only if you're happy with it.", "draft": text, "data": [], "source": "llm" if llm else "template",
                "actions": [{"type": "update_description", "label": "Update my description", "requires_confirmation": True, "payload": {"description": text}}]}

    return {"answer": "I can answer questions about your leads, bookings, customers, reviews and traffic, and draft WhatsApp campaigns, captions and descriptions. Try one of the suggestions below.",
            "data": [], "actions": [], "source": "rules", "suggestions": SUGGESTIONS}
