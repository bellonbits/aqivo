(function () {
  var box = document.getElementById("pay-box");
  if (box) {
    var api = window.BzApi, msg = document.getElementById("pay-msg"), tok = box.dataset.token;
    var check = function () { return window.BzPost(api + "/orders/" + tok + "/verify-payment", {}).then(function (r) { if (r.payment_status === "PAID") { location.href = location.pathname; return true; } return false; }).catch(function () { return false; }); };
    var poll = function (n) { if (n <= 0) return; setTimeout(function () { check().then(function (done) { if (!done) poll(n - 1); }); }, 4000); };
    document.getElementById("pay-now").addEventListener("click", function () {
      window.BzSay(msg, "ok", "Starting payment…");
      window.BzPost(api + "/orders/" + tok + "/pay", {}).then(function (r) { if (r.type === "redirect") location.href = r.url; else { window.BzSay(msg, "ok", r.message || "Check your phone."); poll(25); } }).catch(function (e) { window.BzSay(msg, "err", e.message); });
    });
    if (box.dataset.poll === "1" || /[?&]pay=(wait|return)/.test(location.search)) poll(25);
  }
  var f = document.getElementById("ref-form"); if (!f) return;
  f.addEventListener("submit", function (e) {
    e.preventDefault(); var m = document.getElementById("ref-msg"), api = window.BzApi;
    window.BzPost(api + "/orders/" + f.dataset.token + "/payment-reference", { reference: f.elements.ref.value })
      .then(function () { window.BzSay(m, "ok", "Thanks! We'll check it and confirm your payment."); setTimeout(function () { location.reload(); }, 1200); })
      .catch(function (err) { window.BzSay(m, "err", err.message); });
  });
})();
