/**
 * Grofresh - Shopping Basket & Cart Controller
 */

class CartManager {
  constructor() {
    this.storageKey = 'grofresh_cart_items_kes_v2';
    this.items = this.loadCart();
    this.appliedDiscount = 0;
    this.promoCode = '';
    this.init();
  }

  loadCart() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    // Default items
    return [
      {
        id: "deal-tomatoes",
        name: "Fresh Red Vine Tomatoes",
        price: 220,
        unit: "1 kg",
        image: "assets/deal_tomatoes.jpg",
        quantity: 2
      },
      {
        id: "prod-avocado",
        name: "Fresh Haas Avocados",
        price: 250,
        unit: "3 pcs pack",
        image: "assets/prod_avocado.jpg",
        quantity: 1
      }
    ];
  }

  saveCart() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (e) {}
  }

  init() {
    this.render();
    this.bindEvents();
  }

  bindEvents() {
    const triggers = document.querySelectorAll('.trigger-cart-drawer');
    triggers.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openDrawer();
      });
    });

    const closeBtn = document.getElementById('cart-drawer-close');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeDrawer());

    const backdrop = document.getElementById('cart-drawer-backdrop');
    if (backdrop) backdrop.addEventListener('click', () => this.closeDrawer());

    const promoBtn = document.getElementById('cart-promo-apply-btn');
    const promoInput = document.getElementById('cart-promo-input');
    if (promoBtn && promoInput) {
      promoBtn.addEventListener('click', () => {
        const code = promoInput.value.trim().toUpperCase();
        this.applyPromoCode(code);
      });
    }

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

  addItem(product, quantity = 1) {
    const existingIndex = this.items.findIndex(item => item.id === product.id);

    if (existingIndex > -1) {
      this.items[existingIndex].quantity += quantity;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit || "1 pc",
        image: product.image,
        quantity: quantity
      });
    }

    this.saveCart();
    this.render();
    if (window.app && window.app.showToast) {
      window.app.showToast('Added to Cart', `${product.name} (${quantity}x) added to basket.`, 'success');
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
        window.app.showToast('Item Removed', `${removed.name} removed from basket.`, 'info');
      }
    }
  }

  applyPromoCode(code) {
    if (!code) return;
    if (code === 'FRESH20' || code === 'GROFRESH20') {
      this.appliedDiscount = 0.20; // 20% discount
      this.promoCode = code;
      this.render();
      if (window.app && window.app.showToast) {
        window.app.showToast('Coupon Applied!', '20% discount applied to your order!', 'success');
      }
    } else if (code === 'FRESH10') {
      this.appliedDiscount = 0.10;
      this.promoCode = code;
      this.render();
      if (window.app && window.app.showToast) {
        window.app.showToast('Coupon Applied!', '10% discount applied.', 'success');
      }
    } else {
      if (window.app && window.app.showToast) {
        window.app.showToast('Invalid Coupon', 'Try coupon code "FRESH20" for 20% off.', 'error');
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
    const discountAmount = Math.round(subtotal * this.appliedDiscount * 100) / 100;
    const shipping = subtotal >= window.STORE_CONFIG.freeDeliveryThreshold ? 0 : window.STORE_CONFIG.standardDeliveryFee;
    const total = subtotal - discountAmount + shipping;
    return {
      subtotal,
      discountAmount,
      discountPercent: this.appliedDiscount * 100,
      shipping,
      total,
      itemCount: this.getTotalCount(),
      items: this.items
    };
  }

  render() {
    const totalCount = this.getTotalCount();
    const summary = this.getSummary();

    // Update Header Badges & Pill
    const badgeCounters = document.querySelectorAll('.header-cart-count');
    badgeCounters.forEach(el => {
      el.textContent = totalCount;
      el.style.display = totalCount > 0 ? 'inline-flex' : 'none';
    });

    const headerAmountEl = document.getElementById('header-cart-amount');
    if (headerAmountEl) {
      headerAmountEl.textContent = window.STORE_CONFIG.formatPrice(summary.total);
    }

    // Render Drawer items
    const container = document.getElementById('cart-drawer-items');
    if (container) {
      if (this.items.length === 0) {
        container.innerHTML = `
          <div class="cart-empty-state">
            <h4>Your Basket is Empty</h4>
            <p>Pick fresh vegetables, organic fruits, and farm dairy for delivery.</p>
            <button class="pill-btn pill-btn-primary" onclick="window.cart.closeDrawer()">
              Start Shopping
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
              <div class="cart-item-meta">${item.unit}</div>
              <div class="cart-item-price">${window.STORE_CONFIG.formatPrice(item.price)}</div>
              <div class="cart-item-qty-row">
                <div class="qty-stepper">
                  <button type="button" class="qty-btn" onclick="window.cart.updateQuantity(${index}, -1)">-</button>
                  <span class="qty-value">${item.quantity}</span>
                  <button type="button" class="qty-btn" onclick="window.cart.updateQuantity(${index}, 1)">+</button>
                </div>
                <button type="button" class="cart-item-remove" onclick="window.cart.removeItem(${index})">
                  ${window.ICONS ? window.ICONS.trash : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    // Update Financials
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

    if (checkoutBtn) checkoutBtn.disabled = this.items.length === 0;
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
