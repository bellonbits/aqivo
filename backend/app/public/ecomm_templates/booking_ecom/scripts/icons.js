/**
 * LPG Beauty & Clinic - SVG Vector Icons Library
 * STRICT RULE: ZERO EMOJIS! Only crisp, clean SVG vector glyphs.
 */

window.Icons = {
  // Navigation & UI Controls
  gridMenu: () => `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="5" cy="5" r="1.5"></circle>
      <circle cx="12" cy="5" r="1.5"></circle>
      <circle cx="19" cy="5" r="1.5"></circle>
      <circle cx="5" cy="12" r="1.5"></circle>
      <circle cx="12" cy="12" r="1.5"></circle>
      <circle cx="19" cy="12" r="1.5"></circle>
      <circle cx="5" cy="19" r="1.5"></circle>
      <circle cx="12" cy="19" r="1.5"></circle>
      <circle cx="19" cy="19" r="1.5"></circle>
    </svg>`,

  search: () => `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="7.5"></circle>
      <line x1="16.5" y1="16.5" x2="21.5" y2="21.5"></line>
    </svg>`,

  heart: (filled = false) => `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="${filled ? '#E8929A' : 'none'}" stroke="${filled ? '#E8929A' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>`,

  share: () => `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="18" cy="5" r="3"></circle>
      <circle cx="6" cy="12" r="3"></circle>
      <circle cx="18" cy="19" r="3"></circle>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
    </svg>`,

  star: (filled = true) => `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="${filled ? '#1E1F24' : 'none'}" stroke="#1E1F24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`,

  starPink: () => `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#E8929A" stroke="#E8929A" stroke-width="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`,

  starOutline: () => `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`,

  pin: () => `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>`,

  externalLink: () => `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="7" y1="17" x2="17" y2="7"></line>
      <polyline points="7 7 17 7 17 17"></polyline>
    </svg>`,

  chevronLeft: () => `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>`,

  chevronRight: () => `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>`,

  chevronDown: () => `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>`,

  chevronUp: () => `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>`,

  phone: () => `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>`,

  mail: () => `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
      <polyline points="22,6 12,13 2,6"></polyline>
    </svg>`,

  clock: () => `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>`,

  calendar: () => `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>`,

  // Empty bookings calendar illustration with small crossed mark matching Image 2
  calendarEmptyIllustration: () => `
    <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
      <rect x="14" y="16" width="38" height="38" rx="8" stroke="#1E1F24" stroke-width="2.5" fill="#FFFFFF"/>
      <path d="M14 26H52" stroke="#1E1F24" stroke-width="2.5"/>
      <rect x="22" y="10" width="3.5" height="8" rx="1.5" fill="#1E1F24"/>
      <rect x="40" y="10" width="3.5" height="8" rx="1.5" fill="#1E1F24"/>
      <circle cx="48" cy="46" r="11" fill="#FEECEB"/>
      <circle cx="48" cy="46" r="8" stroke="#1E1F24" stroke-width="2" fill="#FFFFFF"/>
      <path d="M45.5 43.5L50.5 48.5" stroke="#1E1F24" stroke-width="2" stroke-linecap="round"/>
      <path d="M50.5 43.5L45.5 48.5" stroke="#1E1F24" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

  // Body Silhouette Aesthetic Icon (First square lilac/blue badge in header)
  bodyContourBadge: () => `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 4c0 3 2 4 2 7 0 3-4 5-4 9h16c0-4-4-6-4-9 0-3 2-4 2-7"></path>
      <path d="M9 13c1.5 1 4.5 1 6 0"></path>
      <path d="M5 10c-1 1-1.5 2.5-1.5 4"></path>
      <path d="M19 10c1 1 1.5 2.5 1.5 4"></path>
    </svg>`,

  // Face Silhouette Aesthetic Icon (Second square lavender badge in header)
  faceContourBadge: () => `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 3c-4.5 0-7 3.5-7 8 0 4 2 6 2 9h6"></path>
      <path d="M14 7c2 1 3 3 3 5 0 2-1 4-1 6"></path>
      <path d="M11 11c1 .5 2 0 2.5-.5"></path>
      <path d="M12 15c1 0 2-.5 2.5-1"></path>
    </svg>`,

  check: () => `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>`,

  close: () => `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`,

  plus: () => `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>`,

  minus: () => `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>`,

  user: () => `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>`
};
