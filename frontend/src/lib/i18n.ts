// Minimal i18n: English is complete; other locales fall back key-by-key, so translations can be added incrementally.
import { useSyncExternalStore } from 'react'

type Dict = Record<string, string>
const en: Dict = {
  'nav.dashboard': 'Dashboard', 'nav.business': 'My Business', 'nav.website': 'Storefront', 'nav.seo': 'Domain & SEO', 'nav.connections': 'Connections', 'nav.whatsapp': 'WhatsApp inbox', 'nav.orders': 'Orders', 'nav.store': 'Checkout & delivery', 'nav.products': 'Products', 'nav.services': 'Services', 'nav.customers': 'Customers',
  'nav.leads': 'Leads', 'nav.bookings': 'Bookings', 'nav.reviews': 'Reviews', 'nav.payments': 'Payments', 'nav.marketing': 'Marketing',
  'nav.analytics': 'Analytics', 'nav.ai': 'AI Assistant', 'nav.settings': 'Settings',
  'common.save': 'Save', 'common.cancel': 'Cancel', 'common.delete': 'Delete', 'common.preview': 'Preview', 'common.publish': 'Publish',
  'empty.notEnoughData': 'Not enough data yet.',
}
const sw: Dict = {
  'nav.dashboard': 'Dashibodi', 'nav.business': 'Biashara Yangu', 'nav.website': 'Tovuti', 'nav.seo': 'Kikoa na SEO', 'nav.connections': 'Miunganisho', 'nav.whatsapp': 'Ujumbe wa WhatsApp', 'nav.orders': 'Oda', 'nav.store': 'Malipo na usafirishaji', 'nav.products': 'Bidhaa', 'nav.services': 'Huduma', 'nav.customers': 'Wateja',
  'nav.leads': 'Wateja Watarajiwa', 'nav.bookings': 'Miadi', 'nav.reviews': 'Maoni', 'nav.payments': 'Malipo', 'nav.marketing': 'Masoko',
  'nav.analytics': 'Takwimu', 'nav.ai': 'Msaidizi wa AI', 'nav.settings': 'Mipangilio',
  'common.save': 'Hifadhi', 'common.cancel': 'Ghairi', 'common.delete': 'Futa', 'common.preview': 'Hakiki', 'common.publish': 'Chapisha',
  'empty.notEnoughData': 'Bado hakuna data ya kutosha.',
}
const catalogs: Record<string, Dict> = { en, sw } // so, fr, ar, am: add a Dict here — missing keys fall back to English

let locale = 'en'
const listeners = new Set<() => void>()
export const setLocale = (l: string) => { locale = l in catalogs ? l : 'en'; document.documentElement.lang = locale; listeners.forEach((f) => f()) }
export const t = (key: string) => catalogs[locale]?.[key] ?? en[key] ?? key
export function useT() {
  useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => locale)
  return t
}
