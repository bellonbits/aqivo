(function () {
  var slug = document.body.dataset.slug, draft = document.body.dataset.draft === "1";
  var api = "/api/v1/public/" + slug;
  // ---------- attribution: where this visitor came from (explicit ?source=&campaign=, else the referrer); kept 30 days
  var A = { source: null, campaign: null, referrer: "" }, qs = new URLSearchParams(location.search), explicit = false;
  try {
    var saved = JSON.parse(localStorage.getItem("bz-attr-" + slug) || "null");
    if (saved && Date.now() - saved.ts < 30 * 864e5) A = saved;
    var s0 = qs.get("source") || qs.get("utm_source") || qs.get("ref"), c0 = qs.get("campaign") || qs.get("utm_campaign");
    if (s0 || c0) { explicit = !!s0; A = { source: s0 || (saved && saved.source) || null, campaign: c0 || null, referrer: "", ts: Date.now() }; localStorage.setItem("bz-attr-" + slug, JSON.stringify(A)); }
    else if (!saved && document.referrer) { var rh = new URL(document.referrer).hostname; if (rh !== location.hostname) { A = { source: null, campaign: null, referrer: document.referrer, ts: Date.now() }; localStorage.setItem("bz-attr-" + slug, JSON.stringify(A)); } }
  } catch (e) {}
  var sid = "";
  try { sid = sessionStorage.getItem("bz-sid") || ""; if (!sid) { sid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-4); sessionStorage.setItem("bz-sid", sid); } } catch (e) { sid = "x" + Date.now(); }
  function attrib() { return { source: A.source || null, campaign: A.campaign || null, referrer: A.referrer ? A.referrer.slice(0, 300) : null }; }
  function track(type, service, product) {
    if (draft) return;
    try {
      var body = JSON.stringify(Object.assign({ event_type: type, service_id: service || null, product_id: product || null, session_id: sid, path: location.pathname.slice(0, 200) }, attrib()));
      if (navigator.sendBeacon) navigator.sendBeacon(api + "/events", new Blob([body], { type: "application/json" }));
      else fetch(api + "/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true });
    } catch (e) {}
  }
  var path = location.pathname.replace(/\/$/, "").split("/").pop();
  if (document.getElementById("top")) track(document.querySelector(".nav") ? "WEBSITE_VISIT" : "PROFILE_VIEW");
  else if (document.getElementById("review-form")) track("REVIEW_PAGE_VIEW");
  var scanned = false; try { scanned = sessionStorage.getItem("bz-scanned") === "1"; } catch (e) {}
  if ((/[?&]qr=1/.test(location.search) || (explicit && A.source === "qr")) && !scanned) { track("QR_SCAN"); try { sessionStorage.setItem("bz-scanned", "1"); } catch (e) {} }
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-track]");
    if (a) track(a.dataset.track, a.dataset.service);
  });

  function post(url, data) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(typeof j.detail === "string" ? j.detail : "Something went wrong. Please try again."); return j; }); });
  }
  function say(el, cls, text) { el.className = "msg " + cls; el.textContent = text; el.hidden = false; }
  window.BzTrack = track; window.BzAttrib = attrib; window.BzPost = post; window.BzApi = api; window.BzSay = say; window.BzDraft = draft;

  // ---------- filters (search + category chips + price ranges), booking pre-select
  var q = "", cat = "", priceRange = "";
  function applyFilter() {
    var matchCount = 0;
    document.querySelectorAll("[data-item]").forEach(function (el) {
      var p = Number(el.dataset.price || 0);
      var priceOk = true;
      if (priceRange) {
        if (priceRange.indexOf("+") > -1) {
          var minP = Number(priceRange.replace("+", ""));
          priceOk = p >= minP;
        } else if (priceRange.indexOf("-") > -1) {
          var parts = priceRange.split("-");
          priceOk = p >= Number(parts[0]) && p <= Number(parts[1]);
        }
      }

      var ok = (!q || (el.dataset.name || "").toLowerCase().indexOf(q) > -1) &&
               (!cat || el.dataset.category === cat) &&
               priceOk;
      el.dataset.hidden = ok ? "false" : "true";
      el.style.display = ok ? "" : "none";
      if (ok) matchCount++;
    });

    var activeLabelEl = document.querySelector("[data-active-filter-label]");
    if (activeLabelEl) {
      var catRadio = document.querySelector('input[name="store_cat_filter"]:checked');
      var catLabel = "All items";
      if (catRadio && catRadio.value) {
        var labelEl = catRadio.closest("label").querySelector(".radio-text, .radio-label");
        if (labelEl) catLabel = labelEl.textContent.trim();
      }
      activeLabelEl.textContent = catLabel;
    }

    var activeTextEl = document.querySelector("[data-active-filter-text]");
    if (activeTextEl) {
      var filters = [];
      if (cat) {
        var catRadio2 = document.querySelector('input[name="store_cat_filter"]:checked');
        if (catRadio2 && catRadio2.value) {
          var labelEl2 = catRadio2.closest("label").querySelector(".radio-text, .radio-label");
          if (labelEl2) filters.push(labelEl2.textContent.trim());
        }
      }
      if (priceRange) {
        var priceRadio = document.querySelector('input[name="store_price_filter"]:checked');
        if (priceRadio && priceRadio.value) {
          var pLabelEl = priceRadio.closest("label").querySelector(".radio-text, .radio-label");
          if (pLabelEl) filters.push(pLabelEl.textContent.trim());
        }
      }
      activeTextEl.textContent = filters.length > 0 ? filters.join(", ") : "None";
    }

    var noProductsEl = document.querySelector(".ecom-no-products");
    if (noProductsEl) {
      noProductsEl.style.display = matchCount === 0 ? "block" : "none";
    }
  }

  document.querySelectorAll("[data-search]").forEach(function (i) { i.addEventListener("input", function () { q = i.value.trim().toLowerCase(); applyFilter(); }); });
  
  document.addEventListener("change", function (e) {
    if (e.target.name === "store_cat_filter") {
      cat = e.target.value;
      applyFilter();
    }
    if (e.target.name === "store_price_filter") {
      priceRange = e.target.value;
      applyFilter();
    }
  });

  var sortSelect = document.getElementById("catalog-sort");
  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      var grid = document.querySelector(".ecom-products-grid, .store-products-grid, .cafe-products-grid");
      if (!grid) return;
      var cards = Array.from(grid.querySelectorAll("[data-item]"));
      var val = sortSelect.value;
      cards.sort(function (a, b) {
        if (val === "price-asc") return Number(a.dataset.price || 0) - Number(b.dataset.price || 0);
        if (val === "price-desc") return Number(b.dataset.price || 0) - Number(a.dataset.price || 0);
        if (val === "name") return (a.dataset.name || "").localeCompare(b.dataset.name || "");
        return 0;
      });
      cards.forEach(function (c) { grid.appendChild(c); });
    });
  }

  document.addEventListener("click", function (e) {
    // Share button
    if (e.target.closest("[data-share-btn]")) {
      if (navigator.share) {
        navigator.share({ title: document.title, url: location.href }).catch(function() {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(location.href);
        var btn = e.target.closest("[data-share-btn]");
        var orig = btn.querySelector("span") ? btn.querySelector("span").textContent : btn.textContent;
        if (btn.querySelector("span")) btn.querySelector("span").textContent = "Link copied!";
        else btn.textContent = "Copied!";
        setTimeout(function() { if (btn.querySelector("span")) btn.querySelector("span").textContent = orig; else btn.textContent = orig; }, 2000);
      }
      return;
    }
    // Follow button
    if (e.target.closest("[data-follow-btn]")) {
      var fbtn = e.target.closest("[data-follow-btn]");
      var following = fbtn.classList.toggle("following");
      var sp = fbtn.querySelector("span");
      if (sp) sp.textContent = following ? "Following" : "Follow Store";
      fbtn.style.background = following ? "#16a34a" : "";
      fbtn.style.color = following ? "#fff" : "";
      fbtn.style.borderColor = following ? "#16a34a" : "";
      return;
    }

    // Category chip/bubble click — apply filter + scroll to shop
    var chip = e.target.closest("[data-cat]");
    if (chip && !chip.matches('input[name="store_cat_filter"]')) {
      cat = chip.dataset.cat || "";
      document.querySelectorAll("[data-cat]").forEach(function (c) {
        var matches = (c.dataset.cat || "") === cat;
        c.setAttribute("aria-pressed", String(matches));
        c.classList.toggle("active", matches);
        c.classList.toggle("on", matches);
      });
      applyFilter();
      // If clicking a category bubble from the category_grid section, scroll to shop
      if (chip.classList.contains("store-cat-bubble-btn") && cat) {
        // Switch to products tab
        document.querySelectorAll("[data-tab-panel]").forEach(function(p) { p.classList.add("tab-hidden"); });
        var shopPanel = document.querySelector('[data-tab-panel="products"]') || document.getElementById("shop");
        if (shopPanel) { shopPanel.classList.remove("tab-hidden"); }
        document.querySelectorAll("[data-tab-target]").forEach(function(b) {
          var isSame = b.dataset.tabTarget === "products";
          b.classList.toggle("active", isSame); b.classList.toggle("on", isSame);
          b.setAttribute("aria-selected", String(isSame));
        });
        setTimeout(function() {
          var shop = document.getElementById("shop");
          if (shop) { var r = shop.getBoundingClientRect(); window.scrollTo({ top: Math.max(0, window.scrollY + r.top - 70), behavior: "smooth" }); }
        }, 80);
      }
    }
    var tile = e.target.closest(".ctile[data-cat]");
    if (tile) {
      var bar = document.querySelector(".cat-clear");
      if (!bar) { bar = document.createElement("div"); bar.className = "cat-clear wrap"; bar.style.cssText = "padding:12px 0"; var sh = document.getElementById("shop"); (sh || document.querySelector("main")).insertBefore(bar, (sh || document.querySelector("main")).firstChild); }
      bar.innerHTML = ""; var pill = document.createElement("button"); pill.type = "button"; pill.className = "chip"; pill.textContent = "Showing " + tile.querySelector("span").firstChild.textContent + " — show all";
      pill.onclick = function () { cat = ""; applyFilter(); bar.remove(); }; bar.appendChild(pill);
    }
    var pick = e.target.closest("[data-pick]");
    if (pick) { var cb = document.querySelector('#book-form input[name=service][value="' + pick.dataset.pick + '"]'); if (cb) { cb.checked = true; cb.dispatchEvent(new Event("change", { bubbles: true })); } }
  });

  // ---------- bag: add items, adjust quantities, checkout (or send the order on WhatsApp)
  var bag = document.getElementById("bag");
  var KEY = "bz-bag2-" + slug, items = {};
  try { items = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { items = {}; }
  var cur = document.body.dataset.cur || "", wa = document.body.dataset.wa || "";
  function money(n) { return (cur.length > 1 ? cur + " " : cur) + Number(n).toLocaleString("en", { maximumFractionDigits: 2 }); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} }
  function totals() { var c = 0, t = 0; for (var k in items) { c += items[k].qty; t += items[k].qty * items[k].price; } return { c: c, t: t }; }
  function bagKey(it) { return it.kind + ":" + it.id + ":" + (it.variant_id || ""); }
  function render() {
    var t = totals(), has = t.c > 0;
    document.querySelectorAll("[data-bag-count]").forEach(function (el) {
      el.textContent = has ? t.c : "";
      el.dataset.count = String(t.c);
      el.style.display = has ? "grid" : "none";
    });
    document.querySelectorAll("[data-bag-total]").forEach(function (el) { el.textContent = has ? money(t.t) : ""; });
    document.querySelectorAll("[data-bag-sum]").forEach(function (el) { el.textContent = money(t.t); });
    document.querySelectorAll("[data-bag-plural]").forEach(function (el) { el.textContent = t.c === 1 ? "" : "s"; });
    var cartBar = document.getElementById("take-cart-bar");
    if (cartBar) cartBar.hidden = !has;
    if (!bag) return;
    var lines = bag.querySelector("[data-bag-lines]"); lines.textContent = "";
    Object.keys(items).forEach(function (key) {
      var it = items[key], li = document.createElement("li");
      li.className = "take-cart-item";
      if (it.image) {
        var thumb = document.createElement("img");
        thumb.className = "take-cart-item-thumb";
        thumb.src = it.image;
        thumb.alt = it.name;
        li.appendChild(thumb);
      } else {
        var ph = document.createElement("div");
        ph.className = "take-cart-item-ph";
        ph.textContent = (it.name || "P").charAt(0).toUpperCase();
        li.appendChild(ph);
      }
      var info = document.createElement("div"); info.className = "take-cart-item-info";
      var nm = document.createElement("div"); nm.className = "take-cart-item-title"; nm.textContent = it.name;
      info.appendChild(nm);
      if (it.variant_title) {
        var vr = document.createElement("div"); vr.className = "take-cart-item-variant"; vr.textContent = it.variant_title;
        info.appendChild(vr);
      }
      var pr = document.createElement("div"); pr.className = "take-cart-item-price"; pr.textContent = money(it.price * it.qty);
      info.appendChild(pr);
      var q = document.createElement("div"); q.className = "take-qty-stepper";
      function btn(txt, d) { var b = document.createElement("button"); b.type = "button"; b.className = "take-qty-btn"; b.textContent = txt; b.setAttribute("aria-label", d > 0 ? "More " + it.name : "Fewer " + it.name); b.onclick = function () { it.qty += d; if (it.qty <= 0) delete items[key]; save(); render(); }; return b; }
      var n = document.createElement("span"); n.className = "take-qty-val"; n.textContent = it.qty;
      q.appendChild(btn("−", -1)); q.appendChild(n); q.appendChild(btn("+", 1));
      li.appendChild(info); li.appendChild(q); lines.appendChild(li);
    });
    bag.querySelector("[data-bag-empty]").hidden = has; bag.querySelector("[data-bag-foot]").hidden = !has;
    var fo = Number(document.body.dataset.freeOver || 0), sh = bag.querySelector("[data-ship]");
    if (sh) {
      sh.hidden = !(fo > 0 && has);
      if (fo > 0 && has) {
        var left = fo - t.t;
        sh.querySelector("[data-ship-text]").textContent = left > 0 ? "Add " + money(left) + " more for free delivery" : "You've unlocked free delivery!";
        sh.querySelector("[data-ship-fill]").style.width = Math.min(100, Math.round(t.t / fo * 100)) + "%";
        sh.classList.toggle("done", left <= 0);
      }
    }
  }
  function openBag(v) {
    if (!bag) return;
    bag.hidden = !v;
    document.querySelectorAll("[data-close-bag].take-modal-veil, .bag-veil").forEach(function (veil) { veil.hidden = !v; });
    if (v) { var cb = bag.querySelector("[data-close-bag]"); if (cb) cb.focus(); }
  }
  // exposed for the product page and checkout
  window.BzBag = {
    add: function (it, qty) { it.kind = it.kind || "product"; var k = bagKey(it); items[k] = items[k] || { kind: it.kind, id: it.id, variant_id: it.variant_id || null, variant_title: it.variant_title || "", name: it.name, price: Number(it.price), image: it.image || "", qty: 0 }; items[k].qty += qty || 1; save(); render(); track("ADD_TO_CART", it.kind === "service" ? it.id : null, it.kind === "product" ? it.id : null); },
    lines: function () { return Object.keys(items).map(function (k) { return items[k]; }); },
    setQty: function (it, qty) { var k = bagKey(it); if (qty <= 0) delete items[k]; else if (items[k]) items[k].qty = qty; save(); render(); },
    clear: function () { items = {}; save(); render(); }, key: KEY, open: openBag
  };

  // ---------- Interactive Take App Product Detail Bottom Sheet Modal
  var pdpModal = document.getElementById("pdp-modal");
  var pdpVeil = document.getElementById("pdp-modal-veil");
  var currentPdp = null;

  function openPdp(itemData) {
    if (!pdpModal) return;
    currentPdp = {
      id: itemData.id,
      kind: itemData.kind || "product",
      name: itemData.name || "Item",
      basePrice: Number(itemData.price) || 0,
      comparePrice: itemData.compare ? Number(itemData.compare) : null,
      image: itemData.image || "",
      desc: itemData.desc || "",
      qty: 1,
      variantTitle: "",
      extraPrice: 0,
      note: ""
    };
    var imgEl = document.getElementById("pdp-modal-img");
    var galEl = document.getElementById("pdp-modal-gallery");
    if (imgEl && galEl) {
      if (currentPdp.image) {
        imgEl.src = currentPdp.image;
        imgEl.style.display = "block";
        galEl.hidden = false;
        galEl.style.display = "block";
      } else {
        imgEl.removeAttribute("src");
        imgEl.style.display = "none";
        galEl.hidden = true;
        galEl.style.display = "none";
      }
    }
    var titleEl = document.getElementById("pdp-modal-title");
    if (titleEl) titleEl.textContent = currentPdp.name;
    var descEl = document.getElementById("pdp-modal-desc");
    if (descEl) descEl.textContent = currentPdp.desc;
    var tagEl = document.getElementById("pdp-modal-tag");
    if (tagEl) {
      if (currentPdp.comparePrice && currentPdp.comparePrice > currentPdp.basePrice) {
        var pct = Math.round((1 - currentPdp.basePrice / currentPdp.comparePrice) * 100);
        tagEl.textContent = "Save " + pct + "%";
        tagEl.hidden = false;
      } else {
        tagEl.hidden = true;
      }
    }
    var compareEl = document.getElementById("pdp-modal-compare");
    if (compareEl) {
      if (currentPdp.comparePrice && currentPdp.comparePrice > currentPdp.basePrice) {
        compareEl.textContent = money(currentPdp.comparePrice);
        compareEl.hidden = false;
      } else {
        compareEl.hidden = true;
      }
    }
    var noteInput = document.getElementById("pdp-modal-note");
    if (noteInput) noteInput.value = "";
    updatePdpPrice();
    pdpModal.hidden = false;
    if (pdpVeil) pdpVeil.hidden = false;
  }

  function closePdp() {
    if (pdpModal) pdpModal.hidden = true;
    if (pdpVeil) pdpVeil.hidden = true;
    var imgEl = document.getElementById("pdp-modal-img");
    if (imgEl) imgEl.removeAttribute("src");
    currentPdp = null;
  }

  function updatePdpPrice() {
    if (!currentPdp) return;
    var unitPrice = currentPdp.basePrice + currentPdp.extraPrice;
    var total = unitPrice * currentPdp.qty;
    var priceEl = document.getElementById("pdp-modal-price");
    if (priceEl) priceEl.textContent = money(unitPrice);
    var qtyEl = document.getElementById("pdp-modal-qty");
    if (qtyEl) qtyEl.textContent = currentPdp.qty;
    var btnPrice = document.getElementById("pdp-modal-btn-price");
    if (btnPrice) btnPrice.textContent = money(total);
  }

  var minusBtn = document.getElementById("pdp-modal-minus");
  if (minusBtn) {
    minusBtn.onclick = function () {
      if (currentPdp && currentPdp.qty > 1) {
        currentPdp.qty--;
        updatePdpPrice();
      }
    };
  }
  var plusBtn = document.getElementById("pdp-modal-plus");
  if (plusBtn) {
    plusBtn.onclick = function () {
      if (currentPdp) {
        currentPdp.qty++;
        updatePdpPrice();
      }
    };
  }
  var addBtn = document.getElementById("pdp-modal-add-btn");
  if (addBtn) {
    addBtn.onclick = function () {
      if (!currentPdp) return;
      var noteInput = document.getElementById("pdp-modal-note");
      var note = noteInput ? noteInput.value.trim() : "";
      var itemToAdd = {
        kind: currentPdp.kind,
        id: currentPdp.id,
        name: currentPdp.name,
        price: currentPdp.basePrice + currentPdp.extraPrice,
        image: currentPdp.image,
        variant_title: currentPdp.variantTitle + (note ? (currentPdp.variantTitle ? "; " : "") + note : "")
      };
      window.BzBag.add(itemToAdd, currentPdp.qty);
      closePdp();
    };
  }

  document.addEventListener("click", function (e) {
    var add = e.target.closest("[data-add]");
    if (add) {
      e.stopPropagation();
      var kind = add.dataset.kind || "service";
      window.BzBag.add({ kind: kind, id: add.dataset.id, variant_id: add.dataset.variant || null, name: add.dataset.name, price: add.dataset.price, image: add.dataset.image }, 1);
      add.classList.add("added"); setTimeout(function () { add.classList.remove("added"); }, 700);
      return;
    }
    var pdpRow = e.target.closest("[data-take-pdp]");
    if (pdpRow && !e.target.closest("a, button[data-add]")) {
      openPdp(pdpRow.dataset);
      return;
    }
    if (e.target.closest("[data-close-pdp]")) {
      closePdp();
      return;
    }
    if (pdpVeil && e.target === pdpVeil) {
      closePdp();
      return;
    }

    // Bio Show more / Show less toggle
    var bioToggle = e.target.closest("[data-bio-toggle]");
    if (bioToggle) {
      var bioBox = bioToggle.closest("[data-bio-container]");
      if (bioBox) {
        var isExp = bioBox.classList.toggle("expanded");
        bioToggle.textContent = isExp ? "Show less" : "Show more";
      }
      return;
    }

    // Slide-out Navigation Drawer
    if (e.target.closest("[data-open-menu]")) {
      var drawer = document.getElementById("take-menu-drawer");
      var mveil = document.getElementById("take-menu-veil");
      if (drawer) drawer.hidden = false;
      if (mveil) mveil.hidden = false;
      return;
    }
    if (e.target.closest("[data-close-menu]") || (e.target.id === "take-menu-veil")) {
      var drawer = document.getElementById("take-menu-drawer");
      var mveil = document.getElementById("take-menu-veil");
      if (drawer) drawer.hidden = true;
      if (mveil) mveil.hidden = true;
      return;
    }

    // Search Modal
    if (e.target.closest("[data-open-search]")) {
      var sModal = document.getElementById("take-search-modal");
      if (sModal) {
        sModal.hidden = false;
        var sInp = sModal.querySelector("input");
        if (sInp) sInp.focus();
      }
      return;
    }
    if (e.target.closest("[data-close-search]") || (e.target.id === "take-search-modal")) {
      var sModal = document.getElementById("take-search-modal");
      if (sModal) sModal.hidden = true;
      return;
    }

    // Favorite Heart Toggle
    var favBtn = e.target.closest("[data-fav-btn]");
    if (favBtn) {
      e.stopPropagation();
      favBtn.classList.toggle("active");
      var svg = favBtn.querySelector("svg");
      if (svg) svg.setAttribute("fill", favBtn.classList.contains("active") ? "currentColor" : "none");
      return;
    }

    // Toggle Filters Sidebar (Mobile)
    if (e.target.closest("[data-toggle-filters]")) {
      var sidebar = document.getElementById("store-filters");
      if (sidebar) {
        var opening = !sidebar.classList.contains("is-open");
        sidebar.classList.toggle("is-open");
        document.body.style.overflow = opening ? "hidden" : "";
      }
      return;
    }

    // Carousel Navigation (Prev / Next buttons)
    var prevBtn = e.target.closest("[data-carousel-prev]");
    var nextBtn = e.target.closest("[data-carousel-next]");
    if (prevBtn || nextBtn) {
      var sec = (prevBtn || nextBtn).closest(".ecom-carousel-section, .sx-sec");
      var rail = sec ? sec.querySelector(".ecom-carousel-rail, [data-carousel-rail], .rail") : null;
      if (rail) {
        var scrollAmt = Math.max(260, rail.clientWidth * 0.75);
        rail.scrollBy({ left: prevBtn ? -scrollAmt : scrollAmt, behavior: "smooth" });
      }
      return;
    }

    // Navigation Tabs Switching / Smooth Section Navigation
    var tabBtn = e.target.closest("[data-tab-target]");
    if (tabBtn) {
      var target = tabBtn.dataset.tabTarget;

      // 1. Update tab-target active states
      document.querySelectorAll("[data-tab-target]").forEach(function (b) {
        var isSame = b.dataset.tabTarget === target;
        b.classList.toggle("active", isSame);
        b.classList.toggle("on", isSame);
        b.setAttribute("aria-selected", String(isSame));
        if (b.hasAttribute("aria-current")) b.setAttribute("aria-current", isSame ? "page" : "false");
      });

      // 2. Scroll smoothly to target section
      var targetEl = document.getElementById(target) || document.querySelector('[data-tab-panel="' + target + '"]');
      if (target === "products" || target === "shop") {
        targetEl = document.getElementById("shop") || targetEl;
      }
      if (targetEl) {
        var r = targetEl.getBoundingClientRect();
        window.scrollTo({ top: Math.max(0, window.scrollY + r.top - 80), behavior: "smooth" });
      } else if (target === "home" || target === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    // Category Tiles & Pills Scrolling / Filter
    var catTile = e.target.closest(".take-cat-tile, .take-cat-pill");
    if (catTile) {
      var targetCat = catTile.dataset.cat || "";
      document.querySelectorAll(".take-cat-tile, .take-cat-pill").forEach(function (p) {
        var matches = (p.dataset.cat || "") === targetCat;
        p.classList.toggle("on", matches);
        p.setAttribute("aria-pressed", String(matches));
      });
      if (!targetCat) {
        document.querySelectorAll("[data-cat-block]").forEach(function (b) { b.style.display = ""; });
      } else {
        document.querySelectorAll("[data-cat-block]").forEach(function (b) {
          var match = b.dataset.catBlock === targetCat;
          b.style.display = match ? "" : "none";
        });
        var block = document.querySelector('[data-cat-block="' + targetCat + '"]');
        if (block) block.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    if (e.target.closest("[data-open-bag]")) { openBag(true); return; }
    if (e.target.closest("[data-close-bag]")) { openBag(false); return; }
    var cp = e.target.closest("[data-copy]");
    if (cp && navigator.clipboard) { navigator.clipboard.writeText(cp.dataset.copy); cp.textContent = "Copied"; return; }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      openBag(false);
      closePdp();
      var drawer = document.getElementById("take-menu-drawer");
      if (drawer) drawer.hidden = true;
      var mveil = document.getElementById("take-menu-veil");
      if (mveil) mveil.hidden = true;
      var sModal = document.getElementById("take-search-modal");
      if (sModal) sModal.hidden = true;
    }
  });
  if (bag) {
    bag.querySelector("[data-checkout]").addEventListener("click", function () {
      var t = totals(); if (!t.c) return;
      var name = (bag.querySelector("[data-bag-name]") || {}).value || "";
      var phone = (bag.querySelector("[data-bag-phone]") || {}).value || "";
      name = name.trim(); phone = phone.trim();
      var lines = Object.keys(items).map(function (k) { var it = items[k]; return it.qty + " × " + it.name + (it.variant_title ? " (" + it.variant_title + ")" : "") + " — " + money(it.price * it.qty); });
      var text = (document.body.dataset.intro || "Hi, I'd like to order:") + "\n" + lines.join("\n") + "\nTotal: " + money(t.t) + (name ? "\nName: " + name : "");
      track("WHATSAPP_CLICK");
      if (!draft && phone && document.body.dataset.leads === "1") post(api + "/leads", Object.assign({ name: name || "WhatsApp order", phone: phone, message: text, website: "" }, attrib(), { source: "whatsapp" })).catch(function () {});
      if (wa) window.open("https://wa.me/" + wa + "?text=" + encodeURIComponent(text), "_blank", "noopener");
      items = {}; save(); render(); openBag(false);
    });
  }
  render();

  // ---------- Touch & mouse drag scrolling for product rails & category rows
  (function () {
    document.querySelectorAll(".store-products-grid, .rail, .store-category-icon-row, .store-category-bar").forEach(function (grid) {
      var startX = 0, startScroll = 0, isDragging = false;
      grid.addEventListener("touchstart", function (e) {
        if (!e.touches[0]) return;
        startX = e.touches[0].clientX;
        startScroll = grid.scrollLeft;
        isDragging = true;
      }, { passive: true });
      grid.addEventListener("touchmove", function (e) {
        if (!isDragging || !e.touches[0]) return;
        grid.scrollLeft = startScroll + (startX - e.touches[0].clientX);
      }, { passive: true });
      grid.addEventListener("touchend", function () { isDragging = false; }, { passive: true });

      // Mouse drag for desktop browser preview
      var isMouseDown = false;
      grid.addEventListener("mousedown", function (e) {
        if (e.target.closest("button, a, input, select, label")) return;
        isMouseDown = true;
        startX = e.pageX - grid.offsetLeft;
        startScroll = grid.scrollLeft;
      });
      grid.addEventListener("mouseleave", function () { isMouseDown = false; });
      grid.addEventListener("mouseup", function () { isMouseDown = false; });
      grid.addEventListener("mousemove", function (e) {
        if (!isMouseDown) return;
        e.preventDefault();
        var x = e.pageX - grid.offsetLeft;
        grid.scrollLeft = startScroll - (x - startX);
      });
    });
  })();

  // ---------- Follow and Share store buttons
  document.addEventListener("click", function (e) {
    var fBtn = e.target.closest("[data-follow-btn]");
    if (fBtn) {
      e.preventDefault();
      var slug = document.body.dataset.slug || "store";
      var key = "bz-follow-" + slug;
      var followed = false;
      try { followed = localStorage.getItem(key) === "1"; } catch (err) {}
      followed = !followed;
      try { localStorage.setItem(key, followed ? "1" : "0"); } catch (err) {}
      fBtn.classList.toggle("following", followed);
      var span = fBtn.querySelector("span");
      if (span) span.textContent = followed ? "Following" : "Follow Store";
      return;
    }

    var sBtn = e.target.closest("[data-share-btn]");
    if (sBtn) {
      e.preventDefault();
      var title = document.title || document.body.dataset.business || "Store";
      var url = window.location.href;
      if (navigator.share) {
        navigator.share({ title: title, url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () {
          var span = sBtn.querySelector("span");
          var prev = span ? span.textContent : "";
          if (span) span.textContent = "Link copied!";
          setTimeout(function () { if (span) span.textContent = prev || "Share"; }, 2000);
        }).catch(function () {});
      }
      return;
    }
  });

  // ---------- Cart sticky bar above bottom nav (shows when cart has items)
  (function () {
    var cartBar = document.getElementById("take-cart-bar");
    if (!cartBar) {
      cartBar = document.createElement("div");
      cartBar.id = "take-cart-bar";
      cartBar.setAttribute("hidden", "");
      cartBar.innerHTML = '<button type="button" data-open-bag style="width:100%;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#064e3b 0%,#10b981 100%);color:#fff;border:0;padding:11px 20px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:0.01em;"><span>\uD83D\uDED2 View order \u2022 <span data-bag-count>0</span> item<span data-bag-plural>s</span></span><strong data-bag-total style="font-size:15px;"></strong></button>';
      cartBar.style.cssText = "position:fixed;bottom:60px;left:0;right:0;z-index:48;";
      document.body.appendChild(cartBar);
    }
  })();

  var form = document.getElementById("book-form");
  if (form) {
    var slotsEl = document.getElementById("slots"), msg = document.getElementById("book-msg"), chosen = null;
    var d = form.elements.date; var today = new Date(); d.min = today.toISOString().slice(0, 10);
    function serviceIds() { return Array.prototype.map.call(form.querySelectorAll("input[name=service]:checked"), function (i) { return i.value; }); }
    function loadSlots() {
      chosen = null; var ids = serviceIds();
      if (!ids.length || !d.value) { slotsEl.textContent = "Choose a service and date to see times."; return; }
      slotsEl.textContent = "Loading times…";
      fetch(api + "/slots?date=" + d.value + "&" + ids.map(function (i) { return "service_ids=" + i; }).join("&"))
        .then(function (r) { return r.json(); }).then(function (j) {
          slotsEl.textContent = "";
          if (!j.slots || !j.slots.length) { slotsEl.textContent = j.reason || "No times available that day. Try another date."; return; }
          j.slots.forEach(function (s) {
            var b = document.createElement("button"); b.type = "button"; b.textContent = s.label; b.setAttribute("aria-pressed", "false");
            b.onclick = function () { chosen = s; slotsEl.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); }); b.setAttribute("aria-pressed", "true"); };
            slotsEl.appendChild(b);
          });
        }).catch(function () { slotsEl.textContent = "Couldn't load times. Please try again."; });
    }
    form.addEventListener("change", function (e) { if (e.target.name === "service" || e.target.name === "date") loadSlots(); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ids = serviceIds();
      if (!ids.length) return say(msg, "err", "Please choose a service.");
      if (!chosen) return say(msg, "err", "Please choose a time.");
      if (!form.elements.name.value.trim() || !form.elements.phone.value.trim()) return say(msg, "err", "Please enter your name and phone.");
      var btn = form.querySelector("button[type=submit]"); btn.disabled = true;
      post(api + "/bookings", Object.assign({ service_ids: ids, starts_at: chosen.starts_at, name: form.elements.name.value, phone: form.elements.phone.value, notes: form.elements.notes.value, website: form.elements.website.value }, attrib()))
        .then(function () { say(msg, "ok", "Request sent! We'll confirm on WhatsApp shortly."); form.reset(); slotsEl.textContent = ""; })
        .catch(function (err) { say(msg, "err", err.message); loadSlots(); })
        .then(function () { btn.disabled = false; });
    });
  }

  document.querySelectorAll("form.lead-form").forEach(function (lf) {
    var lmsg = lf.querySelector(".lead-msg");
    lf.addEventListener("submit", function (e) {
      e.preventDefault();
      var c = lf.elements.contact.value.trim(), isMail = c.indexOf("@") > -1;
      if (!lf.elements.name.value.trim() || !c) return say(lmsg, "err", "Please enter your name and a phone or email.");
      post(api + "/leads", Object.assign({ name: lf.elements.name.value, phone: isMail ? null : c, email: isMail ? c : null, message: lf.elements.message ? lf.elements.message.value : "", website: lf.elements.website.value }, attrib()))
        .then(function () { say(lmsg, "ok", "Thanks! We'll get back to you soon."); lf.reset(); })
        .catch(function (err) { say(lmsg, "err", err.message); });
    });
  });

  var rf = document.getElementById("review-form");
  if (rf) {
    var rating = 0, rmsg = document.getElementById("review-msg");
    document.getElementById("stars").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; rating = +b.dataset.v;
      this.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-checked", String(+x.dataset.v === rating)); x.setAttribute("aria-pressed", String(+x.dataset.v <= rating)); });
    });
    rf.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!rating) return say(rmsg, "err", "Please choose a star rating.");
      post(api + "/reviews", { rating: rating, name: rf.elements.name.value, comment: rf.elements.comment.value, token: rf.dataset.token || null, website: rf.elements.website.value })
        .then(function () { say(rmsg, "ok", "Thank you! Your review has been posted."); rf.reset(); })
        .catch(function (err) { say(rmsg, "err", err.message); });
    });
  }

  // ---------- editor bridge: when this page is the builder's preview, clicks select sections while keeping interactive controls fully functional
  if (document.body.dataset.edit === "true" && window.parent !== window) {
    var sel = null;
    function mark(id, scroll) {
      document.querySelectorAll(".sx.sel").forEach(function (n) { n.classList.remove("sel"); });
      var el = id && document.querySelector('.sx[data-sid="' + id + '"]'); sel = id;
      if (el) { el.classList.add("sel"); if (scroll) { var r = el.getBoundingClientRect(); window.scrollTo({ top: Math.max(0, window.scrollY + r.top - 90), behavior: "smooth" }); } }
    }
    document.addEventListener("click", function (e) {
      // Allow ALL interactive controls, buttons, forms, quantity steppers, cart drawer, modals, tabs, etc. to work naturally
      if (e.target.closest("button, input, select, textarea, label, [data-tab-target], [data-cat], [data-add], [data-take-pdp], [data-close-pdp], [data-fav-btn], [data-open-bag], [data-close-bag], [data-open-menu], [data-close-menu], [data-open-search], [data-close-search], [data-toggle-filters], [data-carousel-prev], [data-carousel-next], [data-checkout], [data-checkout-link], [data-follow-btn], [data-share-btn], #bag, #pdp-modal, #take-cart-bar, .take-modal-veil, .store-bottom-bar, .take-qty-stepper, .store-search-bar")) {
        return;
      }
      var a = e.target.closest("a");
      var s = e.target.closest(".sx");
      if (s) {
        if (a) e.preventDefault();
        mark(s.dataset.sid, false);
        window.parent.postMessage({ aqivo: "select", bizora: "select", id: s.dataset.sid }, "*");
      }
    });
    window.addEventListener("message", function (e) { if (e.data && (e.data.aqivo === "select" || e.data.bizora === "select")) mark(e.data.id, true); });
    window.parent.postMessage({ aqivo: "ready", bizora: "ready" }, "*");
  }
})();
