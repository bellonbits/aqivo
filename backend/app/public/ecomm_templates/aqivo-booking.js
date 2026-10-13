/* Aqivo services booking flow
   Service > date and time > details > confirmation (+ WhatsApp, calendar file).

   IMPORTANT: availability here is calculated in the browser so the UI can show
   genuine open slots. Your server MUST run the same checks again when the booking
   is saved (AqivoBooking.createBooking does it client-side too) and be the source
   of truth for references, statuses and payments.

   Usage:
     AqivoBooking.open({
       service: { id:'haircut', name:'Haircut', price:300, durationMin:30 },
       config:  { hours:{ 1:{open:'09:00',close:'18:00',breaks:[['13:00','14:00']]}, 0:null }, ... },
       bookings: existingBookingsForThisBusiness,
       store: { name:"Joe's Kinyozi", phone:'0722987654', address:'Nairobi' },
       onConfirm: async function (booking) { await saveToServer(booking); }
     });
*/
(function (root) {
  'use strict';

  var DEFAULT_HOURS = {
    0: { open: '10:00', close: '18:00', breaks: [] },
    1: { open: '08:00', close: '20:00', breaks: [] },
    2: { open: '08:00', close: '20:00', breaks: [] },
    3: { open: '08:00', close: '20:00', breaks: [] },
    4: { open: '08:00', close: '20:00', breaks: [] },
    5: { open: '08:00', close: '20:00', breaks: [] },
    6: { open: '08:00', close: '20:00', breaks: [] }
  };

  var DEFAULTS = {
    timezone: 'Africa/Nairobi', utcOffset: '+03:00',
    slotInterval: 30, buffer: 0, leadMinutes: 60, maxDaysAhead: 30,
    holidays: [], hours: {}, staff: []
  };

  var DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  function parseTimeSpan(str) {
    if (!str || typeof str !== 'string') return null;
    if (/closed/i.test(str)) return null;
    var m = str.match(/(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/);
    if (m) return { open: m[1], close: m[2], breaks: [] };
    return null;
  }

  function getDayHours(hoursConfig, wday) {
    if (!hoursConfig || (typeof hoursConfig === 'object' && Object.keys(hoursConfig).length === 0)) {
      return DEFAULT_HOURS[wday] || null;
    }
    var dayVal = undefined;
    if (Array.isArray(hoursConfig)) {
      var targetName = DAY_NAMES[wday];
      for (var i = 0; i < hoursConfig.length; i++) {
        var it = hoursConfig[i];
        if (it && it.day && String(it.day).toLowerCase() === targetName) {
          if (it.open && it.close) {
            dayVal = { open: it.open, close: it.close, breaks: it.breaks || [] };
          } else if (it.text) {
            dayVal = parseTimeSpan(it.text);
          }
          break;
        }
      }
    } else if (typeof hoursConfig === 'object') {
      if (hoursConfig[wday] !== undefined) {
        dayVal = hoursConfig[wday];
      } else if (hoursConfig[String(wday)] !== undefined) {
        dayVal = hoursConfig[String(wday)];
      } else if (hoursConfig[DAY_KEYS[wday]] !== undefined) {
        dayVal = hoursConfig[DAY_KEYS[wday]];
      }
    }

    if (dayVal === null || dayVal === false) return null; // explicitly closed
    if (typeof dayVal === 'string') return parseTimeSpan(dayVal);
    if (dayVal && typeof dayVal === 'object') {
      if (dayVal.closed === true) return null;
      if (dayVal.open && dayVal.close) return { open: dayVal.open, close: dayVal.close, breaks: dayVal.breaks || [] };
      if (dayVal.text) return parseTimeSpan(dayVal.text);
    }
    if (typeof hoursConfig === 'object' && Object.keys(hoursConfig).length > 0) return null;
    return DEFAULT_HOURS[wday] || null;
  }

  /* ---------- helpers ---------- */
  function cfgOf(c) {
    var o = {}, k;
    for (k in DEFAULTS) o[k] = DEFAULTS[k];
    for (k in (c || {})) o[k] = c[k];
    return o;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toMin(t) { var p = String(t).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function fromMin(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function weekday(d) { var p = d.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }
  function addDays(d, n) {
    var p = d.split('-'), t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate());
  }
  function nowIn(tz, now) {
    var m = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now || new Date()).forEach(function (p) { m[p.type] = p.value; });
    return { date: m.year + '-' + m.month + '-' + m.day, minutes: (+m.hour % 24) * 60 + (+m.minute) };
  }
  function fmtDate(d, opts) {
    return new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: 'UTC' }, opts || { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))
      .format(new Date(d + 'T00:00:00Z'));
  }
  function fmtTime(t) {
    if (!t) return '';
    var parts = String(t).split(' ');
    var timePart = parts[0];
    if (parts.length > 1 && (parts[1] === 'AM' || parts[1] === 'PM')) {
      return t; // Already formatted
    }
    var m = toMin(timePart), h = Math.floor(m / 60), ap = h >= 12 ? 'PM' : 'AM';
    return ((h % 12) || 12) + ':' + pad(m % 60) + ' ' + ap;
  }
  function money(n, sym) { return (sym || 'KSh') + ' ' + Number(n || 0).toLocaleString('en-KE'); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function normalisePhone(raw) {
    if (!raw) return '';
    var s = String(raw).trim();
    if (s.indexOf('?') !== -1) s = s.split('?')[0];
    if (s.indexOf('#') !== -1) s = s.split('#')[0];
    var m = s.match(/(?:wa\.me\/|phone=|send\?phone=|tel:)(\+?\d+)/);
    if (m && m[1]) s = m[1];
    var parts = s.split(/\s*(?:\/|,|;|\||\bor\b)\s*/);
    if (parts.length > 0 && parts[0]) s = parts[0];
    var d = s.replace(/\D/g, '');
    if (!d) return '';
    if (d.indexOf('00') === 0) d = d.slice(2);
    while (d.indexOf('254254') === 0) d = d.slice(3);
    if (d.indexOf('2540') === 0 && d.length >= 13) d = '254' + d.slice(4);
    if (d.charAt(0) === '0' && d.length === 10) d = '254' + d.slice(1);
    if (d.length === 9 && /^[17]/.test(d)) d = '254' + d;
    if (d.indexOf('254') === 0 && d.length > 12) d = d.slice(0, 12);
    return d;
  }

  /* ---------- availability ---------- */
  function slotsFor(service, date, cfg, bookings, staffId, now) {
    var t = nowIn(cfg.timezone, now);
    if (date < t.date || date > addDays(t.date, cfg.maxDaysAhead)) return [];
    if (cfg.holidays.indexOf(date) !== -1) return [];
    var staff = staffId && cfg.staff.filter(function (s) { return s.id === staffId; })[0];
    if (staff && staff.daysOff && staff.daysOff.indexOf(date) !== -1) return [];
    var w = weekday(date);
    var day = getDayHours((staff && staff.hours) || cfg.hours, w);
    if (!day || !day.open || !day.close) return [];

    var open = toMin(day.open), close = toMin(day.close);
    var dur = +service.durationMin || 30, buf = +cfg.buffer || 0, step = +cfg.slotInterval || 30;
    var breaks = (day.breaks || []).map(function (b) { return [toMin(b[0]), toMin(b[1])]; });
    var taken = (bookings || []).filter(function (b) {
      return b.status !== 'cancelled' && b.date === date && (!staffId || !b.staffId || b.staffId === staffId);
    }).map(function (b) { return [toMin(b.time), toMin(b.endTime)]; });

    var out = [];
    for (var s = open; s + dur <= close; s += step) {
      if (date === t.date && s < t.minutes + cfg.leadMinutes) continue;
      if (breaks.some(function (b) { return s < b[1] && s + dur > b[0]; })) continue;
      if (taken.some(function (b) { return s < b[1] + buf && b[0] < s + dur + buf; })) continue;
      out.push(fromMin(s));
    }
    return out;
  }

  function getAvailableSlots(service, date, config, bookings, staffId, now) {
    var cfg = cfgOf(config);
    if (cfg.staff.length && !staffId) {
      var seen = {}, all = [];
      cfg.staff.forEach(function (s) {
        slotsFor(service, date, cfg, bookings, s.id, now).forEach(function (x) { if (!seen[x]) { seen[x] = 1; all.push(x); } });
      });
      return all.sort();
    }
    return slotsFor(service, date, cfg, bookings, staffId || null, now);
  }

  /* ---------- booking ---------- */
  function createBooking(input, config, bookings, opts) {
    opts = opts || {};
    var cfg = cfgOf(config), svc = input.service || {}, cust = input.customer || {};
    function fail(code, msg) { var e = new Error(msg); e.code = code; throw e; }

    if (!svc.name || !svc.durationMin) fail('BAD_SERVICE', 'Service is missing a name or duration');
    if (!String(cust.name || '').trim()) fail('BAD_NAME', 'Please enter your name');
    if (String(cust.phone || '').replace(/\D/g, '').length < 9) fail('BAD_PHONE', 'Please enter a valid phone number');

    var staffId = input.staffId || null;
    if (cfg.staff.length && !staffId) {          // "any staff": assign the first free person
      var pick = cfg.staff.filter(function (s) {
        return slotsFor(svc, input.date, cfg, bookings, s.id, opts.now).indexOf(input.time) !== -1;
      })[0];
      staffId = pick && pick.id;
    }
    // Only validate slots if local config has hours configured
    if (cfg.hours && Object.keys(cfg.hours).length > 0) {
      if (getAvailableSlots(svc, input.date, cfg, bookings, staffId, opts.now).indexOf(input.time) === -1) {
        fail('SLOT_TAKEN', 'That time is no longer available');
      }
    }
    var staff = cfg.staff.filter(function (s) { return s.id === staffId; })[0];
    var timeMin = toMin(String(input.time).split(' ')[0]);
    var endTime = fromMin(timeMin + (+svc.durationMin || 30));

    return {
      reference: opts.reference || ('BK-' + String(Date.now()).slice(-6)),
      status: 'pending', paymentStatus: 'unpaid',
      serviceId: svc.id || '', serviceName: svc.name, price: svc.price || 0, durationMin: +svc.durationMin || 30,
      currencySymbol: svc.currencySymbol || 'KSh',
      date: input.date, time: input.time, endTime: endTime,
      startISO: input.date + 'T' + input.time + ':00' + cfg.utcOffset,
      endISO: input.date + 'T' + endTime + ':00' + cfg.utcOffset,
      timezone: cfg.timezone,
      staffId: staffId, staffName: staff ? staff.name : '',
      customer: { name: String(cust.name).trim(), phone: String(cust.phone).trim() },
      notes: String(input.notes || '').trim(),
      store: input.store || {},
      createdAt: new Date().toISOString()
    };
  }

  function receiptUrl(b, opts) {
    opts = opts || {};
    if (opts.receiptUrl) return opts.receiptUrl;
    var base = opts.receiptBase || 'https://aqivo.shop/bookings';
    return base.replace(/\/$/, '') + '/' + encodeURIComponent(b.reference) + '/receipt';
  }

  var STATUS_TEXT = { pending: 'Awaiting confirmation', confirmed: 'Confirmed', cancelled: 'Cancelled', completed: 'Completed', 'no-show': 'No-show' };

  function buildBookingMessage(b, opts) {
    var store = (opts && opts.storeName) || (b.store && b.store.name) || 'there', L = [];
    L.push('*NEW BOOKING — ' + b.reference + '*', '');
    L.push('Hello ' + store + ', you have a new booking request!', '');
    L.push('*BOOKING DETAILS*');
    L.push('Reference: ' + b.reference);
    L.push('Service: ' + b.serviceName + ' (' + (b.durationMin || 30) + ' min)');
    L.push('Date: ' + fmtDate(b.date));
    L.push('Time: ' + fmtTime(b.time) + ' – ' + fmtTime(b.endTime));
    if (b.staffName) L.push('Staff: ' + b.staffName);
    L.push('Price: ' + money(b.price, b.currencySymbol));
    L.push('Status: ' + (STATUS_TEXT[b.status] || 'Awaiting confirmation'), '');
    L.push('*CUSTOMER DETAILS*');
    L.push('Name: ' + b.customer.name);
    L.push('Phone: ' + b.customer.phone);
    if (b.notes) L.push('Notes: ' + b.notes);
    L.push('', '*BOOKING RECEIPT*', receiptUrl(b, opts), '');
    L.push('Please confirm or reschedule with your customer.', 'Powered by Aqivo');
    return L.join('\n');
  }

  function whatsappUrl(phone, message) {
    return 'https://wa.me/' + normalisePhone(phone) + '?text=' + encodeURIComponent(message);
  }

  function buildICS(b) {
    function utc(iso) { return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
    function t(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/[,;]/g, '\\$&').replace(/\n/g, '\\n'); }
    var store = b.store || {};
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Aqivo//Booking//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + b.reference + '@aqivo.shop',
      'DTSTAMP:' + utc(b.createdAt || new Date().toISOString()),
      'DTSTART:' + utc(b.startISO), 'DTEND:' + utc(b.endISO),
      'SUMMARY:' + t(b.serviceName + ' at ' + (store.name || 'your appointment')),
      'LOCATION:' + t(store.address || ''),
      'DESCRIPTION:' + t('Booking ' + b.reference + (b.notes ? '\n' + b.notes : '')),
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }

  function downloadICS(b) {
    var blob = new Blob([buildICS(b)], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = b.reference + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- UI ---------- */
  var X = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var BACK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var CHECK = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function open(o) {
    var cfg = cfgOf(o.config), svc = o.service || {}, store = o.store || {};
    var bookings = o.bookings || [];
    var serverSlotsCache = {};
    var loadingSlots = false;

    var today = nowIn(cfg.timezone).date;
    var dates = [], i;
    for (i = 0; i <= Math.min(cfg.maxDaysAhead, 21); i++) dates.push(addDays(today, i));

    var st = {
      step: 1, date: dates[0] || null, time: null, staffId: null,
      name: '', phone: '', notes: '', booking: null, error: '', busy: false
    };

    var veil = document.createElement('div'); veil.className = 'aqivo-modal-veil';
    var sheet = document.createElement('div'); sheet.className = 'aqivo-modal-sheet';
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'Book ' + (svc.name || 'service'));
    document.body.appendChild(veil); document.body.appendChild(sheet);
    requestAnimationFrame(function () { veil.classList.add('open'); sheet.classList.add('open'); });

    function close() {
      veil.classList.remove('open'); sheet.classList.remove('open');
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { veil.remove(); sheet.remove(); }, 320);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    veil.addEventListener('click', close);

    async function loadServerSlots(date) {
      if (!date || !o.fetchSlots) return;
      if (serverSlotsCache[date] !== undefined && !serverSlotsCache[date]._error) return;
      loadingSlots = true;
      render();
      try {
        var res = await o.fetchSlots(date, svc);
        serverSlotsCache[date] = res || { slots: [] };
      } catch (err) {
        var fallback = getAvailableSlots(svc, date, cfg, bookings, st.staffId);
        serverSlotsCache[date] = {
          slots: fallback.map(function (t) { return { value: t, label: t }; }),
          reason: fallback.length ? '' : 'No times left on this day.',
          _error: true
        };
      } finally {
        loadingSlots = false;
        render();
      }
    }

    function slots(date) {
      if (o.fetchSlots) {
        var cached = serverSlotsCache[date];
        if (cached && cached.slots) {
          return cached.slots.map(function (s) { return typeof s === 'string' ? s : s.label || s.value; });
        }
        return getAvailableSlots(svc, date, cfg, bookings, st.staffId);
      }
      return getAvailableSlots(svc, date, cfg, bookings, st.staffId);
    }

    function detailsValid() { return st.name.trim().length > 0 && st.phone.replace(/\D/g, '').length >= 9; }

    function stepper() {
      var labels = ['Date & time', 'Details', 'Done'];
      return '<ol class="bk-steps">' + labels.map(function (l, n) {
        return '<li class="' + (n + 1 === st.step ? 'on' : n + 1 < st.step ? 'done' : '') + '"><i>' + (n + 1) + '</i>' + l + '</li>';
      }).join('') + '</ol>';
    }

    function header(title, back) {
      return '<div class="aqivo-sheet-header">' +
        (back ? '<button type="button" class="aqivo-sheet-back" data-act="back" aria-label="Back">' + BACK + 'Back</button>' : '<div class="aqivo-sheet-title">' + esc(title) + '</div>') +
        (back ? '<div class="aqivo-sheet-title">' + esc(title) + '</div>' : '') +
        '<button type="button" class="aqivo-sheet-close" data-act="close" aria-label="Close">' + X + '</button></div>';
    }

    function serviceCard() {
      return '<div class="info-card info-card--lime"><span class="info-card-title">' + esc(svc.name) + '</span>' +
        '<span>' + esc(svc.durationMin || 30) + ' min · ' + money(svc.price, svc.currencySymbol) + '</span></div>';
    }

    function render() {
      var body = sheet.querySelector('.aqivo-sheet-body'), dstrip = sheet.querySelector('.bk-dates');
      var keep = { top: body ? body.scrollTop : 0, left: dstrip ? dstrip.scrollLeft : 0 };
      var h = '';

      if (st.step === 1) {
        var list = st.date ? slots(st.date) : [];
        h += header('Book appointment', false) + '<div class="aqivo-sheet-body">' + stepper() + serviceCard();
        if (st.error) h += '<div class="bk-error" role="alert">' + esc(st.error) + '</div>';
        if (cfg.staff && cfg.staff.length) {
          h += '<div><div class="bk-label">Choose staff</div><div class="bk-staff">' +
            '<button type="button" class="bk-chip' + (!st.staffId ? ' active' : '') + '" data-act="staff" data-id="">Any available</button>' +
            cfg.staff.map(function (s) { return '<button type="button" class="bk-chip' + (st.staffId === s.id ? ' active' : '') + '" data-act="staff" data-id="' + esc(s.id) + '">' + esc(s.name) + '</button>'; }).join('') +
            '</div></div>';
        }
        h += '<div><div class="bk-label">Choose a date</div><div class="bk-dates no-scrollbar">' + dates.map(function (d) {
          var w = weekday(d);
          var dayHours = getDayHours(cfg.hours, w);
          var isClosed = (cfg.holidays && cfg.holidays.indexOf(d) !== -1) || dayHours === null;
          return '<button type="button" class="bk-date' + (st.date === d ? ' active' : '') + (isClosed ? ' opacity-40' : '') + '" data-act="date" data-d="' + d + '"' + (isClosed ? ' disabled title="Closed"' : '') + '>' +
            '<span>' + fmtDate(d, { weekday: 'short' }) + '</span><b>' + fmtDate(d, { day: 'numeric' }) + '</b><small>' + fmtDate(d, { month: 'short' }) + '</small></button>';
        }).join('') + '</div></div>';
        h += '<div><div class="bk-label">Choose a time</div>';
        if (!st.date) {
          h += '<div class="bk-hint">Pick a date to see available times.</div>';
        } else if (loadingSlots) {
          h += '<div class="bk-hint"><span class="inline-block animate-spin mr-1">⏳</span> Loading available times…</div>';
        } else if (!list.length) {
          var reason = (serverSlotsCache[st.date] && serverSlotsCache[st.date].reason) || 'No times left on this day. Try another date.';
          h += '<div class="bk-hint">' + esc(reason) + '</div>';
        } else {
          h += '<div class="bk-slots">' + list.map(function (t) {
            return '<button type="button" class="bk-slot' + (st.time === t ? ' active' : '') + '" data-act="time" data-t="' + esc(t) + '">' + esc(fmtTime(t)) + '</button>';
          }).join('') + '</div>';
        }
        h += '</div></div><div class="aqivo-sheet-footer"><button type="button" class="btn-primary" data-act="next"' + (st.time ? '' : ' disabled') + '>' +
          (st.time ? 'Continue — ' + fmtDate(st.date, { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + fmtTime(st.time) : 'Select a date and time') + '</button></div>';
      }

      if (st.step === 2) {
        var durationMinutes = +(svc.durationMin || 30);
        var timeMin = toMin(String(st.time).split(' ')[0]);
        var endFormatted = fromMin(timeMin + durationMinutes);
        h += header('Your details', true) + '<div class="aqivo-sheet-body">' + stepper() +
          '<div class="info-card"><span class="info-card-title">' + esc(svc.name) + '</span><span>' + fmtDate(st.date) + ' · ' + fmtTime(st.time) + ' – ' + fmtTime(endFormatted) + '</span></div>';
        if (st.error) h += '<div class="bk-error" role="alert">' + esc(st.error) + '</div>';
        h += '<div><label for="bk-name" class="bk-field-label">Full name <span class="req text-rose-500">*</span></label><input id="bk-name" class="checkout-input" data-field="name" autocomplete="name" placeholder="Your name" value="' + esc(st.name) + '"></div>' +
          '<div class="mt-3"><label for="bk-phone" class="bk-field-label">Phone number <span class="req text-rose-500">*</span></label><input id="bk-phone" class="checkout-input" data-field="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="e.g. 0712 345 678" value="' + esc(st.phone) + '"></div>' +
          '<div class="mt-3"><label for="bk-notes" class="bk-field-label">Notes <span class="text-slate-400 font-normal">(optional)</span></label><textarea id="bk-notes" class="checkout-input !h-20 py-2.5 resize-none" data-field="notes" placeholder="Anything the business should know?">' + esc(st.notes) + '</textarea></div>' +
          '</div><div class="aqivo-sheet-footer"><button type="button" class="btn-primary" data-act="submit"' + (detailsValid() && !st.busy ? '' : ' disabled') + '>' +
          (st.busy ? 'Confirming…' : 'Confirm booking — ' + money(svc.price, svc.currencySymbol)) + '</button></div>';
      }

      if (st.step === 3) {
        var b = st.booking;
        h += header('Booking sent', false) + '<div class="aqivo-sheet-body">' + stepper() +
          '<div class="bk-done"><div class="bk-check">' + CHECK + '</div><h2>Booking request sent</h2><p>' + esc(store.name || 'The business') + ' will confirm your appointment. Keep your reference: <b>' + esc(b.reference) + '</b></p></div>' +
          '<div class="summary-card">' +
          '<div class="summary-row"><span>Service</span><strong>' + esc(b.serviceName) + '</strong></div>' +
          '<div class="summary-row"><span>Date</span><strong>' + fmtDate(b.date) + '</strong></div>' +
          '<div class="summary-row"><span>Time</span><strong>' + fmtTime(b.time) + ' – ' + fmtTime(b.endTime) + '</strong></div>' +
          (b.staffName ? '<div class="summary-row"><span>Staff</span><strong>' + esc(b.staffName) + '</strong></div>' : '') +
          '<div class="summary-row"><span>Price</span><strong>' + money(b.price, b.currencySymbol) + '</strong></div>' +
          '<div class="summary-row"><span>Status</span><span class="badge badge--lime">' + (STATUS_TEXT[b.status] || 'Awaiting confirmation') + '</span></div></div>' +
          '<div class="bk-actions">' +
          ((store.phone || store.wa) ? '<button type="button" class="bk-btn bk-btn--dark" data-act="wa">Send on WhatsApp</button>' : '') +
          '<button type="button" class="bk-btn" data-act="ics">Add to calendar</button></div>' +
          '<a class="bk-link" href="' + esc(receiptUrl(b, o)) + '" target="_blank" rel="noopener">View booking receipt</a>' +
          '</div><div class="aqivo-sheet-footer"><button type="button" class="btn-primary" data-act="close">Done</button></div>';
      }

      sheet.innerHTML = h;
      var nb = sheet.querySelector('.aqivo-sheet-body'), nd = sheet.querySelector('.bk-dates');
      if (nb) nb.scrollTop = keep.top;
      if (nd) nd.scrollLeft = keep.left;
    }

    sheet.addEventListener('input', function (e) {
      var f = e.target.getAttribute && e.target.getAttribute('data-field');
      if (!f) return;
      st[f] = e.target.value;
      var btn = sheet.querySelector('[data-act="submit"]');
      if (btn) btn.disabled = !detailsValid();
    });

    sheet.addEventListener('click', async function (e) {
      var el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      var act = el.getAttribute('data-act');

      if (act === 'close') return close();
      if (act === 'back') { st.step = Math.max(1, st.step - 1); st.error = ''; return render(); }
      if (act === 'staff') { st.staffId = el.getAttribute('data-id') || null; st.time = null; if (st.date && !slots(st.date).length) st.date = null; return render(); }
      if (act === 'date') {
        st.date = el.getAttribute('data-d');
        st.time = null;
        st.error = '';
        render();
        if (o.fetchSlots) {
          loadServerSlots(st.date);
        }
        return;
      }
      if (act === 'time') { st.time = el.getAttribute('data-t'); return render(); }
      if (act === 'next') { st.step = 2; st.error = ''; return render(); }
      if (act === 'wa') return window.open(whatsappUrl(store.phone || store.wa, buildBookingMessage(st.booking, o)), '_blank', 'noopener');
      if (act === 'ics') return downloadICS(st.booking);

      if (act === 'submit') {
        st.busy = true; st.error = ''; render();
        try {
          var booking;
          if (typeof o.submit === 'function') {
            var slotObj = { value: st.time, label: st.time };
            if (serverSlotsCache[st.date] && serverSlotsCache[st.date].slots) {
              var found = serverSlotsCache[st.date].slots.filter(function (s) {
                return (s.value === st.time || s.label === st.time);
              })[0];
              if (found) slotObj = found;
            }
            var isoVal = slotObj.value;
            if (isoVal && isoVal.indexOf('T') === -1) {
              var cleanTime = isoVal.length === 5 ? isoVal + ':00' : isoVal;
              isoVal = st.date + 'T' + cleanTime + cfg.utcOffset;
            }
            slotObj = { value: isoVal, label: slotObj.label || st.time };
            var res = await o.submit({
              service: svc,
              slot: slotObj,
              name: st.name,
              phone: st.phone,
              notes: st.notes
            });
            var durMin = +(svc.durationMin || 30);
            var timeMin = toMin(String(st.time).split(' ')[0]);
            var endTime = fromMin(timeMin + durMin);
            var ref = (res && (res.booking_reference || res.reference || res.booking_id || res.id)) || ('BK-' + String(Date.now()).slice(-6));
            booking = {
              reference: ref,
              status: (res && res.status) || 'pending',
              paymentStatus: (res && res.payment_status) || 'unpaid',
              serviceId: svc.id || '',
              serviceName: svc.name,
              price: svc.price || 0,
              durationMin: durMin,
              currencySymbol: svc.currencySymbol || 'KSh',
              date: st.date,
              time: st.time,
              endTime: endTime,
              startISO: st.date + 'T' + st.time + ':00' + cfg.utcOffset,
              endISO: st.date + 'T' + endTime + ':00' + cfg.utcOffset,
              timezone: cfg.timezone,
              customer: { name: st.name.trim(), phone: st.phone.trim() },
              notes: (st.notes || '').trim(),
              store: store,
              createdAt: new Date().toISOString()
            };
          } else {
            booking = createBooking({ service: svc, date: st.date, time: st.time, staffId: st.staffId, customer: { name: st.name, phone: st.phone }, notes: st.notes, store: store }, cfg, bookings, o);
            if (o.onConfirm) {
              var saved = await o.onConfirm(booking);
              if (saved && typeof saved === 'object') booking = saved;
            }
          }
          st.booking = booking;
          st.step = 3;
          st.busy = false;
        } catch (err) {
          st.busy = false;
          if (err.code === 'SLOT_TAKEN') {
            st.error = 'Sorry, that time was just taken. Please choose another.';
            st.step = 1;
            st.time = null;
          } else {
            st.error = err.message || 'Something went wrong. Please try again.';
          }
        }
        render();
      }
    });

    render();
    if (o.fetchSlots && st.date) {
      loadServerSlots(st.date);
    }
    return { close: close };
  }

  root.AqivoBooking = {
    open: open, getAvailableSlots: getAvailableSlots, createBooking: createBooking,
    buildBookingMessage: buildBookingMessage, buildICS: buildICS, downloadICS: downloadICS,
    whatsappUrl: whatsappUrl, receiptUrl: receiptUrl, normalisePhone: normalisePhone
  };
})(typeof window !== 'undefined' ? window : globalThis);
