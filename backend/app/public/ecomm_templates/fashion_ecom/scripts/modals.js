/**
 * LUXINA - Modals & Overlays Controller
 */

class ModalManager {
  constructor() {
    this.selectedSize = "M";
    this.selectedColor = "Default";
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
      ...(window.NEW_ARRIVALS || []),
      ...(window.WOMEN_SALE || []),
      ...(window.MEN_SALE || [])
    ];

    const prod = all.find(p => p.id === productId);
    if (!prod) return;

    this.currentProduct = prod;
    this.selectedSize = prod.sizes ? prod.sizes[0] : "M";
    this.selectedColor = prod.colors ? prod.colors[0] : "Default";

    const modal = document.getElementById('product-detail-modal');
    if (!modal) return;

    const imgEl = document.getElementById('modal-product-img');
    const catEl = document.getElementById('modal-product-cat');
    const titleEl = document.getElementById('modal-product-title');
    const priceEl = document.getElementById('modal-product-price');
    const origPriceEl = document.getElementById('modal-product-orig-price');
    const descEl = document.getElementById('modal-product-desc');
    const sizesContainer = document.getElementById('modal-sizes-grid');

    if (imgEl) imgEl.src = prod.image;
    if (catEl) catEl.textContent = prod.category || "COLLECTION";
    if (titleEl) titleEl.textContent = prod.name;
    if (priceEl) priceEl.textContent = window.STORE_CONFIG.formatPrice(prod.price);
    if (origPriceEl) {
      if (prod.originalPrice) {
        origPriceEl.style.display = 'inline';
        origPriceEl.textContent = window.STORE_CONFIG.formatPrice(prod.originalPrice);
      } else {
        origPriceEl.style.display = 'none';
      }
    }
    if (descEl) descEl.textContent = prod.description || "Designed with refined proportions, luxurious tactile fabrication, and modern craftsmanship.";

    if (sizesContainer) {
      const availableSizes = prod.sizes || ["S", "M", "L"];
      sizesContainer.innerHTML = availableSizes.map(sz => `
        <button type="button" class="size-pill-btn ${sz === this.selectedSize ? 'active' : ''}" onclick="window.modals.selectSize('${sz}', this)">
          ${sz}
        </button>
      `).join('');
    }

    const addBtn = document.getElementById('modal-add-to-cart-btn');
    const buyBtn = document.getElementById('modal-buy-now-btn');

    if (addBtn) {
      addBtn.onclick = () => {
        if (window.cart) {
          window.cart.addItem(prod, this.selectedSize, this.selectedColor, 1);
        }
        this.closeAllModals();
      };
    }

    if (buyBtn) {
      buyBtn.onclick = () => {
        if (window.cart) {
          window.cart.addItem(prod, this.selectedSize, this.selectedColor, 1);
        }
        this.closeAllModals();
        window.cart.openDrawer();
      };
    }

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  selectSize(size, btn) {
    this.selectedSize = size;
    const allBtns = document.querySelectorAll('#modal-sizes-grid .size-pill-btn');
    allBtns.forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
  }

  openCheckoutModal(summary) {
    const modal = document.getElementById('checkout-modal');
    if (!modal) return;

    const subtotalEl = document.getElementById('checkout-subtotal-val');
    const discountEl = document.getElementById('checkout-discount-val');
    const totalEl = document.getElementById('checkout-total-val');
    const countEl = document.getElementById('checkout-items-count');

    if (subtotalEl) subtotalEl.textContent = window.STORE_CONFIG.formatPrice(summary.subtotal);
    if (discountEl) discountEl.textContent = `- ${window.STORE_CONFIG.formatPrice(summary.discountAmount)}`;
    if (totalEl) totalEl.textContent = window.STORE_CONFIG.formatPrice(summary.total);
    if (countEl) countEl.textContent = `${summary.itemCount} piece(s)`;

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
        orderNumEl.textContent = `LX-${Math.floor(100000 + Math.random() * 900000)}`;
      }
      successModal.classList.add('is-open');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.modals = new ModalManager();
});
