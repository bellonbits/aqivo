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
    primary: '#375A8A', // Dim Refined Slate Cobalt
    secondary: '#2C476F',
    navy: '#0F172A', // Dim Brand Navy
    background: '#080D1A',
    white: '#FFFFFF',
    text: '#E2E8F0',
    muted: '#64748B',
    border: 'rgba(255, 255, 255, 0.08)',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  }
} as const

export type BrandConfig = typeof brand
