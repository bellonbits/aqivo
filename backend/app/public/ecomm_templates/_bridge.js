/* Bridge between the static ecomm templates and the platform.
 * Runs right after each template's data.js (before cart/app scripts): swaps demo data for the business's real
 * catalogue/services (window.__BZ, injected by services/ecomm_site.py) and routes checkout / bookings to the backend. */
(function () {
  var B = window.__BZ;
  if (!B) return;
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
  var CART = {
    fashion_ecom: function () { return readLS("luxina_cart_items_kes_v2", function (i) { return { id: i.id, variant: i.size, qty: i.quantity }; }); },
    grocery_ecom: function () { return readLS("grofresh_cart_items_kes_v2", function (i) { return { id: i.id, variant: "", qty: i.quantity }; }); },
    shoeshop_ecom: function () { return readLS("footwear_cart_items_v2", function (i) { return { id: i.id, variant: String(i.size), qty: i.quantity }; }); },
    mart_ecom: function () { return ((window.Cart && window.Cart.items) || []).map(function (i) { return { id: i.id, variant: i.size, qty: i.quantity }; }); },
    aqivo: function () { try { return window.AqivoStore ? window.AqivoStore.getCart().map(function (i) { return { id: i.productId, variant: (i.variant && (i.variant.Size || i.variant.Color || i.variant['Add-ons'] || '')) || '', qty: i.qty }; }) : []; } catch (e) { return []; } }
  };
  // never start with the template's demo cart items
  var LS_KEYS = { fashion_ecom: "luxina_cart_items_kes_v2", grocery_ecom: "grofresh_cart_items_kes_v2", shoeshop_ecom: "footwear_cart_items_v2" };
  if (LS_KEYS[KEY]) { try { if (localStorage.getItem(LS_KEYS[KEY]) === null) localStorage.setItem(LS_KEYS[KEY], "[]"); } catch (e) {} }

  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("#cart-checkout-btn, #btn-cart-checkout, [data-checkout]");
    if (t && (CART[KEY] || KEY === 'aqivo')) { e.preventDefault(); e.stopImmediatePropagation(); goCheckout((CART[KEY] || function(){return[]})()); return; }
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

  MAP.aqivo = function () {
    if (!window.AQIVO_DB) return;
    var tenant = {
      slug: B.slug,
      business: {
        name: B.name,
        tagline: B.tagline || "",
        description: B.about || B.tagline || "",
        type: "general",
        logo: B.logo || "",
        cover: (B.gallery && B.gallery[0] && B.gallery[0].src) || "",
        verified: true,
        rating: (B.rating && B.rating.average) || 5,
        reviewCount: (B.rating && B.rating.count) || 0,
        open: true,
        phone: B.phone || "",
        whatsapp: B.wa || B.phone || "",
        email: B.email || "",
        address: B.address || "",
        city: ""
      },
      settings: {
        currency: B.currency || "KES",
        delivery: { available: true, fee: 200, freeOver: B.freeOver || 0, time: "Same day", note: "Standard delivery" },
        pickup: { available: true, note: B.address || "Pick up at shop" },
        minOrder: 0,
        payments: ["mpesa", "cod"],
        whatsappOrdering: !!B.wa,
        hours: (B.hours && B.hours[0] && B.hours[0].text) || "Mon–Sat"
      },
      categories: (CATS.length ? CATS : [{ id: "all", name: "All Items", icon: "sparkle" }]).map(function (c) {
        return { id: c.id, name: c.name, icon: "sparkle" };
      }),
      products: ITEMS.map(function (p) {
        var imgs = (p.images && p.images.length) ? p.images : (p.image ? [p.image] : [FALLBACK_IMG]);
        return {
          id: p.id,
          category: p.cid || (CATS[0] && CATS[0].id) || "all",
          type: p.kind === "service" ? "service" : "product",
          name: p.name,
          price: p.price,
          compare_at_price: (p.compare && p.compare > p.price) ? p.compare : null,
          available: !p.soldout,
          description: p.desc,
          images: imgs,
          duration: p.duration ? (p.duration + " min") : undefined,
          durationMin: p.duration || 60,
          variants: (p.variants && p.variants.length) ? [
            { name: "Option", type: "option", options: p.variants.map(function (v) { return { label: v.title, available: true }; }) }
          ] : [],
          specs: []
        };
      }),
      booking: {
        enabled: !!B.bookingsOn,
        consultationFee: 0,
        slots: ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"],
        staff: (B.team || []).map(function (m) {
          return { id: m.id, name: m.name, role: "Specialist", avatar: m.photo || "" };
        })
      }
    };
    window.AQIVO_DB.stores = [tenant];
    window.AQIVO_DB.defaultStore = B.slug;
    window.AQIVO_DB.currency = B.currency || "KES";
    try { localStorage.setItem("aqivo.lastShop", B.slug); } catch (e) {}
  };

  if (MAP[KEY]) MAP[KEY]();
})();
