(function () {
  var input = document.getElementById("sq"); if (!input) return;
  if (input.value.trim() && window.BzTrack) window.BzTrack("SEARCH");
  var KEY = "bz-recent-" + document.body.dataset.slug, recent = [];
  try { recent = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { recent = []; }
  var root = location.pathname.replace(/\/search\/?$/, "");
  var box = document.getElementById("recent");
  if (input.value.trim()) { recent = [input.value.trim()].concat(recent.filter(function (x) { return x !== input.value.trim(); })).slice(0, 6); try { localStorage.setItem(KEY, JSON.stringify(recent)); } catch (e) {} }
  if (!input.value && recent.length) recent.forEach(function (r) { var a = document.createElement("a"); a.className = "chip"; a.href = root + "/search?q=" + encodeURIComponent(r); a.textContent = r; a.style.cssText = "text-decoration:none;display:inline-flex;align-items:center"; box.appendChild(a); });
  var sugg = document.getElementById("sugg"), t = null;
  input.addEventListener("input", function () {
    clearTimeout(t); var q = input.value.trim(); if (q.length < 2) { sugg.textContent = ""; return; }
    t = setTimeout(function () {
      fetch(input.dataset.suggest + "?q=" + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(function (j) {
        sugg.textContent = (j.results || []).length ? "" : "";
        (j.results || []).forEach(function (x) { var a = document.createElement("a"); a.href = root + x.url; a.className = "card"; a.style.cssText = "display:flex;justify-content:space-between;text-decoration:none;padding:12px 16px"; a.setAttribute("role", "option"); var n = document.createElement("span"); n.textContent = x.name; var k = document.createElement("small"); k.textContent = x.kind; k.style.color = "var(--muted)"; a.appendChild(n); a.appendChild(k); sugg.appendChild(a); });
      }).catch(function () {});
    }, 220);
  });
})();
