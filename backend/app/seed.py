"""Idempotent bootstrap: roles, plans, templates, optional super-admin, optional demo businesses.
Run: python -m app.seed [--demo]"""
import io
import logging
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.core.permissions import DEFAULT_ROLE_PERMISSIONS
from app.core.security import hash_password
from app.models import Business, GalleryImage, Role, Service, User
from app.models.enums import PlatformRole
from app.services import business as biz
from app.services.industries import INDUSTRIES
from app.services.images import get_storage
from app.services.plans import seed_plans
from app.services.templates_seed import seed_templates
from app.services import catalog as catalog_svc
from app.services import website as ws

log = logging.getLogger("bizora.seed")

DEMOS = [
    dict(name="Mary's Beauty Studio", slug="marysbeauty", city="Pangani, Nairobi", category="Beauty Salon", template="beauty_studio_01", phone="0712000001",
         description="Professional hair and beauty services for modern women in Pangani. Braids, nails and skincare by appointment.", accent="#B4532A",
         services=[("Knotless Braids", "Neat, lightweight knotless braids.", 1500, 240), ("Gel Nails", "Gel overlay with a colour of your choice.", 800, 60), ("Pedicure", "Relaxing pedicure with scrub.", 1000, 60), ("Silk Press", "Wash, blow-dry and silk press.", 1800, 90)]),
    dict(name="Glow Beauty Lounge", slug="glowlounge", city="Westlands, Nairobi", category="Spa", template="spa_01", phone="0712000002",
         description="A calm space for facials, massage and skin treatments in Westlands.", accent="#3F6B57",
         services=[("Signature Facial", "Deep-cleansing facial for glowing skin.", 3500, 75), ("Swedish Massage", "60 minutes full-body relaxation.", 4000, 60), ("Body Scrub", "Exfoliating scrub and moisturise.", 2500, 45)]),
    dict(name="Urban Cuts", slug="urbancuts", city="Kilimani, Nairobi", category="Barbershop", template="barbershop_01", phone="0712000003",
         description="Sharp fades, clean line-ups and beard trims. Walk-ins welcome, bookings preferred.", accent="#E6F26A",
         services=[("Haircut", "Classic or fade with a hot towel finish.", 500, 30), ("Beard Trim", "Shape and line-up.", 300, 20), ("Cut + Beard", "The full package.", 700, 45), ("Kids Cut", "Under 12.", 350, 25)]),
    dict(name="Nairobi Nail Studio", slug="nairobinails", city="Lavington, Nairobi", category="Nail Studio", template="nail_studio_01", phone="0712000004",
         description="Nail art, acrylics and gel manicures by a team of certified nail technicians.", accent="#C2185B",
         services=[("Acrylic Full Set", "Full set in your choice of shape.", 2500, 120), ("Gel Manicure", "Long-lasting gel colour.", 1200, 60), ("Nail Art (per nail)", "Custom hand-painted art.", 100, 10)]),
    dict(name="The Beauty Room", slug="thebeautyroom", city="Karen, Nairobi", category="Makeup Artist", template="makeup_artist_01", phone="0712000005",
         description="Bridal, event and editorial makeup by appointment.", accent="#111111",
         services=[("Bridal Makeup", "Trial + wedding day makeup.", 12000, 180), ("Event Makeup", "Full-face glam for any occasion.", 3500, 75), ("Lash Application", "Classic or volume lashes.", 2000, 90)]),
]


def seed_roles(db: Session) -> None:
    existing = {r.name for r in db.scalars(select(Role))}
    for name, perms in DEFAULT_ROLE_PERMISSIONS.items():
        if name not in existing:
            db.add(Role(name=str(name), description=f"Default {name} role", permissions=sorted(perms)))
    db.commit()


def seed_admin(db: Session) -> None:
    email, pw = os.getenv("ADMIN_EMAIL"), os.getenv("ADMIN_PASSWORD")
    if not (email and pw):
        return
    if not db.scalar(select(User.id).where(User.email == email.lower())):
        db.add(User(email=email.lower(), password_hash=hash_password(pw), full_name=os.getenv("ADMIN_NAME", "Bizora Admin"), platform_role=PlatformRole.SUPER_ADMIN, email_verified=True))
        db.commit()
        log.info("created super admin %s", email)


def _tile(seed: int, accent: str) -> bytes:
    """Abstract placeholder tile for demo galleries (clearly not client photography)."""
    img = Image.new("RGB", (900, 900), "#EFE9E1")
    d = ImageDraw.Draw(img)
    base = tuple(int(accent.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    for i in range(6):
        off = (seed * 53 + i * 97) % 500
        shade = tuple(min(255, int(c * (0.5 + 0.1 * i)) + 30) for c in base)
        d.ellipse((off - 150, 120 * i - 100, off + 450, 120 * i + 400), fill=shade)
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=80)
    return buf.getvalue()


DEMO_PHOTOS = {
    "marysbeauty": ["portrait-smile", "salon-dryer", "salon-scissors", "braids-portrait", "profile-side", "nails-care"],
    "glowlounge": ["spa-facial", "spa-massage", "nails-polish", "portrait-smile", "profile-side", "salon-dryer"],
    "urbancuts": ["barber-cut", "barbershop", "barber-classic", "salon-scissors", "profile-side", "braids-portrait"],
    "nairobinails": ["nails-polish", "nails-care", "portrait-makeup", "portrait-smile", "spa-facial", "profile-side"],
    "thebeautyroom": ["portrait-makeup", "profile-side", "portrait-smile", "braids-portrait", "nails-polish", "salon-dryer"],
}
ASSETS = Path(__file__).resolve().parent / "seed_assets"

def _d(industry, slug, name, category, city, phone, description, services, accent="#1D4ED8"):
    return dict(name=name, slug=slug, city=city, category=category, template=INDUSTRIES[industry].template, industry=industry, phone=phone, description=description, accent=accent, services=services)


DEMOS += [
    _d("restaurant", "savannagrill", "Savanna Grill & Café", "Restaurant", "Westlands, Nairobi", "0712000011", "Charcoal-grilled meats, fresh juices and weekend brunch in the heart of Westlands.",
       [("Nyama Choma Platter", "Goat ribs with kachumbari and ugali.", 1800, 45), ("Chicken Biryani", "Spiced rice with tender chicken.", 950, 30), ("Weekend Brunch", "Pancakes, eggs and fresh juice.", 1400, 45), ("Fresh Passion Juice", "Cold-pressed, no sugar added.", 250, 10)]),
    _d("real_estate", "keyhomes", "Key Homes Realty", "Real Estate Agency", "Kilimani, Nairobi", "0712000012", "Rentals and sales of apartments and family homes across Nairobi.",
       [("Property Viewing", "Guided viewing of shortlisted homes.", 0, 60), ("Rental Search", "We shortlist homes to your budget.", 5000, 60), ("Property Valuation", "Written market valuation.", 15000, 90)]),
    _d("clinic", "carewellclinic", "CareWell Family Clinic", "Clinic", "Lavington, Nairobi", "0712000013", "Family healthcare, dental care and physiotherapy under one roof.",
       [("General Consultation", "See a doctor for common conditions.", 1500, 30), ("Dental Check-up", "Exam and clean.", 2500, 30), ("Physiotherapy Session", "Assessment and treatment.", 3000, 45), ("Child Wellness Visit", "Growth and vaccination review.", 1800, 30)]),
    _d("fitness", "powerhousegym", "PowerHouse Gym", "Gym", "Parklands, Nairobi", "0712000014", "Strength, cardio and classes with certified coaches. Day passes welcome.",
       [("Day Pass", "Full gym access for one day.", 500, 60), ("Monthly Membership", "Unlimited gym access.", 4000, 60), ("Personal Training", "One-on-one coaching.", 2500, 60), ("Yoga Class", "Group class, all levels.", 800, 60)]),
    _d("hotel", "baobabstay", "Baobab Guest House", "Guest House", "Diani, Kwale", "0712000015", "A peaceful guest house minutes from the beach, with breakfast included.",
       [("Standard Room", "Queen bed, en-suite, breakfast.", 6500, 60), ("Deluxe Room", "Sea-view balcony.", 9500, 60), ("Family Suite", "Two bedrooms, sleeps four.", 14000, 60)]),
    _d("professional", "clearbooks", "ClearBooks Advisory", "Accounting", "CBD, Nairobi", "0712000016", "Bookkeeping, tax and business advisory for small and growing companies.",
       [("Initial Consultation", "30-minute discovery call.", 0, 30), ("Monthly Bookkeeping", "Books kept and reconciled.", 8000, 60), ("Tax Filing", "Annual returns done for you.", 12000, 90)]),
    _d("auto", "torquegarage", "Torque Garage", "Garage / Mechanic", "Industrial Area, Nairobi", "0712000017", "Honest servicing, diagnostics and repairs for all makes.",
       [("Full Service", "Oil, filters, inspection.", 6500, 120), ("Wheel Alignment", "Computerised alignment.", 2500, 60), ("Engine Diagnostics", "Scan and report.", 2000, 45), ("Interior Detailing", "Deep clean.", 4000, 120)]),
    _d("retail", "zuriboutique", "Zuri Boutique", "Boutique", "Karen, Nairobi", "0712000018", "Locally made dresses, accessories and gifts. Order on WhatsApp.",
       [("Summer Dress", "Handmade, sizes 8-18.", 2500, 15), ("Leather Handbag", "Genuine leather.", 4500, 15), ("Gift Hamper", "Curated gift set.", 3500, 15)]),
    _d("photography", "lensandlight", "Lens & Light Studio", "Photographer", "Ngong Road, Nairobi", "0712000019", "Portraits, weddings and events told honestly and beautifully.",
       [("Portrait Session", "60 edited photos.", 6000, 90), ("Wedding Package", "Full-day coverage and album.", 60000, 480), ("Event Coverage", "Up to 4 hours.", 25000, 240)]),
    _d("home_services", "sparkhome", "Spark Home Services", "Cleaning", "South B, Nairobi", "0712000020", "Reliable home cleaning, plumbing and electrical repairs — fast quotes on WhatsApp.",
       [("Home Cleaning", "Up to 3 bedrooms.", 3500, 180), ("Plumbing Call-out", "Diagnosis and fix.", 2000, 60), ("Electrical Repair", "Sockets, lights, fittings.", 2500, 60)]),
    _d("education", "brightminds", "BrightMinds Learning Centre", "Training Centre", "Thika Road, Nairobi", "0712000021", "Tutoring, computer skills and holiday programmes for learners of all ages.",
       [("Private Tutoring", "Primary and secondary subjects.", 1500, 60), ("Computer Basics Course", "6-week beginner course.", 8000, 90), ("Holiday Programme", "Weekly kids programme.", 6000, 180)]),
    _d("retail", "twosides", "Two Sides Boutique", "Boutique", "Westlands, Nairobi", "0712000099",
       "Style for Every Side of You. Contemporary fashion, designer dresses, shoes & accessories.",
       [("Floral Silk Midi Dress", "Effortless A-line cut with tie belt.", 3500, 15),
        ("Oversized Linen Blazer", "Tailored relaxed silhouette.", 4200, 15)],
       accent="#0F172A"),
    _d("restaurant", "jeffcafe", "Jeff Cafe", "Café & Eatery", "Kilimani, Nairobi", "0712000098",
       "Fresh meals, made for you. Charcoal grills, artisan burgers, breakfast & fresh juices.",
       [("Nyama Choma Platter", "Tender grilled goat ribs with kachumbari.", 1800, 25),
        ("Smash Cheeseburger & Fries", "Double beef patty with cheddar.", 950, 20)],
       accent="#E2683C"),
]

DEMO_PHOTOS.update({d["slug"]: [f"{d['industry'].replace('_', '-')}-{n}" for n in range(1, 7)] for d in DEMOS if d.get("industry")})


def add_demo_gallery(db: Session, b: Business, slug: str) -> None:
    """Real (CC0) photos for demo businesses. Replaces any earlier placeholder tiles."""
    from PIL import Image
    storage = get_storage()
    for g in db.scalars(select(GalleryImage).where(GalleryImage.business_id == b.id)):
        db.delete(g)
    db.flush()
    for i, name in enumerate(DEMO_PHOTOS[slug]):
        src = ASSETS / f"{name}.webp"
        if not src.exists():
            continue
        im = Image.open(src)
        url = storage.save(f"{b.id}/gallery/{name}_medium.webp", src.read_bytes())
        thumb = im.copy(); thumb.thumbnail((640, 640))
        buf = io.BytesIO(); thumb.save(buf, "WEBP", quality=78)
        turl = storage.save(f"{b.id}/gallery/{name}_thumb.webp", buf.getvalue())
        db.add(GalleryImage(business_id=b.id, url=url, thumb_url=turl, caption=f"Demo photo {i + 1}", position=i, width=im.width, height=im.height))
    db.flush()


EXTRA_SERVICES = {
    "zuriboutique": [("Ankara Skirt", "Midi length, sizes 8-18.", 2200, 15), ("Denim Jacket", "Unisex, relaxed fit.", 3800, 15), ("Beaded Earrings", "Handmade by local artisans.", 900, 15)],
    "savannagrill": [("Samosa Platter", "Beef and veggie samosas.", 650, 15), ("Mandazi & Chai", "Breakfast favourite.", 350, 10), ("Grilled Tilapia", "Whole fish with ugali.", 1600, 40)],
}
DEMO_CATS = {"zuriboutique": ["Dresses", "Bags", "Gifts", "Dresses", "Dresses", "Accessories"], "savannagrill": ["Grill", "Rice", "Brunch", "Drinks", "Starters", "Brunch", "Grill"]}


def ensure_demo_content(db: Session) -> None:
    """Idempotently give demo businesses product photos, categories and (for one salon) a team — so every template previews well."""
    from app.models import ServiceCategory, Staff
    for slug in DEMO_PHOTOS:
        b = db.scalars(select(Business).where(Business.slug == slug, Business.is_demo.is_(True))).first()
        if not b:
            continue
        have = {sv.name for sv in db.scalars(select(Service).where(Service.business_id == b.id, Service.deleted_at.is_(None)))}
        for i, (name, desc, price, mins) in enumerate(EXTRA_SERVICES.get(slug, [])):
            if name not in have:
                db.add(Service(business_id=b.id, name=name, slug=catalog_svc.unique_service_slug(db, b.id, name), description=desc, price=price, currency="KES", duration_minutes=mins, position=50 + i))
        db.flush()
        services = list(db.scalars(select(Service).where(Service.business_id == b.id, Service.deleted_at.is_(None)).order_by(Service.position, Service.created_at)))
        gallery = list(db.scalars(select(GalleryImage).where(GalleryImage.business_id == b.id).order_by(GalleryImage.position)))
        cats = {c.name: c for c in db.scalars(select(ServiceCategory).where(ServiceCategory.business_id == b.id))}
        for i, sv in enumerate(services):
            if gallery:
                sv.image_url = gallery[i % len(gallery)].thumb_url or gallery[i % len(gallery)].url
            cname = (DEMO_CATS.get(slug) or [None] * 99)[i]
            if cname:
                if cname not in cats:
                    cats[cname] = ServiceCategory(business_id=b.id, name=cname, position=len(cats))
                    db.add(cats[cname]); db.flush()
                sv.category_id = cats[cname].id
        if slug == "marysbeauty" and not db.scalar(select(Staff.id).where(Staff.business_id == b.id)):
            storage = get_storage()
            for name, photo in (("Mary", "portrait-smile"), ("Jane", "braids-portrait"), ("Faith", "portrait-makeup")):
                from PIL import Image
                im = Image.open(ASSETS / f"{photo}.webp"); im.thumbnail((400, 400)); buf = io.BytesIO(); im.save(buf, "WEBP", quality=80)
                url = storage.save(f"{b.id}/staff/{photo}.webp", buf.getvalue())
                db.add(Staff(business_id=b.id, name=name, photo_url=url))
    db.commit()


ZURI_PRODUCTS = [  # (name, short, price, compare_at, category path, photo index, stock, featured)
    ("Summer Wrap Dress", "Handmade cotton wrap dress, sizes 8-18.", 2500, 3200, ("Women", "Dresses"), 0, 12, True),
    ("Ankara Midi Skirt", "Bold prints, lined, side pockets.", 2200, None, ("Women", "Skirts"), 1, 8, True),
    ("Leather Handbag", "Genuine leather, hand-stitched in Nairobi.", 4500, 5200, ("Accessories", "Bags"), 2, 4, True),
    ("Denim Jacket", "Unisex, relaxed fit.", 3800, None, ("Women", "Jackets"), 3, 2, False),
    ("Beaded Earrings", "Handmade by local artisans.", 900, None, ("Accessories", "Jewellery"), 4, 30, False),
    ("Gift Hamper", "Curated gift set with a handwritten note.", 3500, None, ("Gifts",), 5, 6, True),
    ("Kitenge Tote", "Roomy everyday tote.", 1800, 2200, ("Accessories", "Bags"), 0, 0, False),
    ("Linen Shirt Dress", "Breathable linen for warm days.", 3100, None, ("Women", "Dresses"), 1, 9, False),
]

TWOSIDES_PRODUCTS = [
    ("Oversized Linen Blazer", "Tailored relaxed silhouette with tortoise buttons.", 4200, 5200, ("Women", "Jackets"), 0, 15, True),
    ("Floral Silk Midi Dress", "Effortless A-line cut with tie belt and flowy hem.", 3500, 4400, ("Women", "Dresses"), 1, 20, True),
    ("Ribbed Knit Crop Top", "Soft stretch cotton knit, everyday essential.", 1600, 2000, ("Women", "Tops"), 2, 25, True),
    ("Classic Leather Loafers", "Handcrafted genuine leather with cushioned insole.", 4800, 5800, ("Shoes", "Loafers"), 3, 10, True),
    ("Gold Layered Chain Necklace", "18k gold plated waterproof jewelry.", 1400, 1800, ("Accessories", "Jewellery"), 4, 30, False),
    ("Structured Mini Crossbody", "Vegan leather with adjustable shoulder strap.", 2900, 3600, ("Accessories", "Bags"), 5, 12, True),
    ("Wide Leg Palazzo Trousers", "High-waisted lightweight summer trousers.", 2800, 3400, ("Women", "Trousers"), 0, 18, False),
    ("Sleeveless Satin Slip Dress", "Bias-cut cowl neckline for evening wear.", 3800, 4800, ("Women", "Dresses"), 1, 14, True),
]

JEFFCAFE_PRODUCTS = [
    ("Nyama Choma Platter", "Tender grilled goat ribs with kachumbari, ugali & chili.", 1800, 2100, ("Main Meals", "Grill"), 0, 50, True),
    ("Smash Cheeseburger & Fries", "Double beef patty, melted cheddar, pickles & special sauce.", 950, 1150, ("Main Meals", "Burgers"), 1, 40, True),
    ("Loaded Masala Fries", "Crispy spiced fries with melted cheese and cilantro.", 450, 550, ("Snacks", "Sides"), 2, 60, True),
    ("Cold Pressed Passion Juice", "100% pure passion fruit, freshly extracted daily.", 250, 300, ("Drinks", "Juices"), 3, 80, True),
    ("Full English Breakfast", "Sausages, eggs, baked beans, toast & grilled tomatoes.", 850, 1000, ("Breakfast", "Hot Breakfast"), 4, 35, True),
    ("Belgian Waffles & Berries", "Warm fluffy waffles with maple syrup and whipped cream.", 650, 750, ("Breakfast", "Waffles"), 5, 30, False),
    ("Caramel Iced Latte", "Double shot espresso with silky milk and caramel drizzle.", 400, 480, ("Drinks", "Coffee"), 2, 50, True),
    ("Crispy Chicken Wings (6pcs)", "Tossed in spicy honey BBQ glaze with garlic dip.", 750, 900, ("Snacks", "Wings"), 1, 45, True),
]


def _populate_store_catalog(db: Session, slug: str, products_list: list, asset_prefix: str, headline: str, subheadline: str) -> None:
    from app.models import Product, ServiceCategory
    from app.services import catalog as cat
    b = db.scalars(select(Business).where(Business.slug == slug, Business.is_demo.is_(True))).first()
    if not b or db.scalar(select(Product.id).where(Product.business_id == b.id)):
        return
    for sv in db.scalars(select(Service).where(Service.business_id == b.id)):
        db.delete(sv)
    for c in db.scalars(select(ServiceCategory).where(ServiceCategory.business_id == b.id)):
        db.delete(c)
    db.flush()
    storage = get_storage()
    photos = []
    for n in range(1, 7):
        src = ASSETS / f"{asset_prefix}-{n}.webp"
        photos.append(storage.save(f"{b.id}/products/{asset_prefix}-{n}.webp", src.read_bytes()) if src.exists() else None)
    cats: dict[tuple, ServiceCategory] = {}
    for _, _, _, _, path, *_ in products_list:
        for depth in range(1, len(path) + 1):
            key = path[:depth]
            if key not in cats:
                cats[key] = ServiceCategory(business_id=b.id, name=key[-1], slug=cat.unique_category_slug(db, b.id, key[-1]), position=len(cats),
                                            parent_id=cats[key[:-1]].id if depth > 1 else None, image_url=photos[len(cats) % 6])
                db.add(cats[key]); db.flush()
    for i, (name, short, price, compare, path, ph, stock, featured) in enumerate(products_list):
        db.add(Product(business_id=b.id, name=name, slug=cat.unique_product_slug(db, b.id, name), short_description=short, description=short, price=price,
                       compare_at_price=compare, currency="KES", category_id=cats[path].id, images=[photos[ph]] if photos[ph] else [], track_stock=True,
                       stock_qty=stock, featured=featured, position=i, tags=["featured" if featured else "regular"]))
    db.flush()
    db.refresh(b.website)
    ws.regenerate(db, b.website, b)
    for s in b.website.sections:
        if s.type == "hero":
            s.content = {**s.content, "headline": headline, "subheadline": subheadline, "cta_text": "Shop now", "cta_action": "shop"}
    ws.publish(db, b.website)
    db.commit()


def ensure_demo_products(db: Session) -> None:
    """Real product catalogues (nested categories, compare-at prices, stock) for demo ecommerce storefronts."""
    _populate_store_catalog(db, "zuriboutique", ZURI_PRODUCTS, "retail", "Handcrafted Fashion & Gifts", "Curated dresses, accessories and local artisan gifts.")
    _populate_store_catalog(db, "twosides", TWOSIDES_PRODUCTS, "retail", "Style for Every Side of You", "New season collection is here. Shop trending styles with instant delivery.")
    _populate_store_catalog(db, "jeffcafe", JEFFCAFE_PRODUCTS, "restaurant", "Fresh meals, made for you", "Hot and delicious meals prepared fresh daily. Order online or via WhatsApp.")


def refresh_demo_photos(db: Session) -> None:
    for slug in DEMO_PHOTOS:
        b = db.scalars(select(Business).where(Business.slug == slug, Business.is_demo.is_(True))).first()
        if b:
            add_demo_gallery(db, b, slug)
    db.commit()


def seed_demos(db: Session) -> None:
    storage = get_storage()
    for d in DEMOS:
        if db.scalar(select(Business.id).where(Business.slug == d["slug"])):
            continue
        b = biz.create_business(db, owner=None, name=d["name"], industry=d.get("industry", "beauty"), category=d["category"], city=d["city"], phone=d["phone"], whatsapp=d["phone"], description=d["description"], slug=d["slug"],
                                template_key=d["template"], plan_key="GROW", trial=True, is_demo=True, email=f"hello@{d['slug']}.demo")
        b.primary_color = d["accent"]
        b.address = d["city"]
        from app.models import Subscription
        from datetime import datetime, timedelta, timezone
        sub = db.scalars(select(Subscription).where(Subscription.business_id == b.id)).one()
        sub.status, sub.trial_ends_at = "ACTIVE", None
        sub.current_period_end = datetime.now(timezone.utc) + timedelta(days=3650)
        for i, (name, desc, price, mins) in enumerate(d["services"]):
            db.add(Service(business_id=b.id, name=name, slug=catalog_svc.unique_service_slug(db, b.id, name), description=desc, price=price, currency="KES", duration_minutes=mins, position=i))
            db.flush()
        add_demo_gallery(db, b, d["slug"])
        db.flush()
        ws.publish(db, b.website)
    db.commit()


def ensure_service_slugs(db: Session) -> None:
    for sv in db.scalars(select(Service).where(Service.slug.is_(None))):
        sv.slug = catalog_svc.unique_service_slug(db, sv.business_id, sv.name, exclude_id=sv.id)
        db.flush()
    db.commit()


def ensure_demo_store(db: Session) -> None:
    """Variants, a discount code and delivery settings for demo stores, so the whole shop flow can be tried."""
    from app.models import Discount, Product
    from app.services import inventory as inv
    from app.services import store as store_cfg
    
    # 1. Zuri Boutique
    b = db.scalars(select(Business).where(Business.slug == "zuriboutique", Business.is_demo.is_(True))).first()
    if b and not (b.store_settings or {}).get("demo_seeded"):
        b.store_settings = {**store_cfg.clean({"delivery": {"flat_fee": 250, "free_over": 6000, "estimate": "Within Nairobi in 1–2 days",
                                                            "zones": [{"name": "Nairobi CBD", "fee": 150}, {"name": "Karen & Langata", "fee": 250}, {"name": "Outside Nairobi", "fee": 500}]},
                                            "payments": {"cash": True, "mpesa": False, "bank": False, "whatsapp": True}, "thank_you": "Thank you! We'll confirm your order on WhatsApp shortly."}),
                            "demo_seeded": True}
        for name in ("Summer Wrap Dress", "Linen Shirt Dress", "Ankara Midi Skirt"):
            p = db.scalars(select(Product).where(Product.business_id == b.id, Product.name == name)).first()
            if p is not None:
                vs = inv.sync_variants(db, p, [{"name": "Size", "values": ["S", "M", "L"]}])
                for v, qty in zip(vs, (6, 8, 0)):
                    v.stock_qty = qty
                p.stock_qty = 0
        if not db.scalar(select(Discount.id).where(Discount.business_id == b.id)):
            db.add(Discount(business_id=b.id, code="WELCOME10", description="10% off your first order", type="PERCENT", value=10))

    # 2. Two Sides Boutique
    b2 = db.scalars(select(Business).where(Business.slug == "twosides", Business.is_demo.is_(True))).first()
    if b2 and not (b2.store_settings or {}).get("demo_seeded"):
        b2.store_settings = {**store_cfg.clean({"delivery": {"flat_fee": 200, "free_over": 5000, "estimate": "Express same-day in Nairobi, 1-2 days countrywide",
                                                             "zones": [{"name": "Nairobi Express", "fee": 200}, {"name": "Rest of Kenya", "fee": 350}]},
                                             "payments": {"cash": True, "mpesa": True, "bank": False, "whatsapp": True}, "thank_you": "Order received! Your items will be dispatched shortly."}),
                             "demo_seeded": True}
        for name in ("Floral Silk Midi Dress", "Oversized Linen Blazer", "Ribbed Knit Crop Top", "Sleeveless Satin Slip Dress"):
            p = db.scalars(select(Product).where(Product.business_id == b2.id, Product.name == name)).first()
            if p is not None:
                vs = inv.sync_variants(db, p, [{"name": "Size", "values": ["XS", "S", "M", "L"]}])
                for v, qty in zip(vs, (4, 8, 8, 2)):
                    v.stock_qty = qty
                p.stock_qty = 0
        if not db.scalar(select(Discount.id).where(Discount.business_id == b2.id)):
            db.add(Discount(business_id=b2.id, code="STYLE20", description="20% off new season styles", type="PERCENT", value=20))

    db.commit()


def bootstrap(demo: bool = False) -> None:
    db = SessionLocal()
    try:
        seed_roles(db)
        seed_plans(db)
        seed_templates(db)
        seed_admin(db)
        ensure_service_slugs(db)
        if demo:
            seed_demos(db)
            refresh_demo_photos(db)
            ensure_demo_content(db)
            ensure_demo_products(db)
            ensure_demo_store(db)
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    bootstrap(demo="--demo" in sys.argv)
    print("seed complete")
