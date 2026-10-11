import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  ExternalLink,
  FileClock,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Palette,
  Plus,
  Radio,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Target,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/features/auth/AuthContext'
import { Logo } from '@/components/Logo'
import { PageLoading } from '@/components/ui'
import { cn } from '@/lib/cn'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
  badge?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Platform',
    items: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/admin/businesses', label: 'Merchants & Stores', icon: Building2 },
      { to: '/admin/orders', label: 'Orders Monitor', icon: ShoppingBag },
    ],
  },
  {
    title: 'Revenue & Growth',
    items: [
      { to: '/admin/subscriptions', label: 'Subscriptions & Billing', icon: CreditCard },
      { to: '/admin/plans', label: 'Plans & Pricing', icon: Layers },
      { to: '/admin/sales', label: 'Sales CRM', icon: Target },
    ],
  },
  {
    title: 'Storefronts & Catalog',
    items: [
      { to: '/admin/storefronts', label: 'Themes & Storefronts', icon: Palette },
      { to: '/admin/categories', label: 'Categories & Content', icon: Layers },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/admin/support', label: 'Support Center', icon: LifeBuoy },
      { to: '/admin/notifications', label: 'Broadcasts & Alerts', icon: Bell },
      { to: '/admin/analytics', label: 'Analytics & Reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Security & System',
    items: [
      { to: '/admin/staff', label: 'Staff & Security', icon: ShieldCheck },
      { to: '/admin/health', label: 'System Health', icon: Activity },
      { to: '/admin/settings', label: 'Platform Settings', icon: Settings },
      { to: '/admin/audit', label: 'Audit Log', icon: FileClock },
    ],
  },
]

export default function AdminLayout() {
  const { me, loading, logout } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    document.title = 'Aqivo Admin — Platform Administration'
    if (!loading && !me) nav('/login', { replace: true, state: { from: loc.pathname } })
    else if (!loading && me && !me.user.platform_role) nav('/dashboard', { replace: true })
  }, [loading, me, nav, loc.pathname])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [loc.pathname])

  if (loading || !me?.user.platform_role) return <PageLoading />

  return (
    <div className="min-h-dvh bg-[#F8FAFC] text-[#0F172A] flex">
      {/* DESKTOP SIDEBAR */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-slate-200/80 bg-white shadow-sm lg:flex">
        {/* Brand header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <Link to="/admin" className="flex items-center gap-2.5">
            <Logo />
            <div className="leading-tight">
              <span className="block text-[11px] font-extrabold uppercase tracking-widest text-[#5B21F5]">
                Platform Admin
              </span>
            </div>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center justify-between rounded-xl px-3 py-2 text-[14px] font-semibold transition-all duration-150',
                        isActive
                          ? 'bg-[#5B21F5] text-white shadow-sm shadow-[#5B21F5]/25 font-bold'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                      )
                    }
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="size-[18px] shrink-0 opacity-80 group-hover:opacity-100" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[11px] font-bold text-slate-600">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </div>

        {/* Admin profile & logout */}
        <div className="border-t border-slate-100 p-4 bg-slate-50/60">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-900">{me.user.full_name || 'Admin User'}</p>
              <p className="truncate text-[11px] text-slate-500">{me.user.email}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-block size-1.5 rounded-full bg-violet-600" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-700">
                  {me.user.platform_role}
                </span>
              </div>
            </div>
            <button
              onClick={() => void logout().then(() => nav('/login'))}
              title="Sign out"
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:bg-slate-100 hover:text-red-600 transition"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Radio className="size-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700">
                Aqivo Operations v2.4
              </span>
              <span>•</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500" />
                All Systems Normal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/businesses/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#5B21F5] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#4d16e0] transition active:scale-95"
            >
              <Plus className="size-3.5" />
              <span>Create Store</span>
            </Link>
            <Link
              to="/dashboard"
              className="hidden md:inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <span>Merchant View</span>
              <ExternalLink className="size-3 text-slate-400" />
            </Link>
          </div>
        </header>

        {/* Mobile menu drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="border-b border-slate-200 bg-white px-4 py-4 shadow-lg lg:hidden z-20 max-h-[80vh] overflow-y-auto"
            >
              <div className="space-y-4">
                {NAV_SECTIONS.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {section.title}
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {section.items.map((item) => {
                        const Icon = item.icon
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold',
                                isActive
                                  ? 'bg-[#5B21F5] text-white font-bold'
                                  : 'text-slate-600 hover:bg-slate-100'
                              )
                            }
                          >
                            <Icon className="size-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </NavLink>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Page Outlet */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
