(function () {
  var host = document.getElementById("acct"); if (!host) return;
  var slug = document.body.dataset.slug, api = "/api/v1/public/" + slug + "/account", root = host.dataset.root || "";
  var cur = document.body.dataset.cur || "";
  function money(n) { return (cur.length > 1 ? cur + " " : cur) + Number(n).toLocaleString("en", { maximumFractionDigits: 2 }); }
  function call(method, path, body) {
    return fetch(api + path, { method: method, credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Bizora": "1" }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(typeof j.detail === "string" ? j.detail : "Something went wrong"); e.status = r.status; throw e; } return j; }); });
  }
  function say(el, cls, t) { el.className = "msg " + cls; el.textContent = t; el.hidden = false; }
  var login = document.getElementById("acct-login"), main = document.getElementById("acct-main"), pane = document.getElementById("pane"), me = null, tab = "orders";
  function el(tag, props, kids) { var n = document.createElement(tag); Object.keys(props || {}).forEach(function (k) { if (k === "text") n.textContent = props[k]; else if (k === "class") n.className = props[k]; else n.setAttribute(k, props[k]); }); (kids || []).forEach(function (c) { n.appendChild(c); }); return n; }

  var req = document.getElementById("otp-req"), ver = document.getElementById("otp-ver"), ident = "";
  req.addEventListener("submit", function (e) {
    e.preventDefault(); var m = document.getElementById("otp-msg"); m.hidden = true;
    call("POST", "/otp/request", { identifier: req.elements.identifier.value }).then(function (r) {
      ident = r.identifier; req.hidden = true; ver.hidden = false;
      document.getElementById("otp-where").textContent = r.channel === "LOG" ? "No message provider is set up on this server, so here is your code: " + r.dev_code : "We sent a code" + (r.channel === "WHATSAPP" ? " on WhatsApp" : " by email") + ". It expires in " + r.expires_minutes + " minutes.";
    }).catch(function (err) { say(m, "err", err.message); });
  });
  document.getElementById("otp-back").addEventListener("click", function () { ver.hidden = true; req.hidden = false; });
  ver.addEventListener("submit", function (e) {
    e.preventDefault(); var m = document.getElementById("ver-msg"); m.hidden = true;
    call("POST", "/otp/verify", { identifier: ident, code: ver.elements.code.value, name: ver.elements.name.value || null }).then(function (r) { me = r; show(); })
      .catch(function (err) { say(m, "err", err.message); });
  });
  document.getElementById("logout").addEventListener("click", function () { call("POST", "/logout").then(function () { me = null; show(); }); });
  document.querySelectorAll("[data-tab]").forEach(function (b) { b.addEventListener("click", function () { tab = b.dataset.tab; document.querySelectorAll("[data-tab]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); render(); }); });

  function show() { login.hidden = !!me; main.hidden = !me; if (me) { document.getElementById("hello").textContent = "Hello, " + me.name + (me.phone ? " · " + me.phone : me.email ? " · " + me.email : ""); render(); } }
  function list(items, empty, row) { pane.textContent = ""; if (!items.length) { pane.appendChild(el("p", { class: "sub", text: empty })); return; } var ul = el("div", { class: "sres" }); items.forEach(function (i) { ul.appendChild(row(i)); }); pane.appendChild(ul); }
  function render() {
    pane.textContent = "Loading…";
    if (tab === "orders") call("GET", "/orders").then(function (rows) { list(rows, "You haven't placed an order yet.", function (o) { var a = el("a", { class: "card", href: root + "/order/" + o.token, style: "display:grid;gap:4px;text-decoration:none" }, [el("div", { style: "display:flex;justify-content:space-between;gap:8px" }, [el("b", { text: "Order #" + o.number }), el("b", { text: money(o.total) })]), el("small", { text: o.items.join(", ") }), el("small", { text: o.status_text + " · " + (o.payment_status === "PAID" ? "Paid" : "Not paid yet") + " · " + new Date(o.created_at).toLocaleDateString() })]); return a; }); });
    else if (tab === "bookings") call("GET", "/bookings").then(function (rows) { list(rows, "No bookings yet.", function (b) { return el("div", { class: "card", style: "display:grid;gap:4px" }, [el("b", { text: b.services.join(", ") }), el("small", { text: new Date(b.starts_at).toLocaleString() + " · " + b.status.toLowerCase() })]); }); });
    else if (tab === "saved") call("GET", "/saved").then(function (rows) { list(rows, "Save products with the ♡ button and they'll appear here.", function (p) { return el("a", { class: "card", href: root + "/products/" + p.slug, style: "display:flex;justify-content:space-between;gap:8px;text-decoration:none" }, [el("b", { text: p.name }), el("span", { text: money(p.price) })]); }); });
    else if (tab === "addresses") { var f = el("form", { class: "book", style: "margin-top:16px" }, [el("label", { text: "Label" }, [el("input", { name: "label", value: "Home", maxlength: "40" })]), el("label", { text: "Address" }, [el("textarea", { name: "line", rows: "2", maxlength: "300", required: "required", placeholder: "Building, street, landmark" })]), el("button", { class: "btn primary", type: "submit", text: "Save address" }), el("div", { class: "msg", hidden: "hidden", role: "status" })]); f.addEventListener("submit", function (e) { e.preventDefault(); call("POST", "/addresses", { label: f.elements.label.value, line: f.elements.line.value }).then(function () { return call("GET", "/me"); }).then(function (r) { me = r; render(); }).catch(function (err) { say(f.querySelector(".msg"), "err", err.message); }); });
      list(me.addresses, "No saved addresses.", function (a) { var d = el("button", { class: "btn", type: "button", text: "Remove" }); d.addEventListener("click", function () { call("DELETE", "/addresses/" + a.id).then(function () { return call("GET", "/me"); }).then(function (r) { me = r; render(); }); }); return el("div", { class: "card", style: "display:flex;justify-content:space-between;gap:10px;align-items:center" }, [el("span", {}, [el("b", { text: a.label + (a.is_default ? " (default)" : "") }), el("br"), el("small", { text: a.line })]), d]); }); pane.appendChild(f); }
    else { pane.textContent = ""; var pf = el("form", { class: "book", style: "max-width:460px" }, [el("label", { text: "Name" }, [el("input", { name: "name", value: me.name, maxlength: "120" })]), el("label", { text: "Email" }, [el("input", { name: "email", type: "email", value: me.email || "", maxlength: "200" })]), el("button", { class: "btn primary", type: "submit", text: "Save" }), el("div", { class: "msg", hidden: "hidden", role: "status" })]); pf.addEventListener("submit", function (e) { e.preventDefault(); call("PATCH", "/me", { name: pf.elements.name.value, email: pf.elements.email.value }).then(function (r) { me = r; say(pf.querySelector(".msg"), "ok", "Saved."); show(); }).catch(function (err) { say(pf.querySelector(".msg"), "err", err.message); }); }); pane.appendChild(pf); }
  }
  call("GET", "/me").then(function (r) { me = r; show(); }).catch(function () { me = null; show(); });
})();
