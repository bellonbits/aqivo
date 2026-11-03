import { useState, useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  X,
  ArrowRight,
  ChevronRight,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/features/auth/AuthContext'
import { useTheme, ThemeToggle } from '@/context/ThemeContext'
import { cn } from '@/lib/cn'

interface PublicLayoutProps {
  children: ReactNode
}

const NAV_LINKS = [
  { name: 'Home', path: '/' },
  { name: 'Solutions', path: '/solutions' },
  { name: 'Services', path: '/services' },
  { name: 'Products', path: '/products' },
  { name: 'Industries', path: '/industries' },
  { name: 'Insights', path: '/insights' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' },
]

export function PublicNavbar() {
  const { me } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-50 w-full px-3 pt-3 pb-2 sm:px-6 sm:pt-4 transition-all duration-300">
      <div
        className={cn(
          'mx-auto flex max-w-7xl items-center justify-between rounded-full px-4 sm:px-6 py-2.5 sm:py-3 transition-all duration-300 border backdrop-blur-xl',
          isDark
            ? 'bg-[#0f172a]/90 border-white/10 text-white shadow-[0_12px_36px_rgba(0,0,0,0.6)]'
            : 'bg-white/95 border-slate-200 text-[#0f172a] shadow-[0_10px_30px_rgba(0,64,250,0.06)]'
        )}
      >
        <Link to="/" className="flex items-center gap-2" aria-label="Aqivo Home">
          <Logo size="md" dark={isDark} />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary Navigation">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'text-[14px] font-medium transition-colors relative py-1',
                  isActive
                    ? isDark
                      ? 'text-white font-bold'
                      : 'text-[#375a8a] font-bold'
                    : isDark
                    ? 'text-zinc-300 hover:text-white'
                    : 'text-slate-600 hover:text-[#0f172a]'
                )}
              >
                {link.name}
                {isActive && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-brand"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Action CTAs & Theme Toggle */}
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />

          {me ? (
            <Link
              to={me.user.platform_role && !me.memberships.length ? '/admin' : '/dashboard'}
              className="btn-brand inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs sm:text-sm font-semibold shadow-sm transition hover:scale-[1.02] active:scale-95"
            >
              <span>Dashboard</span>
              <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cn(
                  'text-xs sm:text-sm font-semibold px-2 py-1.5 transition-colors',
                  isDark ? 'text-zinc-300 hover:text-white' : 'text-slate-600 hover:text-[#0f172a]'
                )}
              >
                Sign In
              </Link>
              <Link
                to="/contact"
                className="btn-brand inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs sm:text-sm font-bold transition hover:scale-[1.02] active:scale-95 shadow-md"
              >
                <span>Start a Conversation</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button & Theme Toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <Link
            to="/contact"
            className="btn-brand inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold sm:hidden"
          >
            <span>Talk to Us</span>
          </Link>
          <button
            type="button"
            className={cn(
              'grid size-9 sm:size-10 place-items-center rounded-full border shadow-xs transition active:scale-95',
              isDark
                ? 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-[#0f172a]'
            )}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'mx-auto mt-2 max-w-7xl rounded-3xl p-5 shadow-2xl border backdrop-blur-2xl lg:hidden',
              isDark
                ? 'bg-[#0f172a]/98 border-white/15 text-white'
                : 'bg-white/98 border-slate-200 text-[#0f172a]'
            )}
          >
            <div className="flex flex-col space-y-1">
              {NAV_LINKS.map((link) => {
                const isActive = location.pathname === link.path
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={cn(
                      'flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? isDark
                          ? 'bg-[#375a8a]/15 text-[#375a8a] font-semibold'
                          : 'bg-blue-50 text-[#375a8a] font-semibold'
                        : isDark
                        ? 'text-zinc-300 hover:bg-white/5'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <span>{link.name}</span>
                    <ChevronRight className="size-4 text-zinc-500" />
                  </Link>
                )
              })}
            </div>

            <div className={cn('mt-4 pt-4 border-t flex flex-col gap-2.5', isDark ? 'border-white/10' : 'border-slate-200')}>
              <Link
                to="/contact"
                className="btn-brand flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold shadow-md text-center"
              >
                <span>Start a Conversation</span>
                <ArrowRight className="size-4" />
              </Link>
              <div className="flex items-center justify-between px-2 pt-2 text-xs">
                <Link to="/login" className={isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-[#0f172a]'}>
                  Client Sign In
                </Link>
                <Link to="/products" className={isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-[#0f172a]'}>
                  Aqivo Store
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export function PublicFooter() {
  const currentYear = new Date().getFullYear()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <footer
      className={cn(
        'relative mt-24 border-t pt-20 pb-12 overflow-hidden transition-colors duration-200',
        isDark
          ? 'border-white/10 bg-[#080d1a] text-slate-300'
          : 'border-slate-200 bg-[#f8fafc] text-slate-700'
      )}
    >
      {/* Subtle Grid Pattern in Footer */}
      <div className="tech-grid absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 md:px-10">
        {/* Top Section: Newsletter & Brand */}
        <div className={cn('grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr] pb-16 border-b', isDark ? 'border-white/10' : 'border-slate-200')}>
          <div className="space-y-4">
            <Link to="/" className="inline-block" aria-label="Aqivo Home">
              <Logo size="lg" dark={isDark} />
            </Link>
            <p className={cn('max-w-sm text-xs sm:text-sm leading-relaxed font-normal', isDark ? 'text-slate-400' : 'text-slate-600')}>
              Aqivo is the strategic technology partner for startups and growing businesses. We design, build, and scale
              software, data, and AI systems while creating the technical foundations and teams required for long-term growth.
            </p>

            {/* Newsletter input */}
            <div className="pt-2 max-w-sm">
              <p className={cn('text-xs font-semibold uppercase tracking-wider mb-2', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                Engineering & Architecture Insights
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  alert('Thank you for subscribing to Aqivo Engineering Insights.')
                }}
                className={cn(
                  'flex items-center gap-2 rounded-full border p-1.5 backdrop-blur-md focus-within:border-[#375a8a]',
                  isDark ? 'border-white/15 bg-white/5' : 'border-slate-300 bg-white shadow-xs'
                )}
              >
                <input
                  type="email"
                  required
                  placeholder="Enter work email..."
                  className={cn(
                    'flex-1 bg-transparent px-3 text-xs outline-none',
                    isDark ? 'text-white placeholder-zinc-500' : 'text-[#0f172a] placeholder-slate-400'
                  )}
                />
                <button
                  type="submit"
                  className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-white hover:brightness-110 transition shrink-0 uppercase tracking-wider shadow-sm"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>

          {/* Column 1: Capabilities */}
          <div>
            <h4 className={cn('text-xs font-bold uppercase tracking-wider', isDark ? 'text-zinc-200' : 'text-[#0f172a]')}>
              Capabilities
            </h4>
            <ul className={cn('mt-4 space-y-2.5 text-xs', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              <li>
                <Link to="/solutions" className="hover:text-brand transition">
                  Technology Strategy & Roadmapping
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-brand transition">
                  Full-Lifecycle Engineering
                </Link>
              </li>
              <li>
                <Link to="/solutions" className="hover:text-brand transition">
                  Data Architecture & Pipelines
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-brand transition">
                  Applied AI & Intelligent Workflows
                </Link>
              </li>
              <li>
                <Link to="/solutions" className="hover:text-brand transition">
                  Scalability & Systems Modernization
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-brand transition">
                  Technical Due Diligence & Audits
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Ecosystem & Products */}
          <div>
            <h4 className={cn('text-xs font-bold uppercase tracking-wider', isDark ? 'text-zinc-200' : 'text-[#0f172a]')}>
              Products & Sectors
            </h4>
            <ul className={cn('mt-4 space-y-2.5 text-xs', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              <li>
                <Link to="/products" className="hover:text-brand transition">
                  Aqivo Store Platform
                </Link>
              </li>
              <li>
                <Link to="/industries" className="hover:text-brand transition">
                  Fintech & Payments Infrastructure
                </Link>
              </li>
              <li>
                <Link to="/industries" className="hover:text-brand transition">
                  Healthtech & Clinical Logistics
                </Link>
              </li>
              <li>
                <Link to="/industries" className="hover:text-brand transition">
                  Commerce & Supply Chain
                </Link>
              </li>
              <li>
                <Link to="/industries" className="hover:text-brand transition">
                  B2B SaaS Systems
                </Link>
              </li>
              <li>
                <Link to="/ethical-architecture" className="hover:text-brand transition">
                  Ethical Tech Architecture
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Firm & Direct Contact */}
          <div>
            <h4 className={cn('text-xs font-bold uppercase tracking-wider', isDark ? 'text-zinc-200' : 'text-[#0f172a]')}>
              Company & Advisory
            </h4>
            <ul className={cn('mt-4 space-y-2.5 text-xs', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              <li>
                <Link to="/about" className="hover:text-brand transition">
                  Our Engineering Philosophy
                </Link>
              </li>
              <li>
                <Link to="/insights" className="hover:text-brand transition">
                  Strategic Insights
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-brand transition">
                  Start a Conversation
                </Link>
              </li>
              <li>
                <a href="mailto:info@aqivo.shop" className="hover:text-brand transition">
                  info@aqivo.shop
                </a>
              </li>
              <li>
                <Link to="/login" className="hover:text-brand transition">
                  Client Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* GIGANTIC WATERMARK TYPOGRAPHY: AQIVO */}
        <div className="pt-16 sm:pt-24 pb-8 select-none pointer-events-none text-center">
          <p
            className={cn(
              'font-editorial text-[18vw] font-black tracking-[0.14em] leading-none uppercase transition-colors',
              isDark ? 'text-white/[0.04]' : 'text-[#0f172a]/[0.05]'
            )}
          >
            AQIVO
          </p>
        </div>

        {/* Bottom Copyright Bar */}
        <div className={cn('border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs', isDark ? 'border-white/10 text-zinc-400' : 'border-slate-200 text-slate-500')}>
          <p>© {currentYear} Aqivo. All rights reserved. Strategic technology partner for startups & growing businesses.</p>

          <div className="flex items-center gap-6">
            <Link to="/ethical-architecture" className="hover:text-brand transition">
              Ethical Architecture
            </Link>
            <Link to="/products" className="hover:text-brand transition">
              Products
            </Link>
            <Link to="/confidentiality-security" className="hover:text-brand transition">
              Confidentiality & Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0f172a] dark:bg-[#080d1a] dark:text-zinc-100 selection:bg-[#375a8a] selection:text-white transition-colors duration-200">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}
