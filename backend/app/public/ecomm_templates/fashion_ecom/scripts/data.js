/**
 * LUXINA - High Fashion & Contemporary Streetwear Catalog Data
 * Configured in Kenyan Shillings (KSh / KES)
 */

const STORE_CONFIG = {
  storeName: "LUXINA",
  tagline: "Contemporary Luxury & Ready-To-Wear",
  currency: "KES",
  currencySymbol: "KSh ",
  formatPrice: function(amount) {
    return "KSh " + Math.round(amount).toLocaleString();
  }
};

const CATEGORIES = [
  { id: "caps", name: "CAPS & HATS", image: "assets/cat_cap.jpg", count: "34 items" },
  { id: "shoes", name: "SHOES", image: "assets/cat_shoes.jpg", count: "58 items" },
  { id: "tshirts", name: "TSHIRTS", image: "assets/cat_tshirts.jpg", count: "82 items" },
  { id: "pants", name: "PANTS & SHORTS", image: "assets/cat_shorts.jpg", count: "46 items" }
];

const NEW_ARRIVALS = [
  {
    id: "arr-1",
    name: "Oversized Wool Blazer",
    category: "Outerwear",
    price: 18500,
    originalPrice: 24000,
    image: "assets/prod_blazer.jpg",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Stone Grey", "Midnight Black"],
    description: "Tailored from Italian virgin wool blend with exaggerated structured shoulders and horn button closure."
  },
  {
    id: "arr-2",
    name: "Leather Studio Tote Bag",
    category: "Bags & Leather",
    price: 14500,
    originalPrice: 18000,
    image: "assets/prod_tote.jpg",
    sizes: ["One Size"],
    colors: ["Rich Espresso", "Tan Brown"],
    description: "Supple full-grain calf leather tote with internal zip pocket and gold foil embossed monogram."
  },
  {
    id: "arr-3",
    name: "Heavyweight Boxy Tee",
    category: "T-Shirts",
    price: 4800,
    originalPrice: 6500,
    image: "assets/prod_black_tee.jpg",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Washed Black", "Chalk White"],
    description: "Crafted from 320gsm organic combed cotton with dropped shoulders and a vintage enzyme wash."
  },
  {
    id: "arr-4",
    name: "Acetate Optical Frames",
    category: "Eyewear",
    price: 9500,
    originalPrice: 12000,
    image: "assets/prod_glasses.jpg",
    sizes: ["Universal Fit"],
    colors: ["Havana Tortoise", "Clear Amber"],
    description: "Handcrafted Japanese acetate frames with 100% UV400 protective anti-glare tinted lenses."
  }
];

const WOMEN_SALE = [
  {
    id: "ws-1",
    name: "Crescent Leather Sling Bag",
    category: "Bags",
    price: 9800,
    originalPrice: 13500,
    discount: "25% OFF",
    image: "assets/women_green_bag.jpg",
    sizes: ["One Size"],
    colors: ["Forest Green", "Noir"],
    description: "Curved ergonomic silhouette with adjustable leather strap and discreet magnetic closure."
  },
  {
    id: "ws-2",
    name: "Classic Hardware Leather Belt",
    category: "Accessories",
    price: 4500,
    originalPrice: 6000,
    discount: "25% OFF",
    image: "assets/women_belt.jpg",
    sizes: ["75cm", "85cm", "95cm"],
    colors: ["Matte Black"],
    description: "Top-grain cowhide leather with polished gunmetal geometric buckle."
  },
  {
    id: "ws-3",
    name: "Silk Blend Lounge Shorts",
    category: "Bottoms",
    price: 3800,
    originalPrice: 5500,
    discount: "30% OFF",
    image: "assets/women_shorts.jpg",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Slate Charcoal"],
    description: "Ultra-fluid silk-viscose blend with elasticated waistband and side slit pockets."
  },
  {
    id: "ws-4",
    name: "Studded Strappy Leather Sandals",
    category: "Footwear",
    price: 8900,
    originalPrice: 12000,
    discount: "25% OFF",
    image: "assets/women_sandals.jpg",
    sizes: ["36", "37", "38", "39", "40"],
    colors: ["Black Gloss"],
    description: "Architectural low-block heel with multi-strap caged vamp and silver-tone stud accents."
  }
];

const MEN_SALE = [
  {
    id: "ms-1",
    name: "Quilted Down Puffer Jacket",
    category: "Outerwear",
    price: 16500,
    originalPrice: 22000,
    discount: "25% OFF",
    image: "assets/men_puffer.jpg",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Anthracite", "Olive"],
    description: "Ultra-warm recycled 700-fill power down insulation with water-resistant ripstop shell."
  },
  {
    id: "ms-2",
    name: "Square Acetate Sunglasses",
    category: "Eyewear",
    price: 7500,
    originalPrice: 9800,
    discount: "25% OFF",
    image: "assets/men_sunglasses.jpg",
    sizes: ["Universal Fit"],
    colors: ["Bone Cream", "Smoked Grey"],
    description: "Thick bevelled acetate with geometric angles and warm bronze gradient tint."
  },
  {
    id: "ms-3",
    name: "Vintage Retro Court Sneakers",
    category: "Footwear",
    price: 11500,
    originalPrice: 14500,
    discount: "20% OFF",
    image: "assets/men_sneakers.jpg",
    sizes: ["40", "41", "42", "43", "44", "45"],
    colors: ["White/Cement"],
    description: "Perforated leather vamp with retro padded collar and gum rubber traction sole."
  },
  {
    id: "ms-4",
    name: "Motor Heritage Graphic Tee",
    category: "T-Shirts",
    price: 3900,
    originalPrice: 5200,
    discount: "25% OFF",
    image: "assets/men_tee.jpg",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Mustard Gold", "Vintage Black"],
    description: "Garment-dyed soft jersey with faded archival typography screen-print on chest."
  }
];

const BLOG_POSTS = [
  {
    id: "blog-1",
    title: "NEW ARRIVAL OF SUMMER 2026 TRENDY",
    excerpt: "Discover minimal textures, breathable silks, and oversized silhouettes tailored for the contemporary global urbanite.",
    category: "LOOKBOOK",
    date: "June 24, 2026",
    image: "assets/blog_urban_stairs.jpg",
    linkText: "READ MORE"
  },
  {
    id: "blog-2",
    title: "DAILY SPORT BACKPACK & UTILITY GEAR",
    excerpt: "Engineered for daily urban utility and weekend escapes without compromising sleek architectural form.",
    category: "CAPSULE",
    date: "June 18, 2026",
    image: "assets/blog_backpack.jpg",
    linkText: "READ MORE"
  },
  {
    id: "blog-3",
    title: "NEW ARRIVAL: STREETWEAR COOL LOOKS",
    excerpt: "Elevate youth streetwear aesthetics with refined tailoring, washed denims, and gender-fluid statement pieces.",
    category: "STYLE GUIDE",
    date: "June 12, 2026",
    image: "assets/blog_streetwear.jpg",
    linkText: "READ MORE"
  }
];

window.STORE_CONFIG = STORE_CONFIG;
window.CATEGORIES = CATEGORIES;
window.NEW_ARRIVALS = NEW_ARRIVALS;
window.WOMEN_SALE = WOMEN_SALE;
window.MEN_SALE = MEN_SALE;
window.BLOG_POSTS = BLOG_POSTS;
