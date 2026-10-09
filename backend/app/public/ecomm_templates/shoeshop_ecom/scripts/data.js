/**
 * FootWear - Premium Sneaker Store Data Configuration
 * Exact match to Reference Mockup: FootWear (Indonesia / Global Sneaker Hub)
 */

const STORE_CONFIG = {
  storeName: "FootWear",
  tagline: "Shop Now, Goodlook Later",
  currency: "IDR",
  currencySymbol: "Rp",
  locale: "id-ID",
  formatPrice: function (amount) {
    return "Rp " + amount.toLocaleString("id-ID");
  }
};

// "Today Best Deals !" Section Data
const BEST_DEALS = [
  {
    id: "deal-1",
    name: "Nike Downshifter 12",
    brand: "Nike",
    price: 859000,
    originalPrice: 1100000,
    rating: 4.9,
    soldCount: 150,
    image: "assets/deal_downshifter12.jpg",
    isWishlisted: false,
    tag: "Sale 22%",
    tagType: "deal",
    category: "Running",
    sizes: [39, 40, 41, 42, 43, 44]
  },
  {
    id: "deal-2",
    name: "Compass Retrograde Hi White Green",
    brand: "Compass",
    price: 959000,
    originalPrice: 1250000,
    rating: 4.9,
    soldCount: 185,
    image: "assets/deal_compass_retrograde.jpg",
    isWishlisted: false,
    tag: "Sale 23%",
    tagType: "deal",
    category: "Casual",
    sizes: [39, 40, 41, 42, 43]
  },
  {
    id: "deal-3",
    name: "Stan Smith Primegreen Classic",
    brand: "Adidas",
    price: 1050000,
    originalPrice: 1500000,
    rating: 4.9,
    soldCount: 240,
    image: "assets/deal_stansmith.jpg",
    isWishlisted: true,
    tag: "Sale 30%",
    tagType: "deal",
    category: "Tennis",
    sizes: [38, 39, 40, 41, 42, 43, 44]
  },
  {
    id: "deal-4",
    name: "Vans Old Skool Classic Black",
    brand: "Vans",
    price: 1150000,
    originalPrice: 1450000,
    rating: 4.9,
    soldCount: 310,
    image: "assets/deal_vans_oldskool.jpg",
    isWishlisted: false,
    tag: "Sale 20%",
    tagType: "deal",
    category: "Skate",
    sizes: [39, 40, 41, 42, 43, 44]
  },
  {
    id: "deal-5",
    name: "Ventela Republic Low Navy Blue",
    brand: "Ventela",
    price: 450000,
    originalPrice: 600000,
    rating: 4.8,
    soldCount: 420,
    image: "assets/deal_ventela_low.jpg",
    isWishlisted: false,
    tag: "Sale 25%",
    tagType: "deal",
    category: "Casual",
    sizes: [38, 39, 40, 41, 42]
  }
];

// "Shop Now, Goodlook Later" Main Catalog Products (Matching Mockup 12 Cards)
const CATALOG_PRODUCTS = [
  {
    id: "prod-airmax90",
    name: "Nike Air Max 90",
    brand: "Nike",
    price: 1799000,
    originalPrice: 2099000,
    rating: 4.9,
    soldCount: 120,
    image: "assets/prod_airmax90.jpg",
    tag: "Just in",
    tagType: "just-in",
    isWishlisted: false,
    isSoldOut: false,
    category: "Lifestyle",
    sizes: [39, 40, 41, 42, 43, 44, 45],
    description: "Nothing as fly, nothing as comfortable, nothing as proven. The Nike Air Max 90 stays true to its OG running roots with the iconic Waffle sole, stitched overlays and classic TPU accents."
  },
  {
    id: "prod-airmaxpulse",
    name: "Nike Air Max Pulse",
    brand: "Nike",
    price: 2379000,
    originalPrice: 2599000,
    rating: 4.9,
    soldCount: 150,
    image: "assets/prod_airmaxpulse.jpg",
    tag: "Just in",
    tagType: "just-in",
    isWishlisted: false,
    isSoldOut: false,
    category: "Lifestyle",
    sizes: [40, 41, 42, 43, 44],
    description: "Keeping it 100, the Air Max Pulse pulls inspiration from London's underground music scene to bring a touch of underground swagger to the iconic Air Max line."
  },
  {
    id: "prod-af1",
    name: "Nike Air Force 1 '07",
    brand: "Nike",
    price: 1729000,
    originalPrice: 1999000,
    rating: 4.9,
    soldCount: 105,
    image: "assets/prod_af1_07.jpg",
    tag: null,
    tagType: null,
    isWishlisted: false,
    isSoldOut: false,
    category: "Basketball",
    sizes: [38, 39, 40, 41, 42, 43, 44, 45],
    description: "The radiance lives on with the b-ball OG. Crossing hardwood comfort with off-court flair, it puts a fresh spin on what you know best: 80s construction, bold details and nothing-but-net style."
  },
  {
    id: "prod-airmax97",
    name: "Nike Air Max 97",
    brand: "Nike",
    price: 2849000,
    originalPrice: 3199000,
    rating: 4.9,
    soldCount: 95,
    image: "assets/prod_airmax97.jpg",
    tag: "Just in",
    tagType: "just-in",
    isWishlisted: false,
    isSoldOut: false,
    category: "Running",
    sizes: [40, 41, 42, 43, 44],
    description: "Push your style full speed ahead in the Air Max 97, featuring the original ripple design inspired by Japanese bullet trains and revolutionary full-length Nike Air unit."
  },
  {
    id: "prod-gammaforce",
    name: "Nike Gamma Force",
    brand: "Nike",
    price: 1399000,
    originalPrice: 1599000,
    rating: 4.8,
    soldCount: 210,
    image: "assets/prod_gamma_force.jpg",
    tag: null,
    tagType: null,
    isWishlisted: false,
    isSoldOut: false,
    category: "Court",
    sizes: [38, 39, 40, 41, 42],
    description: "Layer upon layer of dimensional style—that's a force to be reckoned with. Offering both comfort and versatility, these kicks are rooted in heritage basketball culture."
  },
  {
    id: "prod-cortez",
    name: "Nike Cortez",
    brand: "Nike",
    price: 1299000,
    originalPrice: 1499000,
    rating: 4.9,
    soldCount: 310,
    image: "assets/prod_cortez.jpg",
    tag: "Just in",
    tagType: "just-in",
    isWishlisted: true,
    isSoldOut: false,
    category: "Lifestyle",
    sizes: [39, 40, 41, 42, 43, 44],
    description: "One word: tradition. From running pedigree to fashion phenomenon, the retro appeal, sponge-soft midsole and seesaw detailing deliver decade after decade."
  },
  {
    id: "prod-alphafly2",
    name: "Nike Alphafly 2",
    brand: "Nike",
    price: 4019000,
    originalPrice: 4299000,
    rating: 4.9,
    soldCount: 420,
    image: "assets/prod_alphafly2.jpg",
    tag: "Sold out",
    tagType: "sold-out",
    isWishlisted: false,
    isSoldOut: true,
    category: "Running",
    sizes: [41, 42, 43, 44],
    description: "Once you take a few strides in the Nike Air Zoom Alphafly NEXT% 2, you'll never look at your favorite pair of old racing shoes the same way again."
  },
  {
    id: "prod-airmax1prem",
    name: "Nike Air Max 1 Premium",
    brand: "Nike",
    price: 2459000,
    originalPrice: 2699000,
    rating: 4.9,
    soldCount: 135,
    image: "assets/prod_airmax1_premium.jpg",
    tag: null,
    tagType: null,
    isWishlisted: true,
    isSoldOut: false,
    category: "Lifestyle",
    sizes: [39, 40, 41, 42, 43, 44],
    description: "Meet the leader of the pack. Walking on clouds above the noise, the Air Max 1 blends timeless design with cushioned comfort for unmistakable streetwear credibility."
  },
  {
    id: "prod-airmax97se",
    name: "Nike Air Max 97 SE",
    brand: "Nike",
    price: 1459000,
    originalPrice: 1799000,
    rating: 4.8,
    soldCount: 160,
    image: "assets/prod_airmax97_se.jpg",
    tag: null,
    tagType: null,
    isWishlisted: false,
    isSoldOut: false,
    category: "Running",
    sizes: [40, 41, 42, 43, 44],
    description: "Celebrating 25 years of style with modern reflective elements and sleek streamlined contours for an unstoppable stride."
  },
  {
    id: "prod-goflyease",
    name: "Nike Go FlyEase",
    brand: "Nike",
    price: 1909000,
    originalPrice: 2199000,
    rating: 4.9,
    soldCount: 450,
    image: "assets/prod_goflyease.jpg",
    tag: null,
    tagType: null,
    isWishlisted: false,
    isSoldOut: false,
    category: "Lifestyle",
    sizes: [39, 40, 41, 42, 43, 44],
    description: "Ditch the laces and step into smooth comfort with Nike's revolutionary hands-free FlyEase entry technology."
  },
  {
    id: "prod-airmaxap",
    name: "Nike Air Max AP",
    brand: "Nike",
    price: 1429000,
    originalPrice: 1699000,
    rating: 4.9,
    soldCount: 205,
    image: "assets/prod_airmax_ap.jpg",
    tag: null,
    tagType: null,
    isWishlisted: false,
    isSoldOut: false,
    category: "Running",
    sizes: [40, 41, 42, 43, 44, 45],
    description: "With its sleek, sporty design, the Nike Air Max AP lets you bridge past and present in first-class comfort."
  },
  {
    id: "prod-calmmule",
    name: "Nike Calm Mule",
    brand: "Nike",
    price: 1059000,
    originalPrice: 1199000,
    rating: 4.9,
    soldCount: 750,
    image: "assets/prod_calm_mule.jpg",
    tag: "Just in",
    tagType: "just-in",
    isWishlisted: false,
    isSoldOut: false,
    category: "Slides",
    sizes: [38, 39, 40, 41, 42, 43],
    description: "Slip into relaxation with the contoured water-friendly foam slide that cradles your foot for all-day easy recovery."
  }
];

// Featured Hero Spotlight Products
const HERO_FEATURED = {
  main: {
    badge: "NEW ARRIVAL!",
    title: "AIR JORDAN 6 G X EASTSIDE",
    subtitle: "Crafted in celebration of the 1993 classic, this shoe blends vintage golf heritage with modern streetwear swagger for everyday flex and athletic poise.",
    price: 3699000,
    image: "assets/hero_eastside_jordan.jpg",
    brand: "Jordan Brand"
  },
  promo: {
    headline: "DISC UP TO 50% FOR SNEAKERS FEST ID 2023",
    subtext: "Grab it now and get special discount for every sneaker shoes fest ID limited edition drop.",
    image: "assets/hero_sneaker_fest.jpg",
    buttonText: "Event details"
  }
};

// "The Official Store of The Amazing Brand" Data
const BRAND_STORES = [
  {
    id: "brand-nb",
    name: "New Balance",
    verified: true,
    rating: 4.9,
    followers: "230k",
    logoText: "NB",
    logoBg: "#E31837",
    logoSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18h4.5l3-6.5V18H16V6h-4.5L8.5 12.5V6H4v12z"/></svg>`,
    items: [
      { id: "nb-1", name: "New Balance 550", price: 1999000, img: "assets/brand_nb1.jpg" },
      { id: "nb-2", name: "New Balance 574 Navy", price: 1499000, img: "assets/brand_nb2.jpg" },
      { id: "nb-3", name: "New Balance 9060 Clay", price: 2799000, img: "assets/brand_nb3.jpg" },
      { id: "nb-4", name: "New Balance 2002R Grey", price: 2399000, img: "assets/brand_nb4.jpg" }
    ]
  },
  {
    id: "brand-compass",
    name: "Compass",
    verified: true,
    rating: 4.9,
    followers: "250k",
    logoText: "Compass",
    logoBg: "#7B1113",
    logoSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none"/><polygon points="12 4 15 12 12 10 9 12" fill="white"/><polygon points="12 20 9 12 12 14 15 12" fill="white" opacity="0.6"/></svg>`,
    items: [
      { id: "cp-1", name: "Compass Retrograde Low Black", price: 859000, img: "assets/deal_compass_retrograde.jpg" },
      { id: "cp-2", name: "Compass Proto Lite Blue", price: 928000, img: "assets/deal_ventela_low.jpg" },
      { id: "cp-3", name: "Compass Slip On Sand", price: 799000, img: "assets/prod_cortez.jpg" },
      { id: "cp-4", name: "Compass Velocity Grey", price: 1199000, img: "assets/prod_airmaxpulse.jpg" }
    ]
  },
  {
    id: "brand-nike",
    name: "Nike",
    verified: true,
    rating: 4.9,
    followers: "1.2M",
    logoText: "Nike",
    logoBg: "#111111",
    logoSvg: `<svg width="26" height="14" viewBox="0 0 24 10" fill="currentColor"><path d="M21.7 0.2C15.8 4 9.5 8 5.4 8C2.5 8 0.5 6.5 0.5 4.5C0.5 3 1.5 1.7 3.3 0.9C2.7 2.1 3.4 3.5 5.5 3.5C8.8 3.5 15.2 0.7 21.7 0.2Z"/></svg>`,
    items: [
      { id: "nk-1", name: "Nike Air Force 1 Royal", price: 1729000, img: "assets/prod_af1_07.jpg" },
      { id: "nk-2", name: "Nike Dunk Low Sail Tan", price: 1899000, img: "assets/hero_sneaker_fest.jpg" },
      { id: "nk-3", name: "Nike Air Max 90 OG", price: 1799000, img: "assets/prod_airmax90.jpg" },
      { id: "nk-4", name: "Nike Air Max 97 Gold", price: 2849000, img: "assets/prod_airmax97.jpg" }
    ]
  }
];

window.STORE_CONFIG = STORE_CONFIG;
window.BEST_DEALS = BEST_DEALS;
window.CATALOG_PRODUCTS = CATALOG_PRODUCTS;
window.HERO_FEATURED = HERO_FEATURED;
window.BRAND_STORES = BRAND_STORES;
