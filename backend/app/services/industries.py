"""Industry registry. The platform core is industry-independent; an industry only supplies vocabulary,
categories, starter services, a default template and schema.org type. Adding an industry = adding an entry here."""
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Industry:
    key: str
    label: str
    blurb: str
    categories: tuple[str, ...]
    template: str
    schema_type: str
    cta: str  # primary call-to-action on the website
    services_title: str
    services_subtitle: str
    booking_title: str
    booking_subtitle: str
    wa_message: str  # default WhatsApp message; {business} / {service}
    item_word: str = "service"
    suggestions: tuple[tuple[str, int, int], ...] = ()  # (name, price in KES, minutes)
    photo: str = ""  # landing/showcase photo stem in /img


INDUSTRIES: dict[str, Industry] = {i.key: i for i in [
    Industry("beauty", "Beauty & hair", "Salons, barbershops, nail studios, spas, makeup artists",
             ("Beauty Salon", "Barbershop", "Nail Studio", "Spa", "Makeup Artist", "Hair Stylist", "Lash Artist", "Beauty Therapist", "Wig Business", "Skincare"),
             "beauty_studio_01", "BeautySalon", "Book appointment", "Services & prices", "Tap a service to book it on WhatsApp.", "Book an appointment",
             "Choose a service and a time. We'll confirm shortly.", "Hi {business}, I'd like to book {service}.",
             suggestions=(("Knotless Braids", 1500, 240), ("Silk Press", 1800, 90), ("Gel Manicure", 1200, 60)), photo="salon-dryer"),
    Industry("restaurant", "Restaurants & cafés", "Restaurants, cafés, bakeries, catering",
             ("Restaurant", "Café", "Bakery", "Catering", "Bar & Grill", "Food Truck"), "restaurant_01", "Restaurant", "Order online", "Menu & prices",
             "Tap a dish to order or ask on WhatsApp.", "Order online", "Choose your favourite dishes and send your order directly on WhatsApp.", "Hi {business}, I'd like to order {service}.",
             item_word="dish", suggestions=(("Nyama Choma Platter", 1800, 45), ("Chicken Biryani", 950, 30), ("Fresh Juice", 250, 10)), photo="restaurant-3"),
    Industry("real_estate", "Real estate", "Agents, property managers, developers",
             ("Real Estate Agency", "Property Manager", "Developer", "Rentals", "Land Sales"), "real_estate_01", "RealEstateAgent", "Book a viewing",
             "Listings & services", "Ask about a listing on WhatsApp.", "Book a viewing", "Choose a service and a time for your viewing.",
             "Hi {business}, I'm interested in {service}.", item_word="listing",
             suggestions=(("Property Viewing", 0, 60), ("Rental Search", 5000, 60), ("Valuation", 15000, 90)), photo="real-estate-1"),
    Industry("clinic", "Clinics & health", "Clinics, dentists, physiotherapists, pharmacies",
             ("Clinic", "Dental Clinic", "Physiotherapy", "Pharmacy", "Optician", "Counselling"), "clinic_01", "MedicalClinic", "Book a consultation",
             "Treatments & prices", "Ask about a treatment on WhatsApp.", "Book a consultation", "Choose a treatment and a time. We'll confirm shortly.",
             "Hi {business}, I'd like to book {service}.", item_word="treatment",
             suggestions=(("General Consultation", 1500, 30), ("Dental Check-up", 2000, 30), ("Physiotherapy Session", 3000, 45)), photo="clinic-1"),
    Industry("fitness", "Fitness & gyms", "Gyms, personal trainers, yoga and dance studios",
             ("Gym", "Personal Trainer", "Yoga Studio", "Dance Studio", "Martial Arts", "Sports Club"), "fitness_01", "HealthClub", "Book a class",
             "Classes & memberships", "Join a class or ask about membership.", "Book a class", "Pick a class and a time.",
             "Hi {business}, I'd like to book {service}.", item_word="class",
             suggestions=(("Monthly Membership", 4000, 60), ("Personal Training Session", 2500, 60), ("Yoga Class", 800, 60)), photo="fitness-1"),
    Industry("hotel", "Hotels & stays", "Hotels, guesthouses, lodges, short-stay rentals",
             ("Hotel", "Guest House", "Lodge", "Airbnb / Short Stay", "Resort"), "hotel_01", "Hotel", "Book a stay", "Rooms & rates",
             "Ask about availability on WhatsApp.", "Request a booking", "Choose a room and a check-in time.", "Hi {business}, I'd like to book {service}.",
             item_word="room", suggestions=(("Standard Room", 6500, 60), ("Deluxe Room", 9500, 60), ("Family Suite", 14000, 60)), photo="hotel-1"),
    Industry("professional", "Professional services", "Lawyers, accountants, consultants, agencies",
             ("Consultant", "Law Firm", "Accounting", "Agency", "Architect", "Insurance"), "professional_01", "ProfessionalService", "Book a consultation",
             "Services & fees", "Ask about a service on WhatsApp.", "Book a consultation", "Choose a service and a time.",
             "Hi {business}, I'd like to book {service}.", suggestions=(("Initial Consultation", 3000, 45), ("Tax Filing", 8000, 60), ("Business Advisory", 12000, 90)), photo="professional-1"),
    Industry("auto", "Auto services", "Garages, car wash, detailing, tyre shops",
             ("Garage / Mechanic", "Car Wash", "Detailing", "Tyre Shop", "Auto Electrician", "Car Hire"), "auto_01", "AutoRepair", "Book a service",
             "Services & prices", "Ask about a service on WhatsApp.", "Book a service", "Choose a service and a drop-off time.",
             "Hi {business}, I'd like to book {service}.", suggestions=(("Full Service", 6500, 120), ("Wheel Alignment", 2500, 60), ("Interior Detailing", 4000, 120)), photo="auto-1"),
    Industry("retail", "Retail & shops", "Boutiques, shops, markets, online sellers",
             ("Boutique", "General Shop", "Electronics", "Grocery", "Gifts", "Online Store"), "shop_app_01", "Store", "Order on WhatsApp", "Products & prices",
             "Tap a product to ask or order on WhatsApp.", "Book a visit", "Choose a time to visit or collect.", "Hi {business}, I'd like to order {service}.",
             item_word="product", suggestions=(("Summer Dress", 2500, 15), ("Leather Handbag", 4500, 15), ("Gift Hamper", 3500, 15)), photo="retail-1"),
    Industry("photography", "Photography & events", "Photographers, videographers, event planners, DJs",
             ("Photographer", "Videographer", "Event Planner", "DJ / Entertainment", "Decor"), "photography_01", "ProfessionalService", "Book a shoot",
             "Packages & prices", "Ask about a package on WhatsApp.", "Book a shoot", "Choose a package and a date.", "Hi {business}, I'd like to book {service}.",
             item_word="package", suggestions=(("Portrait Session", 6000, 90), ("Wedding Package", 60000, 480), ("Event Coverage", 25000, 240)), photo="photography-1"),
    Industry("home_services", "Home services", "Cleaners, plumbers, electricians, movers, contractors",
             ("Cleaning", "Plumber", "Electrician", "Movers", "Contractor", "Pest Control"), "service_app_01", "HomeAndConstructionBusiness", "Request a quote",
             "Services & prices", "Ask for a quote on WhatsApp.", "Request a visit", "Choose a service and a time for a visit.",
             "Hi {business}, I'd like a quote for {service}.", suggestions=(("Home Cleaning", 3500, 180), ("Plumbing Call-out", 2000, 60), ("Electrical Repair", 2500, 60)), photo="home-services-1"),
    Industry("education", "Education & training", "Schools, tutors, training centres, driving schools",
             ("Tutor", "Training Centre", "Driving School", "Nursery / Daycare", "Language School", "Music School"), "education_01", "EducationalOrganization", "Enrol now",
             "Courses & fees", "Ask about a course on WhatsApp.", "Book a class", "Choose a course and a time.", "Hi {business}, I'd like to enrol in {service}.",
             item_word="course", suggestions=(("Private Tutoring", 1500, 60), ("Computer Basics Course", 8000, 90), ("Driving Lessons", 2500, 60)), photo="education-1"),
]}

DEFAULT_INDUSTRY = "beauty"


def get_industry(key: str | None) -> Industry:
    return INDUSTRIES.get(key or DEFAULT_INDUSTRY, INDUSTRIES[DEFAULT_INDUSTRY])
