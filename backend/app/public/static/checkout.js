(function () {
  var host = document.getElementById("chk"); if (!host) return;
  var cfg = JSON.parse(document.getElementById("chk-config").textContent), form = document.getElementById("chk-form"), api = window.BzApi, root = location.pathname.replace(/\/checkout\/?$/, "");
  var cur = document.body.dataset.cur || "";
  function fmt(n) { return (cur.length > 1 ? cur + " " : cur) + Number(n).toLocaleString("en", { maximumFractionDigits: 2 }); }
  var state = { delivery: cfg.fulfilment.pickup ? "PICKUP" : "DELIVERY", zone: "", code: "", pay: cfg.payments[0] ? cfg.payments[0].key : "", quote: null };
  var linesEl = document.getElementById("lines"), totalsEl = document.getElementById("totals"), msg = document.getElementById("chk-msg"), place = document.getElementById("place");
  if (window.BzTrack) window.BzTrack("CHECKOUT_STARTED");

  function radios(el, name, opts, selected, onchange) {
    if (!el) return;
    el.textContent = "";
    opts.forEach(function (o) {
      var l = document.createElement("label");
      var isSelected = o.key === selected;
      l.className = name === "delivery" ? ("take-service-card" + (isSelected ? " selected" : "")) : ("take-addon-item" + (isSelected ? " selected" : ""));
      l.style.cursor = "pointer";
      var i = document.createElement("input"); i.type = "radio"; i.name = name; i.value = o.key; i.checked = isSelected;
      i.style.marginRight = "8px";
      i.onchange = function () { onchange(o.key); };
      var d = document.createElement("div"); d.style.flex = "1";
      var b = document.createElement("strong"); b.textContent = o.label; b.style.display = "block"; d.appendChild(b);
      if (o.note) { var s = document.createElement("span"); s.style.fontSize = "12px"; s.style.color = "#6b7280"; s.textContent = o.note; d.appendChild(s); }
      l.appendChild(i); l.appendChild(d); el.appendChild(l);
    });
  }

  function drawOptions() {
    var d = [];
    if (cfg.fulfilment.pickup) d.push({ key: "PICKUP", label: "Pickup", note: cfg.pickup_note || "Free · Collect from store" });
    if (cfg.fulfilment.delivery) d.push({ key: "DELIVERY", label: "Delivery", note: cfg.delivery.estimate || "Doorstep delivery" });
    radios(document.getElementById("delivery-opts"), "delivery", d, state.delivery, function (k) { state.delivery = k; drawOptions(); requote(); });
    var del = state.delivery === "DELIVERY", zones = cfg.delivery.zones;
    var addrWrap = document.getElementById("addr-wrap");
    if (addrWrap) addrWrap.hidden = !del;
    var zw = document.getElementById("zone-wrap");
    if (zw) zw.hidden = !(del && zones.length);
    if (del && zones.length) {
      var sel = form.elements.zone; sel.textContent = "";
      var ph = document.createElement("option"); ph.value = ""; ph.textContent = "Choose delivery area…"; sel.appendChild(ph);
      zones.forEach(function (z) { var o = document.createElement("option"); o.value = z.name; o.textContent = z.name + " — " + fmt(z.fee); o.selected = z.name === state.zone; sel.appendChild(o); });
      sel.onchange = function () { state.zone = sel.value; requote(); };
    }
    radios(document.getElementById("pay-opts"), "pay", cfg.payments.map(function (p) { return { key: p.key, label: p.label, note: p.instructions }; }), state.pay, function (k) { state.pay = k; drawOptions(); });
  }

  function lines() { return (window.BzBag ? window.BzBag.lines() : []).map(function (l) { return { kind: l.kind, id: l.id, variant_id: l.variant_id || null, qty: l.qty }; }); }
  function totalRow(label, val, cls) { var r = document.createElement("div"); r.className = "take-totals-row" + (cls ? " " + cls : ""); var a = document.createElement("span"); a.textContent = label; var b = document.createElement("strong"); b.textContent = val; r.appendChild(a); r.appendChild(b); return r; }

  function draw(q) {
    if (!linesEl || !totalsEl) return;
    linesEl.textContent = ""; totalsEl.textContent = "";
    q.lines.forEach(function (l) {
      var row = document.createElement("div"); row.className = "take-order-item-row";
      var imBox = document.createElement("div"); imBox.className = "take-order-item-thumb";
      if (l.image) { var im = document.createElement("img"); im.src = l.image; im.alt = ""; im.width = 48; im.height = 48; imBox.appendChild(im); }
      else { imBox.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package" style="color:#9ca3af"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'; }
      var mid = document.createElement("div"); mid.className = "take-order-item-details";
      var nm = document.createElement("div"); nm.className = "take-order-item-name"; nm.textContent = l.name; mid.appendChild(nm);
      if (l.variant_title) { var vt = document.createElement("div"); vt.className = "take-order-item-sub"; vt.textContent = "└ " + l.variant_title; mid.appendChild(vt); }
      var qd = document.createElement("div"); qd.className = "take-qty-stepper"; qd.style.marginTop = "6px";
      function b(d) {
        var x = document.createElement("button"); x.type = "button"; x.className = "take-qty-btn";
        x.innerHTML = d < 0 ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-minus"><path d="M5 12h14"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
        x.setAttribute("aria-label", (d > 0 ? "More " : "Fewer ") + l.name);
        x.onclick = function () { window.BzBag.setQty({ kind: l.kind, id: l.id, variant_id: l.variant_id }, l.qty + d); requote(); };
        return x;
      }
      var n = document.createElement("span"); n.className = "take-qty-val"; n.textContent = l.qty; qd.appendChild(b(-1)); qd.appendChild(n); qd.appendChild(b(1)); mid.appendChild(qd);
      var tot = document.createElement("div"); tot.className = "take-order-item-price"; tot.textContent = fmt(l.line_total);
      row.appendChild(imBox); row.appendChild(mid); row.appendChild(tot); linesEl.appendChild(row);
    });
    totalsEl.appendChild(totalRow("Subtotal", fmt(q.subtotal)));
    if (q.discount > 0) totalsEl.appendChild(totalRow("Discount (" + q.discount_code + ")", "−" + fmt(q.discount), "discount"));
    else if (q.discount_code) totalsEl.appendChild(totalRow("Code " + q.discount_code, "free delivery", "discount"));
    if (state.delivery === "DELIVERY") totalsEl.appendChild(totalRow("Delivery fee", q.delivery_fee > 0 ? fmt(q.delivery_fee) : "Free"));
    if (q.tax > 0) totalsEl.appendChild(totalRow(q.tax_inclusive ? "Includes tax" : "Tax", fmt(q.tax)));
    totalsEl.appendChild(totalRow("Total", fmt(q.total), "total"));
  }

  var seq = 0;
  function requote() {
    var ls = lines(); if (msg) msg.hidden = true;
    if (!ls.length) {
      if (linesEl) { linesEl.innerHTML = '<p class="take-subtle-hint">Your bag is empty. <a href="' + (root || '/') + '" style="color:var(--accent,#111827);font-weight:700">Explore store →</a></p>'; }
      if (totalsEl) totalsEl.textContent = "";
      if (place) place.disabled = true;
      return;
    }
    var my = ++seq; if (place) place.disabled = false;
    var phoneVal = form.elements.phone ? form.elements.phone.value : null;
    window.BzPost(api + "/cart/quote", { lines: ls, delivery_method: state.delivery, zone: state.zone || null, code: state.code || null, phone: phoneVal })
      .then(function (q) { if (my !== seq) return; state.quote = q; draw(q); var cm = document.getElementById("code-msg"); if (cm) cm.textContent = state.code && q.discount_code ? "Promo code applied" : ""; })
      .catch(function (e) { if (my !== seq) return; if (msg) window.BzSay(msg, "err", e.message); if (/code/i.test(e.message) && state.code) { state.code = ""; var cm = document.getElementById("code-msg"); if (cm) cm.textContent = e.message; } });
  }

  var codeBtn = document.getElementById("code-apply-btn");
  if (codeBtn) {
    codeBtn.onclick = function () {
      var ci = document.getElementById("code-input");
      if (ci) { state.code = ci.value.trim(); requote(); }
    };
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault(); if (msg) msg.hidden = true;
    var f = form.elements;
    var prefix = f.phone_prefix ? f.phone_prefix.value : "";
    var rawPhone = f.phone ? f.phone.value.trim() : "";
    var fullPhone = rawPhone.startsWith("+") ? rawPhone : (prefix ? prefix + " " + rawPhone.replace(/^0+/, "") : rawPhone);
    if (!f.name.value.trim() || !rawPhone) return window.BzSay(msg, "err", "Please enter your name and WhatsApp number.");
    if (cfg.require_email && (!f.email || !f.email.value.trim())) return window.BzSay(msg, "err", "Please enter your email.");
    if (state.delivery === "DELIVERY" && cfg.delivery.zones.length && !state.zone) return window.BzSay(msg, "err", "Please select your delivery area.");
    if (state.delivery === "DELIVERY" && f.address && f.address.value.trim().length < 3) return window.BzSay(msg, "err", "Please add your delivery address.");

    place.disabled = true; place.textContent = "Placing order…";
    window.BzPost(api + "/orders", {
      lines: lines(),
      name: f.name.value.trim(),
      phone: fullPhone,
      email: f.email ? f.email.value.trim() : null,
      delivery_method: state.delivery,
      zone: state.zone || null,
      address: f.address ? f.address.value : "",
      notes: f.notes ? f.notes.value : "",
      scheduled_for: f.scheduled_for ? f.scheduled_for.value || null : null,
      payment: state.pay,
      code: state.code || null,
      website: f.website ? f.website.value : "",
      ...window.BzAttrib()
    })
    .then(function (r) {
      window.BzBag.clear();
      if (r.payment && r.payment.type === "redirect" && r.payment.url) { location.href = r.payment.url; return; }
      location.href = root + "/order/" + r.token + (r.payment ? "?pay=wait" : "");
    })
    .catch(function (err) {
      window.BzSay(msg, "err", err.message);
      place.disabled = false;
      place.textContent = "Place order & Pay";
      requote();
    });
  });

  if (form.elements.phone) form.elements.phone.addEventListener("change", requote);
  fetch("/api/v1/public/" + document.body.dataset.slug + "/account/me", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
    if (!m) return; var f = form.elements;
    if (m.name && !f.name.value) f.name.value = m.name; if (m.phone && !f.phone.value) f.phone.value = m.phone; if (m.email && f.email && !f.email.value) f.email.value = m.email;
    var a = (m.addresses || [])[0]; if (a && f.address && !f.address.value) f.address.value = a.line;
  }).catch(function () {});
  drawOptions(); requote();
})();
