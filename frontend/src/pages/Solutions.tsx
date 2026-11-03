import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Terminal,
} from 'lucide-react'
import { EcosystemVisualizer } from '@/components/ecosystem/EcosystemVisualizer'
import { CreativeRobot } from '@/components/ui/CreativeRobot'
import { cn } from '@/lib/cn'

const FOUNDER_CHALLENGES = [
  {
    id: 'mvp',
    title: 'We have an idea and need to build a high-quality MVP.',
    category: 'Product & Launch',
    solution: 'Aqivo Software & Strategy',
    description:
      'We work with you to distill your concept to its highest-leverage core, architect a clean domain model, and engineer a production-ready MVP in rapid agile sprints.',
    deliverables: ['Validated MVP Scope', 'Complete Web or Mobile Application', 'Core API & Database', 'Cloud Deployment'],
    recommendedStack: ['React / TypeScript', 'FastAPI or Node.js', 'PostgreSQL', 'Docker'],
    targetTimeline: '4 to 8 weeks',
  },
  {
    id: 'architecture',
    title: 'Our current codebase is slow, fragile, or hard to maintain.',
    category: 'Architecture & Refactor',
    solution: 'Aqivo Engineering & Cloud',
    description:
      'We conduct an in-depth architectural audit to identify query bottlenecks, tight coupling, and caching deficiencies, formulating a pragmatic refactoring plan without halting ongoing feature work.',
    deliverables: ['Code & Query Profiling Audit', 'Modular Refactoring Plan', 'Redis Caching Layer', 'Automated CI/CD'],
    recommendedStack: ['PostgreSQL Index Optimization', 'Redis', 'Connection Pooling', 'Docker Containers'],
    targetTimeline: '2 to 6 weeks',
  },
  {
    id: 'data-silos',
    title: 'Our business data is scattered across spreadsheets and silos.',
    category: 'Data & Analytics',
    solution: 'Aqivo Data Architecture',
    description:
      'We unify transactional databases, billing records, and operational tools into clean automated ETL/ELT pipelines and live executive KPI dashboards for decision-making.',
    deliverables: ['Central Data Schema', 'Automated Ingestion Pipelines', 'Executive BI Dashboard', 'Automated Reporting'],
    recommendedStack: ['PostgreSQL / ClickHouse', 'Python ETL Engines', 'Automated Daily Syncs'],
    targetTimeline: '3 to 5 weeks',
  },
  {
    id: 'ai-automation',
    title: 'We want practical AI to automate repetitive workflows.',
    category: 'Applied AI',
    solution: 'Aqivo AI & Automation',
    description:
      'We implement domain-grounded Retrieval-Augmented Generation (RAG) and task-focused AI agents that automate customer service triage, document analysis, and administrative processing.',
    deliverables: ['Context-Indexed Vector Database', 'Custom AI Agent Middleware', 'Human-in-the-Loop Review Dashboard'],
    recommendedStack: ['pgvector', 'FastAPI AI Middleware', 'LLM Tool Calling Frameworks'],
    targetTimeline: '3 to 6 weeks',
  },
  {
    id: 'scale',
    title: 'We are growing rapidly and infrastructure cannot keep up.',
    category: 'Cloud & Scale',
    solution: 'Aqivo Cloud & Infrastructure',
    description:
      'We design high-availability container clusters, zero-downtime deployment pipelines, edge caching, and automated failover policies so your platform remains rock solid.',
    deliverables: ['High-Availability Cloud Topology', 'Zero-Downtime CI/CD', 'Real-Time Observability & Alerts'],
    recommendedStack: ['Cloud Container Orchestration', 'Cloudflare Edge CDN', 'Prometheus & Grafana'],
    targetTimeline: 'Ongoing or 4-week sprint',
  },
  {
    id: 'team-hiring',
    title: 'We need technical leadership and want to hire our first developers.',
    category: 'Leadership & Team',
    solution: 'Aqivo Teams & Fractional CTO',
    description:
      'We act as your interim CTO, conducting candidate screenings, architecting coding challenges, and mentoring your new hires to build a mature engineering culture.',
    deliverables: ['Candidate Evaluation Rubric', 'Technical Interview Execution', 'Engineering Standards Handbook'],
    recommendedStack: ['Git Workflows', 'CI/CD Standards', 'Architecture Documentation'],
    targetTimeline: 'Flexible advisory / retainer',
  },
]

export default function Solutions() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = ['all', 'Product & Launch', 'Architecture & Refactor', 'Data & Analytics', 'Applied AI', 'Cloud & Scale', 'Leadership & Team']

  const filteredChallenges = selectedCategory === 'all'
    ? FOUNDER_CHALLENGES
    : FOUNDER_CHALLENGES.filter((c) => c.category === selectedCategory)

  return (
    <div className="space-y-24 sm:space-y-32 pb-24">
      {/* Full-Width Hero Header */}
      <section className="theme-hero-section relative w-full pt-14 pb-20 sm:pt-20 sm:pb-28 overflow-hidden">
        <div className="tech-grid absolute inset-0 opacity-20 pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] items-center">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 rounded-full bg-[#375a8a]/10 border border-[#375a8a]/30 px-3.5 py-1 text-xs font-semibold text-[#375a8a] mb-5 shadow-2xs"
              >
                <Sparkles className="size-3.5 text-[#375a8a]" />
                <span>Problem-Driven Technology Architecture</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight"
              >
                Solutions Built for Real Business Problems
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2 }}
                className="mt-5 text-base sm:text-lg theme-muted leading-relaxed font-normal"
              >
                We don't sell generic software packages or one-size-fits-all templates. Explore how Aqivo solves concrete
                technical bottlenecks across the entire lifecycle of growing companies.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.3 }}
                className="mt-8 flex flex-wrap items-center gap-4"
              >
                <a
                  href="#scenarios"
                  className="btn-brand inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold shadow-lg transition hover:scale-[1.02] active:scale-95"
                >
                  <span>Explore Scenario Matrix</span>
                  <ArrowRight className="size-4" />
                </a>
                <Link
                  to="/contact"
                  className="btn-dark inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition"
                >
                  <span>Request Technical Scoping</span>
                </Link>
              </motion.div>
            </div>

            {/* Creative Floating Robot Vanguard in Hero */}
            <div className="flex justify-center">
              <CreativeRobot
                variant="floating"
                size="md"
                badgeText="Tactical Engineering Partner"
                showOrbits={true}
              />
            </div>
          </div>

          {/* Interactive Ecosystem Visualizer in Solutions */}
          <div className="mt-16 pt-12 border-t border-slate-200 dark:border-white/10">
            <EcosystemVisualizer />
          </div>
        </div>
      </section>

      {/* Founder Challenges Matrix */}
      <section id="scenarios" className="scroll-mt-24 mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-[#375a8a] text-xs font-mono uppercase tracking-wider mb-1">
              <Layers className="size-3.5" />
              <span>Diagnostic Scenarios</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Find Your Current Scenario</h2>
            <p className="text-xs sm:text-sm theme-muted mt-1">Select your immediate business priority to view the architecture blueprint.</p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer',
                  selectedCategory === cat
                    ? 'bg-[#375a8a] text-white shadow-lg'
                    : 'theme-pill-inactive'
                )}
              >
                {cat === 'all' ? 'All Scenarios' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Challenge Cards Grid */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filteredChallenges.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="theme-card flex flex-col justify-between rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#375a8a]/10 px-3 py-1 text-xs font-bold text-[#375a8a] border border-[#375a8a]/30">
                      {item.category}
                    </span>
                    <span className="text-xs font-mono theme-muted">Duration: {item.targetTimeline}</span>
                  </div>

                  <h3 className="mt-4 text-xl font-bold leading-snug text-slate-900 dark:text-white group-hover:text-[#375a8a] transition-colors">
                    "{item.title}"
                  </h3>
                  <p className="mt-3 text-xs sm:text-sm theme-muted leading-relaxed font-normal">{item.description}</p>

                  <div className="mt-6 space-y-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider theme-muted mb-2.5 font-mono">
                        Key Deliverables
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {item.deliverables.map((del) => (
                          <div key={del} className="flex items-center gap-2 text-xs theme-card-subtle rounded-lg px-2.5 py-1.5">
                            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate">{del}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider theme-muted mb-2 font-mono flex items-center gap-1.5">
                        <Terminal className="size-3 text-[#375a8a]" />
                        <span>Recommended Stack</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.recommendedStack.map((tech) => (
                          <span key={tech} className="rounded-md theme-card-subtle px-2 py-0.5 text-[11px] font-mono">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <span className="text-xs theme-muted font-medium">via {item.solution}</span>
                  <Link
                    to={`/contact?scenario=${item.id}`}
                    className="btn-brand inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-md hover:scale-105 transition"
                  >
                    <span>Solve This</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Cross-Cutting Engineering Discipline */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="theme-card rounded-3xl p-8 sm:p-14 shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#375a8a]/10 border border-[#375a8a]/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-[#375a8a]">
              Our Long-Term Guarantee
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold leading-tight text-slate-900 dark:text-white">
              Engineering Built for Independence & Growth
            </h2>
            <p className="mt-3 text-sm sm:text-base theme-muted leading-relaxed font-normal">
              Every solution we deliver is backed by senior technical leadership, automated test suites, fully documented
              system architectures, and zero proprietary lock-in. You own 100% of your codebase and intellectual property.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: 'Full IP & Code Ownership',
                desc: 'Clean Git repositories transferred directly to your organization with complete license clarity.',
              },
              {
                title: 'Automated CI/CD & Tests',
                desc: 'Every feature includes tests and automated pipeline checks to prevent regression as your team grows.',
              },
              {
                title: 'Knowledge Transfer Included',
                desc: 'We train your engineers and document systems thoroughly so you are never dependent on any agency.',
              },
            ].map((f, i) => (
              <div key={i} className="theme-card-subtle rounded-2xl p-5 hover:border-[#375a8a]/30 transition">
                <ShieldCheck className="size-5 text-emerald-500 mb-2.5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="mt-1.5 text-xs theme-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center sm:text-left">
            <Link
              to="/contact"
              className="btn-brand inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-xs sm:text-sm font-bold shadow-xl transition hover:scale-105 active:scale-95"
            >
              <span>Discuss Your Specific Architecture</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
