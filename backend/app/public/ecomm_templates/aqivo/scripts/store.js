/* ============================================================
   Aqivo Store
   ------------------------------------------------------------
   Client state for ONE storefront instance: cart, wishlist and
   fulfilment choice. Persistence is namespaced by shop slug so
   carts never leak between businesses.

   Cart prices are stored for display only; the authoritative
   total is recalculated by totals() and must be re-validated by
   the backend at checkout — never trust client-supplied prices.
   ============================================================ */

window.AqivoStore = (function () {
  'use strict';

  var namespace = 'default';
  var settings = {
    currency: 'KES',
    delivery: { available: true, fee: 0, freeOver: 0 },
    pickup: { available: false },
    payments: ['mpesa'],
    minOrder: 0
  };

  var state = { cart: [], wishlist: [], fulfilment: 'delivery' };

  function key(name) { return 'aqivo.' + name + '.' + namespace; }

  function load(name, fallback) {
    try {
      var raw = localStorage.getItem(key(name));
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function save(name, value) {
    try { localStorage.setItem(key(name), JSON.stringify(value)); } catch (e) { /* non-fatal */ }
  }

  var listeners = [];
  function emit() {
    listeners.slice().forEach(function (fn) {
      try { fn(state); } catch (e) { /* isolate listener errors */ }
    });
  }

  function lineKey(item) {
    var variant = item.variant || {};
    var parts = Object.keys(variant).sort().map(function (k) { return k + ':' + variant[k]; });
    return item.productId + '|' + parts.join('|');
  }

  var store = {
    /* Called by the app once a storefront resolves. */
    configure: function (storeData) {
      namespace = storeData.slug || 'default';
      settings = {
        currency: (storeData.settings && storeData.settings.currency) || 'KES',
        delivery: (storeData.settings && storeData.settings.delivery) || { available: false, fee: 0, freeOver: 0 },
        pickup: (storeData.settings && storeData.settings.pickup) || { available: false },
        payments: (storeData.settings && storeData.settings.payments) || ['mpesa'],
        minOrder: (storeData.settings && storeData.settings.minOrder) || 0
      };
      state.cart = load('cart', []);
      state.wishlist = load('wishlist', []);
      state.fulfilment = settings.delivery.available ? 'delivery' : (settings.pickup.available ? 'pickup' : 'delivery');
      emit();
    },

    getSettings: function () { return settings; },
    getNamespace: function () { return namespace; },

    subscribe: function (fn) {
      listeners.push(fn);
      return function () { listeners = listeners.filter(function (l) { return l !== fn; }); };
    },

    /* ---- Cart ---- */
    getCart: function () { return state.cart.slice(); },
    getCartCount: function () { return state.cart.reduce(function (n, i) { return n + i.qty; }, 0); },
    addToCart: function (product, opts) {
      opts = opts || {};
      var qty = opts.qty || 1;
      var variant = opts.variant || {};
      var k = lineKey({ productId: product.id, variant: variant });
      var existing = state.cart.find(function (i) { return i.key === k; });
      if (existing) {
        existing.qty += qty;
      } else {
        state.cart.push({
          key: k,
          productId: product.id,
          name: product.name,
          price: product.price,
          image: (product.images && product.images[0]) || '',
          variant: variant,
          qty: qty
        });
      }
      save('cart', state.cart);
      emit();
    },
    updateQty: function (key, delta) {
      var item = state.cart.find(function (i) { return i.key === key; });
      if (!item) return;
      item.qty += delta;
      if (item.qty <= 0) state.cart = state.cart.filter(function (i) { return i.key !== key; });
      save('cart', state.cart);
      emit();
    },
    removeFromCart: function (key) {
      state.cart = state.cart.filter(function (i) { return i.key !== key; });
      save('cart', state.cart);
      emit();
    },
    clearCart: function () {
      state.cart = [];
      save('cart', state.cart);
      emit();
    },

    /* ---- Totals (display; backend must re-validate) ---- */
    totals: function () {
      var subtotal = state.cart.reduce(function (sum, i) { return sum + i.price * i.qty; }, 0);
      var deliveryFee = 0;
      if (state.fulfilment === 'delivery' && subtotal > 0 && settings.delivery.available) {
        deliveryFee = subtotal >= settings.delivery.freeOver ? 0 : settings.delivery.fee;
      }
      return {
        subtotal: subtotal,
        delivery: deliveryFee,
        total: subtotal + deliveryFee,
        units: store.getCartCount(),
        freeDeliveryRemaining: settings.delivery.available
          ? Math.max(0, settings.delivery.freeOver - subtotal) : 0,
        meetsMinimum: subtotal >= settings.minOrder,
        minimum: settings.minOrder
      };
    },

    /* ---- Fulfilment ---- */
    getFulfilment: function () { return state.fulfilment; },
    setFulfilment: function (mode) {
      if (mode !== 'delivery' && mode !== 'pickup') return;
      if (mode === 'delivery' && !settings.delivery.available) return;
      if (mode === 'pickup' && !settings.pickup.available) return;
      state.fulfilment = mode;
      emit();
    },

    /* ---- Wishlist ---- */
    getWishlist: function () { return state.wishlist.slice(); },
    isWished: function (id) { return state.wishlist.indexOf(id) > -1; },
    toggleWish: function (id) {
      var idx = state.wishlist.indexOf(id);
      if (idx > -1) state.wishlist.splice(idx, 1);
      else state.wishlist.push(id);
      save('wishlist', state.wishlist);
      emit();
      return idx === -1;
    },

    /* ---- Formatting ---- */
    formatMoney: function (amount) {
      return settings.currency + ' ' + Math.round(amount || 0).toLocaleString('en-KE');
    }
  };

  return store;
})();
