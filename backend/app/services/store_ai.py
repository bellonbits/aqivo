"""Storefront generator and classification engine for Aqivo.

Ensures every business receives the exact matching storefront layout:
- SERVICE/BOOKING: Appointment calendar, time slots, studio vs mobile mode, pre-filled WhatsApp booking, NO carts/shopping baskets/delivery fees.
- SHOP/PRODUCT: Real catalogue categories, quantities, delivery/pickup checkout, pre-filled WhatsApp order, NO appointment booking forms.
- HYBRID: Booking is primary, products secondary.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Literal

import httpx

from app.core.config import get_settings
from app.models import Business

log = logging.getLogger("bizora.store_ai")

STORE_GENERATOR_SYSTEM_PROMPT = """You are generating a simple storefront for a small business in Kenya.
First, identify the business type from the name and description, then
build ONLY the matching layout. Never reuse content, categories, images,
or wording from another business type.

STEP 1: CLASSIFY THE BUSINESS
- SERVICE/BOOKING business (barbershop, salon, spa, mechanic, tutor,
  photographer, cleaner, etc.): customers book a time.
- SHOP/PRODUCT business (groceries, clothing, electronics, food, etc.):
  customers buy items.
- HYBRID (e.g. salon that also sells products): booking is primary,
  products are a small secondary section.

STEP 2: BUILD THE MATCHING PAGE

=== IF SERVICE/BOOKING ===
MUST HAVE:
- Business name, one-line description, location, opening hours
- Prominent "Book Now" button at the top
- "Book on WhatsApp" button with a pre-filled message
  (e.g. "Hi, I'd like to book a [service] on [day] at [time]")
- Services list: name, price in Ksh, duration, short description
- Simple booking form: name, phone, service, date, time, notes (optional)
- Booking confirmation message (not an "order")
- Gallery of real work/shop photos
- Location with map link and landmark
- Payment methods accepted (cash, M-Pesa till/number)
- Contact: phone and WhatsApp
- Walk-in vs. appointment policy
- Reviews only if real ones are provided

MUST NOT HAVE:
- Shopping cart, basket, checkout, or order numbers
- Delivery, pickup, packaging, or tax fees
- Product categories or "Add to cart" buttons
- Promo/discount lines unless the owner provided them
- Fake ratings, review counts, or distances
- Stock photos that don't match the business

=== IF SHOP/PRODUCT ===
MUST HAVE:
- Business name, one-line description, location, opening hours
- Product categories that match what the shop actually sells
- Product cards: photo, name, price in Ksh, unit/size, availability
- Cart with item quantities and a clear total
- Checkout: name, phone, delivery or pickup choice, address (if delivery)
- "Order on WhatsApp" button with the order list pre-filled
- Delivery areas, fees, and estimated times
- Payment methods (M-Pesa, cash on delivery, etc.)
- Returns/refund or substitution policy (short)
- Contact: phone and WhatsApp

MUST NOT HAVE:
- Booking forms, appointment slots, or "Book Now" buttons
- Service durations
- Categories or products from another business type
- Fake ratings, review counts, or "Popular" badges unless real
- Delivery options if the owner doesn't deliver

STEP 3: UNIVERSAL RULES (ALL STORES)
- Mobile-first: large tap targets, fast loading, single column
- Keep it simple: max 5 nav items (Home, Services/Shop, Book/Cart, Contact)
- Never leave placeholder text, truncated sentences, lorem ipsum,
  sample orders, or demo data visible
- Never invent facts (ratings, reviews, prices, hours, addresses,
  years in business). If information is missing, leave the field
  out or ask the owner
- Use only the owner's real photos; if none exist, use a clean
  neutral placeholder, never an unrelated stock photo
- Image alt text, headings, and button labels must match the business
- Prices in Ksh, phone numbers in +254 format
- Write the meta description as a complete sentence under 160 characters
- Use plain, friendly language, no jargon
- Primary action must be obvious within 3 seconds of loading

STEP 4: BEFORE FINISHING, CHECK
1. Does every word, image, and button fit this business type?
2. Is any text cut off or placeholder?
3. Is there any invented number or fact?
4. Can a customer complete the main action (book or buy)
   in under a minute on a phone?
If any answer is wrong, fix it before output.
"""

SERVICE_KEYWORDS = {
    "barber", "kinyozi", "salon", "hair", "spa", "nails", "braids", "beauty", "massage",
    "mechanic", "garage", "auto", "car wash", "tutor", "tuition", "school", "driving",
    "photographer", "photography", "videography", "cleaner", "cleaning", "plumber",
    "electrician", "clinic", "dental", "dentist", "doctor", "consultant", "lawyer",
    "fitness", "gym", "trainer", "yoga", "therapy", "studio", "makeup"
}

PRODUCT_KEYWORDS = {
    "groceries", "grocery", "produce", "fruits", "vegetables", "boutique", "fashion",
    "clothes", "clothing", "wear", "shoes", "sneakers", "electronics", "phones",
    "accessories", "supermarket", "store", "shop", "bakery", "butchery", "hardware"
}


def classify_business(name: str, description: str = "", industry: str = "", category: str = "") -> Literal["SERVICE", "PRODUCT", "HYBRID"]:
    """Deterministic classification with fallback to text analysis."""
    text = f"{name} {description} {industry} {category}".lower()

    # Explicit industry mappings
    if industry in {"beauty", "clinic", "fitness", "education", "professional", "auto", "photography", "home_services"}:
        # Check if hybrid (sells both services and products)
        has_product_word = any(re.search(rf"\b{re.escape(w)}\b", text) for w in ["shop", "products", "retail", "store", "cosmetics"])
        return "HYBRID" if has_product_word and any(re.search(rf"\b{re.escape(w)}\b", text) for w in ["service", "booking", "salon", "barber", "spa"]) else "SERVICE"

    if industry in {"retail", "restaurant"}:
        return "PRODUCT"

    svc_score = sum(1 for w in SERVICE_KEYWORDS if re.search(rf"\b{re.escape(w)}\b", text))
    prd_score = sum(1 for w in PRODUCT_KEYWORDS if re.search(rf"\b{re.escape(w)}\b", text))

    if svc_score > 0 and prd_score > 0:
        return "HYBRID"
    if svc_score >= 1 or "booking" in text or "appointment" in text:
        return "SERVICE"
    return "PRODUCT"


def select_store_template(business: Business) -> str:
    """Select the exact matching storefront template."""
    b_type = classify_business(business.name, business.description or "", business.industry or "", business.category or "")
    if b_type in {"SERVICE", "HYBRID"}:
        return "zuribeauty"
    if business.industry == "restaurant":
        return "brewandbites"
    if any(w in (business.category or "").lower() for w in ["grocery", "produce", "farm", "fruit", "veg"]):
        return "mavunofresh"
    return "twosidesboutique"


def get_storefront_blueprint(business: Business) -> dict[str, Any]:
    """Generates the verified storefront blueprint adhering to the prompt rules."""
    b_type = classify_business(business.name, business.description or "", business.industry or "", business.category or "")
    is_service = b_type in {"SERVICE", "HYBRID"}

    if is_service:
        return {
            "business_type": b_type,
            "template_key": "zuribeauty",
            "is_service": True,
            "primary_action": "Book Now",
            "whatsapp_action": "Book on WhatsApp",
            "whatsapp_default_message": f"Hi {business.name}, I'd like to book a appointment with you.",
            "allowed_sections": ["hero", "about", "services", "gallery", "booking", "location", "contact"],
            "forbidden_features": [
                "shopping_cart", "basket", "delivery_fees", "tax_fees", "packaging_fees", "add_to_cart_buttons"
            ],
            "booking_mode": "Studio Visit or House Call",
            "payment_methods": ["Cash", "Lipa Na M-Pesa"],
        }
    else:
        tpl = "brewandbites" if business.industry == "restaurant" else ("mavunofresh" if "grocery" in (business.category or "").lower() else "twosidesboutique")
        return {
            "business_type": "PRODUCT",
            "template_key": tpl,
            "is_service": False,
            "primary_action": "Order Online",
            "whatsapp_action": "Order on WhatsApp",
            "whatsapp_default_message": f"Hi {business.name}, I'd like to order from your shop.",
            "allowed_sections": ["hero", "categories", "products", "cart", "checkout", "contact"],
            "forbidden_features": [
                "booking_form", "appointment_slots", "service_durations"
            ],
            "fulfilment_mode": "Delivery or Store Pickup",
            "payment_methods": ["Lipa Na M-Pesa", "Cash on Delivery"],
        }
