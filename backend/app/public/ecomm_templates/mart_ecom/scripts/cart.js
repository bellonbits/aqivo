/**
 * Freshly Mart - Cart Management & Drawer Controller
 * STRICT RULE: ZERO EMOJIS!
 */

window.Cart = {
  items: [],

  init() {
    this.updateBadge();
  },

  addItem(item) {
    const existing = this.items.find(i => i.id === item.id && i.size === item.size);
    if (existing) {
      existing.quantity += (item.quantity || 1);
    } else {
      this.items.push({
        id: item.id,
        title: item.title,
        size: item.size || 'Standard',
        price: item.price,
        formattedPrice: item.formattedPrice || `KSh ${item.price.toLocaleString()}`,
        image: item.image,
        quantity: item.quantity || 1
      });
    }

    this.updateBadge();
    this.renderDrawer();
    this.openDrawer();
    window.App.showToast('Item Added to Cart', `${item.title} (${item.size || ''}) added successfully.`);
  },

  updateQuantity(index, delta) {
    if (this.items[index]) {
      this.items[index].quantity += delta;
      if (this.items[index].quantity <= 0) {
        this.items.splice(index, 1);
      }
      this.updateBadge();
      this.renderDrawer();
    }
  },

  removeItem(index) {
    if (this.items[index]) {
      const removed = this.items.splice(index, 1)[0];
      this.updateBadge();
      this.renderDrawer();
      window.App.showToast('Item Removed', `${removed.title} removed from cart.`);
    }
  },

  getTotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  getItemCount() {
    return this.items.reduce((count, item) => count + item.quantity, 0);
  },

  updateBadge() {
    const badges = document.querySelectorAll('.cart-badge-count');
    const count = this.getItemCount();
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  openDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    if (drawer) drawer.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-open');
    this.renderDrawer();
  },

  closeDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    if (drawer) drawer.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
  },

  renderDrawer() {
    const container = document.getElementById('cart-items-list');
    const subtotalEl = document.getElementById('cart-subtotal-val');
    const checkoutBtn = document.getElementById('btn-cart-checkout');
    if (!container) return;

    if (this.items.length === 0) {
      container.innerHTML = `
        <div class="empty-cart-view">
          <div class="empty-cart-icon svg-icon">${window.Icons.cart()}</div>
          <h4 style="font-size: 16px; font-weight: 700; color: var(--gray-800); margin-bottom: 4px;">Your cart is empty</h4>
          <p style="font-size: 13px; color: var(--gray-500); margin-bottom: 16px;">Add fresh groceries and baby essentials to begin.</p>
          <button type="button" class="btn-primary-purple" onclick="window.Cart.closeDrawer()" style="padding: 10px 24px; font-size: 13.5px;">
            Continue Shopping
          </button>
        </div>
      `;
      if (subtotalEl) subtotalEl.textContent = 'KSh 0';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    if (checkoutBtn) checkoutBtn.disabled = false;
    const total = this.getTotal();
    if (subtotalEl) subtotalEl.textContent = `KSh ${total.toLocaleString()}`;

    container.innerHTML = this.items.map((item, idx) => `
      <div class="cart-item-row">
        <img src="${item.image}" alt="${item.title}" class="cart-item-thumb" />
        <div class="cart-item-info">
          <h5 class="cart-item-title">${item.title}</h5>
          <span class="cart-item-meta">${item.size} • ${item.formattedPrice}</span>
          <div class="cart-qty-stepper">
            <button type="button" class="qty-btn" onclick="window.Cart.updateQuantity(${idx}, -1)">
              ${window.Icons.minus()}
            </button>
            <span class="qty-val">${item.quantity}</span>
            <button type="button" class="qty-btn" onclick="window.Cart.updateQuantity(${idx}, 1)">
              ${window.Icons.plus()}
            </button>
          </div>
        </div>
        <button type="button" class="btn-remove-item" onclick="window.Cart.removeItem(${idx})" title="Remove item">
          ${window.Icons.trash()}
        </button>
      </div>
    `).join('');
  },

  checkout() {
    if (this.items.length === 0) return;
    this.closeDrawer();
    window.App.openCheckoutModal();
  }
};
