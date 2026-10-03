import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, CreditCard, MessageCircle, Search, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { IndustryConfig, Plan } from '@/types'
import { AnimatePresence, motion } from 'framer-motion'
import { CountUp, Floaty, Item, Reveal, Stagger } from '@/lib/motion'
import { PhoneProfile } from './Hero'
import { Logo } from '@/components/Logo'

const wrap = 'mx-auto max-w-7xl px-5 md:px-10'
export const Eyebrow = ({ children }: { children: ReactNode; dark?: boolean }) => <Reveal y={14}><p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-brand">{children}</p></Reveal>

export function Pillars() {
  const cols = [
    { t: 'Build', items: ['Drag-and-drop storefront builder', '35 sections: shop, FAQ, video, map…', 'Phone, tablet and desktop preview', 'Your own domain & SEO check', 'QR codes and tracked links'] },
    { t: 'Sell', items: ['Products with sizes & colours', 'Cart, checkout & delivery areas', 'WhatsApp, M-Pesa & cash payments', 'Discount codes & stock control', 'Orders with a customer tracking link'] },
    { t: 'Get customers', items: ['WhatsApp ordering & enquiries', 'Online bookings', 'Lead inbox & follow-ups', 'Verified reviews', 'Know which post or poster worked'] },
    { t: 'Grow', items: ['Source & funnel analytics', 'Campaigns for every channel', 'A daily growth plan from your numbers', 'Customer timeline & win-back lists', 'Aqivo AI — drafts you approve'] },
  ]
  return (
    <section className="py-20 md:py-28">
      <div className={wrap}>
        <Eyebrow>One platform</Eyebrow>
        <h2 className="max-w-3xl text-3xl md:text-5xl">Build your storefront, take orders and bookings, and see what brings customers.</h2>
        <p className="mt-4 max-w-2xl text-muted">Aqivo isn't a template site. It's a storefront you shape yourself, a way to sell and book on WhatsApp, and the numbers that show what's working.</p>
        <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cols.map((c, i) => (
            <Item key={c.t}><motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="h-full"><div className={cn('h-full rounded-[24px] p-6', i === 0 ? 'btn-brand' : 'glass')}>
              <h3 className="text-xl">{c.t}</h3>
              <ul className="mt-4 space-y-2.5 text-sm">{c.items.map((it) => <li key={it} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0" />{it}</li>)}</ul>
            </div></motion.div></Item>
          ))}
        </Stagger>
      </div>
    </section>
  )
}


export function Categories() {
  const cfg = useQuery({ queryKey: ['config'], queryFn: () => api.get<{ industries: IndustryConfig[] }>('/businesses/config'), staleTime: Infinity })
  const items = cfg.data?.industries ?? []
  return (
    <section id="industries" className="py-16 md:py-24">
      <div className={wrap}>
        <Eyebrow>For every small business</Eyebrow>
        <h2 className="max-w-3xl text-3xl md:text-5xl">One platform for salons, shops, restaurants, clinics and more.</h2>
        <p className="mt-4 max-w-2xl text-muted">Pick your industry and Aqivo builds your first storefront with the right sections, wording and starter items — then it's yours to change.</p>
        <Stagger className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 xl:grid-cols-6" gap={0.05}>
          {items.map((c) => (
            <Item key={c.key}>
              <Link to={`/register?industry=${c.key}`}>
                <motion.figure whileHover={{ y: -8 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} className="group relative aspect-[3/4] overflow-hidden rounded-[24px] shadow-[0_18px_40px_rgba(70,80,160,0.18)]">
                  <img src={`/img/${c.photo}-sm.webp`} alt={`${c.label} — example photo`} loading="lazy" decoding="async" width={640} height={853} className="size-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1b1550]/85 via-transparent to-transparent" />
                  <figcaption className="absolute inset-x-0 bottom-0 p-4 text-white"><p className="text-base font-bold leading-tight">{c.label}</p><p className="mt-0.5 line-clamp-2 text-xs text-white/75">{c.blurb}</p></figcaption>
                </motion.figure>
              </Link>
            </Item>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

export function HowItWorks() {
  const steps = [
    ['Create your business', 'Tell Aqivo what you do and where.'],
    ['Your storefront appears', 'Built from your details — products, services, photos and WhatsApp included.'],
    ['Make it yours', 'Drag sections, change colours and fonts, add products, FAQs and video.'],
    ['Share tracked links', 'Post to Instagram, TikTok, WhatsApp or print a QR code — each one is tracked.'],
    ['See what works', 'Sales and enquiries by channel, plus a daily plan of what to do next.'],
  ]
  return (
    <section id="how" className="py-20 md:py-28">
      <div className={wrap}>
        <Eyebrow>How it works</Eyebrow>
        <h2 className="max-w-2xl text-3xl md:text-5xl">From nothing to selling online in about ten minutes.</h2>
        <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5" gap={0.12}><ol className="contents">
          {steps.map(([t, b], i) => (
            <li key={t}><Item className="glass h-full rounded-[24px] p-6">
              <span className="grid size-9 place-items-center rounded-full btn-brand text-sm font-extrabold">{i + 1}</span>
              <h3 className="mt-5 text-lg leading-snug">{t}</h3><p className="mt-2 text-sm text-muted">{b}</p>
            </Item></li>
          ))}
        </ol></Stagger>
      </div>
    </section>
  )
}

export function ProfileDemo() {
  return (
    <section className="py-20 md:py-28">
      <div className={cn(wrap, 'glass grid items-center gap-12 rounded-[36px] p-8 md:p-14 lg:grid-cols-2')}>
        <div>
          <Eyebrow dark>Storefront builder</Eyebrow>
          <h2 className="text-3xl md:text-5xl">A real storefront you build by dragging sections — free.</h2>
          <p className="mt-4 max-w-lg text-muted">Every business gets a storefront at <span className="font-bold text-ink">aqivo.shop/yourname</span> with products, services, photos, reviews, a WhatsApp button and a cart. Add pages, a menu, a FAQ or a video. Preview it on a phone before you publish.</p>
          <ul className="mt-6 space-y-2.5">{['Storefront, orders and bookings are on the free plan', 'Your own subdomain — or your own domain on Grow', 'QR codes (PNG, SVG, printable poster) with scan counts', 'Search-readiness check with fixes'].map((t) => <li key={t} className="flex gap-2"><Check className="mt-1 size-4 text-brand" />{t}</li>)}</ul>
        </div>
        <Reveal x={40} y={0} className="flex justify-center"><Floaty amp={14} duration={4200}><PhoneProfile className="scale-110" /></Floaty></Reveal>
      </div>
    </section>
  )
}

function FeatureRow({ eyebrow, title, body, points, visual, flip }: { eyebrow: string; title: string; body: string; points: string[]; visual: ReactNode; flip?: boolean }) {
  return (
    <div className={cn('grid items-center gap-10 py-14 lg:grid-cols-2 lg:gap-16', flip && 'lg:[&>*:first-child]:order-2')}>
      <Reveal x={flip ? 40 : -40} y={0}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="text-2xl md:text-4xl">{title}</h3>
        <p className="mt-4 max-w-lg text-muted">{body}</p>
        <ul className="mt-5 space-y-2">{points.map((p) => <li key={p} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-ok" />{p}</li>)}</ul>
      </Reveal>
      <Reveal x={flip ? -40 : 40} y={0} delay={0.1}><div className="rounded-[28px] sky p-5 md:p-8">{visual}<p className="mt-4 text-center text-xs text-muted/80">Illustration with sample data</p></div></Reveal>
    </div>
  )
}

const Bubble = ({ me, children }: { me?: boolean; children: ReactNode }) => <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2 text-sm', me ? 'ml-auto rounded-br-sm bg-[#d9fdd3]' : 'rounded-bl-sm bg-white')}>{children}</div>
const Row = ({ a, b, c }: { a: string; b?: string; c?: ReactNode }) => <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/85 px-4 py-3 text-sm shadow-sm"><div className="min-w-0"><p className="truncate font-bold">{a}</p>{b && <p className="text-xs text-muted">{b}</p>}</div>{c}</div>
const Pill = ({ children, tone = 'bg-lime text-lime-ink' }: { children: ReactNode; tone?: string }) => <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold', tone)}>{children}</span>

const Chip = ({ children }: { children: ReactNode }) => <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold shadow-sm">{children}</span>

/** Section 1: the chat-to-order story. Left: how it goes without a store. Right: the same order, complete. */
export function WhatsAppOrdering() {
  return (
    <section id="products" className="py-20 md:py-28">
      <div className={wrap}>
        <Eyebrow>WhatsApp ordering</Eyebrow>
        <h2 className="max-w-3xl text-3xl md:text-5xl">Stop piecing orders together from chat.</h2>
        <p className="mt-4 max-w-2xl text-muted">Customers pick from your storefront and check out. You get one complete message — items, total, delivery address, preferred time — instead of twenty back-and-forth texts.</p>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <Reveal x={-30} y={0}><div className="h-full rounded-[28px] glass p-6"><p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted">Before</p>
            <div className="space-y-2.5"><Bubble>Hi do u have the silk scarf</Bubble><Bubble me>Yes! Which size?</Bubble><Bubble>M. how much with delivery to Kilimani</Bubble><Bubble me>1,200 + 200 delivery</Bubble><Bubble>ok. can u do saturday morning? i'll send mpesa</Bubble></div></div></Reveal>
          <Reveal x={30} y={0} delay={0.1}><div className="h-full rounded-[28px] sky p-6"><p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted">With Aqivo</p>
            <div className="rounded-2xl rounded-bl-sm bg-white p-4 text-sm shadow-sm"><p className="font-extrabold">New order #1042</p>
              <ul className="mt-2 space-y-0.5 text-stone-700"><li>• 1× Silk Scarf (M) — KSh 1,200</li><li>Delivery (Kilimani): KSh 200</li></ul>
              <p className="mt-2 font-extrabold">Total: KSh 1,400</p>
              <p className="mt-1 text-stone-600">Sat 10:00 · Amina K. · M-Pesa</p>
              <p className="mt-2 text-xs text-muted">Track: aqivo.shop/yourname/order/…</p></div>
            <p className="mt-4 text-center text-xs text-muted/80">Illustration with sample data</p></div></Reveal>
        </div>
      </div>
    </section>
  )
}

/** Section 2: order management, with the Aqivo-specific "where did this customer come from" column. */
export function OrderManagement() {
  const rows: [string, string, string, string, string, string][] = [['#1043', 'John M.', 'KSh 3,500', 'Instagram', 'Pending', 'bg-amber-100 text-amber-800'], ['#1042', 'Amina K.', 'KSh 1,400', 'QR poster', 'Confirmed', 'bg-blue-100 text-blue-800'], ['#1041', 'Faith N.', 'KSh 2,800', 'WhatsApp', 'Completed', 'bg-green-100 text-green-800'], ['#1040', 'Peter O.', 'KSh 1,200', 'Direct', 'Cancelled', 'bg-red-100 text-red-800']]
  return (
    <section className="py-8 md:py-14">
      <div className={cn(wrap, 'grid items-center gap-10 lg:grid-cols-2 lg:gap-16')}>
        <Reveal x={-40} y={0}><Eyebrow>Order management</Eyebrow><h3 className="text-2xl md:text-4xl">Every order in one place, with where it came from.</h3>
          <p className="mt-4 max-w-lg text-muted">Confirm, mark paid, assign a rider and message the customer. Stock goes down automatically and can't be oversold. Unlike a plain order list, you also see which post or poster brought the order.</p>
          <ul className="mt-5 space-y-2">{['Status and payment state on every order', 'Rider name, phone and tracking link the customer can see', 'Source of every order: Instagram, TikTok, QR, WhatsApp…', 'Receipts and a customer tracking page'].map((t) => <li key={t} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-ok" />{t}</li>)}</ul></Reveal>
        <Reveal x={40} y={0} delay={0.1}><div className="rounded-[28px] sky p-5 md:p-8"><div className="overflow-hidden rounded-2xl bg-white/90 text-sm shadow-sm">
          <div className="grid grid-cols-[56px_1fr_84px_84px] gap-2 border-b border-line px-4 py-2.5 text-xs font-bold text-muted"><span>Order</span><span>Customer</span><span className="hidden sm:block">From</span><span>Status</span></div>
          {rows.map(([n, c, t, src, st, tone]) => <div key={n} className="grid grid-cols-[56px_1fr_84px_84px] items-center gap-2 border-b border-line/60 px-4 py-3 last:border-0"><span className="font-bold">{n}</span><span className="min-w-0"><span className="block truncate font-semibold">{c}</span><span className="text-xs text-muted">{t}</span></span><span className="hidden text-xs text-muted sm:block">{src}</span><Pill tone={tone}>{st}</Pill></div>)}</div>
          <p className="mt-4 text-center text-xs text-muted/80">Illustration with sample data</p></div></Reveal>
      </div>
    </section>
  )
}

/** Section 3: payments, honestly: your own accounts, money goes to you. */
export function PaymentsBlock() {
  const methods = ['M-Pesa till / paybill', 'M-Pesa prompt (Daraja)', 'Paystack', 'Flutterwave', 'Cards & mobile money', 'Bank transfer', 'Cash on delivery']
  return (
    <section className="py-8 md:py-14">
      <div className={wrap}>
        <div className="rounded-[36px] glass p-8 md:p-12">
          <Eyebrow>Payments</Eyebrow>
          <h3 className="max-w-3xl text-2xl md:text-4xl">Get paid into your own accounts. Aqivo never holds your money.</h3>
          <p className="mt-4 max-w-2xl text-muted">Connect your own Paystack, Flutterwave or M-Pesa (Daraja) account, or keep it simple with a till number or bank details. Each option appears at checkout only once it actually works.</p>
          <div className="mt-6 flex flex-wrap gap-2">{methods.map((m) => <Chip key={m}>{m}</Chip>)}</div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white/80 p-5"><p className="font-extrabold">Confirmed automatically</p><p className="mt-1 text-sm text-muted">Card, mobile money and M-Pesa prompts: the provider tells us when it's paid, we check the amount and mark the order paid. No chasing screenshots.</p></div>
            <div className="rounded-2xl bg-white/80 p-5"><p className="font-extrabold">Confirmed by you</p><p className="mt-1 text-sm text-muted">Till, paybill and bank transfer: the customer sends the payment code, you check it against your statement and confirm.</p></div>
          </div>
          <p className="mt-4 text-xs text-muted">Not available yet: Pesapal, DPO, PawaPay and Airtel Money checkout.</p>
        </div>
      </div>
    </section>
  )
}

/** Section 4: messages and follow-ups, with the "you approve, we never send on our own" rule up front. */
export function Messaging() {
  const items: [string, string][] = [['Order updates', 'Customers get a WhatsApp when you confirm, dispatch or complete their order.'], ['Win-back campaigns', 'Find customers who haven\'t been back in 30–90 days and prepare one message each.'], ['Review requests', 'Single-use links, so every review is from a real customer.'], ['Daily plan', 'Leads waiting, orders to confirm, products people view but don\'t buy.']]
  return (
    <section className="py-8 md:py-14">
      <div className={wrap}>
        <Eyebrow>Follow-ups</Eyebrow>
        <h3 className="max-w-3xl text-2xl md:text-4xl">Keep customers coming back — without sending anything you haven't approved.</h3>
        <p className="mt-4 max-w-2xl text-muted">Messages go out from your own WhatsApp number, only when you've turned them on or confirmed a campaign. Aqivo AI can prepare drafts; you review and send.</p>
        <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.map(([t, b]) => <Item key={t}><div className="h-full rounded-[24px] glass p-5"><h4 className="text-base font-bold">{t}</h4><p className="mt-2 text-sm text-muted">{b}</p></div></Item>)}</Stagger>
      </div>
    </section>
  )
}

export function Features() {
  return (
    <section className="py-8 md:py-14">
      <div className={cn(wrap, 'divide-y divide-white/70')}>
        <FeatureRow eyebrow="Storefront builder" title="Build it your way. Nothing to code, nothing locked into a template."
          body="Your storefront is a stack of sections you add, drag and edit: hero, products, categories, FAQ, video, map, WhatsApp prompt, opening hours and more. What you see in the preview is exactly what customers get."
          points={['Drag to reorder, hide, duplicate — on mobile too', 'Click a section in the preview to edit it', 'Extra pages and a menu you control', 'Your own domain, HTTPS-checked, with redirects']}
          visual={<div className="space-y-2"><Row a="Hero" b="Silk scarves, 10% off this week" c={<Pill>Visible</Pill>} /><Row a="Product grid" b="Shop the range" c={<Pill>Visible</Pill>} /><Row a="FAQ" b="Questions, answered" c={<Pill tone="bg-black/5 text-ink">Hidden</Pill>} /><Row a="WhatsApp prompt" b="Prefer WhatsApp?" c={<Pill>Visible</Pill>} /></div>} />
        <FeatureRow flip eyebrow="Know what works" title="See which post, poster or message actually brought a customer."
          body="Share links with the channel built in — Instagram, TikTok, WhatsApp, a QR poster. Aqivo credits every visit, enquiry, order and booking to the source, and shows the whole journey as a funnel."
          points={['Visitors, enquiries, orders and revenue by source', 'Campaign links and QR codes with scan counts', 'Honest numbers: “Not enough data yet” when that is the truth']}
          visual={<div className="space-y-2"><Row a="Instagram" b="84 visitors · 12 enquiries" c={<Pill>KSh 24,500</Pill>} /><Row a="QR poster" b="41 scans · 6 orders" c={<Pill>KSh 9,800</Pill>} /><Row a="TikTok" b="29 visitors · 1 order" c={<Pill tone="bg-black/5 text-ink">KSh 1,200</Pill>} /></div>} />
        <FeatureRow eyebrow="Aqivo AI" title="A daily plan from your own numbers — and drafts you approve."
          body="Every morning Aqivo lists what matters: leads waiting, orders to confirm, customers who haven't been back, products people look at but don't buy. It can prepare the WhatsApp follow-ups and campaign copy; you review and send."
          points={['Every item shows the numbers behind it', 'Drafts only — nothing is sent or changed without your confirmation', 'Ask “which source brings customers?” or “why are my sales down?”']}
          visual={<div className="space-y-2.5"><Row a="3 leads waiting for a reply" b="Longest: 6 hours" c={<Pill tone="bg-red-100 text-red-800">Do first</Pill>} /><Row a="18 customers away 45+ days" b="Prepare win-back messages" c={<Pill tone="bg-amber-100 text-amber-800">This week</Pill>} /><div className="flex gap-2"><Pill tone="bg-ink text-white">Prepare follow-ups</Pill><Pill tone="bg-black/5 text-ink">Review first</Pill></div></div>} />
        <FeatureRow flip eyebrow="Customers & reviews" title="Remember every customer and bring them back."
          body="Every enquiry, booking and order lands on one customer timeline, with where they came from. Aqivo shows who hasn't been back in 30, 45, 60 or 90 days, and sends single-use review links so reviews are verified."
          points={['Timeline of enquiries, orders, visits and messages', 'Win-back lists with one message per customer', 'Verified reviews on products and on your business']}
          visual={<div className="rounded-2xl bg-white/90 p-4 shadow-sm"><div className="flex items-center gap-3"><img src="/img/portrait-smile-sm.webp" alt="" loading="lazy" width={48} height={48} className="size-12 rounded-full object-cover" /><div><p className="text-lg font-extrabold leading-tight">Mary Wanjiku</p><p className="text-xs text-muted">Came from Instagram · spring-sale</p></div></div><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted">Orders + visits</dt><dd className="font-extrabold">7</dd></div><div><dt className="text-xs text-muted">Total spent</dt><dd className="font-extrabold">KSh 10,500</dd></div><div><dt className="text-xs text-muted">Favourite</dt><dd className="font-bold">Knotless Braids</dd></div><div><dt className="text-xs text-muted">Last order</dt><dd className="font-bold">24 Sept</dd></div></dl></div>} />
        <FeatureRow eyebrow="Found on Google" title="Your own address and a search check that tells you what to fix."
          body="Connect www.yourshop.co.ke with two DNS records. Aqivo checks your titles, descriptions, photos and local details and links straight to the fix."
          points={['Verified custom domain with a main-address redirect', 'Product, FAQ and business structured data', 'Redirects, social share image, Google Analytics & Meta Pixel']}
          visual={<div className="flex items-center gap-4 rounded-2xl bg-white/90 p-4 shadow-sm"><span className="grid size-16 shrink-0 place-items-center rounded-full bg-green-100 text-xl font-extrabold text-green-800">86</span><div className="text-sm"><p className="font-bold">Search readiness</p><p className="text-muted">2 products have no photo · add a social image</p></div></div>} />
      </div>
    </section>
  )
}

export function Pricing() {
  const { data } = useQuery({ queryKey: ['plans', 'KES'], queryFn: () => api.get<Plan[]>('/subscriptions/plans', { currency: 'KES' }) })
  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className={wrap}>
        <Eyebrow>Pricing</Eyebrow>
        <h2 className="max-w-2xl text-3xl md:text-5xl">Free to start. Fair to grow.</h2>
        <p className="mt-4 max-w-2xl text-muted">Start free — the storefront, orders and bookings are included. Upgrade for your own domain, analytics, campaigns and AI. Cancel any time; your data is kept.</p>
        <Stagger className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(data ?? []).map((p) => {
            const featured = p.key === 'GROW'
            return (
              <Item key={p.key} className="h-full"><motion.div whileHover={{ y: -8 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className={cn('flex h-full flex-col rounded-[24px] p-6', featured ? 'btn-brand border-transparent' : 'glass')}>
                <div className="flex items-center justify-between"><h3 className="text-xl">{p.name}</h3>{featured && <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-brand">Most popular</span>}</div>
                <p className={cn('mt-4 text-4xl font-extrabold tracking-tight', featured ? 'text-white' : 'text-ink')}>{p.price && Number(p.price) > 0 ? <CountUp prefix={p.currency === 'KES' ? 'KSh ' : `${p.currency} `} to={Number(p.price)} duration={1100} /> : 'Free'}<span className={cn('text-sm font-semibold', featured ? 'text-white/50' : 'text-muted')}>{p.price && Number(p.price) > 0 ? ' /month' : ''}</span></p>
                <p className={cn('mt-3 text-sm', featured ? 'text-white/60' : 'text-muted')}>{p.description}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm">{p.highlights.map((h) => <li key={h} className="flex gap-2"><Check className={cn('mt-0.5 size-4 shrink-0', featured ? 'text-white' : 'text-ok')} />{h}</li>)}</ul>
                <Link to="/register" className={cn('mt-6 rounded-full py-3 text-center text-sm font-bold', featured ? 'bg-white text-brand hover:bg-white/90' : 'btn-brand')}>{p.key === 'FREE' ? 'Start free' : 'Start free trial'}</Link>
              </motion.div></Item>
            )
          })}
        </Stagger>
      </div>
    </section>
  )
}

export function EarlyAccess() {
  return (
    <section className="py-20 md:py-28">
      <div className={cn(wrap, 'grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]')}>
        <div><img src="/img/salon-scissors-sm.webp" alt="A hairdresser working with scissors" loading="lazy" width={640} height={427} className="mb-8 aspect-[16/9] w-full max-w-xl rounded-[28px] object-cover shadow-[0_18px_40px_rgba(70,80,160,0.18)]" /><Eyebrow>Testimonials</Eyebrow><h2 className="text-3xl md:text-5xl">We're onboarding our first businesses.</h2>
          <p className="mt-4 max-w-xl text-muted">We won't invent reviews. When our first customers have results to share, they'll appear here in their own words. Want us to set your business up for you and show you a live demo?</p></div>
        <div className="rounded-[28px] btn-brand p-8"><p className="text-2xl font-extrabold leading-tight">“We'll set up your digital business presence for you.”</p>
          <p className="mt-3 text-sm">Salons, shops, restaurants, clinics, gyms and more — message us on WhatsApp for a done-for-you setup.</p>
          <Link to="/register" className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-bold text-brand">Start your business</Link></div>
      </div>
    </section>
  )
}

const FAQS = [
  ['Is Aqivo just a website builder?', "No. The storefront is one part: you also take orders and bookings, see which channel brought each customer, and get a daily plan of what to do next."],
  ['Is it really free?', "Yes. The storefront builder, products, orders, WhatsApp checkout, bookings, customer list and reviews are on the free plan, with sensible limits (for example 30 products). Paid plans add your own domain, analytics, campaigns and AI."],
  ['Do I need to design anything?', 'No. Aqivo builds your first storefront from your details. Then you can drag sections, change colours and fonts, and add pages — or leave it as it is.'],
  ['Can I use my own domain?', "Yes, on Grow and above. You add two DNS records, Aqivo checks them, and you can make it your main address. Certificates come from the hosting layer; Aqivo tells you when HTTPS is actually working."],
  ['Does it work with M-Pesa?', "Yes, three ways. Customers can pay your till, paybill or phone and send you the code, and you confirm it. Or you connect your own Daraja account to send an M-Pesa prompt to the customer’s phone, or your own Paystack/Flutterwave account for cards and mobile money. Each option only appears at checkout once it's connected and working."],
  ['Can I use it from my phone?', "Yes. The dashboard is designed for phones first, and the builder has a phone preview."],
  ['What happens if I cancel?', 'Your plan stays active until the end of the period you paid for. Your storefront and data stay, paid features lock, and you can come back any time.'],
  ['Will Aqivo message my customers by itself?', 'Never on its own. Campaigns and AI drafts always need your confirmation, and messages go out through your own WhatsApp number. Order updates are only sent if you’ve connected WhatsApp and left them on.'],
]
export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="py-20 md:py-28">
      <div className={cn(wrap, 'grid gap-10 lg:grid-cols-[1fr_1.6fr]')}>
        <div><Eyebrow>FAQ</Eyebrow><h2 className="text-3xl md:text-5xl">Questions, answered.</h2></div>
        <div className="divide-y divide-white/70 rounded-[24px] glass">
          {FAQS.map(([q, a], i) => (
            <div key={q}>
              <button className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-bold" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>{q}<ChevronDown className={cn('size-5 shrink-0 transition-transform', open === i && 'rotate-180')} /></button>
              <AnimatePresence initial={false}>{open === i && <motion.div key="c" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden"><p className="px-6 pb-5 text-sm text-muted">{a}</p></motion.div>}</AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FinalCta() {
  return (
    <section className="px-3 py-10 sm:px-6">
      <motion.div initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.8 }} className="mx-auto max-w-[1400px] rounded-[40px] px-6 py-20 text-center text-white md:py-28" style={{ background: 'linear-gradient(160deg,#8fa8ff 0%,#5b3cf5 65%,#4a2ee0 100%)' }}>
        <h2 className="mx-auto max-w-3xl text-4xl md:text-6xl">Ready to get found?</h2>
        <p className="mx-auto mt-4 max-w-xl text-white/80">Create your free storefront now. Add your own domain when you're ready.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/register" className="rounded-full bg-white px-8 py-4 font-bold text-brand">Start your business</Link>
          <a href="#how" className="rounded-full border border-white/50 px-8 py-4 font-bold hover:bg-white/10">See how it works</a>
        </div>
      </motion.div>
    </section>
  )
}

export function SiteFooter() {
  return (
    <footer className="px-5 py-12 text-muted md:px-10">
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-8">
        <div className="max-w-xs"><Logo /><p className="mt-2 text-sm">Get Found. Get Customers. Grow. The storefront and growth platform built for African small businesses.</p></div>
        <div className="flex gap-16 text-sm"><div className="space-y-2"><p className="font-bold text-ink">Product</p><a href="/#how" className="block hover:text-ink">How it works</a><a href="/#pricing" className="block hover:text-ink">Pricing</a><a href="/#faq" className="block hover:text-ink">FAQ</a></div>
          <div className="space-y-2"><p className="font-bold text-ink">Account</p><Link to="/login" className="block hover:text-ink">Sign in</Link><Link to="/register" className="block hover:text-ink">Start your business</Link></div></div>
      </div>
      <p className="mx-auto mt-10 max-w-7xl text-xs">© {new Date().getFullYear()} Aqivo.shop. Demo businesses shown on this site are sample content, not real customers.</p>
    </footer>
  )
}

// icons referenced so tree-shaking keeps them meaningful in future rows
export const _icons = { MessageCircle, CreditCard, Search, Sparkles }
