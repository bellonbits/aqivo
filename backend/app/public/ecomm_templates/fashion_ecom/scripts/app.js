/**
 * LUXINA - Main App Controller
 */

class LuxinaApp {
  constructor() {
    this.wishlist = this.loadWishlist();
    this.init();
  }

  loadWishlist() {
    try {
      const saved = localStorage.getItem('luxina_wishlist');
      return saved ? JSON.parse(saved) : ['arr-2', 'ws-1'];
    } catch (e) {
      return ['arr-2', 'ws-1'];
    }
  }

  saveWishlist() {
    try {
      localStorage.setItem('luxina_wishlist', JSON.stringify(this.wishlist));
    } catch (e) {}
  }

  init() {
    this.renderCategories();
    this.renderNewArrivals();
    this.renderWomenSale();
    this.renderMenSale();
    this.renderBlog();
    this.bindEvents();
    this.updateWishlistCount();
  }

  bindEvents() {
    // Sliders
    this.bindRailSlider('arrivals-prev', 'arrivals-next', 'arrivals-rail');
    this.bindRailSlider('women-sale-prev', 'women-sale-next', 'women-sale-rail');
    this.bindRailSlider('men-sale-prev', 'men-sale-next', 'men-sale-rail');

    // Newsletter
    const form = document.getElementById('newsletter-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('newsletter-email-input');
        if (input && input.value) {
          this.showToast('Subscribed to LUXINA', `Private invitation sent to ${input.value}.`, 'success');
          input.value = '';
        }
      });
    }

    // Wishlist triggers
    const wishlistTriggers = document.querySelectorAll('.trigger-wishlist-view');
    wishlistTriggers.forEach(b => {
      b.addEventListener('click', (e) => {
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
      prev.addEventListener('click', () => rail.scrollBy({ left: -320, behavior: 'smooth' }));
    }
    if (next && rail) {
      next.addEventListener('click', () => rail.scrollBy({ left: 320, behavior: 'smooth' }));
    }
  }

  renderCategories() {
    const strip = document.getElementById('categories-strip');
    if (!strip || !window.CATEGORIES) return;

    strip.innerHTML = window.CATEGORIES.map(cat => `
      <div class="category-strip-item" onclick="window.app.showToast('Category', 'Filtered by ${cat.name}', 'info')">
        <div class="category-strip-thumb">
          <img src="${cat.image}" alt="${cat.name}" loading="lazy" />
        </div>
        <span class="category-strip-title">${cat.name}</span>
      </div>
    `).join('');
  }

  renderProductCard(prod, isSale = false) {
    const isFav = this.wishlist.includes(prod.id);
    return `
      <div class="fashion-card" data-id="${prod.id}">
        <div class="fashion-card-top">
          ${prod.discount ? `<span class="sale-badge-pill">${prod.discount}</span>` : `<span></span>`}
          <button type="button" class="fashion-heart-btn ${isFav ? 'is-active' : ''}" 
            onclick="window.app.toggleWishlist('${prod.id}', this, event)" title="Save to wishlist">
            ${isFav ? window.ICONS.heartFilled : window.ICONS.heart}
          </button>
        </div>

        <div class="fashion-card-thumb-wrap" onclick="window.modals.openProductModal('${prod.id}')">
          <img src="${prod.image}" alt="${prod.name}" loading="lazy" />
        </div>

        <div class="fashion-card-body" onclick="window.modals.openProductModal('${prod.id}')">
          <h4 class="fashion-card-name">${prod.name}</h4>
          <div class="fashion-card-price-row">
            <span class="fashion-current-price">${window.STORE_CONFIG.formatPrice(prod.price)}</span>
            ${prod.originalPrice ? `<span class="fashion-original-price">${window.STORE_CONFIG.formatPrice(prod.originalPrice)}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderNewArrivals() {
    const rail = document.getElementById('arrivals-rail');
    if (!rail || !window.NEW_ARRIVALS) return;
    rail.innerHTML = window.NEW_ARRIVALS.map(p => this.renderProductCard(p)).join('');
  }

  renderWomenSale() {
    const rail = document.getElementById('women-sale-rail');
    if (!rail || !window.WOMEN_SALE) return;
    rail.innerHTML = window.WOMEN_SALE.map(p => this.renderProductCard(p, true)).join('');
  }

  renderMenSale() {
    const rail = document.getElementById('men-sale-rail');
    if (!rail || !window.MEN_SALE) return;
    rail.innerHTML = window.MEN_SALE.map(p => this.renderProductCard(p, true)).join('');
  }

  renderBlog() {
    const grid = document.getElementById('blog-grid');
    if (!grid || !window.BLOG_POSTS) return;

    grid.innerHTML = window.BLOG_POSTS.map(post => `
      <article class="blog-card">
        <div class="blog-thumb-wrap">
          <img src="${post.image}" alt="${post.title}" loading="lazy" />
        </div>
        <div class="blog-body">
          <span class="blog-cat">${post.category}</span>
          <h4 class="blog-title">${post.title}</h4>
          <p class="blog-excerpt">${post.excerpt}</p>
          <a href="#" class="blog-link" onclick="event.preventDefault(); window.app.showToast('Editorial', 'Opening ${post.title}', 'info');">
            ${post.linkText} →
          </a>
        </div>
      </article>
    `).join('');
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
      this.showToast('Saved', 'Item added to your Wishlist.', 'success');
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
    const allBtns = document.querySelectorAll('.fashion-heart-btn');
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
    const badges = document.querySelectorAll('.header-wishlist-count');
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  }

  openWishlistModal() {
    const all = [
      ...(window.NEW_ARRIVALS || []),
      ...(window.WOMEN_SALE || []),
      ...(window.MEN_SALE || [])
    ];
    const saved = all.filter(p => this.wishlist.includes(p.id));
    const container = document.getElementById('wishlist-items-container');
    const modal = document.getElementById('wishlist-modal');

    if (container) {
      if (saved.length === 0) {
        container.innerHTML = `<div class="cart-empty-state"><h4>No Saved Items</h4><p>Tap heart on pieces you admire.</p></div>`;
      } else {
        container.innerHTML = saved.map(item => `
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
      toast.remove();
    });

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 3500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new LuxinaApp();
});
