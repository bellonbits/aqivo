/* ============================================================
   Aqivo Components
   Pure functions returning HTML strings. No data fetching.
   ============================================================ */

window.AqivoComponents = (function () {
  'use strict';

  var I = window.AqivoIcons;
  var S = window.AqivoStore;

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function money(n) { return S.formatMoney(n); }

  function img(src, alt, cls, opts) {
    opts = opts || {};
    var lazy = opts.eager ? 'eager' : 'lazy';
    return '<img class="' + cls + '" src="' + esc(src) + '" alt="' + esc(alt) + '" loading="' + lazy +
      '" decoding="async" referrerpolicy="no-referrer">';
  }

  function stars(rating) {
    if (rating == null) return '';
    return '<span class="rating">' + I.get('star') + '<strong>' + Number(rating).toFixed(1) + '</strong></span>';
  }

  /* ---- Category ---- */
  function categoryChip(cat, active) {
    return '<a class="navlink' + (active ? ' is-active' : '') + '" data-cat-chip="' + esc(cat.id) + '" href="#/c/' + esc(cat.id) + '">' +
      esc(cat.name) + '</a>';
  }

  function categoryCard(cat) {
    return '<a class="cat-card" href="#/c/' + esc(cat.id) + '" aria-label="' + esc(cat.name) + '">' +
      '<span class="cat-card__icon">' + I.get(cat.icon || 'grid') + '</span>' +
      '<span class="cat-card__label">' + esc(cat.name) + '</span>' +
    '</a>';
  }

  /* ---- Product card ---- */
  function productCard(product) {
    var out = product.available === false;
    var image = (product.images && product.images[0]) || '';
    var badge = product.badge || product.tag || null;
    var inCart = 0;
    S.getCart().forEach(function (i) { if (i.productId === product.id) inCart += i.qty; });

    var cta;
    if (out) {
      cta = '<span class="pcard__stock">Out of stock</span>';
    } else if (inCart > 0) {
      cta = '<button class="pcard__qty" data-card-qty="' + esc(product.id) + '" data-open-cart aria-label="' + inCart + ' items in cart">' + inCart + '</button>';
    } else {
      cta = '<button class="pcard__add" data-add="' + esc(product.id) + '" aria-label="Add ' + esc(product.name) + ' to cart">' + I.get('plus') + '</button>';
    }

    return '' +
      '<div class="pcard" data-open-product="' + esc(product.id) + '" data-avail="' + (out ? '0' : '1') + '">' +
        '<div class="pcard__media">' +
          '<a class="pcard__img-link" href="#/p/' + esc(product.id) + '" tabindex="-1" aria-hidden="true">' +
            img(image, product.name, 'pcard__img') +
          '</a>' +
          (badge ? '<span class="pcard__badge">' + esc(badge) + '</span>' : '') +
          cta +
        '</div>' +
        '<p class="pcard__price">' + money(product.price) + '</p>' +
        '<p class="pcard__name">' + esc(product.name) + '</p>' +
      '</div>';
  }

  /* Horizontal row of product cards (used by the grouped storefront) */
  function productRow(products) {
    return '<div class="pcard-row">' + products.map(productCard).join('') + '</div>';
  }

  function productGrid(products) {
    if (!products.length) return productEmpty();
    return '<div class="grid grid--products">' + products.map(productCard).join('') + '</div>';
  }

  function productEmpty(message) {
    return '' +
      '<div class="state state--compact">' +
        '<span class="state__icon">' + I.get('bag') + '</span>' +
        '<h3 class="state__title">No products yet</h3>' +
        '<p class="state__text">' + esc(message || 'This shop has not published any products. Please check back soon.') + '</p>' +
      '</div>';
  }

  /* ---- Section heading ---- */
  function sectionHead(title, sub, link) {
    return '' +
      '<div class="section-head">' +
        '<div><h2 class="section-head__title">' + esc(title) + '</h2>' +
        (sub ? '<span class="section-head__sub">' + esc(sub) + '</span>' : '') + '</div>' +
        (link ? '<a class="section-head__link" href="' + esc(link.href) + '">' + esc(link.label) + I.get('chevronRight') + '</a>' : '') +
      '</div>';
  }

  /* ---- Skeletons ---- */
  function skeletonGrid(count, type) {
    var items = '';
    for (var i = 0; i < count; i++) {
      items += '<div class="skel-card"><div class="skel skel-card__media"></div>' +
        '<div class="skel-card__body"><div class="skel skel-line skel-line--80"></div>' +
        '<div class="skel skel-line skel-line--40"></div></div></div>';
    }
    return '<div class="grid grid--' + (type || 'products') + '">' + items + '</div>';
  }

  /* ---- Error / empty ---- */
  function errorState(message) {
    return '' +
      '<div class="state">' +
        '<span class="state__icon state__icon--error">' + I.get('alert') + '</span>' +
        '<h3 class="state__title">Something went wrong</h3>' +
        '<p class="state__text">' + esc(message || 'We could not load this content. Please try again.') + '</p>' +
        '<button class="btn btn--secondary" data-retry>' + I.get('refresh') + 'Retry</button>' +
      '</div>';
  }

  function emptyState(opts) {
    opts = opts || {};
    return '' +
      '<div class="state">' +
        '<span class="state__icon' + (opts.brand ? ' state__icon--brand' : '') + '">' + I.get(opts.icon || 'search') + '</span>' +
        '<h3 class="state__title">' + esc(opts.title || 'Nothing here yet') + '</h3>' +
        '<p class="state__text">' + esc(opts.text || '') + '</p>' +
        (opts.action ? '<a class="btn btn--primary" href="' + esc(opts.action.href) + '">' + esc(opts.action.label) + '</a>' : '') +
      '</div>';
  }

  /* ---- Search result row (products only) ---- */
  function searchProductRow(product) {
    return '' +
      '<a class="search__row" href="#/p/' + esc(product.id) + '" data-close-search>' +
        img((product.images && product.images[0]) || '', product.name, '', {}) +
        '<span class="search__row-main">' +
          '<span class="search__row-title">' + esc(product.name) + '</span>' +
          '<span class="search__row-sub">' + esc(String(product.specs && product.specs[0] ? product.specs[0].value : 'In this shop')) + '</span>' +
        '</span>' +
        '<span class="search__row-price">' + money(product.price) + '</span>' +
      '</a>';
  }

  /* ---- Quantity stepper ---- */
  function qtyControl(key, qty, small) {
    return '<div class="qty' + (small ? ' qty--sm' : '') + '">' +
      '<button data-qty-dec="' + esc(key) + '" aria-label="Decrease quantity">' + I.get('minus') + '</button>' +
      '<span class="qty__value" aria-live="polite">' + qty + '</span>' +
      '<button data-qty-inc="' + esc(key) + '" aria-label="Increase quantity">' + I.get('plus') + '</button>' +
    '</div>';
  }

  /* ---- Cart line item ---- */
  function lineItem(item) {
    var variantText = Object.keys(item.variant || {}).map(function (k) { return item.variant[k]; }).join(' · ');
    return '<div class="line-item">' +
      img(item.image, item.name, 'line-item__img') +
      '<div class="line-item__main">' +
        '<a class="line-item__name" href="#/p/' + esc(item.productId) + '">' + esc(item.name) + '</a>' +
        (variantText ? '<span class="line-item__variant">' + esc(variantText) + '</span>' : '') +
        '<div class="line-item__foot">' +
          qtyControl(item.key, item.qty, true) +
          '<span class="line-item__price">' + money(item.price * item.qty) + '</span>' +
        '</div>' +
        '<button class="line-item__remove" data-line-remove="' + esc(item.key) + '">' + I.get('trash') + ' Remove</button>' +
      '</div>' +
    '</div>';
  }

  return {
    esc: esc, money: money, img: img, stars: stars,
    sectionHead: sectionHead,
    categoryChip: categoryChip, categoryCard: categoryCard,
    productCard: productCard, productRow: productRow, productGrid: productGrid, productEmpty: productEmpty,
    searchProductRow: searchProductRow,
    qtyControl: qtyControl, lineItem: lineItem,
    skeletonGrid: skeletonGrid, errorState: errorState, emptyState: emptyState
  };
})();
