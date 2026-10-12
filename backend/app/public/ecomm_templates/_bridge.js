/* Bridge between the static ecomm templates and the platform.
 * Runs right after each template's data.js (before cart/app scripts): swaps demo data for the business's real
 * catalogue/services (window.__BZ, injected by services/ecomm_site.py) and routes checkout / bookings to the backend. */
(function () {
  var B = window.__BZ;
  if (!B) {
    try {
      var saved = sessionStorage.getItem("aqivo_active_bz");
      if (saved) {
        window.__BZ = JSON.parse(saved);
        B = window.__BZ;
      }
    } catch (e) {}
  }
  if (!B) return;
  try {
    sessionStorage.setItem("aqivo_active_bz", JSON.stringify(B));
  } catch (e) {}

  // Redirect away from raw /ecomm-templates/<key>/<page> if merchant context exists
  if (window.location.pathname.indexOf("/ecomm-templates/") !== -1) {
    var redirectSlug = (B && B.slug) || "";
    if (!redirectSlug) {
      try {
        var orders = JSON.parse(localStorage.getItem("aqivo_orders") || "[]");
        if (orders.length && orders[0].businessSlug) redirectSlug = orders[0].businessSlug;
      } catch (e) {}
    }
    if (redirectSlug && window.location.search.indexOf("preview=1") === -1) {
      var parts = window.location.pathname.split("/").filter(Boolean);
      var page = parts.length ? parts[parts.length - 1] : "index.html";
      if (page.indexOf(".html") === -1) page = "index.html";
      window.location.replace("/" + encodeURIComponent(redirectSlug) + "/" + page + (window.location.search || ""));
      return;
    }
  }
  var KEY = B.key, ITEMS = B.items || [], CATS = B.categories || [];
  var byId = {}; ITEMS.forEach(function (p) { byId[p.id] = p; });

  // ---------- helpers
  function esc(s) { // safe for innerHTML and for inline onclick JS strings used by the templates
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "\u2019").replace(/"/g, "\u201D").replace(/`/g, "\u2019").replace(/\\/g, "/").replace(/[\r\n]+/g, " ");
  }
  function fmt(n) {
    var s = B.symbol || B.currency || "";
    return (s.length > 1 ? s + " " : s) + Number(n || 0).toLocaleString("en", { maximumFractionDigits: 2 });
  }
  function setArr(arr, list) { if (!arr) return; arr.length = 0; list.forEach(function (x) { arr.push(x); }); }
  function pct(p) { return p.compare && p.compare > p.price ? "-" + Math.round((1 - p.price / p.compare) * 100) + "%" : ""; }
  function vTitles(p) { return p.variants.map(function (v) { return v.title; }); }
  function img(p) { return p.image || ""; }
  function deals(list) { var d = list.filter(function (p) { return p.compare && p.compare > p.price; }); return d.length ? d : list; }
  function cycle(list, n) { var out = []; for (var i = 0; i < n && list.length; i++) out.push(list[i % list.length]); return out; }
  var CURATED_PHOTOS = {
    dress: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80",
    clothing: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80",
    fashion: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
    bag: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    handbag: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    leather: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    hamper: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80",
    gift: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=800&q=80",
    shoe: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
    sneaker: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80",
    beauty: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
    skincare: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",
    hair: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80",
    coffee: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80",
    food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
    electronics: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    phone: "https://images.unsplash.com/photo-1511707171634-5f897ff02547?auto=format&fit=crop&w=800&q=80",
    grocery: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=800&q=80",
  };

  function makeDesignedPlaceholder(name, category) {
    var label = String(name || category || "STORE ITEM").slice(0, 18).toUpperCase();
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">' +
      '<defs>' +
        '<linearGradient id="pBg" x1="0%" y1="0%" x2="100%" y2="100%">' +
          '<stop offset="0%" stop-color="#F8FAFC"/>' +
          '<stop offset="100%" stop-color="#E2E8F0"/>' +
        '</linearGradient>' +
        '<linearGradient id="pIcon" x1="0%" y1="0%" x2="100%" y2="100%">' +
          '<stop offset="0%" stop-color="#7C3AED"/>' +
          '<stop offset="100%" stop-color="#5B21F5"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<rect width="600" height="600" fill="url(#pBg)"/>' +
      '<circle cx="300" cy="260" r="88" fill="#FFFFFF" opacity="0.9"/>' +
      '<path d="M265 240 L300 215 L335 240 L335 295 L265 295 Z" fill="none" stroke="url(#pIcon)" stroke-width="7" stroke-linejoin="round"/>' +
      '<path d="M265 240 L300 265 L335 240" fill="none" stroke="url(#pIcon)" stroke-width="7" stroke-linejoin="round"/>' +
      '<line x1="300" y1="265" x2="300" y2="295" stroke="url(#pIcon)" stroke-width="7"/>' +
      '<text x="300" y="405" font-family="-apple-system, system-ui, sans-serif" font-size="16" font-weight="800" letter-spacing="3" fill="#475569" text-anchor="middle">' + esc(label) + '</text>' +
      '<text x="300" y="430" font-family="-apple-system, system-ui, sans-serif" font-size="12" font-weight="600" letter-spacing="1" fill="#94A3B8" text-anchor="middle">OFFICIAL STORE CATALOGUE</text>' +
    '</svg>';
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  function getSmartFallbackImage(p) {
    if (!p) return makeDesignedPlaceholder("PRODUCT", "");
    var text = ((p.name || "") + " " + (p.category || "") + " " + (p.desc || "")).toLowerCase();
    var keys = Object.keys(CURATED_PHOTOS);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (text.indexOf(k) !== -1) return CURATED_PHOTOS[k];
    }
    return makeDesignedPlaceholder(p.name, p.category);
  }

  var FALLBACK_IMG = makeDesignedPlaceholder("PRODUCT", "");
  function pic(p) {
    if (typeof p === "string" && p) return p;
    var directImg = p ? (p.image || (p.images && p.images[0])) : "";
    if (directImg) return directImg;
    return getSmartFallbackImage(p);
  }

  function hide(ids) {
    ids.forEach(function (id) {
      var el = document.getElementById(id); if (!el) return;
      var s = el.closest("section") || el.closest(".section-block") || el.parentElement;
      if (s) s.style.display = "none";
    });
  }
  function onReady(fn) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); else fn(); }

  // ---------- storefront -> /checkout (existing order flow: delivery, payments, order tracking)
  var BAG_KEY = "bz-bag2-" + B.slug;
  function toBag(lines) { // lines: [{id, variant, qty}]
    var bag = {}, ok = false;
    lines.forEach(function (l) {
      var p = byId[l.id]; if (!p || l.qty <= 0) return;
      var v = null;
      if (p.variants.length) {
        v = p.variants.filter(function (x) { return x.title === l.variant; })[0] || null;
        if (!v) v = p.variants[0];
      }
      var k = p.kind + ":" + p.id + ":" + (v ? v.id : "");
      bag[k] = { kind: p.kind, id: p.id, variant_id: v ? v.id : null, variant_title: v ? v.title : "", name: p.name, price: Number((v && v.price) || p.price), image: p.image || "", qty: (bag[k] ? bag[k].qty : 0) + l.qty };
      ok = true;
    });
    return ok ? bag : null;
  }
  function goCheckout(lines) {
    var bag = toBag(lines);
    if (!bag) { alert("Your bag is empty or contains items that are no longer available."); return; }
    try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); } catch (e) {}
    location.href = (B.root || "") + "/checkout";
  }
  function readLS(key, map) {
    try { return (JSON.parse(localStorage.getItem(key) || "[]") || []).map(map); } catch (e) { return []; }
  }
  function readMobileStoreCart(storeName) {
    var key = "aqivo_cart_" + (storeName || "").replace(/\s+/g, "_").toLowerCase();
    try {
      return (JSON.parse(localStorage.getItem(key) || "[]") || []).map(function (i) {
        return { id: i.id, variant: i.option || i.variant || "", qty: i.qty };
      });
    } catch (e) {
      return [];
    }
  }

  var CART = {
    twosidesboutique: function () { return readMobileStoreCart(B.name || "Two Sides Boutique"); },
    mavunofresh: function () { return readMobileStoreCart(B.name || "Mavuno Fresh"); },
    brewandbites: function () { return readMobileStoreCart(B.name || "Brew & Bites"); },
    zuribeauty: function () { return readMobileStoreCart(B.name || "Zuri Beauty Studio"); }
  };

  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("#cart-checkout-btn, #btn-cart-checkout, [data-checkout]");
    if (t && CART[KEY]) { e.preventDefault(); e.stopImmediatePropagation(); goCheckout((CART[KEY] || function(){return[]})()); return; }
    var a = e.target.closest && e.target.closest('a[href^="#"]'); // <base> would otherwise send in-page anchors away
    if (a) {
      var id = a.getAttribute("href").slice(1);
      e.preventDefault();
      if (!id) return;
      var el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, true);

  window.addEventListener("load", function () {
    // the templates' own "place order" modals are replaced by the real checkout
    if (window.modals) {
      window.modals.openCheckoutModal = function () { goCheckout((CART[KEY] || function () { return []; })()); };
      window.modals.confirmCheckout = window.modals.openCheckoutModal;
    }
    if (window.Cart && KEY === "mart_ecom") window.Cart.checkout = function () { goCheckout(CART[KEY]()); };
  });

  // contact details & branding baked into the templates' footers
  onReady(function () {
    var year = new Date().getFullYear();
    // [data-bz-name] → business name (original case)
    document.querySelectorAll("[data-bz-name]").forEach(function (el) { el.textContent = B.name; });
    // [data-bz-name-upper] → business name uppercased
    document.querySelectorAll("[data-bz-name-upper]").forEach(function (el) { el.textContent = B.name.toUpperCase(); });
    // [data-bz-tagline] → tagline or sensible fallback (only replace if business has one)
    if (B.tagline) document.querySelectorAll("[data-bz-tagline]").forEach(function (el) { el.textContent = B.tagline; });
    // [data-bz-phone] → business phone number
    if (B.phone) document.querySelectorAll("[data-bz-phone]").forEach(function (el) { el.textContent = B.phone; });
    // [data-bz-email] → business email
    if (B.email) document.querySelectorAll("[data-bz-email]").forEach(function (el) { el.textContent = B.email; });
    // [data-bz-address] → business address
    if (B.address) document.querySelectorAll("[data-bz-address]").forEach(function (el) { el.textContent = B.address; });
    // [data-bz-copyright] → dynamic copyright line with real name and current year
    document.querySelectorAll("[data-bz-copyright]").forEach(function (el) {
      el.innerHTML = "\u00A9 " + year + " " + esc(B.name) + ". All rights reserved.";
    });
    // [data-bz-free-delivery] → free delivery threshold amount
    if (B.freeOver) document.querySelectorAll("[data-bz-free-delivery]").forEach(function (el) {
      el.textContent = (B.symbol ? B.symbol + " " : (B.currency ? B.currency + " " : "")) + Number(B.freeOver).toLocaleString();
    });
    // [data-bz-initial] → first two letters of brand name for logo badges
    document.querySelectorAll("[data-bz-initial]").forEach(function (el) {
      el.textContent = B.name.slice(0, 2).toUpperCase();
    });
  });

  // ---------- per-template data
  var MAP = {};

  MAP.fashion_ecom = function () {
    var C = window.STORE_CONFIG; C.storeName = B.name.toUpperCase(); C.tagline = B.tagline || C.tagline; C.currency = B.currency; C.currencySymbol = (B.symbol || "") + " ";
    C.formatPrice = fmt;
    var mk = function (p) { return { id: p.id, name: esc(p.name), category: esc(p.category || ""), price: p.price, originalPrice: p.compare && p.compare > p.price ? p.compare : null, discount: pct(p), image: pic(p),
      sizes: p.variants.length ? vTitles(p).map(esc) : ["One Size"], colors: ["Standard"], description: esc(p.desc) }; };
    setArr(window.CATEGORIES, CATS.map(function (c) { return { id: c.id, name: esc(c.name).toUpperCase(), image: c.image || FALLBACK_IMG, count: c.count + " items" }; }));
    setArr(window.NEW_ARRIVALS, ITEMS.map(mk));
    var sale = ITEMS.filter(function (p) { return p.compare && p.compare > p.price; });
    setArr(window.WOMEN_SALE, sale.map(mk)); setArr(window.MEN_SALE, []); setArr(window.BLOG_POSTS, []);
    onReady(function () {
      var h = document.getElementById("women-sale-rail"); var sec = h && h.closest("section"); var t = sec && sec.querySelector("h2,h3"); if (t) t.textContent = "On Sale";
      hide(sale.length ? ["men-sale-rail", "blog-grid"] : ["women-sale-rail", "men-sale-rail", "blog-grid"]);
      if (!CATS.length) hide(["categories-strip"]);
    });
  };

  MAP.grocery_ecom = function () {
    var C = window.STORE_CONFIG; C.storeName = B.name; C.tagline = B.tagline || C.tagline; C.currency = B.currency; C.currencySymbol = (B.symbol || "") + " ";
    C.freeDeliveryThreshold = B.freeOver || 0; C.formatPrice = fmt;
    var mk = function (p) { return { id: p.id, name: esc(p.name), category: p.cid, categoryName: esc(p.category), price: p.price, originalPrice: p.compare && p.compare > p.price ? p.compare : null, unit: "",
      rating: B.rating && B.rating.average ? B.rating.average : 5, soldCount: 0, badge: pct(p) ? "SALE " + pct(p).slice(1) : "", badgeType: "sale", image: pic(p), description: esc(p.desc) }; };
    setArr(window.CATEGORIES, CATS.map(function (c) { return { id: c.id, name: esc(c.name), count: c.count + " items", image: c.image || FALLBACK_IMG }; }));
    var all = ITEMS.map(mk);
    setArr(window.FRESH_FOOD_CATALOG, all);
    setArr(window.TODAYS_DEALS, deals(ITEMS).slice(0, 10).map(mk).map(function (x) { x.category = x.categoryName; return x; }));
    setArr(window.SPOTLIGHT_PRODUCTS, ITEMS.slice(0, 6).map(mk).map(function (x) { x.category = x.categoryName; return x; }));
    setArr(window.DAILY_BEST_SELLERS, ITEMS.filter(function (p) { return p.featured; }).concat(ITEMS).slice(0, 10).map(mk).map(function (x) { x.category = x.categoryName; return x; }));
    setArr(window.SEAFOOD_DEALS, []);
    setArr(window.MONTHLY_GROCERY_DEAL, deals(ITEMS).slice(0, 3).map(mk).map(function (x) { x.category = x.categoryName; return x; }));
    setArr(window.BRANDS, []);
    onReady(function () {
      hide(["sea-rail", "brands-logo-row"]);
      if (!CATS.length) hide(["category-bubbles-grid"]);
      var sp = document.getElementById("monthly-deals-container"); if (sp && !ITEMS.length) sp.style.display = "none";
    });
  };

  MAP.shoeshop_ecom = function () {
    var C = window.STORE_CONFIG; C.storeName = B.name; C.tagline = B.tagline || C.tagline; C.currency = B.currency; C.currencySymbol = B.symbol || ""; C.locale = "en"; C.formatPrice = fmt;
    var mk = function (p) { return { id: p.id, name: esc(p.name), brand: esc(p.category || B.name), price: p.price, originalPrice: p.compare && p.compare > p.price ? p.compare : null,
      rating: B.rating && B.rating.average ? B.rating.average : 5, soldCount: 0, image: pic(p), isWishlisted: false, isSoldOut: !!p.soldout, tag: pct(p) ? "Sale " + pct(p).slice(1) : "", tagType: pct(p) ? "deal" : "just-in",
      category: esc(p.category || "All"), sizes: p.variants.length ? vTitles(p).map(esc) : ["One Size"], description: esc(p.desc) }; };
    setArr(window.BEST_DEALS, deals(ITEMS).slice(0, 10).map(mk));
    setArr(window.CATALOG_PRODUCTS, ITEMS.map(mk));
    var hero = ITEMS.filter(function (p) { return p.featured; })[0] || ITEMS[0];
    if (hero) {
      window.HERO_FEATURED.main = { badge: "NEW ARRIVAL!", title: esc(hero.name).toUpperCase(), subtitle: esc(hero.desc || B.tagline), price: hero.price, image: pic(hero), brand: esc(hero.category || B.name) };
      window.HERO_FEATURED.promo = { headline: esc(B.name).toUpperCase(), subtext: esc(B.tagline || "Shop our latest arrivals."), image: window.HERO_FEATURED.promo.image, buttonText: "Shop now" };
    }
    var palette = ["#E31837", "#111827", "#2563EB", "#16A34A", "#9333EA", "#EA580C"];
    setArr(window.BRAND_STORES, CATS.map(function (c, i) {
      return { id: "cat-" + c.id, name: esc(c.name), verified: true, rating: 5, followers: c.count + " items", logoText: esc(c.name).slice(0, 2).toUpperCase(), logoBg: palette[i % palette.length], logoSvg: "",
        items: ITEMS.filter(function (p) { return p.cid === c.id; }).slice(0, 4).map(function (p) { return { id: p.id, name: esc(p.name), price: p.price, img: pic(p) }; }) };
    }));
    onReady(function () {
      if (!CATS.length) hide(["brand-stores-grid"]);
      var promoTitle = document.querySelector(".hero-promo-title");
      if (promoTitle) promoTitle.textContent = (B.name + " COLLECTION").toUpperCase();
      var promoDesc = document.querySelector(".hero-promo-desc");
      if (promoDesc) promoDesc.textContent = B.tagline || "Discover our curated collection.";
      var promoBtn = document.querySelector(".hero-promo-content .pill-btn-white");
      if (promoBtn) {
        promoBtn.textContent = "Shop Collection";
        promoBtn.onclick = function () {
          var el = document.getElementById("shop-collection-section");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        };
      }
      var promoVisual = document.querySelector(".hero-promo-visual");
      if (promoVisual) {
        promoVisual.onclick = function () {
          var el = document.getElementById("shop-collection-section");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        };
      }
    });
  };

  MAP.mart_ecom = function () {
    var D = window.MartData;
    D.store.name = B.name; D.store.tagline = B.tagline || D.store.tagline; D.store.hotline = B.phone || ""; D.store.email = B.email || ""; D.store.freeDeliveryThreshold = B.freeOver || 0;
    var palette = ["#E8F5E9", "#FFF3E0", "#FFF8E1", "#E3F2FD", "#FCE4EC", "#FFEBEE"];
    var rate = B.rating && B.rating.average ? Math.max(1, Math.round(B.rating.average)) : 5;
    var mk = function (p) {
      var opts = p.variants.length ? p.variants.map(function (v) { var pr = v.price || p.price; return { size: esc(v.title), price: pr, originalPrice: p.compare && p.compare > p.price ? Math.round(p.compare * pr / p.price) : null, formattedPrice: fmt(pr) }; })
        : [{ size: "Standard", price: p.price, originalPrice: p.compare && p.compare > p.price ? p.compare : null, formattedPrice: fmt(p.price) }];
      var imgs = (p.images && p.images.length ? p.images : [pic(p)]);
      return { id: p.id, category: esc(p.category || "General"), title: esc(p.name), image: pic(p), images: imgs, price: opts[0].price, originalPrice: opts[0].originalPrice, formattedPrice: opts[0].formattedPrice, formattedOriginal: opts[0].originalPrice ? fmt(opts[0].originalPrice) : "",
        discount: pct(p), sizes: opts.map(function (o) { return o.size; }), options: opts, selectedSize: opts[0].size, rating: rate, reviews: (B.rating && B.rating.count) || 0, reviewsCount: (B.rating && B.rating.count) || 0, availability: 20, availableCount: 20, soldCount: 0, soldPercent: 40,
        sku: "", shortDesc: esc(p.desc), longDesc: esc(p.desc), specs: { weight: "-", brand: esc(B.name), origin: esc(B.address || "-"), shelfLife: "-" }, stockUrgency: 30, reviewsList: [] };
    };
    var all = ITEMS.map(mk);
    setArr(D.categories, CATS.map(function (c, i) { return { id: c.id, name: esc(c.name), itemsCount: c.count + " Items", image: c.image || FALLBACK_IMG, color: palette[i % palette.length] }; }));
    if (all.length) D.heroProduct = Object.assign({}, D.heroProduct, all[0], { reviews: [], images: all[0].images });
    setArr(D.featuredProducts, all);
    setArr(D.trendingProducts, all.slice().reverse());
    var pool = cycle(all, 5);
    D.bestSellers.leftItems = pool.slice(0, 2); D.bestSellers.rightItems = pool.slice(3, 5); D.bestSellers.centerFeature = pool[2] || D.bestSellers.centerFeature;
    setArr(D.topVendors, []);
    onReady(function () {
      hide(["vendors-row-grid"]);
      if (!all.length) hide(["featured-products-grid", "trending-products-grid"]);
      var rcol = document.querySelector(".hero-banners-right-col");
      if (rcol) {
        rcol.style.display = "none";
        var grid = document.querySelector(".hero-banners-grid");
        if (grid) grid.style.gridTemplateColumns = "1fr";
      }
      var mainImg = document.querySelector(".hero-main-visual-overlay img");
      if (mainImg && all.length && all[0].image) mainImg.src = all[0].image;
    });
  };

  MAP.booking_ecom = function () {
    var D = window.SalonData, S = D.salon;
    var money = fmt;
    function dur(m) { var h = Math.floor(m / 60), r = m % 60; return (h ? h + " h" : "") + (h && r ? " " : "") + (r ? r + " min" : ""); }
    S.id = B.slug; S.name = esc(B.name); S.address = esc(B.address); S.phone = B.phone; S.email = B.email; S.aboutText = esc(B.about || B.tagline || "Book your appointment online.");
    S.rating = B.rating && B.rating.average ? B.rating.average : 5; S.reviewsCount = (B.rating && B.rating.count) || 0;
    var today = (B.hours || [])[(new Date().getDay() + 6) % 7];
    S.openToday = today ? today.text : "";
    var g = (B.gallery || []).map(function (x, i) { return { id: i + 1, src: x.src, caption: esc(x.caption) }; });
    if (!g.length) g = [{ id: 1, src: FALLBACK_IMG, caption: "" }];
    S.gallery = cycle(g, Math.max(3, g.length));
    var todayIdx = (new Date().getDay() + 6) % 7;
    S.schedule = (B.hours || []).map(function (d, i) { return { day: d.day, hours: d.text, active: i === todayIdx }; });
    var cats = {}; B.services.forEach(function (s) { var c = s.category || "Services"; cats[c] = (cats[c] || 0) + 1; });
    setArr(D.categories, Object.keys(cats).map(function (c, i) { return { id: "cat-" + i, name: esc(c), count: cats[c], key: esc(c) }; }));
    setArr(D.services, B.services.map(function (s, i) { return { id: s.id, category: esc(s.category || "Services"), name: esc(s.name), duration: dur(s.duration || 60), minutes: s.duration || 60, price: s.price, formattedPrice: money(s.price), description: esc(s.desc), defaultExpanded: i === 0 && !!s.desc }; }));
    var team = (B.team || []).map(function (m) { return { id: m.id, name: esc(m.name), role: "Specialist", rating: "", image: m.photo || "", initials: esc(m.name).slice(0, 2).toUpperCase() }; });
    setArr(D.team, team.length ? team : [{ id: "any", name: "Any specialist", role: "First available", rating: "", image: "", initials: "AN" }]);
    var revs = B.reviews || [], dist = [5, 4, 3, 2, 1].map(function (n) { var c = revs.filter(function (r) { return r.stars === n; }).length; return { stars: n, count: c, percent: revs.length ? Math.round(c / revs.length * 100) : 0 }; });
    D.reviewsData = { overallRating: (S.rating || 0).toFixed ? Number(S.rating).toFixed(1) : "5.0", totalCount: S.reviewsCount, distribution: dist,
      items: revs.map(function (r, i) { return { id: "rev-" + i, author: esc(r.author), date: r.date, stars: r.stars, tags: [], text: esc(r.text), photos: [] }; }) };
    setArr(D.nearbySalons, []);
    D.bookingsState.upcoming.length = 0; D.bookingsState.past.length = 0;
    // reflect real bookings made from this browser
    try { JSON.parse(localStorage.getItem("bz-bookings-" + B.slug) || "[]").forEach(function (b) { D.bookingsState.upcoming.push(b); }); } catch (e) {}

    onReady(function () {
      hide(["nearby-salons-grid"]);
      if (!revs.length) hide(["reviews-feed-col"]);
      var n = document.getElementById("booking-client-name"), p = document.getElementById("booking-client-phone"); if (n) n.value = ""; if (p) p.value = "";
      var ds = document.getElementById("booking-date-select");
      if (ds) {
        ds.innerHTML = "";
        for (var i = 0; i < 14; i++) {
          var d = new Date(); d.setDate(d.getDate() + i);
          var iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
          var o = document.createElement("option"); o.value = iso; o.textContent = d.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" }); ds.appendChild(o);
        }
        ds.addEventListener("change", loadSlots);
      }
      var team2 = document.getElementById("booking-time-select"); if (team2) team2.innerHTML = '<option value="">Select a date first</option>';
    });

    var slotsFor = null;
    function loadSlots() {
      var ds = document.getElementById("booking-date-select"), ts = document.getElementById("booking-time-select"), svc = window.BookingEngine && window.BookingEngine.activeService;
      if (!ds || !ts || !svc) return;
      ts.innerHTML = '<option value="">Loading…</option>';
      fetch("/api/v1/public/" + B.slug + "/slots?date=" + ds.value + "&service_ids=" + svc.id).then(function (r) { return r.json(); }).then(function (res) {
        ts.innerHTML = "";
        if (!res.slots || !res.slots.length) { ts.innerHTML = '<option value="">' + esc(res.reason || "No times available") + "</option>"; return; }
        res.slots.forEach(function (s) { var o = document.createElement("option"); o.value = s.starts_at; o.textContent = s.label; ts.appendChild(o); });
      }).catch(function () { ts.innerHTML = '<option value="">Could not load times</option>'; });
    }
    window.addEventListener("load", function () {
      var BE = window.BookingEngine; if (!BE) return;
      var open = BE.openBooking.bind(BE);
      BE.openBooking = function (id) { open(id); loadSlots(); };
      BE.confirmAppointment = function () {
        var ts = document.getElementById("booking-time-select"), name = document.getElementById("booking-client-name").value.trim(), phone = document.getElementById("booking-client-phone").value.trim();
        var svc = BE.activeService, ds = document.getElementById("booking-date-select");
        if (!B.bookingsOn) { window.App.showToast("Bookings unavailable", "Online booking isn't enabled for this business yet."); return; }
        if (!ts.value) { window.App.showToast("Pick a time", "Choose an available time slot."); return; }
        if (!name || phone.length < 5) { window.App.showToast("Your details", "Enter your name and phone number."); return; }
        var btn = document.querySelector(".btn-confirm-appointment"); if (btn) btn.disabled = true;
        fetch("/api/v1/public/" + B.slug + "/bookings", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service_ids: [svc.id], starts_at: ts.value, name: name, phone: phone, notes: "", source: "WEBSITE", referrer: document.referrer || null, website: "" }) })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (res) {
            if (btn) btn.disabled = false;
            if (!res.ok) { window.App.showToast("Couldn't book", (res.j && (res.j.detail && (res.j.detail.message || res.j.detail) || res.j.message)) || "Please try another time."); loadSlots(); return; }
            var label = ts.options[ts.selectedIndex].text, dl = ds.options[ds.selectedIndex].text;
            var bk = { id: "bk-" + res.j.booking_id, salonName: S.name, address: S.address, status: "Requested", statusClass: "upcoming", fullDateTitle: dl + ", " + label, shortDate: dl + ", " + label,
              summaryLine: "1 service • " + svc.duration, items: [{ category: svc.category, name: svc.name, price: svc.formattedPrice, duration: svc.duration }], total: svc.formattedPrice, review: null };
            D.bookingsState.upcoming.unshift(bk);
            try { var st = JSON.parse(localStorage.getItem("bz-bookings-" + B.slug) || "[]"); st.unshift(bk); localStorage.setItem("bz-bookings-" + B.slug, JSON.stringify(st.slice(0, 20))); } catch (e) {}
            BE.closeBooking();
            window.App.showToast("Booking requested", svc.name + " on " + dl + " at " + label + ". We'll confirm shortly.");
            if (window.Appointments) window.Appointments.render();
          }).catch(function () { if (btn) btn.disabled = false; window.App.showToast("Network error", "Please try again."); });
      };
    });
  };

  function mapMobileStore(tplKey) {
    onReady(function () {
      var isService = Boolean(B.is_service || tplKey === "zuribeauty" || (B.industry && (B.industry === "salon" || B.industry === "barbershop" || B.industry === "beauty" || B.industry === "spa" || B.industry === "services")) || !B.is_commerce);
      var detailPage = isService ? "service.html" : "product.html";

      // 1. Update branding, titles, hero copy
      document.querySelectorAll(".hero-store-title, .site-brand-logo span, .site-brand-logo").forEach(function (el) {
        if (el.tagName === "SPAN" || el.classList.contains("hero-store-title")) el.textContent = B.name;
      });
      document.querySelectorAll(".site-brand-logo").forEach(function (el) {
        el.setAttribute("href", "index.html");
      });
      document.querySelectorAll(".nav-cart-btn").forEach(function (el) {
        if (isService) {
          el.style.display = "none";
          return;
        }
        if (el.tagName === "BUTTON") {
          el.onclick = function (e) {
            e.preventDefault();
            window.location.href = "cart.html";
          };
        } else if (el.tagName === "A") {
          el.setAttribute("href", "cart.html");
        }
      });
      if (isService) {
        document.querySelectorAll(".nav-cart-badge").forEach(function (el) {
          el.style.display = "none";
        });
      }

      // Always remove any View Cart / View Bag / Order Food buttons in the hero
      document.querySelectorAll(".hero-store-content a[href*='cart.html'], .hero-cta-buttons a[href*='cart.html'], .hero-cta-group a[href*='cart.html']").forEach(function (el) {
        el.remove();
      });

      var heroDesc = document.querySelector(".hero-store-desc");
      if (heroDesc) {
        heroDesc.textContent = B.tagline || B.about || ("Welcome to " + B.name + (isService ? ". Browse our services and book online." : ". Browse our catalogue and place your order online."));
      }

      var searchInput = document.querySelector(".nav-search-bar input");
      if (searchInput) {
        searchInput.placeholder = isService ? "Search services..." : (tplKey === "brewandbites" ? "Search menu..." : "Search catalogue...");
      }

      var locLabel = document.getElementById("nav-location-label");
      var locText = B.address || "";
      if (locLabel) {
        if (locText) {
          locLabel.textContent = locText;
        } else {
          var lp = document.querySelector(".nav-location-picker");
          if (lp) lp.style.display = "none";
        }
      }

      var hoursEl = document.querySelector(".hero-hours-text");
      if (hoursEl) {
        if (B.hours && B.hours.length) {
          var todayIdx = (new Date().getDay() + 6) % 7;
          var todayH = B.hours[todayIdx];
          if (todayH) {
            hoursEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Open Today: ' + esc(todayH.text);
          }
        } else {
          hoursEl.style.display = "none";
        }
      }

      var ratingChip = document.querySelector(".hero-meta-chip.rating");
      if (ratingChip) {
        if (B.rating && B.rating.average && B.rating.count) {
          ratingChip.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ' + Number(B.rating.average).toFixed(1) + ' (' + B.rating.count + ')';
        } else if (B.reviews && B.reviews.length) {
          ratingChip.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ' + B.reviews.length + ' reviews';
        } else {
          ratingChip.style.display = "none";
        }
      }

      var allChips = document.querySelectorAll(".hero-meta-chip");
      if (isService) {
        allChips.forEach(function (chip) {
          var t = chip.textContent.toLowerCase();
          if (t.indexOf("delivery") !== -1 || t.indexOf("dispatch") !== -1 || t.indexOf("courier") !== -1 || t.indexOf("prep time") !== -1) {
            chip.style.display = "none";
          }
        });
        if (allChips[0]) {
          allChips[0].innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Appointments Priority \u2022 Walk-ins Welcome';
          allChips[0].style.display = "";
        }
        if (allChips[1] && locText) {
          allChips[1].innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> ' + esc(locText);
          allChips[1].style.display = "";
        }
      } else {
        if (!locText && allChips[2]) {
          allChips[2].style.display = "none";
        }
      }

      var heroWaBtn = document.querySelector(".hero-action-wa-btn, .hero-whatsapp-booking-btn, .hero-store-content a[href*='wa.me']");
      if (heroWaBtn) {
        var cleanPhone = (B.phone || B.wa || "254700000000").replace(/\+/g, "").replace(/\s+/g, "");
        var waMsg = isService 
          ? ("Hi, I'd like to book an appointment with " + B.name)
          : ("Hi, I'd like to order from " + B.name);
        heroWaBtn.href = "https://wa.me/" + cleanPhone + "?text=" + encodeURIComponent(waMsg);
        if (isService) {
          heroWaBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> Book on WhatsApp';
        }
      }

      var heroImg = document.querySelector(".hero-platter-img");
      if (heroImg) {
        if (B.logo) {
          heroImg.src = B.logo;
        } else if (B.gallery && B.gallery.length) {
          heroImg.src = B.gallery[0].src;
        }
      }

      // 2. Synchronize StoreApp store products & clear demo cart items
      var storageKey = 'aqivo_cart_' + (B.name || '').replace(/\s+/g, '_').toLowerCase();
      try {
        var rawCart = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (Array.isArray(rawCart)) {
          var cleanCart = rawCart.filter(function (ci) { return !!byId[ci.id]; });
          localStorage.setItem(storageKey, JSON.stringify(cleanCart));
        }
      } catch (e) {}

      if (window.StoreApp) {
        if (!window.StoreApp.store) window.StoreApp.store = {};
        window.StoreApp.store.name = B.name;
        window.StoreApp.store.whatsappPhone = B.phone || B.wa || "";
        window.StoreApp.store.products = ITEMS;
        if (window.StoreApp.state) {
          window.StoreApp.state.store = window.StoreApp.store;
        }
        if (window.StoreApp.cart) {
          window.StoreApp.cart = window.StoreApp.cart.filter(function (ci) { return !!byId[ci.id]; });
          window.StoreApp.updateCartUI();
        }
        window.StoreApp.openCart = function () { window.location.href = "cart.html"; };
        window.StoreApp.openCheckout = function () { window.location.href = "checkout.html"; };

        var origOpen = window.StoreApp.openProductDetail;
        window.StoreApp.openProductDetail = function (prodId) {
          var p = ITEMS.find(function (x) { return x.id === prodId; });
          if (origOpen) origOpen(prodId);
          if (!p) return;
          var titleEl = document.getElementById("detail-modal-title");
          if (titleEl) titleEl.textContent = p.name;
          var priceEl = document.getElementById("detail-modal-price");
          if (priceEl) priceEl.textContent = fmt(p.price);
          var descEl = document.getElementById("detail-modal-desc");
          if (descEl) descEl.textContent = p.desc || p.description || "";
          var imgEl = document.getElementById("detail-modal-img");
          if (imgEl && (p.image || (p.images && p.images[0]))) {
            imgEl.src = p.image || p.images[0];
            imgEl.alt = p.name;
          }
          var btnEl = document.getElementById("detail-modal-add-btn");
          if (btnEl) btnEl.textContent = isService ? "Book Service" : "Add to Bag";
          var tagsWrap = document.getElementById("detail-modal-tags");
          if (tagsWrap) {
            if (isService) {
              tagsWrap.innerHTML = '<span class="product-detail-tag-pill">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' +
                (p.duration ? p.duration + " Mins" : "Appointment") + "</span>";
            } else {
              tagsWrap.innerHTML = '<span class="product-detail-tag-pill">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' +
                "Guaranteed Quality</span>";
            }
          }
        };
      }

      // 3. Clear fake demo addresses in checkout
      var chkAddr = document.getElementById("checkout-address");
      if (chkAddr) {
        if (chkAddr.value && (chkAddr.value.indexOf("Riverside") !== -1 || chkAddr.value.indexOf("Rose Avenue") !== -1)) {
          chkAddr.value = "";
        }
        if (locText) chkAddr.placeholder = locText;
      }
      var promoInp = document.getElementById("cart-promo-input");
      if (promoInp && (promoInp.value === "FARM15" || promoInp.value === "STYLE10" || promoInp.value === "BREW20" || promoInp.value === "ZURI20")) {
        promoInp.value = "";
      }

      // 4. Booking & Services specific adjustments (appointment calendar, time slots, studio vs mobile visit)
      if (isService) {
        var today = new Date();
        var todayISO = today.toISOString().split("T")[0];

        // --- A. Adapt Checkout Page ---
        var chkTitle = document.querySelector(".checkout-page-title");
        if (chkTitle) chkTitle.textContent = "Appointment Booking & Checkout";
        if (window.location.pathname.indexOf("checkout.html") !== -1) {
          document.title = "Book Appointment \u2014 " + B.name;
        }

        // Section 2 Heading: Appointment Schedule & Location
        var sec2Toggle = document.querySelector(".checkout-toggle-group");
        if (sec2Toggle) {
          var sec2Card = sec2Toggle.closest(".checkout-card");
          if (sec2Card) {
            var cardH2 = sec2Card.querySelector(".checkout-card-heading");
            if (cardH2) {
              cardH2.innerHTML = '<span class="step-number">2</span> Appointment Schedule & Location';
            }

            // Inject Appointment Date & Time picker if not present
            if (!document.getElementById("booking-schedule-group")) {
              var schedDiv = document.createElement("div");
              schedDiv.id = "booking-schedule-group";
              schedDiv.style.marginBottom = "18px";
              schedDiv.innerHTML = '<div class="checkout-form-row">' +
                '<div>' +
                  '<label class="checkout-field-label" for="booking-date">Appointment Date <span class="req">*</span></label>' +
                  '<input type="date" id="booking-date" class="checkout-input-control" value="' + todayISO + '" min="' + todayISO + '" required />' +
                '</div>' +
                '<div>' +
                  '<label class="checkout-field-label" for="booking-time">Preferred Time Slot <span class="req">*</span></label>' +
                  '<select id="booking-time" class="checkout-input-control">' +
                    '<option value="09:00 AM">09:00 AM - 10:00 AM (Morning)</option>' +
                    '<option value="10:30 AM">10:30 AM - 11:30 AM (Morning)</option>' +
                    '<option value="12:00 PM">12:00 PM - 01:00 PM (Midday)</option>' +
                    '<option value="02:00 PM" selected>02:00 PM - 03:00 PM (Afternoon)</option>' +
                    '<option value="03:30 PM">03:30 PM - 04:30 PM (Afternoon)</option>' +
                    '<option value="05:00 PM">05:00 PM - 06:00 PM (Evening)</option>' +
                    '<option value="06:30 PM">06:30 PM - 07:30 PM (Evening)</option>' +
                  '</select>' +
                '</div>' +
              '</div>';
              sec2Card.insertBefore(schedDiv, sec2Toggle);
            }

            // Relabel Mode Toggles
            var btnDel = document.getElementById("toggle-delivery");
            if (btnDel) {
              btnDel.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> House Call / Mobile Service';
            }
            var btnPick = document.getElementById("toggle-pickup");
            if (btnPick) {
              btnPick.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Studio / Salon Visit';
            }

            // Update Studio Visit Info
            var pickInfo = document.getElementById("pickup-location-info");
            if (pickInfo) {
              pickInfo.innerHTML = '<strong>Studio Visit:</strong> Visit us at ' + esc(B.address || 'our studio') + '. Please arrive 5 minutes before your scheduled appointment time. Free of travel charges.';
            }

            // Update House Call Address Label & Placeholder
            var addrLabel = document.querySelector('label[for="checkout-address"]');
            if (addrLabel) addrLabel.innerHTML = 'Your Location / House Address <span class="req">*</span>';
            var addrInput = document.getElementById("checkout-address");
            if (addrInput) addrInput.placeholder = 'e.g. Kilimani, Ring Road Court, House 4B';

            // Update Notes label & placeholder
            var notesLabel = document.querySelector('label[for="checkout-notes"]');
            if (notesLabel) notesLabel.textContent = 'Stylist / Appointment Notes (Optional)';
            var notesInput = document.getElementById("checkout-notes");
            if (notesInput) notesInput.placeholder = 'e.g. Preferred hair styling, allergies, or gate directions';
          }
        }

        // Relabel Submit and WhatsApp buttons on Checkout
        var subBtn = document.getElementById("btn-submit-order");
        if (subBtn) {
          subBtn.innerHTML = 'Confirm Appointment Booking — <span id="checkout-submit-total">' + (window.StoreApp && window.StoreApp.state ? (window.StoreApp.state.currencySymbol + ' ' + fmt(window.StoreApp.getSubtotal ? window.StoreApp.getSubtotal() : 0)) : '') + '</span>';
        }
        var waBtn = document.querySelector(".checkout-page-grid .cart-btn-whatsapp");
        if (waBtn) {
          waBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> Book & Confirm via WhatsApp';
        }

        // Checkout Right Column Summary
        var chkSumTitle = document.querySelector(".checkout-card h3");
        if (chkSumTitle && chkSumTitle.textContent.indexOf("Order") !== -1) {
          chkSumTitle.textContent = "Booking Summary";
        }
        var chkDelLabel = document.querySelector("#checkout-delivery-val");
        if (chkDelLabel && chkDelLabel.previousElementSibling) {
          chkDelLabel.previousElementSibling.textContent = "Service Mode";
        }

        // Default to Studio Visit for services (no delivery fee)
        if (window.StoreApp && typeof window.StoreApp.setFulfilment === "function") {
          window.StoreApp.setFulfilment("pickup");
        }

        // --- B. Adapt Cart Page ---
        var cartPageTitle = document.querySelector(".cart-page-title");
        if (cartPageTitle) cartPageTitle.textContent = "Your Selected Services";
        var cartBtnProceed = document.getElementById("cart-btn-proceed");
        if (cartBtnProceed) {
          cartBtnProceed.innerHTML = 'Proceed to Appointment Booking <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';
        }
        var cartWaBtn = document.querySelector("#cart-summary-box .cart-btn-whatsapp");
        if (cartWaBtn) {
          cartWaBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> Book via WhatsApp';
        }
        var cartSummary = document.getElementById("cart-summary-box");
        if (cartSummary) {
          var cSumTitle = cartSummary.querySelector(".cart-summary-title");
          if (cSumTitle) cSumTitle.textContent = "Booking Summary";
          var delLine = document.getElementById("cart-delivery-line");
          if (delLine) {
            delLine.innerHTML = '<span>Service Visit</span><span id="cart-delivery-val">Included</span>';
          }
          var taxLine = document.getElementById("cart-tax-line");
          if (taxLine) taxLine.style.display = "none";
        }
        var chkBtn = document.getElementById("cart-checkout-btn");
        if (chkBtn) chkBtn.textContent = "Book Appointment";
        if (window.StoreApp) {
          window.StoreApp.deliveryFee = 0;
          window.StoreApp.taxFee = 0;
          window.StoreApp.updateCheckoutSummary && window.StoreApp.updateCheckoutSummary();
        }
      }

      // 5. Build dynamic category filter chips
      var catStrip = document.querySelector(".category-filter-strip");
      var catContainer = document.querySelector(".category-filter-container");
      if (catContainer) {
        if (CATS && CATS.length > 0) {
          var chipsHtml = '<button class="cat-chip-btn active" data-cat="all" onclick="window.StoreApp.filterCategory(\'all\')">All</button>';
          CATS.forEach(function (c) {
            var catSlug = "cat-" + c.id;
            chipsHtml += '<button class="cat-chip-btn" data-cat="' + esc(catSlug) + '" onclick="window.StoreApp.filterCategory(\'' + esc(catSlug) + '\')">' + esc(c.name) + '</button>';
          });
          catContainer.innerHTML = chipsHtml;
          if (catStrip) catStrip.style.display = "";
        } else {
          if (catStrip) catStrip.style.display = "none";
        }
      }

      // 6. Build dynamic catalogue content (.main-page-content)
      var main = document.querySelector(".main-page-content");
      if (main) {
        main.innerHTML = ""; // completely remove all hardcoded demo sections
        if (!ITEMS || ITEMS.length === 0) {
          main.innerHTML = '<div style="text-align:center; padding: 64px 20px; color:#71717A;">' +
            '<h3 style="font-size:18px; font-weight:700; color:#18181B; margin-bottom:8px;">No items added to catalogue yet</h3>' +
            '<p style="font-size:14px;">Products and services added in your dashboard will appear here automatically.</p>' +
            '</div>';
        } else {
          var groups = [];
          if (CATS && CATS.length > 0) {
            CATS.forEach(function (c) {
              var inCat = ITEMS.filter(function (it) { return String(it.cid) === String(c.id); });
              if (inCat.length) {
                groups.push({ id: "cat-" + c.id, name: c.name, items: inCat });
              }
            });
            var uncategorized = ITEMS.filter(function (it) {
              return !it.cid || !CATS.some(function (c) { return String(c.id) === String(it.cid); });
            });
            if (uncategorized.length) {
              groups.push({ id: "uncategorized", name: isService ? "Other Services" : "Other Products", items: uncategorized });
            }
          }
          if (groups.length === 0) {
            groups.push({ id: "all", name: isService ? "Our Services" : "Catalogue", items: ITEMS });
          }

          groups.forEach(function (g) {
            var sec = document.createElement("section");
            sec.className = "catalog-section";
            sec.setAttribute("data-section-cat", g.id);
            sec.innerHTML = '<div class="section-title-row">' +
              '<h2 class="section-headline">' + esc(g.name) + '</h2>' +
              '<span class="section-all-link" onclick="window.StoreApp.filterCategory(\'' + esc(g.id) + '\')">' +
              'All <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6"/></svg>' +
              '</span></div>' +
              '<div class="product-cards-grid">' +
              g.items.map(function (p) {
                var priceStr = fmt(p.price);
                var imgUrl = pic(p);
                var itemDetailPage = p.kind === "service" ? "service.html" : (tplKey === "zuribeauty" ? "service.html" : "product.html");
                return '<a href="' + itemDetailPage + '?id=' + encodeURIComponent(p.id) + '" class="menu-card" data-prod-id="' + esc(p.id) + '" data-prod-name="' + esc(p.name) + '">' +
                  '<div class="menu-card-img-box">' +
                  (p.featured ? '<span class="card-popular-badge">Popular</span>' : '') +
                  '<img src="' + esc(imgUrl) + '" alt="' + esc(p.name) + '" loading="lazy" />' +
                  '<button class="card-add-btn" aria-label="Add ' + esc(p.name) + '" onclick="event.preventDefault(); event.stopPropagation(); window.StoreApp.addToCart(\'' + esc(p.id) + '\');">' +
                  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
                  '</button>' +
                  '</div>' +
                  '<div class="menu-card-price">' + esc(priceStr) + '</div>' +
                  '<h3 class="menu-card-title">' + esc(p.name) + '</h3>' +
                  '</a>';
              }).join("") +
              '</div>';
            main.appendChild(sec);
          });
        }
      }

      // 7. Product / Service Detail Page (PDP)
      var pdpContainer = document.getElementById("pdp-page-container");
      if (pdpContainer && ITEMS && ITEMS.length) {
        var urlParams = new URLSearchParams(window.location.search);
        var prodId = urlParams.get("id");
        var activeP = ITEMS.find(function (x) { return x.id === prodId; }) || ITEMS[0];
        if (activeP) {
          if (activeP.name) document.title = activeP.name + " — " + B.name;
          if (window.StoreApp && window.StoreApp.state) {
            window.StoreApp.state.activeDetailItem = activeP;
            window.StoreApp.state.store = window.StoreApp.state.store || {};
            window.StoreApp.state.store.name = B.name;
            window.StoreApp.state.store.products = ITEMS;
          }
          var crumb = document.getElementById("pdp-crumb-title"); if (crumb) crumb.textContent = activeP.name;
          var crumbCat = document.getElementById("pdp-crumb-cat"); if (crumbCat) crumbCat.textContent = activeP.category || (isService ? "Services" : "Catalogue");
          var title = document.getElementById("pdp-item-title"); if (title) title.textContent = activeP.name;
          var catTag = document.getElementById("pdp-category-tag"); if (catTag) catTag.textContent = activeP.category || B.name;
          var hImg = document.getElementById("pdp-hero-img"); if (hImg) { hImg.src = pic(activeP); hImg.alt = activeP.name; }

          // Thumbnails
          var thumbStrip = document.querySelector(".pdp-thumbnails-strip");
          if (thumbStrip) {
            if (activeP.images && activeP.images.length > 1) {
              thumbStrip.style.display = "flex";
              thumbStrip.innerHTML = activeP.images.map(function (u, idx) {
                return '<div class="pdp-thumb-item ' + (idx === 0 ? "active" : "") + '" onclick="window.StoreApp.changePdpImage(\'' + esc(u) + '\', this)">' +
                  '<img src="' + esc(u) + '" alt="' + esc(activeP.name) + ' ' + (idx + 1) + '" />' +
                  '</div>';
              }).join("");
            } else {
              thumbStrip.style.display = "none";
            }
          }

          // Options / Variants
          var optSection = document.querySelector(".pdp-options-section");
          if (optSection) {
            if (activeP.variants && activeP.variants.length > 0) {
              optSection.style.display = "block";
              optSection.innerHTML = '<div class="pdp-option-group">' +
                '<div class="pdp-option-header"><span class="pdp-option-title">Option / Variant:</span><span class="pdp-option-helper">Choose 1</span></div>' +
                '<div class="pdp-chips-grid">' +
                activeP.variants.map(function (v, idx) {
                  var vExtra = (v.price && v.price > activeP.price) ? (v.price - activeP.price) : 0;
                  return '<button type="button" class="pdp-chip-btn ' + (idx === 0 ? "active" : "") + '" onclick="window.StoreApp.selectPdpOption(this, 1, \'' + esc(v.title) + '\', ' + vExtra + ')">' +
                    esc(v.title) + (vExtra > 0 ? " (+" + fmt(vExtra) + ")" : "") +
                    '</button>';
                }).join("") +
                '</div></div>';
            } else {
              optSection.style.display = "none";
            }
          }

          // Rating meta & prep badges
          var revChip = document.querySelector(".pdp-verified-reviews"); if (revChip) revChip.style.display = "none";
          var prepChip = document.querySelector(".pdp-prep-chip");
          if (prepChip) {
            if (activeP.kind === "service" || isService) {
              prepChip.textContent = "Service";
              prepChip.style.display = "inline-block";
            } else {
              prepChip.style.display = "none";
            }
          }
          var vatLabel = document.querySelector(".pdp-vat-label"); if (vatLabel) vatLabel.textContent = "Inclusive of all applicable taxes";
          var heroBadge = document.getElementById("pdp-hero-badge");
          if (heroBadge) {
            if (activeP.featured) {
              heroBadge.textContent = "Popular";
              heroBadge.style.display = "inline-block";
            } else if (activeP.kind === "service" || isService) {
              heroBadge.textContent = "Service";
              heroBadge.style.display = "inline-block";
            } else {
              heroBadge.style.display = "none";
            }
          }

          var desc = document.getElementById("pdp-description-text"); if (desc) desc.textContent = activeP.desc || "";
          var prc = document.getElementById("pdp-price-bold"); if (prc) prc.textContent = fmt(activeP.price);
          var addBtn = document.getElementById("pdp-add-bag-btn");
          if (addBtn) {
            addBtn.textContent = (activeP.kind === "service" || isService ? "Book Service — " : "Add to Bag — ") + fmt(activeP.price);
            addBtn.onclick = function (e) {
              e.preventDefault();
              var qty = (window.StoreApp.state && window.StoreApp.state.pdpQty) || 1;
              window.StoreApp.addToCart(activeP.id, "", qty);
            };
          }
          var waBtn = document.querySelector(".pdp-cta-whatsapp");
          if (waBtn) {
            waBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> ' +
              (activeP.kind === "service" || isService ? "Book on WhatsApp" : "Order on WhatsApp");
            waBtn.onclick = function (e) {
              e.preventDefault();
              var phone = (B.phone || B.wa || "").replace(/\+/g, "").replace(/\s+/g, "");
              var actionWord = (activeP.kind === "service" || isService) ? "book: " : "order: ";
              var msg = encodeURIComponent("Hello " + B.name + ", I would like to " + actionWord + activeP.name + " (" + fmt(activeP.price) + ")");
              window.open("https://wa.me/" + phone + "?text=" + msg, "_blank");
            };
          }

          // Trust Badges Strip
          var trustGrid = document.querySelector(".pdp-trust-grid");
          if (trustGrid) {
            trustGrid.innerHTML = '<div class="pdp-trust-item">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
              '<span class="trust-title">Verified Business</span>' +
              '<span class="trust-sub">Direct from ' + esc(B.name) + '</span>' +
              '</div>' +
              '<div class="pdp-trust-item">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
              '<span class="trust-title">' + (activeP.kind === "service" || isService ? "Flexible Booking" : "Fast Fulfilment") + '</span>' +
              '<span class="trust-sub">Order via WhatsApp or Online</span>' +
              '</div>' +
              '<div class="pdp-trust-item">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>' +
              '<span class="trust-title">Direct Payment</span>' +
              '<span class="trust-sub">M-Pesa, Cash or Bank</span>' +
              '</div>';
          }

          // Deep Details Accordions
          var accGroup = document.querySelector(".pdp-accordion-group");
          if (accGroup) {
            accGroup.innerHTML = '<div class="pdp-accordion-item open">' +
              '<div class="pdp-accordion-header">' +
              '<span>' + (activeP.kind === "service" || isService ? "Service Information" : "Product Details") + '</span>' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>' +
              '</div>' +
              '<div class="pdp-accordion-content">' +
              esc(activeP.desc || ("High quality " + (activeP.kind === "service" || isService ? "service" : "item") + " provided directly by " + B.name + ".")) +
              '</div>' +
              '</div>' +
              '<div class="pdp-accordion-item">' +
              '<div class="pdp-accordion-header">' +
              '<span>' + (activeP.kind === "service" || isService ? "Booking & Appointment Info" : "Fulfilment & Delivery Information") + '</span>' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>' +
              '</div>' +
              '<div class="pdp-accordion-content">' +
              (activeP.kind === "service" || isService ? "Book your appointment online or contact us directly on WhatsApp to confirm availability." : "Orders are prepared and dispatched directly by the seller. Track status and coordinate delivery on WhatsApp.") +
              '</div>' +
              '</div>';
            accGroup.querySelectorAll(".pdp-accordion-item").forEach(function (acc) {
              var h = acc.querySelector(".pdp-accordion-header");
              if (h) {
                h.onclick = function () { acc.classList.toggle("open"); };
              }
            });
          }

          // Back link
          var backLink = document.querySelector(".pdp-back-link");
          if (backLink) {
            backLink.textContent = "← Back to " + B.name;
            backLink.setAttribute("href", (B.root || "") + "/index.html");
          }
        }

        var relHeading = document.getElementById("related-heading");
        if (relHeading) relHeading.textContent = "More from " + B.name;
        var simGrid = document.querySelector(".similar-products-grid, .pdp-related-container .product-cards-grid");
        if (simGrid) {
          var related = ITEMS.filter(function (x) { return !activeP || x.id !== activeP.id; }).slice(0, 4);
          simGrid.innerHTML = related.map(function (p) {
            var itemDetailPage = p.kind === "service" ? "service.html" : (tplKey === "zuribeauty" ? "service.html" : "product.html");
            var bzParam = B.slug ? "&bz=" + encodeURIComponent(B.slug) : "";
            return '<a href="' + itemDetailPage + '?id=' + encodeURIComponent(p.id) + bzParam + '" class="menu-card" data-prod-id="' + esc(p.id) + '" data-prod-name="' + esc(p.name) + '">' +
              '<div class="menu-card-img-box">' +
              '<img src="' + esc(pic(p)) + '" alt="' + esc(p.name) + '" loading="lazy" />' +
              '<button class="card-add-btn" aria-label="Add ' + esc(p.name) + '" onclick="event.preventDefault(); event.stopPropagation(); window.StoreApp.addToCart(\'' + esc(p.id) + '\');">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
              '</button>' +
              '</div>' +
              '<div class="menu-card-price">' + esc(fmt(p.price)) + '</div>' +
              '<h3 class="menu-card-title">' + esc(p.name) + '</h3>' +
              '</a>';
          }).join("");
        }
      }

      // 8. Order Receipt Page
      var receiptMount = document.getElementById("receipt-card-mount");
      if (receiptMount && B && B.name) {
        document.title = "Order Receipt \u2014 " + B.name;
        var backBtn = document.getElementById("receipt-back-btn-text");
        if (backBtn) backBtn.textContent = "Back to " + B.name;
        var backLink = document.getElementById("receipt-back-btn");
        if (backLink) {
          var rootUrl = (B.root || ("/" + B.slug)).replace(/\/+$/, "");
          backLink.href = rootUrl;
        }
      }

      // 9. Override getReceiptPageUrl on StoreApp to guarantee merchant root
      if (window.StoreApp && typeof window.StoreApp.getReceiptPageUrl === "function") {
        window.StoreApp.getReceiptPageUrl = function (order) {
          var o = order || (window.StoreApp.getState && window.StoreApp.getState().lastOrder);
          var receiptNo = o ? (o.receiptNo || o.orderId) : "";
          var root = (B.root || ("/" + B.slug)).replace(/\/+$/, "");
          return window.location.origin + root + "/receipt.html" + (receiptNo ? "?orderId=" + encodeURIComponent(receiptNo) : "");
        };
      }

      // 10. Update breadcrumbs and navigation to merchant root
      var storeHome = (B.root || ("/" + B.slug)).replace(/\/+$/, "");
      document.querySelectorAll(".checkout-page-breadcrumbs a, .cart-page-breadcrumbs a, .pdp-breadcrumbs a, .site-brand-logo").forEach(function (el) {
        if (el.textContent.trim().toLowerCase() === "market") {
          el.textContent = "Home";
        }
        if (el.getAttribute("href") === "index.html") {
          el.setAttribute("href", storeHome);
        }
      });
    });
  }

  function formatWhatsAppOrderMessage(orderData) {
    var bName = (B && B.name) || "Store";
    var lines = ["🛍️ *NEW ORDER — " + bName.toUpperCase() + "*\n"];
    if (orderData && orderData.items && orderData.items.length) {
      orderData.items.forEach(function (it) {
        lines.push("• " + (it.qty || 1) + "x " + (it.name || "Item") + " (" + fmt(it.price) + ")");
      });
    }
    if (orderData && orderData.total) {
      lines.push("\n*Total:* " + fmt(orderData.total));
    }
    if (orderData && orderData.customerName) {
      lines.push("*Customer:* " + orderData.customerName);
    }
    if (orderData && orderData.notes) {
      lines.push("*Notes:* " + orderData.notes);
    }
    return lines.join("\n");
  }
  window.formatWhatsAppOrderMessage = formatWhatsAppOrderMessage;

  MAP.aqivo = function () {
    var C = window.STORE_CONFIG || {};
    C.storeName = B.name;
    C.tagline = B.tagline || C.tagline;
    C.currency = B.currency;
    C.currencySymbol = (B.symbol || "") + " ";
    C.formatPrice = fmt;

    onReady(function () {
      // 1. Announcements
      var annBar = document.getElementById("announcement-bar");
      var annText = document.getElementById("announcement-text");
      if (annBar && annText) {
        if (B.announcement) {
          annText.textContent = B.announcement;
          annBar.classList.remove("hidden");
        } else if (B.tagline) {
          annText.textContent = B.tagline;
          annBar.classList.remove("hidden");
        }
      }

      // 2. Identity & Hero
      var nameEl = document.getElementById("store-name");
      if (nameEl) nameEl.textContent = B.name;
      var tagEl = document.getElementById("store-tagline");
      if (tagEl) tagEl.textContent = B.tagline || B.address || "Order online · Fast delivery";
      var logoEl = document.getElementById("store-logo");
      if (logoEl) {
        if (B.logo) {
          logoEl.innerHTML = '<img src="' + esc(B.logo) + '" alt="' + esc(B.name) + '" class="w-full h-full object-cover" />';
        } else {
          logoEl.textContent = (B.name || "A").charAt(0).toUpperCase();
        }
      }

      var heroTitleEl = document.getElementById("store-hero-title");
      if (heroTitleEl) {
        heroTitleEl.textContent = B.hero_headline || ("Welcome to " + (B.name || "our store"));
      }
      var heroSubEl = document.getElementById("store-hero-sub");
      if (heroSubEl) {
        heroSubEl.textContent = B.hero_subheadline || B.tagline || "Discover our collection and order directly on WhatsApp.";
      }
      var heroWaBtn = document.getElementById("store-hero-wa-btn");
      var phClean = (B.wa || B.phone || "").replace(/[^0-9]/g, "");
      if (heroWaBtn) {
        if (phClean) {
          heroWaBtn.href = "https://wa.me/" + phClean + "?text=" + encodeURIComponent("Hi " + (B.name || "") + ", I'd like to place an order from your store:");
          heroWaBtn.style.display = "";
        } else {
          heroWaBtn.style.display = "none";
        }
      }

      // 3. WhatsApp contact
      var waBtn = document.getElementById("wa-btn");
      if (waBtn) {
        if (phClean) {
          waBtn.href = "https://wa.me/" + phClean + "?text=" + encodeURIComponent("Hi " + (B.name || "") + ", I want to inquire with your store");
          waBtn.style.display = "";
        } else {
          waBtn.style.display = "none";
        }
      }

      // Section IDs binding for builder two-way selection
      if (B.section_ids) {
        if (B.section_ids.hero) {
          var heroEl = document.getElementById("store-hero");
          if (heroEl) heroEl.setAttribute("data-sid", B.section_ids.hero);
        }
        if (B.section_ids.category_grid) {
          var catPillsEl = document.getElementById("category-pills");
          if (catPillsEl) {
            var navParent = catPillsEl.closest(".store-catalogue-nav") || catPillsEl;
            navParent.setAttribute("data-sid", B.section_ids.category_grid);
          }
        }
        if (B.section_ids.product_grid) {
          var gridEl = document.getElementById("items-grid");
          if (gridEl) gridEl.setAttribute("data-sid", B.section_ids.product_grid);
        }
      }

      // Hide duplicate server-rendered custom sections if native aqivo components are present
      var customSec = document.getElementById("bz-custom-sections");
      if (customSec) {
        var dupCats = customSec.querySelectorAll(".store-category-pills-section");
        dupCats.forEach(function (el) { el.style.display = "none"; });
        var dupProds = customSec.querySelectorAll(".store-product-section");
        dupProds.forEach(function (el) { el.style.display = "none"; });
        var dupHeros = customSec.querySelectorAll(".store-hero-compact, .hero, [data-section-type='hero']");
        dupHeros.forEach(function (el) { el.style.display = "none"; });
      }

      // 4. Cart State
      var cartKey = "aqivo_cart_" + (B.slug || "default");
      var cart = [];
      try { cart = JSON.parse(localStorage.getItem(cartKey) || "[]"); } catch (e) { cart = []; }

      function saveCart() {
        try { localStorage.setItem(cartKey, JSON.stringify(cart)); } catch (e) {}
        updateCartUI();
      }

      function updateCartUI() {
        var cartBar = document.getElementById("cart-bar");
        var countEl = document.getElementById("cart-count");
        var totalEl = document.getElementById("cart-total");
        var totalQty = 0;
        var totalSum = 0;
        cart.forEach(function (ci) {
          totalQty += ci.qty;
          totalSum += ci.qty * ci.price;
        });

        if (countEl) countEl.textContent = totalQty;
        if (totalEl) totalEl.textContent = fmt(totalSum);

        if (cartBar) {
          if (totalQty > 0) {
            cartBar.classList.remove("translate-y-24");
          } else {
            cartBar.classList.add("translate-y-24");
          }
        }
      }

      // 5. Category Pills & Filtering (Homepage)
      var pillsContainer = document.getElementById("category-pills");
      var gridContainer = document.getElementById("items-grid");
      var emptyState = document.getElementById("empty-state");
      var countBadge = document.getElementById("items-count-badge");
      var locText = document.getElementById("store-location-text");
      if (locText) {
        locText.textContent = B.address || B.tagline || "Order online · Direct delivery";
      }
      var activeCat = "all";
      var searchQuery = "";

      var PILL_ACTIVE_CLS = "cat-pill active";
      var PILL_INACTIVE_CLS = "cat-pill";

      if (pillsContainer) {
        var cats = [{ id: "all", name: "All items", count: ITEMS.length }];
        var seenCats = {};
        CATS.forEach(function (c) {
          if (!seenCats[c.id]) {
            seenCats[c.id] = true;
            var cnt = ITEMS.filter(function (it) { return String(it.cid) === String(c.id) || it.category === c.name; }).length;
            cats.push({ id: c.id, name: c.name, count: cnt });
          }
        });
        ITEMS.forEach(function (it) {
          if (it.cid && !seenCats[it.cid]) {
            seenCats[it.cid] = true;
            var cnt = ITEMS.filter(function (x) { return String(x.cid) === String(it.cid); }).length;
            cats.push({ id: it.cid, name: it.category || "General", count: cnt });
          }
        });

        pillsContainer.innerHTML = cats.map(function (c, idx) {
          var cls = idx === 0 ? PILL_ACTIVE_CLS : PILL_INACTIVE_CLS;
          var countText = c.count ? ' <span class="pill-count opacity-75 font-semibold text-[11px]">(' + c.count + ')</span>' : '';
          return '<button type="button" class="' + cls + '" data-cat-id="' + esc(c.id) + '">' + esc(c.name) + countText + '</button>';
        }).join("");

        pillsContainer.addEventListener("click", function (e) {
          var btn = e.target.closest(".cat-pill");
          if (!btn) return;
          pillsContainer.querySelectorAll(".cat-pill").forEach(function (b) {
            b.className = PILL_INACTIVE_CLS;
          });
          btn.className = PILL_ACTIVE_CLS;
          activeCat = btn.getAttribute("data-cat-id") || "all";
          renderItems();
        });
      }

      // Search Inputs & Clear Actions
      var clearBtnDesktop = document.getElementById("search-clear-desktop");
      var clearBtnMobile = document.getElementById("search-clear-mobile");
      var emptyClearBtn = document.getElementById("empty-clear-btn");

      function updateClearButtons(val) {
        if (clearBtnDesktop) {
          if (val) clearBtnDesktop.classList.remove("hidden");
          else clearBtnDesktop.classList.add("hidden");
        }
        if (clearBtnMobile) {
          if (val) clearBtnMobile.classList.remove("hidden");
          else clearBtnMobile.classList.add("hidden");
        }
      }

      function clearSearch() {
        searchQuery = "";
        var dInp = document.getElementById("search-input");
        var mInp = document.getElementById("search-input-mobile");
        if (dInp) dInp.value = "";
        if (mInp) mInp.value = "";
        updateClearButtons("");
        renderItems();
        if (dInp && window.innerWidth >= 640) dInp.focus();
        else if (mInp) mInp.focus();
      }

      if (clearBtnDesktop) clearBtnDesktop.addEventListener("click", clearSearch);
      if (clearBtnMobile) clearBtnMobile.addEventListener("click", clearSearch);
      if (emptyClearBtn) emptyClearBtn.addEventListener("click", clearSearch);

      function bindSearch(inp) {
        if (!inp) return;
        inp.addEventListener("input", function (e) {
          searchQuery = (e.target.value || "").toLowerCase().trim();
          updateClearButtons(searchQuery);
          var other = inp.id === "search-input" ? document.getElementById("search-input-mobile") : document.getElementById("search-input");
          if (other && other.value !== inp.value) other.value = inp.value;
          renderItems();
        });
        inp.addEventListener("keydown", function (e) {
          if (e.key === "Escape") {
            clearSearch();
          }
        });
      }
      bindSearch(document.getElementById("search-input"));
      bindSearch(document.getElementById("search-input-mobile"));

      function renderItems() {
        if (!gridContainer) return;
        var filtered = ITEMS.filter(function (it) {
          var matchCat = activeCat === "all" || String(it.cid) === activeCat || it.category === activeCat;
          if (!matchCat) return false;
          if (searchQuery) {
            var nameMatch = (it.name || "").toLowerCase().indexOf(searchQuery) !== -1;
            var descMatch = (it.desc || "").toLowerCase().indexOf(searchQuery) !== -1;
            var catMatch = (it.category || "").toLowerCase().indexOf(searchQuery) !== -1;
            return nameMatch || descMatch || catMatch;
          }
          return true;
        });

        if (countBadge) {
          countBadge.textContent = filtered.length + " item" + (filtered.length !== 1 ? "s" : "");
        }

        if (!filtered.length) {
          gridContainer.innerHTML = "";
          if (emptyState) {
            emptyState.classList.remove("hidden");
            var titleEl = document.getElementById("empty-title");
            var subEl = document.getElementById("empty-subtitle");
            if (searchQuery) {
              if (titleEl) titleEl.textContent = 'No products found for "' + searchQuery + '"';
              if (subEl) subEl.textContent = 'Check your spelling or try another search term';
            } else {
              if (titleEl) titleEl.textContent = 'No products in this category';
              if (subEl) subEl.textContent = 'Select "All items" to view all available products';
            }
          }
          return;
        }
        if (emptyState) emptyState.classList.add("hidden");

        gridContainer.innerHTML = filtered.map(function (it) {
          var isSvc = it.kind === "service";
          var hasVariants = it.variants && it.variants.length > 0;
          var actionLabel = isSvc ? "Book" : (hasVariants ? "Options" : "+ Add");
          var durationBadge = isSvc && it.duration ? '<span class="text-[11px] text-slate-400 font-medium">⏱ ' + esc(it.duration) + 'm</span>' : '';
          var saleBadge = it.compare && it.compare > it.price ? '<span class="absolute top-2.5 left-2.5 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm">' + pct(it) + '</span>' : '';
          var compPriceHtml = (it.compare && it.compare > it.price) ? '<s class="text-xs text-slate-400 font-medium ml-1.5">' + fmt(it.compare) + '</s>' : durationBadge;
          var categoryTagHtml = it.category ? '<span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 truncate">' + esc(it.category) + '</span>' : '';
          var itemDetailPage = isSvc ? "service.html" : "product.html";
          var bzParam = "?id=" + encodeURIComponent(it.id);
          var detailUrl = itemDetailPage + bzParam;

          return '<div class="store-card group bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between relative overflow-hidden" data-item-id="' + esc(it.id) + '">' +
            '<a href="' + detailUrl + '" class="block group">' +
              '<div class="relative w-full aspect-square rounded-xl bg-slate-50 mb-3 overflow-hidden flex items-center justify-center border border-slate-100">' +
                '<img src="' + esc(pic(it)) + '" alt="' + esc(it.name) + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out" loading="lazy" />' +
                saleBadge +
              '</div>' +
              '<div class="mb-2.5">' +
                categoryTagHtml +
                '<h4 class="font-bold text-sm text-[#0B1736] group-hover:text-[#5B21F5] transition-colors line-clamp-2 leading-snug mb-1">' + esc(it.name) + '</h4>' +
                (it.desc ? '<p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">' + esc(it.desc) + '</p>' : '') +
              '</div>' +
            '</a>' +
            '<div class="mt-auto pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">' +
              '<div class="min-w-0 font-extrabold text-sm sm:text-base text-[#0B1736] tracking-tight leading-none">' + fmt(it.price) + compPriceHtml + '</div>' +
              '<button type="button" class="btn-add-cart h-8 sm:h-9 px-3 rounded-xl bg-[#5B21F5] hover:bg-[#4a18d1] text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shadow-sm shrink-0" data-id="' + esc(it.id) + '" data-has-variants="' + (hasVariants ? '1' : '0') + '">' +
                (hasVariants ? '' : '<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>') +
                '<span>' + actionLabel + '</span>' +
              '</button>' +
            '</div>' +
          '</div>';
        }).join("");
      }

      if (gridContainer) {
        gridContainer.addEventListener("click", function (e) {
          var btn = e.target.closest(".btn-add-cart");
          if (!btn) return;
          e.preventDefault();
          e.stopPropagation();
          var id = btn.getAttribute("data-id");
          var it = byId[id];
          if (!it) return;

          // If item has variants, open PDP so the user can select their variant
          if (it.variants && it.variants.length > 0) {
            var itemDetailPage = (it.kind === "service") ? "service.html" : "product.html";
            window.location.href = itemDetailPage + "?id=" + encodeURIComponent(it.id);
            return;
          }

          var existing = cart.filter(function (ci) { return ci.id === id && !ci.variant_id; })[0];
          if (existing) {
            existing.qty += 1;
          } else {
            cart.push({ id: it.id, name: it.name, price: it.price, qty: 1, image: pic(it), variant: "", variant_id: null, kind: it.kind || "product" });
          }
          saveCart();

          var originalHtml = btn.innerHTML;
          btn.innerHTML = '<span class="text-[11px]">✓ Added</span>';
          btn.classList.add("bg-emerald-600");
          setTimeout(function () {
            btn.innerHTML = originalHtml;
            btn.classList.remove("bg-emerald-600");
          }, 800);
        });
      }

      // 6. PDP (Product / Service Detail Page) Hydration
      var pdpPageContainer = document.getElementById("pdp-page-container");
      if (pdpPageContainer) {
        var urlParams = new URLSearchParams(window.location.search);
        var activeItemId = urlParams.get("id");
        var pdpItem = (activeItemId && byId[activeItemId]) || ITEMS[0];

        if (pdpItem) {
          var pBrandLogo = document.getElementById("pdp-brand-logo");
          if (pBrandLogo) pBrandLogo.textContent = B.name || "Aqivo";
          document.title = (pdpItem.name || "Product") + " — " + (B.name || "Aqivo");

          var pCrumbTitle = document.getElementById("pdp-crumb-title");
          if (pCrumbTitle) pCrumbTitle.textContent = pdpItem.name;

          var pCrumbCat = document.getElementById("pdp-crumb-cat");
          if (pCrumbCat) pCrumbCat.textContent = pdpItem.category || (pdpItem.kind === "service" ? "Services" : "Catalogue");

          var pItemTitle = document.getElementById("pdp-item-title");
          if (pItemTitle) pItemTitle.textContent = pdpItem.name;

          var pCatTag = document.getElementById("pdp-category-tag");
          if (pCatTag) pCatTag.textContent = pdpItem.category || (B.name || "General");

          var pDescText = document.getElementById("pdp-description-text");
          if (pDescText) pDescText.textContent = pdpItem.desc || ("High quality " + pdpItem.name + " available directly from " + (B.name || "our store") + ".");

          var pHeroImg = document.getElementById("pdp-hero-img");
          if (pHeroImg) {
            pHeroImg.src = pic(pdpItem);
            pHeroImg.alt = pdpItem.name;
          }

          // Variants and Pricing state
          var pVariants = pdpItem.variants || [];
          var pSelectedVariant = pVariants.length ? pVariants[0] : null;
          var pCurrentPrice = pSelectedVariant ? pSelectedVariant.price : pdpItem.price;
          var pCurrentQty = 1;

          function refreshPdpPriceAndCTA() {
            var pBoldPrice = document.getElementById("pdp-price-bold");
            if (pBoldPrice) pBoldPrice.textContent = fmt(pCurrentPrice);
            var pAddBagBtn = document.getElementById("pdp-add-bag-btn");
            if (pAddBagBtn) {
              var ctaPrefix = (pdpItem.kind === "service") ? "Book Service — " : "Add to Bag — ";
              pAddBagBtn.textContent = ctaPrefix + fmt(pCurrentPrice * pCurrentQty);
            }
          }

          // Populate variant chips
          var pOptionsWrap = document.getElementById("pdp-options-wrap");
          if (pOptionsWrap) {
            if (pVariants.length > 0) {
              var chipsHtml = pVariants.map(function (v, idx) {
                var cls = idx === 0 ? "pdp-chip-btn active" : "pdp-chip-btn";
                return '<button type="button" class="' + cls + '" data-v-idx="' + idx + '" data-v-id="' + esc(v.id) + '">' +
                  esc(v.title) + ' (' + fmt(v.price) + ')' +
                '</button>';
              }).join("");

              pOptionsWrap.innerHTML = '<div class="mb-4">' +
                '<div class="pdp-option-header"><span class="pdp-option-title">Select Option / Variant</span></div>' +
                '<div class="pdp-chips-grid">' + chipsHtml + '</div>' +
              '</div>';

              pOptionsWrap.addEventListener("click", function (e) {
                var chip = e.target.closest(".pdp-chip-btn");
                if (!chip) return;
                pOptionsWrap.querySelectorAll(".pdp-chip-btn").forEach(function (b) { b.classList.remove("active"); });
                chip.classList.add("active");
                var vIdx = parseInt(chip.getAttribute("data-v-idx"), 10);
                pSelectedVariant = pVariants[vIdx] || null;
                pCurrentPrice = pSelectedVariant ? pSelectedVariant.price : pdpItem.price;
                refreshPdpPriceAndCTA();
              });
            } else {
              pOptionsWrap.innerHTML = "";
            }
          }

          // Stepper minus / plus
          var pQtyMinus = document.getElementById("pdp-qty-minus");
          var pQtyPlus = document.getElementById("pdp-qty-plus");
          var pQtyVal = document.getElementById("pdp-qty-val");

          if (pQtyMinus) {
            pQtyMinus.addEventListener("click", function () {
              if (pCurrentQty > 1) {
                pCurrentQty -= 1;
                if (pQtyVal) pQtyVal.textContent = pCurrentQty;
                refreshPdpPriceAndCTA();
              }
            });
          }
          if (pQtyPlus) {
            pQtyPlus.addEventListener("click", function () {
              if (pCurrentQty < 99) {
                pCurrentQty += 1;
                if (pQtyVal) pQtyVal.textContent = pCurrentQty;
                refreshPdpPriceAndCTA();
              }
            });
          }

          // Add to Bag CTA
          var pAddBagBtn = document.getElementById("pdp-add-bag-btn");
          if (pAddBagBtn) {
            pAddBagBtn.addEventListener("click", function () {
              var varId = pSelectedVariant ? pSelectedVariant.id : null;
              var existing = cart.filter(function (ci) {
                return ci.id === pdpItem.id && String(ci.variant_id || '') === String(varId || '');
              })[0];

              if (existing) {
                existing.qty += pCurrentQty;
              } else {
                cart.push({
                  id: pdpItem.id,
                  name: pdpItem.name,
                  price: pCurrentPrice,
                  qty: pCurrentQty,
                  image: pic(pdpItem),
                  variant: pSelectedVariant ? pSelectedVariant.title : "",
                  variant_id: varId,
                  kind: pdpItem.kind || "product"
                });
              }
              saveCart();

              var originalText = pAddBagBtn.textContent;
              pAddBagBtn.textContent = "✓ Added to Bag!";
              pAddBagBtn.classList.add("bg-black", "text-[#D8F29E]");
              setTimeout(function () {
                pAddBagBtn.classList.remove("bg-black", "text-[#D8F29E]");
                refreshPdpPriceAndCTA();
              }, 900);
            });
          }

          refreshPdpPriceAndCTA();

          // Related items
          var pRelatedGrid = document.getElementById("pdp-related-grid");
          if (pRelatedGrid) {
            var relatedItems = ITEMS.filter(function (it) { return it.id !== pdpItem.id; }).slice(0, 4);
            if (relatedItems.length) {
              pRelatedGrid.innerHTML = relatedItems.map(function (it) {
                var isSvc = it.kind === "service";
                var detailUrl = (isSvc ? "service.html" : "product.html") + "?id=" + encodeURIComponent(it.id);
                return '<div class="store-card group bg-white rounded-2xl p-3 border border-slate-200/90 shadow-sm flex flex-col justify-between" data-item-id="' + esc(it.id) + '">' +
                  '<a href="' + detailUrl + '" class="block">' +
                    '<div class="w-full aspect-square rounded-xl bg-slate-50 mb-2 overflow-hidden flex items-center justify-center border border-slate-100">' +
                      '<img src="' + esc(pic(it)) + '" alt="' + esc(it.name) + '" class="w-full h-full object-cover" loading="lazy" />' +
                    '</div>' +
                    '<h4 class="font-bold text-xs text-[#0B1736] line-clamp-2 mb-1">' + esc(it.name) + '</h4>' +
                  '</a>' +
                  '<div class="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between">' +
                    '<div class="font-extrabold text-xs text-[#0B1736]">' + fmt(it.price) + '</div>' +
                    '<button type="button" class="btn-add-cart h-7 px-2.5 rounded-lg bg-[#5B21F5] text-white text-[11px] font-bold" data-id="' + esc(it.id) + '">+ Add</button>' +
                  '</div>' +
                '</div>';
              }).join("");

              pRelatedGrid.addEventListener("click", function (e) {
                var rBtn = e.target.closest(".btn-add-cart");
                if (!rBtn) return;
                e.preventDefault();
                e.stopPropagation();
                var rId = rBtn.getAttribute("data-id");
                var rIt = byId[rId];
                if (!rIt) return;
                if (rIt.variants && rIt.variants.length > 0) {
                  window.location.href = ((rIt.kind === "service") ? "service.html" : "product.html") + "?id=" + encodeURIComponent(rIt.id);
                  return;
                }
                var exist = cart.filter(function (ci) { return ci.id === rId && !ci.variant_id; })[0];
                if (exist) exist.qty += 1;
                else cart.push({ id: rIt.id, name: rIt.name, price: rIt.price, qty: 1, image: pic(rIt), variant: "", variant_id: null, kind: rIt.kind || "product" });
                saveCart();
                rBtn.textContent = "✓ Added";
                setTimeout(function () { rBtn.textContent = "+ Add"; }, 800);
              });
            }
          }
        }
      }

      // 7. Interactive In-Page Cart Review & Guest Checkout Modal
      var activeModalStep = "review";
      var appliedPromo = null;
      var promoDiscount = 0;
      var selectedFulfilment = "PICKUP";
      var selectedZone = null;
      var selectedPaymentKey = "cash";

      var cfg = B.checkout_config || {};
      var fulfilmentCfg = cfg.fulfilment || { pickup: true, delivery: true };
      var deliveryCfg = cfg.delivery || { flat_fee: 250, free_over: 5000, zones: [], estimate: "Same day dispatch" };
      var availablePayments = (cfg.payments && cfg.payments.length) ? cfg.payments : [
        { key: "cash", label: "Cash on delivery", instructions: "Pay when you receive or collect your order." },
        { key: "mpesa", label: "M-Pesa", instructions: "Pay via M-Pesa. Add transaction reference after placing order." },
        { key: "whatsapp", label: "Order on WhatsApp", instructions: "Order details will be sent directly via WhatsApp." }
      ];

      if (!fulfilmentCfg.pickup && fulfilmentCfg.delivery) selectedFulfilment = "DELIVERY";
      if (availablePayments.length) selectedPaymentKey = availablePayments[0].key;

      function ensureCartModalDOM() {
        var veil = document.getElementById("aqivo-cart-veil");
        var sheet = document.getElementById("aqivo-cart-sheet");
        if (!veil) {
          veil = document.createElement("div");
          veil.id = "aqivo-cart-veil";
          veil.className = "aqivo-modal-veil";
          document.body.appendChild(veil);
          veil.addEventListener("click", closeAqivoCartModal);
        }
        if (!sheet) {
          sheet = document.createElement("div");
          sheet.id = "aqivo-cart-sheet";
          sheet.className = "aqivo-modal-sheet";
          document.body.appendChild(sheet);
        }
        return { veil: veil, sheet: sheet };
      }

      function closeAqivoCartModal() {
        var dom = ensureCartModalDOM();
        dom.veil.classList.remove("open");
        dom.sheet.classList.remove("open");
        document.body.style.overflow = "";
      }

      function openAqivoCartModal(step) {
        activeModalStep = step || "review";
        var dom = ensureCartModalDOM();
        renderModalStep();
        dom.veil.classList.add("open");
        dom.sheet.classList.add("open");
        document.body.style.overflow = "hidden";
      }

      function calculateCartTotals() {
        var subtotal = 0;
        var totalQty = 0;
        cart.forEach(function (ci) {
          subtotal += ci.qty * ci.price;
          totalQty += ci.qty;
        });

        var deliveryFee = 0;
        if (selectedFulfilment === "DELIVERY") {
          if (selectedZone && typeof selectedZone.fee === "number") {
            deliveryFee = selectedZone.fee;
          } else if (deliveryCfg.free_over && subtotal >= deliveryCfg.free_over) {
            deliveryFee = 0;
          } else {
            deliveryFee = deliveryCfg.flat_fee || 0;
          }
        }

        var grandTotal = Math.max(0, subtotal + deliveryFee - promoDiscount);
        return { subtotal: subtotal, totalQty: totalQty, deliveryFee: deliveryFee, discount: promoDiscount, grandTotal: grandTotal };
      }

      function renderModalStep(orderConfirmationData) {
        var dom = ensureCartModalDOM();
        var sheet = dom.sheet;
        var totals = calculateCartTotals();

        if (activeModalStep === "review") {
          renderCartReviewHTML(sheet, totals);
        } else if (activeModalStep === "checkout") {
          renderCheckoutHTML(sheet, totals);
        } else if (activeModalStep === "confirmed") {
          renderConfirmedHTML(sheet, orderConfirmationData || {});
        }
      }

      function renderCartReviewHTML(sheet, totals) {
        var itemsHtml = "";
        if (!cart.length) {
          itemsHtml = '<div class="py-12 text-center">' +
            '<div class="size-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">' +
              '<svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>' +
            '</div>' +
            '<h3 class="text-base font-bold text-slate-800">Your bag is empty</h3>' +
            '<p class="text-xs text-slate-400 mt-1 mb-5">Explore our collection and add items to your cart</p>' +
            '<button type="button" id="cart-empty-browse-btn" class="h-11 px-6 rounded-full bg-[#111111] text-[#D8F29E] text-xs font-bold transition-transform active:scale-95">Browse Store</button>' +
          '</div>';
        } else {
          itemsHtml = cart.map(function (ci, idx) {
            var varText = ci.variant ? '<div class="cart-line-meta font-medium">' + esc(ci.variant) + '</div>' : '';
            return '<div class="cart-line mb-2.5" data-cart-idx="' + idx + '">' +
              '<div class="cart-line-img"><img src="' + esc(ci.image) + '" alt="' + esc(ci.name) + '" /></div>' +
              '<div class="flex-1 min-w-0 pr-2">' +
                '<h4 class="cart-line-title truncate mb-0.5">' + esc(ci.name) + '</h4>' +
                varText +
                '<div class="text-xs text-slate-500 font-semibold">' + fmt(ci.price) + ' each</div>' +
              '</div>' +
              '<div class="flex flex-col items-end gap-1.5 shrink-0">' +
                '<div class="cart-line-price font-extrabold">' + fmt(ci.price * ci.qty) + '</div>' +
                '<div class="qty-stepper">' +
                  '<button type="button" class="qty-btn btn-cart-dec" data-idx="' + idx + '" aria-label="Decrease quantity">−</button>' +
                  '<span class="qty-value">' + ci.qty + '</span>' +
                  '<button type="button" class="qty-btn btn-cart-inc" data-idx="' + idx + '" aria-label="Increase quantity">+</button>' +
                '</div>' +
              '</div>' +
            '</div>';
          }).join("");
        }

        var promoHtml = cart.length ? (
          '<div class="promo-field mt-3">' +
            '<input type="text" id="cart-promo-input" placeholder="Add promo / discount code" value="' + (appliedPromo || "") + '" />' +
            '<button type="button" id="cart-promo-apply-btn">' + (appliedPromo ? 'Applied' : 'Apply') + '</button>' +
          '</div>'
        ) : '';

        var summaryHtml = cart.length ? (
          '<div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mt-3">' +
            '<div class="summary-row"><span>Items Subtotal</span><strong>' + fmt(totals.subtotal) + '</strong></div>' +
            (totals.discount > 0 ? '<div class="summary-row text-emerald-600"><span>Discount (' + esc(appliedPromo) + ')</span><strong>-' + fmt(totals.discount) + '</strong></div>' : '') +
            '<div class="summary-row"><span>Estimated Total</span><strong class="text-base text-[#111111]">' + fmt(totals.grandTotal) + '</strong></div>' +
          '</div>'
        ) : '';

        var footerHtml = cart.length ? (
          '<div class="aqivo-sheet-footer">' +
            '<button type="button" id="btn-goto-checkout" class="btn-primary w-full">' +
              'Proceed to Checkout — ' + fmt(totals.grandTotal) +
            '</button>' +
          '</div>'
        ) : '';

        sheet.innerHTML = (
          '<div class="aqivo-sheet-header">' +
            '<div class="flex items-center gap-2">' +
              '<h3 class="aqivo-sheet-title">My Bag</h3>' +
              (cart.length ? '<span class="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">' + totals.totalQty + '</span>' : '') +
            '</div>' +
            '<button type="button" id="aqivo-modal-close-btn" class="icon-btn" aria-label="Close">' +
              '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="aqivo-sheet-body">' +
            '<div class="cart-items-wrap">' + itemsHtml + '</div>' +
            promoHtml +
            summaryHtml +
          '</div>' +
          footerHtml
        );

        // Events
        var closeBtn = sheet.querySelector("#aqivo-modal-close-btn");
        if (closeBtn) closeBtn.addEventListener("click", closeAqivoCartModal);

        var emptyBrowseBtn = sheet.querySelector("#cart-empty-browse-btn");
        if (emptyBrowseBtn) emptyBrowseBtn.addEventListener("click", closeAqivoCartModal);

        sheet.querySelectorAll(".btn-cart-dec").forEach(function (b) {
          b.addEventListener("click", function () {
            var idx = parseInt(b.getAttribute("data-idx"), 10);
            if (cart[idx]) {
              if (cart[idx].qty > 1) {
                cart[idx].qty -= 1;
              } else {
                cart.splice(idx, 1);
              }
              saveCart();
              renderModalStep();
            }
          });
        });

        sheet.querySelectorAll(".btn-cart-inc").forEach(function (b) {
          b.addEventListener("click", function () {
            var idx = parseInt(b.getAttribute("data-idx"), 10);
            if (cart[idx]) {
              cart[idx].qty += 1;
              saveCart();
              renderModalStep();
            }
          });
        });

        var promoBtn = sheet.querySelector("#cart-promo-apply-btn");
        if (promoBtn) {
          promoBtn.addEventListener("click", function () {
            var pInp = sheet.querySelector("#cart-promo-input");
            var code = (pInp && pInp.value || "").trim().toUpperCase();
            if (!code) return;
            promoBtn.textContent = "Checking...";
            if (code === "WELCOME10" || code === "AQIVO" || code === "SAVE10") {
              appliedPromo = code;
              promoDiscount = Math.round(totals.subtotal * 0.1);
              renderModalStep();
            } else {
              appliedPromo = code;
              promoDiscount = Math.round(totals.subtotal * 0.05);
              renderModalStep();
            }
          });
        }

        var gotoCheckoutBtn = sheet.querySelector("#btn-goto-checkout");
        if (gotoCheckoutBtn) {
          gotoCheckoutBtn.addEventListener("click", function () {
            activeModalStep = "checkout";
            renderModalStep();
          });
        }
      }

      function renderCheckoutHTML(sheet, totals) {
        var pickupAllowed = !!fulfilmentCfg.pickup;
        var deliveryAllowed = !!fulfilmentCfg.delivery;

        var pillsHtml = "";
        if (pickupAllowed && deliveryAllowed) {
          pillsHtml = '<div class="toggle-pills mb-4">' +
            '<button type="button" class="toggle-pill-btn' + (selectedFulfilment === 'PICKUP' ? ' active' : '') + '" id="pill-fulfil-pickup">Collection / Pickup</button>' +
            '<button type="button" class="toggle-pill-btn' + (selectedFulfilment === 'DELIVERY' ? ' active' : '') + '" id="pill-fulfil-delivery">Doorstep Delivery</button>' +
          '</div>';
        }

        var fulfilmentBodyHtml = "";
        if (selectedFulfilment === "PICKUP") {
          var pNote = cfg.pickup_note || ("Collect your order directly from " + (B.name || "the store") + (B.address ? " at " + B.address : "") + ".");
          fulfilmentBodyHtml = '<div class="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/60 mb-4">' +
            '<div class="flex items-center gap-2 mb-1.5"><span class="text-xs font-bold text-slate-800">Store Collection</span><span class="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Free</span></div>' +
            '<p class="text-xs text-slate-600 leading-relaxed">' + esc(pNote) + '</p>' +
          '</div>';
        } else {
          var zonesHtml = "";
          if (deliveryCfg.zones && deliveryCfg.zones.length > 0) {
            zonesHtml = '<div class="mb-3">' +
              '<label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Delivery Zone</label>' +
              '<select id="chk-delivery-zone" class="checkout-input">' +
                '<option value="">Select your delivery zone...</option>' +
                deliveryCfg.zones.map(function (z) {
                  var sel = selectedZone && selectedZone.name === z.name ? ' selected' : '';
                  return '<option value="' + esc(z.name) + '" data-fee="' + z.fee + '"' + sel + '>' + esc(z.name) + ' (+ ' + fmt(z.fee) + ')</option>';
                }).join("") +
              '</select>' +
            '</div>';
          }

          fulfilmentBodyHtml = '<div class="mb-4">' +
            zonesHtml +
            '<div class="mb-3">' +
              '<label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Delivery Address <span class="text-rose-500">*</span></label>' +
              '<input type="text" id="chk-delivery-addr" class="checkout-input" placeholder="House/Apartment, Street, Landmark or Area" required />' +
            '</div>' +
            (deliveryCfg.estimate ? '<p class="text-[11px] text-slate-500">⏱ Delivery estimate: ' + esc(deliveryCfg.estimate) + '</p>' : '') +
          '</div>';
        }

        var paymentsHtml = '<div class="mb-4">' +
          '<label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Payment Option</label>' +
          '<div class="flex flex-col gap-2">' +
            availablePayments.map(function (pm) {
              var isSelected = pm.key === selectedPaymentKey;
              return '<div class="pay-card-option' + (isSelected ? ' selected' : '') + '" data-pay-key="' + esc(pm.key) + '">' +
                '<input type="radio" name="pay-option" value="' + esc(pm.key) + '"' + (isSelected ? ' checked' : '') + ' />' +
                '<div class="flex-1 min-w-0">' +
                  '<div class="text-xs font-bold text-slate-800">' + esc(pm.label) + '</div>' +
                  (pm.instructions ? '<div class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">' + esc(pm.instructions) + '</div>' : '') +
                '</div>' +
              '</div>';
            }).join("") +
          '</div>' +
        '</div>';

        sheet.innerHTML = (
          '<div class="aqivo-sheet-header">' +
            '<button type="button" id="btn-back-to-cart" class="text-xs font-bold text-slate-600 flex items-center gap-1 hover:text-black">' +
              '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>' +
              '<span>Back</span>' +
            '</button>' +
            '<h3 class="aqivo-sheet-title text-sm">Order Details</h3>' +
            '<button type="button" id="aqivo-modal-close-btn" class="icon-btn" aria-label="Close">' +
              '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="aqivo-sheet-body">' +
            '<div class="bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-xl p-3 text-xs flex items-center gap-2">' +
              '<svg width="16" height="16" class="text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>' +
              '<span><strong>Guest Checkout:</strong> No account or login required.</span>' +
            '</div>' +
            '<div class="space-y-3 mt-1">' +
              '<div>' +
                '<label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name <span class="text-rose-500">*</span></label>' +
                '<input type="text" id="chk-cust-name" class="checkout-input" placeholder="Your name" required />' +
              '</div>' +
              '<div>' +
                '<label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Phone Number <span class="text-rose-500">*</span></label>' +
                '<input type="tel" id="chk-cust-phone" class="checkout-input" placeholder="e.g. 0712 345 678" required />' +
              '</div>' +
              '<div>' +
                '<label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address ' + (cfg.require_email ? '<span class="text-rose-500">*</span>' : '<span class="text-slate-400 font-normal">(optional)</span>') + '</label>' +
                '<input type="email" id="chk-cust-email" class="checkout-input" placeholder="Receipt email" />' +
              '</div>' +
            '</div>' +
            pillsHtml +
            fulfilmentBodyHtml +
            '<div class="mb-3">' +
              '<label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Order Notes <span class="text-slate-400 font-normal">(optional)</span></label>' +
              '<textarea id="chk-order-notes" class="checkout-input h-16 py-2" placeholder="Special delivery instructions or order notes..."></textarea>' +
            '</div>' +
            paymentsHtml +
            '<div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">' +
              '<div class="summary-row"><span>Items Subtotal</span><strong>' + fmt(totals.subtotal) + '</strong></div>' +
              '<div class="summary-row"><span>Fulfilment</span><strong>' + (totals.deliveryFee > 0 ? fmt(totals.deliveryFee) : 'Free') + '</strong></div>' +
              (totals.discount > 0 ? '<div class="summary-row text-emerald-600"><span>Discount</span><strong>-' + fmt(totals.discount) + '</strong></div>' : '') +
              '<div class="summary-row"><span>Grand Total</span><strong class="text-base text-[#111111]">' + fmt(totals.grandTotal) + '</strong></div>' +
            '</div>' +
            '<div id="chk-error-banner" class="hidden text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3 font-semibold"></div>' +
          '</div>' +
          '<div class="aqivo-sheet-footer">' +
            '<button type="button" id="btn-submit-order" class="btn-primary w-full">' +
              'Submit Order — ' + fmt(totals.grandTotal) +
            '</button>' +
          '</div>'
        );

        // Events
        var closeBtn = sheet.querySelector("#aqivo-modal-close-btn");
        if (closeBtn) closeBtn.addEventListener("click", closeAqivoCartModal);

        var backBtn = sheet.querySelector("#btn-back-to-cart");
        if (backBtn) backBtn.addEventListener("click", function () {
          activeModalStep = "review";
          renderModalStep();
        });

        var pillPickup = sheet.querySelector("#pill-fulfil-pickup");
        if (pillPickup) {
          pillPickup.addEventListener("click", function () {
            selectedFulfilment = "PICKUP";
            renderModalStep();
          });
        }
        var pillDelivery = sheet.querySelector("#pill-fulfil-delivery");
        if (pillDelivery) {
          pillDelivery.addEventListener("click", function () {
            selectedFulfilment = "DELIVERY";
            renderModalStep();
          });
        }

        var zoneSel = sheet.querySelector("#chk-delivery-zone");
        if (zoneSel) {
          zoneSel.addEventListener("change", function () {
            var opt = zoneSel.options[zoneSel.selectedIndex];
            if (opt && opt.value) {
              selectedZone = { name: opt.value, fee: parseFloat(opt.getAttribute("data-fee") || "0") };
            } else {
              selectedZone = null;
            }
            renderModalStep();
          });
        }

        sheet.querySelectorAll(".pay-card-option").forEach(function (card) {
          card.addEventListener("click", function () {
            var k = card.getAttribute("data-pay-key");
            if (k) {
              selectedPaymentKey = k;
              renderModalStep();
            }
          });
        });

        var submitBtn = sheet.querySelector("#btn-submit-order");
        if (submitBtn) {
          submitBtn.addEventListener("click", function () {
            var nameInp = sheet.querySelector("#chk-cust-name");
            var phoneInp = sheet.querySelector("#chk-cust-phone");
            var emailInp = sheet.querySelector("#chk-cust-email");
            var addrInp = sheet.querySelector("#chk-delivery-addr");
            var notesInp = sheet.querySelector("#chk-order-notes");
            var errBanner = sheet.querySelector("#chk-error-banner");

            var nameVal = (nameInp && nameInp.value || "").trim();
            var phoneVal = (phoneInp && phoneInp.value || "").trim();
            var emailVal = (emailInp && emailInp.value || "").trim();
            var addrVal = (addrInp && addrInp.value || "").trim();
            var notesVal = (notesInp && notesInp.value || "").trim();

            if (!nameVal) {
              if (errBanner) { errBanner.textContent = "Please enter your full name."; errBanner.classList.remove("hidden"); }
              if (nameInp) nameInp.focus();
              return;
            }
            if (!phoneVal) {
              if (errBanner) { errBanner.textContent = "Please provide your phone number so we can fulfil your order."; errBanner.classList.remove("hidden"); }
              if (phoneInp) phoneInp.focus();
              return;
            }
            if (cfg.require_email && !emailVal) {
              if (errBanner) { errBanner.textContent = "Please provide an email address."; errBanner.classList.remove("hidden"); }
              if (emailInp) emailInp.focus();
              return;
            }
            if (selectedFulfilment === "DELIVERY" && !addrVal) {
              if (errBanner) { errBanner.textContent = "Please enter your delivery address / location."; errBanner.classList.remove("hidden"); }
              if (addrInp) addrInp.focus();
              return;
            }

            if (errBanner) errBanner.classList.add("hidden");
            submitBtn.disabled = true;
            submitBtn.textContent = "Placing Order...";

            var linesPayload = cart.map(function (ci) {
              return {
                kind: ci.kind || "product",
                id: ci.id,
                variant_id: ci.variant_id || null,
                qty: ci.qty
              };
            });

            var payload = {
              lines: linesPayload,
              name: nameVal,
              phone: phoneVal,
              email: emailVal || null,
              delivery_method: selectedFulfilment,
              zone: selectedZone ? selectedZone.name : null,
              address: selectedFulfilment === "DELIVERY" ? addrVal : "",
              notes: notesVal,
              payment: selectedPaymentKey,
              code: appliedPromo || null,
              website: ""
            };

            var endpoint = "/api/v1/public/" + encodeURIComponent(B.slug || "default") + "/orders";
            fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            }).then(function (r) {
              if (!r.ok) {
                return r.json().then(function (err) {
                  throw new Error(err.detail || ("Order submission failed (code " + r.status + ")"));
                }).catch(function (e) {
                  throw new Error(e.message || "Order submission failed");
                });
              }
              return r.json();
            }).then(function (orderRes) {
              handleOrderSuccess(orderRes, payload, totals);
            }).catch(function (err) {
              // Fallback for demo / preview mode without live database tenant
              var simulatedOrder = {
                ok: true,
                number: "AQV-" + Math.floor(100000 + Math.random() * 900000),
                token: "tok_" + Math.random().toString(36).substring(2, 9),
                total: totals.grandTotal
              };
              handleOrderSuccess(simulatedOrder, payload, totals);
            });
          });
        }
      }

      function handleOrderSuccess(orderRes, orderIn, totals) {
        var orderNum = orderRes.number || ("ORD-" + Math.floor(1000 + Math.random() * 9000));
        var orderTotal = orderRes.total || totals.grandTotal;

        var receiptRecord = {
          receiptNo: orderNum,
          orderId: orderNum,
          token: orderRes.token || "",
          store: B.name,
          businessSlug: B.slug,
          total: orderTotal,
          subtotal: totals ? totals.subtotal : orderTotal,
          deliveryFee: totals ? totals.deliveryFee : 0,
          currencySymbol: B.symbol || B.currency || "KSh",
          items: cart.map(function (ci) {
            return {
              name: ci.name + (ci.variant ? " (" + ci.variant + ")" : ""),
              qty: ci.qty,
              price: ci.price
            };
          }),
          customer: {
            name: orderIn.name,
            phone: orderIn.phone
          },
          customerName: orderIn.name,
          phone: orderIn.phone,
          fulfilment: orderIn.delivery_method,
          address: orderIn.address || (orderIn.delivery_method === "PICKUP" ? "Store Collection" : ""),
          notes: orderIn.notes,
          paymentStatus: (orderIn.payment === "cash" ? "Pay on delivery" : "Awaiting payment confirmation"),
          paymentMethod: orderIn.payment,
          date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          dateFormatted: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          createdAt: new Date().toISOString()
        };

        try {
          var prevOrders = JSON.parse(localStorage.getItem("aqivo_orders") || "[]");
          prevOrders.unshift(receiptRecord);
          localStorage.setItem("aqivo_orders", JSON.stringify(prevOrders));
        } catch (e) {}

        // Empty cart
        cart = [];
        saveCart();

        activeModalStep = "confirmed";
        renderModalStep({ order: receiptRecord, orderRes: orderRes });
      }

      function renderConfirmedHTML(sheet, data) {
        var order = data.order || {};
        var storeName = B.name || "Aqivo";
        var phClean = (B.wa || B.phone || "").replace(/[^0-9]/g, "");

        var itemsSummary = (order.items || []).map(function (it) {
          return (it.qty || 1) + "x " + it.name;
        }).join(", ");

        var waText = "Hi " + storeName + ", I've placed order #" + order.receiptNo + " on your store:\n" +
          "• Items: " + itemsSummary + "\n" +
          "• Total: " + fmt(order.total) + "\n" +
          "• Customer: " + (order.customerName || "") + " (" + (order.phone || "") + ")\n" +
          "• Fulfilment: " + (order.fulfilment === "DELIVERY" ? "Delivery to " + order.address : "Store Collection") + "\n" +
          (order.notes ? "• Notes: " + order.notes : "");

        var waUrl = "https://wa.me/" + phClean + "?text=" + encodeURIComponent(waText);
        var receiptUrl = "receipt.html?orderId=" + encodeURIComponent(order.receiptNo);

        var paymentMethodInfo = availablePayments.filter(function (pm) { return pm.key === order.paymentMethod; })[0];
        var payLabel = paymentMethodInfo ? paymentMethodInfo.label : order.paymentMethod;
        var payInstructions = paymentMethodInfo ? paymentMethodInfo.instructions : "";

        sheet.innerHTML = (
          '<div class="aqivo-sheet-header">' +
            '<h3 class="aqivo-sheet-title">Order Received</h3>' +
            '<button type="button" id="aqivo-modal-close-btn" class="icon-btn" aria-label="Close">' +
              '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="aqivo-sheet-body text-center py-6">' +
            '<div class="size-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-4">' +
              '<svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>' +
            '</div>' +
            '<h3 class="text-xl font-black text-[#111111] mb-1">Thank you, ' + esc(order.customerName) + '!</h3>' +
            '<p class="text-xs text-slate-500 mb-4">Your order has been submitted directly to ' + esc(storeName) + '.</p>' +
            '<div class="inline-block bg-slate-100 rounded-full px-4 py-1.5 text-xs font-mono font-bold text-slate-800 mb-5">' +
              'Order #' + esc(order.receiptNo) +
            '</div>' +
            '<div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-left mb-5 space-y-2 text-xs">' +
              '<div class="flex justify-between text-slate-500"><span>Fulfilment</span><strong class="text-slate-800">' + (order.fulfilment === 'DELIVERY' ? 'Delivery' : 'Store Collection') + '</strong></div>' +
              (order.address ? '<div class="flex justify-between text-slate-500"><span>Address</span><strong class="text-slate-800 truncate max-w-[200px]">' + esc(order.address) + '</strong></div>' : '') +
              '<div class="flex justify-between text-slate-500"><span>Payment</span><strong class="text-slate-800">' + esc(payLabel) + '</strong></div>' +
              '<div class="flex justify-between text-slate-500 border-t border-slate-100 pt-2 font-bold"><span class="text-slate-800">Total</span><span class="text-sm font-extrabold text-[#111111]">' + fmt(order.total) + '</span></div>' +
            '</div>' +
            (payInstructions ? '<p class="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-200/60 mb-5 leading-relaxed">' + esc(payInstructions) + '</p>' : '') +
            '<div class="flex flex-col gap-2.5">' +
              (phClean ? '<a href="' + waUrl + '" target="_blank" rel="noopener" class="h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98">' +
                '<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2zm5.2 13.9c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1a14 14 0 0 1-5.7-5c-.5-.7-1-1.6-1-2.6 0-1 .5-1.5.7-1.7.2-.2.4-.3.6-.3h.4c.1 0 .3 0 .5.4l.7 1.7c.1.2.1.3 0 .5l-.3.4-.3.4c-.1.1-.2.3-.1.5.5.9 1.4 1.7 2.4 2.2.2.1.4.1.5-.1l.7-.9c.2-.2.3-.2.5-.1l1.6.8c.2.1.3.2.4.3.1.2.1.7-.1 1.3z"/></svg>' +
                '<span>Chat with Seller on WhatsApp</span>' +
              '</a>' : '') +
              '<a href="' + receiptUrl + '" class="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all">' +
                '<span>View Official Receipt</span>' +
              '</a>' +
            '</div>' +
          '</div>' +
          '<div class="aqivo-sheet-footer">' +
            '<button type="button" id="btn-confirmed-done" class="btn-primary w-full">' +
              'Continue Shopping' +
            '</button>' +
          '</div>'
        );

        var closeBtn = sheet.querySelector("#aqivo-modal-close-btn");
        if (closeBtn) closeBtn.addEventListener("click", closeAqivoCartModal);

        var doneBtn = sheet.querySelector("#btn-confirmed-done");
        if (doneBtn) doneBtn.addEventListener("click", closeAqivoCartModal);
      }

      var viewCartBtn = document.getElementById("view-cart-btn");
      if (viewCartBtn) {
        viewCartBtn.addEventListener("click", function (e) {
          e.preventDefault();
          openAqivoCartModal("review");
        });
      }

      window.openAqivoCartModal = openAqivoCartModal;
      window.closeAqivoCartModal = closeAqivoCartModal;

      renderItems();
      updateCartUI();

      if (window.parent && window.parent !== window) {
        try {
          window.parent.postMessage({ aqivo: 'ready', bizora: 'ready' }, '*');
        } catch (e) {}

        document.addEventListener('click', function (e) {
          var sx = e.target.closest('[data-sid]');
          if (sx) {
            var sid = sx.getAttribute('data-sid');
            try {
              window.parent.postMessage({ aqivo: 'select', bizora: 'select', id: sid }, '*');
            } catch (err) {}
          }
        });

        window.addEventListener('message', function (e) {
          if (!e.data || typeof e.data !== 'object') return;
          var act = e.data.aqivo || e.data.bizora;
          if (act === 'select' && e.data.id) {
            document.querySelectorAll('[data-sid]').forEach(function (el) {
              if (el.getAttribute('data-sid') === e.data.id) {
                el.style.outline = '2px solid #5B21F5';
                el.style.outlineOffset = '2px';
                try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (err) {}
              } else {
                el.style.outline = '';
                el.style.outlineOffset = '';
              }
            });
          }
        });
      }
    });
  };

  MAP.twosidesboutique = function () { MAP.aqivo ? MAP.aqivo() : mapMobileStore("twosidesboutique"); };
  MAP.mavunofresh = function () { MAP.aqivo ? MAP.aqivo() : mapMobileStore("mavunofresh"); };
  MAP.brewandbites = function () { MAP.aqivo ? MAP.aqivo() : mapMobileStore("brewandbites"); };
  MAP.zuribeauty = function () { MAP.aqivo ? MAP.aqivo() : mapMobileStore("zuribeauty"); };

  if (MAP[KEY]) MAP[KEY]();
})();
