"""Set up a catalogue faster. Two sources, both producing a *proposal* the owner reviews before anything is saved:

- "paste": the owner pastes a price list / WhatsApp catalogue / menu. A plain parser handles tidy lines ("Summer dress - 2,500");
  when the plan includes AI and a key is configured, the model reads messier text. Either way it only extracts what is written.
- "profile": ideas for what to sell, from the business's industry, category, city and description. These never come with real
  prices: starter prices are flagged as estimates and the items are saved hidden until the owner sets their own.
"""
import json
import logging
import re

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Business, Product, Service, ServiceCategory
from app.services.industries import get_industry
from app.services.plans import has_feature

log = logging.getLogger("bizora.catalog_ai")
MAX_ITEMS = 40
PRICE = re.compile(r"(?:(?:ksh|kes|kshs|ugx|tzs|ngn|ghs|zar|usd|\$|₦|₵)\s*)?(\d{1,3}(?:[,\s]\d{3})+|\d+)(?:\.(\d{1,2}))?\s*(?:/=|ksh|kes|kshs|shillings?|bob|/-)?", re.I)
DURATION = re.compile(r"(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b", re.I)
SEP = re.compile(r"\s+[-–—:|@]\s+|\t+|\s{3,}|\s*[:|]\s+")


def kind_for(business: Business) -> str:
    return "product" if get_industry(business.industry).item_word == "product" else "service"


def _clean_name(s: str) -> str:
    return re.sub(r"^[\s\-–—•*\d.)]+", "", s).strip(" :-–—|@").strip()[:160]


def _num(whole: str, frac: str | None) -> float:
    return float(re.sub(r"[,\s]", "", whole) + ("." + frac if frac else ""))


def parse_list(text: str) -> dict:
    """Deterministic extraction. Headings (lines without a price, ending in ':' or short and followed by priced lines) become categories."""
    items, cats, current = [], [], None
    lines = [ln.strip() for ln in text.replace("\r", "\n").split("\n")]
    for i, raw in enumerate(lines):
        if not raw:
            continue
        line = raw
        dur = None
        dm = DURATION.search(line)
        if dm:
            n = float(dm.group(1))
            dur = int(n * 60) if dm.group(2).lower().startswith(("h")) else int(n)
            line = (line[:dm.start()] + line[dm.end():]).strip()
        m = None
        for m in PRICE.finditer(line):
            pass  # last number in the line is the price
        parts = SEP.split(line, maxsplit=1)
        if m and len(line[:m.start()].strip(" -–—:|@")) >= 2:
            name = _clean_name(line[:m.start()])
            if len(name) >= 2 and not name.isdigit():
                price = _num(m.group(1), m.group(2))
                desc = line[m.end():].strip(" -–—:|@")
                items.append({"name": name, "description": desc[:300], "price": price, "category": current, "duration_minutes": dur})
                continue
        heading = _clean_name(raw.rstrip(":"))
        nxt = next((x for x in lines[i + 1:] if x), "")
        if heading and len(heading) <= 40 and (raw.endswith(":") or (PRICE.search(nxt) and not PRICE.search(raw))):
            current = heading.title() if heading.isupper() else heading
            if current not in cats:
                cats.append(current)
        elif len(parts) == 1 and not m and heading and len(heading) <= 60 and not nxt:
            items.append({"name": heading, "description": "", "price": None, "category": current, "duration_minutes": dur})
    return {"categories": cats, "items": items[:MAX_ITEMS]}


from app.services.llm import call_llm_json


def _llm_json(system: str, prompt: str) -> dict | None:
    return call_llm_json(system=system, prompt=prompt, max_tokens=2200)


def _sanitise(raw: dict | None, *, allow_price: bool) -> dict | None:
    if not isinstance(raw, dict) or not isinstance(raw.get("items"), list):
        return None
    cats, items = [], []
    for it in raw["items"][:MAX_ITEMS]:
        if not isinstance(it, dict) or not str(it.get("name", "")).strip():
            continue
        price = it.get("price") if allow_price else None
        try:
            price = float(price) if price not in (None, "") else None
            price = price if price is None or 0 <= price < 100_000_000 else None
        except (TypeError, ValueError):
            price = None
        try:
            dur = int(it.get("duration_minutes")) if it.get("duration_minutes") else None
            dur = dur if dur is None or 5 <= dur <= 1440 else None
        except (TypeError, ValueError):
            dur = None
        cat = str(it.get("category") or "").strip()[:80] or None
        if cat and cat not in cats:
            cats.append(cat)
        items.append({"name": str(it["name"]).strip()[:160], "description": str(it.get("description") or "").strip()[:300], "price": price, "category": cat, "duration_minutes": dur})
    return {"categories": cats, "items": items} if items else None


def _existing(db: Session, b: Business, kind: str) -> set[str]:
    model = Product if kind == "product" else Service
    return {n.lower() for n in db.scalars(select(model.name).where(model.business_id == b.id, model.deleted_at.is_(None)))}


def suggest(db: Session, b: Business, mode: str, text: str = "", kind: str | None = None) -> dict:
    from app.services.store_ai import STORE_GENERATOR_SYSTEM_PROMPT, classify_business
    if not kind:
        b_class = classify_business(b.name, b.description or "", b.industry or "", b.category or "")
        kind = "service" if b_class in ("SERVICE", "HYBRID") else kind_for(b)
    ind = get_industry(b.industry)
    use_ai = has_feature(db, b, "ai") and get_settings().ai_configured
    source, note, out = "parser", None, None
    if mode == "paste":
        if not text.strip():
            return {"kind": kind, "source": "parser", "categories": [], "items": [], "note": "Paste your list first."}
        if use_ai:
            system_prompt = (
                f"{STORE_GENERATOR_SYSTEM_PROMPT}\n\n"
                "TASK: You extract a clean product/service price list from the provided text. Output ONLY JSON: "
                "{\"items\":[{\"name\":str,\"description\":str,\"price\":number|null,\"category\":str|null,\"duration_minutes\":number|null}]}. "
                "Use ONLY what the text says. Never invent items, prices, or descriptions. Never mix up service vs product items."
            )
            out = _sanitise(_llm_json(system_prompt, text[:6000]), allow_price=True)
            source = "ai" if out else "parser"
        out = out or parse_list(text)
        if source == "parser" and not use_ai:
            note = "Read with the built-in list reader. Messy text may need fixing below. AI reading is available on plans with Aqivo AI."
    else:
        have = ", ".join(sorted(_existing(db, b, kind)))[:600]
        if use_ai:
            system_prompt = (
                f"{STORE_GENERATOR_SYSTEM_PROMPT}\n\n"
                f"TASK: Suggest 8 starter {kind}s for {b.name} ({b.category or ind.label} in {b.city or 'Kenya'}). Output ONLY JSON: "
                "{\"items\":[{\"name\":str,\"description\":str(max 20 words, no claims),\"category\":str,\"duration_minutes\":number|null}]}. "
                f"Strictly match {b.name}'s business type. If service/barbershop/salon, suggest grooming/service items with duration. "
                "Do NOT include prices. Do NOT include products from other business types (e.g. no groceries for barbershop). "
                f"Avoid duplicates of: {have or 'none'}."
            )
            out = _sanitise(_llm_json(system_prompt,
                                      f"Business: {b.name}. Type: {b.category}. Industry: {ind.label}. City: {b.city or 'Kenya'}. Description: {(b.description or '')[:400]}"), allow_price=False)
            source = "ai" if out else "starter"
        if not out:
            source = "starter"
            cats = [c for c in ind.categories][:3]
            out = {"categories": cats, "items": [{"name": n, "description": "", "price": float(p), "category": cats[0] if cats else None, "duration_minutes": m if kind == "service" else None, "estimate": True} for n, p, m in ind.suggestions]}
            note = "These are starter ideas for your type of business, with example prices you should replace. They're saved hidden until you set your own." if out["items"] else "No ideas for this business type yet. Try pasting your own list."
        elif use_ai:
            for it in out["items"]:
                it["estimate"] = False
    have_names = _existing(db, b, kind)
    for it in out["items"]:
        it["exists"] = it["name"].lower() in have_names
        it.setdefault("estimate", False)
    return {"kind": kind, "source": source, "categories": out["categories"], "items": out["items"], "note": note, "ai_available": use_ai}


def _category(db: Session, b: Business, name: str | None) -> "ServiceCategory | None":
    if not name:
        return None
    from app.services.catalog import unique_category_slug
    row = db.scalars(select(ServiceCategory).where(ServiceCategory.business_id == b.id, ServiceCategory.name.ilike(name.strip()))).first()
    if row:
        return row
    pos = len(db.scalars(select(ServiceCategory.id).where(ServiceCategory.business_id == b.id)).all())
    row = ServiceCategory(business_id=b.id, name=name.strip()[:120], slug=unique_category_slug(db, b.id, name), position=pos)
    db.add(row)
    db.flush()
    return row
