/* ============================================================
   Aqivo Application
   ------------------------------------------------------------
   One storefront instance = one business. The shell resolves a
   shop slug and renders that tenant's catalogue, cart and guest
   checkout. There is no marketplace or directory of shops here.
   ============================================================ */

window.AqivoApp = (function () {
  'use strict';

  var API = window.AqivoAPI;
  var S = window.AqivoStore;
  var C = window.AqivoComponents;
  var I = window.AqivoIcons;
  var B = window.AqivoBooking;

  var els = {};
  var renderSeq = 0;
  var routeState = { retry: null };
  var pdp = null;
  var headerSearchTimer = null;
  var lastQuery = '';
  var activeStore = null;
  var allCategories = [];

  /* booking session state (not persisted — resets on reload) */
  var bkSel = [];       /* service ids selected for multi-booking */
  var bkFlow = null;    /* current 4-step flow draft */

  var ROUTES = ['home', 'category', 'product', 'search', 'cart', 'checkout', 'orders', 'info',
    'booking', 'book', 'manage', 'owner'];

  /* ============================================================
     Routing
     ============================================================ */
  function parseHash() {
    var hash = location.hash.replace(/^#\/?/, '');
    var qi = hash.indexOf('?');
    var query = {};
    if (qi > -1) {
      hash.slice(qi + 1).split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
      hash = hash.slice(0, qi);
    }
    var parts = hash.split('/').filter(Boolean);
    var name = parts[0] || 'home';
    if (name === 'c') name = 'category';
    if (name === 'p') name = 'product';
    if (ROUTES.indexOf(name) === -1) name = 'home';
    return { name: name, id: parts[1] || null, query: query };
  }

  function navigate(path) {
    if (('#' + path) === location.hash) { render(); return; }
    location.hash = path;
  }
  function onRouteChange() {
    render();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function resolveSlug() {
    var m = location.search.match(/[?&]shop=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
    try { return localStorage.getItem('aqivo.lastShop') || null; } catch (e) { return null; }
  }

  /* ============================================================
     Shell
     ============================================================ */
  function headerHTML() {
    return '' +
      '<header class="header" role="banner">' +
        '<div class="container header__inner">' +
          '<a class="brand" href="#/" aria-label="Shop home">' +
            '<img class="brand__logo" alt="" data-brand-logo>' +
            '<span class="brand__text">' +
              '<strong data-brand-name>Aqivo</strong>' +
              '<small data-brand-status></small>' +
            '</span>' +
          '</a>' +
          '<div class="header__search">' +
            '<form class="search" role="search" data-search-form autocomplete="off">' +
              '<div class="search__field">' +
                I.get('search') +
                '<input class="search__input" type="search" name="q" placeholder="Search this shop" aria-label="Search this shop" data-search-input>' +
                '<button type="button" class="search__clear" data-search-clear aria-label="Clear search">' + I.get('close') + '</button>' +
                '<button type="submit" class="search__submit">Search</button>' +
              '</div>' +
              '<div class="search__panel" data-search-panel role="listbox" aria-label="Search suggestions"></div>' +
            '</form>' +
          '</div>' +
          '<div class="header__actions">' +
            '<a class="icon-btn account-link" href="#/orders" aria-label="Your orders">' + I.get('orders') + '</a>' +
            '<button class="icon-btn" data-open-cart aria-label="Open cart">' + I.get('cart') +
              '<span class="icon-btn__badge" data-cart-badge>0</span></button>' +
          '</div>' +
        '</div>' +
        '<nav class="header__nav" aria-label="Shop categories">' +
          '<div class="container header__nav-inner" data-nav-categories></div>' +
        '</nav>' +
      '</header>';
  }

  function bottomNavHTML() {
    var items = [
      { route: 'home', label: 'Shop', icon: 'store', href: '#/' },
      { route: 'search', label: 'Search', icon: 'search', href: '#/search' },
      { route: 'cart', label: 'Cart', icon: 'cart', href: '#/cart', badge: true },
      { route: 'orders', label: 'Orders', icon: 'orders', href: '#/orders' },
      { route: 'info', label: 'Info', icon: 'info', href: '#/info' }
    ];
    return '<nav class="bottomnav" aria-label="Primary">' + items.map(function (it) {
      return '<a class="bottomnav__item" data-nav-route="' + it.route + '" href="' + it.href + '">' +
        I.get(it.icon) + '<span>' + it.label + '</span>' +
        (it.badge ? '<span class="bottomnav__badge" data-cart-badge-mini></span>' : '') +
      '</a>';
    }).join('') + '</nav>';
  }

  function cartDrawerHTML() {
    return '' +
      '<div class="overlay" data-overlay></div>' +
      '<aside class="drawer" data-cart-drawer role="dialog" aria-modal="true" aria-label="Shopping cart" aria-hidden="true">' +
        '<div class="drawer__head">' +
          '<h2 class="drawer__title">Your cart <span class="count" data-cart-count-label></span></h2>' +
          '<button class="icon-btn" data-close-cart aria-label="Close cart">' + I.get('close') + '</button>' +
        '</div>' +
        '<div class="drawer__body" data-cart-body></div>' +
        '<div class="drawer__foot" data-cart-foot hidden></div>' +
      '</aside>';
  }

  function mount(root) {
    root.innerHTML =
      '<div class="app">' +
        headerHTML() +
        '<main class="main" id="main"><div class="container" id="view" aria-live="polite"></div></main>' +
        '<footer class="footer" role="contentinfo" data-footer></footer>' +
      '</div>' +
      bottomNavHTML() +
      cartDrawerHTML() +
      '<a class="floatcart" data-float-cart href="#/cart" hidden></a>' +
      '<div class="toasts" data-toasts role="status" aria-live="polite"></div>' +
      '<div data-modal-root></div>';

    els.view = root.querySelector('#view');
    els.drawer = root.querySelector('[data-cart-drawer]');
    els.overlay = root.querySelector('[data-overlay]');
    els.cartBody = root.querySelector('[data-cart-body]');
    els.cartFoot = root.querySelector('[data-cart-foot]');
    els.toasts = root.querySelector('[data-toasts]');
    els.modalRoot = root.querySelector('[data-modal-root]');
    els.floatCart = root.querySelector('[data-float-cart]');
    els.footer = root.querySelector('[data-footer]');

    bindGlobalEvents(root);
  }

  /* ============================================================
     Global events
     ============================================================ */
  function bindGlobalEvents(root) {
    root.addEventListener('click', function (e) {
      var t;
      if (e.target.closest('[data-close-pdp]')) { e.preventDefault(); navigate('/'); return; }
      if ((t = e.target.closest('[data-add]'))) { e.preventDefault(); quickAdd(t.getAttribute('data-add')); return; }
      if (e.target.closest('[data-open-cart]')) { e.preventDefault(); openCart(); return; }
      if ((t = e.target.closest('[data-open-product]'))) { e.preventDefault(); navigate('/p/' + t.getAttribute('data-open-product')); return; }
      if ((t = e.target.closest('[data-wish]'))) {
        e.preventDefault();
        var id = t.getAttribute('data-wish');
        var added = S.toggleWish(id);
        toast(added ? 'Added to wishlist' : 'Removed from wishlist');
        syncWishButtons(id, added);
        return;
      }
      if ((t = e.target.closest('[data-qty-inc]'))) { S.updateQty(t.getAttribute('data-qty-inc'), 1); return; }
      if ((t = e.target.closest('[data-qty-dec]'))) { S.updateQty(t.getAttribute('data-qty-dec'), -1); return; }
      if ((t = e.target.closest('[data-line-remove]'))) { S.removeFromCart(t.getAttribute('data-line-remove')); return; }
      if (e.target.closest('[data-close-cart]') || e.target.closest('[data-overlay]')) { closeCart(); return; }
      if ((t = e.target.closest('[data-retry]'))) { e.preventDefault(); render(); return; }
      if (e.target.closest('[data-search-clear]')) { clearSearch(); return; }
      if (e.target.closest('[data-close-search]')) { closeSearchPanel(); return; }
      if ((t = e.target.closest('[data-preview-shop]'))) {
        e.preventDefault();
        switchShop(t.getAttribute('data-preview-shop'));
        return;
      }
      if (e.target.closest('[data-close-modal]')) { closeModal(); return; }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeCart(); closeSearchPanel(); closeModal(); }
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.search')) closeSearchPanel(); });

    var form = root.querySelector('[data-search-form]');
    var input = root.querySelector('[data-search-input]');
    var search = root.querySelector('.search');
    input.addEventListener('input', function () {
      search.classList.toggle('is-filled', input.value.length > 0);
      debounceSearch(input.value);
    });
    input.addEventListener('focus', function () { if (input.value.trim()) debounceSearch(input.value, 0); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      closeSearchPanel();
      input.blur();
      navigate('/search?q=' + encodeURIComponent(q));
    });

    els.overlay.addEventListener('click', closeCart);
    els.cartFoot.addEventListener('click', function (e) {
      if (e.target.closest('[data-checkout]')) { closeCart(); navigate('/checkout'); }
    });
  }

  /* ============================================================
     Branding / tenant paint
     ============================================================ */
  function paintBranding() {
    var b = activeStore;
    var logo = document.querySelector('[data-brand-logo]');
    if (logo) { logo.src = b.logo || ''; logo.alt = b.name; }
    var name = document.querySelector('[data-brand-name]');
    if (name) name.textContent = b.name;
    var status = document.querySelector('[data-brand-status]');
    if (status) status.innerHTML = (document.querySelector('.header__nav-inner') ? '' : '');

    API.getCategories().then(function (cats) {
      allCategories = cats;
      var nav = document.querySelector('[data-nav-categories]');
      if (nav) {
        nav.innerHTML =
          '<a class="navlink" data-cat-chip="all" href="#/">All products</a>' +
          cats.map(function (c) { return C.categoryChip(c, false); }).join('');
      }
    }).catch(function () { /* categories optional */ });

    renderFooter();
  }

  function renderFooter() {
    if (!els.footer) return;
    var b = activeStore;
    els.footer.innerHTML =
      '<div class="container footer__inner">' +
        '<div class="footer__brand">' +
          '<a class="brand" href="#/"><img class="brand__logo" src="' + C.esc(b.logo) + '" alt=""><span class="brand__text"><strong>' + C.esc(b.name) + '</strong></span></a>' +
          '<p>' + C.esc(b.tagline) + '</p>' +
        '</div>' +
        '<div class="footer__col"><h4>Shop</h4>' +
          '<a href="#/">Catalogue</a><a href="#/search">Search</a><a href="#/cart">Cart</a><a href="#/orders">Orders</a>' +
        '</div>' +
        '<div class="footer__col"><h4>Contact</h4>' +
          (b.phone ? '<a href="tel:' + C.esc(b.phone.replace(/\s/g, '')) + '">' + C.esc(b.phone) + '</a>' : '') +
          (b.email ? '<a href="mailto:' + C.esc(b.email) + '">' + C.esc(b.email) + '</a>' : '') +
          '<a href="#/info">Store info</a>' +
        '</div>' +
        '<div class="footer__col"><h4>Powered by Aqivo</h4>' +
          '<p style="color:var(--text-3);font-size:var(--fs-sm)">This store runs on the Aqivo commerce platform.</p>' +
        '</div>' +
      '</div>' +
      '<div class="container footer__bar">' +
        '<span>&copy; ' + new Date().getFullYear() + ' ' + C.esc(b.name) + '</span>' +
        '<span>Prices in ' + C.esc(S.getSettings().currency) + '</span>' +
      '</div>';
  }

  function switchShop(slug) {
    API.use(slug).then(function (store) {
      activeStore = store;
      try { localStorage.setItem('aqivo.lastShop', store.slug); } catch (e) {}
      S.configure(store);
      paintBranding();
      document.title = store.name + ' — Order online';
      navigate('/');
      render();
    }).catch(function () { toast('Could not switch shop.', true); });
  }

  /* ============================================================
     Header search
     ============================================================ */
  function debounceSearch(q, immediate) {
    clearTimeout(headerSearchTimer);
    q = (q || '').trim();
    if (!q) { closeSearchPanel(); return; }
    if (immediate) { runSearch(q); return; }
    headerSearchTimer = setTimeout(function () { runSearch(q); }, 220);
  }

  function runSearch(q) {
    var panel = document.querySelector('[data-search-panel]');
    if (!panel) return;
    if (q === lastQuery && panel.classList.contains('is-open')) return;
    lastQuery = q;
    panel.classList.add('is-open');
    panel.innerHTML = '<div class="search__group-label">Searching…</div>';
    API.search(q).then(function (res) {
      var html = '';
      if (res.products.length) {
        html = '<div class="search__group-label">Products</div>' + res.products.slice(0, 8).map(C.searchProductRow).join('') +
          '<a class="search__row" href="#/search?q=' + encodeURIComponent(q) + '" data-close-search style="justify-content:center;color:var(--brand-700);font-weight:600">See all results</a>';
      } else {
        html = C.emptyState({ icon: 'search', title: 'No results for “' + C.esc(q) + '”', text: 'Try a different keyword.' });
      }
      panel.innerHTML = html;
    }).catch(function () {
      panel.innerHTML = '<div class="search__group-label">Search is unavailable right now.</div>';
    });
  }

  function clearSearch() {
    var input = document.querySelector('[data-search-input]');
    var search = document.querySelector('.search');
    if (input) { input.value = ''; input.focus(); }
    if (search) search.classList.remove('is-filled');
    closeSearchPanel();
    lastQuery = '';
  }
  function closeSearchPanel() {
    var panel = document.querySelector('[data-search-panel]');
    if (panel) panel.classList.remove('is-open');
  }
  function syncWishButtons(id, added) {
    document.querySelectorAll('[data-wish="' + String(id).replace(/([^\w-])/g, '\\$1') + '"]').forEach(function (btn) {
      btn.classList.toggle('is-active', added);
      btn.setAttribute('aria-pressed', added);
    });
  }

  /* ============================================================
     Quick add
     ============================================================ */
  function quickAdd(id) {
    API.getProduct(id).then(function (product) {
      if (product.available === false) { toast('This item is currently out of stock.', true); return; }
      if (product.type && product.type !== 'product') { navigate('/p/' + id); return; }
      var needsVariant = (product.variants || []).some(function (g) {
        var avail = g.options.filter(function (o) { return o.available; });
        return avail.length > 1;
      });
      if (needsVariant) { navigate('/p/' + id); return; }
      var variant = {};
      (product.variants || []).forEach(function (g) {
        var opt = g.options.find(function (o) { return o.available; });
        if (opt) variant[g.name] = opt.label;
      });
      S.addToCart(product, { qty: 1, variant: variant });
      toast('Added to cart');
    }).catch(function () { toast('Could not add this item. Please try again.', true); });
  }

  /* ============================================================
     Cart
     ============================================================ */
  function renderCart() {
    var count = S.getCartCount();
    var totals = S.totals();
    document.querySelectorAll('[data-cart-badge]').forEach(function (b) {
      b.textContent = count > 99 ? '99+' : count;
      b.classList.toggle('is-visible', count > 0);
    });
    var mini = document.querySelector('[data-cart-badge-mini]');
    if (mini) {
      mini.textContent = count > 99 ? '99+' : count;
      mini.classList.toggle('is-visible', count > 0);
    }

    syncCardAdds();
    renderFloatCart(count, totals);

    if (!els.cartBody) return;
    var label = document.querySelector('[data-cart-count-label]');
    if (label) label.textContent = count ? '(' + count + ' item' + (count > 1 ? 's' : '') + ')' : '';

    var cart = S.getCart();
    if (!cart.length) {
      els.cartBody.innerHTML = C.emptyState({
        icon: 'cart', title: 'Your cart is empty', text: 'Add products from the shop to get started.',
        action: { href: '#/', label: 'Browse products' }
      });
      els.cartFoot.hidden = true;
      els.cartFoot.innerHTML = '';
      return;
    }

    els.cartBody.innerHTML = cart.map(C.lineItem).join('');
    els.cartFoot.hidden = false;
    var minWarning = !totals.meetsMinimum
      ? '<p class="field__error" style="display:block;text-align:center">Minimum order is ' + C.money(totals.minimum) + '.</p>' : '';
    els.cartFoot.innerHTML =
      '<div class="summary-row"><span>Subtotal</span><span>' + C.money(totals.subtotal) + '</span></div>' +
      '<div class="summary-row"><span>' + (S.getFulfilment() === 'pickup' ? 'Pickup' : 'Delivery') + '</span><span>' +
        (S.getFulfilment() === 'pickup' ? 'Free' : (totals.delivery === 0 ? 'Free' : C.money(totals.delivery))) + '</span></div>' +
      '<div class="summary-row summary-row--total"><span>Total</span><span>' + C.money(totals.total) + '</span></div>' +
      minWarning +
      '<button class="btn btn--primary btn--block btn--lg" data-checkout' + (totals.meetsMinimum ? '' : ' disabled') + '>Checkout · ' + C.money(totals.total) + '</button>';
  }

  function renderFloatCart(count, totals) {
    if (!els.floatCart) return;
    var route = parseHash().name;
    var hide = count === 0 || route === 'cart' || route === 'checkout' || route === 'product' ||
      route === 'booking' || route === 'book' || route === 'manage' || route === 'owner';
    if (hide) { els.floatCart.hidden = true; return; }
    els.floatCart.hidden = false;
    els.floatCart.innerHTML = '<span class="floatcart__count">' + count + ' item' + (count > 1 ? 's' : '') + '</span>' +
      '<span class="floatcart__total">View cart · ' + C.money(totals.total) + '</span>';
  }

  /* Keep "+" buttons and cart-quantity badges on product cards in sync with the cart. */
  function syncCardAdds() {
    if (!document.querySelector('.pcard')) return;
    document.querySelectorAll('.pcard').forEach(function (card) {
      var id = card.getAttribute('data-open-product');
      var avail = card.getAttribute('data-avail') !== '0';
      var qty = S.getCart().reduce(function (n, i) { return i.productId === id ? n + i.qty : n; }, 0);
      var media = card.querySelector('.pcard__media');
      if (!media) return;
      var plus = media.querySelector('[data-add]');
      var badge = media.querySelector('[data-card-qty]');
      if (qty > 0) {
        if (badge) { if (badge.textContent != qty) badge.textContent = qty; return; }
        if (plus) plus.remove();
        media.appendChild(el('<button class="pcard__qty" data-card-qty="' + id + '" data-open-cart aria-label="' + qty + ' item' + (qty > 1 ? 's' : '') + ' in cart">' + qty + '</button>'));
      } else {
        if (badge) badge.remove();
        if (!plus && avail) {
          media.appendChild(el('<button class="pcard__add" data-add="' + id + '" aria-label="Add to cart">' + I.get('plus') + '</button>'));
        }
      }
    });
  }

  function openCart() {
    els.drawer.classList.add('is-open');
    els.drawer.setAttribute('aria-hidden', 'false');
    els.overlay.classList.add('is-open');
    document.body.classList.add('no-scroll');
  }
  function closeCart() {
    if (!els.drawer) return;
    els.drawer.classList.remove('is-open');
    els.drawer.setAttribute('aria-hidden', 'true');
    els.overlay.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
  }

  /* ============================================================
     Toasts / modal
     ============================================================ */
  function toast(message, isError) {
    if (!els.toasts) return;
    var node = el('<div class="toast' + (isError ? ' toast--error' : '') + '">' +
      I.get(isError ? 'alert' : 'checkCircle') + '<span>' + C.esc(message) + '</span></div>');
    els.toasts.appendChild(node);
    setTimeout(function () {
      node.style.transition = 'opacity .3s, transform .3s';
      node.style.opacity = '0';
      node.style.transform = 'translateY(10px)';
      setTimeout(function () { node.remove(); }, 320);
    }, 2600);
  }

  function closeModal() {
    if (!els.modalRoot) return;
    els.modalRoot.innerHTML = '';
    document.body.classList.remove('no-scroll');
  }

  /* ============================================================
     Render dispatcher
     ============================================================ */
  function render() {
    var route = parseHash();
    var seq = ++renderSeq;
    var hasBar = ['booking', 'book', 'manage', 'owner'].indexOf(route.name) > -1;
    document.body.classList.toggle('has-pdp', route.name === 'product');
    document.body.classList.toggle('has-bar', hasBar);

    document.querySelectorAll('[data-nav-route]').forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-nav-route') === route.name);
    });

    var bkFlowCleanup;
    if (bkFlow && typeof bkFlow.destroy === 'function') { bkFlow.destroy(); }
    bkFlow = null;
    if (pdp && typeof pdp.destroy === 'function') { pdp.destroy(); pdp = null; }
    routeState.retry = null;
    els.view.innerHTML = '<div style="padding:var(--sp-10);text-align:center;color:var(--text-3)">Loading…</div>';

    var loader;
    switch (route.name) {
      case 'home': loader = viewHome(null); break;
      case 'category': loader = viewHome(route.id); break;
      case 'product': loader = viewProduct(route.id); break;
      case 'search': loader = viewSearch(route.query.q || ''); break;
      case 'cart': loader = viewCartPage(); break;
      case 'checkout': loader = viewCheckout(); break;
      case 'orders': loader = viewOrders(); break;
      case 'info': loader = viewInfo(); break;
      case 'booking': loader = viewBooking(); break;
      case 'book': loader = viewBookFlow(); break;
      case 'manage': loader = viewManage(route.id); break;
      case 'owner': loader = viewOwner(); break;
      default: loader = viewHome(null);
    }

    Promise.resolve(loader).then(function (html) {
      if (seq !== renderSeq) return;
      els.view.innerHTML = html;
      renderCart();
    }).catch(function (err) {
      if (seq !== renderSeq) return;
      els.view.innerHTML = C.errorState(err && err.message);
    });
  }

  function breadcrumb(items) {
    return '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a>' +
      items.map(function (it) {
        return '<span>' + I.get('chevronRight') + '</span>' + (it.href ? '<a href="' + it.href + '">' + C.esc(it.label) + '</a>' : C.esc(it.label));
      }).join('') + '</nav>';
  }

  function categoryNav(activeId) {
    if (!allCategories.length) return '';
    return '<div class="catnav">' +
      '<a class="navlink' + (!activeId ? ' is-active' : '') + '" data-cat-chip="all" href="#/">All products</a>' +
      allCategories.map(function (c) { return C.categoryChip(c, c.id === activeId); }).join('') +
    '</div>';
  }

  /* ---- Store identity header ---- */
  function storeHeader() {
    var b = activeStore;
    var s = S.getSettings();
    var meta = '';
    if (b.rating != null) meta += '<span class="rating">' + I.get('star') + '<strong>' + Number(b.rating).toFixed(1) + '</strong> (' + b.reviewCount + ')</span>';
    if (b.address) meta += '<span>' + I.get('pin') + C.esc(b.address) + '</span>';
    if (s.delivery && s.delivery.available) meta += '<span>' + I.get('truck') + C.esc(s.delivery.time) + ' · ' + (s.delivery.fee === 0 ? 'Free' : C.money(s.delivery.fee)) + '</span>';
    if (s.pickup && s.pickup.available) meta += '<span>' + I.get('store') + 'Pickup available</span>';
    var status = b.open
      ? '<span class="chip chip--open">' + I.get('clock') + 'Open now</span>'
      : '<span class="chip chip--closed">' + I.get('clock') + 'Closed</span>';

    var cover = b.cover ? '<div class="shop-hero__cover">' + C.img(b.cover, b.name, '') + '</div>' : '<div class="shop-hero__cover" aria-hidden="true"></div>';

    return '<section class="shop-hero">' + cover +
      '<div class="shop-hero__body">' +
        C.img(b.logo, b.name + ' logo', 'shop-hero__logo') +
        '<div class="shop-hero__info">' +
          '<div class="row" style="flex-wrap:wrap;gap:var(--sp-2)">' +
            '<h1 class="shop-hero__name">' + C.esc(b.name) + '</h1>' +
            (b.verified ? '<span class="chip chip--verified">' + I.get('verified') + 'Verified</span>' : '') +
            status +
          '</div>' +
          (b.tagline ? '<p class="shop-hero__desc">' + C.esc(b.tagline) + '</p>' : '') +
          '<div class="shop-hero__meta">' + meta + '</div>' +
        '</div>' +
        '<div class="shop-hero__cta">' +
          (B.hasBooking(activeStore) ? '<a class="btn btn--primary" href="#/booking">' + I.get('clock') + 'Book an appointment</a>' : '') +
          (b.whatsapp ? '<a class="btn btn--secondary" href="https://wa.me/' + C.esc(b.whatsapp.replace(/[^\d]/g, '')) + '" target="_blank" rel="noopener">' + I.get('chat') + 'WhatsApp</a>' : '') +
          '<a class="btn btn--secondary" href="#/info">' + I.get('info') + 'Store info</a>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  /* ============================================================
     View: Home / category
     ============================================================ */
  function viewHome(categoryId) {
    return API.getCategories().then(function (cats) {
      return API.getProducts({ category: categoryId || null, page: 1, pageSize: 100 }).then(function (products) {
        var html = storeHeader();
        html += categoryNav(categoryId);

        if (categoryId) {
          var cat = null;
          cats.forEach(function (c) { if (c.id === categoryId) cat = c; });
          if (!cat) {
            return html + C.emptyState({ icon: 'bag', title: 'Category not found', text: 'This category is not available in this shop.', action: { href: '#/', label: 'View all products' } });
          }
          if (!products.items.length) return html + C.productEmpty();
          html += '<section class="cat-section">' +
            '<div class="cat-head"><h2 class="cat-head__title">' + C.esc(cat.name) + '</h2></div>' +
            C.productRow(products.items) +
          '</section>';
          return html;
        }

        var rendered = 0;
        cats.forEach(function (c) {
          var items = products.items.filter(function (p) { return p.category === c.id; });
          if (!items.length) return;
          rendered += items.length;
          html += '<section class="cat-section">' +
            '<div class="cat-head"><h2 class="cat-head__title">' + C.esc(c.name) + '</h2>' +
            '<a class="cat-head__all" href="#/c/' + C.esc(c.id) + '">All <span class="cat-head__caret">&#8250;</span></a>' +
            '</div>' +
            C.productRow(items) +
          '</section>';
        });

        if (!rendered) return html + C.productEmpty();
        return html;
      });
    });
  }

  /* ============================================================
     View: Product
     ============================================================ */
  function viewProduct(id) {
    if (!id) return Promise.resolve(C.errorState('Product not found'));
    return API.getProduct(id).then(function (product) {
      return API.getRelatedProducts(product.id, 6).then(function (related) {
        var html = '<div class="pdp-sheet" data-pdp></div>';
        setTimeout(function () { pdp = mountPDP(product, related); }, 0);
        return html;
      });
    }).catch(function () {
      return C.errorState('We could not find that product.');
    });
  }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function buildDays(count) {
    var out = [];
    var now = new Date();
    for (var i = 0; i < count; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      out.push({
        date: d,
        dow: DAYS[d.getDay()],
        day: String(d.getDate()),
        mon: MONTHS[d.getMonth()],
        label: DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]
      });
    }
    return out;
  }

  function mountPDP(product, related) {
    var container = document.querySelector('[data-pdp]');
    if (!container) return null;

    var type = product.type || 'product';
    var s = S.getSettings();
    var selection = {};
    (product.variants || []).forEach(function (group) {
      var firstAvail = group.options.find(function (o) { return o.available; }) || group.options[0];
      if (firstAvail) selection[group.name] = firstAvail.label;
    });
    var qty = 1;
    var addons = {};
    var notes = '';
    var days = buildDays(14);
    var dayIdx = null;
    var time = null;
    var guests = Math.max(1, Math.min(2, product.guestsMax || 8));

    function variantAvailable() {
      return (product.variants || []).every(function (g) {
        var sel = selection[g.name];
        if (!sel) return false;
        var opt = g.options.find(function (o) { return o.label === sel; });
        return opt && opt.available;
      });
    }

    function unitPrice() {
      var p = product.price || 0;
      (product.variants || []).forEach(function (g) {
        var opt = g.options.find(function (o) { return o.label === selection[g.name]; });
        if (opt && opt.add_price) p += opt.add_price;
      });
      return p;
    }

    function total() {
      if (type === 'service') {
        var t = product.price || 0;
        (product.addons || []).forEach(function (a) {
          if (addons[a.id || a.label]) t += a.price;
        });
        return t;
      }
      if (type === 'booking') return (product.price || 0) * guests;
      return unitPrice() * qty;
    }

    function discount() {
      var cp = product.compare_at_price;
      if (cp != null && cp > (product.price || 0)) return cp - (product.price || 0);
      return 0;
    }

    function cta() {
      var avail = product.available !== false;
      if (type === 'product') {
        if (!avail) return { label: 'Sold out', disabled: true };
        if (!variantAvailable()) return { label: 'Unavailable', disabled: true };
        return { label: 'Add ' + qty + ' for ' + C.money(total()), disabled: false };
      }
      if (type === 'service') {
        return avail ? { label: 'Book for ' + C.money(total()), disabled: false } : { label: 'Unavailable', disabled: true };
      }
      if (!avail) return { label: 'Unavailable', disabled: true };
      if (dayIdx == null || !time) return { label: 'Select a time', disabled: true };
      return { label: 'Reserve for ' + C.money(total()), disabled: false };
    }

    function hero() {
      var image = (product.images && product.images[0]) || '';
      return '<div class="pdp-hero">' +
        C.img(image, product.name, 'pdp-hero__img', { eager: true }) +
        '<button class="pdp-close" data-close-pdp aria-label="Close details">' + I.get('close') + '</button>' +
      '</div>';
    }

    function head() {
      var d = discount();
      var price = type === 'product' ? unitPrice() : (product.price || 0);
      return '<div class="pdp-head">' +
        (d > 0 ? '<span class="pdp-pill">-' + C.money(d) + '</span>' : '') +
        '<h1 class="pdp-title">' + C.esc(product.name) + '</h1>' +
        '<div class="pdp-price">' +
          '<span class="pdp-price__val">' + C.money(price) + '</span>' +
          (product.compare_at_price > (product.price || 0) ? '<span class="pdp-compare">' + C.money(product.compare_at_price) + '</span>' : '') +
        '</div>' +
      '</div>';
    }

    function optionsHTML() {
      if (!product.variants || !product.variants.length) return '';
      return product.variants.map(function (group) {
        var opts = group.options.map(function (o) {
          var selected = selection[group.name] === o.label;
          if (group.type === 'color') {
            return '<button class="option-swatch' + (selected ? ' is-selected' : '') + '" data-opt-group="' + C.esc(group.name) + '" data-opt-label="' + C.esc(o.label) + '"' +
              (o.available ? '' : ' disabled aria-disabled="true"') + ' aria-pressed="' + selected + '" title="' + C.esc(o.label) + (o.available ? '' : ' (unavailable)') + '">' +
              '<i style="background:' + C.esc(o.value || '#ccc') + '"></i></button>';
          }
          return '<button class="option-chip' + (selected ? ' is-selected' : '') + '" data-opt-group="' + C.esc(group.name) + '" data-opt-label="' + C.esc(o.label) + '"' +
            (o.available ? '' : ' disabled aria-disabled="true"') + ' aria-pressed="' + selected + '">' + C.esc(o.label) + '</button>';
        }).join('');
        return '<div class="option-group"><span class="option-group__label">' + C.esc(group.name) + '</span><div class="option-row">' + opts + '</div></div>';
      }).join('');
    }

    function productMiddle() {
      var opts = optionsHTML();
      var stock = product.available === false
        ? '<span class="chip chip--closed">' + I.get('alert') + 'Out of stock</span>'
        : (variantAvailable() ? '<span class="chip chip--open">' + I.get('checkCircle') + 'In stock</span>' : '<span class="chip chip--closed">' + I.get('alert') + 'Pick an option</span>');
      return (opts ? '<div class="pdp-sec">' + opts + '</div>' : '') +
        '<div class="pdp-sec pdp-sec--row">' +
          '<span class="pdp-sec__title">Quantity</span>' +
          '<div class="qty">' +
            '<button data-pdp-qdec aria-label="Decrease quantity">' + I.get('minus') + '</button>' +
            '<span class="qty__value" data-pdp-qty aria-live="polite">' + qty + '</span>' +
            '<button data-pdp-qinc aria-label="Increase quantity">' + I.get('plus') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="pdp-meta">' + stock +
          (s.delivery && s.delivery.available ? '<span class="chip chip--muted">' + I.get('truck') + C.esc(s.delivery.time) + '</span>' : '') +
          (s.pickup && s.pickup.available ? '<span class="chip chip--muted">' + I.get('store') + 'Pickup available</span>' : '') +
        '</div>';
    }

    function specRow(icon, label, value) {
      return '<div class="pdp-spec"><span class="pdp-spec__icon">' + icon + '</span><div class="pdp-spec__main">' +
        '<span class="pdp-spec__label">' + C.esc(label) + '</span>' +
        '<span class="pdp-spec__value">' + C.esc(value) + '</span></div></div>';
    }

    function serviceMiddle() {
      var html = '<div class="pdp-sec">' +
        (product.duration ? specRow(I.get('clock'), 'Duration', product.duration) : '') +
        (product.provider ? specRow(I.get('user'), 'Hosted by', product.provider) : '') +
        specRow(I.get('pin'), 'Location', product.location === 'at_your_place' ? 'We come to you' : 'At the ' + (activeStore ? activeStore.name : 'shop')) +
      '</div>';
      if (product.includes && product.includes.length) {
        html += '<div class="pdp-sec"><h2 class="pdp-sec__title">What\u2019s included</h2><ul class="pdp-list">' +
          product.includes.map(function (i) { return '<li>' + I.get('check') + '<span>' + C.esc(i) + '</span></li>'; }).join('') +
        '</ul></div>';
      }
      if (product.addons && product.addons.length) {
        html += '<div class="pdp-sec"><h2 class="pdp-sec__title">Add-ons</h2>' +
          product.addons.map(function (a) {
            var key = a.id || a.label;
            return '<div class="addon' + (addons[key] ? ' is-on' : '') + '" data-addon="' + C.esc(key) + '" role="checkbox" aria-checked="' + !!addons[key] + '" tabindex="0">' +
              '<span class="addon__box">' + I.get('check') + '</span>' +
              '<span class="addon__name">' + C.esc(a.label) + '</span>' +
              '<span class="addon__price">' + (a.price ? C.money(a.price) : 'Free') + '</span>' +
            '</div>';
          }).join('') +
        '</div>';
      }
      return html;
    }

    function bookingMiddle() {
      var slots = (product.slots && product.slots.length) ? product.slots : defaultSlots();
      var html = '<div class="pdp-sec"><h2 class="pdp-sec__title">Pick a date</h2>' +
        '<div class="date-row">' + days.map(function (d, i) {
          return '<button class="date-chip' + (dayIdx === i ? ' is-on' : '') + '" data-nday="' + i + '">' +
            '<span class="date-chip__dow">' + d.dow + '</span>' +
            '<span class="date-chip__day">' + d.day + '</span>' +
            '<span class="date-chip__mon">' + d.mon + '</span></button>';
        }).join('') + '</div>' +
      '</div>';
      html += '<div class="pdp-sec"><h2 class="pdp-sec__title">Pick a time</h2>' +
        '<div class="slot-grid">' + slots.map(function (sl) {
          return '<button class="slot' + (time === sl.time ? ' is-on' : '') + '" data-slot="' + C.esc(sl.time) + '"' + (sl.available ? '' : ' disabled') + '>' + C.esc(sl.time) + '</button>';
        }).join('') + '</div>' +
      '</div>';
      html += '<div class="pdp-sec pdp-sec--row">' +
        '<span class="pdp-sec__title">Guests</span>' +
        '<div class="qty">' +
          '<button data-pdp-gdec aria-label="Decrease guests">' + I.get('minus') + '</button>' +
          '<span class="qty__value" data-pdp-guests aria-live="polite">' + guests + '</span>' +
          '<button data-pdp-ginc aria-label="Increase guests">' + I.get('plus') + '</button>' +
        '</div>' +
      '</div>';
      html += '<div class="pdp-sec"><h2 class="pdp-sec__title">Notes</h2>' +
        '<textarea class="textarea" data-pdp-notes rows="3" placeholder="Dietary needs, accessibility, anything we should know…">' + C.esc(notes) + '</textarea>' +
      '</div>';
      if (product.cancellation) {
        html += '<p class="pdp-cancel">' + I.get('info') + '<span>' + C.esc(product.cancellation) + '</span></p>';
      }
      return html;
    }

    function defaultSlots() {
      var out = [];
      for (var h = 9; h <= 17; h++) {
        var timeStr = (h < 10 ? '0' + h : h) + ':00';
        out.push({ time: timeStr, available: h !== 11 && h !== 15 });
      }
      return out;
    }

    function detailsBlock() {
      var details = product.details || product.specs || [];
      if (!product.description && !details.length) return '';
      return '<details class="acc">' +
        '<summary class="acc__head">Details <span class="acc__icon">' + I.get('chevronDown') + '</span></summary>' +
        '<div class="acc__body">' +
          (product.description ? '<p class="acc__text">' + C.esc(product.description) + '</p>' : '') +
          (details.length ? '<dl class="acc-specs">' + details.map(function (x) {
            return '<div><dt>' + C.esc(x.label) + '</dt><dd>' + C.esc(x.value) + '</dd></div>';
          }).join('') + '</dl>' : '') +
        '</div>' +
      '</details>';
    }

    function relatedBlock() {
      if (type === 'booking' || !related.length) return '';
      return '<section class="pdp-related">' +
        '<h2 class="pdp-sec__title">You may also like</h2>' +
        '<div class="pcard-row pcard-row--related">' + related.map(C.productCard).join('') + '</div>' +
      '</section>';
    }

    function iconFor() {
      return type === 'product' ? 'bag' : (type === 'service' ? 'check' : 'clock');
    }

    function bar() {
      var c = cta();
      return '<div class="pdp-bar"><button class="pdp-bar__btn" data-pdp-cta' + (c.disabled ? ' disabled' : '') + '>' +
        I.get(iconFor()) + '<span>' + C.esc(c.label) + '</span></button></div>';
    }

    function paint() {
      container.innerHTML = hero() +
        '<div class="pdp-body">' +
          head() +
          (type === 'product' ? productMiddle() : type === 'service' ? serviceMiddle() : bookingMiddle()) +
          detailsBlock() +
          relatedBlock() +
        '</div>' +
        bar();
    }
    paint();

    function addToCart() {
      if (type === 'product') {
        if (product.available === false || !variantAvailable()) { toast('Please choose an available option.', true); return false; }
        S.addToCart(product, { qty: qty, variant: Object.assign({}, selection) });
      } else if (type === 'service') {
        var chosen = (product.addons || []).filter(function (a) { return addons[a.id || a.label]; }).map(function (a) { return a.label; });
        S.addToCart(product, { qty: 1, variant: chosen.length ? { 'Add-ons': chosen.join(', ') } : {} });
      } else {
        S.addToCart(product, { qty: guests, variant: { Date: days[dayIdx].label, Time: time } });
      }
      toast('Added to cart');
      openCart();
      return true;
    }

    container.addEventListener('click', function (e) {
      var t;
      if (e.target.closest('[data-close-pdp]')) { navigate('/'); return; }
      if ((t = e.target.closest('[data-opt-group]'))) { if (t.disabled) return; selection[t.getAttribute('data-opt-group')] = t.getAttribute('data-opt-label'); paint(); return; }
      if (e.target.closest('[data-pdp-qdec]')) { qty = Math.max(1, qty - 1); paint(); return; }
      if (e.target.closest('[data-pdp-qinc]')) { qty = Math.min(99, qty + 1); paint(); return; }
      if ((t = e.target.closest('[data-addon]'))) {
        var key = t.getAttribute('data-addon');
        addons[key] = !addons[key];
        paint();
        return;
      }
      if ((t = e.target.closest('[data-nday]'))) { dayIdx = parseInt(t.getAttribute('data-nday'), 10); paint(); return; }
      if ((t = e.target.closest('[data-slot]'))) { if (t.disabled) return; time = t.getAttribute('data-slot'); paint(); return; }
      if (e.target.closest('[data-pdp-gdec]')) { guests = Math.max(1, guests - 1); paint(); return; }
      if (e.target.closest('[data-pdp-ginc]')) { guests = Math.min(product.guestsMax || 16, guests + 1); paint(); return; }
      if (e.target.closest('[data-pdp-cta]')) { if (!cta().disabled) addToCart(); return; }
    });

    container.addEventListener('input', function (e) {
      if (e.target.matches('[data-pdp-notes]')) notes = e.target.value;
    });
    container.addEventListener('keydown', function (e) {
      var t = e.target.closest('[data-addon]');
      if (!t) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var key = t.getAttribute('data-addon');
        addons[key] = !addons[key];
        paint();
      }
    });

    return { destroy: function () {} };
  }

  /* ============================================================
     View: Search
     ============================================================ */
  function viewSearch(q) {
    q = (q || '').trim();
    var input = '<form class="search" data-search-page-form style="margin-bottom:var(--sp-5)">' +
      '<div class="search__field">' + I.get('search') +
        '<input class="search__input" type="search" name="q" value="' + C.esc(q) + '" placeholder="Search this shop" aria-label="Search this shop" data-search-page-input>' +
      '</div></form>';

    if (!q) {
      return Promise.resolve(breadcrumb([{ label: 'Search' }]) + input +
        C.emptyState({ icon: 'search', brand: true, title: 'Search ' + C.esc(activeStore.name), text: 'Find products by name, category or description.' }));
    }

    return API.search(q).then(function (res) {
      var html = breadcrumb([{ label: 'Search' }]) + input;
      if (!res.products.length) {
        return html + C.emptyState({ icon: 'search', title: 'No results for “' + C.esc(q) + '”', text: 'Try a different keyword or browse the shop.' });
      }
      html += C.sectionHead(res.products.length + ' result' + (res.products.length === 1 ? '' : 's'), 'for “' + q + '”');
      html += C.productGrid(res.products);
      return html;
    });
  }

  /* ============================================================
     View: Cart page
     ============================================================ */
  function viewCartPage() {
    var cart = S.getCart();
    var html = breadcrumb([{ label: 'Cart' }]);
    if (!cart.length) {
      return Promise.resolve(html + C.emptyState({
        icon: 'cart', brand: true, title: 'Your cart is empty',
        text: 'Browse the shop and add products to get started.',
        action: { href: '#/', label: 'Browse products' }
      }));
    }
    var totals = S.totals();
    html += C.sectionHead('Your cart', cart.length + ' line item' + (cart.length === 1 ? '' : 's'));
    html += '<div class="checkout">' +
      '<div class="panel">' + cart.map(C.lineItem).join('') + '</div>' +
      '<aside class="checkout__aside"><div class="panel">' +
        '<h3 class="panel__title">Order summary</h3>' +
        '<div class="summary-row"><span>Subtotal</span><span>' + C.money(totals.subtotal) + '</span></div>' +
        '<div class="summary-row"><span>' + (S.getFulfilment() === 'pickup' ? 'Pickup' : 'Delivery') + '</span><span>' +
          (S.getFulfilment() === 'pickup' ? 'Free' : (totals.delivery === 0 ? 'Free' : C.money(totals.delivery))) + '</span></div>' +
        '<div class="summary-row summary-row--total"><span>Total</span><span>' + C.money(totals.total) + '</span></div>' +
        (!totals.meetsMinimum ? '<p class="field__error" style="display:block;margin-top:var(--sp-3)">Minimum order is ' + C.money(totals.minimum) + '.</p>' : '') +
        '<div style="height:var(--sp-4)"></div>' +
        '<button class="btn btn--primary btn--block btn--lg" data-checkout' + (totals.meetsMinimum ? '' : ' disabled') + '>Proceed to checkout</button>' +
      '</div></aside>' +
    '</div>';
    return Promise.resolve(html);
  }

  /* ============================================================
     View: Checkout (guest)
     ============================================================ */
  function viewCheckout() {
    var cart = S.getCart();
    if (!cart.length) {
      return Promise.resolve(breadcrumb([{ label: 'Checkout' }]) + C.emptyState({
        icon: 'cart', brand: true, title: 'Nothing to check out', text: 'Add products to your cart first.',
        action: { href: '#/', label: 'Browse products' }
      }));
    }
    var totals = S.totals();
    var s = S.getSettings();
    var fulfilment = S.getFulfilment();
    var payments = s.payments && s.payments.length ? s.payments : ['mpesa'];

    var paymentLabels = {
      mpesa: { name: 'M-Pesa', sub: 'Pay securely via STK push' },
      cod: { name: 'Cash on delivery', sub: 'Pay when your order is delivered' },
      card: { name: 'Card', sub: 'Pay by debit or credit card' }
    };

    var html = breadcrumb([{ label: 'Checkout' }]);
    html += '<div class="checkout">' +
      '<form class="checkout__main" data-checkout-form novalidate>' +
        '<div class="panel">' +
          '<h3 class="panel__title">Your details</h3>' +
          '<div class="field" data-field="name"><label class="field__label" for="ck-name">Full name</label>' +
            '<input class="input" id="ck-name" name="name" autocomplete="name" placeholder="e.g. Wanjiku Mwangi">' +
            '<span class="field__error">Please enter your name.</span></div>' +
          '<div class="field" data-field="phone"><label class="field__label" for="ck-phone">Phone number</label>' +
            '<input class="input" id="ck-phone" name="phone" inputmode="tel" autocomplete="tel" placeholder="07XX XXX XXX">' +
            '<span class="field__error">Enter a valid Kenyan phone number.</span></div>' +
          '<div class="field" style="margin-bottom:0"><label class="field__label" for="ck-email">Email <span class="field__hint">(optional)</span></label>' +
            '<input class="input" id="ck-email" name="email" type="email" autocomplete="email" placeholder="you@example.com"></div>' +
        '</div>' +

        ((s.delivery.available && s.pickup.available) ?
          '<div class="panel"><h3 class="panel__title">How would you like it?</h3>' +
          '<label class="pay-option' + (fulfilment === 'delivery' ? ' is-selected' : '') + '" data-fulfil="delivery">' +
            '<span class="pay-option__radio"></span><span class="pay-option__main">' +
            '<span class="pay-option__name">Delivery</span><span class="pay-option__sub">' + C.esc(s.delivery.time || '') + ' · ' + (s.delivery.fee === 0 ? 'Free' : C.money(s.delivery.fee)) + '</span></span></label>' +
          '<label class="pay-option' + (fulfilment === 'pickup' ? ' is-selected' : '') + '" data-fulfil="pickup">' +
            '<span class="pay-option__radio"></span><span class="pay-option__main">' +
            '<span class="pay-option__name">Pickup</span><span class="pay-option__sub">' + C.esc(s.pickup.note || '') + '</span></span></label>' +
          '</div>' : '') +

        (fulfilment === 'delivery' ? '<div class="panel">' +
          '<h3 class="panel__title">Delivery address</h3>' +
          '<div class="field" data-field="address"><label class="field__label" for="ck-addr">Address</label>' +
            '<textarea class="textarea" id="ck-addr" name="address" placeholder="Building, street, area" data-addr-field></textarea>' +
            '<span class="field__error">Please enter a delivery address.</span></div>' +
          '<div class="field" style="margin-bottom:0"><label class="field__label" for="ck-notes">Order notes <span class="field__hint">(optional)</span></label>' +
            '<textarea class="textarea" id="ck-notes" name="notes" placeholder="Landmark, gate number, preferred time…"></textarea></div>' +
        '</div>' : '<div class="panel"><h3 class="panel__title">Pickup</h3>' +
          '<p class="pdp__desc">' + I.get('pin') + ' ' + C.esc(activeStore.address || '') + '</p>' +
          '<p class="field__hint" style="margin-top:var(--sp-2)">' + C.esc(s.pickup.note || '') + '</p></div>') +

        '<div class="panel"><h3 class="panel__title">Payment method</h3>' +
          payments.map(function (p, i) {
            var label = paymentLabels[p] || { name: p, sub: '' };
            return '<label class="pay-option' + (i === 0 ? ' is-selected' : '') + '" data-pay="' + C.esc(p) + '">' +
              '<span class="pay-option__radio"></span><span class="pay-option__main">' +
              '<span class="pay-option__name">' + C.esc(label.name) + '</span>' +
              '<span class="pay-option__sub">' + C.esc(label.sub) + '</span></span></label>';
          }).join('') +
        '</div>' +
      '</form>' +

      '<aside class="checkout__aside"><div class="panel">' +
        '<h3 class="panel__title">Order summary</h3>' +
        cart.map(function (i) {
          return '<div class="line-item" style="grid-template-columns:52px 1fr;gap:var(--sp-3)">' +
            C.img(i.image, i.name, 'line-item__img', {}) +
            '<div class="line-item__main"><span class="line-item__name">' + C.esc(i.name) + '</span>' +
            '<div class="line-item__foot"><span style="color:var(--text-3)">Qty ' + i.qty + '</span>' +
            '<span class="line-item__price">' + C.money(i.price * i.qty) + '</span></div></div></div>';
        }).join('') +
        '<div style="height:var(--sp-3)"></div>' +
        '<div class="summary-row"><span>Subtotal</span><span>' + C.money(totals.subtotal) + '</span></div>' +
        '<div class="summary-row"><span>Delivery</span><span data-ck-delivery>' + (fulfilment === 'pickup' ? 'Free' : (totals.delivery === 0 ? 'Free' : C.money(totals.delivery))) + '</span></div>' +
        '<div class="summary-row summary-row--total"><span>Total</span><span data-ck-total>' + C.money(totals.total) + '</span></div>' +
        '<div style="height:var(--sp-4)"></div>' +
        '<button class="btn btn--primary btn--block btn--lg" data-place-order' + (totals.meetsMinimum ? '' : ' disabled') + '>' + I.get('shield') + 'Place order</button>' +
        '<p class="field__hint" style="margin-top:var(--sp-3);text-align:center">Your totals are verified by the shop before payment.</p>' +
      '</div></aside>' +
    '</div>';

    setTimeout(bindCheckout, 0);
    return Promise.resolve(html);
  }

  function bindCheckout() {
    var form = document.querySelector('[data-checkout-form]');
    if (!form) return;
    var selectedPay = (S.getSettings().payments && S.getSettings().payments[0]) || 'mpesa';

    document.querySelectorAll('[data-pay]').forEach(function (opt) {
      opt.addEventListener('click', function () {
        selectedPay = opt.getAttribute('data-pay');
        document.querySelectorAll('[data-pay]').forEach(function (o) { o.classList.toggle('is-selected', o === opt); });
      });
    });
    document.querySelectorAll('[data-fulfil]').forEach(function (opt) {
      opt.addEventListener('click', function () {
        S.setFulfilment(opt.getAttribute('data-fulfil'));
        render();
      });
    });

    function setError(field, has) {
      var f = form.querySelector('[data-field="' + field + '"]');
      if (f) f.classList.toggle('has-error', has);
      return !has;
    }
    function validate() {
      var ok = true;
      ok = setError('name', form.elements.name.value.trim().length < 2) && ok;
      var phone = form.elements.phone.value.replace(/\s+/g, '');
      var phoneOk = /^(?:\+?254|0)[17]\d{8}$/.test(phone);
      ok = setError('phone', !phoneOk) && ok;
      if (S.getFulfilment() === 'delivery' && form.elements.address) {
        ok = setError('address', form.elements.address.value.trim().length < 4) && ok;
      }
      return ok;
    }

    var placing = false;
    function placeOrder() {
      if (placing) return;
      if (!validate()) {
        var firstError = form.querySelector('.has-error .input, .has-error .textarea');
        if (firstError) firstError.focus();
        toast('Please review the highlighted fields.', true);
        return;
      }
      if (!S.totals().meetsMinimum) { toast('Minimum order is ' + C.money(S.totals().minimum) + '.', true); return; }
      placing = true;
      var btn = document.querySelector('[data-place-order]');
      if (btn) { btn.disabled = true; btn.innerHTML = I.get('refresh') + 'Placing order…'; }

      var totals = S.totals();
      var order = {
        reference: 'AQV-' + Date.now().toString(36).toUpperCase().slice(-6),
        total: totals.total,
        payment: selectedPay,
        fulfilment: S.getFulfilment(),
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        address: form.elements.address ? form.elements.address.value.trim() : activeStore.address,
        items: S.getCart()
      };
      setTimeout(function () {
        S.clearCart();
        renderCart();
        renderOrderSuccess(order);
      }, 900);
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); placeOrder(); });
    var placeBtn = document.querySelector('[data-place-order]');
    if (placeBtn) placeBtn.addEventListener('click', placeOrder);
  }

  function renderOrderSuccess(order) {
    var html = '<div class="order-success">' +
      '<div class="order-success__icon">' + I.get('checkCircle') + '</div>' +
      '<h1 style="font-size:var(--fs-2xl)">Order confirmed</h1>' +
      '<p style="color:var(--text-2);margin-top:var(--sp-2)">Thank you, ' + C.esc(order.name.split(' ')[0]) + '. ' +
        (order.payment === 'mpesa' ? 'A payment prompt has been sent to ' + C.esc(order.phone) + '.' : 'Please have ' + C.money(order.total) + ' ready on ' + (order.fulfilment === 'pickup' ? 'pickup' : 'delivery') + '.') +
      '</p>' +
      '<div class="receipt"><div class="spec-list">' +
        '<div class="spec-row"><dt>Reference</dt><dd>' + C.esc(order.reference) + '</dd></div>' +
        '<div class="spec-row"><dt>' + (order.fulfilment === 'pickup' ? 'Pickup at' : 'Delivering to') + '</dt><dd>' + C.esc(order.fulfilment === 'pickup' ? (activeStore.address || '') : order.address) + '</dd></div>' +
        '<div class="spec-row"><dt>Payment</dt><dd>' + (order.payment === 'mpesa' ? 'M-Pesa' : order.payment === 'cod' ? 'Cash on delivery' : order.payment) + '</dd></div>' +
        order.items.map(function (i) { return '<div class="spec-row"><dt>' + C.esc(i.name) + ' × ' + i.qty + '</dt><dd>' + C.money(i.price * i.qty) + '</dd></div>'; }).join('') +
        '<div class="spec-row" style="border-top:1px solid var(--border);border-bottom:0"><dt><strong>Total</strong></dt><dd><strong>' + C.money(order.total) + '</strong></dd></div>' +
      '</div></div>' +
      '<div class="row" style="justify-content:center;gap:var(--sp-3);margin-top:var(--sp-6)">' +
        '<a class="btn btn--primary" href="#/">Continue shopping</a>' +
        '<a class="btn btn--secondary" href="#/orders">View orders</a>' +
      '</div>' +
    '</div>';
    els.view.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ============================================================
     View: Orders
     ============================================================ */
  function viewOrders() {
    return Promise.resolve(breadcrumb([{ label: 'Orders' }]) + C.sectionHead('Your orders') +
      C.emptyState({
        icon: 'orders', brand: true, title: 'No orders yet',
        text: 'Orders you place with ' + activeStore.name + ' will appear here with their status and receipt.',
        action: { href: '#/', label: 'Start shopping' }
      }));
  }

  /* ============================================================
     View: Store info
     ============================================================ */
  function viewInfo() {
    var b = activeStore;
    var s = S.getSettings();
    return API.listStores().then(function (stores) {
      var rows = '';
      rows += '<div class="spec-row"><dt>Hours</dt><dd>' + C.esc(b.open ? 'Open now · ' : 'Closed · ') + C.esc(s.hours || '') + '</dd></div>';
      if (b.address) rows += '<div class="spec-row"><dt>Address</dt><dd>' + C.esc(b.address) + '</dd></div>';
      if (b.phone) rows += '<div class="spec-row"><dt>Phone</dt><dd><a href="tel:' + C.esc(b.phone.replace(/\s/g, '')) + '">' + C.esc(b.phone) + '</a></dd></div>';
      if (b.email) rows += '<div class="spec-row"><dt>Email</dt><dd><a href="mailto:' + C.esc(b.email) + '">' + C.esc(b.email) + '</a></dd></div>';
      if (b.rating != null) rows += '<div class="spec-row"><dt>Rating</dt><dd>' + Number(b.rating).toFixed(1) + ' (' + b.reviewCount + ' reviews)</dd></div>';
      if (s.delivery && s.delivery.available) rows += '<div class="spec-row"><dt>Delivery</dt><dd>' + C.esc(s.delivery.note || '') + ' · ' + (s.delivery.fee === 0 ? 'Free' : C.money(s.delivery.fee)) + ' (free over ' + C.money(s.delivery.freeOver) + ')</dd></div>';
      if (s.pickup && s.pickup.available) rows += '<div class="spec-row"><dt>Pickup</dt><dd>' + C.esc(s.pickup.note || '') + '</dd></div>';

      var preview = '<div class="panel"><h3 class="panel__title">Template preview</h3>' +
        '<p class="field__hint" style="margin-bottom:var(--sp-3)">This store is powered by the Aqivo platform. Preview the same storefront template with another business (demo only).</p>' +
        '<div class="row" style="flex-wrap:wrap;gap:var(--sp-2)">' +
          stores.map(function (st) {
            var active = st.slug === b.slug;
            return '<button class="btn ' + (active ? 'btn--primary' : 'btn--secondary') + ' btn--sm" data-preview-shop="' + C.esc(st.slug) + '"' + (active ? ' disabled' : '') + '>' +
              C.esc(st.name) + (active ? ' · current' : '') + '</button>';
          }).join('') +
        '</div></div>';

      return breadcrumb([{ label: 'Store info' }]) +
        C.sectionHead(b.name, b.type ? (b.type.charAt(0).toUpperCase() + b.type.slice(1)) : '') +
        (b.description ? '<div class="panel" style="margin-bottom:var(--sp-4)"><p class="shop-hero__desc" style="text-align:left">' + C.esc(b.description) + '</p></div>' : '') +
        '<div class="checkout">' +
          '<div class="panel"><h3 class="panel__title">Contact & details</h3><dl class="spec-list">' + rows + '</dl>' +
            '<div class="row" style="gap:var(--sp-3);margin-top:var(--sp-5);flex-wrap:wrap">' +
              (b.whatsapp ? '<a class="btn btn--primary" href="https://wa.me/' + C.esc(b.whatsapp.replace(/[^\d]/g, '')) + '" target="_blank" rel="noopener">' + I.get('chat') + 'Chat on WhatsApp</a>' : '') +
              (b.phone ? '<a class="btn btn--secondary" href="tel:' + C.esc(b.phone.replace(/\s/g, '')) + '">' + I.get('phone') + 'Call store</a>' : '') +
            '</div>' +
          '</div>' +
          '<aside class="checkout__aside">' + preview + '</aside>' +
        '</div>';
    });
  }

  /* ============================================================
     Booking — appointment storefront
     ============================================================ */
  function fmtDur(min) {
    var h = Math.floor(min / 60), m = min % 60;
    if (!h) return m + ' min';
    return h + ' hr' + (h > 1 ? 's' : '') + (m ? ' ' + m + ' min' : '');
  }
  function hmToMin(hm) { var p = String(hm).split(':').map(Number); return p[0] * 60 + (p[1] || 0); }
  function hmFromMin(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
  }
  function bkSelProducts() {
    if (!activeStore || !activeStore.products) return [];
    return activeStore.products.filter(function (p) { return bkSel.indexOf(p.id) > -1; });
  }
  function bkTotal() { return bkSelProducts().reduce(function (t, p) { return t + (p.price || 0); }, 0); }
  function bkMinutes() { return B.totalMinutes(activeStore, bkSel); }
  function bkBarLine() {
    if (!bkSel.length) return 'Select at least one service';
    return bkSel.length + ' service' + (bkSel.length > 1 ? 's' : '') + ' · ' + C.money(bkTotal()) + ' · ' + fmtDur(bkMinutes());
  }
  function availabilityLine(ids) {
    ids = ids || (bkSel.length ? bkSel.slice() : (activeStore.products || []).filter(function (p) { return p.type === 'service'; }).slice(0, 1).map(function (p) { return p.id; }));
    if (!ids.length) return 'Choose a service to see availability';
    var na = B.nextAvailable(activeStore, ids, bkStaffId);
    return na ? 'Next available: <strong>' + C.esc(na.label) + '</strong>' : 'No times available in the next 14 days';
  }

  var bkStaffId = null;

  /* ---- View: #/booking (public landing) ---- */
  function viewBooking() {
    if (!B.hasBooking(activeStore)) {
      return Promise.resolve(C.emptyState({ icon: 'clock', brand: true, title: 'No online bookings', text: activeStore.name + ' does not take appointments online yet. Contact the business directly.', action: { href: '#/', label: 'Back to shop' } }));
    }
    var html = '<div class="bk" data-bk>' + bkLandingHTML() + '</div>';
    return Promise.resolve(html).then(function () {
      setTimeout(bindBookingLanding, 0);
      return html;
    });
  }

  function bkLandingHTML() {
    var b = activeStore.business;
    var cfg = B.config(activeStore);
    var groups = {};
    activeStore.products.forEach(function (p) { if (p.type === 'service') (groups[p.category] = groups[p.category] || []).push(p); });

    var services = '';
    if (!Object.keys(groups).length) {
      services = '<div class="bkf__empty">' + I.get('clock') + '<span>No bookable services are listed yet.</span></div>';
    } else {
      services = Object.keys(groups).map(function (cat) {
        var c = (activeStore.categories || []).find(function (x) { return x.id === cat; });
        return '<div class="bk-group">' +
          '<h2 class="bk-sub">' + C.esc(c ? c.name : cat) + '</h2>' +
          groups[cat].map(function (p) {
            return '<div class="bsvc" data-bk-svc="' + C.esc(p.id) + '">' +
              C.img(p.images && p.images[0], p.name, 'bsvc__img', {}) +
              '<div class="bsvc__main">' +
                '<button type="button" class="bsvc__name" data-bk-open="' + C.esc(p.id) + '">' + C.esc(p.name) + '</button>' +
                '<span class="bsvc__meta">' + C.esc(p.duration || fmtDur(p.durationMin)) + ' · ' + C.money(p.price) + '</span>' +
              '</div>' +
              '<button type="button" class="bsvc__book" data-bk-toggle="' + C.esc(p.id) + '" aria-pressed="false">' + I.get('plus') + 'Add</button>' +
            '</div>';
          }).join('') +
        '</div>';
      }).join('');
    }

    var staff = '';
    if (cfg.staff && cfg.staff.length) {
      staff = '<section class="bk-sec"><h2 class="bk-title">Choose your specialist</h2>' +
        '<p class="bkf__label">Pick who you\u2019d like, or leave it to whoever is available.</p>' +
        '<div class="bk-staff" data-bk-staff>' +
          '<div class="bk-staff__row">' +
            '<button type="button" class="bk-staff__chip is-on" data-bk-staff-chip="any">' +
              '<span class="bk-staff__dot" aria-hidden="true"></span>' +
              '<span class="bk-staff__main"><strong>Any available</strong><small>First free slot</small></span>' +
            '</button>' +
            cfg.staff.map(function (st) {
              return '<button type="button" class="bk-staff__chip" data-bk-staff-chip="' + C.esc(st.id) + '">' +
                '<span class="bk-staff__ava">' + C.esc((st.name || '?').charAt(0)) + '</span>' +
                '<span class="bk-staff__main"><strong>' + C.esc(st.name) + '</strong><small>' + C.esc(st.role || 'Specialist') + '</small></span>' +
              '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</section>';
    }

    var reviews = '';
    if (cfg.reviews && cfg.reviews.length) {
      reviews = '<section class="bk-sec"><h2 class="bk-title">Reviews</h2>' +
        '<div class="bk-rating">' + I.get('star') + '<strong>' + Number(b.rating || 0).toFixed(1) + '</strong><span>' + (b.reviewCount || 0) + ' verified reviews</span></div>' +
        cfg.reviews.map(function (r) {
          var stars = '';
          for (var i = 0; i < 5; i++) stars += '<span class="star' + (i < r.rating ? ' is-on' : '') + '">' + I.get('star') + '</span>';
          return '<div class="breview">' +
            '<div class="row" style="justify-content:space-between"><strong>' + C.esc(r.author) + '</strong><span class="breview__date">' + C.esc(r.date) + '</span></div>' +
            '<div class="breview__stars">' + stars + '</div>' +
            '<p>' + C.esc(r.text) + '</p>' +
          '</div>';
        }).join('') +
      '</section>';
    }

    /* about / policies */
    var hours = [];
    var names = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
    Object.keys(names).forEach(function (d) {
      var ivs = (cfg.hours || {})[d] || [];
      hours.push('<div class="bk-hour"><span>' + names[d] + '</span><span>' + (ivs.length ? ivs.map(function (iv) { return iv[0] + ' \u2013 ' + iv[1]; }).join(', ') : 'Closed') + '</span></div>');
    });
    var map = B.mapsUrl(activeStore);

    var about = '<section class="bk-sec"><h2 class="bk-title">About &amp; policies</h2>' +
      (b.description ? '<p class="bkf__label" style="line-height:var(--lh-normal)">' + C.esc(b.description) + '</p>' : '') +
      '<div class="bk-hours">' + hours.join('') + '</div>' +
      (cfg.policy ? '<div class="bk-policy">' + I.get('info') + '<span>' + C.esc(cfg.policy) + '</span></div>' : '') +
      '<div class="bk-map">' +
        '<div class="bk-map__top">' + I.get('pin') + '<div><strong>' + C.esc(b.name) + '</strong><p>' + C.esc(b.address || '') + '</p></div></div>' +
        '<p class="bkf__label">Free parking on Rose Avenue and in Mall 2 basement. The studio is on the 4th floor.</p>' +
        '<a class="btn btn--secondary btn--sm" href="' + map + '" target="_blank" rel="noopener">' + I.get('pin') + 'Get directions</a>' +
      '</div>' +
    '</section>';

    var gal = (b.gallery && b.gallery.length) ? '<section class="bk-sec"><h2 class="bk-title">Gallery</h2>' +
      '<div class="bk-gal">' + b.gallery.map(function (src) { return C.img(src, b.name, 'bk-gal__img', {}); }).join('') + '</div></section>' : '';

    return bkHeroHTML() +
      '<div class="bk-body" style="padding-bottom:calc(96px + env(safe-area-inset-bottom))">' +
        (gal) +
        '<section class="bk-sec bk-sec--services" data-bk-services><h2 class="bk-title">Book a service</h2>' + services + '</section>' +
        '<div class="bk-avail" data-bk-avail></div>' +
        staff +
        reviews +
        about +
      '</div>' +
      '<div class="bk-bar" data-bk-bar>' +
        '<div class="bk-bar__line" data-bk-line></div>' +
        '<button class="bk-bar__btn" data-bk-go disabled><span class="bk-bar__count" data-bk-count>0</span>' + I.get('clock') + '<span class="bk-bar__label">Book now</span></button>' +
      '</div>';
  }

  function bkHeroHTML() {
    var b = activeStore.business;
    var cfg = B.config(activeStore);
    var open = b.open !== false;
    var cover = b.cover || (cfg.gallery && cfg.gallery[0]) || '';
    var hoursLine = hoursSummary();
    return '<section class="bk-hero">' +
      (cover ? '<div class="bk-hero__cover">' + C.img(cover, b.name, '', { eager: true }) + '</div>' : '') +
      '<div class="bk-hero__body">' +
        '<span class="bk-hero__name">' + C.esc(b.name) + '</span>' +
        '<h1 class="bk-hero__title">Book your visit</h1>' +
        '<div class="bk-hero__meta">' +
          (b.rating != null ? '<span class="rating">' + I.get('star') + '<strong>' + Number(b.rating).toFixed(1) + '</strong> (' + b.reviewCount + ')</span>' : '') +
          (b.address ? '<span>' + I.get('pin') + C.esc(b.address) + '</span>' : '') +
          '<span class="chip ' + (open ? 'chip--open' : 'chip--closed') + '">' + I.get('clock') + (open ? 'Open now' : 'Closed') + ' · ' + C.esc(hoursLine) + '</span>' +
        '</div>' +
        '<div class="bk-hero__actions">' +
          (b.whatsapp ? '<a class="btn btn--secondary" href="https://wa.me/' + C.esc(b.whatsapp.replace(/[^\d]/g, '')) + '" target="_blank" rel="noopener">' + I.get('chat') + 'WhatsApp</a>' : '') +
          (b.phone ? '<a class="btn btn--secondary" href="tel:' + C.esc(b.phone.replace(/\s/g, '')) + '">' + I.get('phone') + 'Call</a>' : '') +
        '</div>' +
      '</div>' +
    '</section>';
  }
  function hoursSummary() {
    var cfg = B.config(activeStore) || {};
    var map = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
    var days = Object.keys(cfg.hours || {}).filter(function (d) { return (cfg.hours[d] || []).length; });
    if (!days.length) return 'By appointment';
    var first = map[days[0]], last = map[days[days.length - 1]];
    var iv = (cfg.hours[days[0]] || [])[0];
    return first + '–' + last + (iv ? ' ' + iv[0] + '–' + iv[1] : '');
  }

  function bindBookingLanding() {
    var root = document.querySelector('[data-bk]');
    if (!root) return;
    var bar = root.querySelector('[data-bk-bar]');
    var avail = root.querySelector('[data-bk-avail]');

    function paintBar() {
      if (!bar) return;
      var line = bkBarLine();
      bar.querySelector('[data-bk-line]').innerHTML = C.esc(line);
      var btn = bar.querySelector('[data-bk-go]');
      var enabled = bkSel.length > 0;
      btn.disabled = !enabled;
      btn.classList.toggle('is-on', enabled);
      var label = btn.querySelector('.bk-bar__label');
      if (label) label.textContent = 'Book now';
      var count = bar.querySelector('[data-bk-count]');
      if (count) {
        count.textContent = bkSel.length;
        count.classList.toggle('is-visible', bkSel.length > 0);
      }
    }
    function paintAvail() {
      if (!avail) return;
      avail.innerHTML = I.get('clock') + '<span>' + availabilityLine() + '</span>';
    }
    function paintServices() {
      root.querySelectorAll('[data-bk-svc]').forEach(function (row) {
        var id = row.getAttribute('data-bk-svc');
        var on = bkSel.indexOf(id) > -1;
        row.classList.toggle('is-on', on);
        var btn = row.querySelector('[data-bk-toggle]');
        if (btn) {
          btn.classList.toggle('is-on', on);
          btn.setAttribute('aria-pressed', on);
          btn.innerHTML = on ? I.get('check') + 'Added' : I.get('plus') + 'Add';
        }
      });
    }

    var sel = root.querySelector('[data-bk-services]');
    sel.addEventListener('click', function (e) {
      var t = e.target.closest('[data-bk-toggle]');
      if (!t) return;
      var id = t.getAttribute('data-bk-toggle');
      var i = bkSel.indexOf(id);
      if (i > -1) bkSel.splice(i, 1); else bkSel.push(id);
      paintServices(); paintBar(); paintAvail();
    });

    var staff = root.querySelector('[data-bk-staff]');
    if (staff) {
      staff.addEventListener('click', function (e) {
        var t = e.target.closest('[data-bk-staff-chip]');
        if (!t) return;
        bkStaffId = t.getAttribute('data-bk-staff-chip') === 'any' ? null : t.getAttribute('data-bk-staff-chip');
        staff.querySelectorAll('[data-bk-staff-chip]').forEach(function (c) { c.classList.toggle('is-on', c === t); });
        paintAvail();
      });
    }

    root.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-bk-go]'))) { if (bkSel.length) navigate('/book'); return; }
      if ((t = e.target.closest('[data-bk-notify]'))) { e.preventDefault(); toast('We\u2019ll text you when a slot opens up.'); return; }
      if ((t = e.target.closest('[data-bk-open]'))) { e.preventDefault(); navigate('/p/' + t.getAttribute('data-bk-open')); return; }
    });

    paintBar(); paintAvail(); paintServices();
  }

  /* ---- View: #/book (4-step flow) ---- */
  function viewBookFlow() {
    if (!B.hasBooking(activeStore)) {
      return Promise.resolve(C.emptyState({ icon: 'clock', brand: true, title: 'No online bookings', text: 'This shop does not take appointments online yet.', action: { href: '#/', label: 'Back to shop' } }));
    }
    var html = '<div class="bkf" data-bkf></div>';
    return Promise.resolve(html).then(function () {
      setTimeout(function () { bkFlow = mountBookFlow(); }, 0);
      return html;
    });
  }

  function mountBookFlow() {
    var root = document.querySelector('[data-bkf]');
    if (!root) return null;

    var flow = {
      step: 1,
      sel: bkSel.slice(),
      staffId: bkStaffId,
      dateStr: null,
      timeKey: null,
      startHm: null,
      endHm: null,
      slotKey: null,
      cust: { name: '', phone: '', email: '', notes: '' },
      guests: 1,
      pay: (activeStore.settings.payments || []).indexOf('mpesa') > -1 ? 'mpesa' : 'pay_at_venue',
      deposit: 'deposit',
      confirmed: null,
      destroy: function () {
        if (!flow.confirmed && flow.slotKey) B.releaseHold(activeStore, flow.slotKey);
      }
    };

    var STEPS = ['Services', 'Date & time', 'Your details', 'Review & pay'];

    function money(n) { return C.money(n); }
    function selProducts() { return activeStore.products.filter(function (p) { return flow.sel.indexOf(p.id) > -1; }); }
    function total() { return selProducts().reduce(function (t, p) { return t + (p.price || 0); }, 0); }
    function dur() { return B.totalMinutes(activeStore, flow.sel); }
    function hasChoice() { return !!(flow.dateStr && flow.timeKey); }
    function slotStart() {
      var startMin = hmToMin(flow.timeKey);
      return { startHm: flow.timeKey, endHm: hmFromMin(startMin + dur()) };
    }
    function depositAmount() {
      var cfg = B.config(activeStore);
      var p = cfg && cfg.depositPercent ? cfg.depositPercent : 0;
      return Math.round(total() * p / 100);
    }

    function head() {
      var back = flow.step === 1 ? null : flow.step;
      return '<div class="bkf__head">' +
        '<button class="icon-btn bkf__back" data-bkf-back aria-label="Go back">' + I.get('chevronLeft') + '</button>' +
        '<div class="bkf__titlewrap"><span style="font-size:var(--fs-sm);color:var(--text-3)">Step ' + flow.step + ' of 4</span>' +
        '<h1 class="bkf__title">' + STEPS[flow.step - 1] + '</h1></div>' +
        '<div class="bkf__dots">' + STEPS.map(function (s, i) {
          return '<span class="bkf__dot' + (i + 1 <= flow.step ? ' is-on' : '') + '" aria-hidden="true"></span>';
        }).join('') + '</div>' +
      '</div>';
    }

    function bar(primary, disabled, line, action) {
      return '<div class="bkf__bar">' +
        '<div class="bkf__barline" data-bkf-line>' + C.esc(line) + '</div>' +
        '<button class="bkf__btn" data-bkf-action="' + action + '"' + (disabled ? ' disabled' : '') + '>' + I.get('check') + '<span>' + C.esc(primary) + '</span></button>' +
      '</div>';
    }

    function stepServices() {
      var html = '<div class="bkf__sec"><p class="bkf__label">Choose everything you want to book. Selected services are booked together as one appointment.</p>';
      var groups = {};
      activeStore.products.forEach(function (p) {
        if (p.type !== 'service') return;
        (groups[p.category] = groups[p.category] || []).push(p);
      });
      Object.keys(groups).forEach(function (cat) {
        var c = (activeStore.categories || []).find(function (x) { return x.id === cat; });
        html += '<h2 class="bk-sub">' + C.esc(c ? c.name : cat) + '</h2>';
        groups[cat].forEach(function (p) {
          var on = flow.sel.indexOf(p.id) > -1;
          html += '<div class="bsvc' + (on ? ' is-on' : '') + '" data-bk-svc="' + C.esc(p.id) + '">' +
            C.img(p.images && p.images[0], p.name, 'bsvc__img', {}) +
            '<div class="bsvc__main">' +
              '<button type="button" class="bsvc__name" data-bk-open="' + C.esc(p.id) + '">' + C.esc(p.name) + '</button>' +
              '<span class="bsvc__meta">' + C.esc(p.duration || fmtDur(p.durationMin)) + ' · ' + money(p.price) + '</span>' +
            '</div>' +
            '<button type="button" class="bsvc__book' + (on ? ' is-on' : '') + '" data-bkf-toggle="' + C.esc(p.id) + '" aria-pressed="' + on + '">' +
              (on ? I.get('check') + 'Added' : I.get('plus') + 'Add') +
            '</button>' +
          '</div>';
        });
      });
      return html + '</div>';
    }

    function stepDateTime() {
      var days = B.nextDays(14);
      var perDay = {};
      days.forEach(function (d) {
        var slots = B.slotsForDay(activeStore, flow.sel, flow.staffId, d.dayStr);
        perDay[d.dayStr] = slots.filter(function (s) { return s.available; });
      });
      if (!B.staffAllowed(activeStore, flow.sel, flow.staffId).length) {
        return '<div class="bkf__sec bkf__empty">' + I.get('alert') +
          '<span>These services are performed by different specialists, so they can\u2019t be booked together in one visit. Please pick services one team member can do together, or book a second appointment.</span></div>';
      }
      var html = '<div class="bkf__sec"><p class="bkf__label">' +
        (flow.sel.length + ' service' + (flow.sel.length > 1 ? 's' : '') + ' · ' + fmtDur(dur()) + '. Pick a day, then a slot.') +
        '</p>' +
        '<div class="bday">' + days.map(function (d) {
          var full = !perDay[d.dayStr] || !perDay[d.dayStr].length;
          return '<button type="button" class="bday__chip' + (flow.dateStr === d.dayStr ? ' is-on' : '') + '" data-bkf-day="' + d.dayStr + '"' + (full ? ' disabled' : '') + '>' +
            '<span class="bday__dow">' + C.esc(B.describeDay(d.dayStr)) + '</span>' +
            '<span class="bday__mon">' + C.esc(d.dow) + '</span>' +
            '<span class="bday__day">' + C.esc(d.dayStr.slice(8)) + '</span>' +
          '</button>';
        }).join('') + '</div>' +
      '</div>';

      if (!flow.dateStr) {
        html += '<div class="bkf__sec bkf__empty">' + I.get('calendar') + '<span>Pick a day above to see available slots.</span></div>';
      } else {
        var slots = B.slotsForDay(activeStore, flow.sel, flow.staffId, flow.dateStr);
        if (!slots.length) {
          html += '<div class="bkf__sec bkf__empty">' + I.get('alert') + '<span>No slots available that day. You can join the waitlist and we\u2019ll text you if something opens.</span>' +
            '<button type="button" class="btn btn--secondary btn--sm" data-bkf-notify>Join waitlist</button></div>';
        } else {
          html += '<div class="bkf__sec"><p class="bkf__label">' + C.esc(B.describeDay(flow.dateStr)) + '</p>' +
            '<div class="bslotg">' + slots.map(function (s) {
              return '<button type="button" class="bslotg__slot' + (flow.timeKey === s.key ? ' is-on' : '') + '" data-bkf-slot="' + s.key + '"' + (s.available ? '' : ' disabled') + '>' +
                C.esc(B.fmt12(hmToMin(s.key))) +
              '</button>';
            }).join('') + '</div></div>';
        }
      }
      return html;
    }

    function stepDetails() {
      return '<div class="bkf__sec">' +
        '<div class="bkf__secrow"><span class="bkf__label">Guests</span>' +
        '<div class="qty">' +
          '<button type="button" data-bkf-gdec aria-label="Fewer guests">' + I.get('minus') + '</button>' +
          '<span class="qty__value" data-bkf-guests>' + flow.guests + '</span>' +
          '<button type="button" data-bkf-ginc aria-label="More guests">' + I.get('plus') + '</button>' +
        '</div></div>' +
        '<div class="field" data-bkf-field="name"><label class="field__label" for="bkf-name">Full name</label>' +
          '<input class="input" id="bkf-name" autocomplete="name" placeholder="e.g. Wanjiku Mwangi" value="' + C.esc(flow.cust.name) + '">' +
          '<span class="field__error">Please enter your name.</span></div>' +
        '<div class="field" data-bkf-field="phone"><label class="field__label" for="bkf-phone">Phone number</label>' +
          '<input class="input" id="bkf-phone" inputmode="tel" autocomplete="tel" placeholder="07XX XXX XXX" value="' + C.esc(flow.cust.phone) + '">' +
          '<span class="field__error">Enter a valid Kenyan phone number.</span></div>' +
        '<div class="field"><label class="field__label" for="bkf-email">Email <span class="field__hint">(optional)</span></label>' +
          '<input class="input" id="bkf-email" type="email" autocomplete="email" placeholder="you@example.com" value="' + C.esc(flow.cust.email) + '"></div>' +
        '<div class="field"><label class="field__label" for="bkf-notes">Notes <span class="field__hint">(optional)</span></label>' +
          '<textarea class="textarea" id="bkf-notes" rows="3" placeholder="Any preferences or questions…">' + C.esc(flow.cust.notes) + '</textarea></div>' +
      '</div>';
    }

    function stepReview() {
      var html = '<div class="bkf__sec">';
      html += '<h2 class="bkf__label" style="font-size:var(--fs-md)">Your booking</h2>';
      selProducts().forEach(function (p) {
        html += '<div class="bksum"><span>' + C.esc(p.name) + '</span><span>' + money(p.price) + '</span></div>';
      });
      html += '<div class="bksum bksum--total"><span>' + C.esc(fmtDur(dur())) + '</span><span>' + money(total()) + '</span></div>';
      html += '<div class="spec-list">' +
        '<div class="spec-row"><dt>When</dt><dd>' + C.esc(B.formatTs(B.fromNairobi(flow.dateStr, flow.startHm))) + '</dd></div>' +
        '<div class="spec-row"><dt>Duration</dt><dd>' + C.esc(fmtDur(dur())) + '</dd></div>' +
        '<div class="spec-row"><dt>Specialist</dt><dd>' + C.esc(staffName()) + '</dd></div>' +
        (flow.guests > 1 ? '<div class="spec-row"><dt>Guests</dt><dd>' + flow.guests + '</dd></div>' : '') +
        '<div class="spec-row"><dt>Address</dt><dd>' + C.esc(activeStore.business.address || '') + '</dd></div>' +
      '</div>' + '</div>';

      html += '<div class="bkf__sec"><p class="bkf__label">Payment</p>';
      var methods = (activeStore.settings.payments || ['pay_at_venue']);
      methods.forEach(function (m) {
        html += '<label class="pay-option' + (flow.pay === m ? ' is-selected' : '') + '" data-bkf-pay="' + C.esc(m) + '">' +
          '<span class="pay-option__radio"></span><span class="pay-option__main">' +
          '<span class="pay-option__name">' + C.esc(B.paymentLabel(m)) + '</span>' +
          '<span class="pay-option__sub">' + (m === 'mpesa' ? 'Pay securely via STK push' : 'Pay when you arrive') + '</span></span></label>';
      });
      var dep = depositAmount();
      if (dep > 0) {
        html += '<div class="bkf__seg">' +
          '<button type="button" class="bkf__seg-op' + (flow.deposit === 'deposit' ? ' is-on' : '') + '" data-bkf-dep="deposit">Pay deposit<br><strong>' + money(dep) + '</strong></button>' +
          '<button type="button" class="bkf__seg-op' + (flow.deposit === 'full' ? ' is-on' : '') + '" data-bkf-dep="full">Pay now<br><strong>' + money(total()) + '</strong></button>' +
        '</div>';
      }
      html += '<p class="bkf__policy">' + I.get('info') + '<span>' + C.esc(B.config(activeStore).policy || 'Free cancellation up to 24h before.') + '</span></p>';
      html += '</div>';
      return html;
    }

    function staffName() {
      if (!flow.staffId) return 'Any available';
      var s = (B.config(activeStore).staff || []).find(function (x) { return x.id === flow.staffId; });
      return s ? s.name : 'Any available';
    }

    function confirmLabel() {
      var due = flow.deposit === 'deposit' ? depositAmount() : total();
      if (flow.pay === 'mpesa') return 'Confirm &amp; pay ' + money(due);
      return 'Confirm booking · ' + money(total());
    }

    function paint() {
      var body = '';
      var btnLabel, btnDisabled = false, btnAction, line;
      if (flow.step === 1) {
        body = stepServices();
        btnLabel = 'Continue';
        btnDisabled = !flow.sel.length;
        btnAction = 'next';
        line = flow.sel.length ? bkBarLine() : 'Pick at least one service';
      } else if (flow.step === 2) {
        body = stepDateTime();
        btnLabel = 'Continue';
        btnDisabled = !hasChoice();
        btnAction = 'next';
        line = hasChoice() ? C.esc(B.describeDay(flow.dateStr)) + ' · ' + C.esc(B.fmt12(hmToMin(flow.timeKey))) : 'Pick a day and time';
      } else if (flow.step === 3) {
        body = stepDetails();
        btnLabel = 'Continue';
        btnDisabled = false;
        btnAction = 'next';
        line = bkBarLine();
      } else if (flow.step === 4) {
        body = stepReview();
        btnLabel = confirmLabel();
        btnDisabled = false;
        btnAction = 'confirm';
        line = 'Your slot is held for 10 minutes';
      } else if (flow.step === 5 && flow.confirmed) {
        root.innerHTML = successHTML(flow.confirmed);
        return;
      }
      root.innerHTML = head() + '<div class="bkf__body">' + body + '</div>' + bar(btnLabel, btnDisabled, line, btnAction);
    }

    function successHTML(b) {
      var services = selProducts().map(function (p) { return p.name; }).join(', ');
      var summary = activeStore.business.name + ' — ' + services;
      var cal = B.calendarData(b.start, b.end, summary, activeStore.business.address || '');
      var share = 'Hi! I just booked ' + summary + ' on ' + B.formatTs(b.start) + ' (ref ' + b.reference + ') with ' + activeStore.business.name + '.';
      var wa = 'https://wa.me/' + (activeStore.business.whatsapp || '').replace(/[^\d]/g, '') + '?text=' + encodeURIComponent(share);
      var sms = 'sms:' + (activeStore.business.phone || '').replace(/[^\d]/g, '') + '?body=' + encodeURIComponent(share);
      return '<div class="bsuccess">' +
        '<div class="bsuccess__icon">' + I.get('checkCircle') + '</div>' +
        '<h1 class="bsuccess__title">You\u2019re booked!</h1>' +
        '<p class="bsuccess__sub">' + C.esc(services) + (flow.staffId ? ' with ' + C.esc(staffName()) : '') + '.<br>' +
          C.esc(B.formatTs(b.start)) + ' at ' + C.esc(activeStore.business.name) + '.</p>' +
        '<div class="receipt"><div class="spec-list">' +
          '<div class="spec-row"><dt>Reference</dt><dd>' + C.esc(b.reference) + '</dd></div>' +
          '<div class="spec-row"><dt>Status</dt><dd>' + (b.status === 'confirmed' ? 'Confirmed' : 'Pending confirmation') + '</dd></div>' +
          '<div class="spec-row"><dt>Payment</dt><dd>' + C.esc(B.paymentLabel(b.payment.method)) + (b.payment.status === 'paid' ? ' · paid' : '') + '</dd></div>' +
          '<div class="spec-row"><dt>Total</dt><dd>' + money(total()) + '</dd></div>' +
        '</div></div>' +
        '<p class="bkf__policy" style="justify-content:center">' + I.get('clock') + '<span>We\u2019ll text you a reminder 24h and 2h before your appointment.</span></p>' +
        '<div class="bsuccess__actions">' +
          '<a class="btn btn--primary" href="#/manage/' + C.esc(b.reference) + '">Manage booking</a>' +
          '<a class="btn btn--secondary" href="' + cal + '" download="' + C.esc(b.reference) + '.ics">Add to calendar</a>' +
          '<a class="btn btn--secondary" href="' + wa + '" target="_blank" rel="noopener">Share on WhatsApp</a>' +
          '<a class="btn btn--secondary" href="' + sms + '">Send SMS</a>' +
          '<a class="btn btn--ghost" href="#/booking">Done</a>' +
        '</div>' +
      '</div>';
    }

    function validateDetails() {
      var ok = true;
      function set(role, has) {
        var f = root.querySelector('[data-bkf-field="' + role + '"]');
        if (f) f.classList.toggle('has-error', has);
        return !has;
      }
      ok = set('name', flow.cust.name.trim().length < 2) && ok;
      ok = set('phone', !/^(?:\+?254|0)[17]\d{8}$/.test(flow.cust.phone.replace(/\s+/g, ''))) && ok;
      return ok;
    }

    function clearErrors() {
      root.querySelectorAll('[data-bkf-field]').forEach(function (f) { f.classList.remove('has-error'); });
    }

    var confirming = false;
    function confirm() {
      if (confirming) return;
      confirming = true;
      var btn = root.querySelector('[data-bkf-action="confirm"]');
      if (btn) { btn.disabled = true; btn.innerHTML = I.get('refresh') + '<span>Confirming…</span>'; }
      setTimeout(function () {
        var booking = B.saveBooking(activeStore, {
          serviceIds: flow.sel.slice(),
          staffId: flow.staffId,
          start: B.fromNairobi(flow.dateStr, flow.startHm),
          end: B.fromNairobi(flow.dateStr, flow.endHm),
          customer: { name: flow.cust.name.trim(), phone: flow.cust.phone.trim(), email: flow.cust.email.trim() },
          notes: flow.cust.notes.trim(),
          payment: {
            method: flow.pay,
            status: flow.pay === 'mpesa'
              ? (flow.deposit === 'full' ? 'paid' : 'deposit')
              : 'due'
          }
        });
        if (booking.status && booking.status === 'confirmed') { /* kept for parity */ }
        B.releaseHold(activeStore, flow.slotKey);
        flow.confirmed = booking;
        flow.step = 5;
        paint();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (flow.pay === 'mpesa') toast('An M-Pesa prompt was sent to ' + flow.cust.phone + '.');
      }, 900);
    }

    function advance() {
      if (flow.step === 1) {
        if (!flow.sel.length) return;
        flow.step = 2;
      } else if (flow.step === 2) {
        if (!hasChoice()) return;
        var slot = slotStart();
        flow.startHm = slot.startHm;
        flow.endHm = slot.endHm;
        flow.slotKey = flow.dateStr + '|' + flow.startHm + '|' + flow.endHm;
        B.claimHold(activeStore, flow.slotKey);
        flow.step = 3;
      } else if (flow.step === 3) {
        flow.cust.name = value('[id="bkf-name"]');
        flow.cust.phone = value('[id="bkf-phone"]');
        flow.cust.email = value('[id="bkf-email"]');
        flow.cust.notes = value('[id="bkf-notes"]');
        clearErrors();
        if (!validateDetails()) {
          var first = root.querySelector('.has-error .input');
          if (first) first.focus();
          toast('Please check the highlighted fields.', true);
          return;
        }
        flow.step = 4;
      }
      paint();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function value(sel) {
      var n = root.querySelector(sel);
      return n ? n.value : '';
    }
    function back() {
      if (flow.step === 1) { navigate('/booking'); return; }
      if (flow.step === 4) { flow.step = 3; }
      else if (flow.step === 3) { flow.step = 2; }
      else if (flow.step === 2) { flow.step = 1; }
      paint();
    }

    root.addEventListener('click', function (e) {
      var t;
      if (e.target.closest('[data-bkf-back]')) { back(); return; }
      if ((t = e.target.closest('[data-bkf-day]'))) {
        if (t.disabled) return;
        var day = t.getAttribute('data-bkf-day');
        if (flow.dateStr !== day) { flow.dateStr = day; flow.timeKey = null; paint(); }
        return;
      }
      if ((t = e.target.closest('[data-bkf-toggle]'))) {
        var id = t.getAttribute('data-bkf-toggle');
        var i = flow.sel.indexOf(id);
        if (i > -1) flow.sel.splice(i, 1); else flow.sel.push(id);
        if (flow.step === 1) { paint(); return; }
        return;
      }
      if ((t = e.target.closest('[data-bkf-slot]'))) {
        if (t.disabled) return;
        flow.timeKey = t.getAttribute('data-bkf-slot');
        paint();
        return;
      }
      if (e.target.closest('[data-bkf-gdec]')) { flow.guests = Math.max(1, flow.guests - 1); paint(); return; }
      if (e.target.closest('[data-bkf-ginc]')) { flow.guests = Math.max(1, Math.min(16, flow.guests + 1)); paint(); return; }
      if ((t = e.target.closest('[data-bkf-pay]'))) {
        flow.pay = t.getAttribute('data-bkf-pay');
        if (t.classList.contains('is-selected')) { /* noop */ }
        flow.guests = flow.guests;
        paint();
        return;
      }
      if ((t = e.target.closest('[data-bkf-dep]'))) { flow.deposit = t.getAttribute('data-bkf-dep'); paint(); return; }
      if ((t = e.target.closest('[data-bkf-action]'))) {
        if (t.disabled) return;
        if (t.getAttribute('data-bkf-action') === 'confirm') { confirm(); return; }
        advance();
        return;
      }
      if ((t = e.target.closest('[data-bkf-notify]'))) { toast('We\u2019ll text you when a slot opens up.'); return; }
      if ((t = e.target.closest('[data-bk-open]'))) { navigate('/p/' + t.getAttribute('data-bk-open')); return; }
    });

    root.addEventListener('input', function (e) {
      if (e.target.matches('[id="bkf-name"]')) flow.cust.name = e.target.value;
      if (e.target.matches('[id="bkf-phone"]')) flow.cust.phone = e.target.value;
      if (e.target.matches('[id="bkf-email"]')) flow.cust.email = e.target.value;
      if (e.target.matches('[id="bkf-notes"]')) flow.cust.notes = e.target.value;
    });

    paint();
    return flow;
  }

  /* ---- View: #/manage/:ref ---- */
  function viewManage(ref) {
    if (!B.hasBooking(activeStore)) return Promise.resolve(C.emptyState({ icon: 'clock', brand: true, title: 'No online bookings', text: 'This shop does not take appointments online yet.', action: { href: '#/', label: 'Back to shop' } }));
    if (!ref) return Promise.resolve(C.emptyState({ icon: 'search', brand: true, title: 'Booking not found', text: 'Use the link from your confirmation message.', action: { href: '#/booking', label: 'Book an appointment' } }));
    var html = '<div class="bkm" data-bkm></div>';
    return Promise.resolve(html).then(function () {
      setTimeout(function () { mountManage(ref); }, 0);
      return html;
    });
  }

  function mountManage(ref) {
    var root = document.querySelector('[data-bkm]');
    if (!root) return;
    var booking = B.getBooking(activeStore, ref);
    if (!booking) {
      root.innerHTML = C.emptyState({ icon: 'search', brand: true, title: 'Booking not found', text: 'This reference does not exist or was removed.', action: { href: '#/booking', label: 'Book an appointment' } });
      return;
    }

    function servicesHTML(b) {
      return (b.serviceIds || []).map(function (id) {
        var p = activeStore.products.find(function (x) { return x.id === id; });
        return p ? '<div class="bksum"><span>' + C.esc(p.name) + '</span><span>' + C.money(p.price) + '</span></div>' : '';
      }).join('');
    }

    function statusChip(st) {
      var cls = st === 'confirmed' ? 'chip--open' : (st === 'cancelled' ? 'chip--closed' : (st === 'pending' ? 'chip--pending' : 'chip--muted'));
      var map = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show' };
      return '<span class="chip ' + cls + '">' + C.esc(map[st] || st) + '</span>';
    }

    function render() {
      var cancelled = booking.status === 'cancelled' || booking.status === 'no_show' || booking.status === 'completed';
      var html = '<h1 class="bkf__title" style="font-size:var(--fs-2xl);margin-bottom:var(--sp-2)">Manage booking</h1>' +
        '<p class="bkf__label" style="margin-bottom:var(--sp-5)">No login needed — use this link anytime or save it in your calendar.</p>' +
        '<div class="panel">' +
          '<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:var(--sp-2)">' +
            '<span style="font-weight:var(--fw-bold)">' + C.esc(booking.reference) + '</span>' + statusChip(booking.status) +
          '</div>' +
          '<div class="spec-list" style="margin-top:var(--sp-4)">' +
            '<div class="spec-row"><dt>When</dt><dd>' + C.esc(B.formatTs(booking.start)) + '</dd></div>' +
            '<div class="spec-row"><dt>Duration</dt><dd>' + C.esc(fmtDur((booking.end - booking.start) / 60000)) + '</dd></div>' +
            '<div class="spec-row"><dt>Name</dt><dd>' + C.esc(booking.customer.name || '') + '</dd></div>' +
            '<div class="spec-row"><dt>Phone</dt><dd>' + C.esc(booking.customer.phone || '') + '</dd></div>' +
            (booking.customer.email ? '<div class="spec-row"><dt>Email</dt><dd>' + C.esc(booking.customer.email) + '</dd></div>' : '') +
          '</div>' +
          '<div style="margin-top:var(--sp-4)">' + servicesHTML(booking) + '</div>' +
        '</div>' +
        '<div class="row" style="gap:var(--sp-3);margin-top:var(--sp-5);flex-wrap:wrap">' +
          '<a class="btn btn--primary" href="' + B.calendarData(booking.start, booking.end, 'Appointment at ' + activeStore.business.name, activeStore.business.address || '') + '" download="' + C.esc(booking.reference) + '.ics">Add to calendar</a>' +
          '<a class="btn btn--secondary" href="#/booking">Book something else</a>' +
          (cancelled ? '' : '<button class="btn btn--danger" data-bkm-cancel>Cancel booking</button>') +
        '</div>' +
        (cancelled ? '' : '<div class="panel" style="margin-top:var(--sp-5)">' +
          '<h3 class="panel__title">Reschedule</h3>' +
          '<p class="bkf__label">Pick a new day and time. Your current slot stays yours until you confirm the new one.</p>' +
          '<div id="bkm-resched"></div>' +
        '</div>');
      root.innerHTML = html;
      if (!cancelled) mountReschedule();
    }

    function mountReschedule() {
      var holder = root.querySelector('#bkm-resched');
      if (!holder) return;
      var ids = booking.serviceIds || [];
      var days = B.nextDays(14);
      var state = { day: null, time: null };

      function paint() {
        var dayRow = '<div class="bday">' + days.map(function (d) {
          var slots = B.slotsForDay(activeStore, ids, booking.staffId, d.dayStr);
          var full = !slots.some(function (s) { return s.available; });
          return '<button type="button" class="bday__chip' + (state.day === d.dayStr ? ' is-on' : '') + '" data-rs-day="' + d.dayStr + '"' + (full ? ' disabled' : '') + '>' +
            '<span class="bday__dow">' + C.esc(B.describeDay(d.dayStr)) + '</span>' +
            '<span class="bday__mon">' + C.esc(d.dow) + '</span>' +
            '<span class="bday__day">' + C.esc(d.dayStr.slice(8)) + '</span>' +
          '</button>';
        }).join('') + '</div>';
        var slotRow = '';
        if (state.day) {
          var slots = B.slotsForDay(activeStore, ids, booking.staffId, state.day);
          if (!slots.length) slotRow = '<div class="bkf__empty">' + I.get('alert') + '<span>No slots available that day.</span></div>';
          else slotRow = '<div class="bslotg">' + slots.map(function (s) {
            return '<button type="button" class="bslotg__slot' + (state.time === s.key ? ' is-on' : '') + '" data-rs-slot="' + s.key + '"' + (s.available ? '' : ' disabled') + '>' + C.esc(B.fmt12(hmToMin(s.key))) + '</button>';
          }).join('') + '</div>';
        }
        var apply = state.day && state.time
          ? '<button class="btn btn--primary btn--block" data-rs-apply>Confirm new time</button>' : '';
        holder.innerHTML = '<div style="display:grid;gap:var(--sp-5)">' + dayRow + slotRow + apply + '</div>';
      }
      holder.addEventListener('click', function (e) {
        var t;
        if ((t = e.target.closest('[data-rs-day]'))) { if (t.disabled) return; state.day = t.getAttribute('data-rs-day'); state.time = null; paint(); return; }
        if ((t = e.target.closest('[data-rs-slot]'))) { if (t.disabled) return; state.time = t.getAttribute('data-rs-slot'); paint(); return; }
        if ((t = e.target.closest('[data-rs-apply]'))) {
          var startMin = hmToMin(state.time);
          var total = B.totalMinutes(activeStore, ids);
          booking.start = B.fromNairobi(state.day, state.time);
          booking.end = B.fromNairobi(state.day, hmFromMin(startMin + total));
          booking.status = 'pending';
          var list = B.bookings(activeStore);
          var i = list.findIndex(function (x) { return x.reference === booking.reference; });
          if (i > -1) list[i] = booking;
          B.forceSave(activeStore, list);
          toast('Booking rescheduled.');
          render();
        }
      });
      paint();
    }

    root.addEventListener('click', function (e) {
      if (!e.target.closest('[data-bkm-cancel]')) return;
      if (!confirm('Cancel this booking?')) return;
      B.setStatus(activeStore, booking.reference, 'cancelled');
      toast('Booking cancelled.');
      render();
    });

    render();
  }

  /* ---- View: #/owner (business dashboard) ---- */
  function viewOwner() {
    if (!B.hasBooking(activeStore)) {
      return Promise.resolve(C.emptyState({ icon: 'lock', brand: true, title: 'Owner dashboard', text: 'Online bookings are not enabled for this shop.', action: { href: '#/', label: 'Back to shop' } }));
    }
    var html = '<div class="bko" data-bko></div>';
    return Promise.resolve(html).then(function () {
      setTimeout(mountOwner, 0);
      return html;
    });
  }

  function mountOwner() {
    var root = document.querySelector('[data-bko]');
    if (!root) return;
    var cfg = B.config(activeStore);

    function statusChip(st) {
      var cls = st === 'confirmed' ? 'chip--open' : (st === 'cancelled' ? 'chip--closed' : (st === 'pending' ? 'chip--pending' : 'chip--muted'));
      var map = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show' };
      return '<span class="chip ' + cls + '">' + C.esc(map[st] || st) + '</span>';
    }

    function render() {
      var list = B.bookings(activeStore).slice().sort(function (a, b) { return b.start - a.start; });
      var html = '<h1 class="bkf__title" style="font-size:var(--fs-2xl);margin-bottom:var(--sp-5)">Owner dashboard</h1>' +
        '<div class="bkf__sec" style="margin:0"><h2 class="bk-title" style="margin:0">Blocked dates</h2>' +
          '<p class="bkf__label">No slots are offered on blocked dates.</p>' +
          '<div class="bko__chips" data-bko-blocked></div>' +
          '<div class="row" style="gap:var(--sp-2);margin-top:var(--sp-2)">' +
            '<input class="input" type="date" data-bko-block-input aria-label="Block a date">' +
            '<button class="btn btn--secondary" data-bko-block-add>Block</button>' +
          '</div>' +
        '</div>' +
        '<div class="bkf__sec"><h2 class="bk-title" style="margin:0">Staff hours</h2>' +
          '<p class="bkf__label">Override default working hours per staff member.</p>' +
          (cfg.staff || []).map(function (st, idx) {
            return '<details class="acc" data-bko-hours="' + C.esc(st.id) + '">' +
              '<summary class="acc__head">' + C.esc(st.name) + ' <span class="acc__icon">' + I.get('chevronDown') + '</span></summary>' +
              '<div class="acc__body">' + staffWeek(st.id) + '</div>' +
            '</details>';
          }).join('') +
        '</div>' +
        '<div class="bkf__sec" style="margin:0"><h2 class="bk-title" style="margin:0">Bookings · ' + list.length + '</h2>' +
          (list.length ? list.map(function (b) {
            var names = (b.serviceIds || []).map(function (id) {
              var p = activeStore.products.find(function (x) { return x.id === id; });
              return p ? p.name : id;
            }).join(', ');
            var total = (b.serviceIds || []).reduce(function (t, id) {
              var p = activeStore.products.find(function (x) { return x.id === id; });
              return t + (p ? p.price || 0 : 0);
            }, 0);
            var done = b.status === 'completed' || b.status === 'cancelled' || b.status === 'no_show';
            return '<div class="bko__card">' +
              '<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:var(--sp-2)">' +
                '<strong>' + C.esc(names) + '</strong>' + statusChip(b.status) +
              '</div>' +
              '<div class="spec-list" style="margin-top:var(--sp-3)">' +
                '<div class="spec-row"><dt>When</dt><dd>' + C.esc(B.formatTs(b.start)) + '</dd></div>' +
                '<div class="spec-row"><dt>Customer</dt><dd>' + C.esc(b.customer.name || '') + ' · ' + C.esc(b.customer.phone || '') + '</dd></div>' +
                '<div class="spec-row"><dt>Ref</dt><dd>' + C.esc(b.reference) + '</dd></div>' +
                '<div class="spec-row"><dt>Amount</dt><dd>' + C.money(total) + ' · ' + C.esc(B.paymentLabel(b.payment.method)) + '</dd></div>' +
              '</div>' +
              '<div class="bko__actions" data-bko-actions="' + C.esc(b.reference) + '">' +
                (b.status === 'pending' ? '<button class="btn btn--primary btn--sm" data-bko-set="confirmed">Confirm</button><button class="btn btn--danger btn--sm" data-bko-set="cancelled">Decline</button>' : '') +
                (b.status === 'confirmed' ? '<button class="btn btn--primary btn--sm" data-bko-set="completed">Completed</button><button class="btn btn--secondary btn--sm" data-bko-set="no_show">No-show</button>' : '') +
                (done ? '' : '<button class="btn btn--ghost btn--sm" data-bko-set="cancelled">Cancel</button>') +
                '<button class="action-link" data-bko-del title="Remove">' + I.get('trash') + '</button>' +
              '</div>' +
            '</div>';
          }).join('') : '<div class="bkf__empty">' + I.get('clock') + '<span>No bookings yet. Share <a href="#/booking">your booking page</a> to get started.</span></div>') +
        '</div>';

      root.innerHTML = html;
      paintBlocked();
      bindOwner(root);
    }

    function staffWeek(staffId) {
      var st = cfg.staff.find(function (x) { return x.id === staffId; });
      var edited = B.staffing(activeStore)[staffId] || st.workingHours || {};
      var names = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
      return '<div data-bko-week="' + C.esc(staffId) + '">' +
        Object.keys(names).map(function (d) {
          var iv = (edited[d] || [])[0];
          var off = !iv;
          return '<div class="bko__day' + (off ? ' is-off' : '') + '" data-bko-day="' + d + '">' +
            '<span class="bko__dayname">' + names[d] + '</span>' +
            '<input class="input" type="time" data-bko-s value="' + (iv ? iv[0] : '') + '"' + (off ? ' disabled' : '') + '>' +
            '<input class="input" type="time" data-bko-e value="' + (iv ? iv[1] : '') + '"' + (off ? ' disabled' : '') + '>' +
            '<label class="bko__off"><input type="checkbox" data-bko-off' + (off ? ' checked' : '') + '> Off</label>' +
          '</div>';
        }).join('') +
        '<button class="btn btn--secondary btn--sm" data-bko-save>Save hours</button>' +
      '</div>';
    }

    function paintBlocked() {
      var holder = root.querySelector('[data-bko-blocked]');
      if (!holder) return;
      var list = B.blockedDates(activeStore);
      holder.innerHTML = list.length ? list.map(function (d) {
        return '<span class="bko__chip">' + C.esc(d) + '<button data-bko-unblock="' + C.esc(d) + '" aria-label="Remove">' + I.get('close') + '</button></span>';
      }).join('') : '<span class="bkf__label" style="margin:0">None — all normal opening days are bookable.</span>';
    }

    function bindOwner(node) {
      node.addEventListener('click', function (e) {
        var t;
        if ((t = e.target.closest('[data-bko-set]'))) {
          var ref = t.closest('[data-bko-actions]') ? t.closest('[data-bko-actions]').getAttribute('data-bko-actions') : '';
          B.setStatus(activeStore, ref, t.getAttribute('data-bko-set'));
          toast('Booking updated.');
          render();
          return;
        }
        if ((t = e.target.closest('[data-bko-del]'))) {
          var ref = t.closest('[data-bko-actions]').getAttribute('data-bko-actions');
          if (!confirm('Delete booking ' + ref + '?')) return;
          B.removeBooking(activeStore, ref);
          render();
          return;
        }
        if ((t = e.target.closest('[data-bko-unblock]'))) {
          B.toggleBlock(activeStore, t.getAttribute('data-bko-unblock'));
          render();
          return;
        }
        if ((t = e.target.closest('[data-bko-block-add]'))) {
          var inp = node.querySelector('[data-bko-block-input]');
          if (!inp || !inp.value) { toast('Pick a date to block.', true); return; }
          B.toggleBlock(activeStore, inp.value);
          render();
          return;
        }
        if ((t = e.target.closest('[data-bko-off]'))) {
          var row = t.closest('[data-bko-day]');
          row.classList.toggle('is-off', t.checked);
          row.querySelectorAll('[data-bko-s], [data-bko-e]').forEach(function (i) { i.disabled = t.checked; });
          return;
        }
        if ((t = e.target.closest('[data-bko-save]'))) {
          var weekEl = t.closest('[data-bko-week]');
          var staffId = weekEl.getAttribute('data-bko-week');
          var week = {};
          weekEl.querySelectorAll('[data-bko-day]').forEach(function (row) {
            var d = row.getAttribute('data-bko-day');
            var off = row.querySelector('[data-bko-off]').checked;
            var s = row.querySelector('[data-bko-s]').value, e = row.querySelector('[data-bko-e]').value;
            if (off || !s || !e) week[d] = [];
            else week[d] = [[s, e]];
          });
          B.setStaffWeek(activeStore, staffId, week);
          toast('Hours saved for ' + staffId + '.');
          render();
          return;
        }
      });
    }

    render();
  }

  /* ============================================================
     Image fallback
     ============================================================ */
  function bindImageFallbacks() {
    document.addEventListener('error', function (e) {
      var img = e.target;
      if (img.tagName !== 'IMG' || img.dataset.fbApplied) return;
      img.dataset.fbApplied = '1';
      var label = (img.alt || 'A').trim().charAt(0).toUpperCase() || 'A';
      img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#eef2f6"/>' +
        '<text x="50%" y="52%" font-family="Plus Jakarta Sans, Arial" font-size="120" font-weight="700" fill="#b7c2cd" text-anchor="middle" dominant-baseline="middle">' + label + '</text></svg>');
    }, true);
  }

  function bindSearchPage() {
    document.addEventListener('submit', function (e) {
      var form = e.target.closest('[data-search-page-form]');
      if (!form) return;
      e.preventDefault();
      var q = form.querySelector('[data-search-page-input]').value.trim();
      navigate('/search' + (q ? '?q=' + encodeURIComponent(q) : ''));
    });
  }

  /* ============================================================
     Init
     ============================================================ */
  function init(root) {
    mount(root);
    bindImageFallbacks();
    bindSearchPage();

    API.use(resolveSlug()).then(function (store) {
      activeStore = store;
      try { localStorage.setItem('aqivo.lastShop', store.slug); } catch (e) {}
      S.configure(store);
      document.title = store.name + ' — Order online';
      paintBranding();
      S.subscribe(function () { renderCart(); });
      window.addEventListener('hashchange', onRouteChange);
      if (!location.hash) location.hash = '#/';
      render();
    }).catch(function (err) {
      els.view.innerHTML = C.errorState(err && err.message);
    });
  }

  return { init: init, navigate: navigate, toast: toast };
})();
