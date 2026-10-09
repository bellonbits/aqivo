import { Link } from 'react-router-dom'
import { ArrowRight, Calendar, CheckCircle2, Flame, Menu, MessageCircle, ShoppingBag, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { CountUp, DriftingBlobs, Floaty, ease } from '@/lib/motion'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/features/auth/AuthContext'
import { BookingPhoneApp } from './BookingPhoneApp'
import { EcommercePhoneApp } from './EcommercePhoneApp'

export const PhoneProfile = EcommercePhoneApp

const LINKS = [
  ['Booking Engine', '#booking-engine'],
  ['How It Works', '#how'],
  ['Features', '#features'],
  ['Industries', '#industries'],
  ['Pricing', '#pricing'],
  ['FAQ', '#faq'],
] as const

export function SiteNav(_props: { dark?: boolean }) {
  const { me } = useAuth()
  const [open, setOpen] = useState(false)
  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease }}
      className="sticky top-0 z-40 px-3 pb-2 pt-4 sm:px-6 sm:pt-5"
    >
      <div className="glass-strong mx-auto flex max-w-6xl items-center justify-between rounded-full py-3 pl-7 pr-3 shadow-[0_12px_40px_rgba(70,80,160,0.14)]">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-[14.5px] font-semibold md:flex" aria-label="Primary">
          {LINKS.map(([l, h]) =>
            h.startsWith('/') ? (
              <Link key={l} to={h} className="text-muted hover:text-ink transition-colors">
                {l}
              </Link>
            ) : (
              <a key={l} href={`/${h}`} className="text-muted hover:text-ink transition-colors">
                {l}
              </a>
            )
          )}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {me ? (
            <Link
              to={me.user.platform_role && !me.memberships.length ? '/admin' : '/dashboard'}
              className="btn-brand rounded-full px-6 py-2.5 text-sm font-bold"
            >
              Open dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 text-sm font-semibold text-muted hover:text-ink">
                Sign in
              </Link>
              <Link to="/register" className="btn-brand rounded-full px-6 py-2.5 text-sm font-bold shadow-md">
                Start free booking
              </Link>
            </>
          )}
        </div>
        <button
          className="grid size-10 place-items-center rounded-full bg-white/70 md:hidden"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="glass-strong mx-auto mt-2 max-w-6xl space-y-1 rounded-3xl p-4 md:hidden">
          {LINKS.map(([l, h]) => (
            <a
              key={l}
              href={h.startsWith('/') ? h : `/${h}`}
              className="block rounded-xl px-3 py-3 font-semibold"
              onClick={() => setOpen(false)}
            >
              {l}
            </a>
          ))}
          <Link to="/login" className="block rounded-xl px-3 py-3 font-semibold">
            Sign in
          </Link>
          <Link to="/register" className="btn-brand mt-2 block rounded-full px-5 py-3 text-center font-bold">
            Start free booking
          </Link>
        </div>
      )}
    </motion.header>
  )
}

function Glass({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`glass rounded-[26px] p-5 ${className}`}>{children}</div>
}

export function Hero() {
  const [previewMode, setPreviewMode] = useState<'ecommerce' | 'booking'>('ecommerce')
  const isEcom = previewMode === 'ecommerce'

  return (
    <section className="px-3 pb-6 pt-6 sm:px-6 sm:pt-10">
      <div className="sky relative mx-auto max-w-[1400px] overflow-hidden rounded-[40px] border border-white/80 shadow-[0_30px_80px_rgba(80,100,190,0.18)]">
        <DriftingBlobs />
        <div className="relative mx-auto max-w-6xl px-5 pb-0 pt-14 text-center md:pt-20">
          {/* Badge */}
          <motion.div
            key={`badge-${previewMode}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-1.5 text-xs font-bold text-brand shadow-sm ring-1 ring-purple-200/60 mb-6"
          >
            <Sparkles className="size-3.5 text-brand" />
            <span>
              {isEcom
                ? 'Mobile Storefront & WhatsApp E-Commerce Platform'
                : '24/7 Online Booking & Appointment Platform'}
            </span>
          </motion.div>

          <h1
            className="mx-auto max-w-4xl text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-6xl lg:text-[68px]"
            aria-label={
              isEcom
                ? 'Launch Your Store. Sell On WhatsApp. Grow your retail business.'
                : 'Fill Every Chair. Book Every Slot. Grow your appointment business.'
            }
          >
            {[
              isEcom ? ['Launch', 'Your', 'Store.'] : ['Fill', 'Every', 'Chair.'],
              isEcom ? ['Sell', 'On', 'WhatsApp.'] : ['Book', 'Every', 'Slot.'],
            ].map((line, li) => (
              <span key={`${previewMode}-${li}`} className="block">
                {line.map((w, i) => (
                  <motion.span
                    key={`${previewMode}-${w}`}
                    aria-hidden
                    className="mr-[0.25em] inline-block"
                    initial={{ opacity: 0, y: 30, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, delay: 0.1 + li * 0.2 + i * 0.08, ease }}
                  >
                    {w}
                  </motion.span>
                ))}
              </span>
            ))}
            <span className="block" aria-hidden>
              {['Grow', 'your', isEcom ? 'retail' : 'appointment', 'business.'].map((w, i) => (
                <motion.span
                  key={`${previewMode}-${w}`}
                  className={`mr-[0.25em] inline-block ${i === 0 ? 'text-gradient' : ''}`}
                  initial={{ opacity: 0, y: 30, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.6, delay: 0.5 + i * 0.08, ease }}
                >
                  {w}
                </motion.span>
              ))}
            </span>
          </h1>

          <motion.p
            key={`sub-${previewMode}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="mx-auto mt-6 max-w-2xl text-base text-muted md:text-lg"
          >
            {isEcom
              ? 'Create a modern mobile storefront in minutes, accept instant M-Pesa payments, and receive structured, itemized orders directly on WhatsApp.'
              : 'Let clients self-book 24/7, pick their favorite specialist, pay deposits upfront, and receive automated WhatsApp reminders. Stop losing hours to WhatsApp chat scheduling.'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8, ease }}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            <Link
              to="/register"
              className="btn-brand rounded-full px-8 py-4 text-base font-bold transition hover:-translate-y-0.5 active:scale-95 shadow-lg"
            >
              {isEcom ? 'Start free storefront' : 'Start free booking'}
            </Link>
            <a
              href={isEcom ? '#features' : '#booking-engine'}
              className="glass rounded-full px-8 py-4 text-base font-bold transition hover:-translate-y-0.5"
            >
              Test live demo
            </a>
          </motion.div>
        </div>

        {/* 3-column interactive showcase */}
        <div className="relative mx-auto mt-10 grid max-w-6xl items-end gap-6 px-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-10">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.4, ease }}
            className="relative z-10 order-2 space-y-4 pb-10 lg:order-1 lg:pb-24"
          >
            <Glass>
              <p className="text-sm text-muted">
                {isEcom ? 'Your storefront link' : 'Your booking link'}
              </p>
              <p className="mt-1 break-all text-2xl font-semibold tracking-tight">
                aqivo.shop/<span className="text-gradient">{isEcom ? 'two-sides' : 'broadway-beauty'}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                {(isEcom
                  ? ['Mobile Storefront', 'WhatsApp Checkout', 'Instant M-Pesa', 'Live Order Tracking']
                  : ['24/7 Booking', 'Specialist schedules', 'Upfront deposits', 'Barcode check-in']
                ).map((t) => (
                  <span key={t} className="rounded-full bg-white/80 px-3 py-1.5 shadow-xs">
                    {t}
                  </span>
                ))}
              </div>
            </Glass>

            <div className="grid grid-cols-2 gap-4">
              <Floaty amp={8} duration={3200}>
                <Glass className="!p-4">
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    {isEcom ? (
                      <ShoppingBag className="size-3.5 text-brand" />
                    ) : (
                      <Calendar className="size-3.5 text-brand" />
                    )}{' '}
                    {isEcom ? 'Checkout speed' : 'Set up in'}
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    ~<CountUp to={isEcom ? 30 : 8} />{' '}
                    <span className="text-sm text-muted">{isEcom ? 'sec' : 'min'}</span>
                  </p>
                </Glass>
              </Floaty>

              <Floaty amp={8} duration={3800} delay={400}>
                <Glass className="!p-4">
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />{' '}
                    {isEcom ? 'Cart conversion' : 'No-shows'}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-600">
                    {isEcom ? '+' : '-'}<CountUp to={isEcom ? 42 : 85} />%
                  </p>
                </Glass>
              </Floaty>
            </div>
          </motion.div>

          {/* Center Column: Interactive Storefront / Booking App Phone */}
          <motion.div
            initial={{ opacity: 0, y: 120 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.3, ease }}
            className="order-1 lg:order-2"
          >
            <div className="relative z-0 pb-4">
              <div className="mb-3 flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode('ecommerce')}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-bold transition shadow-xs ${
                    previewMode === 'ecommerce'
                      ? 'bg-stone-900 text-white ring-1 ring-stone-900'
                      : 'bg-white/85 text-stone-600 hover:text-stone-900 border border-stone-200/60'
                  }`}
                >
                  <ShoppingBag className="size-3.5" />
                  <span>Storefront (Two Sides)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('booking')}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-bold transition shadow-xs ${
                    previewMode === 'booking'
                      ? 'bg-stone-900 text-white ring-1 ring-stone-900'
                      : 'bg-white/85 text-stone-600 hover:text-stone-900 border border-stone-200/60'
                  }`}
                >
                  <Calendar className="size-3.5" />
                  <span>Booking & Appointments</span>
                </button>
              </div>

              {previewMode === 'ecommerce' ? (
                <EcommercePhoneApp width={295} autoPlay={true} />
              ) : (
                <BookingPhoneApp width={295} autoPlay={true} />
              )}
            </div>
          </motion.div>

          {/* Right Column */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease }}
            className="relative z-10 order-3 space-y-4 pb-10 lg:pb-24"
          >
            <Floaty amp={10} duration={3400} delay={200}>
              <Glass className="flex items-center gap-4 !p-4">
                <span className={`grid size-11 shrink-0 place-items-center rounded-full ${isEcom ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-brand'}`}>
                  <MessageCircle className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">
                    {isEcom ? 'Instant WhatsApp Orders' : 'Automated WhatsApp Reminders'}
                  </p>
                  <p className="text-sm text-muted">
                    {isEcom
                      ? 'Itemized orders land on your WhatsApp with 1 tap'
                      : '24h & 2h alerts with 1-tap reschedule'}
                  </p>
                </div>
              </Glass>
            </Floaty>

            <Floaty amp={12} duration={4200} delay={600}>
              <Glass>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Flame className="size-4 text-brand" />{' '}
                  {isEcom ? 'Live Order Stream' : 'Smart Rebooking Engine'}
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  <CountUp to={isEcom ? 18 : 24} />{' '}
                  <span className="text-sm font-normal text-muted">
                    {isEcom ? 'orders fulfilled today across Nairobi' : 'clients due for their next appointment'}
                  </span>
                </p>
                <p className="mt-3 flex items-center justify-between border-t border-white/80 pt-3 text-sm text-brand font-semibold cursor-pointer">
                  {isEcom ? 'Track orders in real-time' : 'Send 1-tap WhatsApp prompt'} <ArrowRight className="size-4" />
                </p>
                <p className="mt-2 text-[10px] text-muted">
                  {isEcom ? 'Automated customer receipts & status' : 'Automated rebooking workflow'}
                </p>
              </Glass>
            </Floaty>

            <Glass className="!p-4">
              <p className="text-sm font-semibold">
                {isEcom ? 'Instant M-Pesa & Card Checkout' : 'Protected with Upfront Deposits'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {isEcom
                  ? 'Accept M-Pesa STK push, Till/Paybill, and cards with instant payment verification. Zero ghost orders.'
                  : 'Accept M-Pesa STK push, Till/Paybill, Daraja, and cards. Never get ghosted again.'}
              </p>
            </Glass>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
