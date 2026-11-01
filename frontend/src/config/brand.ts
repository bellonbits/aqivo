/**
 * Centralized brand tokens and identity configuration for Aqivo
 */

export const brand = {
  name: 'Aqivo',
  fullName: 'Aqivo',
  storeName: 'Aqivo Store',
  domain: 'aqivo.shop',
  url: 'https://aqivo.shop',
  tagline: 'We Build the Technology Behind Growing Businesses.',
  description:
    'Aqivo is a technology partner that helps startups and growing businesses design, build, and scale software, data, and AI systems while creating the technical foundations and teams required for long-term growth.',
  supportEmail: 'info@aqivo.shop',
  supportName: 'Aqivo Advisory & Engineering',
  copyright: '© 2026 Aqivo',
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
