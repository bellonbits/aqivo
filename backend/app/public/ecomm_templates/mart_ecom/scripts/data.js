/**
 * Freshly Mart - Complete Central Data Store
 * Currency: Kenyan Shilling (KSh)
 * STRICT RULE: ZERO EMOJIS!
 */

window.MartData = {
  store: {
    name: "Freshly",
    tagline: "A different kind of grocery store",
    hotline: "+254 700 345-0667",
    email: "info@freshly.com",
    freeDeliveryThreshold: 3000
  },

  // Categories Rail (6 items)
  categories: [
    { id: "cat-veg", name: "Vegetables", itemsCount: "12 Items", image: "assets/cat_veg.jpg", color: "#E8F5E9" },
    { id: "cat-fruits", name: "Fresh Fruits", itemsCount: "8 Items", image: "assets/cat_fruits.jpg", color: "#FFF3E0" },
    { id: "cat-desserts", name: "Desserts", itemsCount: "5 Items", image: "assets/cat_bakery.jpg", color: "#FFF8E1" },
    { id: "cat-drinks", name: "Milk & Juice", itemsCount: "6 Items", image: "assets/cat_drinks.jpg", color: "#E3F2FD" },
    { id: "cat-meat", name: "Fish & Meats", itemsCount: "4 Items", image: "assets/cat_meat.jpg", color: "#FCE4EC" },
    { id: "cat-seafood", name: "Fresh Seafood", itemsCount: "3 Items", image: "assets/deal_tomatoes.jpg", color: "#FFEBEE" }
  ],

  // Hero Product (Aptamil Gold+ ProNutra Biotik Stage 1)
  heroProduct: {
    id: "prod-aptamil-1",
    title: "Aptamil Gold+ ProNutra Biotik Stage 1",
    availability: 35,
    rating: 5,
    reviewsCount: 1,
    sku: "107",
    category: "Baby Care",
    stockUrgency: 33,
    shortDesc: "Vivamus sollicitudin tellus dolor dignissim semper. Nulla facilisi integer interdum tincidunt. Suspendisse ultrices lacus eget nunc facilisis tristique pellentesque habitant morbi.",
    longDesc: "Aptamil Gold+ ProNutra Biotik Stage 1 is an advanced infant formula crafted for newborns from birth up to 6 months. Specially developed with prebiotics scGOS/lcFOS, omega-3 DHA, and essential micronutrients to promote natural digestion, cognitive visual acuity, and immune system resilience.",
    selectedSize: "400gm",
    options: [
      { size: "400gm", price: 1299, originalPrice: 1690, formattedPrice: "KSh 1,299", formattedOriginal: "KSh 1,690" },
      { size: "800gm", price: 2399, originalPrice: 2950, formattedPrice: "KSh 2,399", formattedOriginal: "KSh 2,950" }
    ],
    images: [
      "assets/aptamil_main.jpg",
      "assets/aptamil_thumb1.jpg",
      "assets/aptamil_thumb2.jpg",
      "assets/aptamil_thumb3.jpg"
    ],
    specs: {
      weight: "900 gm",
      dimensions: "45 x 20 x 30 cm",
      brand: "Aptamil Gold+",
      origin: "New Zealand",
      packaging: "Airtight Resealable Tin",
      storage: "Store in a cool dry place below 25C"
    },
    reviews: [
      {
        id: "rev-101",
        author: "Sarah Jenkins",
        date: "January 14, 2026",
        rating: 5,
        title: "Gentle on sensitive tummies",
        comment: "My pediatrician recommended Aptamil Gold+ and my 3-month-old has zero colic or reflux since switching. Excellent formulation and dissolves easily without clumping."
      }
    ]
  },

  // Featured Products (5 items row)
  featuredProducts: [
    {
      id: "feat-1",
      category: "Vegetables",
      title: "Organic Russet Baking Potatoes Basket",
      image: "assets/prod_potatoes.jpg",
      price: 300,
      originalPrice: 360,
      formattedPrice: "KSh 300 - KSh 550",
      discount: "-15%",
      sizes: ["1kg", "2kg"],
      options: [
        { size: "1kg", price: 300, originalPrice: 360, formattedPrice: "KSh 300" },
        { size: "2kg", price: 550, originalPrice: 660, formattedPrice: "KSh 550" }
      ],
      rating: 5,
      reviews: 24,
      sku: "POT-884",
      shortDesc: "Farm fresh, firm russet baking potatoes grown organically in volcanic fertile soils. Ideal for creamy mashed potatoes, crisp roasted wedges, or hearty stews.",
      specs: { weight: "1kg - 2kg", brand: "Fresh Farm Kenya", origin: "Kinangop Plateau", shelfLife: "3 Weeks" }
    },
    {
      id: "feat-2",
      category: "Baby Care",
      title: "Aptamil Gold+ ProNutra Biotik Stage 1",
      image: "assets/aptamil_main.jpg",
      price: 1299,
      originalPrice: 1690,
      formattedPrice: "KSh 1,299 - KSh 2,500",
      discount: "-15%",
      sizes: ["400gm", "800gm"],
      options: [
        { size: "400gm", price: 1299, originalPrice: 1690, formattedPrice: "KSh 1,299" },
        { size: "800gm", price: 2399, originalPrice: 2950, formattedPrice: "KSh 2,399" }
      ],
      rating: 5,
      reviews: 28,
      sku: "APT-107",
      shortDesc: "Nutritionally complete infant formula enriched with scGOS/lcFOS prebiotics and Omega-3 DHA for newborn digestion and development.",
      specs: { weight: "400gm - 800gm", brand: "Aptamil", origin: "New Zealand", shelfLife: "24 Months" }
    },
    {
      id: "feat-3",
      category: "Vegetables",
      title: "Whole Fresh Organic Garden Green Peas",
      image: "assets/green_peas.jpg",
      price: 240,
      originalPrice: 290,
      formattedPrice: "KSh 240 - KSh 450",
      discount: "-12%",
      sizes: ["250gm", "500gm"],
      options: [
        { size: "250gm", price: 240, originalPrice: 290, formattedPrice: "KSh 240" },
        { size: "500gm", price: 450, originalPrice: 540, formattedPrice: "KSh 450" }
      ],
      rating: 5,
      reviews: 19,
      sku: "PEA-302",
      shortDesc: "Tender, sweet garden snap peas picked daily from certified organic farms. Packed with plant protein, vitamins C & K, and dietary fiber.",
      specs: { weight: "250gm - 500gm", brand: "Green Fields", origin: "Naivasha Valley", shelfLife: "7 Days Refrigerated" }
    },
    {
      id: "feat-4",
      category: "Vegetables",
      title: "Farm Fresh Crisp Romaine Salad Lettuce",
      image: "assets/deal_lettuce.jpg",
      price: 180,
      originalPrice: 220,
      formattedPrice: "KSh 180",
      formattedOriginal: "KSh 220",
      discount: "-18%",
      sizes: ["1 Piece", "3 Pack"],
      options: [
        { size: "1 Piece", price: 180, originalPrice: 220, formattedPrice: "KSh 180" },
        { size: "3 Pack", price: 480, originalPrice: 600, formattedPrice: "KSh 480" }
      ],
      rating: 5,
      reviews: 31,
      sku: "LET-112",
      shortDesc: "Hydroponically cultivated crisp romaine lettuce with dense emerald leaves and sweet ribs. Thoroughly washed and ready for Caesar salads.",
      specs: { weight: "Approx 350gm each", brand: "HydroFresh", origin: "Limuru", shelfLife: "8 Days Refrigerated" }
    },
    {
      id: "feat-5",
      category: "Snacks",
      title: "Heirloom Roasted Corn Chips Snack Pack",
      image: "assets/snack_chips.jpg",
      price: 390,
      originalPrice: 450,
      formattedPrice: "KSh 390",
      formattedOriginal: "KSh 450",
      discount: "-15%",
      sizes: ["150gm", "300gm"],
      options: [
        { size: "150gm", price: 390, originalPrice: 450, formattedPrice: "KSh 390" },
        { size: "300gm", price: 720, originalPrice: 850, formattedPrice: "KSh 720" }
      ],
      rating: 5,
      reviews: 33,
      sku: "SNK-552",
      shortDesc: "Stone-ground organic yellow corn tortilla chips roasted in avocado oil and lightly dusted with sea salt. Gluten-free and non-GMO.",
      specs: { weight: "150gm - 300gm", brand: "Heirloom Snacks", origin: "Artisanal Milling", shelfLife: "9 Months" }
    }
  ],

  // Top Seller Vendors
  topVendors: [
    { id: "v-1", name: "Green Farm", rating: 5, image: "assets/vendor_1.jpg", productsCount: "128 Items" },
    { id: "v-2", name: "Organic Food", rating: 5, image: "assets/vendor_2.jpg", productsCount: "94 Items" },
    { id: "v-3", name: "Bakery Kitchen", rating: 5, image: "assets/vendor_3.jpg", productsCount: "62 Items" },
    { id: "v-4", name: "Meat & Seafood Hub", rating: 5, image: "assets/vendor_4.jpg", productsCount: "85 Items" }
  ],

  // Best Sellers Section
  bestSellers: {
    leftItems: [
      {
        id: "bs-1",
        title: "Roasted Salted Mixed Nuts Deluxe Pack",
        category: "Snacks",
        image: "assets/mixed_nuts.jpg",
        price: 260,
        formattedPrice: "KSh 260",
        originalPrice: 285,
        discount: "-8%",
        sizes: ["200gm", "400gm"],
        options: [
          { size: "200gm", price: 260, formattedPrice: "KSh 260" },
          { size: "400gm", price: 490, formattedPrice: "KSh 490" }
        ],
        rating: 5,
        soldPercent: 65,
        sku: "NUT-201",
        shortDesc: "Premium roasted cashew nuts, almonds, walnuts, and macadamia kernels seasoned with Himalayan pink crystal salt.",
        specs: { weight: "200gm", brand: "NutriDelight", origin: "Coastal Kenya", shelfLife: "12 Months" }
      },
      {
        id: "bs-2",
        title: "Garden Sweet Snap Peas Pods",
        category: "Vegetables",
        image: "assets/green_peas.jpg",
        price: 245,
        formattedPrice: "KSh 245",
        originalPrice: 280,
        discount: "-12%",
        sizes: ["250gm", "500gm"],
        options: [
          { size: "250gm", price: 245, formattedPrice: "KSh 245" },
          { size: "500gm", price: 460, formattedPrice: "KSh 460" }
        ],
        rating: 5,
        soldPercent: 82,
        sku: "PEA-108",
        shortDesc: "Crisp, stringless organic garden peas delicious for quick stir-fry or steaming.",
        specs: { weight: "250gm", brand: "Green Fields", origin: "Naivasha", shelfLife: "7 Days" }
      },
      {
        id: "bs-3",
        title: "Artisanal Crispy Thin Crust Pizza",
        category: "Bakery & Frozen",
        image: "assets/frozen_pizza.jpg",
        price: 499,
        formattedPrice: "KSh 499",
        originalPrice: 590,
        discount: "-15%",
        sizes: ["Regular", "Large"],
        options: [
          { size: "Regular", price: 499, formattedPrice: "KSh 499" },
          { size: "Large", price: 890, formattedPrice: "KSh 890" }
        ],
        rating: 5,
        soldPercent: 44,
        sku: "PIZ-401",
        shortDesc: "Wood-fired stone oven baked crust with San Marzano tomato puree, buffalo mozzarella, and aromatic basil leaves.",
        specs: { weight: "450gm", brand: "Milano Bakehouse", origin: "Nairobi Artisanal", shelfLife: "6 Months Frozen" }
      }
    ],
    centerFeature: {
      id: "bs-feat-aptamil",
      title: "Aptamil Gold+ ProNutra Biotik Stage 1 Infant Formula 900g",
      category: "Baby Care",
      image: "assets/aptamil_main.jpg",
      price: 1299,
      formattedPrice: "KSh 1,299",
      originalPrice: 1690,
      formattedOriginal: "KSh 1,690",
      sizes: ["400gm", "900gm"],
      options: [
        { size: "400gm", price: 1299, formattedPrice: "KSh 1,299" },
        { size: "900gm", price: 2650, formattedPrice: "KSh 2,650" }
      ],
      rating: 5,
      reviewsCount: 1,
      availableCount: 35,
      soldCount: 65,
      sku: "APT-900",
      shortDesc: "Flagship infant formula offering comprehensive prebiotic and cognitive nutrients for infants aged 0 to 6 months.",
      specs: { weight: "900gm", brand: "Aptamil Gold+", origin: "New Zealand", shelfLife: "24 Months" }
    },
    rightItems: [
      {
        id: "bs-4",
        title: "Fresh Farm Sweet Red Papaya Fruit",
        category: "Fresh Fruits",
        image: "assets/fresh_papaya.jpg",
        price: 300,
        formattedPrice: "KSh 300",
        originalPrice: 335,
        discount: "-10%",
        sizes: ["1 Piece (1.2kg)", "2 Pieces"],
        options: [
          { size: "1 Piece", price: 300, formattedPrice: "KSh 300" },
          { size: "2 Pieces", price: 580, formattedPrice: "KSh 580" }
        ],
        rating: 5,
        soldPercent: 70,
        sku: "PAP-102",
        shortDesc: "Tree-ripened tropical red papaya with succulent, honey-sweet flesh rich in papain enzymes and Vitamin A.",
        specs: { weight: "1.2kg average", brand: "Coastal Orchards", origin: "Kilifi", shelfLife: "5 Days" }
      },
      {
        id: "bs-5",
        title: "Cold Pressed 100% Pure Orange Juice Bottle",
        category: "Beverages",
        image: "assets/orange_juice.jpg",
        price: 245,
        formattedPrice: "KSh 245",
        originalPrice: 280,
        discount: "-13%",
        sizes: ["500ml", "1 Liter"],
        options: [
          { size: "500ml", price: 245, formattedPrice: "KSh 245" },
          { size: "1 Liter", price: 450, formattedPrice: "KSh 450" }
        ],
        rating: 5,
        soldPercent: 90,
        sku: "JUC-505",
        shortDesc: "Never-from-concentrate unpasteurized valencia orange juice bursting with natural Vitamin C and sunshine flavor.",
        specs: { volume: "500ml - 1L", brand: "SunSqueeze", origin: "Machakos", shelfLife: "6 Days Refrigerated" }
      },
      {
        id: "bs-6",
        title: "Organic Russet Baking Potatoes Basket",
        category: "Vegetables",
        image: "assets/prod_potatoes.jpg",
        price: 499,
        formattedPrice: "KSh 499",
        originalPrice: 590,
        discount: "-15%",
        sizes: ["2kg Basket"],
        options: [
          { size: "2kg Basket", price: 499, formattedPrice: "KSh 499" }
        ],
        rating: 5,
        soldPercent: 55,
        sku: "POT-200",
        shortDesc: "Generous woven basket of high-starch organic russet potatoes for the whole family.",
        specs: { weight: "2kg", brand: "Fresh Farm Kenya", origin: "Kinangop", shelfLife: "1 Month" }
      }
    ]
  },

  // Trending Products (10 items total)
  trendingProducts: [
    {
      id: "trend-1",
      category: "Vegetables",
      title: "Fresh Farm Sweet Watermelon Slices",
      image: "assets/prod_watermelon.jpg",
      price: 1300,
      originalPrice: 1550,
      formattedPrice: "KSh 1,300 - KSh 2,000",
      discount: "-15%",
      sizes: ["500gm", "1kg"],
      options: [
        { size: "500gm", price: 1300, formattedPrice: "KSh 1,300" },
        { size: "1kg", price: 2000, formattedPrice: "KSh 2,000" }
      ],
      rating: 5,
      reviews: 12,
      sku: "MEL-001",
      shortDesc: "Juicy, ruby-red seedless watermelon freshly sliced and packed in chilled safety trays for immediate refreshment.",
      specs: { weight: "500gm - 1kg", brand: "SunFarm", origin: "Garissa / Tana River", shelfLife: "3 Days Refrigerated" }
    },
    {
      id: "trend-2",
      category: "Baby Care",
      title: "Aptamil Gold+ ProNutra Biotik Stage 1 Infant Formula",
      image: "assets/aptamil_main.jpg",
      price: 1299,
      originalPrice: 1690,
      formattedPrice: "KSh 1,299 - KSh 2,500",
      discount: "-15%",
      sizes: ["400gm", "800gm"],
      options: [
        { size: "400gm", price: 1299, formattedPrice: "KSh 1,299" },
        { size: "800gm", price: 2399, formattedPrice: "KSh 2,399" }
      ],
      rating: 5,
      reviews: 28,
      sku: "APT-107",
      shortDesc: "Premium imported infant formula designed for gentle newborn digestive tolerance and immune balance.",
      specs: { weight: "400gm - 800gm", brand: "Aptamil", origin: "New Zealand", shelfLife: "24 Months" }
    },
    {
      id: "trend-3",
      category: "Vegetables",
      title: "Whole Fresh Organic Garden Green Peas",
      image: "assets/green_peas.jpg",
      price: 240,
      originalPrice: 290,
      formattedPrice: "KSh 240 - KSh 450",
      discount: "-12%",
      sizes: ["250gm", "500gm"],
      options: [
        { size: "250gm", price: 240, formattedPrice: "KSh 240" },
        { size: "500gm", price: 450, formattedPrice: "KSh 450" }
      ],
      rating: 5,
      reviews: 19,
      sku: "PEA-302",
      shortDesc: "Handpicked tender sweet garden peas ready for wholesome soups, salads, and curries.",
      specs: { weight: "250gm - 500gm", brand: "Green Fields", origin: "Naivasha", shelfLife: "7 Days" }
    },
    {
      id: "trend-4",
      category: "Beverages",
      title: "Cold Pressed 100% Pure Orange Juice Bottle",
      image: "assets/orange_juice.jpg",
      price: 450,
      originalPrice: 520,
      formattedPrice: "KSh 450",
      formattedOriginal: "KSh 520",
      discount: "-13%",
      sizes: ["1 Liter"],
      options: [
        { size: "1 Liter", price: 450, formattedPrice: "KSh 450" }
      ],
      rating: 5,
      reviews: 45,
      sku: "JUC-101",
      shortDesc: "100% whole valencia oranges freshly squeezed each morning without added sugar, water, or preservatives.",
      specs: { volume: "1 Liter", brand: "SunSqueeze", origin: "Machakos", shelfLife: "6 Days Refrigerated" }
    },
    {
      id: "trend-5",
      category: "Snacks",
      title: "Heirloom Roasted Corn Chips Snack Pack",
      image: "assets/snack_chips.jpg",
      price: 390,
      originalPrice: 450,
      formattedPrice: "KSh 390",
      formattedOriginal: "KSh 450",
      discount: "-15%",
      sizes: ["150gm"],
      options: [
        { size: "150gm", price: 390, formattedPrice: "KSh 390" }
      ],
      rating: 5,
      reviews: 33,
      sku: "SNK-552",
      shortDesc: "Crisp and crunchy stone-ground roasted yellow corn chips crafted with Himalayan mineral salt.",
      specs: { weight: "150gm", brand: "Heirloom Snacks", origin: "Kenya", shelfLife: "9 Months" }
    },
    {
      id: "trend-6",
      category: "Snacks",
      title: "Classic Salted Potato Crisps Party Pack",
      image: "assets/lays_chips.jpg",
      price: 320,
      originalPrice: 380,
      formattedPrice: "KSh 320 - KSh 480",
      discount: "-10%",
      sizes: ["200gm", "350gm"],
      options: [
        { size: "200gm", price: 320, formattedPrice: "KSh 320" },
        { size: "350gm", price: 480, formattedPrice: "KSh 480" }
      ],
      rating: 5,
      reviews: 62,
      sku: "CHP-200",
      shortDesc: "Golden sliced farm potatoes fried to crunchy perfection and lightly seasoned.",
      specs: { weight: "200gm - 350gm", brand: "Classic Crisps", origin: "Nairobi", shelfLife: "6 Months" }
    },
    {
      id: "trend-7",
      category: "Fresh Produce",
      title: "Organic Russet Baking Potatoes Basket",
      image: "assets/prod_potatoes.jpg",
      price: 300,
      originalPrice: 360,
      formattedPrice: "KSh 300 - KSh 550",
      discount: "-15%",
      sizes: ["1kg", "2kg"],
      options: [
        { size: "1kg", price: 300, formattedPrice: "KSh 300" },
        { size: "2kg", price: 550, formattedPrice: "KSh 550" }
      ],
      rating: 5,
      reviews: 24,
      sku: "POT-884",
      shortDesc: "Fluffy and versatile baking potatoes ideal for oven roasting, frying, or boiling.",
      specs: { weight: "1kg - 2kg", brand: "Fresh Farm", origin: "Kinangop", shelfLife: "1 Month" }
    },
    {
      id: "trend-8",
      category: "Bakery & Grains",
      title: "Artisanal Rolled Oat Crunchy Granola Cereal",
      image: "assets/granola_box.jpg",
      price: 780,
      originalPrice: 870,
      formattedPrice: "KSh 780 - KSh 920",
      discount: "-10%",
      sizes: ["500gm", "1kg"],
      options: [
        { size: "500gm", price: 780, formattedPrice: "KSh 780" },
        { size: "1kg", price: 920, formattedPrice: "KSh 920" }
      ],
      rating: 5,
      reviews: 18,
      sku: "GRA-450",
      shortDesc: "Toasted jumbo whole grain oats baked with acacia honey, pumpkin seeds, toasted coconut, and chia.",
      specs: { weight: "500gm - 1kg", brand: "Artisanal Grains", origin: "Njoro Mills", shelfLife: "12 Months" }
    },
    {
      id: "trend-9",
      category: "Vegetables",
      title: "Farm Fresh Crisp Romaine Salad Lettuce",
      image: "assets/deal_lettuce.jpg",
      price: 180,
      originalPrice: 220,
      formattedPrice: "KSh 180",
      formattedOriginal: "KSh 220",
      discount: "-18%",
      sizes: ["1 Piece"],
      options: [
        { size: "1 Piece", price: 180, formattedPrice: "KSh 180" }
      ],
      rating: 5,
      reviews: 31,
      sku: "LET-112",
      shortDesc: "Crispy hydroponic lettuce heads packed with moisture and crisp crunch.",
      specs: { weight: "350gm approx", brand: "HydroFresh", origin: "Limuru", shelfLife: "8 Days" }
    },
    {
      id: "trend-10",
      category: "Beverages",
      title: "Natural Blue Berry Fruit Infusion Pack",
      image: "assets/blueberry_drink.jpg",
      price: 280,
      originalPrice: 340,
      formattedPrice: "KSh 280",
      formattedOriginal: "KSh 340",
      discount: "-17%",
      sizes: ["500ml", "1 Liter"],
      options: [
        { size: "500ml", price: 280, formattedPrice: "KSh 280" },
        { size: "1 Liter", price: 520, formattedPrice: "KSh 520" }
      ],
      rating: 5,
      reviews: 27,
      sku: "BER-330",
      shortDesc: "Antioxidant-rich wild forest blueberry cold brew infusion with a splash of fresh lemon juice.",
      specs: { volume: "500ml - 1L", brand: "WildBerry Pure", origin: "Kenya Highlands", shelfLife: "10 Days" }
    }
  ]
};
