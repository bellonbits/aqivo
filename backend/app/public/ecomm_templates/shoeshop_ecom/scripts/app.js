/**
 * FootWear - Main Application Controller
 * Handles UI rendering, interactions, wishlist toggling, and toasts.
 */

class FootWearApp {
  constructor() {
    this.wishlist = this.loadWishlist();
    this.visibleCatalogLimit = 12;
    this.init();
  }

  loadWishlist() {
    try {
      const saved = localStorage.getItem('footwear_wishlist_items');
      return saved ? JSON.parse(saved) : ['prod-cortez', 'prod-airmax1prem', 'deal-3'];
    } catch (e) {
      return ['prod-cortez', 'prod-airmax1prem', 'deal-3'];
    }
  }

  saveWishlist() {
    try {
      localStorage.setItem('footwear_wishlist_items', JSON.stringify(this.wishlist));
    } catch (e) {}
  }

  init() {
    this.renderBestDeals();
    this.renderCatalog();
    this.renderBrandStores();
    this.bindEvents();
    this.updateWishlistCount();
  }

  bindEvents() {
    // Best Deals Horizontal Scroll Buttons
    const prevBtn = document.getElementById('deals-scroll-prev');
    const nextBtn = document.getElementById('deals-scroll-next');
    const rail = document.getElementById('deals-scroll-rail');

    if (prevBtn && rail) {
      prevBtn.addEventListener('click', () => {
        rail.scrollBy({ left: -320, behavior: 'smooth' });
      });
    }

    if (nextBtn && rail) {
      nextBtn.addEventListener('click', () => {
        rail.scrollBy({ left: 320, behavior: 'smooth' });
      });
    }

    // Wishlist header button trigger
    const wishlistTriggers = document.querySelectorAll('.trigger-wishlist-view');
    wishlistTriggers.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openWishlistDrawer();
      });
    });

    // Newsletter subscription form
    const newsForm = document.getElementById('footer-newsletter-form');
    if (newsForm) {
      newsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('footer-email-input');
        if (input && input.value) {
          this.showToast('Subscribed!', `Exclusive promo code sent to ${input.value}.`, 'success');
          input.value = '';
        }
      });
    }

    // "View more" catalog button
    const viewMoreBtn = document.getElementById('catalog-view-more-btn');
    if (viewMoreBtn) {
      viewMoreBtn.addEventListener('click', () => {
        this.showToast('All Drops Loaded', 'You are viewing all curated sneakers for today.', 'info');
      });
    }
  }

  renderBestDeals() {
    const rail = document.getElementById('deals-scroll-rail');
    if (!rail || !window.BEST_DEALS) return;

    rail.innerHTML = window.BEST_DEALS.map(item => {
      const isFav = this.wishlist.includes(item.id);
      return `
        <div class="deal-card" data-id="${item.id}">
          <div class="deal-card-top">
            <button type="button" class="wishlist-heart-btn ${isFav ? 'is-active' : ''}" 
              onclick="window.app.toggleWishlist('${item.id}', this, event)" title="Save to wishlist">
              ${isFav ? window.ICONS.heartFilled : window.ICONS.heartOutline}
            </button>
          </div>
          <div class="deal-card-img-wrap" onclick="window.modals.openProductModal('${item.id}')">
            <img src="${item.image}" alt="${item.name}" loading="lazy" />
          </div>
          <div class="deal-card-body" onclick="window.modals.openProductModal('${item.id}')">
            <h4 class="deal-card-title">${item.name}</h4>
            <div class="deal-card-rating-row">
              <span class="rating-star">${window.ICONS.star}</span>
              <span class="rating-text">${item.rating}</span>
              <span class="rating-separator">|</span>
              <span class="sold-text">${item.soldCount} items sold</span>
            </div>
            <div class="deal-card-price-row">
              <span class="current-price">${window.STORE_CONFIG.formatPrice(item.price)}</span>
              ${item.originalPrice ? `<span class="original-price">${window.STORE_CONFIG.formatPrice(item.originalPrice)}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderCatalog(itemsToRender = null) {
    const grid = document.getElementById('catalog-products-grid');
    if (!grid) return;

    const items = itemsToRender || window.CATALOG_PRODUCTS || [];

    grid.innerHTML = items.map(item => {
      const isFav = this.wishlist.includes(item.id);
      const isSoldOut = item.isSoldOut;

      let tagMarkup = '';
      if (item.tag) {
        const tagClass = item.tagType === 'sold-out' ? 'tag-sold-out' : 'tag-just-in';
        tagMarkup = `<span class="product-badge-pill ${tagClass}">${item.tag}</span>`;
      }

      return `
        <div class="product-card ${isSoldOut ? 'is-sold-out' : ''}" data-id="${item.id}">
          <div class="product-card-header">
            ${tagMarkup}
            <button type="button" class="wishlist-heart-btn ${isFav ? 'is-active' : ''}" 
              onclick="window.app.toggleWishlist('${item.id}', this, event)" title="Save to wishlist">
              ${isFav ? window.ICONS.heartFilled : window.ICONS.heartOutline}
            </button>
          </div>
          
          <div class="product-card-thumb-wrap" onclick="window.modals.openProductModal('${item.id}')">
            <img src="${item.image}" alt="${item.name}" loading="lazy" />
          </div>

          <div class="product-card-info" onclick="window.modals.openProductModal('${item.id}')">
            <h3 class="product-card-name">${item.name}</h3>
            
            <div class="product-card-meta">
              <span class="rating-star">${window.ICONS.star}</span>
              <span class="rating-score">${item.rating}</span>
              <span class="meta-dot">•</span>
              <span class="items-sold">${item.soldCount} items sold</span>
            </div>

            <div class="product-card-price">
              <span class="price-val">${window.STORE_CONFIG.formatPrice(item.price)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderFilteredCatalog(filteredItems) {
    this.renderCatalog(filteredItems);
    const countEl = document.getElementById('catalog-result-count');
    if (countEl) {
      countEl.textContent = `Showing ${filteredItems.length} styles`;
    }
  }

  renderBrandStores() {
    const container = document.getElementById('brand-stores-grid');
    if (!container || !window.BRAND_STORES) return;

    container.innerHTML = window.BRAND_STORES.map(brand => `
      <div class="brand-store-card">
        <div class="brand-store-header">
          <div class="brand-profile-left">
            <div class="brand-icon-box" style="background-color: ${brand.logoBg};">
              ${brand.logoSvg}
            </div>
            <div class="brand-profile-text">
              <div class="brand-name-wrap">
                <h4 class="brand-store-name">${brand.name}</h4>
                ${brand.verified ? window.ICONS.verified : ''}
              </div>
              <div class="brand-meta-stats">
                <span class="rating-star">${window.ICONS.star}</span>
                <span>${brand.rating}</span>
                <span class="meta-divider">|</span>
                <span>${brand.followers} Followers</span>
              </div>
            </div>
          </div>
          <button type="button" class="brand-visit-pill" onclick="window.app.filterByBrandDirect('${brand.name}')">
            Visit
          </button>
        </div>

        <div class="brand-items-2x2">
          ${brand.items.map(it => `
            <div class="brand-mini-thumb" onclick="window.modals.openProductModal('${it.id}')" title="${it.name}">
              <img src="${it.img}" alt="${it.name}" loading="lazy" />
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  filterByBrandDirect(brandName) {
    const brandSelect = document.getElementById('filter-brand-select');
    if (brandSelect) {
      brandSelect.value = brandName.toLowerCase();
      if (window.searchManager) {
        window.searchManager.currentFilters.brand = brandName.toLowerCase();
        window.searchManager.applyCatalogFilters();
      }
      const target = document.getElementById('shop-collection-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
      this.showToast('Brand Filter Applied', `Showing official ${brandName} drops.`, 'info');
    }
  }

  toggleWishlist(productId, btnElement, event) {
    if (event) event.stopPropagation();

    const index = this.wishlist.indexOf(productId);
    let isNowSaved = false;

    if (index > -1) {
      this.wishlist.splice(index, 1);
      isNowSaved = false;
      this.showToast('Wishlist', 'Item removed from favorites.', 'info');
    } else {
      this.wishlist.push(productId);
      isNowSaved = true;
      this.showToast('Saved!', 'Item saved to your Wishlist.', 'success');
    }

    this.saveWishlist();
    this.updateWishlistCount();

    // Re-render button icon with micro-animation
    if (btnElement) {
      btnElement.classList.toggle('is-active', isNowSaved);
      btnElement.innerHTML = isNowSaved ? window.ICONS.heartFilled : window.ICONS.heartOutline;
      btnElement.classList.add('heart-bounce');
      setTimeout(() => btnElement.classList.remove('heart-bounce'), 400);
    }

    // Refresh best deals & catalog icons if open
    this.updateAllWishlistIcons();
  }

  updateAllWishlistIcons() {
    const allHeartBtns = document.querySelectorAll('.wishlist-heart-btn');
    allHeartBtns.forEach(btn => {
      const card = btn.closest('[data-id]');
      if (card) {
        const id = card.getAttribute('data-id');
        const active = this.wishlist.includes(id);
        btn.classList.toggle('is-active', active);
        btn.innerHTML = active ? window.ICONS.heartFilled : window.ICONS.heartOutline;
      }
    });
  }

  updateWishlistCount() {
    const count = this.wishlist.length;
    const badgeCounters = document.querySelectorAll('.header-wishlist-count');
    badgeCounters.forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  }

  openWishlistDrawer() {
    const all = [
      ...(window.CATALOG_PRODUCTS || []),
      ...(window.BEST_DEALS || [])
    ];
    const savedItems = all.filter(item => this.wishlist.includes(item.id));

    const modal = document.getElementById('wishlist-modal');
    const container = document.getElementById('wishlist-items-container');

    if (container) {
      if (savedItems.length === 0) {
        container.innerHTML = `
          <div class="cart-empty-state">
            <h4>No Saved Items</h4>
            <p>Tap the heart icon on any sneaker to save it to your wishlist.</p>
          </div>
        `;
      } else {
        container.innerHTML = savedItems.map(item => `
          <div class="wishlist-item-row">
            <img src="${item.image}" alt="${item.name}" class="wishlist-thumb" />
            <div class="wishlist-item-meta">
              <strong>${item.name}</strong>
              <div class="wishlist-price">${window.STORE_CONFIG.formatPrice(item.price)}</div>
            </div>
            <button type="button" class="pill-btn pill-btn-primary pill-btn-sm" onclick="window.cart.addItem({ id: '${item.id}', name: '${item.name}', price: ${item.price}, image: '${item.image}' });">
              Add to Bag
            </button>
          </div>
        `).join('');
      }
    }

    if (modal) {
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
  }

  showToast(title, message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-pill toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <strong class="toast-title">${title}</strong>
        <span class="toast-desc">${message}</span>
      </div>
      <button class="toast-dismiss">&times;</button>
    `;

    toast.querySelector('.toast-dismiss').addEventListener('click', () => {
      toast.classList.add('toast-leave');
      setTimeout(() => toast.remove(), 250);
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('toast-leave');
        setTimeout(() => toast.remove(), 250);
      }
    }, 4000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new FootWearApp();
});
