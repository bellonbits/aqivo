/* ============================================================
   Aqivo data source
   ------------------------------------------------------------
   Aqivo is a multi-tenant commerce platform: every business has
   its OWN storefront. There is no marketplace and no directory
   of shops shown to customers.

   Each entry in `stores` is a self-contained tenant:
     business  — public identity (name, logo, cover, contact…)
     settings  — delivery / pickup / payments / hours
     categories— the shop's own catalogue categories
     products  — the shop's own products

   In production this is returned by the backend for a given
   storefront slug (e.g. aqivo.shop/twosidesboutique). The
   storefront only talks to AqivoAPI.
   ============================================================ */

window.AQIVO_DB = (function () {
  'use strict';

  var stores = [
    /* ==========================================================
       Two Sides Boutique — fashion & accessories
       ========================================================== */
    {
      slug: 'twosidesboutique',
      business: {
        name: 'Two Sides Boutique',
        tagline: 'Contemporary Kenyan fashion, made to last',
        description: 'Two Sides Boutique is a Nairobi atelier crafting contemporary ready-to-wear from locally sourced cotton, linen and leather. Every piece is cut and finished in our Kilimani workshop.',
        type: 'fashion',
        logo: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=300&q=70',
        cover: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1400&q=70',
        verified: true,
        rating: 4.8,
        reviewCount: 214,
        open: true,
        phone: '+254712 000 111',
        whatsapp: '+254712000111',
        email: 'hello@twosidesboutique.co.ke',
        address: '12 Riverside Drive, Kilimani, Nairobi',
        city: 'Nairobi'
      },
      settings: {
        currency: 'KES',
        delivery: { available: true, fee: 200, freeOver: 5000, time: '45–60 min', note: 'Same-day across Nairobi' },
        pickup: { available: true, note: 'Ready in 30 min · 12 Riverside Drive' },
        minOrder: 0,
        payments: ['mpesa', 'cod'],
        whatsappOrdering: true,
        hours: 'Mon–Sat · 9:00 – 18:00'
      },
      categories: [
        { id: 'new', name: 'New In', icon: 'sparkle' },
        { id: 'dresses', name: 'Dresses', icon: 'shirt' },
        { id: 'tops', name: 'Tops & Shirts', icon: 'shirt' },
        { id: 'bottoms', name: 'Bottoms', icon: 'shirt' },
        { id: 'bags', name: 'Bags', icon: 'bag' },
        { id: 'accessories', name: 'Accessories', icon: 'sparkle' }
      ],
      products: [
        {
          id: 'tws-wrap-dress', category: 'dresses', name: 'Kikoi Wrap Dress', price: 5800, compare_at_price: 7200, available: true, badge: 'Popular',
          description: 'A modern wrap dress in soft kikoi-inspired cotton, finished with a self-tie waist and deep pockets.',
          images: [
            'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=70',
            'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=70'
          ],
          variants: [
            { name: 'Size', type: 'size', options: [
              { label: 'XS', available: true }, { label: 'S', available: true }, { label: 'M', available: true }, { label: 'L', available: true }
            ] }
          ],
          specs: [ { label: 'Material', value: 'Cotton blend' }, { label: 'Care', value: 'Machine wash cold' }, { label: 'Origin', value: 'Made in Kenya' } ]
        },
        {
          id: 'tws-linen-shirt', category: 'tops', name: 'Handwoven Linen Shirt', price: 4200, available: true,
          description: 'Relaxed-fit shirt cut from breathable Kenyan-grown linen, with pearl buttons and a soft, garment-washed finish.',
          images: [
            'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=70',
            'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=70'
          ],
          variants: [
            { name: 'Size', type: 'size', options: [
              { label: 'S', available: true }, { label: 'M', available: true }, { label: 'L', available: true }, { label: 'XL', available: false }
            ] },
            { name: 'Colour', type: 'color', options: [
              { label: 'Sand', value: '#d9c7a3', available: true }, { label: 'Slate', value: '#6b7280', available: true }, { label: 'Olive', value: '#6b7c4e', available: true }
            ] }
          ],
          specs: [ { label: 'Material', value: '100% linen' }, { label: 'Fit', value: 'Relaxed' } ]
        },
        {
          id: 'tws-silk-slip', category: 'new', name: 'Bias-Cut Silk Slip Dress', price: 6400, compare_at_price: 8400, available: true,
          description: 'A bias-cut slip in fluid silk-blend satin. Bias construction gives it a flattering, effortless drape.',
          images: [
            'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=900&q=70'
          ],
          variants: [
            { name: 'Size', type: 'size', options: [
              { label: 'XS', available: true }, { label: 'S', available: true }, { label: 'M', available: false }, { label: 'L', available: true }
            ] },
            { name: 'Colour', type: 'color', options: [
              { label: 'Champagne', value: '#e6d3ad', available: true }, { label: 'Ink', value: '#1f2933', available: true }
            ] }
          ],
          specs: [ { label: 'Material', value: 'Silk-blend satin' }, { label: 'Length', value: 'Midi' } ]
        },
        {
          id: 'tws-styling', category: 'new', type: 'service', name: 'Personal Styling Session', price: 1500, available: true,
          description: 'A one-on-one styling session in our Kilimani studio — we build a capsule around your wardrobe, lifestyle and budget.',
          images: [ 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=900&q=70' ],
          duration: '60 min',
          provider: 'Our senior stylist',
          location: 'at_shop',
          includes: [ 'Wardrobe & colour analysis', 'Personal capsule plan (3\u20135 outfits)', 'Style notes you keep' ],
          addons: [
            { id: 'photos', label: 'Wardrobe photo book', price: 300 },
            { id: 'followup', label: '30-min follow-up call', price: 500 }
          ],
          details: [ { label: 'Duration', value: '60 min' }, { label: 'Location', value: 'Kilimani studio' }, { label: 'Group size', value: '1 person' } ]
        },
        {
          id: 'tws-ankara-bomber', category: 'new', name: 'Ankara Print Bomber Jacket', price: 6900, available: true,
          description: 'Statement bomber with bold Ankara panel detailing, ribbed cuffs and a satin lining.',
          images: [
            'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=70'
          ],
          variants: [
            { name: 'Size', type: 'size', options: [
              { label: 'M', available: true }, { label: 'L', available: true }, { label: 'XL', available: true }
            ] }
          ],
          specs: [ { label: 'Material', value: 'Cotton + satin lining' } ]
        },
        {
          id: 'tws-ribbed-top', category: 'tops', name: 'Ribbed Fitted Crop Top', price: 2200, available: true,
          description: 'Stretch-rib crop top with a clean neckline. Layer it or wear it solo.',
          images: [ 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=900&q=70' ],
          variants: [
            { name: 'Size', type: 'size', options: [
              { label: 'XS', available: true }, { label: 'S', available: true }, { label: 'M', available: true }, { label: 'L', available: true }
            ] },
            { name: 'Colour', type: 'color', options: [
              { label: 'Black', value: '#111827', available: true }, { label: 'Cream', value: '#efe6d6', available: true }, { label: 'Sage', value: '#9caf88', available: true }
            ] }
          ],
          specs: [ { label: 'Material', value: 'Cotton rib' } ]
        },
        {
          id: 'tws-trench', category: 'tops', name: 'Classic Belted Trench Coat', price: 9800, available: false,
          description: 'A timeless double-breasted trench with a removable belt and water-resistant finish.',
          images: [ 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=70' ],
          variants: [
            { name: 'Size', type: 'size', options: [
              { label: 'S', available: false }, { label: 'M', available: false }, { label: 'L', available: false }
            ] }
          ],
          specs: [ { label: 'Material', value: 'Cotton twill' } ]
        },
        {
          id: 'tws-denim', category: 'bottoms', name: 'High-Waist Straight Denim', price: 3900, available: true,
          description: 'Rigid high-waist denim with a straight leg and a clean, vintage-inspired finish.',
          images: [ 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=70' ],
          variants: [
            { name: 'Size', type: 'size', options: [
              { label: '26', available: true }, { label: '28', available: true }, { label: '30', available: true }, { label: '32', available: false }
            ] },
            { name: 'Wash', type: 'color', options: [
              { label: 'Mid blue', value: '#5b7da3', available: true }, { label: 'Ecru', value: '#e7e0d3', available: true }
            ] }
          ],
          specs: [ { label: 'Material', value: '100% cotton denim' }, { label: 'Rise', value: 'High' } ]
        },
        {
          id: 'tws-wide-trouser', category: 'bottoms', name: 'Wide-Leg Tailored Trousers', price: 4500, available: true,
          description: 'Fluid wide-leg trousers with a pressed crease and an elasticated back waist for comfort.',
          images: [ 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=70' ],
          variants: [
            { name: 'Size', type: 'size', options: [
              { label: 'S', available: true }, { label: 'M', available: true }, { label: 'L', available: true }
            ] }
          ],
          specs: [ { label: 'Material', value: 'Poly-viscose' } ]
        },
        {
          id: 'tws-pleated-skirt', category: 'bottoms', name: 'Pleated Midi Skirt', price: 4100, available: true,
          description: 'Fine pleats with a smooth waistband — an easy, elegant everyday midi.',
          images: [ 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=900&q=70' ],
          variants: [
            { name: 'Size', type: 'size', options: [
              { label: 'XS', available: true }, { label: 'S', available: true }, { label: 'M', available: true }, { label: 'L', available: true }
            ] },
            { name: 'Colour', type: 'color', options: [
              { label: 'Camel', value: '#c19a6b', available: true }, { label: 'Charcoal', value: '#3f4650', available: true }
            ] }
          ],
          specs: [ { label: 'Material', value: 'Recycled polyester' }, { label: 'Length', value: 'Midi' } ]
        },
        {
          id: 'tws-leather-tote', category: 'bags', name: 'Leather Everyday Tote', price: 6800, available: true,
          description: 'Spacious full-grain leather tote with an interior zip pocket and magnetic closure. Fits a 14" laptop.',
          images: [
            'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=70',
            'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=900&q=70'
          ],
          variants: [
            { name: 'Colour', type: 'color', options: [
              { label: 'Tan', value: '#b5763b', available: true }, { label: 'Black', value: '#1a1a1a', available: true }, { label: 'Cream', value: '#ead9bf', available: false }
            ] }
          ],
          specs: [ { label: 'Material', value: 'Full-grain leather' }, { label: 'Dimensions', value: '38 × 30 × 12 cm' } ]
        },
        {
          id: 'tws-raffia-bag', category: 'bags', name: 'Woven Raffia Basket Bag', price: 3400, available: true,
          description: 'Handwoven raffia basket bag with leather handles — a warm-weather staple.',
          images: [ 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=900&q=70' ],
          variants: [
            { name: 'Colour', type: 'color', options: [
              { label: 'Natural', value: '#d8c39a', available: true }, { label: 'Black', value: '#1a1a1a', available: true }
            ] }
          ],
          specs: [ { label: 'Material', value: 'Raffia + leather' } ]
        },
        {
          id: 'tws-gold-hoops', category: 'accessories', name: 'Gold Vermeil Hoop Earrings', price: 2400, available: true,
          description: '18k gold vermeil over sterling silver. Lightweight enough for all-day wear.',
          images: [ 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=70' ],
          variants: [],
          specs: [ { label: 'Material', value: 'Gold vermeil' }, { label: 'Diameter', value: '3 cm' } ]
        },
        {
          id: 'tws-silk-scarf', category: 'accessories', name: 'Printed Silk Scarf', price: 1800, available: true,
          description: 'Lightweight mulberry silk scarf with a hand-rolled edge and a vibrant botanical print.',
          images: [ 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=900&q=70' ],
          variants: [],
          specs: [ { label: 'Material', value: '100% mulberry silk' }, { label: 'Size', value: '90 × 90 cm' } ]
        },
        {
          id: 'tws-necklace', category: 'accessories', name: 'Beaded Statement Necklace', price: 2800, available: true,
          description: 'Hand-beaded statement necklace made by artisan partners in Kajiado.',
          images: [ 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=70' ],
          variants: [],
          specs: [ { label: 'Material', value: 'Glass beads + brass' }, { label: 'Origin', value: 'Handmade in Kenya' } ]
        }
      ]
    },

    /* ==========================================================
       Mavuno Fresh — groceries
       ========================================================== */
    {
      slug: 'mavunofresh',
      business: {
        name: 'Mavuno Fresh',
        tagline: 'Farm-fresh groceries, delivered daily',
        description: 'Fresh fruit, vegetables and pantry staples sourced directly from smallholder farms around Nairobi. Harvested in the morning, delivered by evening.',
        type: 'groceries',
        logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=70',
        cover: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1400&q=70',
        verified: true,
        rating: 4.6,
        reviewCount: 1482,
        open: true,
        phone: '+254711 456 789',
        whatsapp: '+254711456789',
        email: 'orders@mavunofresh.co.ke',
        address: 'Ngong Road Market, Nairobi',
        city: 'Nairobi'
      },
      settings: {
        currency: 'KES',
        delivery: { available: true, fee: 150, freeOver: 3000, time: '2–4 hrs', note: 'Nairobi metro' },
        pickup: { available: true, note: 'Collect at Ngong Road Market' },
        minOrder: 300,
        payments: ['mpesa', 'cod'],
        whatsappOrdering: true,
        hours: 'Daily · 7:00 – 20:00'
      },
      categories: [
        { id: 'produce', name: 'Fresh Produce', icon: 'basket' },
        { id: 'dairy', name: 'Dairy & Eggs', icon: 'basket' },
        { id: 'pantry', name: 'Pantry', icon: 'basket' },
        { id: 'household', name: 'Household', icon: 'home2' }
      ],
      products: [
        { id: 'mav-avocado', category: 'produce', name: 'Hass Avocados (Pack of 6)', price: 450, compare_at_price: 520, available: true, badge: 'Popular',
          description: 'Creamy, ripe-and-ready Hass avocados from Murang\u2019a farms.', images: [ 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=900&q=70' ], variants: [],
          specs: [ { label: 'Pack', value: '6 pieces' }, { label: 'Origin', value: 'Murang\u2019a' } ] },
        { id: 'mav-veg-box', category: 'produce', name: 'Weekly Fresh Vegetable Box', price: 1500, available: true,
          description: 'A mixed box of seasonal vegetables: sukuma wiki, spinach, tomatoes, carrots and more.', images: [ 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=70' ],
          variants: [ { name: 'Box size', type: 'size', options: [ { label: 'Small', available: true }, { label: 'Family', available: true } ] } ],
          specs: [ { label: 'Contents', value: '8\u201310 items' } ] },
        { id: 'mav-bananas', category: 'produce', name: 'Sweet Bananas (Bunch)', price: 320, available: true,
          description: 'Naturally ripened sweet bananas, perfect for snacking or smoothies.', images: [ 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=900&q=70' ], variants: [],
          specs: [ { label: 'Pack', value: '1 bunch' } ] },
        { id: 'mav-eggs', category: 'dairy', name: 'Free-Range Eggs (Tray of 30)', price: 620, available: true,
          description: 'Fresh free-range eggs, collected daily and delivered in a recyclable tray.', images: [ 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?auto=format&fit=crop&w=900&q=70' ], variants: [],
          specs: [ { label: 'Pack', value: '30 eggs' } ] },
        { id: 'mav-milk', category: 'dairy', name: 'Fresh Whole Milk 1L', price: 130, available: true,
          description: 'Pasteurised whole milk in a returnable bottle.', images: [ 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=70' ], variants: [],
          specs: [ { label: 'Volume', value: '1L' } ] },
        { id: 'mav-maize', category: 'pantry', name: 'Fortified Maize Flour', price: 210, available: true,
          description: 'Vitamin-fortified maize flour for smooth, dependable ugali.', images: [ 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=70' ],
          variants: [ { name: 'Pack', type: 'size', options: [ { label: '2kg', available: true }, { label: '5kg', available: true }, { label: '10kg', available: true } ] } ],
          specs: [ { label: 'Weight', value: '2kg' } ] },
        { id: 'mav-oil', category: 'pantry', name: 'Pure Sunflower Cooking Oil', price: 780, available: true,
          description: 'Light, neutral sunflower oil in a family-size bottle.', images: [ 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=70' ],
          variants: [ { name: 'Size', type: 'size', options: [ { label: '1L', available: true }, { label: '3L', available: true }, { label: '5L', available: true } ] } ],
          specs: [ { label: 'Volume', value: '3L' } ] },
        { id: 'mav-rice', category: 'pantry', name: 'Long Grain Basmati Rice', price: 1450, available: true,
          description: 'Aromatic long-grain basmati that cooks up light and separate every time.', images: [ 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=70' ],
          variants: [ { name: 'Pack', type: 'size', options: [ { label: '2kg', available: true }, { label: '5kg', available: true } ] } ],
          specs: [ { label: 'Weight', value: '5kg' } ] },
        { id: 'mav-tea', category: 'pantry', name: 'Kenyan Black Tea Leaves 500g', price: 340, available: true,
          description: 'Rich, full-bodied loose black tea grown in the Kenyan highlands.', images: [ 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=900&q=70' ], variants: [],
          specs: [ { label: 'Weight', value: '500g' } ] },
        { id: 'mav-dish-soap', category: 'household', name: 'Lemon Dishwashing Liquid 1L', price: 260, available: true,
          description: 'Concentrated lemon dish soap that cuts grease fast and leaves a fresh scent.', images: [ 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=900&q=70' ], variants: [],
          specs: [ { label: 'Volume', value: '1L' } ] }
      ]
    },

    /* ==========================================================
       Brew & Bites — coffee & bakery
       ========================================================== */
    {
      slug: 'brewandbites',
      business: {
        name: 'Brew & Bites',
        tagline: 'Specialty Kenyan coffee & fresh bakes',
        description: 'Small-batch Kenyan AA coffee roasted weekly, alongside fresh pastries and light meals baked in-house every morning.',
        type: 'food',
        logo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=300&q=70',
        cover: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1400&q=70',
        verified: false,
        rating: 4.7,
        reviewCount: 768,
        open: true,
        phone: '+254715 111 222',
        whatsapp: '+254715111222',
        email: 'hi@brewandbites.co.ke',
        address: 'Lavington Mall, Nairobi',
        city: 'Nairobi'
      },
      settings: {
        currency: 'KES',
        delivery: { available: true, fee: 250, freeOver: 3500, time: '30–45 min', note: 'Within 8 km' },
        pickup: { available: true, note: 'Ready in 20 min · Lavington Mall' },
        minOrder: 0,
        payments: ['mpesa', 'cod'],
        whatsappOrdering: true,
        hours: 'Daily · 7:00 – 19:00'
      },
      categories: [
        { id: 'coffee', name: 'Coffee', icon: 'cup' },
        { id: 'bakery', name: 'Bakery', icon: 'basket' },
        { id: 'breakfast', name: 'Breakfast', icon: 'cup' }
      ],
      products: [
        { id: 'bb-beans', category: 'coffee', name: 'Kenyan AA Coffee Beans 500g', price: 1250, available: true,
          description: 'Single-origin Kenyan AA beans, medium-roasted weekly. Notes of blackcurrant and citrus.',
          images: [ 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=70', 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=70' ],
          variants: [ { name: 'Grind', type: 'size', options: [ { label: 'Whole bean', available: true }, { label: 'Filter', available: true }, { label: 'Espresso', available: true } ] } ],
          specs: [ { label: 'Origin', value: 'Nyeri, Kenya' }, { label: 'Roast', value: 'Medium' } ] },
        { id: 'bb-coldbrew', category: 'coffee', name: 'Cold Brew Bottle 750ml', price: 550, available: true,
          description: 'Slow-steeped 18 hours for a smooth, low-acid cold brew. Ready to pour over ice.', images: [ 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=70' ], variants: [],
          specs: [ { label: 'Volume', value: '750ml' } ] },
        { id: 'bb-private-tasting', category: 'coffee', type: 'service', name: 'Private Coffee Tasting', price: 1500, available: true,
          description: 'A guided flight of three single-origin Kenyan coffees, roasted and brewed by our barista right at your table.',
          images: [ 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=70' ],
          duration: '90 min',
          provider: 'Our head barista',
          location: 'at_shop',
          includes: [ 'Flight of 3 single-origin coffees', 'Brewing demo (pour-over)', 'Tasting notes card' ],
          addons: [
            { id: 'beans', label: 'Take-home bean bundle', price: 800 },
            { id: 'pairing', label: 'Dessert pairing', price: 450 }
          ],
          details: [ { label: 'Duration', value: '90 min' }, { label: 'Location', value: 'Lavington Mall' }, { label: 'Group size', value: 'Up to 2' } ] },
        { id: 'bb-cappuccino', category: 'coffee', name: 'Double Cappuccino', price: 320, available: true,
          description: 'Two shots of our house espresso with silky steamed milk.', images: [ 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=900&q=70' ],
          variants: [ { name: 'Milk', type: 'size', options: [ { label: 'Whole', available: true }, { label: 'Oat', available: true }, { label: 'Skim', available: true } ] } ],
          specs: [ { label: 'Size', value: 'Regular' } ] },
        { id: 'bb-croissant', category: 'bakery', name: 'Butter Croissants (Pack of 4)', price: 620, compare_at_price: 800, available: true, badge: 'Popular',
          description: 'All-butter croissants baked fresh each morning, with a crisp, flaky crust.', images: [ 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=70' ], variants: [],
          specs: [ { label: 'Pack', value: '4 pieces' }, { label: 'Baked', value: 'Daily' } ] },
        { id: 'bb-cinnamon', category: 'bakery', name: 'Cinnamon Rolls (Pack of 4)', price: 720, available: true,
          description: 'Soft, gooey cinnamon rolls finished with a cream-cheese glaze.', images: [ 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=900&q=70' ], variants: [],
          specs: [ { label: 'Pack', value: '4 pieces' } ] },
        { id: 'bb-sourdough', category: 'bakery', name: 'Country Sourdough Loaf', price: 550, available: true,
          description: 'Naturally leavened sourdough with a blistered crust and open crumb.', images: [ 'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?auto=format&fit=crop&w=900&q=70' ], variants: [],
          specs: [ { label: 'Size', value: '800g loaf' } ] },
        { id: 'bb-sourdough-workshop', category: 'bakery', type: 'booking', name: 'Sourdough Baking Workshop', price: 2500, available: true,
          description: 'Bake your own sourdough loaf from scratch — mixing, shaping, scoring and the science behind the crust. You take home your loaf and starter.',
          images: [ 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=70' ],
          duration: '3 hrs',
          guestsMax: 8,
          cancellation: 'Free cancellation up to 48 hours before the session. Later cancellations forfeit the full amount.',
          slots: [
            { time: '09:00', available: true }, { time: '10:00', available: true }, { time: '11:00', available: false },
            { time: '14:00', available: true }, { time: '15:00', available: false }, { time: '16:00', available: true }
          ],
          details: [ { label: 'Duration', value: '3 hrs' }, { label: 'Location', value: 'Lavington Mall' }, { label: 'Includes', value: 'Ingredients, starter, tools' }, { label: 'Take home', value: 'Your loaf + starter' } ] },
        { id: 'bb-granola', category: 'breakfast', name: 'Honey Granola 500g', price: 720, available: true,
          description: 'Toasted oats with Kenyan honey, almonds and coconut. Great with yoghurt or milk.', images: [ 'https://images.unsplash.com/photo-1517093602195-b40af9688b46?auto=format&fit=crop&w=900&q=70' ], variants: [],
          specs: [ { label: 'Weight', value: '500g' } ] },
        { id: 'bb-avotoast', category: 'breakfast', name: 'Sourdough Avocado Toast', price: 480, available: true,
          description: 'Smashed avocado on toasted sourdough with chilli, lime and toasted seeds.', images: [ 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?auto=format&fit=crop&w=900&q=70' ], variants: [],
          specs: [ { label: 'Serves', value: '1' } ] }
      ]
    },

    /* ==========================================================
       Zuri Beauty Studio — salon (appointments)
       ========================================================== */
    {
      slug: 'zuribeauty',
      business: {
        name: 'Zuri Beauty Studio',
        tagline: 'Hair, nails & skincare in Kilimani',
        description: 'Zuri Beauty Studio is a full-service salon in Kilimani, Nairobi. Book your stylist or beauty specialist online — every appointment is reserved just for you.',
        type: 'services',
        logo: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=300&q=70',
        cover: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1400&q=70',
        gallery: [
          'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=70',
          'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=900&q=70',
          'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=70',
          'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=70'
        ],
        verified: true,
        rating: 4.9,
        reviewCount: 342,
        open: true,
        phone: '+254722 555 443',
        whatsapp: '+254722555443',
        email: 'hello@zuribeauty.co.ke',
        address: 'Mall 2, 4th Floor, Rose Avenue, Kilimani, Nairobi',
        city: 'Nairobi'
      },
      settings: {
        currency: 'KES',
        delivery: { available: false },
        pickup: { available: false },
        minOrder: 0,
        payments: ['mpesa', 'pay_at_venue'],
        whatsappOrdering: true,
        hours: 'Daily · 9:00 – 18:00'
      },
      categories: [
        { id: 'hair', name: 'Hair', icon: 'sparkle' },
        { id: 'nails', name: 'Nails', icon: 'sparkle' },
        { id: 'skincare', name: 'Skincare', icon: 'sparkle' },
        { id: 'brows', name: 'Brows & Lashes', icon: 'sparkle' }
      ],
      booking: {
        timezone: 'Africa/Nairobi',
        hours: {
          mon: [['09:00', '18:00']], tue: [['09:00', '18:00']], wed: [['09:00', '18:00']],
          thu: [['09:00', '18:00']], fri: [['09:00', '18:00']], sat: [['09:00', '17:00']],
          sun: []
        },
        bufferMinutes: 15,
        depositPercent: 30,
        policy: 'Free cancellation or rescheduling up to 24 hours before your appointment. Late cancellations and no-shows forfeit the deposit.',
        staff: [
          { id: 'achieng', name: 'Achieng Odera', role: 'Senior stylist & colour specialist', photo: '',
            workingHours: { mon: [['09:00', '18:00']], tue: [['09:00', '18:00']], wed: [['09:00', '18:00']], thu: [['09:00', '18:00']], fri: [['09:00', '18:00']], sat: [['09:00', '17:00']], sun: [] } },
          { id: 'wanjiru', name: 'Wanjiru Kimathi', role: 'Nail & beauty specialist', photo: '',
            workingHours: { mon: [['10:00', '19:00']], tue: [['10:00', '19:00']], wed: [['09:00', '18:00']], thu: [['09:00', '18:00']], fri: [['10:00', '19:00']], sat: [['09:00', '18:00']], sun: [] } }
        ],
        blockedDates: [],
        reviews: [
          { author: 'Naomi W.', rating: 5, date: '2026-09-28', text: 'Booked online in 2 minutes, no waiting at the door. Achieng transformed my hair.' },
          { author: 'Brian K.', rating: 5, date: '2026-09-14', text: 'The gel manicure held up two weeks. Clean studio, great playlist.' },
          { author: 'Zawadi O.', rating: 4, date: '2026-08-30', text: 'Facial was lovely and relaxing. Slightly full on Saturday — book early slots.' }
        ]
      },
      products: [
        { id: 'zu-hair-cut', category: 'hair', type: 'service', name: 'Signature Cut & Style', price: 1500, duration: '45 min', durationMin: 45, staffIds: ['achieng'], available: true, badge: 'Popular',
          description: 'A consultation-led cut with blow-dry finish. Includes a scalp massage and styling advice you keep.',
          images: [ 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=70' ],
          details: [ { label: 'Duration', value: '45 min' }, { label: 'Specialist', value: 'Achieng Odera' }, { label: 'Deposit', value: '30% to confirm' } ] },
        { id: 'zu-braids', category: 'hair', type: 'service', name: 'Knotless Braids (Full Head)', price: 4500, duration: '4 hrs', durationMin: 240, staffIds: ['achieng', 'wanjiru'], available: true, badge: 'Popular',
          description: 'Full-head knotless box braids with pre-stretched hair. Please come with clean, detangled hair.',
          images: [ 'https://images.unsplash.com/photo-1605980776566-0486c3ac7617?auto=format&fit=crop&w=900&q=70' ],
          details: [ { label: 'Duration', value: '4 hrs' }, { label: 'Specialists', value: 'Achieng or Wanjiru' }, { label: 'Hair', value: 'Brought by client or add-on' } ] },
        { id: 'zu-blowdry', category: 'hair', type: 'service', name: 'Blow-Dry & Style', price: 1200, duration: '40 min', durationMin: 40, staffIds: ['achieng'], available: true,
          description: 'Wash, blow-dry and finish in a style of your choice.',
          images: [ 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=900&q=70' ],
          details: [ { label: 'Duration', value: '40 min' }, { label: 'Specialist', value: 'Achieng Odera' } ] },
        { id: 'zu-manicure', category: 'nails', type: 'service', name: 'Classic Manicure', price: 1000, duration: '45 min', durationMin: 45, staffIds: ['wanjiru'], available: true,
          description: 'Shape, cuticle care, buff and polish in a colour of your choice.',
          images: [ 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=900&q=70' ],
          details: [ { label: 'Duration', value: '45 min' }, { label: 'Specialist', value: 'Wanjiru Kimathi' } ] },
        { id: 'zu-pedi', category: 'nails', type: 'service', name: 'Classic Pedicure', price: 1200, duration: '45 min', durationMin: 45, staffIds: ['wanjiru'], available: true,
          description: 'Relaxing soak, exfoliation, cuticle care and polish.',
          images: [ 'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?auto=format&fit=crop&w=900&q=70' ],
          details: [ { label: 'Duration', value: '45 min' }, { label: 'Specialist', value: 'Wanjiru Kimathi' } ] },
        { id: 'zu-gel', category: 'nails', type: 'service', name: 'Gel Polish Manicure', price: 1800, duration: '1 hr', durationMin: 60, staffIds: ['wanjiru'], available: true, badge: 'Popular',
          description: 'Gel polish for a long-lasting, chip-free finish that survives everyday life.',
          images: [ 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=70' ],
          details: [ { label: 'Duration', value: '60 min' }, { label: 'Specialist', value: 'Wanjiru Kimathi' } ] },
        { id: 'zu-facial', category: 'skincare', type: 'service', name: 'Glow Facial', price: 2500, duration: '1 hr', durationMin: 60, staffIds: ['achieng'], available: true, badge: 'Popular',
          description: 'Deep cleanse, gentle exfoliation, extraction and a hydrating mask tailored to your skin.',
          images: [ 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=70' ],
          details: [ { label: 'Duration', value: '60 min' }, { label: 'Specialist', value: 'Achieng Odera' } ] },
        { id: 'zu-cleanup', category: 'skincare', type: 'service', name: 'Deep Clean & Steam', price: 1500, duration: '45 min', durationMin: 45, staffIds: ['achieng'], available: true,
          description: 'Steam opening, gentle extractions and a soothing mask.',
          images: [ 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=70' ],
          details: [ { label: 'Duration', value: '45 min' }, { label: 'Specialist', value: 'Achieng Odera' } ] },
        { id: 'zu-brow', category: 'brows', type: 'service', name: 'Brow Shape & Wax', price: 600, duration: '20 min', durationMin: 20, staffIds: ['wanjiru'], available: true,
          description: 'Precise shaping and wax for a clean, defined brow.',
          images: [ 'https://images.unsplash.com/photo-1519413479523-80e0e44e0e4c?auto=format&fit=crop&w=900&q=70' ],
          details: [ { label: 'Duration', value: '20 min' }, { label: 'Specialist', value: 'Wanjiru Kimathi' } ] },
        { id: 'zu-lash', category: 'brows', type: 'service', name: 'Lash Lift & Tint', price: 2000, duration: '50 min', durationMin: 50, staffIds: ['wanjiru'], available: true,
          description: 'A curl-dramatising lash lift with a conditioning tint for natural, no-mascara eyes.',
          images: [ 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=70' ],
          details: [ { label: 'Duration', value: '50 min' }, { label: 'Specialist', value: 'Wanjiru Kimathi' } ] }
      ]
    }
  ];

  /* Map a business type to a department icon for the storefront. */
  var typeIcons = {
    fashion: 'shirt', electronics: 'device', beauty: 'sparkle', home: 'home2',
    groceries: 'basket', food: 'cup', shoes: 'shoe', services: 'wrench', general: 'store'
  };

  return {
    defaultStore: 'twosidesboutique',
    stores: stores,
    typeIcons: typeIcons,
    currency: (stores[0] && stores[0].settings.currency) || 'KES'
  };
})();
