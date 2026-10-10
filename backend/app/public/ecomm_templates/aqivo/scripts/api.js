/* ============================================================
   Aqivo API client
   ------------------------------------------------------------
   Store-scoped. The storefront resolves ONE business (by slug)
   and every call reads from that tenant only. There is no
   cross-shop/marketplace query.

   Swap the AQIVO_DB-backed implementation for real `fetch()`
   calls to the backend and the UI keeps working unchanged.
   ============================================================ */

window.AqivoAPI = (function () {
  'use strict';

  var DB = window.AQIVO_DB;

  var config = {
    latency: 300,
    fail: false,
    pageSize: 8
  };

  var active = null; /* resolved tenant */

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function request(producer) {
    return delay(config.latency).then(function () {
      if (config.fail) throw new Error('Unable to reach Aqivo services. Please try again.');
      return clone(producer());
    });
  }

  function findStore(slug) {
    return DB.stores.find(function (s) { return s.slug === slug; });
  }

  function decorate(tenant) {
    var out = clone(tenant.business);
    out.slug = tenant.slug;
    out.settings = clone(tenant.settings);
    out.icon = DB.typeIcons[tenant.business.type] || 'store';
    out.productCount = tenant.products.length;
    out.categoryCount = tenant.categories.length;
    out.categories = clone(tenant.categories);
    out.products = clone(tenant.products);
    out.business = clone(tenant.business);
    out.booking = tenant.booking ? clone(tenant.booking) : null;
    return out;
  }

  function requireActive() {
    if (!active) throw new Error('No storefront is active');
    return active;
  }

  var api = {
    __config: config,

    /* Resolve which tenant this storefront instance renders.
       In production the slug comes from the URL / subdomain. */
    use: function (slug) {
      var tenant = findStore(slug) || findStore(DB.defaultStore) || DB.stores[0];
      active = tenant;
      return api.getStore();
    },

    getActiveSlug: function () {
      return active ? active.slug : null;
    },

    /* Internal/demo only — used by the template preview switcher,
       never rendered as a public marketplace directory. */
    listStores: function () {
      return request(function () {
        return DB.stores.map(function (s) {
          return {
            slug: s.slug,
            name: s.business.name,
            type: s.business.type,
            logo: s.business.logo,
            icon: DB.typeIcons[s.business.type] || 'store'
          };
        });
      });
    },

    getStore: function () {
      return request(function () { return decorate(requireActive()); });
    },

    getCategories: function () {
      return request(function () {
        var tenant = requireActive();
        return tenant.categories.map(function (c) {
          var count = tenant.products.filter(function (p) { return p.category === c.id; }).length;
          return Object.assign(clone(c), { productCount: count });
        }).filter(function (c) { return c.productCount > 0; });
      });
    },

    getProducts: function (opts) {
      opts = opts || {};
      return request(function () {
        var tenant = requireActive();
        var list = tenant.products.slice();
        if (opts.category) {
          list = list.filter(function (p) { return p.category === opts.category; });
        }
        var total = list.length;
        var page = Math.max(1, opts.page || 1);
        var size = opts.pageSize || config.pageSize;
        var start = (page - 1) * size;
        return {
          items: clone(list.slice(start, start + size)),
          page: page,
          total: total,
          hasMore: start + size < total
        };
      });
    },

    getProduct: function (id) {
      return request(function () {
        var tenant = requireActive();
        var p = tenant.products.find(function (x) { return x.id === id; });
        if (!p) throw new Error('Product not found');
        return clone(p);
      });
    },

    getRelatedProducts: function (id, limit) {
      return request(function () {
        var tenant = requireActive();
        limit = limit || 5;
        var product = tenant.products.find(function (x) { return x.id === id; });
        if (!product) return [];
        var sameCat = tenant.products.filter(function (x) { return x.id !== id && x.category === product.category; });
        var others = tenant.products.filter(function (x) { return x.id !== id && x.category !== product.category; });
        return clone(sameCat.concat(others).slice(0, limit));
      });
    },

    search: function (query) {
      return request(function () {
        var tenant = requireActive();
        var q = (query || '').trim().toLowerCase();
        if (!q) return { products: [] };
        var catName = function (id) {
          var c = tenant.categories.find(function (x) { return x.id === id; });
          return c ? c.name : id;
        };
        var products = tenant.products.filter(function (p) {
          return p.name.toLowerCase().indexOf(q) > -1 ||
            p.description.toLowerCase().indexOf(q) > -1 ||
            catName(p.category).toLowerCase().indexOf(q) > -1;
        }).slice(0, 24);
        return { products: clone(products) };
      });
    }
  };

  return api;
})();
