import { Link } from 'react-router-dom'
import { ArrowRight, Flame, Menu, MessageCircle, QrCode, Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CountUp, DriftingBlobs, Floaty, ease, useReduced } from '@/lib/motion'
import { Logo } from '@/components/Logo'
import { PhoneFrame } from '@/components/PhoneFrame'
import { useAuth } from '@/features/auth/AuthContext'

const LINKS = [['Products', '#products'], ['Business types', '#industries'], ['Pricing', '#pricing'], ['FAQ', '#faq']] as const

export function SiteNav(_props: { dark?: boolean }) {
  const { me } = useAuth()
  const [open, setOpen] = useState(false)
  return (
    <motion.header initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, ease }} className="sticky top-0 z-40 px-3 pb-2 pt-4 sm:px-6 sm:pt-5">
      <div className="glass-strong mx-auto flex max-w-6xl items-center justify-between rounded-full py-3 pl-7 pr-3 shadow-[0_12px_40px_rgba(70,80,160,0.14)]">
        <Link to="/"><Logo /></Link>
        <nav className="hidden items-center gap-9 text-[15px] font-semibold md:flex" aria-label="Primary">
          {LINKS.map(([l, h]) => (h.startsWith('/') ? <Link key={l} to={h} className="text-muted hover:text-ink">{l}</Link> : <a key={l} href={`/${h}`} className="text-muted hover:text-ink">{l}</a>))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {me ? <Link to={me.user.platform_role && !me.memberships.length ? '/admin' : '/dashboard'} className="btn-brand rounded-full px-6 py-3 text-sm font-bold">Open dashboard</Link> : <>
            <Link to="/login" className="px-4 py-2 text-sm font-semibold text-muted hover:text-ink">Sign in</Link>
            <Link to="/register" className="btn-brand rounded-full px-6 py-3 text-sm font-bold">Start free</Link></>}
        </div>
        <button className="grid size-10 place-items-center rounded-full bg-white/70 md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
      </div>
      {open && (
        <div className="glass-strong mx-auto mt-2 max-w-6xl space-y-1 rounded-3xl p-4 md:hidden">
          {LINKS.map(([l, h]) => <a key={l} href={h.startsWith('/') ? h : `/${h}`} className="block rounded-xl px-3 py-3 font-semibold" onClick={() => setOpen(false)}>{l}</a>)}
          <Link to="/login" className="block rounded-xl px-3 py-3 font-semibold">Sign in</Link>
          <Link to="/register" className="btn-brand mt-2 block rounded-full px-5 py-3 text-center font-bold">Start free</Link>
        </div>
      )}
    </motion.header>
  )
}

/** A faithful, static rendering of a business profile — shown as an example, not a screenshot of a customer. */
export function PhoneProfile({ className = '' }: { className?: string }) {
  return (
    <PhoneFrame variant="hand" width={270} className={className} label="Example business profile">
      <div className="h-full bg-[#FFFBF7] p-4 pt-6 text-ink">
        <div className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#B4532A] text-lg font-extrabold text-white">M</div>
          <p className="mt-2 text-[15px] font-extrabold">Mary's Beauty Studio</p>
          <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-stone-500"><Star className="size-3 fill-amber-500 text-amber-500" /> Beauty Salon · Pangani, Nairobi</p>
        </div>
        <div className="mt-3 grid gap-1.5 text-center text-[11px] font-bold">
          <span className="rounded-full bg-[#25D366] py-2 text-[#053b1a]">Chat on WhatsApp</span>
          <span className="rounded-full border border-ink py-2">Book appointment</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1">{['salon-dryer', 'braids-portrait', 'salon-scissors'].map((n) => <img key={n} src={`/img/${n}-sm.webp`} alt="" loading="lazy" width={100} height={100} className="aspect-square rounded-lg object-cover" />)}</div>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">Services</p>
        <ul className="mt-1 divide-y divide-stone-200 text-[12px]">
          {[['Knotless Braids', 'KSh 1,500'], ['Gel Nails', 'KSh 800'], ['Pedicure', 'KSh 1,000']].map(([n, p]) => <li key={n} className="flex justify-between py-1.5"><span className="font-semibold">{n}</span><span className="font-extrabold">{p}</span></li>)}
        </ul>
        <p className="mt-2 text-center text-[9px] text-stone-400">Example profile</p>
      </div>
    </PhoneFrame>
  )
}

const SHOP = [['Silk Scarf', 'KSh 1,200', 'retail-1'], ['Leather Bag', 'KSh 3,500', 'retail-2'], ['Ankara Dress', 'KSh 2,800', 'retail-3']] as const

/** A looping storefront story inside the phone: browse, add to bag, check out, the order lands on WhatsApp. All sample data. */
function StorefrontPhone() {
  const reduced = useReduced()
  const [step, setStep] = useState(reduced ? 3 : 0)
  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => setStep((n) => (n + 1) % 5), 2400)
    return () => clearInterval(t)
  }, [reduced])
  const inBag = step >= 1 && step <= 2
  return (
    <PhoneFrame variant="hand" width={290} label="Animated example of an Aqivo storefront with sample data">
      <div className="relative h-full bg-[#FFFBF7] text-ink">
        <div className="p-4 pt-6">
          <div className="flex items-center gap-2.5"><span className="grid size-10 place-items-center rounded-full bg-[#B4532A] text-sm font-extrabold text-white">A</span>
            <div className="leading-tight"><p className="text-[13px] font-extrabold">Amani Boutique</p><p className="flex items-center gap-1 text-[10px] text-stone-500"><Star className="size-3 fill-amber-500 text-amber-500" /> 4.9 · <span className="font-bold text-green-700">Open now</span></p></div></div>
          <div className="mt-3 flex gap-1.5 text-[10px] font-bold">{['All', 'Scarves', 'Bags', 'Dresses'].map((c, i) => <span key={c} className={`rounded-full px-2.5 py-1 ${i === 0 ? 'bg-ink text-white' : 'bg-stone-100'}`}>{c}</span>)}</div>
          <ul className="mt-3 space-y-2">{SHOP.map(([n, pr, img], i) => (
            <li key={n} className="flex items-center gap-2.5 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-stone-100">
              <img src={`/img/${img}-sm.webp`} onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} alt="" width={48} height={48} className="size-12 rounded-xl bg-stone-100 object-cover" />
              <div className="min-w-0 flex-1 leading-tight"><p className="truncate text-[12px] font-bold">{n}</p><p className="text-[11px] font-extrabold text-stone-600">{pr}</p></div>
              <motion.span animate={i === 0 && step === 1 ? { scale: [1, 1.25, 1] } : { scale: 1 }} transition={{ duration: 0.5 }} className={`grid size-7 place-items-center rounded-full text-[15px] font-bold ${i === 0 && inBag ? 'bg-green-600 text-white' : 'bg-ink text-white'}`}>{i === 0 && inBag ? '✓' : '+'}</motion.span>
            </li>))}</ul>
        </div>
        <AnimatePresence mode="wait">
          {inBag && <motion.div key="bag" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 28 }} className="absolute inset-x-3 bottom-4 flex items-center justify-between rounded-full bg-ink px-4 py-3 text-[12px] font-bold text-white"><span>1 item · KSh 1,200</span><span>{step === 2 ? 'Placing order…' : 'View bag →'}</span></motion.div>}
          {step >= 3 && <motion.div key="wa" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }} className="absolute inset-x-2 bottom-3 rounded-2xl bg-[#e7fbe0] p-3 text-[11px] shadow-lg ring-1 ring-green-200">
            <p className="flex items-center gap-1.5 font-extrabold text-green-900"><MessageCircle className="size-3.5" /> New order #1042</p>
            <p className="mt-1 leading-snug text-stone-700">1× Silk Scarf — KSh 1,200<br />Pickup · Sat 10:00<br /><b>Total: KSh 1,200</b> · M-Pesa</p>
          </motion.div>}
        </AnimatePresence>
        <p className="absolute inset-x-0 bottom-0.5 text-center text-[8px] text-stone-400">Animated example with sample data</p>
      </div>
    </PhoneFrame>
  )
}

function Glass({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`glass rounded-[26px] p-5 ${className}`}>{children}</div>
}

export function Hero() {
  return (
    <section className="px-3 pb-6 pt-6 sm:px-6 sm:pt-10">
      <div className="sky relative mx-auto max-w-[1400px] overflow-hidden rounded-[40px] border border-white/80 shadow-[0_30px_80px_rgba(80,100,190,0.18)]">
        <DriftingBlobs />
        <div className="relative mx-auto max-w-6xl px-5 pb-0 pt-14 text-center md:pt-20">
          <h1 className="mx-auto max-w-4xl text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-6xl lg:text-[68px]" aria-label="Get Found. Get Customers. Grow your business.">
            {[['Get', 'Found.'], ['Get', 'Customers.']].map((line, li) => <span key={li} className="block">{line.map((w, i) => <motion.span key={w} aria-hidden className="mr-[0.25em] inline-block" initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.8, delay: 0.15 + li * 0.25 + i * 0.1, ease }}>{w}</motion.span>)}</span>)}
            <span className="block" aria-hidden>{['Grow', 'your', 'business.'].map((w, i) => <motion.span key={w} className={`mr-[0.25em] inline-block ${i === 0 ? 'text-gradient' : ''}`} initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.8, delay: 0.75 + i * 0.1, ease }}>{w}</motion.span>)}</span>
          </h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 1.0, ease }} className="mx-auto mt-6 max-w-2xl text-base text-muted md:text-lg">
            Create your online store, take orders and payments on WhatsApp, and see exactly which post, poster or message brought each customer.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 1.15, ease }} className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn-brand rounded-full px-8 py-4 text-base font-bold transition hover:-translate-y-0.5 active:scale-95">Start free</Link>
            <a href="#how" className="glass rounded-full px-8 py-4 text-base font-bold transition hover:-translate-y-0.5">See how it works</a>
          </motion.div>
        </div>
        <div className="relative mx-auto mt-10 grid max-w-6xl items-end gap-6 px-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-10">
          <motion.div initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 1.2, ease }} className="relative z-10 order-2 space-y-4 pb-10 lg:order-1 lg:pb-24">
            <Glass><p className="text-sm text-muted">Your business link</p><p className="mt-1 break-all text-2xl font-semibold tracking-tight">aqivo.shop/<span className="text-gradient">yourname</span></p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">{['Storefront', 'WhatsApp orders', 'Payments', 'QR code'].map((t) => <span key={t} className="rounded-full bg-white/80 px-3 py-1.5">{t}</span>)}</div></Glass>
            <div className="grid grid-cols-2 gap-4">
              <Floaty amp={8} duration={3200}><Glass className="!p-4"><p className="flex items-center gap-1.5 text-xs text-muted"><QrCode className="size-3.5" /> Set up in</p><p className="mt-2 text-3xl font-semibold">~<CountUp to={10} /> <span className="text-sm text-muted">min</span></p></Glass></Floaty>
              <Floaty amp={8} duration={3800} delay={400}><Glass className="!p-4"><p className="flex items-center gap-1.5 text-xs text-muted"><Star className="size-3.5" /> Industries</p><p className="mt-2 text-3xl font-semibold"><CountUp to={12} /></p></Glass></Floaty>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 120 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, delay: 0.9, ease }} className="order-1 lg:order-2"><div className="relative z-0 pb-4"><StorefrontPhone /></div></motion.div>
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 1.3, ease }} className="relative z-10 order-3 space-y-4 pb-10 lg:pb-24">
            <Floaty amp={10} duration={3400} delay={200}><Glass className="flex items-center gap-4 !p-4"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-lime text-lime-ink"><MessageCircle className="size-5" /></span><div><p className="font-semibold">Orders land on WhatsApp</p><p className="text-sm text-muted">Every tap tracked as a lead</p></div></Glass></Floaty>
            <Floaty amp={12} duration={4200} delay={600}><Glass><div className="flex items-center gap-2 text-sm font-semibold"><Flame className="size-4 text-brand" /> Bring customers back</div><p className="mt-3 text-3xl font-semibold tracking-tight"><CountUp to={18} /> <span className="text-sm font-normal text-muted">customers haven't visited in 45+ days</span></p><p className="mt-3 flex items-center justify-between border-t border-white/80 pt-3 text-sm text-muted">Create reactivation campaign <ArrowRight className="size-4" /></p><p className="mt-2 text-[10px] text-muted">Sample data</p></Glass></Floaty>
            <Glass className="!p-4"><p className="text-sm font-semibold">Built for African businesses</p><p className="mt-1 text-sm text-muted">Local currencies and phone formats — 8 currencies supported.</p></Glass>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
