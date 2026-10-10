/**
 * FootWear - Modals & Overlays Controller
 * Product Quick View, Checkout Simulation, Wishlist Modal, Event Details.
 */

class ModalManager {
  constructor() {
    this.selectedSize = 42;
    this.selectedQuantity = 1;
    this.currentProduct = null;
    this.init();
  }

  init() {
    this.bindBackdropDismissals();
  }

  bindBackdropDismissals() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
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
      ...(window.CATALOG_PRODUCTS || []),
      ...(window.BEST_DEALS || []),
      {
        id: 'hero-eastside',
        name: window.HERO_FEATURED?.main?.title || 'AIR JORDAN 6 G X EASTSIDE',
        brand: 'Jordan Brand',
        price: 3699000,
        originalPrice: 4200000,
        rating: 5.0,
        soldCount: 88,
        image: 'assets/hero_eastside_jordan.jpg',
        sizes: [40, 41, 42, 43, 44, 45],
        description: 'Crafted in celebration of the 1993 classic, this shoe blends vintage golf heritage with modern streetwear swagger for everyday flex and athletic poise. Includes collector shoebox.'
      }
    ];

    const prod = all.find(p => p.id === productId);
    if (!prod) return;

    this.currentProduct = prod;
    this.selectedSize = prod.sizes ? prod.sizes[0] : 42;
    this.selectedQuantity = 1;

    const modal = document.getElementById('product-detail-modal');
    if (!modal) return;

    // Fill Modal Data
    const imgEl = document.getElementById('modal-product-img');
    const brandEl = document.getElementById('modal-product-brand');
    const titleEl = document.getElementById('modal-product-title');
    const ratingEl = document.getElementById('modal-product-rating');
    const soldEl = document.getElementById('modal-product-sold');
    const priceEl = document.getElementById('modal-product-price');
    const origPriceEl = document.getElementById('modal-product-orig-price');
    const descEl = document.getElementById('modal-product-desc');
    const sizesContainer = document.getElementById('modal-sizes-grid');

    if (imgEl) imgEl.src = prod.image;
    if (brandEl) brandEl.textContent = prod.brand || 'FootWear Exclusive';
    if (titleEl) titleEl.textContent = prod.name;
    if (ratingEl) ratingEl.textContent = `★ ${prod.rating || 4.9}`;
    if (soldEl) soldEl.textContent = `${prod.soldCount || 100} sold`;
    if (priceEl) priceEl.textContent = window.STORE_CONFIG.formatPrice(prod.price);
    if (origPriceEl) {
      if (prod.originalPrice) {
        origPriceEl.style.display = 'inline';
        origPriceEl.textContent = window.STORE_CONFIG.formatPrice(prod.originalPrice);
      } else {
        origPriceEl.style.display = 'none';
      }
    }
    if (descEl) descEl.textContent = prod.description || 'Exclusive premium edition sneaker crafted from fine materials with precision-engineered sole cushioning.';

    // Render Size Pills
    if (sizesContainer) {
      const availableSizes = prod.sizes || [39, 40, 41, 42, 43, 44];
      sizesContainer.innerHTML = availableSizes.map(sz => `
        <button type="button" class="size-pill-btn ${sz === this.selectedSize ? 'active' : ''}" onclick="window.modals.selectSize(${sz}, this)">
          EU ${sz}
        </button>
      `).join('');
    }

    // Bind Add to Cart & Buy Now
    const addBtn = document.getElementById('modal-add-to-cart-btn');
    const buyBtn = document.getElementById('modal-buy-now-btn');

    if (addBtn) {
      addBtn.onclick = () => {
        if (window.cart) {
          window.cart.addItem(prod, this.selectedSize, this.selectedQuantity);
        }
        this.closeAllModals();
      };
    }

    if (buyBtn) {
      buyBtn.onclick = () => {
        if (window.cart) {
          window.cart.addItem(prod, this.selectedSize, this.selectedQuantity);
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

  openEventModal() {
    const modal = document.getElementById('event-detail-modal');
    if (modal) {
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
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
    if (countEl) countEl.textContent = `${summary.itemCount} item(s)`;

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  confirmCheckout() {
    const modal = document.getElementById('checkout-modal');
    const successModal = document.getElementById('checkout-success-modal');

    if (modal) modal.classList.remove('is-open');

    // Clear cart
    if (window.cart) {
      window.cart.items = [];
      window.cart.saveCart();
      window.cart.render();
    }

    if (successModal) {
      const orderNumEl = document.getElementById('success-order-number');
      if (orderNumEl) {
        orderNumEl.textContent = `FW-${Math.floor(100000 + Math.random() * 900000)}`;
      }
      successModal.classList.add('is-open');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.modals = new ModalManager();
});
