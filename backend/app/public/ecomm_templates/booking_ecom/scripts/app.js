/**
 * LPG Beauty & Clinic - Main App Controller
 * STRICT CONSTRAINT: ZERO EMOJIS!
 */

window.App = {
  activeCategory: 'LPG body',
  activeView: 'salon', // 'salon' or 'bookings'

  init() {
    this.renderHeader();
    this.renderSalonHero();
    this.renderGallery();
    this.renderAbout();
    this.renderServicesCategories();
    this.renderServicesList();
    this.renderSchedule();
    this.renderTeam();
    this.renderReviews();
    this.renderNearbySalons();

    window.BookingEngine.init();
    window.Appointments.init();

    this.setupEventListeners();
  },

  // View Switcher: Salon View (Image 1) vs My Bookings (Image 2)
  switchView(viewName) {
    this.activeView = viewName;
    const salonView = document.getElementById('view-salon-overview');
    const bookingsView = document.getElementById('view-appointments-screen');
    const btnSalon = document.getElementById('nav-tab-salon');
    const btnBookings = document.getElementById('nav-tab-bookings');

    if (viewName === 'salon') {
      if (salonView) salonView.classList.add('is-active');
      if (bookingsView) bookingsView.classList.remove('is-active');
      if (btnSalon) btnSalon.classList.add('is-active');
      if (btnBookings) btnBookings.classList.remove('is-active');
    } else {
      if (salonView) salonView.classList.remove('is-active');
      if (bookingsView) bookingsView.classList.add('is-active');
      if (btnSalon) btnSalon.classList.remove('is-active');
      if (btnBookings) btnBookings.classList.add('is-active');
      window.Appointments.render();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Header Rendering
  renderHeader() {
    const menuBtn = document.getElementById('btn-header-menu');
    const searchBtn = document.getElementById('btn-header-search');

    if (menuBtn) {
      menuBtn.innerHTML = `${window.Icons.gridMenu()}<span>Menu</span>`;
    }
    if (searchBtn) {
      searchBtn.innerHTML = window.Icons.search();
    }
  },

  // Salon Identity Bar (Image 1)
  renderSalonHero() {
    const s = window.SalonData.salon;
    const bodyBadge = document.getElementById('badge-body-contour');
    const faceBadge = document.getElementById('badge-face-contour');
    const salonTitle = document.getElementById('salon-title-text');
    const starIcon = document.getElementById('salon-star-icon');
    const pinIcon = document.getElementById('salon-pin-icon');
    const extIcon = document.getElementById('salon-ext-icon');
    const likeBtn = document.getElementById('btn-header-like');
    const shareBtn = document.getElementById('btn-header-share');

    if (bodyBadge) bodyBadge.innerHTML = window.Icons.bodyContourBadge();
    if (faceBadge) faceBadge.innerHTML = window.Icons.faceContourBadge();
    if (salonTitle) salonTitle.textContent = s.name;
    if (starIcon) starIcon.innerHTML = window.Icons.star(true);
    if (pinIcon) pinIcon.innerHTML = window.Icons.pin();
    if (extIcon) extIcon.innerHTML = window.Icons.externalLink();
    if (likeBtn) likeBtn.innerHTML = window.Icons.heart(false);
    if (shareBtn) shareBtn.innerHTML = window.Icons.share();
  },

  // Gallery Showcase
  renderGallery() {
    const g = window.SalonData.salon.gallery;
    const container = document.getElementById('treatment-gallery-container');
    if (!container) return;

    container.innerHTML = `
      <div class="gallery-card">
        <button type="button" class="gallery-arrow-btn prev-btn" onclick="window.BookingEngine.galleryPrev()" title="Previous photo">
          ${window.Icons.chevronLeft()}
        </button>
        <img src="${g[0].src}" alt="${g[0].caption}" />
      </div>
      <div class="gallery-card">
        <img src="${g[1].src}" alt="${g[1].caption}" />
      </div>
      <div class="gallery-card">
        <button type="button" class="gallery-arrow-btn next-btn" onclick="window.BookingEngine.galleryNext()" title="Next photo">
          ${window.Icons.chevronRight()}
        </button>
        <img src="${g[2].src}" alt="${g[2].caption}" />
      </div>
    `;
  },

  // About Section
  renderAbout() {
    const s = window.SalonData.salon;
    const phoneIcon = document.getElementById('about-phone-icon');
    const mailIcon = document.getElementById('about-mail-icon');
    const clockIcon = document.getElementById('about-clock-icon');
    const descText = document.getElementById('about-description-text');
    const readMoreBtn = document.getElementById('about-read-more-btn');

    if (phoneIcon) phoneIcon.innerHTML = window.Icons.phone();
    if (mailIcon) mailIcon.innerHTML = window.Icons.mail();
    if (clockIcon) clockIcon.innerHTML = window.Icons.clock();
    if (descText) descText.textContent = s.aboutText;
    if (readMoreBtn) {
      readMoreBtn.innerHTML = `<span>Read more</span>${window.Icons.chevronDown()}`;
    }
  },

  toggleAboutText() {
    const desc = document.getElementById('about-description-text');
    const btn = document.getElementById('about-read-more-btn');
    if (!desc || !btn) return;

    if (desc.getAttribute('data-expanded') === 'true') {
      desc.textContent = window.SalonData.salon.aboutText;
      desc.removeAttribute('data-expanded');
      btn.innerHTML = `<span>Read more</span>${window.Icons.chevronDown()}`;
    } else {
      desc.textContent = window.SalonData.salon.aboutText + " Our state-of-the-art French LPG Endermologie devices deliver non-invasive cellular reactivation for visible lifting, deep lymphatic drainage, and body shaping results backed by clinical science.";
      desc.setAttribute('data-expanded', 'true');
      btn.innerHTML = `<span>Read less</span>${window.Icons.chevronUp()}`;
    }
  },

  // Services Categories & List
  renderServicesCategories() {
    const sidebar = document.getElementById('services-category-sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = window.SalonData.categories.map(cat => `
      <div 
        class="category-radio-item ${cat.key === this.activeCategory ? 'is-selected' : ''}" 
        onclick="window.App.selectCategory('${cat.key}')"
      >
        <div class="radio-bullet">
          <div class="radio-bullet-inner"></div>
        </div>
        <span>${cat.name} (${cat.count})</span>
      </div>
    `).join('');
  },

  selectCategory(categoryKey) {
    this.activeCategory = categoryKey;
    this.renderServicesCategories();
    this.renderServicesList();
  },

  renderServicesList() {
    const container = document.getElementById('services-cards-col');
    if (!container) return;

    const filtered = window.SalonData.services.filter(s => s.category === this.activeCategory);

    container.innerHTML = filtered.map(s => `
      <div class="service-item-card" id="card-${s.id}">
        <div class="service-card-main-row">
          <div class="service-info-col">
            <h4 class="service-name-text">${s.name}</h4>
            <div class="service-meta-line">
              <span>${s.duration}</span>
              ${s.description ? `
                <span>•</span>
                <span class="service-toggle-desc-link" onclick="window.App.toggleServiceDesc('${s.id}')">
                  <span id="label-desc-${s.id}">${s.defaultExpanded ? 'Read less' : 'Read more'}</span>
                  <span class="svg-icon" id="arrow-desc-${s.id}">${s.defaultExpanded ? window.Icons.chevronUp() : window.Icons.chevronDown()}</span>
                </span>
              ` : ''}
            </div>
          </div>

          <div class="service-action-col">
            <div class="service-price-wrap">
              ${s.formattedOriginalPrice ? `<span class="service-old-price">${s.formattedOriginalPrice}</span>` : ''}
              <span>${s.formattedPrice}</span>
            </div>
            <button type="button" class="btn-service-book" onclick="window.BookingEngine.openBooking('${s.id}')">
              Book
            </button>
          </div>
        </div>

        ${s.description ? `
          <div class="service-desc-drawer ${s.defaultExpanded ? 'is-open' : ''}" id="desc-${s.id}">
            ${s.description}
          </div>
        ` : ''}
      </div>
    `).join('');
  },

  toggleServiceDesc(serviceId) {
    const drawer = document.getElementById(`desc-${serviceId}`);
    const label = document.getElementById(`label-desc-${serviceId}`);
    const arrow = document.getElementById(`arrow-desc-${serviceId}`);
    if (!drawer) return;

    const isOpen = drawer.classList.contains('is-open');
    if (isOpen) {
      drawer.classList.remove('is-open');
      if (label) label.textContent = 'Read more';
      if (arrow) arrow.innerHTML = window.Icons.chevronDown();
    } else {
      drawer.classList.add('is-open');
      if (label) label.textContent = 'Read less';
      if (arrow) arrow.innerHTML = window.Icons.chevronUp();
    }
  },

  // Timetable Schedule
  renderSchedule() {
    const list = document.getElementById('hours-schedule-list');
    if (!list) return;

    list.innerHTML = window.SalonData.salon.schedule.map(d => `
      <div class="schedule-day-row ${d.active ? 'is-today' : ''}">
        <div>
          ${d.active ? `<span class="day-status-dot"></span>` : ''}
          <span>${d.day}</span>
        </div>
        <span>${d.hours}</span>
      </div>
    `).join('');
  },

  // Team Specialists
  renderTeam() {
    const row = document.getElementById('team-members-row');
    const arrowLeft = document.getElementById('team-arrow-left');
    const arrowRight = document.getElementById('team-arrow-right');

    if (arrowLeft) arrowLeft.innerHTML = window.Icons.chevronLeft();
    if (arrowRight) arrowRight.innerHTML = window.Icons.chevronRight();

    if (!row) return;

    row.innerHTML = window.SalonData.team.map(m => `
      <div class="team-member-item">
        <div class="team-avatar-frame">
          ${m.image ? `
            <img src="${m.image}" alt="${m.name}" class="team-avatar-img" />
          ` : `
            <div class="team-avatar-initials">${m.initials}</div>
          `}
          ${m.rating ? `
            <div class="team-rating-badge">
              ${window.Icons.star(true)}
              <span>${m.rating}</span>
            </div>
          ` : ''}
        </div>
        <span class="team-member-name">${m.name}</span>
        <span class="team-member-role">${m.role}</span>
      </div>
    `).join('');
  },

  scrollTeam(direction) {
    const row = document.getElementById('team-members-row');
    if (row) {
      row.scrollBy({ left: direction * 220, behavior: 'smooth' });
    }
  },

  // Reviews Breakdown & Feed
  renderReviews() {
    const data = window.SalonData.reviewsData;
    const scoreStars = document.getElementById('reviews-score-stars');
    const distContainer = document.getElementById('rating-distribution-list');
    const feedContainer = document.getElementById('reviews-feed-col');
    const showAllLink = document.getElementById('reviews-show-all-link');

    if (scoreStars) {
      scoreStars.innerHTML = Array(5).fill(0).map(() => window.Icons.starPink()).join('');
    }

    if (distContainer) {
      distContainer.innerHTML = data.distribution.map(d => `
        <div class="rating-dist-row">
          <span class="dist-star-label">
            <span>${d.stars}</span>
            ${window.Icons.starPink()}
          </span>
          <div class="dist-bar-track">
            <div class="dist-bar-fill" style="width: ${d.percent}%;"></div>
          </div>
          <span class="dist-count-num">${d.count}</span>
        </div>
      `).join('');
    }

    if (feedContainer) {
      feedContainer.innerHTML = data.items.map(r => `
        <div class="review-card-item">
          <div class="review-author-row">
            <div class="author-left-cluster">
              <div class="author-name-text">${r.author}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="stars-row">
                ${Array(r.stars).fill(0).map(() => window.Icons.starPink()).join('')}
              </div>
              <span class="review-date-text">${r.date}</span>
            </div>
          </div>

          ${r.tags.length ? `
            <div class="review-tags-row">
              ${r.tags.map(t => `<span class="review-service-pill">${t}</span>`).join('')}
            </div>
          ` : ''}

          <p class="review-body-text">${r.text}</p>

          ${r.photos.length ? `
            <div class="review-thumbnails-row">
              ${r.photos.map(p => `<img src="${p}" alt="Review result" class="review-thumb-img" />`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('');
    }

    if (showAllLink) {
      showAllLink.innerHTML = `<span>Show all (${data.totalCount} reviews)</span>${window.Icons.chevronRight()}`;
    }
  },

  // Nearby Salons
  renderNearbySalons() {
    const grid = document.getElementById('nearby-salons-grid');
    const viewAll = document.getElementById('nearby-view-all-link');
    const arrowLeft = document.getElementById('nearby-arrow-left');
    const arrowRight = document.getElementById('nearby-arrow-right');

    if (viewAll) viewAll.innerHTML = `<span>View all</span>${window.Icons.chevronRight()}`;
    if (arrowLeft) arrowLeft.innerHTML = window.Icons.chevronLeft();
    if (arrowRight) arrowRight.innerHTML = window.Icons.chevronRight();

    if (!grid) return;

    grid.innerHTML = window.SalonData.nearbySalons.map(salon => `
      <div class="nearby-salon-card" onclick="window.App.showToast('Salon Selected', 'Viewing treatments for ${salon.name}.')">
        <div class="nearby-card-cover">
          <img src="${salon.image}" alt="${salon.name}" />
          <div class="nearby-badges-overlay">
            <div class="mini-badge badge-blue">
              ${window.Icons.bodyContourBadge()}
            </div>
            <div class="mini-badge badge-purple">
              ${window.Icons.faceContourBadge()}
            </div>
          </div>
        </div>
        <div class="nearby-card-body">
          <h4 class="nearby-salon-title">${salon.name}</h4>
          <span class="nearby-salon-address">${salon.address}</span>
          <div class="nearby-salon-meta">
            <span style="display:inline-flex;align-items:center;gap:3px;font-weight:700;">
              ${window.Icons.star(true)} ${salon.rating}
            </span>
            <span>${salon.reviews}</span>
            <span>•</span>
            <span>${salon.distance}</span>
          </div>
        </div>
      </div>
    `).join('');
  },

  // Smooth scroll to section from tabs
  scrollToSection(sectionId, tabEl) {
    document.querySelectorAll('.salon-tab-link').forEach(t => t.classList.remove('is-active'));
    if (tabEl) tabEl.classList.add('is-active');

    const target = document.getElementById(sectionId);
    if (target) {
      const topOffset = target.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
    }
  },

  // Menu Drawer Handlers
  openMenuDrawer() {
    const drawer = document.getElementById('menu-drawer-panel');
    const backdrop = document.getElementById('menu-drawer-backdrop');
    if (drawer) drawer.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-open');
  },

  closeMenuDrawer() {
    const drawer = document.getElementById('menu-drawer-panel');
    const backdrop = document.getElementById('menu-drawer-backdrop');
    if (drawer) drawer.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
  },

  // Toast Notification System
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
    // Search input handler
    const searchInput = document.getElementById('header-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          this.renderServicesList();
          return;
        }
        const filtered = window.SalonData.services.filter(s => 
          s.name.toLowerCase().includes(query) || 
          s.description.toLowerCase().includes(query) ||
          s.category.toLowerCase().includes(query)
        );
        const container = document.getElementById('services-cards-col');
        if (container) {
          if (filtered.length === 0) {
            container.innerHTML = `<div style="padding: 24px; color: var(--gray-500); text-align: center;">No treatments matching "${query}".</div>`;
          } else {
            container.innerHTML = filtered.map(s => `
              <div class="service-item-card" id="card-${s.id}">
                <div class="service-card-main-row">
                  <div class="service-info-col">
                    <h4 class="service-name-text">${s.name}</h4>
                    <div class="service-meta-line">
                      <span>${s.category} • ${s.duration}</span>
                    </div>
                  </div>
                  <div class="service-action-col">
                    <div class="service-price-wrap">${s.formattedPrice}</div>
                    <button type="button" class="btn-service-book" onclick="window.BookingEngine.openBooking('${s.id}')">Book</button>
                  </div>
                </div>
              </div>
            `).join('');
          }
        }
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
