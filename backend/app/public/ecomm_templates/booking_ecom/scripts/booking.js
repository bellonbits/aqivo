/**
 * LPG Beauty & Clinic - Booking Engine & Modal Logic
 * STRICT CONSTRAINT: ZERO EMOJIS!
 */

window.BookingEngine = {
  activeService: null,
  selectedSpecialist: null,
  selectedDate: null,
  selectedTime: null,
  isLiked: false,

  init() {
    this.selectedSpecialist = window.SalonData.team[0];
    this.setupGalleryCarousel();
  },

  // Toggle favorite / like
  toggleLike() {
    this.isLiked = !this.isLiked;
    const btn = document.getElementById('btn-header-like');
    if (btn) {
      btn.classList.toggle('is-liked', this.isLiked);
      btn.innerHTML = window.Icons.heart(this.isLiked);
    }
    const msg = this.isLiked 
      ? 'Beauty Salon Body LPG added to your favorites.'
      : 'Removed from favorites.';
    window.App.showToast('Favorites Updated', msg);
  },

  // Share action
  shareSalon() {
    if (navigator.share) {
      navigator.share({
        title: 'Beauty Salon Body LPG',
        text: 'Book luxury LPG body and facial endermologie treatments.',
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      window.App.showToast('Link Copied', 'Salon booking link copied to your clipboard.');
    }
  },

  // Gallery carousel index tracking
  galleryIndex: 0,
  setupGalleryCarousel() {
    // Basic gallery carousel cycle
  },

  galleryPrev() {
    const gallery = window.SalonData.salon.gallery;
    this.galleryIndex = (this.galleryIndex - 1 + gallery.length) % gallery.length;
    this.renderGallery();
  },

  galleryNext() {
    const gallery = window.SalonData.salon.gallery;
    this.galleryIndex = (this.galleryIndex + 1) % gallery.length;
    this.renderGallery();
  },

  renderGallery() {
    const cards = document.querySelectorAll('.gallery-card img');
    const gallery = window.SalonData.salon.gallery;
    if (cards.length >= 3) {
      const idx1 = this.galleryIndex;
      const idx2 = (this.galleryIndex + 1) % gallery.length;
      const idx3 = (this.galleryIndex + 2) % gallery.length;
      cards[0].src = gallery[idx1].src;
      cards[1].src = gallery[idx2].src;
      cards[2].src = gallery[idx3].src;
    }
  },

  // Open booking modal for a specific service or default
  openBooking(serviceId = null) {
    if (serviceId) {
      this.activeService = window.SalonData.services.find(s => s.id === serviceId) || window.SalonData.services[0];
    } else {
      this.activeService = window.SalonData.services[0];
    }
    this.renderBookingModal();
    const modal = document.getElementById('booking-modal-overlay');
    if (modal) {
      modal.classList.add('is-open');
    }
  },

  closeBooking() {
    const modal = document.getElementById('booking-modal-overlay');
    if (modal) {
      modal.classList.remove('is-open');
    }
  },

  renderBookingModal() {
    const s = this.activeService;
    const titleEl = document.getElementById('modal-service-name');
    const durEl = document.getElementById('modal-service-dur');
    const priceEl = document.getElementById('modal-service-price');
    const specContainer = document.getElementById('modal-specialists-grid');

    if (titleEl) titleEl.textContent = s.name;
    if (durEl) durEl.textContent = `${s.category} • ${s.duration}`;
    if (priceEl) priceEl.textContent = s.formattedPrice;

    if (specContainer) {
      specContainer.innerHTML = window.SalonData.team.map((m, idx) => `
        <div class="specialist-radio-card ${idx === 0 ? 'is-selected' : ''}" onclick="window.BookingEngine.selectSpecialist('${m.id}', this)">
          ${m.image ? `<img src="${m.image}" alt="${m.name}" class="specialist-card-avatar" />` : `<div class="team-avatar-initials" style="width:44px;height:44px;font-size:14px;">${m.initials || 'KS'}</div>`}
          <span class="specialist-card-name">${m.name}</span>
          <span class="specialist-card-role">${m.role}</span>
        </div>
      `).join('');
    }
  },

  selectSpecialist(id, el) {
    document.querySelectorAll('.specialist-radio-card').forEach(c => c.classList.remove('is-selected'));
    el.classList.add('is-selected');
    this.selectedSpecialist = window.SalonData.team.find(t => t.id === id);
  },

  confirmAppointment() {
    const dateInput = document.getElementById('booking-date-select');
    const timeInput = document.getElementById('booking-time-select');
    const nameInput = document.getElementById('booking-client-name');
    const phoneInput = document.getElementById('booking-client-phone');

    const dateVal = dateInput ? dateInput.value : 'Tomorrow';
    const timeVal = timeInput ? timeInput.value : '2:00 pm';
    const clientName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : 'Guest';

    // Create new booking record
    const newBooking = {
      id: `bk-${Date.now()}`,
      salonName: window.SalonData.salon.name,
      address: window.SalonData.salon.address,
      status: 'Upcoming',
      statusClass: 'upcoming',
      fullDateTitle: `${dateVal}, ${timeVal}`,
      shortDate: `${dateVal.split(',')[0]}, ${timeVal}`,
      summaryLine: `1 service • ${this.activeService.duration}`,
      items: [
        {
          category: this.activeService.category,
          name: this.activeService.name,
          price: this.activeService.formattedPrice,
          duration: this.activeService.duration
        }
      ],
      total: this.activeService.formattedPrice,
      review: null
    };

    window.SalonData.bookingsState.upcoming.unshift(newBooking);
    this.closeBooking();

    window.App.showToast(
      'Appointment Confirmed',
      `Booked ${this.activeService.name} on ${dateVal} at ${timeVal}. Confirmation sent.`
    );

    // Refresh appointments view
    window.Appointments.render();
  },

  // Rebook an existing past appointment
  rebookPast(bookingId) {
    const bk = window.SalonData.bookingsState.past.find(b => b.id === bookingId);
    if (!bk) return;
    this.openBooking(window.SalonData.services[0].id);
    window.App.showToast('Rebooking Started', `Configuring new booking slot for ${bk.salonName}.`);
  },

  // Leave review modal
  openReviewModal(bookingId) {
    const modal = document.getElementById('review-modal-overlay');
    if (modal) {
      modal.setAttribute('data-target-booking', bookingId);
      modal.classList.add('is-open');
    }
  },

  closeReviewModal() {
    const modal = document.getElementById('review-modal-overlay');
    if (modal) {
      modal.classList.remove('is-open');
    }
  },

  submitReview() {
    const modal = document.getElementById('review-modal-overlay');
    const textInput = document.getElementById('review-text-input');
    const textVal = textInput ? textInput.value.trim() : '';
    const bookingId = modal ? modal.getAttribute('data-target-booking') : null;

    if (bookingId) {
      const bk = window.SalonData.bookingsState.past.find(b => b.id === bookingId);
      if (bk) {
        bk.review = {
          stars: 5,
          text: textVal || 'Wonderful treatment and highly experienced professional team!'
        };
      }
    }

    this.closeReviewModal();
    window.App.showToast('Review Submitted', 'Thank you for rating your salon experience.');
    window.Appointments.render();
  }
};
