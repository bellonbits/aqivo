import { Link } from 'react-router-dom'
import {
  Lock,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Key,
  Server,
  ArrowRight,
  Sparkles,
  EyeOff,
} from 'lucide-react'

export default function ConfidentialitySecurity() {
  return (
    <div className="space-y-24 sm:space-y-32 pb-24">
      {/* Full-Width Hero Header */}
      <section className="relative w-full border-b border-slate-200/80 bg-gradient-to-b from-white via-purple-50/20 to-slate-50/70 pt-14 pb-16 sm:pt-20 sm:pb-24">
        <div className="tech-grid absolute inset-0 opacity-30 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3.5 py-1 text-xs font-semibold text-brand mb-4 shadow-2xs">
              <Sparkles className="size-3.5" />
              <span>Data Protection & IP Safeguards</span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Confidentiality, Intellectual Property & Security
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Your startup ideas, proprietary customer records, and system codebases represent your greatest commercial
              assets. We treat them with institutional security discipline from day one.
            </p>
          </div>
        </div>
      </section>

      {/* Security Commitments Grid */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: 'Strict Mutual Non-Disclosure (NDA)',
              desc: 'Before any code is reviewed, database schema inspected, or commercial strategy discussed, we execute a legally binding Mutual Non-Disclosure Agreement safeguarding all disclosures.',
              icon: FileText,
              tag: 'Legal Protection',
            },
            {
              title: 'Zero Proprietary Data Training in AI',
              desc: 'When implementing LLMs or RAG systems, we enforce zero-data-retention enterprise API policies. Your corporate documents, customer chat logs, and embeddings are never ingested into external training corpora.',
              icon: EyeOff,
              tag: 'AI Privacy Shield',
            },
            {
              title: 'Granular Access & Multi-Factor Auth',
              desc: 'All development workstations and cloud environments enforce strict MFA, hardware security keys, ephemeral SSH certificates, and role-based access control (RBAC). No shared credentials.',
              icon: Key,
              tag: 'Credential Segregation',
            },
            {
              title: 'Encryption at Rest & in Transit',
              desc: 'All client databases, Redis caches, object storage buckets, and API communication channels enforce modern cryptographic protocols: TLS 1.3 in transit and AES-256 encryption at rest.',
              icon: Lock,
              tag: 'Cryptographic Integrity',
            },
            {
              title: 'Regulatory & Compliance Readiness',
              desc: 'We architect systems in alignment with the Kenya Data Protection Act (DPA), GDPR, and PCI-DSS compliance frameworks for secure payment processing and customer consent tracking.',
              icon: ShieldCheck,
              tag: 'Compliance Aligned',
            },
            {
              title: '100% Complete IP Assignment',
              desc: 'Every software line, database migration script, infrastructure manifest, and design token is assigned to your company with full copyright and intellectual property handover.',
              icon: Server,
              tag: 'Total IP Ownership',
            },
          ].map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="grid size-12 place-items-center rounded-2xl bg-purple-50 text-brand">
                      <Icon className="size-6" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                      {item.tag}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900">{item.title}</h2>
                  <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">{item.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Enforced Across All Engagements</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* NDA Request Box */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-slate-900 p-8 sm:p-14 text-white text-center">
          <div className="mx-auto max-w-2xl space-y-4">
            <span className="rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-purple-200 border border-white/15">
              Secure Onboarding
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight">
              Request an NDA Prior to Initial Discussion
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              If your company requires an executed Non-Disclosure Agreement before sharing product roadmaps or system
              architecture, our team will countersign your standard NDA or provide our standard mutual NDA immediately.
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <Link
                to="/contact?interest=strategy&nda=true"
                className="btn-brand inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm sm:text-base font-bold shadow-lg"
              >
                <span>Request NDA & Discovery Call</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/ethical-architecture"
                className="glass inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm sm:text-base font-bold text-white border border-white/20 hover:bg-white/10"
              >
                <span>Review Ethical Architecture</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
