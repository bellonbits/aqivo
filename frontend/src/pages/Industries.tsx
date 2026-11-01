import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  Truck,
  CreditCard,
  GraduationCap,
  HeartPulse,
  Building,
  Briefcase,
  Layers,
  Code2,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'

const INDUSTRIES = [
  {
    name: 'E-commerce & Retail',
    icon: ShoppingBag,
    color: '#8B5CF6',
    image: '/img/retail-1.webp',
    challenge:
      'High cart abandonment, chaotic inventory tracking across multiple branches, manual WhatsApp receipt verification, and order fulfillment errors.',
    solution:
      'Integrated digital storefronts, automated payment webhooks (M-Pesa / cards), live multi-location stock synchronization, and customer WhatsApp tracking.',
    capabilities: ['Dynamic Inventory Management', 'Automated Payment Reconciliation', 'Delivery & Dispatch Tracking', 'Customer Re-engagement Workflows'],
  },
  {
    name: 'Logistics & Supply Chain',
    icon: Truck,
    color: '#3B82F6',
    image: '/img/auto-1.webp',
    challenge:
      'Fragmented driver communications, lack of real-time route visibility, manual paper waybills, and slow dispute resolution on delivered packages.',
    solution:
      'Fleet coordination portals, automated customer notification webhooks, barcode scanning check-ins, and digital proof-of-delivery systems.',
    capabilities: ['Driver Dispatch Portals', 'Automated SMS / WhatsApp Status Updates', 'Waybill & Barcode Systems', 'Real-Time Delivery Auditing'],
  },
  {
    name: 'Financial Services & FinTech',
    icon: CreditCard,
    color: '#10B981',
    image: '/img/professional-4.webp',
    challenge:
      'Strict regulatory compliance, audit logging requirements, secure customer authentication, and resilient transaction processing without double-charges.',
    solution:
      'Idempotent transactional APIs, secure tokenized user authentication, automated double-entry ledger design, and real-time fraud alert monitoring.',
    capabilities: ['Idempotent Payment APIs', 'Double-Entry Ledger Architecture', 'Role-Based Access Control (RBAC)', 'Comprehensive Audit Trails'],
  },
  {
    name: 'Education & EdTech',
    icon: GraduationCap,
    color: '#F59E0B',
    image: '/img/education-1.webp',
    challenge:
      'Disjointed student tracking, manual fee verification via bank slips, clunky content delivery on mobile devices, and poor student engagement metrics.',
    solution:
      'Mobile-optimized learning portals, automated fee reconciliation via mobile money APIs, automated attendance tracking, and parent communication channels.',
    capabilities: ['Mobile-First Course Portals', 'Automated School Fee Reconciliation', 'Student Progress Dashboards', 'Automated Parent Alerts'],
  },
  {
    name: 'Healthcare & Clinics',
    icon: HeartPulse,
    color: '#F43F5E',
    image: '/img/clinic-1.webp',
    challenge:
      'High patient no-show rates, disorganized appointment schedules, insecure patient records, and chaotic consultation follow-ups.',
    solution:
      'Self-service 24/7 appointment booking engines, automated WhatsApp appointment reminders, specialist schedule management, and secure patient intake.',
    capabilities: ['Automated Appointment Reminders', 'Specialist Capacity Scheduling', 'Secure Digital Intake Forms', 'Upfront Consultation Deposits'],
  },
  {
    name: 'Real Estate & PropTech',
    icon: Building,
    color: '#06B6D4',
    image: '/img/real-estate-1.webp',
    challenge:
      'Unstructured lead capture from social media ads, manual tenant rent tracking, slow maintenance request dispatching, and paper receipts.',
    solution:
      'Centralized property inquiry dashboards, automated rent reminder webhooks, tenant maintenance ticketing, and automated digital receipts.',
    capabilities: ['Lead Capture & Inquiry Routing', 'Automated Rent Invoicing & Receipts', 'Maintenance Ticket Workflows', 'Property Catalog Portals'],
  },
  {
    name: 'Professional Services',
    icon: Briefcase,
    color: '#6366F1',
    image: '/img/professional-1.webp',
    challenge:
      'Consultants and agencies losing billable hours to manual invoicing, back-and-forth client scheduling, and fragmented project status updates.',
    solution:
      'Unified client portals with calendar booking, automated upfront retainer invoicing, file delivery storage, and milestone approval dashboards.',
    capabilities: ['Client Booking Calendars', 'Milestone Invoicing & Approvals', 'Client Document Portals', 'Automated Follow-Up Workflows'],
  },
  {
    name: 'Multi-Sided Marketplaces',
    icon: Layers,
    color: '#EC4899',
    image: '/img/retail-4.webp',
    challenge:
      'Balancing buyer and seller trust, complex commission splits, multi-vendor payouts, and search latency across large product catalogs.',
    solution:
      'Robust multi-tenant marketplace architectures, automated escrow or split-settlement workflows, vendor management dashboards, and fast search indexing.',
    capabilities: ['Multi-Vendor Admin Portals', 'Split Payment Architectures', 'Optimized Catalog Search', 'Review & Verification Engines'],
  },
  {
    name: 'B2B SaaS Platforms',
    icon: Code2,
    color: '#14B8A6',
    image: '/img/professional-3.webp',
    challenge:
      'Managing tenant data isolation, user seat billing, rate limiting, granular role permissions, and API telemetry as customer companies scale.',
    solution:
      'Multi-tenant database architectures (shared database with tenant isolation or schema-per-tenant), automated subscription billing, and real-time telemetry.',
    capabilities: ['Multi-Tenant Data Isolation', 'Subscription & Usage-Based Billing', 'Enterprise RBAC & SSO', 'API Rate Limiting & Telemetry'],
  },
]

export default function Industries() {
  return (
    <div className="space-y-24 sm:space-y-32 py-10">
      {/* Header */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3.5 py-1 text-xs font-semibold text-brand mb-4">
            <Sparkles className="size-3.5" />
            <span>Vertical Domain Architectures</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Technology Solutions Designed Around Your Business Model
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Technology should fit your operational workflow—not the other way around. We design system architectures,
            databases, and automated workflows tailored to the specific economics and operational realities of your industry.
          </p>
        </div>
      </section>

      {/* Industries Grid with Photographic Headers */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((ind) => {
            const Icon = ind.icon
            return (
              <div
                key={ind.name}
                className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div>
                  {/* Photo Header */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                    <img
                      src={ind.image}
                      alt={`${ind.name} architectural context`}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
                    
                    <div className="absolute bottom-3 left-4 right-4 flex items-center gap-3 text-white">
                      <div
                        className="grid size-10 place-items-center rounded-xl text-white shadow-md shrink-0 backdrop-blur-xs"
                        style={{ backgroundColor: ind.color }}
                      >
                        <Icon className="size-5" />
                      </div>
                      <h2 className="text-lg font-bold leading-tight drop-shadow-xs">{ind.name}</h2>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1">Common Bottleneck</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{ind.challenge}</p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-emerald-50/40 p-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1">Aqivo Architecture</p>
                      <p className="text-xs text-slate-700 leading-relaxed">{ind.solution}</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Key Capabilities</p>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        {ind.capabilities.map((cap) => (
                          <li key={cap} className="flex items-center gap-2">
                            <CheckCircle2 className="size-3.5 text-brand shrink-0" />
                            <span>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 border-t border-slate-100 mt-2">
                  <div className="pt-4">
                    <Link
                      to={`/contact?industry=${encodeURIComponent(ind.name)}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 group-hover:text-brand transition-colors"
                    >
                      <span>Discuss {ind.name} architecture</span>
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Domain Consultation CTA */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl bg-slate-900 p-8 sm:p-14 text-center text-white">
          <h2 className="text-2xl sm:text-4xl font-extrabold">Operating in a Highly Specialized Sector?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-slate-300">
            If your industry has bespoke regulatory requirements, proprietary hardware integrations, or specialized
            data pipelines, our architecture team will deconstruct your technical requirements from first principles.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/contact"
              className="btn-brand rounded-full px-8 py-3.5 text-sm sm:text-base font-bold shadow-lg"
            >
              Start Industry Discovery
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
