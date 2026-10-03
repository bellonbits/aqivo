"""The storefront section engine.

A storefront page is an ordered list of *sections*. Each section has a `type` (a key of REGISTRY), a validated
`settings` dict and a `styles` dict. Adding a section type = one entry here + one Jinja partial in
`public/templates/sections/`; no migration is needed because settings are JSON.

Everything an owner can store is validated against these field definitions (no free-form HTML, except the
`custom_html` section which is rendered in a sandboxed iframe).
"""
from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from urllib.parse import urlparse

from app.core.errors import bad_request

# ---------------------------------------------------------------- field definitions
ACTIONS = ("auto", "whatsapp", "book", "call", "shop", "services", "contact", "url")
SOURCES = ("all", "featured", "category", "on_sale", "newest")


@dataclass(frozen=True)
class F:
    key: str
    kind: str  # text | textarea | image | url | number | select | bool | button | list
    label: str
    max: int = 200
    options: tuple = ()
    min: int = 0
    default: object = None
    help: str = ""
    item: tuple = ()  # for kind == "list": the sub-fields of each item
    max_items: int = 12
    show_if: tuple = ()  # (field key, value) – hide in the editor unless another field has this value


@dataclass(frozen=True)
class Section:
    type: str
    label: str
    group: str
    description: str
    icon: str
    fields: tuple[F, ...] = ()
    needs: str = ""  # data the section is meaningless without: products | services | gallery | staff | reviews | bookings | leads | map
    default_styles: dict = field(default_factory=dict)


def _btn(key="button", label="Button"):
    return F(key, "button", label)


SRC = (
    F("source", "select", "Show", options=SOURCES, default="all", help="Which items appear in this section"),
    F("category_id", "select", "Category", options=("@categories",), show_if=("source", "category")),
    F("limit", "number", "How many", min=1, max=24, default=8),
)

REGISTRY: dict[str, Section] = {s.type: s for s in [
    # ------------------------------------------------------------ layout & content
    Section("hero", "Hero", "Intro", "Big headline with a photo and your main call to action.", "layout",
            (F("headline", "text", "Headline", 120), F("subheadline", "textarea", "Subheadline", 300), F("cta_text", "text", "Button text", 40),
             F("cta_action", "select", "Button goes to", options=ACTIONS[:-1], default="auto"),
             F("image_url", "image", "Photo / Banner", 500),
             F("logo_url", "image", "Store logo", 500, help="Store avatar logo displayed on the storefront"),
             F("layout", "select", "Layout", options=("inherit", "split", "centered", "overlay"), default="inherit"))),
    Section("announcement", "Announcement bar", "Intro", "A thin banner for offers, holidays or delivery news.", "megaphone",
            (F("text", "text", "Message", 160), F("link", "url", "Link (optional)", 300))),
    Section("profile", "Business profile", "Intro", "Logo, name, rating and quick contact details.", "user",
            (F("title", "text", "Heading", 100), F("show_rating", "bool", "Show rating", default=True), F("show_hours", "bool", "Show open / closed", default=True),
             F("show_social", "bool", "Show social links", default=True))),
    Section("image", "Image", "Content", "A single wide photo with an optional caption.", "image",
            (F("image_url", "image", "Photo", 500), F("alt", "text", "Description for screen readers", 160), F("caption", "text", "Caption", 200),
             F("ratio", "select", "Shape", options=("wide", "square", "tall"), default="wide"), F("link", "url", "Link (optional)", 300))),
    Section("image_text", "Image + text", "Content", "A photo next to a short story and a button.", "columns",
            (F("title", "text", "Heading", 100), F("body", "textarea", "Text", 1200), F("image_url", "image", "Photo", 500),
             F("side", "select", "Photo on", options=("left", "right"), default="left"), _btn())),
    Section("text", "Text", "Content", "A heading and a paragraph.", "type",
            (F("title", "text", "Heading", 100), F("body", "textarea", "Text", 2000))),
    Section("rich_text", "Rich text", "Content", "Formatted text: headings, bold, lists and links.", "file-text",
            (F("title", "text", "Heading", 100), F("body", "textarea", "Content", 5000, help="Use **bold**, *italic*, ## heading, - list and [link](https://…)"))),
    Section("about", "About", "Content", "Your story in your own words.", "info",
            (F("title", "text", "Heading", 100), F("body", "textarea", "Text", 2000))),
    # ------------------------------------------------------------ catalogue
    Section("product_grid", "Product grid", "Catalogue", "Your products in a clean grid with add-to-bag.", "grid",
            (F("title", "text", "Heading", 100), F("subtitle", "text", "Subheading", 300), *SRC,
             F("columns", "number", "Columns", min=2, max=4, default=4), F("show_price", "bool", "Show prices", default=True),
             F("show_add", "bool", "Show add-to-bag button", default=True)), needs="products"),
    Section("product_carousel", "Product carousel", "Catalogue", "Products in a swipeable row.", "move-horizontal",
            (F("title", "text", "Heading", 100), F("subtitle", "text", "Subheading", 300), *SRC, F("show_price", "bool", "Show prices", default=True),
             F("show_add", "bool", "Show add-to-bag button", default=True)), needs="products"),
    Section("offers", "Offers", "Catalogue", "Products with a reduced price, shown with the saving.", "tag",
            (F("title", "text", "Heading", 100), F("subtitle", "text", "Subheading", 300), F("limit", "number", "How many", min=1, max=24, default=8)),
            needs="products"),
    Section("collection_grid", "Collection", "Catalogue", "A hand-picked collection of products, e.g. “Summer edit”.", "layout-grid",
            (F("title", "text", "Heading", 100), F("subtitle", "text", "Subheading", 300), F("collection_id", "select", "Collection", options=("@collections",)),
             F("limit", "number", "How many", min=1, max=24, default=8), F("columns", "number", "Columns", min=2, max=4, default=4), F("show_price", "bool", "Show prices", default=True),
             F("show_add", "bool", "Show add-to-bag button", default=True)), needs="products"),
    Section("category_grid", "Categories", "Catalogue", "Photo tiles that lead customers into a category.", "layout-grid",
            (F("title", "text", "Heading", 100), F("subtitle", "text", "Subheading", 300), F("columns", "number", "Columns", min=2, max=4, default=3),
             F("limit", "number", "How many", min=1, max=12, default=6))),
    Section("services", "Service list", "Catalogue", "Services with prices, durations and a booking button.", "list",
            (F("title", "text", "Heading", 100), F("subtitle", "text", "Subheading", 300)), needs="services"),
    Section("service_grid", "Service cards", "Catalogue", "Services as photo cards.", "grid",
            (F("title", "text", "Heading", 100), F("subtitle", "text", "Subheading", 300), *SRC, F("columns", "number", "Columns", min=2, max=4, default=3),
             F("show_price", "bool", "Show prices", default=True), F("show_duration", "bool", "Show duration", default=True)), needs="services"),
    Section("service_carousel", "Service carousel", "Catalogue", "Services in a swipeable row.", "move-horizontal",
            (F("title", "text", "Heading", 100), F("subtitle", "text", "Subheading", 300), *SRC, F("show_price", "bool", "Show prices", default=True)), needs="services"),
    Section("promo", "Discount banner", "Catalogue", "A bold strip announcing an offer.", "percent",
            (F("title", "text", "Heading", 100), F("body", "text", "Text", 200), F("cta_text", "text", "Button text", 40), F("cta_action", "select", "Button goes to", options=ACTIONS[:-1], default="shop"))),
    # ------------------------------------------------------------ trust & media
    Section("reviews", "Verified reviews", "Trust", "Real reviews from customers who booked or ordered.", "star",
            (F("title", "text", "Heading", 100), F("show_summary", "bool", "Show average rating", default=True), F("limit", "number", "How many", min=1, max=12, default=6)), needs="reviews"),
    Section("testimonials", "Testimonials", "Trust", "Quotes you have collected, plus verified reviews.", "quote",
            (F("title", "text", "Heading", 100),), needs="reviews"),
    Section("faq", "FAQ", "Trust", "Answer common questions before they are asked.", "help-circle",
            (F("title", "text", "Heading", 100),
             F("items", "list", "Questions", item=(F("q", "text", "Question", 160), F("a", "textarea", "Answer", 800)), max_items=12))),
    Section("google_reviews", "Google reviews", "Trust", "Your Google rating and recent reviews (needs the Google reviews connection).", "star",
            (F("title", "text", "Heading", 100), F("limit", "number", "How many", min=1, max=5, default=5)), needs="google"),
    Section("instagram_feed", "Instagram feed", "Trust", "Your latest Instagram posts (needs the Instagram connection).", "image",
            (F("title", "text", "Heading", 100), F("limit", "number", "How many", min=1, max=12, default=6), F("columns", "number", "Columns", min=2, max=6, default=3)), needs="instagram"),
    Section("gallery", "Gallery", "Trust", "Your photo gallery.", "images",
            (F("title", "text", "Heading", 100), F("columns", "number", "Columns", min=2, max=5, default=4), F("limit", "number", "How many", min=1, max=40, default=12)), needs="gallery"),
    Section("video", "Video", "Trust", "A YouTube, Vimeo or video-file embed.", "play",
            (F("title", "text", "Heading", 100), F("url", "url", "Video link", 300, help="YouTube, Vimeo or a direct .mp4 link"), F("caption", "text", "Caption", 200))),
    Section("specialists", "Team", "Trust", "The people customers will meet.", "users",
            (F("title", "text", "Heading", 100), F("subtitle", "text", "Subheading", 200)), needs="staff"),
    # ------------------------------------------------------------ contact & conversion
    Section("booking", "Booking form", "Contact", "Customers pick a service, date and time.", "calendar",
            (F("title", "text", "Heading", 100), F("subtitle", "text", "Subheading", 300)), needs="bookings"),
    Section("booking_cta", "Booking button", "Contact", "A short prompt that sends people to the booking form.", "calendar-plus",
            (F("title", "text", "Heading", 100), F("body", "text", "Text", 300), F("button_text", "text", "Button text", 40, default="Book now")), needs="bookings"),
    Section("whatsapp_cta", "WhatsApp prompt", "Contact", "A green call-out that opens WhatsApp with your message ready.", "message-circle",
            (F("title", "text", "Heading", 100), F("body", "text", "Text", 300), F("button_text", "text", "Button text", 40, default="Chat on WhatsApp"),
             F("message", "text", "Pre-filled message", 300))),
    Section("contact", "Contact", "Contact", "Phone, email, WhatsApp and an enquiry form.", "phone",
            (F("title", "text", "Heading", 100), F("body", "textarea", "Text", 500), F("show_form", "bool", "Show enquiry form", default=True))),
    Section("newsletter", "Sign-up form", "Contact", "Collect a name and phone/email into your Leads inbox.", "mail",
            (F("title", "text", "Heading", 100), F("body", "text", "Text", 300), F("button_text", "text", "Button text", 40, default="Keep me updated")), needs="leads"),
    Section("opening_hours", "Opening hours", "Contact", "Your weekly hours with an open-now badge.", "clock", (F("title", "text", "Heading", 100),)),
    Section("location", "Location", "Contact", "Address and a directions button.", "map-pin", (F("title", "text", "Heading", 100),)),
    Section("map", "Map", "Contact", "An embedded map with your pin.", "map", (F("title", "text", "Heading", 100),), needs="map"),
    Section("social_links", "Social links", "Contact", "Links to your Instagram, TikTok, Facebook and more.", "share-2", (F("title", "text", "Heading", 100),)),
    # ------------------------------------------------------------ utility
    Section("custom_button", "Button", "Utility", "One button that goes where you choose.", "mouse-pointer",
            (F("label", "text", "Label", 60), F("action", "select", "Goes to", options=ACTIONS, default="whatsapp"), F("url", "url", "Link", 300, show_if=("action", "url")),
             F("variant", "select", "Style", options=("primary", "outline", "whatsapp"), default="primary"), F("align", "select", "Align", options=("left", "center", "right"), default="center"))),
    Section("spacer", "Spacer", "Utility", "Empty space between sections.", "move-vertical", (F("height", "select", "Height", options=("xs", "sm", "md", "lg", "xl"), default="md"),)),
    Section("divider", "Divider", "Utility", "A thin line or dots between sections.", "minus", (F("style", "select", "Style", options=("line", "dots"), default="line"),)),
    Section("custom_html", "Custom embed", "Utility", "Paste an embed or widget. It runs in an isolated frame and cannot touch your site.", "code",
            (F("html", "textarea", "HTML", 5000), F("height", "number", "Height (px)", min=80, max=1200, default=320))),
]}

GROUP_ORDER = ["Intro", "Content", "Catalogue", "Trust", "Contact", "Utility"]

# Shortcuts in the "Add section" picker that map onto a registry type with preset settings.
PRESETS = [
    {"key": "featured_products", "label": "Featured products", "type": "product_grid", "settings": {"title": "Featured", "source": "featured", "limit": 8}, "group": "Catalogue",
     "description": "Products you have marked as featured.", "icon": "sparkles"},
    {"key": "new_arrivals", "label": "New arrivals", "type": "product_carousel", "settings": {"title": "New arrivals", "source": "newest", "limit": 10}, "group": "Catalogue",
     "description": "Your newest products in a swipeable row.", "icon": "zap"},
    {"key": "featured_services", "label": "Featured services", "type": "service_grid", "settings": {"title": "Popular services", "source": "featured", "limit": 6}, "group": "Catalogue",
     "description": "Your first few services as cards.", "icon": "sparkles"},
]

STYLE_OPTIONS = {
    "bg": ("none", "tint", "contrast", "accent"),
    "pad": ("none", "sm", "md", "lg"),
    "align": ("left", "center"),
    "width": ("normal", "narrow", "wide"),
}
_URL_OK = re.compile(r"^(https?://|/|#|mailto:|tel:)", re.I)
_VIDEO_HOSTS = ("youtube.com", "www.youtube.com", "youtu.be", "vimeo.com", "www.vimeo.com", "player.vimeo.com")


def registry_json(available: dict[str, bool]) -> dict:
    """What the editor needs to build its 'add section' picker and property forms."""
    def fdict(f: F) -> dict:
        d = {"key": f.key, "kind": f.kind, "label": f.label, "max": f.max, "options": list(f.options), "min": f.min, "default": f.default, "help": f.help,
             "max_items": f.max_items, "show_if": list(f.show_if) or None}
        if f.item:
            d["item"] = [fdict(x) for x in f.item]
        return d
    types = [{"type": s.type, "label": s.label, "group": s.group, "description": s.description, "icon": s.icon, "fields": [fdict(f) for f in s.fields],
              "available": available.get(s.needs, True) if s.needs else True, "needs": s.needs or None} for s in REGISTRY.values()]
    return {"types": types, "presets": PRESETS, "groups": GROUP_ORDER, "style_options": {k: list(v) for k, v in STYLE_OPTIONS.items()}}


# ---------------------------------------------------------------- validation
def _clean_url(v, limit: int) -> str | None:
    if v in (None, ""):
        return None
    if not isinstance(v, str) or len(v) > limit or not _URL_OK.match(v.strip()):
        raise bad_request("Links must start with https://, /, #, mailto: or tel:")
    return v.strip()


def _clean_value(f: F, v):
    k = f.kind
    if v is None:
        return None
    if k in ("text", "textarea"):
        if not isinstance(v, str):
            raise bad_request(f"{f.label} must be text")
        return v.strip()[: f.max] if k == "text" else v.strip()[: f.max]
    if k in ("image", "url"):
        return _clean_url(v, f.max)
    if k == "number":
        if isinstance(v, bool) or not isinstance(v, (int, float)):
            raise bad_request(f"{f.label} must be a number")
        return int(max(f.min, min(f.max, v)))
    if k == "bool":
        if not isinstance(v, bool):
            raise bad_request(f"{f.label} must be on or off")
        return v
    if k == "select":
        if f.options in (("@categories",), ("@collections",)):  # an id of this business; ownership is enforced when rendering
            if v in ("", None):
                return None
            try:
                return str(uuid.UUID(str(v)))
            except ValueError:
                raise bad_request("Unknown category")
        if v not in f.options:
            raise bad_request(f"Invalid choice for {f.label}")
        return v
    if k == "button":
        if not isinstance(v, dict):
            raise bad_request("Invalid button")
        action = v.get("action", "auto")
        if action not in ACTIONS:
            raise bad_request("Invalid button action")
        return {"label": str(v.get("label") or "")[:40].strip(), "action": action, "url": _clean_url(v.get("url"), 300)}
    if k == "list":
        if not isinstance(v, list):
            raise bad_request(f"{f.label} must be a list")
        out = []
        for row in v[: f.max_items]:
            if not isinstance(row, dict):
                raise bad_request("Invalid list item")
            item = {sf.key: _clean_value(sf, row.get(sf.key)) for sf in f.item}
            if any(item.values()):
                out.append(item)
        return out
    raise bad_request("Unsupported field")


def clean_settings(stype: str, data: dict) -> dict:
    sec = REGISTRY.get(stype)
    if sec is None:
        raise bad_request("Unknown section type")
    out: dict = {}
    for f in sec.fields:
        if f.key in data:
            out[f.key] = _clean_value(f, data[f.key])
    if stype == "video" and out.get("url"):
        host = (urlparse(out["url"]).hostname or "").lower()
        if not (host in _VIDEO_HOSTS or urlparse(out["url"]).path.lower().endswith((".mp4", ".webm"))):
            raise bad_request("Use a YouTube, Vimeo or .mp4 link")
    return out


def clean_styles(data: dict) -> dict:
    out = {}
    for k, opts in STYLE_OPTIONS.items():
        if k in data:
            if data[k] in (None, ""):
                out[k] = None
            elif data[k] in opts:
                out[k] = data[k]
            else:
                raise bad_request(f"Invalid {k}")
    return out


def defaults(stype: str) -> dict:
    return {f.key: f.default for f in REGISTRY[stype].fields if f.default is not None}


def video_embed(url: str | None) -> dict | None:
    """Turn a pasted video link into {'kind': 'iframe'|'file', 'src': ...}; only known hosts are embedded."""
    if not url:
        return None
    p = urlparse(url)
    host = (p.hostname or "").lower()
    if host in ("youtube.com", "www.youtube.com"):
        m = re.search(r"[?&]v=([\w-]{6,15})", p.query) or re.match(r"^/(?:embed|shorts)/([\w-]{6,15})", p.path)
        return {"kind": "iframe", "src": f"https://www.youtube-nocookie.com/embed/{m.group(1)}"} if m else None
    if host == "youtu.be":
        vid = p.path.strip("/")[:15]
        return {"kind": "iframe", "src": f"https://www.youtube-nocookie.com/embed/{vid}"} if re.fullmatch(r"[\w-]{6,15}", vid) else None
    if host in ("vimeo.com", "www.vimeo.com", "player.vimeo.com"):
        m = re.search(r"(\d{6,12})", p.path)
        return {"kind": "iframe", "src": f"https://player.vimeo.com/video/{m.group(1)}"} if m else None
    if p.path.lower().endswith((".mp4", ".webm")):
        return {"kind": "file", "src": url}
    return None


def render_markdown(text: str) -> str:
    """Tiny, safe markdown: everything is HTML-escaped first, then a fixed set of patterns is re-introduced."""
    from markupsafe import escape
    html: list[str] = []
    in_list = False
    for raw in (text or "").splitlines():
        line = str(escape(raw.strip()))
        line = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", line)
        line = re.sub(r"(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)", r"<em>\1</em>", line)
        line = re.sub(r"\[([^\]]+)\]\((https?://[^\s)]+|mailto:[^\s)]+|tel:[^\s)]+)\)", r'<a href="\2" rel="noopener nofollow" target="_blank">\1</a>', line)
        if line.startswith("- "):
            if not in_list:
                html.append("<ul>")
                in_list = True
            html.append(f"<li>{line[2:]}</li>")
            continue
        if in_list:
            html.append("</ul>")
            in_list = False
        if line.startswith("### "):
            html.append(f"<h4>{line[4:]}</h4>")
        elif line.startswith("## "):
            html.append(f"<h3>{line[3:]}</h3>")
        elif line:
            html.append(f"<p>{line}</p>")
    if in_list:
        html.append("</ul>")
    return "".join(html)
