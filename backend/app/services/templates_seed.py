"""Industry template definitions. Templates share the same section components; they differ in theme
tokens, section order and default copy — so one renderer serves thousands of businesses."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Template

SECTION_ORDER = ["hero", "about", "services", "gallery", "testimonials", "booking", "location", "contact"]

TEMPLATES = [
    dict(key="beauty_studio_01", name="Beauty Studio", industry="beauty",
         description="Warm and elegant. Made for salons and hair studios that live on their photo gallery.",
         features=["Photo-first hero", "Service menu with prices", "Online booking form", "Verified reviews", "WhatsApp button"],
         theme=dict(bg="#FFFBF7", ink="#1C1917", accent="#B4532A", accent_ink="#FFFFFF", muted="#78716C", surface="#FFFFFF",
                    border="#EBE3DB", font_display="'Fraunces', Georgia, serif", font_body="'Manrope', system-ui, sans-serif",
                    hero="split", radius="14px"),
         default_sections=SECTION_ORDER),
    dict(key="barbershop_01", name="Barbershop", industry="beauty",
         description="Bold and high-contrast. Made for barbers who want walk-ins and regulars to book fast.",
         features=["Dark, high-contrast design", "Quick booking", "Price list", "Gallery of cuts", "WhatsApp button"],
         theme=dict(bg="#0E0E0E", ink="#F5F5F4", accent="#E6F26A", accent_ink="#0E0E0E", muted="#A8A29E", surface="#171717",
                    border="#2A2A2A", font_display="'Manrope', system-ui, sans-serif", font_body="'Manrope', system-ui, sans-serif",
                    hero="centered", radius="10px"),
         default_sections=["hero", "services", "gallery", "about", "booking", "testimonials", "location", "contact"]),
    dict(key="nail_studio_01", name="Nail Studio", industry="beauty",
         description="Soft and modern. Made for nail artists who sell on Instagram-style visuals.",
         features=["Soft modern palette", "Design gallery", "Service menu", "Online booking", "WhatsApp button"],
         theme=dict(bg="#FFF7FA", ink="#3B0A24", accent="#C2185B", accent_ink="#FFFFFF", muted="#8E6B7B", surface="#FFFFFF",
                    border="#F3DCE6", font_display="'Fraunces', Georgia, serif", font_body="'Manrope', system-ui, sans-serif",
                    hero="split", radius="18px"),
         default_sections=["hero", "gallery", "services", "about", "booking", "testimonials", "location", "contact"]),
    dict(key="spa_01", name="Spa & Wellness", industry="beauty",
         description="Calm and spacious. Made for spas and beauty therapists selling relaxation.",
         features=["Calm, spacious layout", "Treatment menu", "Online booking", "Verified reviews", "Opening hours"],
         theme=dict(bg="#F6F8F5", ink="#1F2A24", accent="#3F6B57", accent_ink="#FFFFFF", muted="#66756C", surface="#FFFFFF",
                    border="#DDE5DF", font_display="'Fraunces', Georgia, serif", font_body="'Manrope', system-ui, sans-serif",
                    hero="overlay", radius="12px"),
         default_sections=SECTION_ORDER),
    dict(key="makeup_artist_01", name="Makeup Artist", industry="beauty",
         description="Editorial and personal. Made for makeup artists and lash artists who book by appointment.",
         features=["Editorial portfolio", "Package pricing", "Appointment booking", "Testimonials", "WhatsApp button"],
         theme=dict(bg="#FAF7F2", ink="#111111", accent="#111111", accent_ink="#FFFFFF", muted="#6B6B6B", surface="#FFFFFF",
                    border="#E5DFD5", font_display="'Fraunces', Georgia, serif", font_body="'Manrope', system-ui, sans-serif",
                    hero="centered", radius="4px"),
         default_sections=["hero", "gallery", "about", "services", "testimonials", "booking", "location", "contact"]),
]


def _t(key, name, industry, description, theme, sections, features):
    base = dict(font_display="'Fraunces', Georgia, serif", font_body="'Manrope', system-ui, sans-serif", radius="14px")
    return dict(key=key, name=name, industry=industry, description=description, features=features, theme={**base, **theme}, default_sections=sections)


_STD = SECTION_ORDER
_MORE = [
    _t("restaurant_01", "Restaurant & Café", "restaurant", "Modern food & dining storefront with photos, menu categories, cart and WhatsApp checkout.",
       dict(bg="#FFF8F0", ink="#2A1810", accent="#D9531E", accent_ink="#FFFFFF", muted="#8A6F5E", surface="#FFFFFF", border="#F2E2D2", hero="split", radius="16px", layout="catalog"),
       ["hero", "category_grid", "product_grid", "product_carousel", "why_us", "reviews", "contact"], ["Menu with photos & prices", "Food ordering with bag", "Category navigation", "Chef specials carousel", "WhatsApp checkout"]),
    _t("real_estate_01", "Real Estate", "real_estate", "Clean and trustworthy. Listings, viewings and enquiries in one place.",
       dict(bg="#F5F7FB", ink="#0F1B33", accent="#1D4ED8", accent_ink="#FFFFFF", muted="#5B6478", surface="#FFFFFF", border="#DDE3EF", hero="split", radius="10px"),
       ["hero", "services", "gallery", "about", "booking", "testimonials", "location", "contact"], ["Listings & services", "Book a viewing", "Property gallery", "Enquiry form", "WhatsApp button"]),
    _t("clinic_01", "Clinic & Health", "clinic", "Calm and reassuring. Treatments, consultations and clear opening hours.",
       dict(bg="#F4FAFA", ink="#0E2A2E", accent="#0F766E", accent_ink="#FFFFFF", muted="#557074", surface="#FFFFFF", border="#D6E8E8", hero="split"),
       _STD, ["Treatments & prices", "Online consultations booking", "Team & clinic photos", "Reviews", "WhatsApp button"]),
    _t("fitness_01", "Gym & Fitness", "fitness", "High-energy and bold. Classes, memberships and trainer bookings.",
       dict(bg="#0C0C10", ink="#F5F5F7", accent="#FF6A1A", accent_ink="#0C0C10", muted="#A1A1AA", surface="#16161C", border="#26262E", hero="overlay", radius="8px"),
       ["hero", "services", "gallery", "about", "booking", "testimonials", "location", "contact"], ["Classes & memberships", "Class booking", "Gym gallery", "Reviews", "WhatsApp button"]),
    _t("hotel_01", "Hotel & Stays", "hotel", "Elegant and spacious. Rooms, rates and booking requests.",
       dict(bg="#FBF8F3", ink="#2A2118", accent="#A16207", accent_ink="#FFFFFF", muted="#7A6C5C", surface="#FFFFFF", border="#EADFCF", hero="overlay", radius="6px"),
       ["hero", "services", "gallery", "about", "booking", "testimonials", "location", "contact"], ["Rooms & rates", "Booking requests", "Photo gallery", "Location & directions", "WhatsApp button"]),
    _t("professional_01", "Professional Services", "professional", "Sharp and credible for consultants, firms and agencies.",
       dict(bg="#F7F8FA", ink="#111827", accent="#3730A3", accent_ink="#FFFFFF", muted="#5B6373", surface="#FFFFFF", border="#E0E3EA", hero="centered", radius="8px"),
       ["hero", "about", "services", "testimonials", "booking", "location", "contact", "gallery"], ["Services & fees", "Consultation booking", "Testimonials", "Contact form", "WhatsApp button"]),
    _t("auto_01", "Auto & Garage", "auto", "Rugged and clear. Services, prices and drop-off bookings.",
       dict(bg="#111214", ink="#F4F4F5", accent="#EF4444", accent_ink="#FFFFFF", muted="#A1A1AA", surface="#1B1C1F", border="#2B2C30", hero="split", radius="8px"),
       ["hero", "services", "gallery", "about", "booking", "testimonials", "location", "contact"], ["Services & prices", "Drop-off booking", "Workshop gallery", "Reviews", "WhatsApp button"]),
    _t("retail_01", "Shop & Retail", "retail", "Bright and modern ecommerce storefront. Show products, categories, new arrivals and trust guarantees.",
       dict(bg="#FFFDF7", ink="#1C1917", accent="#DB2777", accent_ink="#FFFFFF", muted="#78716C", surface="#FFFFFF", border="#F0E9DC", hero="split", radius="16px"),
       ["hero", "category_grid", "product_grid", "product_carousel", "why_us", "reviews", "contact"], ["Category navigation", "Product catalog", "New arrivals carousel", "Trust guarantees", "WhatsApp & online checkout"]),
    _t("photography_01", "Photography & Events", "photography", "Minimal and editorial. Portfolio first, packages second.",
       dict(bg="#FAFAFA", ink="#0A0A0A", accent="#0A0A0A", accent_ink="#FFFFFF", muted="#6B6B6B", surface="#FFFFFF", border="#E5E5E5", hero="centered", radius="2px"),
       ["hero", "gallery", "about", "services", "testimonials", "booking", "location", "contact"], ["Portfolio gallery", "Packages & prices", "Shoot booking", "Testimonials", "WhatsApp button"]),
    _t("home_services_01", "Home Services", "home_services", "Friendly and practical for cleaners, plumbers, electricians and movers.",
       dict(bg="#F3F8FF", ink="#0B2545", accent="#0EA5E9", accent_ink="#062036", muted="#5A7089", surface="#FFFFFF", border="#D8E6F6", hero="split", radius="14px"),
       ["hero", "services", "about", "gallery", "testimonials", "booking", "location", "contact"], ["Services & prices", "Request a visit", "Job gallery", "Reviews", "WhatsApp button"]),
    _t("education_01", "School & Training", "education", "Encouraging and clear. Courses, fees and enrolment enquiries.",
       dict(bg="#FFFBF0", ink="#1F2A44", accent="#EA580C", accent_ink="#FFFFFF", muted="#66708A", surface="#FFFFFF", border="#F1E7CF", hero="split", radius="16px"),
       ["hero", "services", "about", "gallery", "booking", "testimonials", "location", "contact"], ["Courses & fees", "Class booking", "Gallery", "Reviews", "WhatsApp button"]),
]
_MORE += [
    _t("salon_app_01", "Salon App", "beauty", "A soft, app-style salon site: search, category photo cards, your specialists and a booking card.",
       dict(bg="#F4F3FF", ink="#1B1B3A", accent="#5B5BF0", accent_ink="#FFFFFF", muted="#6B6B8C", surface="#FFFFFF", border="#E4E3F7", hero="split", radius="22px", layout="app",
            font_display="'Poppins', system-ui, sans-serif", font_body="'Poppins', system-ui, sans-serif"),
       ["hero", "services", "specialists", "gallery", "booking", "testimonials", "about", "location", "contact"], ["Search & category cards", "Meet the specialists", "Online booking", "Verified reviews", "WhatsApp button"]),
    _t("boutique_01", "Boutique", "retail", "Monochrome fashion storefront. Big imagery, clean product grid and a bag that checks out on WhatsApp.",
       dict(bg="#FFFFFF", ink="#000000", accent="#000000", accent_ink="#FFFFFF", muted="#6B6B6B", surface="#F4F4F4", border="#E2E2E2", hero="split", radius="0px", layout="boutique",
            font_display="'Inter', system-ui, sans-serif", font_body="'Inter', system-ui, sans-serif"),
       ["hero", "category_grid", "product_grid", "product_carousel", "why_us", "reviews", "contact"], ["Product grid with add to bag", "WhatsApp checkout", "Category filters", "Editorial hero", "Trust guarantees"]),
    _t("nova_shop_01", "Nova Shop", "retail", "Colourful shop with a promo banner, category chips, tinted product cards and a bag.",
       dict(bg="#F6F4FB", ink="#14112B", accent="#7159E8", accent_ink="#FFFFFF", muted="#6E6A88", surface="#FFFFFF", border="#E7E3F5", hero="split", radius="22px", layout="nova",
            font_display="'Outfit', system-ui, sans-serif", font_body="'Outfit', system-ui, sans-serif"),
       ["hero", "category_grid", "product_grid", "product_carousel", "why_us", "reviews", "contact"], ["Promo banner", "Search & category chips", "Product cards", "WhatsApp checkout", "Trust guarantees"]),
    _t("catalog_01", "Catalog & Order", "retail", "A searchable catalogue with a bag — ideal for groceries, hardware, pharmacies and wholesalers.",
       dict(bg="#EEF4FF", ink="#152033", accent="#3B6EF5", accent_ink="#FFFFFF", muted="#62708A", surface="#FFFFFF", border="#DCE6F8", hero="centered", radius="18px", layout="catalog",
            font_display="'Manrope', system-ui, sans-serif", font_body="'Manrope', system-ui, sans-serif"),
       ["hero", "category_grid", "product_grid", "product_carousel", "why_us", "reviews", "contact"], ["Search + filters", "Product catalog", "WhatsApp order bag", "Trust guarantees", "Directions"]),
    _t("bottle_shop_01", "Wine & Spirits", "retail", "Light and premium catalogue for wine shops, bars and delivery — with a live order total.",
       dict(bg="#EAF3FF", ink="#1B2233", accent="#E5586B", accent_ink="#FFFFFF", muted="#66718A", surface="#FFFFFF", border="#D5E4F7", hero="centered", radius="22px", layout="catalog",
            font_display="'Outfit', system-ui, sans-serif", font_body="'Outfit', system-ui, sans-serif"),
       ["hero", "category_grid", "product_grid", "product_carousel", "why_us", "reviews", "contact"], ["Catalogue with categories", "Order bag & total", "New arrivals", "Trust guarantees", "WhatsApp checkout"]),
    _t("menu_order_01", "Menu & Order", "restaurant", "Warm menu cards with a bag: customers pick dishes and send the order on WhatsApp.",
       dict(bg="#FFF8F0", ink="#2A1810", accent="#D9531E", accent_ink="#FFFFFF", muted="#8A6F5E", surface="#FFFFFF", border="#F2E2D2", hero="centered", radius="22px", layout="catalog",
            font_display="'Playfair Display', Georgia, serif", font_body="'Manrope', system-ui, sans-serif"),
       ["hero", "category_grid", "product_grid", "product_carousel", "why_us", "reviews", "contact"], ["Menu with photos", "Order on WhatsApp", "Category navigation", "Trust guarantees", "Reviews"]),
]
_MORE += [
    _t("shop_app_01", "Shop App", "retail", "A mobile-app style shop: greeting and search, promo banner, category circles, deals with discount badges, a bottom tab bar and a bag with a free-delivery progress bar.",
       dict(bg="#FFFFFF", ink="#0B0B0F", accent="#0B0B0F", accent_ink="#FFFFFF", muted="#6B7280", surface="#FFFFFF", border="#E5E9F0", hero="split", radius="24px", layout="shopapp",
            font_display="'Inter', system-ui, sans-serif", font_body="'Inter', system-ui, sans-serif"),
       ["hero", "category_grid", "product_grid", "product_carousel", "why_us", "reviews", "contact"], ["Search & category circles", "Deals with discount badges", "Bottom tab bar", "Free-delivery progress", "WhatsApp checkout"]),
]
_MORE += [
    _t("service_app_01", "Service App", "home_services", "A pastel mobile-app style for service businesses: welcome pill, big headline, search and category chips, a featured card, colourful service cards with a Book now button and a floating pill nav.",
       dict(bg="#FBFAF6", ink="#1C1C1C", accent="#6D5BD0", accent_ink="#FFFFFF", muted="#6B6B66", surface="#FFFFFF", border="#ECE7D6", hero="split", radius="30px", layout="serviceapp",
            font_display="'Fraunces', Georgia, serif", font_body="'Manrope', system-ui, sans-serif"),
       ["hero", "services", "specialists", "gallery", "booking", "testimonials", "about", "location", "contact"], ["Search & category chips", "Featured card with Book now", "Colourful service cards", "Provider call/WhatsApp row", "Floating pill nav"]),
]
_MORE += [
    _t("service_market_01", "Service Marketplace", "home_services", "A bold teal service-marketplace app: your categories as a cluster of bubbles, a search bar, today's offer card, top picks and a row for each category.",
       dict(bg="#FFFFFF", ink="#12201F", accent="#14B8A6", accent_ink="#FFFFFF", muted="#6B7C7B", surface="#FFFFFF", border="#E3EEEC", hero="split", radius="16px", layout="bubbleapp",
            font_display="'Outfit', system-ui, sans-serif", font_body="'Outfit', system-ui, sans-serif"),
       ["hero", "promo", "services", "booking", "testimonials", "about", "location", "contact"], ["Category bubbles", "Today's offer card", "Top picks & category rows", "Bottom tab bar", "Book or WhatsApp"]),
]
TEMPLATES.extend(_MORE)


def seed_templates(db: Session) -> None:
    existing = {t.key: t for t in db.scalars(select(Template))}
    for t in TEMPLATES:
        if t["key"] in existing:
            row = existing[t["key"]]
            for k, v in t.items():
                setattr(row, k, v)
        else:
            db.add(Template(**t))
    db.commit()
