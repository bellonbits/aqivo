/**
 * Centralized brand tokens and identity configuration for Aqivo.shop
 */

export const brand = {
  name: 'Aqivo',
  fullName: 'Aqivo.shop',
  domain: 'aqivo.shop',
  url: 'https://aqivo.shop',
  tagline: 'The Booking & Appointment Platform for Modern Service Businesses',
  description: 'A modern booking and appointment scheduling platform allowing salons, spas, barbershops, and service pros to take 24/7 bookings, automate WhatsApp reminders, manage specialists, and collect upfront deposits.',
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
