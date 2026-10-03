"""Instagram posts and Google reviews, fetched with the business's own credentials and cached on the connection.
The public storefront reads only the cache (refreshing at most every few hours with a short timeout), so a slow provider never slows a page."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import Business
from app.services import connections as cx
from app.services import gateways

FRESH = timedelta(hours=6)


class SocialError(Exception):
    pass


def _fresh(entry: dict | None) -> bool:
    try:
        return bool(entry and datetime.now(timezone.utc) - datetime.fromisoformat(entry["fetched_at"]) < FRESH)
    except (KeyError, ValueError):
        return False


def _store(db: Session, b: Business, key: str, data: dict) -> dict:
    row = cx.get_row(db, b, "instagram" if key == "instagram" else "google_places")
    entry = {**data, "fetched_at": datetime.now(timezone.utc).isoformat()}
    row.cache = {**(row.cache or {}), key: entry}
    db.commit()  # persist so public pages don't refetch on every view
    return entry


def instagram_refresh(db: Session, b: Business, *, force: bool = False, timeout: float | None = None) -> dict:
    c = cx.creds(db, b, "instagram")
    if c is None or not c[0].get("user_id") or not c[1].get("access_token"):
        raise SocialError("Instagram isn't connected")
    row = cx.get_row(db, b, "instagram")
    cur = (row.cache or {}).get("instagram")
    if not force and _fresh(cur):
        return cur
    with gateways.http_client(timeout) as http:
        r = http.get(f"https://graph.instagram.com/{c[0]['user_id']}/media", params={"fields": "id,caption,media_type,media_url,thumbnail_url,permalink", "limit": 12, "access_token": c[1]["access_token"]})
    try:
        d = r.json()
    except ValueError:
        raise SocialError("Instagram sent an unreadable reply")
    if r.status_code != 200:
        raise SocialError(((d.get("error") or {}).get("message")) or "Instagram rejected the request (the token may have expired)")
    posts = []
    for m in d.get("data", []):
        img = m.get("thumbnail_url") if m.get("media_type") == "VIDEO" else m.get("media_url")
        if img and m.get("permalink"):
            posts.append({"id": m["id"], "image": img, "link": m["permalink"], "caption": (m.get("caption") or "")[:140], "video": m.get("media_type") == "VIDEO"})
    return _store(db, b, "instagram", {"posts": posts})


def instagram_posts(db: Session, b: Business) -> list[dict]:
    """For rendering: cached posts, refreshed quietly when stale."""
    row = cx.get_row(db, b, "instagram")
    if row is None or not row.enabled or not row.secrets_enc:
        return []
    cur = (row.cache or {}).get("instagram")
    if not _fresh(cur):
        try:
            cur = instagram_refresh(db, b, force=True, timeout=2.5)
        except Exception:  # noqa: BLE001 - keep showing the last good copy
            pass
    return list((cur or {}).get("posts", []))


def google_refresh(db: Session, b: Business, *, force: bool = False, timeout: float | None = None) -> dict:
    c = cx.creds(db, b, "google_places")
    if c is None or not c[0].get("place_id") or not c[1].get("api_key"):
        raise SocialError("Google reviews aren't connected")
    row = cx.get_row(db, b, "google_places")
    cur = (row.cache or {}).get("google")
    if not force and _fresh(cur):
        return cur
    with gateways.http_client(timeout) as http:
        r = http.get(f"https://places.googleapis.com/v1/places/{c[0]['place_id']}", headers={"X-Goog-Api-Key": c[1]["api_key"], "X-Goog-FieldMask": "displayName,rating,userRatingCount,reviews,googleMapsUri"})
    try:
        d = r.json()
    except ValueError:
        raise SocialError("Google sent an unreadable reply")
    if r.status_code != 200:
        raise SocialError(((d.get("error") or {}).get("message")) or "Google rejected the request")
    reviews = [{"author": (x.get("authorAttribution") or {}).get("displayName", "Google user"), "rating": x.get("rating"), "text": ((x.get("text") or {}).get("text") or "")[:600],
                "when": x.get("relativePublishTimeDescription", "")} for x in d.get("reviews", [])[:5] if x.get("rating")]
    return _store(db, b, "google", {"rating": d.get("rating"), "count": d.get("userRatingCount"), "maps_uri": d.get("googleMapsUri"), "reviews": reviews})


def google_summary(db: Session, b: Business) -> dict | None:
    row = cx.get_row(db, b, "google_places")
    if row is None or not row.enabled or not row.secrets_enc:
        return None
    cur = (row.cache or {}).get("google")
    if not _fresh(cur):
        try:
            cur = google_refresh(db, b, force=True, timeout=2.5)
        except Exception:  # noqa: BLE001
            pass
    return cur or None
