/**
 * Centralized brand tokens and identity configuration for Aqivo.shop
 */

export const brand = {
  name: 'Aqivo',
  fullName: 'Aqivo.shop',
  domain: 'aqivo.shop',
  url: 'https://aqivo.shop',
  tagline: 'Build your store. Sell online. Grow your business.',
  description: 'A modern digital commerce platform allowing businesses to create beautiful online stores, sell products and services, accept orders and bookings, and manage their business from one platform.',
  supportEmail: 'support@aqivo.shop',
  supportName: 'Aqivo Support',
  copyright: '© 2026 Aqivo.shop',
  assets: {
    logo: '/brand/aqivo-logo.png',
    logoWhite: '/brand/aqivo-logo-white.png',
    mark: '/brand/aqivo-mark.png',
    favicon: '/favicon.ico',
    faviconSvg: '/favicon.svg',
    touchIcon: '/apple-touch-icon.png',
    ogImage: '/brand/aqivo-og.png',
  },
  colors: {
    primary: '#5B21F5', // Aqivo Purple
    secondary: '#7C3AED', // Aqivo Violet
    navy: '#0B1736', // Brand Navy
    background: '#F8FAFC',
    white: '#FFFFFF',
    text: '#0F172A',
    muted: '#64748B',
    border: '#E2E8F0',
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#DC2626',
  }
} as const

export type BrandConfig = typeof brand
