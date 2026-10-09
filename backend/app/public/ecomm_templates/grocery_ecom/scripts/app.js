/**
 * Grofresh - Main Application Controller
 */

class GrofreshApp {
  constructor() {
    this.currentCategoryTab = 'all';
    this.wishlist = this.loadWishlist();
    this.countdownSeconds = 8 * 3600 + 42 * 60 + 15; // 8 hrs 42 mins 15 secs
    this.init();
  }

  loadWishlist() {
    try {
      const saved = localStorage.getItem('grofresh_wishlist');
      return saved ? JSON.parse(saved) : ['deal-tomatoes', 'prod-avocado'];
    } catch (e) {
      return ['deal-tomatoes', 'prod-avocado'];
    }
  }

  saveWishlist() {
    try {
      localStorage.setItem('grofresh_wishlist', JSON.stringify(this.wishlist));
    } catch (e) {}
  }

  init() {
    this.renderCategories();
    this.renderTodaysDeals();
    this.renderFreshFoodCatalog();
    this.renderSpotlightProducts();
    this.renderBestSellers();
    this.renderSeafoodDeals();
    this.renderMonthlyDeals();
    this.renderBrands();
    this.renderFaqs();
    this.startCountdownTimer();
    this.bindEvents();
    this.updateWishlistCount();
  }

  startCountdownTimer() {
    const hoursEl = document.getElementById('deal-timer-hours');
    const minsEl = document.getElementById('deal-timer-mins');
    const secsEl = document.getElementById('deal-timer-secs');

    setInterval(() => {
      if (this.countdownSeconds > 0) {
        this.countdownSeconds--;
      } else {
        this.countdownSeconds = 24 * 3600;
      }

      const h = Math.floor(this.countdownSeconds / 3600);
      const m = Math.floor((this.countdownSeconds % 3600) / 60);
      const s = this.countdownSeconds % 60;

      if (hoursEl) hoursEl.textContent = String(h).padStart(2, '0');
      if (minsEl) minsEl.textContent = String(m).padStart(2, '0');
      if (secsEl) secsEl.textContent = String(s).padStart(2, '0');
    }, 1000);
  }

  bindEvents() {
    // Slider arrows
    this.bindRailSlider('deals-prev', 'deals-next', 'deals-rail');
    this.bindRailSlider('best-prev', 'best-next', 'best-rail');
    this.bindRailSlider('sea-prev', 'sea-next', 'sea-rail');

    // Category Tabs in Fresh Food for You
    const tabs = document.querySelectorAll('.category-filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const cat = tab.getAttribute('data-cat');
        this.filterFreshFood(cat);
      });
    });

    // Newsletter subscription
    const newsForm = document.getElementById('newsletter-cashback-form');
    if (newsForm) {
      newsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('newsletter-cashback-input');
        if (input && input.value) {
          this.showToast('20% Cashback Activated!', `Welcome discount sent to ${input.value}.`, 'success');
          input.value = '';
        }
      });
    }

    // Wishlist header icon trigger
    const wishlistTriggers = document.querySelectorAll('.trigger-wishlist-view');
    wishlistTriggers.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openWishlistModal();
      });
    });
  }

  bindRailSlider(prevId, nextId, railId) {
    const prev = document.getElementById(prevId);
    const next = document.getElementById(nextId);
    const rail = document.getElementById(railId);
    if (prev && rail) {
      prev.addEventListener('click', () => rail.scrollBy({ left: -300, behavior: 'smooth' }));
    }
    if (next && rail) {
      next.addEventListener('click', () => rail.scrollBy({ left: 300, behavior: 'smooth' }));
    }
  }

  renderCategories() {
    const grid = document.getElementById('category-bubbles-grid');
    if (!grid || !window.CATEGORIES) return;

    grid.innerHTML = window.CATEGORIES.map(cat => `
      <div class="category-bubble-card" onclick="window.app.filterFreshFood('${cat.id}'); document.getElementById('fresh-food-section').scrollIntoView({ behavior: 'smooth' });">
        <div class="category-bubble-thumb">
          <img src="${cat.image}" alt="${cat.name}" loading="lazy" />
        </div>
        <span class="category-bubble-name">${cat.name}</span>
      </div>
    `).join('');
  }

  renderProductCardMarkup(item) {
    const isFav = this.wishlist.includes(item.id);
    const badgeClass = item.badgeType === 'organic' ? 'badge-organic' : 'badge-sale';

    return `
      <div class="grocery-product-card" data-id="${item.id}">
        <div class="card-badge-row">
          ${item.badge ? `<span class="grocery-badge-pill ${badgeClass}">${item.badge}</span>` : `<span></span>`}
          <button type="button" class="grocery-heart-btn ${isFav ? 'is-active' : ''}" 
            onclick="window.app.toggleWishlist('${item.id}', this, event)" title="Save to wishlist">
            ${isFav ? window.ICONS.heartFilled : window.ICONS.heart}
          </button>
        </div>

        <div class="card-thumb-wrap" onclick="window.modals.openProductModal('${item.id}')">
          <img src="${item.image}" alt="${item.name}" loading="lazy" />
        </div>

        <div class="card-body">
          <span class="card-category-label">${item.categoryName || item.category || 'Fresh'}</span>
          <h4 class="card-product-name" onclick="window.modals.openProductModal('${item.id}')">${item.name}</h4>
          
          <div class="card-unit-label">${item.unit || '1 kg'}</div>

          <div class="card-price-action-row">
            <div class="card-price-box">
              <span class="card-price">${window.STORE_CONFIG.formatPrice(item.price)}</span>
              ${item.originalPrice ? `<span class="card-orig-price">${window.STORE_CONFIG.formatPrice(item.originalPrice)}</span>` : ''}
            </div>
            <button type="button" class="card-add-btn" onclick="window.cart.addItem({ id: '${item.id}', name: '${item.name}', price: ${item.price}, unit: '${item.unit || "1 kg"}', image: '${item.image}' });">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderTodaysDeals() {
    const rail = document.getElementById('deals-rail');
    if (!rail || !window.TODAYS_DEALS) return;
    rail.innerHTML = window.TODAYS_DEALS.map(item => this.renderProductCardMarkup(item)).join('');
  }

  renderFreshFoodCatalog(items = null) {
    const grid = document.getElementById('fresh-food-grid');
    if (!grid) return;
    const list = items || window.FRESH_FOOD_CATALOG || [];
    grid.innerHTML = list.map(item => this.renderProductCardMarkup(item)).join('');
  }

  filterFreshFood(category) {
    this.currentCategoryTab = category;
    if (category === 'all') {
      this.renderFreshFoodCatalog(window.FRESH_FOOD_CATALOG);
    } else {
      const filtered = (window.FRESH_FOOD_CATALOG || []).filter(
        p => p.category.toLowerCase() === category.toLowerCase()
      );
      this.renderFreshFoodCatalog(filtered);
    }
  }

  renderSpotlightProducts() {
    const container = document.getElementById('spotlight-products-container');
    if (!container || !window.SPOTLIGHT_PRODUCTS) return;
    container.innerHTML = window.SPOTLIGHT_PRODUCTS.map(item => this.renderProductCardMarkup(item)).join('');
  }

  renderBestSellers() {
    const rail = document.getElementById('best-rail');
    if (!rail || !window.DAILY_BEST_SELLERS) return;
    rail.innerHTML = window.DAILY_BEST_SELLERS.map(item => this.renderProductCardMarkup(item)).join('');
  }

  renderSeafoodDeals() {
    const rail = document.getElementById('sea-rail');
    if (!rail || !window.SEAFOOD_DEALS) return;
    rail.innerHTML = window.SEAFOOD_DEALS.map(item => this.renderProductCardMarkup(item)).join('');
  }

  renderMonthlyDeals() {
    const container = document.getElementById('monthly-deals-container');
    if (!container || !window.MONTHLY_GROCERY_DEAL) return;
    container.innerHTML = window.MONTHLY_GROCERY_DEAL.map(item => this.renderProductCardMarkup(item)).join('');
  }

  renderBrands() {
    const row = document.getElementById('brands-logo-row');
    if (!row || !window.BRANDS) return;

    row.innerHTML = window.BRANDS.map(b => `
      <div class="brand-item-pill" style="color: ${b.color};">
        <strong>${b.name}</strong>
      </div>
    `).join('');
  }

  renderFaqs() {
    const container = document.getElementById('faq-accordion-container');
    if (!container || !window.FAQS) return;

    container.innerHTML = window.FAQS.map((faq, index) => `
      <div class="faq-item ${index === 0 ? 'is-active' : ''}">
        <button type="button" class="faq-question-btn" onclick="this.parentElement.classList.toggle('is-active');">
          <span>${faq.q}</span>
          <span class="faq-chevron">▼</span>
        </button>
        <div class="faq-answer-body">
          <p>${faq.a}</p>
        </div>
      </div>
    `).join('');
  }

  toggleWishlist(productId, btnElement, event) {
    if (event) event.stopPropagation();
    const index = this.wishlist.indexOf(productId);
    let isNowSaved = false;

    if (index > -1) {
      this.wishlist.splice(index, 1);
      isNowSaved = false;
      this.showToast('Wishlist', 'Item removed from saved items.', 'info');
    } else {
      this.wishlist.push(productId);
      isNowSaved = true;
      this.showToast('Saved!', 'Added to your favorites list.', 'success');
    }

    this.saveWishlist();
    this.updateWishlistCount();

    if (btnElement) {
      btnElement.classList.toggle('is-active', isNowSaved);
      btnElement.innerHTML = isNowSaved ? window.ICONS.heartFilled : window.ICONS.heart;
    }

    this.updateAllWishlistIcons();
  }

  updateAllWishlistIcons() {
    const allBtns = document.querySelectorAll('.grocery-heart-btn');
    allBtns.forEach(btn => {
      const card = btn.closest('[data-id]');
      if (card) {
        const id = card.getAttribute('data-id');
        const active = this.wishlist.includes(id);
        btn.classList.toggle('is-active', active);
        btn.innerHTML = active ? window.ICONS.heartFilled : window.ICONS.heart;
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

  openWishlistModal() {
    const all = [
      ...(window.TODAYS_DEALS || []),
      ...(window.FRESH_FOOD_CATALOG || []),
      ...(window.SPOTLIGHT_PRODUCTS || []),
      ...(window.DAILY_BEST_SELLERS || []),
      ...(window.SEAFOOD_DEALS || []),
      ...(window.MONTHLY_GROCERY_DEAL || [])
    ];
    const saved = all.filter(p => this.wishlist.includes(p.id));
    const container = document.getElementById('wishlist-items-container');
    const modal = document.getElementById('wishlist-modal');

    if (container) {
      if (saved.length === 0) {
        container.innerHTML = `<div class="cart-empty-state"><h4>No Saved Items</h4><p>Click the heart on any item to save it for later.</p></div>`;
      } else {
        container.innerHTML = saved.map(item => `
          <div class="wishlist-item-row">
            <img src="${item.image}" alt="${item.name}" class="wishlist-thumb" />
            <div class="wishlist-item-meta">
              <strong>${item.name}</strong>
              <div class="wishlist-price">${window.STORE_CONFIG.formatPrice(item.price)} <small>/ ${item.unit || 'kg'}</small></div>
            </div>
            <button type="button" class="pill-btn pill-btn-primary pill-btn-sm" onclick="window.cart.addItem({ id: '${item.id}', name: '${item.name}', price: ${item.price}, unit: '${item.unit || "1 kg"}', image: '${item.image}' });">
              Add to Cart
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
      toast.remove();
    });

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 3500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new GrofreshApp();
});
