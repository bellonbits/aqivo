import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Search, ShoppingBag, Truck, Building2, CalendarDays, CreditCard, ExternalLink, Globe, Home, Inbox, LogOut, Lock, Megaphone, MessageCircle, Plug, MoreHorizontal, Package, Scissors, Settings, Sparkles, Star, Users, X, type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/features/auth/AuthContext'
import { useBusiness } from '@/hooks/useBusiness'
import { useT } from '@/lib/i18n'
import { Logo } from '@/components/Logo'
import { PageLoading, Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { fmtDate } from '@/lib/format'

interface NavItem { to: string; key: string; icon: LucideIcon; feature?: string; ownerOnly?: boolean; staffHidden?: boolean; end?: boolean }
const NAV: NavItem[] = [
  { to: '/dashboard', key: 'nav.dashboard', icon: Home, end: true },
  { to: '/dashboard/business', key: 'nav.business', icon: Building2, staffHidden: true },
  { to: '/dashboard/website', key: 'nav.website', icon: Globe, feature: 'website', staffHidden: true },
  { to: '/dashboard/orders', key: 'nav.orders', icon: ShoppingBag },
  { to: '/dashboard/products', key: 'nav.products', icon: Package },
  { to: '/dashboard/services', key: 'nav.services', icon: Scissors },
  { to: '/dashboard/customers', key: 'nav.customers', icon: Users, feature: 'customers' },
  { to: '/dashboard/leads', key: 'nav.leads', icon: Inbox, feature: 'leads', staffHidden: true },
  { to: '/dashboard/bookings', key: 'nav.bookings', icon: CalendarDays, feature: 'bookings' },
  { to: '/dashboard/reviews', key: 'nav.reviews', icon: Star, feature: 'reviews' },
  { to: '/dashboard/payments', key: 'nav.payments', icon: CreditCard, feature: 'customers', staffHidden: true },
  { to: '/dashboard/marketing', key: 'nav.marketing', icon: Megaphone, feature: 'marketing', staffHidden: true },
  { to: '/dashboard/analytics', key: 'nav.analytics', icon: BarChart3, feature: 'analytics', staffHidden: true },
  { to: '/dashboard/ai', key: 'nav.ai', icon: Sparkles, feature: 'ai', staffHidden: true },
  { to: '/dashboard/seo', key: 'nav.seo', icon: Search, staffHidden: true },
  { to: '/dashboard/connections', key: 'nav.connections', icon: Plug, staffHidden: true },
  { to: '/dashboard/whatsapp', key: 'nav.whatsapp', icon: MessageCircle, feature: 'leads', staffHidden: true },
  { to: '/dashboard/store', key: 'nav.store', icon: Truck, staffHidden: true },
  { to: '/dashboard/settings', key: 'nav.settings', icon: Settings, staffHidden: true },
]
const TAB_KEYS = ['/dashboard', '/dashboard/bookings', '/dashboard/leads', '/dashboard/customers']

export default function DashboardLayout() {
  const { me, loading, logout, stopImpersonation } = useAuth()
  const { summary, isLoading, has } = useBusiness()
  const t = useT()
  const nav = useNavigate()
  const loc = useLocation()
  const [more, setMore] = useState(false)
  useEffect(() => {
    setMore(false)
    const titles: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/dashboard/business': 'My Business',
      '/dashboard/website': 'Website & Storefront',
      '/dashboard/orders': 'Orders',
      '/dashboard/products': 'Products',
      '/dashboard/services': 'Services',
      '/dashboard/customers': 'Customers',
      '/dashboard/leads': 'Leads',
      '/dashboard/bookings': 'Bookings',
      '/dashboard/reviews': 'Reviews',
      '/dashboard/payments': 'Payments',
      '/dashboard/marketing': 'Marketing',
      '/dashboard/analytics': 'Analytics',
      '/dashboard/ai': 'Aqivo AI',
      '/dashboard/seo': 'SEO & Domains',
      '/dashboard/connections': 'Connections',
      '/dashboard/whatsapp': 'WhatsApp',
      '/dashboard/store': 'Store & Delivery',
      '/dashboard/settings': 'Settings',
    }
    const current = titles[loc.pathname]
    document.title = current ? `Aqivo — ${current}` : 'Aqivo — Dashboard'
  }, [loc.pathname])

  useEffect(() => {
    if (!loading && !me) nav('/login', { replace: true, state: { from: loc.pathname } })
    else if (!loading && me && me.memberships.length === 0 && !me.user.platform_role) nav('/onboarding', { replace: true })
    else if (!loading && me && me.memberships.length === 0 && me.user.platform_role) nav('/admin', { replace: true })
  }, [loading, me, nav, loc.pathname])

  if (loading || !me || isLoading || !summary) return <PageLoading />
  const isStaff = summary.role === 'STAFF'
  const items = NAV.filter((i) => !(isStaff && i.staffHidden))
  const tabs = TAB_KEYS.map((k) => items.find((i) => i.to === k)).filter(Boolean) as NavItem[]
  const sub = summary.subscription
  const b = summary.business

  const link = (i: NavItem, mobile = false) => {
    const locked = i.feature && !has(i.feature)
    return (
      <NavLink key={i.to} to={i.to} end={i.end}
        className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors',
          mobile ? (isActive ? 'btn-brand' : 'bg-white ring-1 ring-line') : (isActive ? 'bg-white text-ink shadow-sm ring-1 ring-white' : 'text-muted hover:bg-white/60 hover:text-ink'))}>
        <i.icon className="size-[18px] shrink-0" />
        <span className="flex-1">{t(i.key)}</span>
        {locked && <Lock className="size-3.5 opacity-60" aria-label="Upgrade required" />}
      </NavLink>
    )
  }

  return (
    <div className="min-h-dvh md:flex">
      <aside className="glass sticky top-0 hidden h-dvh w-64 shrink-0 flex-col rounded-none border-y-0 border-l-0 p-4 md:flex">
        <Link to="/dashboard" className="mb-6 px-2 pt-1"><Logo /></Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto" aria-label="Main">{items.map((i) => link(i))}</nav>
        <div className="mt-4 rounded-2xl bg-white/70 p-3 ring-1 ring-white">
          <p className="truncate text-sm font-bold text-ink">{b.name}</p>
          <p className="mt-0.5 text-xs text-muted">{summary.plan.name} plan{sub?.status === 'TRIAL' ? ' · trial' : ''}</p>
          <a href={summary.urls.profile} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">View your page <ExternalLink className="size-3" /></a>
        </div>
        <button onClick={() => void logout().then(() => nav('/login'))} className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-white/60 hover:text-ink"><LogOut className="size-4" /> Sign out</button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {summary.impersonating && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-300 px-4 py-2 text-sm font-semibold text-amber-950">
            <span>Support mode: you're managing {b.name}. Everything you change is recorded in the audit log.</span>
            <Button size="sm" variant="dark" onClick={() => void stopImpersonation().then(() => nav('/admin'))}>Exit</Button>
          </div>
        )}
        <SubscriptionBanner sub={sub} />
        {b.status === 'SUSPENDED' && <div className="bg-red-600 px-4 py-2 text-sm font-semibold text-white">This business is suspended. Contact Aqivo support.</div>}
        <header className="sticky top-0 z-30 flex items-center justify-between glass rounded-none border-x-0 border-t-0 px-4 py-3 md:hidden">
          <Link to="/dashboard" className="min-w-0"><p className="truncate text-base font-extrabold">{b.name}</p><p className="text-xs text-muted">{summary.plan.name} plan</p></Link>
          <a href={summary.urls.profile} target="_blank" rel="noreferrer" aria-label="View your public page" className="grid size-10 place-items-center rounded-full bg-white ring-1 ring-line"><ExternalLink className="size-4" /></a>
        </header>
        <main className={cn('mx-auto w-full flex-1 min-w-0 max-w-full overflow-x-hidden', loc.pathname === '/dashboard/website' ? 'max-w-none p-0 pb-20 md:pb-0' : 'max-w-6xl px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8')}><motion.div key={loc.pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="min-w-0 max-w-full"><Outlet /></motion.div></main>
      </div>

      {/* Mobile: purpose-built bottom navigation, not a shrunken sidebar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 glass rounded-none border-x-0 border-b-0 md:hidden pb-safe" aria-label="Main">
        {tabs.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold', isActive ? 'text-ink' : 'text-muted')}>
            {({ isActive }) => (<><span className={cn('grid h-7 w-12 place-items-center rounded-full', isActive && 'btn-brand')}><i.icon className="size-5" /></span>{t(i.key).split(' ')[0]}</>)}
          </NavLink>
        ))}
        <button onClick={() => setMore(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold text-muted"><span className="grid h-7 w-12 place-items-center"><MoreHorizontal className="size-5" /></span>More</button>
      </nav>
      {more && (
        <div className="fixed inset-0 z-50 flex flex-col bg-paper md:hidden" role="dialog" aria-modal="true" aria-label="All sections">
          <div className="flex items-center justify-between border-b border-line px-4 py-3"><Logo /><button aria-label="Close menu" onClick={() => setMore(false)} className="grid size-10 place-items-center rounded-full bg-white ring-1 ring-line"><X className="size-5" /></button></div>
          <div className="grid flex-1 content-start gap-2 overflow-y-auto p-4">{items.map((i) => link(i, true))}
            <button onClick={() => void logout().then(() => nav('/login'))} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold text-bad"><LogOut className="size-[18px]" /> Sign out</button></div>
        </div>
      )}
    </div>
  )
}

function SubscriptionBanner({ sub }: { sub: import('@/types').SubscriptionInfo | null }) {
  if (!sub) return null
  const days = (iso: string | null) => (iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)) : 0)
  let msg: string | null = null
  let tone = 'bg-lime text-lime-ink'
  if (sub.status === 'TRIAL') msg = `Your ${sub.plan_name} trial ends ${fmtDate(sub.trial_ends_at)} (${days(sub.trial_ends_at)} days left).`
  else if (sub.status === 'PAST_DUE') { msg = `Payment overdue. Your plan stays active until ${fmtDate(sub.grace_ends_at)}.`; tone = 'bg-amber-300 text-amber-950' }
  else if (sub.status === 'EXPIRED' || sub.status === 'CANCELLED') { msg = `Your plan has ended. Your data is safe until ${fmtDate(sub.data_retained_until)}, and your free profile stays live.`; tone = 'bg-ink-3 text-white' }
  else if (sub.cancel_at_period_end) msg = `Your plan ends ${fmtDate(sub.current_period_end)}. Your data is kept.`
  if (!msg) return null
  return <div className={cn('flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm font-semibold', tone)}><span>{msg}</span><Link to="/dashboard/settings#plan" className="underline underline-offset-2">Manage plan</Link></div>
}
