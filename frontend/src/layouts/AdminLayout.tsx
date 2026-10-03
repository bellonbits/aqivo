import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Building2, FileClock, LayoutDashboard, LifeBuoy, LogOut, Tag, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/features/auth/AuthContext'
import { Logo } from '@/components/Logo'
import { PageLoading } from '@/components/ui'
import { cn } from '@/lib/cn'

const NAV = [['/admin', 'Overview', LayoutDashboard, true], ['/admin/businesses', 'Businesses', Building2, false], ['/admin/sales', 'Sales CRM', Target, false], ['/admin/support', 'Support', LifeBuoy, false], ['/admin/plans', 'Plans & pricing', Tag, false], ['/admin/audit', 'Audit log', FileClock, false]] as const

export default function AdminLayout() {
  const { me, loading, logout } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  useEffect(() => {
    document.title = 'Aqivo Admin — Platform'
    if (!loading && !me) nav('/login', { replace: true, state: { from: loc.pathname } })
    else if (!loading && me && !me.user.platform_role) nav('/dashboard', { replace: true })
  }, [loading, me, nav, loc.pathname])
  if (loading || !me?.user.platform_role) return <PageLoading />
  return (
    <div className="min-h-dvh md:flex">
      <aside className="glass sticky top-0 hidden h-dvh w-60 shrink-0 flex-col rounded-none border-y-0 border-l-0 p-4 md:flex"><div className="mb-6 px-2 pt-1"><Logo /><p className="mt-1 text-xs font-bold uppercase tracking-widest text-brand">Admin</p></div>
        <nav className="flex-1 space-y-0.5" aria-label="Admin">{NAV.map(([to, label, Icon, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold', isActive ? 'bg-white text-ink shadow-sm' : 'text-muted hover:bg-white/60 hover:text-ink')}><Icon className="size-[18px]" />{label}</NavLink>)}</nav>
        <p className="px-3 text-xs text-muted">{me.user.email}</p>
        <button onClick={() => void logout().then(() => nav('/login'))} className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-white/60 hover:text-ink"><LogOut className="size-4" /> Sign out</button></aside>
      <div className="min-w-0 flex-1">
        <nav className="scrollbar-none sticky top-0 z-30 flex gap-1 overflow-x-auto glass rounded-none border-x-0 border-t-0 px-3 py-2 md:hidden" aria-label="Admin">{NAV.map(([to, label, , end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold', isActive ? 'btn-brand' : 'text-muted')}>{label}</NavLink>)}</nav>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8"><motion.div key={loc.pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}><Outlet /></motion.div></main>
      </div>
    </div>
  )
}
