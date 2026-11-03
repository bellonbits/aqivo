import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  MessageCircle,
  CreditCard,
  BarChart3,
  Bot,
  Cloud,
  Users,
} from 'lucide-react'
import { CreativeRobot } from '@/components/ui/CreativeRobot'

export default function Products() {
  return (
    <div className="space-y-24 sm:space-y-32 pb-24">
      {/* Full-Width Hero Header */}
      <section className="theme-hero-section relative w-full pt-14 pb-16 sm:pt-20 sm:pb-24 overflow-hidden">
        <div className="tech-grid absolute inset-0 opacity-20 pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] items-center">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 rounded-full bg-[#375a8a]/10 border border-[#375a8a]/30 px-3.5 py-1 text-xs font-semibold text-[#375a8a] mb-4 shadow-2xs"
              >
                <Sparkles className="size-3.5" />
                <span>Aqivo Product Ecosystem</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight"
              >
                Software Products by Aqivo
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2 }}
                className="mt-5 text-base sm:text-lg theme-muted leading-relaxed font-normal"
              >
                Alongside our strategic technology advisory and custom software engineering, Aqivo builds specialized
                software products designed to solve concrete operational and commercial hurdles.
              </motion.p>
            </div>

            <div className="flex justify-center">
              <CreativeRobot
                variant="floating"
                size="md"
                badgeText="Commercial Engine Vanguard"
                showOrbits={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Flagship Product: Aqivo Store */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="theme-card relative overflow-hidden rounded-3xl shadow-2xl">
          {/* Top Banner */}
          <div className="bg-[#375a8a] px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-mono">
              <span className="flex size-2 rounded-full bg-white animate-pulse" />
              <span>Available Now — Flagship Product</span>
            </div>
            <span className="text-xs text-white/90 font-mono">Built for modern retailers, clinics, and service brands</span>
          </div>

          <div className="p-8 sm:p-14">
            <div className="grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-[#375a8a]/10 px-4 py-2 border border-[#375a8a]/30">
                  <ShoppingBag className="size-6 text-[#375a8a]" />
                  <span className="text-xl font-bold text-[#375a8a]">Aqivo Store</span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight text-slate-900 dark:text-white">
                  Turn Your Physical Business Into an Automated Digital Store.
                </h2>

                <p className="text-sm sm:text-base theme-muted leading-relaxed font-normal">
                  Aqivo Store is a modern digital storefront and ordering platform that helps merchants seamlessly
                  transition from chaotic WhatsApp-only selling to a streamlined, automated online commerce workflow.
                </p>

                {/* Journey Concept */}
                <div className="theme-card-subtle rounded-xl p-4">
                  <p className="text-[11px] font-mono font-bold uppercase tracking-wider theme-muted mb-2">
                    The Transition Model
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-bold">
                    <span className="theme-card rounded-md px-3 py-1.5">Physical Shop</span>
                    <span className="text-[#375a8a]">→</span>
                    <span className="rounded-md bg-[#375a8a] text-white px-3 py-1.5 shadow-sm">Aqivo Store Platform</span>
                    <span className="text-[#375a8a]">→</span>
                    <span className="theme-card rounded-md px-3 py-1.5">Modern Online Store</span>
                  </div>
                </div>

                {/* Core Features */}
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider theme-muted mb-3">
                    Key Features & Capabilities
                  </h3>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {[
                      {
                        title: 'Digital Storefront',
                        desc: 'Clean mobile-first catalog with products, categories, photos, and live stock counts.',
                      },
                      {
                        title: 'Product & Inventory Management',
                        desc: 'Easily add variants, sizes, colors, and automate stock reduction on completed sales.',
                      },
                      {
                        title: 'Automated WhatsApp Ordering',
                        desc: 'Customers submit itemized carts that arrive formatted with delivery and payment details.',
                      },
                      {
                        title: 'Direct Payment Integration',
                        desc: 'Accept M-Pesa STK prompts, till numbers, paybills, and card processing without hidden fees.',
                      },
                      {
                        title: 'Customer & Order Tracking',
                        desc: 'Manage fulfillment status, rider dispatches, and automated customer order tracking links.',
                      },
                      {
                        title: 'Social Sharing & QR Codes',
                        desc: 'Generate printable QR codes for posters and tracked links for Instagram, TikTok, and WhatsApp.',
                      },
                    ].map((feat) => (
                      <div key={feat.title} className="theme-card-subtle rounded-xl p-3.5 transition">
                        <div className="flex items-center gap-2 text-xs font-bold text-inherit">
                          <CheckCircle2 className="size-3.5 text-[#375a8a] shrink-0" />
                          <span>{feat.title}</span>
                        </div>
                        <p className="mt-1 text-xs theme-muted leading-normal font-normal">{feat.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTAs */}
                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <Link
                    to="/register"
                    className="btn-brand inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold shadow-lg transition hover:scale-[1.02] active:scale-95"
                  >
                    <span>Launch an Aqivo Store</span>
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    to="/templates"
                    className="btn-dark inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition"
                  >
                    <span>Browse Storefront Designs</span>
                  </Link>
                </div>
              </div>

              {/* Product Visual / Specs Showcase */}
              <div className="theme-card-subtle rounded-3xl p-6 shadow-xl space-y-4 overflow-hidden">
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-black">
                  <img
                    src="/img/retail-2.webp"
                    alt="Aqivo Store merchant retail experience"
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60" />
                  <div className="absolute top-3 left-3">
                    <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs font-mono">
                      Live Storefront
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-[#375a8a] font-mono">Merchant Experience</p>
                      <p className="text-sm font-bold">Smart Digital Inventory</p>
                    </div>
                    <span className="rounded-lg bg-black/60 backdrop-blur-md px-2 py-1 text-[11px] font-semibold text-white border border-white/10">
                      Instant WhatsApp Cart
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="theme-card rounded-xl p-3.5 shadow-2xs">
                    <p className="text-xs theme-muted font-mono">Storefront Domain</p>
                    <p className="text-base font-bold text-inherit mt-0.5">aqivo.shop/yourbusiness</p>
                    <p className="text-xs text-[#375a8a] font-semibold mt-1 font-mono">Or custom domain (e.g. yourbrand.co.ke)</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="theme-card rounded-xl p-3 shadow-2xs">
                      <MessageCircle className="size-4 text-emerald-500 mb-1" />
                      <p className="text-xs font-bold text-inherit">WhatsApp Engine</p>
                      <p className="text-[11px] theme-muted mt-0.5">Itemized carts & automated customer receipts</p>
                    </div>
                    <div className="theme-card rounded-xl p-3 shadow-2xs">
                      <CreditCard className="size-4 text-[#375a8a] mb-1" />
                      <p className="text-xs font-bold text-inherit">Direct Payments</p>
                      <p className="text-[11px] theme-muted mt-0.5">M-Pesa STK push & automated bank reconciliation</p>
                    </div>
                  </div>

                  <div className="theme-card rounded-xl p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-bold text-inherit mb-1 font-mono">
                      <span>Checkout Speed</span>
                      <span className="text-[#375a8a]">~30 seconds</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div className="h-full w-4/5 rounded-full bg-[#375a8a]" />
                    </div>
                    <p className="mt-2 text-[11px] theme-muted font-normal">
                      Eliminates endless back-and-forth negotiation. Customers order and pay in seconds.
                    </p>
                  </div>
                </div>

                <div className="pt-1 text-center">
                  <Link
                    to="/templates"
                    className="text-xs font-bold text-[#375a8a] hover:underline inline-flex items-center gap-1 transition"
                  >
                    <span>Inspect live merchant templates</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Future Ecosystem Possibilities */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="theme-card rounded-3xl p-8 sm:p-12 shadow-2xl">
          <div className="max-w-2xl">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#375a8a]">
              Future Ecosystem Roadmaps
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Future Product Possibilities
            </h2>
            <p className="mt-2 text-xs sm:text-sm theme-muted leading-relaxed font-normal">
              We build specialized internal tools that we frequently refine into broader software products. These
              concepts represent future ecosystem expansions currently in active development or research.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                name: 'Aqivo Analytics',
                icon: BarChart3,
                status: 'In Research & Development',
                desc: 'Consolidated commercial intelligence and automated financial reporting for high-velocity startups.',
              },
              {
                name: 'Aqivo AI',
                icon: Bot,
                status: 'Internal Architecture Testing',
                desc: 'Domain-specific enterprise knowledge assistants and autonomous workflow agents for operations.',
              },
              {
                name: 'Aqivo Cloud',
                icon: Cloud,
                status: 'Planned Ecosystem Tool',
                desc: 'Pre-configured, hardened deployment blueprints and container orchestration designed for cost efficiency.',
              },
              {
                name: 'Aqivo Teams',
                icon: Users,
                status: 'Planned Ecosystem Tool',
                desc: 'Engineering competency assessment portals and automated technical interview evaluation suites.',
              },
            ].map((prod) => {
              const Icon = prod.icon
              return (
                <div
                  key={prod.name}
                  className="theme-card-subtle rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-[#375a8a]/30 transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="grid size-10 place-items-center rounded-xl bg-[#375a8a]/10 text-[#375a8a] border border-[#375a8a]/20">
                        <Icon className="size-5" />
                      </div>
                      <span className="rounded-full theme-card px-2 py-0.5 text-[10px] font-mono">
                        Roadmap
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{prod.name}</h3>
                    <p className="mt-1 text-xs theme-muted leading-relaxed font-normal">{prod.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10">
                    <span className="text-[11px] font-mono font-medium text-[#375a8a]">Status: {prod.status}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="mt-6 text-xs theme-muted italic text-center font-mono">
            Note: We only offer live products that are fully verified. Inquiries regarding custom enterprise versions can
            be discussed during discovery.
          </p>
        </div>
      </section>

      {/* Product Inquiry CTA */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl border border-slate-700/40 bg-[#0f172a] dark:bg-[#0a0f1d] p-8 sm:p-12 text-center text-white shadow-2xl relative overflow-hidden">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Need Custom Software for Your Business?</h2>
          <p className="mx-auto mt-2 max-w-lg text-xs sm:text-sm text-white/95 font-normal">
            If our standalone products don't cover your exact requirements, our software engineering team can design
            and build a bespoke platform tailored precisely to your operational workflow.
          </p>
          <div className="mt-6">
            <Link
              to="/contact?interest=software"
              className="rounded-full bg-white text-[#09090b] px-8 py-3.5 text-xs sm:text-sm font-bold shadow-xl transition hover:bg-zinc-100 hover:scale-105 active:scale-95"
            >
              <span>Discuss Custom Software</span>
              <ArrowRight className="size-3.5 ml-1.5 inline" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
