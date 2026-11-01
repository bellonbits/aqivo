import { useState, useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  X,
  ArrowRight,
  Mail,
  ChevronRight,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/features/auth/AuthContext'
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
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-50 w-full px-3 pt-3 pb-2 sm:px-6 sm:pt-4 transition-all duration-300">
      <div
        className={cn(
          'mx-auto flex max-w-7xl items-center justify-between rounded-full px-5 py-3 transition-all duration-300',
          scrolled
            ? 'glass-strong shadow-[0_12px_36px_rgba(15,23,42,0.12)]'
            : 'glass shadow-[0_4px_24px_rgba(15,23,42,0.06)]'
        )}
      >
        <Link to="/" className="flex items-center gap-2" aria-label="Aqivo Home">
          <Logo size="md" />
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
                  'text-[14px] font-medium transition-colors hover:text-ink relative py-1',
                  isActive ? 'text-ink font-semibold' : 'text-muted'
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

        {/* Action CTAs */}
        <div className="hidden items-center gap-3 md:flex">
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
                className="text-xs sm:text-sm font-medium text-muted hover:text-ink px-3 py-1.5 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/contact"
                className="btn-brand inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs sm:text-sm font-semibold shadow-sm transition hover:scale-[1.02] active:scale-95"
              >
                <span>Start a Conversation</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            to="/contact"
            className="btn-brand inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold sm:hidden"
          >
            <span>Talk to Us</span>
          </Link>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full bg-white/80 border border-slate-200/80 text-ink shadow-xs"
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
            className="glass-strong mx-auto mt-2 max-w-7xl rounded-3xl p-5 shadow-xl border border-slate-200/90 lg:hidden"
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
                      isActive ? 'bg-brand/10 text-brand font-semibold' : 'text-ink hover:bg-slate-100/70'
                    )}
                  >
                    <span>{link.name}</span>
                    <ChevronRight className="size-4 text-slate-400" />
                  </Link>
                )
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200/80 flex flex-col gap-2.5">
              <Link
                to="/contact"
                className="btn-brand flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold shadow-md text-center"
              >
                <span>Start a Conversation</span>
                <ArrowRight className="size-4" />
              </Link>
              <div className="flex items-center justify-between px-2 pt-2 text-xs text-muted">
                <Link to="/login" className="hover:text-ink">Client Sign In</Link>
                <Link to="/products" className="hover:text-ink">Aqivo Store</Link>
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

  return (
    <footer className="relative mt-24 border-t border-slate-200/80 bg-white/70 backdrop-blur-md pt-16 pb-12 text-slate-600">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          {/* Brand Col */}
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <Logo size="lg" />
            </Link>
            <p className="max-w-md text-sm leading-relaxed text-slate-600">
              <strong className="text-slate-900 font-semibold">We Build the Technology Behind Growing Businesses.</strong>
              <br className="mt-1" />
              Aqivo is a technology partner for startups and growing businesses. We help companies design, build, and scale
              software, data, and AI systems while creating the technical foundations and teams required for long-term growth.
            </p>

            <div className="pt-2">
              <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">The Aqivo Journey</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500">
                {['Strategy', 'Software', 'Data', 'AI', 'Teams', 'Scale'].map((step, idx) => (
                  <span key={step} className="inline-flex items-center gap-1.5">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700 border border-slate-200">
                      {step}
                    </span>
                    {idx < 5 && <span className="text-slate-300">→</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Solutions & Services */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Capabilities</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link to="/services#strategy" className="hover:text-slate-900 transition-colors">
                  Startup Technology Strategy
                </Link>
              </li>
              <li>
                <Link to="/services#software" className="hover:text-slate-900 transition-colors">
                  Software Engineering & MVP
                </Link>
              </li>
              <li>
                <Link to="/services#data" className="hover:text-slate-900 transition-colors">
                  Data Architecture & BI
                </Link>
              </li>
              <li>
                <Link to="/services#ai" className="hover:text-slate-900 transition-colors">
                  Applied AI & Automation
                </Link>
              </li>
              <li>
                <Link to="/services#infrastructure" className="hover:text-slate-900 transition-colors">
                  Cloud Infrastructure & Scale
                </Link>
              </li>
              <li>
                <Link to="/services#teams" className="hover:text-slate-900 transition-colors">
                  Technical Team Building & CTO
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation & Products */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Company & Products</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link to="/solutions" className="hover:text-slate-900 transition-colors">
                  Solutions Matrix
                </Link>
              </li>
              <li>
                <Link to="/industries" className="hover:text-slate-900 transition-colors">
                  Target Industries
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-slate-900 transition-colors flex items-center gap-1.5">
                  <span>Aqivo Store</span>
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                    Product
                  </span>
                </Link>
              </li>
              <li>
                <Link to="/insights" className="hover:text-slate-900 transition-colors">
                  Strategic Insights
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-slate-900 transition-colors">
                  About Aqivo
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-slate-900 transition-colors">
                  Start a Project
                </Link>
              </li>
            </ul>
          </div>

          {/* Discovery & Contact */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Start an Engagement</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Have an idea, architectural bottleneck, or scaling challenge? Connect directly with our engineering and strategy team.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <Mail className="size-3.5" />
              <span>Request Discovery Call</span>
            </Link>
            <div className="pt-2 text-xs text-slate-500 space-y-1">
              <p>Direct inquiries: info@aqivo.shop</p>
              <p>Advisory, Systems Architecture & Engineering</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200/60 pt-8 sm:flex-row text-xs text-slate-500">
          <p>© {currentYear} Aqivo. All rights reserved. Technology partner for startups and growing businesses.</p>
          <div className="flex items-center gap-6">
            <Link to="/ethical-architecture" className="hover:text-slate-800">
              Ethical Architecture
            </Link>
            <Link to="/products" className="hover:text-slate-800">
              Products
            </Link>
            <Link to="/confidentiality-security" className="hover:text-slate-800">
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
    <div className="min-h-screen flex flex-col bg-slate-50/50 selection:bg-purple-100 selection:text-purple-900">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}
