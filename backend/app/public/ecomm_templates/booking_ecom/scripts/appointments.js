/**
 * LPG Beauty & Clinic - Appointments & Booking Detail Screen Logic (Image 2 Mockup)
 * STRICT CONSTRAINT: ZERO EMOJIS!
 */

window.Appointments = {
  selectedBookingId: 'bk-101',

  init() {
    this.render();
  },

  selectBooking(id) {
    this.selectedBookingId = id;
    this.render();
  },

  render() {
    this.renderUpcomingAndPast();
    this.renderDetailPanel();
  },

  renderUpcomingAndPast() {
    const state = window.SalonData.bookingsState;
    const upcomingContainer = document.getElementById('upcoming-bookings-container');
    const pastContainer = document.getElementById('past-bookings-list');
    const pastCountEl = document.getElementById('past-count-num');

    // 1. Upcoming Bookings
    if (upcomingContainer) {
      if (state.upcoming.length === 0) {
        upcomingContainer.innerHTML = `
          <div class="empty-upcoming-card">
            <div class="empty-illustration-wrap">
              ${window.Icons.calendarEmptyIllustration()}
            </div>
            <h3 class="empty-state-title">No upcoming bookings</h3>
            <p class="empty-state-subtitle">Once you do, they'll show up here. Why not book something now?</p>
            <button type="button" class="btn-find-salons" onclick="window.App.switchView('salon')">
              Find salons nearby
            </button>
          </div>
        `;
      } else {
        upcomingContainer.innerHTML = `
          <div style="margin-bottom: 12px; font-weight: 700; font-size: 17px; color: var(--gray-900);">
            Upcoming bookings (${state.upcoming.length})
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${state.upcoming.map(item => this.renderBookingCardHtml(item)).join('')}
          </div>
        `;
      }
    }

    // 2. Past Bookings
    if (pastCountEl) {
      pastCountEl.textContent = `(${state.past.length})`;
    }

    if (pastContainer) {
      pastContainer.innerHTML = state.past.map(item => this.renderBookingCardHtml(item)).join('');
    }
  },

  renderBookingCardHtml(item) {
    const isSelected = item.id === this.selectedBookingId;
    return `
      <div 
        class="booking-history-card ${isSelected ? 'is-active-selection' : ''}" 
        onclick="window.Appointments.selectBooking('${item.id}')"
      >
        <div class="card-top-identity-row">
          <div class="salon-badges-and-name">
            <div class="badges-duo">
              <div class="mini-badge badge-blue">
                ${window.Icons.bodyContourBadge()}
              </div>
              <div class="mini-badge badge-purple">
                ${window.Icons.faceContourBadge()}
              </div>
            </div>
            <div class="booking-salon-text-col">
              <h4 class="booking-salon-title">${item.salonName}</h4>
              <span class="booking-salon-address-sub">${item.address}</span>
            </div>
          </div>
          <span class="booking-status-pill ${item.statusClass}">${item.status}</span>
        </div>

        <div class="card-bottom-meta-row">
          <span>${item.summaryLine}</span>
          <span>${item.shortDate}</span>
        </div>
      </div>
    `;
  },

  renderDetailPanel() {
    const detailContainer = document.getElementById('booking-detail-panel-content');
    if (!detailContainer) return;

    const allBookings = [
      ...window.SalonData.bookingsState.upcoming,
      ...window.SalonData.bookingsState.past
    ];

    const current = allBookings.find(b => b.id === this.selectedBookingId) || window.SalonData.bookingsState.past[0];
    if (!current) return;

    detailContainer.innerHTML = `
      <!-- Header Group -->
      <div class="detail-header-group">
        <h2 class="detail-datetime-title">${current.fullDateTitle}</h2>
        <span class="detail-salon-name">${current.salonName}</span>
        <span class="detail-salon-address">${current.address}</span>
      </div>

      <!-- Action Buttons -->
      <div class="detail-actions-row">
        <button type="button" class="btn-rebook-pink" onclick="window.BookingEngine.rebookPast('${current.id}')">
          Rebook
        </button>
        <button type="button" class="btn-leave-review-outline" onclick="window.BookingEngine.openReviewModal('${current.id}')">
          Leave review
        </button>
      </div>

      <!-- Booking Itemized Breakdown -->
      <div class="booking-items-section">
        <h3 class="booking-items-section-title">Booking details</h3>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${current.items.map(it => {
            if (it.isWaiting) {
              return `
                <div class="waiting-interval-callout">
                  <span class="svg-icon">${window.Icons.clock()}</span>
                  <span>${it.title}</span>
                </div>
              `;
            }
            return `
              <div class="detail-service-item">
                <span class="service-detail-headline">${it.category} • ${it.name} • ${it.price}</span>
                <span class="service-detail-duration">${it.duration}</span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="detail-total-row">
          <span class="total-label">Total</span>
          <span class="total-value-shillings">${current.total}</span>
        </div>
      </div>

      <!-- Your Review Section -->
      ${current.review ? `
        <div class="detail-review-section">
          <h4 class="detail-review-title">Your review</h4>
          <div class="detail-review-box">
            <div class="detail-review-stars">
              ${Array(current.review.stars).fill(0).map(() => window.Icons.starPink()).join('')}
            </div>
            <p class="detail-review-text">${current.review.text}</p>
          </div>
        </div>
      ` : ''}
    `;
  }
};
