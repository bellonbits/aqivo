import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Scale,
  Code2,
  Database,
  Cpu,
  FileCheck,
} from 'lucide-react'
import { CreativeRobot } from '@/components/ui/CreativeRobot'

export default function EthicalArchitecture() {
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
                <span>Engineering Principles & Integrity</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight"
              >
                Ethical Architecture & Engineering Integrity
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2 }}
                className="mt-5 text-base sm:text-lg theme-muted leading-relaxed font-normal"
              >
                Software decisions are business decisions. We reject artificial vendor lock-in, inflated cloud bills,
                and unverified AI hype. Our architectural commitments prioritize your company's long-term independence.
              </motion.p>
            </div>

            <div className="flex justify-center">
              <CreativeRobot
                variant="floating"
                size="md"
                badgeText="Zero Technical Debt Guardian"
                showOrbits={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Core Tenets Grid */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: '100% Client IP & Code Ownership',
              desc: 'From your very first commit, all intellectual property, source code, data models, and documentation belong strictly to your company. We never use proprietary runtime wrappers that hold your system hostage.',
              icon: FileCheck,
              highlight: 'Zero Hostage Codebases',
            },
            {
              title: 'Pragmatic Technology Choices',
              desc: 'We never select frameworks or complex distributed systems to pad an engineer’s resume. We choose battle-tested, maintainable technology (PostgreSQL, TypeScript, Python) with large talent pools and proven durability.',
              icon: Code2,
              highlight: 'Boring Tech That Compounds',
            },
            {
              title: 'Responsible & Grounded AI',
              desc: 'We never train public foundation models on your customer or proprietary business data. Every AI pipeline we implement uses secure zero-retention enterprise APIs, strict verification boundaries, and local embeddings.',
              icon: Cpu,
              highlight: 'Zero Data Training on Your Assets',
            },
            {
              title: 'Frugal & Scalable Cloud Topology',
              desc: 'We architect systems to minimize unnecessary cloud expenses. Instead of bloated microservices that drain your startup budget, we design optimized monolithic or modular architectures that scale smoothly on modest hosting.',
              icon: Scale,
              highlight: 'Cost-Conscious Infrastructure',
            },
            {
              title: 'Data Sovereignty & Privacy by Design',
              desc: 'We adhere to the highest international data privacy standards and regional frameworks (such as the Kenya Data Protection Act). Zero unauthorized third-party telemetry, strict access controls, and full database encryption.',
              icon: Database,
              highlight: 'Regulatory Compliance Built-In',
            },
            {
              title: 'Sustainable Knowledge Transfer',
              desc: 'A true technology partner should empower you to eventually run without them. We author comprehensive architectural documentation, run structured code reviews, and onboard your internal developers for a seamless handover.',
              icon: ShieldCheck,
              highlight: 'Full Knowledge Independence',
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
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-mono font-bold text-emerald-500 border border-emerald-500/30">
                      {item.highlight}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{item.title}</h2>
                  <p className="mt-3 text-xs sm:text-sm theme-muted leading-relaxed font-normal">{item.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 text-xs font-mono font-semibold theme-muted">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span>Verified Standard Operating Procedure</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* The Anti-Agency Manifesto */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="theme-card rounded-3xl p-8 sm:p-14 shadow-2xl relative overflow-hidden">
          <div className="max-w-3xl space-y-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#375a8a]">
              Our Pledge to Founders
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight text-slate-900 dark:text-white">
              What Aqivo Will Never Do
            </h2>
            <p className="text-sm sm:text-base theme-muted leading-relaxed font-normal">
              We hold ourselves to a strict standard of professional ethics. In every engagement, our priorities are your
              commercial success, data privacy, and engineering sovereignty.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'No Proprietary Trapdoors',
                desc: 'We never build software on closed internal platforms that require an ongoing monthly licensing fee to Aqivo just to keep your app running.',
              },
              {
                title: 'No Artificial AI Hype',
                desc: 'We will frankly tell you when AI is NOT the right solution for your problem. If a standard SQL query solves it better, we build the SQL query.',
              },
              {
                title: 'No Hostage Credentials',
                desc: 'Cloud accounts, domain records, database clusters, and code repositories are created directly in your company name from day one.',
              },
              {
                title: 'No Junior Bait-and-Switch',
                desc: 'You work directly with senior software architects and technology strategists who review and write code, not rotating junior interns.',
              },
              {
                title: 'No Hidden Cloud Markups',
                desc: 'You pay your cloud hosting providers (AWS, GCP, DigitalOcean, Cloudflare) directly with zero hidden markups from us.',
              },
              {
                title: 'No Abandoned Handovers',
                desc: 'We remain by your side through launch, load testing, and stabilization, ensuring your internal team has complete operational confidence.',
              },
            ].map((p, i) => (
              <div key={i} className="theme-card-subtle rounded-2xl p-5 transition">
                <p className="text-sm font-bold text-inherit mb-1.5 flex items-center gap-2">
                  <span className="text-rose-500 font-black">✕</span>
                  <span>{p.title}</span>
                </p>
                <p className="text-xs theme-muted leading-relaxed font-normal">{p.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs theme-muted font-mono">
              Read more about our security protocols and confidentiality agreements.
            </p>
            <Link
              to="/confidentiality-security"
              className="btn-brand inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs sm:text-sm font-bold shadow-lg hover:scale-105 transition"
            >
              <span>Review Confidentiality & Security Protocols</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
