const SYMBOLS: Record<string, string> = { KES: 'KSh', USD: '$', ZAR: 'R', NGN: '₦', TZS: 'TSh', UGX: 'USh', RWF: 'RF', ETB: 'Br' }

export function money(amount: string | number | null | undefined, currency = 'KES'): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  const n = Number(amount)
  const sym = SYMBOLS[currency] ?? currency
  const txt = new Intl.NumberFormat('en', { maximumFractionDigits: Number.isInteger(n) ? 0 : 2, minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n)
  return sym.length > 1 ? `${sym} ${txt}` : `${sym}${txt}`
}

export const fmtDate = (iso?: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  iso ? new Intl.DateTimeFormat('en', opts).format(new Date(iso)) : '—'

export const fmtTime = (iso: string, tz?: string) => new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(new Date(iso))

export const fmtDateTime = (iso?: string | null, tz?: string) =>
  iso ? new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(new Date(iso)) : '—'

export function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 172800) return 'Yesterday'
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} days ago`
  return fmtDate(iso)
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, ' ')
export const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
