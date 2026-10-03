(function () {
  var root = document.querySelector("[data-pdp]"); if (!root) return;
  var data = JSON.parse(document.getElementById("pdp-data").textContent), fmt = function (n) { var cur = document.body.dataset.cur || ""; return (cur.length > 1 ? cur + " " : cur) + Number(n).toLocaleString("en", { maximumFractionDigits: 2 }); };
  var chosen = {}, qty = 1, main = document.getElementById("pdp-main"), price = document.getElementById("pdp-price"), cmp = document.getElementById("pdp-compare"),
    stock = document.getElementById("pdp-stock"), add = document.getElementById("pdp-add"), buy = document.getElementById("pdp-buy"), msg = document.getElementById("pdp-msg"), qEl = document.getElementById("pdp-qty");
  var pid = document.getElementById("pdp-add").dataset.id;
  if (window.BzTrack) window.BzTrack("PRODUCT_VIEW", null, pid);
  function current() {
    if (!data.variants.length) return null;
    return data.variants.filter(function (v) { return data.options.every(function (o) { return v.options[o.name] === chosen[o.name]; }); })[0] || null;
  }
  function stockOf(v) { return v ? v.stock : data.stock; }
  function update() {
    var v = current(), need = data.options.length && !v;
    var p = v ? v.price : data.price, c = v ? v.compare : data.compare, st = stockOf(v);
    if (price) price.textContent = need && data.variants.length ? "From " + fmt(Math.min.apply(null, data.variants.map(function (x) { return x.price; }))) : fmt(p);
    if (cmp) { if (c && c > p && !need) { cmp.textContent = fmt(c); cmp.hidden = false; } else cmp.hidden = true; }
    if (v && v.image && main) main.src = v.image;
    // disable option values with no stock in the current partial selection
    data.options.forEach(function (o) {
      root.querySelectorAll('[data-opt="' + o.name + '"]').forEach(function (b) {
        var test = Object.assign({}, chosen); test[o.name] = b.dataset.val;
        var any = data.variants.some(function (x) { return data.options.every(function (oo) { return !test[oo.name] || x.options[oo.name] === test[oo.name]; }) && (x.stock === null || x.stock > 0); });
        b.disabled = !any;
      });
    });
    var out = v ? (st !== null && st <= 0) : (!data.variants.length && st !== null && st <= 0);
    stock.className = "stock" + (out ? " out" : (st !== null && st > 0 && st <= 3 ? " low" : ""));
    stock.textContent = need ? "" : out ? "Sold out" : (st !== null && st <= 3 ? "Only " + st + " left" : (st !== null ? "In stock" : ""));
    add.disabled = out; buy.disabled = out;
    if (st !== null && !need && qty > st && st > 0) qty = st;
    qEl.textContent = qty;
  }
  function item() {
    var v = current();
    return { kind: "product", id: add.dataset.id, variant_id: v ? v.id : null, variant_title: v ? v.title : "", name: add.dataset.name, price: v ? v.price : data.price, image: (v && v.image) || add.dataset.image };
  }
  function ready() {
    if (data.options.length && !current()) { msg.textContent = "Please choose " + data.options.filter(function (o) { return !chosen[o.name]; }).map(function (o) { return o.name.toLowerCase(); }).join(" and ") + "."; msg.hidden = false; return false; }
    msg.hidden = true; return true;
  }
  root.addEventListener("click", function (e) {
    var t = e.target.closest("[data-thumb]");
    if (t && main) { main.src = t.dataset.thumb; root.querySelectorAll("[data-thumb]").forEach(function (b) { b.setAttribute("aria-pressed", String(b === t)); }); }
    var o = e.target.closest("[data-opt]");
    if (o && !o.disabled) { chosen[o.dataset.opt] = o.dataset.val; root.querySelectorAll('[data-opt="' + o.dataset.opt + '"]').forEach(function (b) { b.setAttribute("aria-pressed", String(b === o)); }); update(); msg.hidden = true; }
    var q = e.target.closest("[data-q]");
    if (q) { var st = stockOf(current()); qty = Math.max(1, Math.min(st !== null && st > 0 ? st : 99, qty + Number(q.dataset.q))); qEl.textContent = qty; }
    if (e.target === add && ready() && window.BzBag) { window.BzBag.add(item(), qty); add.textContent = "Added"; setTimeout(function () { add.textContent = "Add to bag"; }, 900); window.BzBag.open(true); }
    if (e.target === buy && ready() && window.BzBag) { window.BzBag.add(item(), qty); location.href = location.pathname.replace(/\/products\/.*$/, "") + "/checkout"; }
  });
  var save = document.getElementById("pdp-save");
  if (save) {
    var base = "/api/v1/public/" + document.body.dataset.slug + "/account", pidv = save.dataset.pid, accountUrl = location.pathname.replace(/\/products\/.*$/, "") + "/account";
    var h = { "Content-Type": "application/json", "X-Bizora": "1" };
    fetch(base + "/saved", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : []; }).then(function (rows) { if (rows.some(function (x) { return x.id === pidv; })) { save.setAttribute("aria-pressed", "true"); save.textContent = "Saved"; } }).catch(function () {});
    save.addEventListener("click", function () {
      var on = save.getAttribute("aria-pressed") === "true";
      fetch(base + "/saved/" + pidv, { method: on ? "DELETE" : "POST", credentials: "same-origin", headers: h }).then(function (r) {
        if (r.status === 401) { location.href = accountUrl; return; }
        save.setAttribute("aria-pressed", String(!on)); save.textContent = on ? "♡ Save" : "♥ Saved";
      });
    });
  }
  update();
})();
