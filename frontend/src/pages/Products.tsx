import { Link } from 'react-router-dom'
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

export default function Products() {
  return (
    <div className="space-y-24 sm:space-y-32 py-10">
      {/* Header */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3.5 py-1 text-xs font-semibold text-brand mb-4">
            <Sparkles className="size-3.5" />
            <span>Aqivo Product Ecosystem</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Software Products by Aqivo
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Alongside our strategic technology advisory and custom software engineering, Aqivo builds specialized
            software products designed to solve concrete operational and commercial hurdles.
          </p>
        </div>
      </section>

      {/* Flagship Product: Aqivo Store */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-brand via-purple-700 to-indigo-800 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Available Now — Flagship Product</span>
            </div>
            <span className="text-xs text-purple-200">Built for retailers, service pros, and merchants</span>
          </div>

          <div className="p-8 sm:p-14">
            <div className="grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-purple-50 px-4 py-2 border border-purple-200/60">
                  <ShoppingBag className="size-6 text-brand" />
                  <span className="text-xl font-bold text-slate-900">Aqivo Store</span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                  Turn Your Physical Business Into an Online Store.
                </h2>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                  Aqivo Store is a modern digital storefront and ordering platform that helps merchants seamlessly
                  transition from physical and WhatsApp-only selling to an automated, structured online commerce workflow.
                </p>

                {/* Journey Concept */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">The Transition Model</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                    <span className="rounded-md bg-white px-3 py-1.5 border border-slate-200 shadow-2xs">Physical Shop</span>
                    <span className="text-slate-400">→</span>
                    <span className="rounded-md bg-brand text-white px-3 py-1.5 shadow-xs">Aqivo Store Platform</span>
                    <span className="text-slate-400">→</span>
                    <span className="rounded-md bg-white px-3 py-1.5 border border-slate-200 shadow-2xs">Modern Online Store</span>
                  </div>
                </div>

                {/* Core Features */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Key Features & Capabilities</h3>
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
                      <div key={feat.title} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                          <CheckCircle2 className="size-3.5 text-brand shrink-0" />
                          <span>{feat.title}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 leading-normal">{feat.desc}</p>
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
                    className="glass inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-slate-800 border border-slate-200 transition hover:bg-white"
                  >
                    <span>Browse Storefront Designs</span>
                  </Link>
                </div>
              </div>

              {/* Product Visual / Specs Showcase with Real Retail Imagery */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl space-y-4 overflow-hidden">
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
                  <img
                    src="/img/retail-2.webp"
                    alt="Aqivo Store merchant retail experience"
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      Live Storefront
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-purple-200">Merchant Experience</p>
                      <p className="text-sm font-bold">Smart Digital Inventory</p>
                    </div>
                    <span className="rounded-lg bg-white/20 backdrop-blur-md px-2 py-1 text-[11px] font-semibold text-white">
                      Instant WhatsApp Cart
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 shadow-2xs">
                    <p className="text-xs text-slate-400 font-mono">Storefront Domain</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5">aqivo.shop/yourbusiness</p>
                    <p className="text-xs text-brand font-semibold mt-1">Or your own custom domain (e.g. yourbrand.co.ke)</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                      <MessageCircle className="size-4 text-emerald-600 mb-1" />
                      <p className="text-xs font-bold text-slate-900">WhatsApp Engine</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Itemized carts & automated customer receipts</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                      <CreditCard className="size-4 text-brand mb-1" />
                      <p className="text-xs font-bold text-slate-900">Direct Payments</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">M-Pesa STK push & bank transfer verification</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1">
                      <span>Checkout Speed</span>
                      <span className="text-brand">~30 seconds</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-brand to-emerald-500" />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Eliminates endless text negotiations. Customers order and pay in seconds.
                    </p>
                  </div>
                </div>

                <div className="pt-1 text-center">
                  <Link
                    to="/templates"
                    className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
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

      {/* Future Ecosystem Possibilities (Honest & Explicit) */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-slate-50/80 p-8 sm:p-12">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Future Ecosystem Roadmaps</span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
              Future Product Possibilities
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
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
                desc: 'Consolidated commercial intelligence and automated financial reporting for high-velocity African startups.',
              },
              {
                name: 'Aqivo AI',
                icon: Bot,
                status: 'Internal Architecture Testing',
                desc: 'Domain-specific enterprise knowledge assistants and autonomous workflow agents for customer operations.',
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
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="grid size-10 place-items-center rounded-xl bg-purple-50 text-brand">
                        <Icon className="size-5" />
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        Roadmap
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-bold text-slate-900">{prod.name}</h3>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">{prod.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-medium text-purple-700">Status: {prod.status}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="mt-6 text-xs text-slate-400 italic text-center">
            Note: We only offer live products that are fully verified. Inquiries regarding custom enterprise versions can
            be discussed during discovery.
          </p>
        </div>
      </section>

      {/* Product Inquiry CTA */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl bg-slate-900 p-8 sm:p-12 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-extrabold">Need Custom Software for Your Business?</h2>
          <p className="mx-auto mt-2 max-w-lg text-xs sm:text-sm text-slate-300">
            If our standalone products don't cover your exact requirements, our software engineering team can design
            and build a bespoke platform tailored precisely to your operational workflow.
          </p>
          <div className="mt-6">
            <Link
              to="/contact?interest=software"
              className="btn-brand inline-flex items-center gap-2 rounded-full px-7 py-3 text-xs sm:text-sm font-bold shadow-md"
            >
              <span>Discuss Custom Software</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
