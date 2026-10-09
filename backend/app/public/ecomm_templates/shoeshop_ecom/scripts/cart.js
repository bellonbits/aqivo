/**
 * FootWear - Shopping Cart Manager
 * Manages cart state, slide-out drawer, quantities, promo codes, and checkout handoff.
 */

class CartManager {
  constructor() {
    this.storageKey = 'footwear_cart_items_v2';
    this.items = this.loadCart();
    this.appliedDiscount = 0;
    this.promoCode = '';
    this.shippingCost = 0; // Free express shipping promotion
    this.init();
  }

  loadCart() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read cart from storage', e);
    }

    // Default 2 items to match the mockup header badge
    return [
      {
        id: 'prod-airmax90',
        name: 'Nike Air Max 90',
        price: 1799000,
        image: 'assets/prod_airmax90.jpg',
        size: 42,
        quantity: 1
      },
      {
        id: 'deal-3',
        name: 'Stan Smith Primegreen Classic',
        price: 1050000,
        image: 'assets/deal_stansmith.jpg',
        size: 41,
        quantity: 1
      }
    ];
  }

  saveCart() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (e) {
      console.warn('Could not save cart', e);
    }
  }

  init() {
    this.render();
    this.bindEvents();
  }

  bindEvents() {
    // Cart drawer triggers
    const triggers = document.querySelectorAll('.trigger-cart-drawer');
    triggers.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openDrawer();
      });
    });

    const closeBtn = document.getElementById('cart-drawer-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeDrawer());
    }

    const backdrop = document.getElementById('cart-drawer-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => this.closeDrawer());
    }

    // Apply promo voucher
    const promoBtn = document.getElementById('cart-promo-apply-btn');
    const promoInput = document.getElementById('cart-promo-input');
    if (promoBtn && promoInput) {
      promoBtn.addEventListener('click', () => {
        const code = promoInput.value.trim().toUpperCase();
        this.applyPromoCode(code);
      });
    }

    // Checkout button
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        this.closeDrawer();
        if (window.modals && window.modals.openCheckoutModal) {
          window.modals.openCheckoutModal(this.getSummary());
        }
      });
    }
  }

  addItem(product, size = 42, quantity = 1) {
    const existingIndex = this.items.findIndex(
      item => item.id === product.id && item.size === size
    );

    if (existingIndex > -1) {
      this.items[existingIndex].quantity += quantity;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: size,
        quantity: quantity
      });
    }

    this.saveCart();
    this.render();
    if (window.app && window.app.showToast) {
      window.app.showToast(
        'Added to Bag',
        `${product.name} (EU ${size}) added to your shopping bag.`,
        'success'
      );
    }
  }

  updateQuantity(index, delta) {
    if (this.items[index]) {
      this.items[index].quantity += delta;
      if (this.items[index].quantity <= 0) {
        this.items.splice(index, 1);
      }
      this.saveCart();
      this.render();
    }
  }

  removeItem(index) {
    if (this.items[index]) {
      const removed = this.items.splice(index, 1)[0];
      this.saveCart();
      this.render();
      if (window.app && window.app.showToast) {
        window.app.showToast('Item Removed', `${removed.name} removed from bag.`, 'info');
      }
    }
  }

  applyPromoCode(code) {
    if (!code) return;
    if (code === 'FEST50' || code === 'SNEAKERSFEST' || code === 'DISC50') {
      this.appliedDiscount = 0.15; // 15% festival discount
      this.promoCode = code;
      this.render();
      if (window.app && window.app.showToast) {
        window.app.showToast('Promo Applied!', 'Sneakers Fest 15% discount activated!', 'success');
      }
    } else if (code === 'LUCKY10') {
      this.appliedDiscount = 0.10;
      this.promoCode = code;
      this.render();
      if (window.app && window.app.showToast) {
        window.app.showToast('Promo Applied!', 'VIP 10% discount applied!', 'success');
      }
    } else {
      if (window.app && window.app.showToast) {
        window.app.showToast('Invalid Code', 'Try voucher code "FEST50" or "LUCKY10"', 'error');
      }
    }
  }

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  getTotalCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getSummary() {
    const subtotal = this.getSubtotal();
    const discountAmount = Math.round(subtotal * this.appliedDiscount);
    const total = subtotal - discountAmount + this.shippingCost;
    return {
      subtotal,
      discountAmount,
      discountPercent: this.appliedDiscount * 100,
      shipping: this.shippingCost,
      total,
      itemCount: this.getTotalCount(),
      items: this.items
    };
  }

  render() {
    const totalCount = this.getTotalCount();
    const summary = this.getSummary();

    // Update Header Badges
    const badgeCounters = document.querySelectorAll('.header-cart-count');
    badgeCounters.forEach(el => {
      el.textContent = totalCount;
      el.style.display = totalCount > 0 ? 'inline-flex' : 'none';
    });

    // Render Drawer Items
    const container = document.getElementById('cart-drawer-items');
    if (container) {
      if (this.items.length === 0) {
        container.innerHTML = `
          <div class="cart-empty-state">
            <div class="cart-empty-icon">
              ${window.ICONS ? window.ICONS.cart : ''}
            </div>
            <h4>Your Shopping Bag is Empty</h4>
            <p>Explore our sneaker drops and find your fresh fit.</p>
            <button class="pill-btn pill-btn-primary" onclick="window.cart.closeDrawer()">
              Explore Drops
            </button>
          </div>
        `;
      } else {
        container.innerHTML = this.items.map((item, index) => `
          <div class="cart-item-row" data-index="${index}">
            <div class="cart-item-thumb">
              <img src="${item.image}" alt="${item.name}" loading="lazy" />
            </div>
            <div class="cart-item-details">
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-meta">Size: EU ${item.size}</div>
              <div class="cart-item-price">${window.STORE_CONFIG.formatPrice(item.price)}</div>
              <div class="cart-item-qty-row">
                <div class="qty-stepper">
                  <button type="button" class="qty-btn" onclick="window.cart.updateQuantity(${index}, -1)" title="Decrease">
                    ${window.ICONS ? window.ICONS.minus : '-'}
                  </button>
                  <span class="qty-value">${item.quantity}</span>
                  <button type="button" class="qty-btn" onclick="window.cart.updateQuantity(${index}, 1)" title="Increase">
                    ${window.ICONS ? window.ICONS.plus : '+'}
                  </button>
                </div>
                <button type="button" class="cart-item-remove" onclick="window.cart.removeItem(${index})" title="Remove item">
                  ${window.ICONS ? window.ICONS.trash : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    // Update Drawer Financials
    const subtotalEl = document.getElementById('cart-subtotal-val');
    const discountRow = document.getElementById('cart-discount-row');
    const discountEl = document.getElementById('cart-discount-val');
    const shippingEl = document.getElementById('cart-shipping-val');
    const totalEl = document.getElementById('cart-total-val');
    const checkoutBtn = document.getElementById('cart-checkout-btn');

    if (subtotalEl) subtotalEl.textContent = window.STORE_CONFIG.formatPrice(summary.subtotal);
    if (discountRow) {
      if (summary.discountAmount > 0) {
        discountRow.style.display = 'flex';
        if (discountEl) discountEl.textContent = `- ${window.STORE_CONFIG.formatPrice(summary.discountAmount)} (${summary.discountPercent}%)`;
      } else {
        discountRow.style.display = 'none';
      }
    }
    if (shippingEl) shippingEl.textContent = summary.shipping === 0 ? 'FREE' : window.STORE_CONFIG.formatPrice(summary.shipping);
    if (totalEl) totalEl.textContent = window.STORE_CONFIG.formatPrice(summary.total);

    if (checkoutBtn) {
      checkoutBtn.disabled = this.items.length === 0;
    }
  }

  openDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-drawer-backdrop');
    if (drawer && backdrop) {
      drawer.classList.add('is-open');
      backdrop.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
  }

  closeDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-drawer-backdrop');
    if (drawer && backdrop) {
      drawer.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.cart = new CartManager();
});
