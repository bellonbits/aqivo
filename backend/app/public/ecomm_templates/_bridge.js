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
  var FALLBACK_IMG = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#eceff3"/><text x="200" y="210" font-size="22" text-anchor="middle" fill="#9aa3af" font-family="sans-serif">No image</text></svg>');
  function pic(p) { return img(p) || FALLBACK_IMG; }

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
        if (el.tagName === "BUTTON") {
          el.onclick = function (e) {
            e.preventDefault();
            window.location.href = "cart.html";
          };
        } else if (el.tagName === "A") {
          el.setAttribute("href", "cart.html");
        }
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
      if (allChips.length >= 3) {
        if (isService) {
          allChips[0].innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Appointments';
        }
        if (!locText && allChips[2]) {
          allChips[2].style.display = "none";
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

  MAP.twosidesboutique = function () { mapMobileStore("twosidesboutique"); };
  MAP.mavunofresh = function () { mapMobileStore("mavunofresh"); };
  MAP.brewandbites = function () { mapMobileStore("brewandbites"); };
  MAP.zuribeauty = function () { mapMobileStore("zuribeauty"); };

  if (MAP[KEY]) MAP[KEY]();
})();
