"""Where did a visitor come from? Sources are normalised to a small set of channels (plus any custom slug the owner invents),
campaigns to a short slug. Nothing here is guessed beyond the referrer's hostname."""
from __future__ import annotations

import re
from urllib.parse import urlparse

CHANNELS = ("instagram", "facebook", "tiktok", "google", "whatsapp", "youtube", "twitter", "linkedin", "email", "sms", "poster", "flyer", "qr", "referral", "direct")
ALIASES = {"ig": "instagram", "insta": "instagram", "fb": "facebook", "meta": "facebook", "tt": "tiktok", "wa": "whatsapp", "x": "twitter", "yt": "youtube", "li": "linkedin",
           "googlebusiness": "google", "gmb": "google", "maps": "google", "gbp": "google", "website": "direct", "none": "direct", "(direct)": "direct"}
HOSTS = (("instagram.com", "instagram"), ("facebook.com", "facebook"), ("fb.com", "facebook"), ("fb.me", "facebook"), ("tiktok.com", "tiktok"), ("google.", "google"),
         ("wa.me", "whatsapp"), ("whatsapp.com", "whatsapp"), ("youtube.com", "youtube"), ("youtu.be", "youtube"), ("t.co", "twitter"), ("twitter.com", "twitter"),
         ("x.com", "twitter"), ("linkedin.com", "linkedin"), ("lnkd.in", "linkedin"))
_SLUG = re.compile(r"^[a-z0-9][a-z0-9_-]{0,31}$")


def from_referrer(referrer: str | None, own_host: str | None = None) -> str:
    if not referrer:
        return "direct"
    host = (urlparse(referrer).hostname or referrer).lower().removeprefix("www.")
    if own_host and host == own_host.lower().removeprefix("www."):
        return "direct"
    for needle, name in HOSTS:
        if host == needle or host.endswith("." + needle) or (needle.endswith(".") and needle in host + "."):
            return name
    return "referral"


def normalise_source(raw: str | None, referrer: str | None = None, own_host: str | None = None) -> str:
    s = (raw or "").strip().lower()
    if not s:
        return from_referrer(referrer, own_host)
    s = ALIASES.get(s, s)
    if s == "direct" and referrer:  # 'WEBSITE'/'direct' says nothing, so the referrer may still tell us
        return from_referrer(referrer, own_host)
    if s in CHANNELS or _SLUG.match(s):
        return s
    return "other"


def clean_campaign(raw: str | None) -> str | None:
    c = re.sub(r"[^a-z0-9_-]+", "-", (raw or "").strip().lower()).strip("-")[:64]
    return c or None


def lead_source(source: str | None, referrer: str | None = None) -> str:
    """Leads store the channel upper-cased (matching the old LeadSource values); direct visits are plain WEBSITE."""
    s = normalise_source(source, referrer)
    return "WEBSITE" if s in ("direct", "other") else s.upper()[:24]


def key(source: str | None) -> str:
    """The comparison key used by analytics: lower-case; website/direct/empty all mean 'direct'."""
    s = (source or "").strip().lower()
    return "direct" if s in ("", "website", "direct", "other", "none") else s
