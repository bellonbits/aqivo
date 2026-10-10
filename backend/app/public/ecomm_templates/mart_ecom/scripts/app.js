/**
 * Freshly Mart - Complete Application Controller
 * Currency: Kenyan Shilling (KSh)
 * STRICT RULE: ZERO EMOJIS! 100% Crisp Vector SVG Glyphs.
 */

window.App = {
  wishlistCount: 0,
  likedItems: new Set(),
  currentModalProduct: null,
  modalSelectedSize: null,
  modalQuantity: 1,

  init() {
    this.renderHeaderIcons();
    this.renderCategoryRail();
    this.renderFeaturedProducts();
    this.renderTopVendors();
    this.renderBestSellers();
    this.renderTrendingProducts();
    this.setupEventListeners();
    this.startCountdownTimer();
    window.Cart.init();
  },

  renderHeaderIcons() {
    const userBtn = document.getElementById('btn-header-user');
    const wishlistBtn = document.getElementById('btn-header-wishlist');
    const cartBtn = document.getElementById('btn-header-cart');
    const menuBtn = document.getElementById('btn-header-menu');

    if (userBtn) userBtn.innerHTML = window.Icons.user();
    if (wishlistBtn) wishlistBtn.innerHTML = `${window.Icons.heart(false)}<span class="header-badge-count wishlist-badge-count">0</span>`;
    if (cartBtn) cartBtn.innerHTML = `${window.Icons.cart()}<span class="header-badge-count cart-badge-count">0</span>`;
    if (menuBtn) menuBtn.innerHTML = window.Icons.menuGrid();
  },

  renderCategoryRail() {
    const container = document.getElementById('category-pills-rail');
    if (!container) return;

    container.innerHTML = window.MartData.categories.map(cat => `
      <div class="category-pill-card" onclick="window.App.filterByCategory('${cat.name}')">
        <div class="cat-pill-icon-circle" style="background: ${cat.color};">
          <img src="${cat.image}" alt="${cat.name}" />
        </div>
        <div class="cat-pill-text-col">
          <span class="cat-pill-title">${cat.name}</span>
          <span class="cat-pill-items-sub">${cat.itemsCount}</span>
        </div>
      </div>
    `).join('');
  },

  // 1. Featured Products (5 items row)
  renderFeaturedProducts(products = window.MartData.featuredProducts) {
    const grid = document.getElementById('featured-products-grid');
    if (!grid) return;

    grid.innerHTML = products.map(prod => `
      <div class="trending-product-card" id="feat-card-${prod.id}">
        <div class="trend-card-top-row">
          <span class="trend-cat-tag">${prod.category}</span>
          <button 
            type="button" 
            class="trend-wishlist-btn" 
            data-wishlist-id="${prod.id}" 
            onclick="window.App.toggleWishlist('${prod.id}')"
            title="Save item"
          >
            ${window.Icons.heart(this.likedItems.has(prod.id))}
          </button>
        </div>

        <div class="trend-img-wrap" onclick="window.App.openProductDetail('${prod.id}')" style="cursor: pointer;">
          <img src="${prod.image}" alt="${prod.title}" loading="lazy" />
        </div>

        <div class="trend-sizes-row">
          ${prod.sizes.map((s, idx) => `
            <span class="trend-size-pill ${idx === 0 ? 'is-selected' : ''}" onclick="window.App.openProductDetail('${prod.id}', '${s}')">
              ${s}
            </span>
          `).join('')}
        </div>

        <div class="trend-price-row">
          <span class="trend-price-text">${prod.formattedPrice}</span>
          ${prod.discount ? `<span class="trend-discount-badge">${prod.discount}</span>` : ''}
        </div>

        <h4 class="trend-product-title" onclick="window.App.openProductDetail('${prod.id}')" style="cursor: pointer;">
          ${prod.title}
        </h4>

        <div class="trend-rating-row">
          <div class="stars-inline">
            ${Array(prod.rating).fill(0).map(() => window.Icons.star(true)).join('')}
          </div>
          <span class="trend-reviews-num">(${prod.reviews})</span>
        </div>

        <button 
          type="button" 
          class="btn-select-options" 
          onclick="window.App.openProductDetail('${prod.id}')"
        >
          <span class="svg-icon" style="margin-right: 6px;">${window.Icons.plus()}</span>
          <span>View Details & Options</span>
        </button>
      </div>
    `).join('');
  },

  filterFeatured(catName, el) {
    document.querySelectorAll('.filter-link-btn').forEach(b => b.classList.remove('is-active'));
    if (el) el.classList.add('is-active');

    if (catName === 'All') {
      this.renderFeaturedProducts(window.MartData.featuredProducts);
    } else {
      const filtered = window.MartData.featuredProducts.filter(p => p.category.toLowerCase().includes(catName.toLowerCase()));
      this.renderFeaturedProducts(filtered.length > 0 ? filtered : window.MartData.featuredProducts);
    }
  },

  // 2. Top Seller Vendors
  renderTopVendors() {
    const grid = document.getElementById('vendors-row-grid');
    if (!grid) return;

    grid.innerHTML = window.MartData.topVendors.map(v => `
      <div class="vendor-user-card" onclick="window.App.showToast('Vendor Selected', 'Viewing storefront for ${v.name}.')">
        <div class="vendor-avatar-circle">
          <img src="${v.image}" alt="${v.name}" />
        </div>
        <div class="vendor-name-col">
          <span class="vendor-name-text">${v.name}</span>
          <div class="vendor-stars-row">
            ${Array(v.rating).fill(0).map(() => window.Icons.star(true)).join('')}
          </div>
          <span class="vendor-items-count">${v.productsCount}</span>
        </div>
      </div>
    `).join('');
  },

  // 3. Best Sellers Section
  renderBestSellers() {
    const bs = window.MartData.bestSellers;
    const leftCol = document.getElementById('best-sellers-left-col');
    const centerCard = document.getElementById('best-sellers-center-card');
    const rightCol = document.getElementById('best-sellers-right-col');

    if (leftCol) {
      leftCol.innerHTML = bs.leftItems.map(item => this.renderCompactBsCard(item)).join('');
    }

    if (rightCol) {
      rightCol.innerHTML = bs.rightItems.map(item => this.renderCompactBsCard(item)).join('');
    }

    if (centerCard) {
      const f = bs.centerFeature;
      centerCard.innerHTML = `
        <button 
          type="button" 
          class="feature-card-wishlist-btn" 
          data-wishlist-id="${f.id}" 
          onclick="event.stopPropagation(); window.App.toggleWishlist('${f.id}')"
          title="Save item"
        >
          ${window.Icons.heart(this.likedItems.has(f.id))}
        </button>

        <div class="feature-card-img-wrap" onclick="window.App.openProductDetail('${f.id}')" style="cursor: pointer;">
          <img src="${f.image}" alt="${f.title}" />
        </div>

        <div class="stars-inline" style="justify-content: center; margin-bottom: 6px;">
          ${Array(f.rating).fill(0).map(() => window.Icons.star(true)).join('')}
        </div>

        <h3 class="feature-card-title" onclick="window.App.openProductDetail('${f.id}')" style="cursor: pointer;">${f.title}</h3>

        <div class="hero-price-display-row" style="justify-content: center; margin-bottom: 12px;">
          <span class="hero-price-original">${f.formattedOriginal}</span>
          <span class="hero-price-current">${f.formattedPrice}</span>
        </div>

        <!-- Countdown Timer -->
        <div class="feature-countdown-box">
          <div class="countdown-block">
            <span class="countdown-num" id="cd-days">02</span>
            <span class="countdown-lbl">Days</span>
          </div>
          <div class="countdown-block">
            <span class="countdown-num" id="cd-hours">14</span>
            <span class="countdown-lbl">Hours</span>
          </div>
          <div class="countdown-block">
            <span class="countdown-num" id="cd-mins">35</span>
            <span class="countdown-lbl">Mins</span>
          </div>
          <div class="countdown-block">
            <span class="countdown-num" id="cd-secs">48</span>
            <span class="countdown-lbl">Secs</span>
          </div>
        </div>

        <!-- Progress Stock Bar -->
        <div class="feature-stock-progress-wrap">
          <div class="feature-stock-labels">
            <span>Available: <strong>${f.availableCount}</strong></span>
            <span>Sold: <strong>${f.soldCount}</strong></span>
          </div>
          <div class="bs-progress-bar-wrap" style="height: 6px;">
            <div class="bs-progress-bar-fill" style="width: 65%;"></div>
          </div>
        </div>

        <button 
          type="button" 
          class="btn-primary-purple" 
          style="width: 100%; height: 44px;" 
          onclick="window.App.openProductDetail('${f.id}')"
        >
          <span class="svg-icon">${window.Icons.cart()}</span>
          <span>View Details & Order</span>
        </button>
      `;
    }
  },

  renderCompactBsCard(item) {
    return `
      <div class="compact-bs-item-card" onclick="window.App.openProductDetail('${item.id}')" style="cursor: pointer;">
        <div class="bs-thumb-wrap">
          <img src="${item.image}" alt="${item.title}" />
        </div>
        <div class="bs-info-col">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="trend-discount-badge">${item.discount}</span>
            <button 
              type="button" 
              class="trend-wishlist-btn" 
              data-wishlist-id="${item.id}" 
              onclick="event.stopPropagation(); window.App.toggleWishlist('${item.id}')"
              style="width: 22px; height: 22px;"
            >
              ${window.Icons.heart(this.likedItems.has(item.id))}
            </button>
          </div>
          <h5 class="bs-title-text">${item.title}</h5>
          <span class="bs-price-text">${item.formattedPrice}</span>
          <div class="bs-progress-bar-wrap">
            <div class="bs-progress-bar-fill" style="width: ${item.soldPercent}%;"></div>
          </div>
        </div>
      </div>
    `;
  },

  startCountdownTimer() {
    let seconds = 48;
    let minutes = 35;
    let hours = 14;

    setInterval(() => {
      seconds--;
      if (seconds < 0) {
        seconds = 59;
        minutes--;
        if (minutes < 0) {
          minutes = 59;
          hours--;
        }
      }
      const sEl = document.getElementById('cd-secs');
      const mEl = document.getElementById('cd-mins');
      const hEl = document.getElementById('cd-hours');
      if (sEl) sEl.textContent = String(seconds).padStart(2, '0');
      if (mEl) mEl.textContent = String(minutes).padStart(2, '0');
      if (hEl) hEl.textContent = String(hours).padStart(2, '0');
    }, 1000);
  },

  // 4. Trending Products (10 items total)
  renderTrendingProducts(products = window.MartData.trendingProducts) {
    const grid = document.getElementById('trending-products-grid');
    if (!grid) return;

    grid.innerHTML = products.map(prod => `
      <div class="trending-product-card" id="card-${prod.id}">
        <div class="trend-card-top-row">
          <span class="trend-cat-tag">${prod.category}</span>
          <button 
            type="button" 
            class="trend-wishlist-btn" 
            data-wishlist-id="${prod.id}" 
            onclick="window.App.toggleWishlist('${prod.id}')"
            title="Save item"
          >
            ${window.Icons.heart(this.likedItems.has(prod.id))}
          </button>
        </div>

        <div class="trend-img-wrap" onclick="window.App.openProductDetail('${prod.id}')" style="cursor: pointer;">
          <img src="${prod.image}" alt="${prod.title}" loading="lazy" />
        </div>

        <div class="trend-sizes-row">
          ${prod.sizes.map((s, idx) => `
            <span class="trend-size-pill ${idx === 0 ? 'is-selected' : ''}" onclick="window.App.openProductDetail('${prod.id}', '${s}')">
              ${s}
            </span>
          `).join('')}
        </div>

        <div class="trend-price-row">
          <span class="trend-price-text">${prod.formattedPrice}</span>
          ${prod.discount ? `<span class="trend-discount-badge">${prod.discount}</span>` : ''}
        </div>

        <h4 class="trend-product-title" onclick="window.App.openProductDetail('${prod.id}')" style="cursor: pointer;">
          ${prod.title}
        </h4>

        <div class="trend-rating-row">
          <div class="stars-inline">
            ${Array(prod.rating).fill(0).map(() => window.Icons.star(true)).join('')}
          </div>
          <span class="trend-reviews-num">(${prod.reviews})</span>
        </div>

        <button 
          type="button" 
          class="btn-select-options" 
          onclick="window.App.openProductDetail('${prod.id}')"
        >
          <span class="svg-icon" style="margin-right: 6px;">${window.Icons.plus()}</span>
          <span>View Details & Options</span>
        </button>
      </div>
    `).join('');
  },

  // Lookup helper for any product in the Mart
  getProductById(id) {
    if (!window.MartData) return null;
    if (id === 'prod-aptamil-1' || id === window.MartData.heroProduct?.id) {
      return window.MartData.heroProduct;
    }
    const bsCenter = window.MartData.bestSellers?.centerFeature;
    if (bsCenter && bsCenter.id === id) {
      return bsCenter;
    }
    const feat = window.MartData.featuredProducts?.find(p => p.id === id);
    if (feat) return feat;
    const trend = window.MartData.trendingProducts?.find(p => p.id === id);
    if (trend) return trend;
    const bsLeft = window.MartData.bestSellers?.leftItems?.find(p => p.id === id);
    if (bsLeft) return bsLeft;
    const bsRight = window.MartData.bestSellers?.rightItems?.find(p => p.id === id);
    if (bsRight) return bsRight;
    return null;
  },

  // =========================================================================
  // INTERACTIVE PRODUCT DETAIL MODAL CONTROLLER
  // =========================================================================
  openProductDetail(prodId, defaultSize = null) {
    const prod = this.getProductById(prodId);
    if (!prod) {
      this.showToast('Item Details', 'Product information loading...');
      return;
    }

    this.currentModalProduct = prod;
    this.modalQuantity = 1;

    // Normalize options
    let options = prod.options;
    if (!options || options.length === 0) {
      if (prod.sizes && prod.sizes.length > 0) {
        options = prod.sizes.map((s, idx) => ({
          size: s,
          price: prod.price + (idx * 250),
          originalPrice: prod.originalPrice ? prod.originalPrice + (idx * 300) : null,
          formattedPrice: `KSh ${(prod.price + (idx * 250)).toLocaleString()}`
        }));
      } else {
        options = [{
          size: 'Standard',
          price: prod.price,
          originalPrice: prod.originalPrice,
          formattedPrice: prod.formattedPrice || `KSh ${prod.price.toLocaleString()}`
        }];
      }
    }
    prod.options = options;

    // Pick active option
    const activeOpt = (defaultSize && options.find(o => o.size.toLowerCase() === defaultSize.toLowerCase())) || options[0];
    this.modalSelectedSize = activeOpt.size;

    // Populate modal DOM
    const modal = document.getElementById('product-detail-modal');
    const mainImg = document.getElementById('pmodal-main-image');
    const thumbsRail = document.getElementById('pmodal-thumbs-rail');
    const discountBadge = document.getElementById('pmodal-discount-badge');
    const catTag = document.getElementById('pmodal-cat-tag');
    const skuEl = document.getElementById('pmodal-sku');
    const stockBadge = document.getElementById('pmodal-stock-badge');
    const titleEl = document.getElementById('pmodal-title');
    const starsEl = document.getElementById('pmodal-stars');
    const reviewsEl = document.getElementById('pmodal-reviews-count');
    const curPriceEl = document.getElementById('pmodal-price-current');
    const origPriceEl = document.getElementById('pmodal-price-original');
    const savingsEl = document.getElementById('pmodal-savings-pill');
    const sizesRail = document.getElementById('pmodal-sizes-rail');
    const qtyValEl = document.getElementById('pmodal-qty-val');
    const descEl = document.getElementById('pmodal-desc');
    const specsWrap = document.getElementById('pmodal-specs-wrap');
    const addLabel = document.getElementById('pmodal-add-label');
    const wishBtn = document.getElementById('pmodal-btn-wish');

    const primaryImage = (prod.images && prod.images[0]) || prod.image;
    if (mainImg) mainImg.src = primaryImage;

    // Gallery Thumbs
    if (thumbsRail) {
      if (prod.images && prod.images.length > 1) {
        thumbsRail.style.display = 'flex';
        thumbsRail.innerHTML = prod.images.map((imgSrc, idx) => `
          <div class="pmodal-thumb-item ${idx === 0 ? 'is-active' : ''}" onclick="window.App.switchModalImage('${imgSrc}', this)">
            <img src="${imgSrc}" alt="${prod.title} view ${idx + 1}" />
          </div>
        `).join('');
      } else {
        thumbsRail.style.display = 'none';
        thumbsRail.innerHTML = '';
      }
    }

    if (discountBadge) {
      discountBadge.textContent = prod.discount || '-12%';
      discountBadge.style.display = prod.discount ? 'inline-block' : 'none';
    }

    if (catTag) catTag.textContent = prod.category || 'Fresh Harvest';
    if (skuEl) skuEl.textContent = `SKU: ${prod.sku || 'FMT-202'}`;
    if (stockBadge) stockBadge.textContent = `In Stock (${prod.availability || prod.availableCount || 28} left)`;
    if (titleEl) titleEl.textContent = prod.title;

    if (starsEl) {
      starsEl.innerHTML = Array(prod.rating || 5).fill(0).map(() => window.Icons.star(true)).join('');
    }
    if (reviewsEl) {
      reviewsEl.textContent = `(${prod.reviews || prod.reviewsCount || 24} customer reviews)`;
    }

    if (curPriceEl) curPriceEl.textContent = activeOpt.formattedPrice || `KSh ${activeOpt.price.toLocaleString()}`;
    if (origPriceEl) {
      if (activeOpt.originalPrice || prod.originalPrice) {
        const orig = activeOpt.originalPrice || prod.originalPrice;
        origPriceEl.textContent = `KSh ${orig.toLocaleString()}`;
        origPriceEl.style.display = 'inline';
      } else {
        origPriceEl.style.display = 'none';
      }
    }

    if (savingsEl) {
      const orig = activeOpt.originalPrice || prod.originalPrice;
      if (orig && orig > activeOpt.price) {
        savingsEl.textContent = `Save KSh ${(orig - activeOpt.price).toLocaleString()}`;
        savingsEl.style.display = 'inline-block';
      } else {
        savingsEl.style.display = 'none';
      }
    }

    // Sizes Rail
    if (sizesRail) {
      sizesRail.innerHTML = options.map(opt => `
        <button 
          type="button" 
          class="pmodal-size-pill ${opt.size === this.modalSelectedSize ? 'is-active' : ''}" 
          data-size="${opt.size}"
          onclick="window.App.selectModalSize('${opt.size}')"
        >
          ${opt.size}
        </button>
      `).join('');
    }

    if (qtyValEl) qtyValEl.textContent = '1';
    if (descEl) descEl.textContent = prod.shortDesc || prod.longDesc || 'Premium farm-fresh selection grown with sustainable agricultural standards in Kenya.';

    // Specs
    if (specsWrap) {
      const sp = prod.specs || {};
      const specsList = [
        { lbl: 'Weight/Vol', val: sp.weight || sp.volume || activeOpt.size },
        { lbl: 'Brand', val: sp.brand || 'Freshly Mart' },
        { lbl: 'Origin', val: sp.origin || 'Kenya Highlands' },
        { lbl: 'Shelf Life', val: sp.shelfLife || sp.storage || 'Fresh Quality' }
      ];
      specsWrap.innerHTML = specsList.map(s => `
        <div class="pmodal-spec-row">
          <span class="pmodal-spec-lbl">${s.lbl}:</span>
          <span class="pmodal-spec-val">${s.val}</span>
        </div>
      `).join('');
    }

    if (addLabel) {
      addLabel.textContent = `Add to Cart • ${activeOpt.formattedPrice || 'KSh ' + activeOpt.price.toLocaleString()}`;
    }

    if (wishBtn) {
      wishBtn.innerHTML = window.Icons.heart(this.likedItems.has(prod.id));
      wishBtn.classList.toggle('is-active', this.likedItems.has(prod.id));
    }

    if (modal) {
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
  },

  switchModalImage(src, el) {
    const mainImg = document.getElementById('pmodal-main-image');
    if (mainImg) mainImg.src = src;
    document.querySelectorAll('.pmodal-thumb-item').forEach(t => t.classList.remove('is-active'));
    if (el) el.classList.add('is-active');
  },

  selectModalSize(size) {
    if (!this.currentModalProduct) return;
    this.modalSelectedSize = size;
    const opts = this.currentModalProduct.options || [];
    const chosen = opts.find(o => o.size === size) || opts[0];
    if (!chosen) return;

    const curPriceEl = document.getElementById('pmodal-price-current');
    const origPriceEl = document.getElementById('pmodal-price-original');
    const savingsEl = document.getElementById('pmodal-savings-pill');
    const addLabel = document.getElementById('pmodal-add-label');

    if (curPriceEl) curPriceEl.textContent = chosen.formattedPrice || `KSh ${chosen.price.toLocaleString()}`;
    if (origPriceEl) {
      if (chosen.originalPrice) {
        origPriceEl.textContent = `KSh ${chosen.originalPrice.toLocaleString()}`;
        origPriceEl.style.display = 'inline';
      } else {
        origPriceEl.style.display = 'none';
      }
    }

    if (savingsEl) {
      if (chosen.originalPrice && chosen.originalPrice > chosen.price) {
        savingsEl.textContent = `Save KSh ${(chosen.originalPrice - chosen.price).toLocaleString()}`;
        savingsEl.style.display = 'inline-block';
      } else {
        savingsEl.style.display = 'none';
      }
    }

    const total = chosen.price * this.modalQuantity;
    if (addLabel) addLabel.textContent = `Add to Cart • KSh ${total.toLocaleString()}`;

    document.querySelectorAll('.pmodal-size-pill').forEach(pill => {
      pill.classList.toggle('is-active', pill.getAttribute('data-size') === size);
    });
  },

  updateModalQty(delta) {
    this.modalQuantity = Math.max(1, this.modalQuantity + delta);
    const qtyValEl = document.getElementById('pmodal-qty-val');
    if (qtyValEl) qtyValEl.textContent = this.modalQuantity;

    const opts = this.currentModalProduct?.options || [];
    const chosen = opts.find(o => o.size === this.modalSelectedSize) || opts[0];
    const unitPrice = chosen ? chosen.price : (this.currentModalProduct?.price || 0);
    const total = unitPrice * this.modalQuantity;
    const addLabel = document.getElementById('pmodal-add-label');
    if (addLabel) addLabel.textContent = `Add to Cart • KSh ${total.toLocaleString()}`;
  },

  addModalProductToCart() {
    if (!this.currentModalProduct) return;
    const p = this.currentModalProduct;
    const opts = p.options || [];
    const chosen = opts.find(o => o.size === this.modalSelectedSize) || opts[0];
    const unitPrice = chosen ? chosen.price : (p.price || 0);

    window.Cart.addItem({
      id: `${p.id}-${this.modalSelectedSize || 'std'}`,
      title: p.title,
      size: this.modalSelectedSize || 'Standard',
      price: unitPrice,
      formattedPrice: `KSh ${unitPrice.toLocaleString()}`,
      image: (p.images && p.images[0]) || p.image,
      quantity: this.modalQuantity
    });

    this.closeProductDetailModal();
  },

  buyNowModalProduct() {
    this.addModalProductToCart();
    window.Cart.closeDrawer();
    window.App.openCheckoutModal();
  },

  toggleModalWishlist() {
    if (!this.currentModalProduct) return;
    this.toggleWishlist(this.currentModalProduct.id);
    const btn = document.getElementById('pmodal-btn-wish');
    if (btn) {
      btn.innerHTML = window.Icons.heart(this.likedItems.has(this.currentModalProduct.id));
      btn.classList.toggle('is-active', this.likedItems.has(this.currentModalProduct.id));
    }
  },

  closeProductDetailModal() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) modal.classList.remove('is-open');
    document.body.style.overflow = '';
  },

  handleModalBackdropClick(event) {
    if (event.target.id === 'product-detail-modal') {
      this.closeProductDetailModal();
    }
  },

  // =========================================================================
  // MOBILE NAVIGATION DRAWER CONTROLLER
  // =========================================================================
  toggleMobileMenu() {
    const drawer = document.getElementById('mobile-menu-drawer');
    const backdrop = document.getElementById('mobile-menu-backdrop');
    if (drawer && backdrop) {
      const isOpen = drawer.classList.contains('is-open');
      drawer.classList.toggle('is-open', !isOpen);
      backdrop.classList.toggle('is-open', !isOpen);
      document.body.style.overflow = !isOpen ? 'hidden' : '';
    }
  },

  closeMobileMenu() {
    const drawer = document.getElementById('mobile-menu-drawer');
    const backdrop = document.getElementById('mobile-menu-backdrop');
    if (drawer) drawer.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
    document.body.style.overflow = '';
  },

  handleMobileSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    const mainInput = document.getElementById('main-search-input');
    if (mainInput) mainInput.value = event.target.value;
    if (!query) {
      this.renderTrendingProducts();
      this.renderFeaturedProducts();
      return;
    }
    const filteredTrend = window.MartData.trendingProducts.filter(p => 
      p.title.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)
    );
    const filteredFeat = window.MartData.featuredProducts.filter(p => 
      p.title.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)
    );
    this.renderTrendingProducts(filteredTrend);
    this.renderFeaturedProducts(filteredFeat);
  },

  // =========================================================================
  // WISHLIST & MISC CONTROLLERS
  // =========================================================================
  toggleWishlist(itemId) {
    const countBadge = document.querySelector('.wishlist-badge-count');
    if (this.likedItems.has(itemId)) {
      this.likedItems.delete(itemId);
      this.wishlistCount = Math.max(0, this.wishlistCount - 1);
      this.showToast('Wishlist', 'Item removed from your wishlist.');
    } else {
      this.likedItems.add(itemId);
      this.wishlistCount++;
      this.showToast('Wishlist', 'Item saved to your wishlist.');
    }

    if (countBadge) {
      countBadge.textContent = this.wishlistCount;
      countBadge.style.display = this.wishlistCount > 0 ? 'flex' : 'none';
    }

    document.querySelectorAll(`[data-wishlist-id="${itemId}"]`).forEach(btn => {
      btn.innerHTML = window.Icons.heart(this.likedItems.has(itemId));
    });
  },

  filterByCategory(catName) {
    if (catName === 'All') {
      this.renderTrendingProducts(window.MartData.trendingProducts);
      this.renderFeaturedProducts(window.MartData.featuredProducts);
      this.showToast('All Categories', 'Displaying full catalogue.');
      return;
    }
    const filteredTrend = window.MartData.trendingProducts.filter(p => 
      p.category.toLowerCase().includes(catName.toLowerCase()) || 
      catName.toLowerCase().includes(p.category.toLowerCase())
    );
    const filteredFeat = window.MartData.featuredProducts.filter(p => 
      p.category.toLowerCase().includes(catName.toLowerCase()) || 
      catName.toLowerCase().includes(p.category.toLowerCase())
    );
    this.renderTrendingProducts(filteredTrend.length > 0 ? filteredTrend : window.MartData.trendingProducts);
    this.renderFeaturedProducts(filteredFeat.length > 0 ? filteredFeat : window.MartData.featuredProducts);
    this.showToast('Department Filter', `Showing items in ${catName}.`);
    
    const target = document.getElementById('section-featured') || document.getElementById('section-trending');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  openCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    const itemsCountEl = document.getElementById('checkout-total-items');
    const totalEl = document.getElementById('checkout-total-amt');
    if (!modal) return;

    if (itemsCountEl) itemsCountEl.textContent = `${window.Cart.getItemCount()} items`;
    if (totalEl) totalEl.textContent = `KSh ${window.Cart.getTotal().toLocaleString()}`;
    modal.classList.add('is-open');
  },

  closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.classList.remove('is-open');
  },

  confirmCheckout() {
    const nameInput = document.getElementById('checkout-client-name');
    const phoneInput = document.getElementById('checkout-client-phone');
    const name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'Guest Customer';
    const phone = phoneInput && phoneInput.value.trim() ? phoneInput.value.trim() : '+254 700 000 000';

    this.closeCheckoutModal();
    window.Cart.items = [];
    window.Cart.updateBadge();

    this.showToast(
      'Order Placed Successfully',
      `Thank you, ${name}! Your order has been scheduled for same-day dispatch. M-Pesa prompt sent to ${phone}.`
    );
  },

  showToast(title, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.innerHTML = `
      <div class="toast-icon svg-icon">${window.Icons.check()}</div>
      <div>
        <div style="font-weight: 700; font-size: 13.5px; margin-bottom: 2px;">${title}</div>
        <div style="font-size: 12.5px; color: var(--gray-300);">${message}</div>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  setupEventListeners() {
    const searchInput = document.getElementById('main-search-input');
    const searchBtn = document.getElementById('btn-search-submit');

    const handleSearch = () => {
      const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
      if (!query) {
        this.renderTrendingProducts();
        this.renderFeaturedProducts();
        return;
      }
      const filteredTrend = window.MartData.trendingProducts.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
      const filteredFeat = window.MartData.featuredProducts.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
      this.renderTrendingProducts(filteredTrend);
      this.renderFeaturedProducts(filteredFeat);
      this.showToast('Search Results', `Found ${filteredTrend.length + filteredFeat.length} matching products.`);
    };

    if (searchInput) {
      searchInput.addEventListener('input', handleSearch);
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', handleSearch);
    }

    // ESC key closes modals & drawer
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeProductDetailModal();
        this.closeMobileMenu();
        this.closeCheckoutModal();
        window.Cart.closeDrawer();
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
