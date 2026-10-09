/**
 * Grofresh - Online Supermarket Catalog & Configuration Data
 * Configured in Kenyan Shillings (KSh / KES)
 */

const STORE_CONFIG = {
  storeName: "Grofresh",
  tagline: "Fresh Groceries Delivered To Your Door",
  currency: "KES",
  currencySymbol: "KSh ",
  freeDeliveryThreshold: 2500,
  standardDeliveryFee: 250,
  formatPrice: function(amount) {
    return "KSh " + Math.round(amount).toLocaleString();
  }
};

const CATEGORIES = [
  { id: "fruits", name: "Fresh Fruits", count: "48 items", image: "assets/cat_fruits.jpg" },
  { id: "vegetables", name: "Fresh Vegetables", count: "65 items", image: "assets/cat_veg.jpg" },
  { id: "dairy", name: "Dairy & Eggs", count: "32 items", image: "assets/cat_dairy.jpg" },
  { id: "meat", name: "Fresh Meat", count: "24 items", image: "assets/cat_meat.jpg" },
  { id: "bakery", name: "Snacks & Bakery", count: "40 items", image: "assets/cat_bakery.jpg" },
  { id: "drinks", name: "Beverages", count: "38 items", image: "assets/cat_drinks.jpg" }
];

const TODAYS_DEALS = [
  {
    id: "deal-tomatoes",
    name: "Fresh Red Vine Tomatoes",
    category: "Vegetables",
    price: 220,
    originalPrice: 280,
    unit: "1 kg",
    rating: 4.9,
    soldCount: 340,
    badge: "SALE 20%",
    badgeType: "sale",
    image: "assets/deal_tomatoes.jpg",
    description: "Plump, sun-ripened organic tomatoes grown sustainably on vine with maximum lycopene and sweet aromatic flavor."
  },
  {
    id: "deal-cauliflower",
    name: "Fresh Cauliflower Head",
    category: "Vegetables",
    price: 180,
    originalPrice: 240,
    unit: "1 pc (~800g)",
    rating: 4.8,
    soldCount: 195,
    badge: "ORGANIC",
    badgeType: "organic",
    image: "assets/deal_cauliflower.jpg",
    description: "Crisp, creamy white organic cauliflower harvested daily from certified local farms. Perfect for roasting or salads."
  },
  {
    id: "deal-lettuce",
    name: "Iceberg Crisp Lettuce",
    category: "Vegetables",
    price: 140,
    originalPrice: 190,
    unit: "1 pc",
    rating: 4.9,
    soldCount: 410,
    badge: "SALE 15%",
    badgeType: "sale",
    image: "assets/deal_lettuce.jpg",
    description: "Firm, crunchy heads of fresh iceberg lettuce, washed and packed with moisture-retaining biodegradable wrap."
  },
  {
    id: "deal-lemons",
    name: "Fresh Organic Lemons",
    category: "Fruits",
    price: 260,
    originalPrice: 340,
    unit: "1 kg",
    rating: 4.9,
    soldCount: 280,
    badge: "SALE 25%",
    badgeType: "sale",
    image: "assets/deal_lemons.jpg",
    description: "Juicy, thin-skinned Eureka lemons packed with natural vitamin C and fragrant citrus oils."
  }
];

const FRESH_FOOD_CATALOG = [
  {
    id: "prod-broccoli",
    name: "Organic Broccoli Crown",
    category: "vegetables",
    categoryName: "Vegetables",
    price: 220,
    originalPrice: 280,
    unit: "1 kg",
    rating: 4.9,
    badge: "ORGANIC",
    badgeType: "organic",
    image: "assets/prod_broccoli.jpg",
    description: "Nutrient-dense dark green broccoli florets rich in antioxidants and dietary fiber."
  },
  {
    id: "prod-eggplant",
    name: "Fresh Purple Eggplant",
    category: "vegetables",
    categoryName: "Vegetables",
    price: 190,
    originalPrice: 240,
    unit: "1 kg",
    rating: 4.8,
    badge: "HOT DEAL",
    badgeType: "sale",
    image: "assets/prod_eggplant.jpg",
    description: "Glossy deep violet eggplants with tender flesh, ideal for ratatouille or grilling."
  },
  {
    id: "prod-onions",
    name: "Crisp Red Sweet Onions",
    category: "vegetables",
    categoryName: "Vegetables",
    price: 150,
    originalPrice: 190,
    unit: "1 kg",
    rating: 4.9,
    badge: null,
    badgeType: null,
    image: "assets/prod_red_onions.jpg",
    description: "Pungent, sweet red onions with crunchy concentric rings for cooking and fresh salads."
  },
  {
    id: "prod-cucumber",
    name: "Fresh English Cucumbers",
    category: "vegetables",
    categoryName: "Vegetables",
    price: 130,
    originalPrice: 170,
    unit: "1 kg",
    rating: 4.8,
    badge: "ORGANIC",
    badgeType: "organic",
    image: "assets/prod_cucumber.jpg",
    description: "Seedless, crisp cucumbers offering cooling hydration and vibrant crunch."
  },
  {
    id: "prod-bananas",
    name: "Cavendish Fresh Bananas",
    category: "fruits",
    categoryName: "Fruits",
    price: 160,
    originalPrice: 200,
    unit: "1 bunch (~1kg)",
    rating: 4.9,
    badge: "POPULAR",
    badgeType: "organic",
    image: "assets/prod_bananas.jpg",
    description: "Naturally sweet potassium-rich yellow bananas ripened without chemicals."
  },
  {
    id: "prod-watermelon",
    name: "Sweet Red Watermelon",
    category: "fruits",
    categoryName: "Fruits",
    price: 450,
    originalPrice: 550,
    unit: "1 whole (~3kg)",
    rating: 4.9,
    badge: "SALE 20%",
    badgeType: "sale",
    image: "assets/prod_watermelon.jpg",
    description: "Extra-juicy seeded crimson sweet watermelon with thirst-quenching nectar."
  },
  {
    id: "prod-oranges",
    name: "Juicy Valencia Oranges",
    category: "fruits",
    categoryName: "Fruits",
    price: 280,
    originalPrice: 350,
    unit: "1 kg",
    rating: 4.9,
    badge: null,
    badgeType: null,
    image: "assets/prod_oranges.jpg",
    description: "Golden citrus bursts overflowing with natural sweet juice and zest."
  },
  {
    id: "prod-kiwi",
    name: "Fresh Golden Kiwi Fruits",
    category: "fruits",
    categoryName: "Fruits",
    price: 340,
    originalPrice: 420,
    unit: "4 pcs pack",
    rating: 4.9,
    badge: "ORGANIC",
    badgeType: "organic",
    image: "assets/prod_kiwi.jpg",
    description: "Tropical golden kiwi with smooth skin, high enzyme count and vitamin C."
  }
];

const SPOTLIGHT_PRODUCTS = [
  {
    id: "spot-carrots",
    name: "Fresh Organic Carrots",
    category: "Vegetables",
    price: 140,
    originalPrice: 180,
    unit: "1 kg",
    rating: 4.9,
    badge: "SALE 20%",
    badgeType: "sale",
    image: "assets/prod_carrots.jpg"
  },
  {
    id: "spot-potatoes",
    name: "Russet Cooking Potatoes",
    category: "Vegetables",
    price: 210,
    originalPrice: 260,
    unit: "2 kg bag",
    rating: 4.8,
    badge: "ORGANIC",
    badgeType: "organic",
    image: "assets/prod_potatoes.jpg"
  },
  {
    id: "spot-apples",
    name: "Crisp Green Granny Smith",
    category: "Fruits",
    price: 280,
    originalPrice: 340,
    unit: "1 kg",
    rating: 4.9,
    badge: "POPULAR",
    badgeType: "organic",
    image: "assets/prod_green_apples.jpg"
  }
];

const DAILY_BEST_SELLERS = [
  {
    id: "best-avocado",
    name: "Fresh Haas Avocados",
    category: "Produce",
    price: 320,
    originalPrice: 400,
    unit: "3 pcs pack",
    rating: 5.0,
    badge: "ORGANIC",
    badgeType: "organic",
    image: "assets/prod_avocado.jpg"
  },
  {
    id: "best-apples",
    name: "Crisp Red Gala Apples",
    category: "Fruits",
    price: 290,
    originalPrice: 360,
    unit: "1 kg",
    rating: 4.9,
    badge: "SALE 20%",
    badgeType: "sale",
    image: "assets/prod_red_apples.jpg"
  },
  {
    id: "best-salmon",
    name: "Wild Atlantic Salmon Fillet",
    category: "Seafood",
    price: 950,
    originalPrice: 1200,
    unit: "500g cut",
    rating: 4.9,
    badge: "FRESH TODAY",
    badgeType: "organic",
    image: "assets/prod_salmon.jpg"
  },
  {
    id: "best-peppers",
    name: "Trio Mixed Bell Peppers",
    category: "Vegetables",
    price: 310,
    originalPrice: 390,
    unit: "3 pcs pack",
    rating: 4.8,
    badge: "ORGANIC",
    badgeType: "organic",
    image: "assets/prod_bell_peppers.jpg"
  }
];

const SEAFOOD_DEALS = [
  {
    id: "sea-shrimp",
    name: "Wild Jumbo Tiger Shrimps",
    category: "Seafood",
    price: 1400,
    originalPrice: 1750,
    unit: "1 kg",
    rating: 4.9,
    badge: "FRESH CATCH",
    badgeType: "sale",
    image: "assets/seafood_shrimp.jpg"
  },
  {
    id: "sea-seabass",
    name: "Fresh Whole Sea Bass",
    category: "Seafood",
    price: 950,
    originalPrice: 1200,
    unit: "1 pc (~700g)",
    rating: 4.9,
    badge: "ORGANIC",
    badgeType: "organic",
    image: "assets/seafood_seabass.jpg"
  },
  {
    id: "sea-crab",
    name: "Steamed Red King Crab Legs",
    category: "Seafood",
    price: 1200,
    originalPrice: 1500,
    unit: "1 pack (~800g)",
    rating: 5.0,
    badge: "PREMIUM",
    badgeType: "organic",
    image: "assets/seafood_crab.jpg"
  },
  {
    id: "sea-snapper",
    name: "Wild Red Snapper Fillet",
    category: "Seafood",
    price: 1100,
    originalPrice: 1380,
    unit: "1 kg",
    rating: 4.8,
    badge: "SALE 20%",
    badgeType: "sale",
    image: "assets/seafood_red_snapper.jpg"
  }
];

const MONTHLY_GROCERY_DEAL = [
  {
    id: "mon-eggs",
    name: "Farm Fresh Brown Eggs",
    category: "Dairy & Eggs",
    price: 350,
    originalPrice: 450,
    unit: "12 pcs carton",
    rating: 4.9,
    badge: "SUPER DEAL",
    badgeType: "sale",
    image: "assets/deal_eggs_basket.jpg"
  },
  {
    id: "mon-ginger",
    name: "Organic Fresh Ginger Root",
    category: "Herbs & Spices",
    price: 280,
    originalPrice: 350,
    unit: "500g pack",
    rating: 4.9,
    badge: "ORGANIC",
    badgeType: "organic",
    image: "assets/deal_ginger.jpg"
  },
  {
    id: "mon-chicken",
    name: "Tender Chicken Breast Fillets",
    category: "Meat & Poultry",
    price: 690,
    originalPrice: 850,
    unit: "1 kg pack",
    rating: 4.9,
    badge: "FRESH FARM",
    badgeType: "organic",
    image: "assets/deal_chicken.jpg"
  }
];

const BRANDS = [
  { name: "Brookside", color: "#1E3A8A" },
  { name: "BioFoods", color: "#047857" },
  { name: "FarmersChoice", color: "#166534" },
  { name: "FreshFarms", color: "#15803D" },
  { name: "KCC", color: "#DC2626" },
  { name: "Highland", color: "#B91C1C" },
  { name: "Dairyland", color: "#1E293B" }
];

const FAQS = [
  {
    q: "How fast will my groceries be delivered in Nairobi?",
    a: "Orders placed across Nairobi Metro are dispatched immediately in cold-chain bags and delivered within 45 to 90 minutes right to your doorstep."
  },
  {
    q: "Are all your fresh vegetables and fruits 100% organic?",
    a: "Yes! All produce marked with our 'ORGANIC' badge is sourced directly from certified organic farms in Limuru, Naivasha and Mt. Kenya with zero synthetic pesticides."
  },
  {
    q: "What is your Freshness & Quality Guarantee policy?",
    a: "If any item arrives damaged or fails to satisfy your freshness expectations, report it in one click for an immediate free replacement or instant M-Pesa / card refund."
  },
  {
    q: "How do I qualify for Free Delivery?",
    a: "All grocery orders of KSh 2,500 or more automatically receive completely free doorstep delivery across Nairobi."
  }
];

// Explicitly assign to window to guarantee immediate global availability
window.STORE_CONFIG = STORE_CONFIG;
window.CATEGORIES = CATEGORIES;
window.TODAYS_DEALS = TODAYS_DEALS;
window.FRESH_FOOD_CATALOG = FRESH_FOOD_CATALOG;
window.SPOTLIGHT_PRODUCTS = SPOTLIGHT_PRODUCTS;
window.DAILY_BEST_SELLERS = DAILY_BEST_SELLERS;
window.SEAFOOD_DEALS = SEAFOOD_DEALS;
window.MONTHLY_GROCERY_DEAL = MONTHLY_GROCERY_DEAL;
window.BRANDS = BRANDS;
window.FAQS = FAQS;
