/* ============================================================
   Aqivo Booking engine
   ------------------------------------------------------------
   Appointment scheduling for service businesses that share the
   same storefront app. Pure logic + localStorage persistence.

   Times are stored as UTC milliseconds and *displayed* in the
   business timezone (Africa/Nairobi, UTC+3 constant — Kenya has
   no DST). The engine reads `store.booking`:
     { timezone, hours:{mon:[[h,m],…]}, bufferMinutes,
       depositPercent, policy, staff:[{id,name,role,photo,
       workingHours:{mon:[…]}}], blockedDates:[…], reviews:[…] }
   ============================================================ */

window.AqivoBooking = (function () {
  'use strict';

  var OFFSET_MIN = 3 * 60; /* Africa/Nairobi, UTC+3 */
  var SLOT_STEP = 30;
  var HOLD_MINUTES = 10;
  var DAY_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function slug(store) { return store ? store.slug : 'default'; }
  function key(store, name) { return 'aqivo.bk.' + slug(store) + '.' + name; }
  function load(store, name, fallback) {
    try {
      var raw = localStorage.getItem(key(store, name));
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function save(store, name, value) {
    try { localStorage.setItem(key(store, name), JSON.stringify(value)); } catch (e) { /* non-fatal */ }
  }

  function config(store) { return (store && store.booking) ? store.booking : null; }
  function hasBooking(store) { return !!config(store); }

  /* ============================================================
     Time helpers (Nairobi wall clock)
     ============================================================ */
  function dayKey(ms) {
    return new Date(ms + OFFSET_MIN * 60000).toISOString().slice(0, 10);
  }
  function wallDate(ms) {
    return new Date(ms + OFFSET_MIN * 60000);
  }
  function timeOfDay(ms) {
    var d = wallDate(ms);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
  function fromNairobi(dayStr, timeStr) {
    var p = dayStr.split('-').map(Number);
    var t = timeStr.split(':').map(Number);
    return Date.UTC(p[0], p[1] - 1, p[2], t[0], t[1], 0, 0) - OFFSET_MIN * 60000;
  }
  function fmt12(min) {
    var h = Math.floor(min / 60), m = min % 60;
    var ap = h >= 12 ? 'PM' : 'AM';
    var hh = h % 12 === 0 ? 12 : h % 12;
    return hh + ':' + (m < 10 ? '0' + m : m) + ' ' + ap;
  }
  function formatTs(ms) {
    var d = wallDate(ms);
    return DAYS_SHORT[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' +
      ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()] +
      ', ' + fmt12(timeOfDay(ms));
  }
  function describeDay(dayStr) {
    var ms = fromNairobi(dayStr, '12:00');
    var today = dayKey(Date.now());
    var tomorrow = dayKey(Date.now() + 86400000);
    if (dayStr === today) return 'Today';
    if (dayStr === tomorrow) return 'Tomorrow';
    var d = wallDate(ms);
    return DAYS_SHORT[d.getUTCDay()] + ' ' + d.getUTCDate();
  }
  function nairobiNow() {
    return dayKey(Date.now());
  }
  function nextDays(count) {
    var out = [];
    var today = dayKey(Date.now());
    var ms = fromNairobi(today, '00:00');
    for (var i = 0; i < count; i++) {
      var d = dayKey(ms);
      var wd = DAY_ORDER[new Date(d + 'T12:00:00Z').getUTCDay()];
      out.push({ dayStr: d, dow: DAYS_SHORT[DAY_ORDER.indexOf(wd)], wd: wd });
      ms += 86400000;
    }
    return out;
  }

  /* ============================================================
     Slot engine
     ============================================================ */
  function emptyWeek() {
    var w = {};
    DAY_ORDER.slice(1).forEach(function (d) { w[d] = []; });
    w.sun = [];
    return w;
  }
  function mergeWeek(a, b) { /* a ∪ b interval lists ({s,e} objects), without overlap */
    var out = [];
    (a || []).concat(b || []).forEach(function (iv) {
      var s = iv.s, e = iv.e;
      var merged = false;
      for (var i = 0; i < out.length; i++) {
        if (s <= out[i].e && e >= out[i].s) {
          out[i] = { s: Math.min(s, out[i].s), e: Math.max(e, out[i].e) };
          merged = true;
        }
      }
      if (!merged) out.push({ s: s, e: e });
    });
    return out;
  }
  function toMin(hm) {
    var p = hm.split(':').map(Number);
    return p[0] * 60 + p[1];
  }
  function intersectIntervals(a, b) {
    var out = [];
    (a || []).forEach(function (x) {
      (b || []).forEach(function (y) {
        var s = Math.max(x.s, y.s), e = Math.min(x.e, y.e);
        if (s < e) out.push({ s: s, e: e });
      });
    });
    return out;
  }
  function weekOf(store, staffId) {
    var wk = store.booking.hours || {};
    var holes = store.booking.staff || [];
    if (staffId) {
      var st = holes.find(function (x) { return x.id === staffId; });
      if (!st) return wk;
      var edited = load(store, 'hours', {})[staffId];
      var use = edited || st.workingHours || {};
      var out = emptyWeek();
      DAY_ORDER.slice(1).forEach(function (d) {
        out[d] = intersectIntervals(toIntervals(use[d]), toIntervals(wk[d]));
      });
      return out;
    }
    if (!holes.length) return wk;
    var all = emptyWeek();
    DAY_ORDER.slice(1).forEach(function (d) {
      var merged = [];
      holes.forEach(function (st2) {
        var edited = load(store, 'hours', {})[st2.id];
        var use = edited || st2.workingHours || {};
        merged = mergeWeek(merged, intersectIntervals(toIntervals(use[d]), toIntervals(wk[d])));
      });
      all[d] = merged;
    });
    return all;
  }
  function toIntervals(list) {
    return (list || []).map(function (p) { return { s: toMin(p[0]), e: toMin(p[1]) }; });
  }
  function weekdayOf(dayStr) {
    return DAY_ORDER[new Date(dayStr + 'T12:00:00Z').getUTCDay()];
  }

  function selectedServices(store, ids) {
    ids = ids || [];
    return store.products.filter(function (p) { return ids.indexOf(p.id) > -1; });
  }
  function totalMinutes(store, ids) {
    var n = (ids || []).length;
    if (!n) return 0;
    var sum = selectedServices(store, ids).reduce(function (t, p) { return t + (p.durationMin || 60); }, 0);
    var buf = (store.booking.bufferMinutes || 0) * n;
    return sum + buf;
  }
  function staffAllowed(store, ids, staffId) {
    var holes = store.booking.staff || [];
    if (!holes.length) return [null];
    var union = holes.map(function (h) { return h.id; });
    var wanted = null;
    ids.forEach(function (id) {
      var svc = store.products.find(function (p) { return p.id === id; });
      var list = (svc && svc.staffIds && svc.staffIds.length) ? svc.staffIds.slice() : union;
      wanted = wanted === null ? list : list.filter(function (x) { return wanted.indexOf(x) > -1; });
    });
    if (wanted === null) wanted = union;
    var allowed = wanted.filter(function (id) { return holes.some(function (h) { return h.id === id; }); });
    if (staffId) return allowed.indexOf(staffId) > -1 ? [staffId] : [];
    return allowed;
  }

  function overlaps(bookings, holds, blocked, dayStr, startMs, endMs) {
    if (blocked.indexOf(dayStr) > -1) return true;
    var holdList = holds.filter(function (h) { return h.expiresAt > Date.now(); });
    return bookings.concat(holdList).some(function (b) {
      return (b.status === 'pending' || b.status === 'confirmed' || b.hold) &&
        startMs < b.end && b.start < endMs;
    });
  }

  function slotsForDay(store, ids, staffId, dayStr) {
    var cfg = store.booking;
    var total = totalMinutes(store, ids);
    var wd = weekdayOf(dayStr);
    var allowed = staffAllowed(store, ids, staffId);
    var bookings = load(store, 'bookings', []);
    var holds = load(store, 'holds', []);
    var blocked = load(store, 'blocked', cfg.blockedDates || []);

    var times = {};
    allowed.forEach(function (sid) {
      var intervals = weekOf(store, sid);
      (intervals[wd] || []).forEach(function (iv) {
        for (var start = iv.s; start + total <= iv.e; start += SLOT_STEP) {
          var sMs = fromNairobi(dayStr, fmt12ToHm(start));
          var eMs = fromNairobi(dayStr, fmt12ToHm(start + total));
          var clash = overlaps(bookings, holds, blocked, dayStr, sMs, eMs);
          var key = fmt12ToHm(start);
          if (!times[key]) times[key] = { key: key, available: !clash };
          else if (!clash) times[key].available = true;
        }
      });
    });

    var out = Object.keys(times).sort().map(function (k) { return times[k]; });
    if (!out.length) { /* still surface a disabled slot grid */
      var ivs = weekOf(store, staffId)[wd] || [];
      ivs.forEach(function (iv) {
        for (var s = iv.s; s + total <= iv.e; s += SLOT_STEP) {
          var k = fmt12ToHm(s);
          if (!times[k]) times[k] = { key: k, available: false };
        }
      });
      out = Object.keys(times).sort().map(function (k) { return times[k]; });
      out.forEach(function (t) { t.available = false; });
      return out;
    }
    return out;
  }
  function fmt12ToHm(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
  }

  function nextAvailable(store, ids, staffId) {
    var days = nextDays(14);
    for (var i = 0; i < days.length; i++) {
      var slots = slotsForDay(store, ids, staffId, days[i].dayStr).filter(function (s) { return s.available; });
      if (slots.length) return { dayStr: days[i].dayStr, time: slots[0].key, label: describeDay(days[i].dayStr) + ' ' + fmt12(toMin(slots[0].key)) };
    }
    return null;
  }

  /* ============================================================
     Holds (double-booking protection)
     ============================================================ */
  function holds(store) {
    return (load(store, 'holds', []) || []).filter(function (h) { return h.expiresAt > Date.now(); });
  }
  function claimHold(store, slotKey) {
    var list = holds(store);
    if (list.some(function (h) { return h.key === slotKey && h.expiresAt > Date.now(); })) return true;
    var parts = slotKey.split('|');
    list.push({
      key: slotKey,
      dayStr: parts[0], start: fromNairobi(parts[0], parts[1]),
      end: fromNairobi(parts[0], parts[2]),
      expiresAt: Date.now() + HOLD_MINUTES * 60000,
      hold: true,
      status: 'pending'
    });
    save(store, 'holds', list);
    return true;
  }
  function releaseHold(store, slotKey) {
    save(store, 'holds', holds(store).filter(function (h) { return h.key !== slotKey; }));
  }

  /* ============================================================
     Bookings
     ============================================================ */
  function bookings(store) {
    return load(store, 'bookings', []);
  }
  function saveBooking(store, inb) {
    var list = bookings(store);
    var reference = 'BK-' + Date.now().toString(36).toUpperCase().slice(-6);
    var b = {
      id: reference,
      reference: reference,
      storeSlug: slug(store),
      serviceIds: inb.serviceIds || [],
      staffId: inb.staffId || null,
      start: inb.start,
      end: inb.end,
      customer: inb.customer || {},
      notes: inb.notes || '',
      payment: inb.payment || { method: 'pay_at_venue', status: 'due' },
      status: 'pending',
      createdAt: Date.now()
    };
    list.push(b);
    save(store, 'bookings', list);
    return b;
  }
  function getBooking(store, ref) {
    return bookings(store).find(function (b) { return b.reference === ref; });
  }
  function setStatus(store, ref, status) {
    var list = bookings(store);
    var b = list.find(function (x) { return x.reference === ref; });
    if (!b) return null;
    b.status = status;
    save(store, 'bookings', list);
    return b;
  }
  function removeBooking(store, ref) {
    save(store, 'bookings', bookings(store).filter(function (b) { return b.reference !== ref; }));
  }
  function forceSave(store, list) {
    save(store, 'bookings', list);
  }

  /* ============================================================
     Owner controls
     ============================================================ */
  function blockedDates(store) {
    return JSON.parse(JSON.stringify(load(store, 'blocked', config(store) ? config(store).blockedDates || [] : [])));
  }
  function toggleBlock(store, dayStr) {
    var list = blockedDates(store);
    if (list.indexOf(dayStr) > -1) list = list.filter(function (d) { return d !== dayStr; });
    else list.push(dayStr);
    save(store, 'blocked', list.slice().sort());
    return list;
  }
  function staffing(store) {
    return load(store, 'hours', {});
  }
  function setStaffWeek(store, staffId, week) {
    var all = staffing(store);
    all[staffId] = week;
    save(store, 'hours', all);
  }

  /* ============================================================
     Extras
     ============================================================ */
  function paymentLabel(method) {
    if (method === 'mpesa') return 'M-Pesa';
    if (method === 'pay_at_venue') return 'Pay at venue';
    return method;
  }
  function calendarData(start, end, summary, location) {
    function d(t) { return new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Aqivo//Booking//EN',
      'BEGIN:VEVENT', 'UID:' + start + '@aqivo', 'DTSTAMP:' + d(start),
      'DTSTART:' + d(start) + 'Z', 'DTEND:' + d(end) + 'Z',
      'SUMMARY:' + summary, 'LOCATION:' + location, 'END:VEVENT', 'END:VCALENDAR'
    ];
    return 'data:text/calendar;charset=utf8,' + encodeURIComponent(lines.join('\r\n'));
  }
  function mapsUrl(store) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(store.business.name + ' ' + (store.business.address || ''));
  }

  return {
    hasBooking: hasBooking, config: config,
    dayKey: dayKey, formatTs: formatTs, describeDay: describeDay, fmt12: fmt12, fromNairobi: fromNairobi,
    nextDays: nextDays, nairobiNow: nairobiNow,
    totalMinutes: totalMinutes, staffAllowed: staffAllowed,
    slotsForDay: slotsForDay, nextAvailable: nextAvailable, staffAllowed: staffAllowed,
    holds: holds, claimHold: claimHold, releaseHold: releaseHold,
    bookings: bookings, saveBooking: saveBooking, getBooking: getBooking,
    setStatus: setStatus, removeBooking: removeBooking, forceSave: forceSave,
    blockedDates: blockedDates, toggleBlock: toggleBlock,
    staffing: staffing, setStaffWeek: setStaffWeek,
    paymentLabel: paymentLabel, calendarData: calendarData, mapsUrl: mapsUrl
  };
})();