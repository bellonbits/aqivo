/**
 * Grofresh - Modals & Overlays Controller
 */

class ModalManager {
  constructor() {
    this.selectedQuantity = 1;
    this.currentProduct = null;
    this.init();
  }

  init() {
    this.bindBackdropDismissals();
  }

  bindBackdropDismissals() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAllModals();
    });

    const closeButtons = document.querySelectorAll('.modal-close-trigger');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });
  }

  closeAllModals() {
    const modals = document.querySelectorAll('.app-modal-overlay');
    modals.forEach(m => m.classList.remove('is-open'));
    document.body.style.overflow = '';
  }

  openProductModal(productId) {
    const all = [
      ...(window.TODAYS_DEALS || []),
      ...(window.FRESH_FOOD_CATALOG || []),
      ...(window.SPOTLIGHT_PRODUCTS || []),
      ...(window.DAILY_BEST_SELLERS || []),
      ...(window.SEAFOOD_DEALS || []),
      ...(window.MONTHLY_GROCERY_DEAL || [])
    ];

    const prod = all.find(p => p.id === productId);
    if (!prod) return;

    this.currentProduct = prod;
    this.selectedQuantity = 1;

    const modal = document.getElementById('product-detail-modal');
    if (!modal) return;

    const imgEl = document.getElementById('modal-product-img');
    const badgeEl = document.getElementById('modal-product-badge');
    const catEl = document.getElementById('modal-product-cat');
    const titleEl = document.getElementById('modal-product-title');
    const unitEl = document.getElementById('modal-product-unit');
    const priceEl = document.getElementById('modal-product-price');
    const origPriceEl = document.getElementById('modal-product-orig-price');
    const descEl = document.getElementById('modal-product-desc');
    const qtyValEl = document.getElementById('modal-qty-val');

    if (imgEl) imgEl.src = prod.image;
    if (catEl) catEl.textContent = prod.category || "Fresh Grocery";
    if (titleEl) titleEl.textContent = prod.name;
    if (unitEl) unitEl.textContent = `(${prod.unit || '1 kg'})`;
    if (priceEl) priceEl.textContent = window.STORE_CONFIG.formatPrice(prod.price);
    if (origPriceEl) {
      if (prod.originalPrice) {
        origPriceEl.style.display = 'inline';
        origPriceEl.textContent = window.STORE_CONFIG.formatPrice(prod.originalPrice);
      } else {
        origPriceEl.style.display = 'none';
      }
    }
    if (badgeEl) {
      if (prod.badge) {
        badgeEl.style.display = 'inline-block';
        badgeEl.textContent = prod.badge;
      } else {
        badgeEl.style.display = 'none';
      }
    }
    if (descEl) descEl.textContent = prod.description || "Freshly sourced from certified local growers. Hand-selected for premium freshness, aroma, and crisp texture.";
    if (qtyValEl) qtyValEl.textContent = this.selectedQuantity;

    const addBtn = document.getElementById('modal-add-to-cart-btn');
    if (addBtn) {
      addBtn.onclick = () => {
        if (window.cart) {
          window.cart.addItem(prod, this.selectedQuantity);
        }
        this.closeAllModals();
      };
    }

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  adjustModalQty(delta) {
    this.selectedQuantity += delta;
    if (this.selectedQuantity < 1) this.selectedQuantity = 1;
    const qtyValEl = document.getElementById('modal-qty-val');
    if (qtyValEl) qtyValEl.textContent = this.selectedQuantity;
  }

  openCheckoutModal(summary) {
    const modal = document.getElementById('checkout-modal');
    if (!modal) return;

    const subtotalEl = document.getElementById('checkout-subtotal-val');
    const discountEl = document.getElementById('checkout-discount-val');
    const shippingEl = document.getElementById('checkout-shipping-val');
    const totalEl = document.getElementById('checkout-total-val');
    const countEl = document.getElementById('checkout-items-count');

    if (subtotalEl) subtotalEl.textContent = window.STORE_CONFIG.formatPrice(summary.subtotal);
    if (discountEl) discountEl.textContent = `- ${window.STORE_CONFIG.formatPrice(summary.discountAmount)}`;
    if (shippingEl) shippingEl.textContent = summary.shipping === 0 ? 'FREE' : window.STORE_CONFIG.formatPrice(summary.shipping);
    if (totalEl) totalEl.textContent = window.STORE_CONFIG.formatPrice(summary.total);
    if (countEl) countEl.textContent = `${summary.itemCount} item(s)`;

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  confirmCheckout() {
    const modal = document.getElementById('checkout-modal');
    const successModal = document.getElementById('checkout-success-modal');

    if (modal) modal.classList.remove('is-open');

    if (window.cart) {
      window.cart.items = [];
      window.cart.saveCart();
      window.cart.render();
    }

    if (successModal) {
      const orderNumEl = document.getElementById('success-order-number');
      if (orderNumEl) {
        orderNumEl.textContent = `GF-${Math.floor(100000 + Math.random() * 900000)}`;
      }
      successModal.classList.add('is-open');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.modals = new ModalManager();
});
