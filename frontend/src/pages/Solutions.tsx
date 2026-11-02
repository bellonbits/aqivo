import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'
import { EcosystemVisualizer } from '@/components/ecosystem/EcosystemVisualizer'
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
      <section className="relative w-full border-b border-slate-200/80 bg-gradient-to-b from-white via-purple-50/20 to-slate-50/70 pt-14 pb-20 sm:pt-20 sm:pb-28">
        <div className="tech-grid absolute inset-0 opacity-30 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3.5 py-1 text-xs font-semibold text-brand mb-4 shadow-2xs">
              <Sparkles className="size-3.5" />
              <span>Problem-Driven Technology Architecture</span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Solutions Built for Real Business Problems
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              We don't sell generic software packages or one-size-fits-all templates. Explore how Aqivo solves concrete
              technical challenges across the entire lifecycle of growing companies.
            </p>
          </div>

          {/* Interactive Ecosystem Visualizer in Solutions */}
          <div className="mt-14">
            <EcosystemVisualizer />
          </div>
        </div>
      </section>

      {/* Founder Challenges Matrix */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Find Your Current Scenario</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Select your immediate business priority to view the architecture blueprint.</p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold transition',
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {cat === 'all' ? 'All Scenarios' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Challenge Cards Grid */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {filteredChallenges.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-brand border border-purple-200/60">
                    {item.category}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Typical duration: {item.targetTimeline}</span>
                </div>

                <h3 className="mt-4 text-xl font-bold text-slate-900 leading-snug">"{item.title}"</h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">{item.description}</p>

                <div className="mt-6 space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Key Deliverables</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {item.deliverables.map((del) => (
                        <div key={del} className="flex items-center gap-1.5 text-xs text-slate-700">
                          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{del}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Capabilities / Stack</p>
                    <div className="flex flex-wrap gap-1">
                      {item.recommendedStack.map((tech) => (
                        <span key={tech} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Partnering via {item.solution}</span>
                <Link
                  to={`/contact?scenario=${item.id}`}
                  className="btn-brand inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold"
                >
                  <span>Solve This</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cross-Cutting Engineering Discipline */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-900 to-[#101935] p-8 sm:p-14 text-white">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Our Guarantee</span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold leading-tight">
              Engineering Built for the Long Term
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300">
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
                desc: 'We train your engineers or document the systems thoroughly so you are never dependent on any agency.',
              },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <ShieldCheck className="size-5 text-emerald-400 mb-2" />
                <h3 className="text-base font-bold text-white">{f.title}</h3>
                <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center sm:text-left">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-xs sm:text-sm font-bold text-slate-900 hover:bg-slate-100 transition"
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
