import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
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
import { CreativeRobot } from '@/components/ui/CreativeRobot'

export default function ConfidentialitySecurity() {
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
                <span>Data Protection & IP Safeguards</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight"
              >
                Confidentiality, Intellectual Property & Security
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2 }}
                className="mt-5 text-base sm:text-lg theme-muted leading-relaxed font-normal"
              >
                Your startup ideas, proprietary customer records, and system codebases represent your greatest commercial
                assets. We treat them with institutional security discipline from day one.
              </motion.p>
            </div>

            <div className="flex justify-center">
              <CreativeRobot
                variant="floating"
                size="md"
                badgeText="Enterprise Cryptographic Discipline"
                showOrbits={true}
              />
            </div>
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
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: (idx % 3) * 0.1 }}
                className="theme-card flex flex-col justify-between rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="grid size-12 place-items-center rounded-2xl bg-[#375a8a]/10 text-[#375a8a] border border-[#375a8a]/20">
                      <Icon className="size-6" />
                    </div>
                    <span className="rounded-full theme-card-subtle px-2.5 py-0.5 text-[11px] font-mono font-bold">
                      {item.tag}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{item.title}</h2>
                  <p className="mt-3 text-xs sm:text-sm theme-muted leading-relaxed font-normal">{item.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 text-xs font-mono font-semibold text-emerald-500">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Enforced Across All Engagements</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* NDA Request Box */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="theme-card rounded-3xl p-8 sm:p-14 text-center shadow-2xl relative overflow-hidden">
          <div className="mx-auto max-w-2xl space-y-4">
            <span className="rounded-full bg-[#375a8a]/10 border border-[#375a8a]/30 px-3.5 py-1 text-xs font-mono font-semibold text-[#375a8a]">
              Secure Onboarding
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight text-slate-900 dark:text-white">
              Request an NDA Prior to Initial Discussion
            </h2>
            <p className="text-sm sm:text-base theme-muted leading-relaxed font-normal">
              If your company requires an executed Non-Disclosure Agreement before sharing product roadmaps or system
              architecture, our team will countersign your standard NDA or provide our standard mutual NDA immediately.
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <Link
                to="/contact?interest=strategy&nda=true"
                className="btn-brand inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm sm:text-base font-bold shadow-lg hover:scale-105 transition"
              >
                <span>Request NDA & Discovery Call</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/ethical-architecture"
                className="btn-dark inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm sm:text-base font-semibold transition"
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
