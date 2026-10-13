/* Aqivo booking bridge
   Load AFTER ../_bridge.js and aqivo-booking.js on index.html and service.html:
     <script src="../_bridge.js"></script>
     <script src="aqivo-booking.js"></script>
     <script src="aqivo-booking-bridge.js"></script>

   For any item of kind "service", "Book" (grid, related items) and the PDP
   "Book Service" button open the booking sheet instead of adding to the cart.
   Availability comes from the platform:
     GET  /api/v1/public/<slug>/slots?date=YYYY-MM-DD&service_ids=<id>
     POST /api/v1/public/<slug>/bookings
   so the server stays the source of truth for open times and double-booking. */
(function () {
  'use strict';
  var B = window.__BZ;
  if (!B) { try { B = JSON.parse(sessionStorage.getItem('aqivo_active_bz') || 'null'); } catch (e) {} }
  if (!B || !window.AqivoBooking) return;

  var ITEMS = B.items || [], byId = {};
  ITEMS.forEach(function (p) { byId[p.id] = p; });
  var API = '/api/v1/public/' + encodeURIComponent(B.slug || 'default');

  function isService(it) {
    return !!it && (it.kind === 'service' || (!it.kind && (B.is_service || !B.is_commerce)));
  }

  function fail(msg, code) { var e = new Error(msg); if (code) e.code = code; return e; }
  function messageOf(j, fallback) {
    var d = j && j.detail;
    if (typeof d === 'string') return d;
    return (d && d.message) || (j && j.message) || fallback;
  }

  function fetchSlots(date, svc) {
    return fetch(API + '/slots?date=' + encodeURIComponent(date) + '&service_ids=' + encodeURIComponent(svc.id))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        return {
          slots: (res.slots || []).map(function (s) { return { value: s.starts_at, label: s.label }; }),
          reason: res.reason || ''
        };
      });
  }

  function submit(p) {
    return fetch(API + '/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_ids: [p.service.id], starts_at: p.slot.value, name: p.name, phone: p.phone,
        notes: p.notes || '', source: 'WEBSITE', referrer: document.referrer || null, website: ''
      })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; });
    }).then(function (res) {
      if (!res.ok) {
        var msg = messageOf(res.j, 'Could not complete your booking. Please try another time.');
        throw fail(msg, (res.status === 409 || /taken|no longer|unavailable|conflict/i.test(msg)) ? 'SLOT_TAKEN' : '');
      }
      return res.j;
    });
  }

  function openFor(it) {
    var cfg = B.timezone ? { timezone: B.timezone } : {};
    window.AqivoBooking.open({
      service: { id: it.id, name: it.name, price: it.price, durationMin: it.duration || 60, currencySymbol: B.symbol || B.currency || 'KSh' },
      store: { name: B.name, phone: (window.AqivoBooking && window.AqivoBooking.normalisePhone ? window.AqivoBooking.normalisePhone(B.phone || B.wa_phone || B.wa || '') : (B.wa_phone || B.phone || B.wa || '')), address: B.address || '' },
      config: cfg,
      fetchSlots: fetchSlots,
      submit: submit,
      receiptBase: B.booking_receipt_base || ''   // set to show a "View booking receipt" link
    });
  }

  function itemForClick(btn) {
    if (btn.id === 'pdp-add-bag-btn') {
      var id = new URLSearchParams(location.search).get('id');
      return (id && byId[id]) || ITEMS[0];
    }
    return byId[btn.getAttribute('data-id')];
  }

  // Capture phase: runs before the store's own add-to-cart handlers.
  document.addEventListener('click', function (e) {
    if (B.bookingsOn === false) return;
    var btn = e.target.closest && e.target.closest('#pdp-add-bag-btn, .btn-add-cart');
    if (!btn) return;
    var it = itemForClick(btn);
    if (!isService(it)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openFor(it);
  }, true);

  window.AqivoBookingBridge = {
    openFor: openFor,
    isService: isService
  };
})();
