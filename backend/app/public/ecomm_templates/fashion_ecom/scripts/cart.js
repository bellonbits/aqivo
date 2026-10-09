/**
 * LUXINA - Shopping Bag Controller
 */

class CartManager {
  constructor() {
    this.storageKey = 'luxina_cart_items_kes_v2';
    this.items = this.loadCart();
    this.appliedDiscount = 0;
    this.promoCode = '';
    this.shippingCost = 0;
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
        id: "arr-1",
        name: "Oversized Wool Blazer",
        price: 18500,
        image: "assets/prod_blazer.jpg",
        size: "M",
        color: "Stone Grey",
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

  addItem(product, size = "M", color = "Default", quantity = 1) {
    const existingIndex = this.items.findIndex(
      item => item.id === product.id && item.size === size && item.color === color
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
        color: color,
        quantity: quantity
      });
    }

    this.saveCart();
    this.render();
    if (window.app && window.app.showToast) {
      window.app.showToast('Added to Bag', `${product.name} (${size}) placed in your bag.`, 'success');
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
        window.app.showToast('Removed', `${removed.name} removed from bag.`, 'info');
      }
    }
  }

  applyPromoCode(code) {
    if (!code) return;
    if (code === 'LUX50' || code === 'SUMMER50') {
      this.appliedDiscount = 0.50; // 50% discount!
      this.promoCode = code;
      this.render();
      if (window.app && window.app.showToast) {
        window.app.showToast('50% Off Applied!', 'Seasonal 50% discount activated!', 'success');
      }
    } else if (code === 'VIP20') {
      this.appliedDiscount = 0.20;
      this.promoCode = code;
      this.render();
      if (window.app && window.app.showToast) {
        window.app.showToast('VIP Discount', '20% off applied.', 'success');
      }
    } else {
      if (window.app && window.app.showToast) {
        window.app.showToast('Invalid Code', 'Try voucher code "LUX50" for 50% off.', 'error');
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
    const shipping = subtotal > 150 ? 0 : 25;
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

    const badgeCounters = document.querySelectorAll('.header-cart-count');
    badgeCounters.forEach(el => {
      el.textContent = totalCount;
      el.style.display = totalCount > 0 ? 'inline-flex' : 'none';
    });

    const container = document.getElementById('cart-drawer-items');
    if (container) {
      if (this.items.length === 0) {
        container.innerHTML = `
          <div class="cart-empty-state">
            <h4>Your Shopping Bag is Empty</h4>
            <p>Explore our ready-to-wear drops and find your next statement piece.</p>
            <button class="pill-btn pill-btn-primary" onclick="window.cart.closeDrawer()">
              Explore Arrivals
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
              <div class="cart-item-meta">Size: ${item.size} • ${item.color}</div>
              <div class="cart-item-price">${window.STORE_CONFIG.formatPrice(item.price)}</div>
              <div class="cart-item-qty-row">
                <div class="qty-stepper">
                  <button type="button" class="qty-btn" onclick="window.cart.updateQuantity(${index}, -1)">
                    ${window.ICONS ? window.ICONS.minus : '-'}
                  </button>
                  <span class="qty-value">${item.quantity}</span>
                  <button type="button" class="qty-btn" onclick="window.cart.updateQuantity(${index}, 1)">
                    ${window.ICONS ? window.ICONS.plus : '+'}
                  </button>
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
    if (shippingEl) shippingEl.textContent = summary.shipping === 0 ? 'Complimentary' : window.STORE_CONFIG.formatPrice(summary.shipping);
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
