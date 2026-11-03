import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb,
  Compass,
  Code2,
  Database,
  Bot,
  Users,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Cpu,
} from 'lucide-react'
import { cn } from '@/lib/cn'

export interface EcosystemStage {
  id: string
  number: string
  label: string
  title: string
  tagline: string
  icon: typeof Lightbulb
  color: string
description: string
  keyQuestions: string[]
  deliverables: string[]
  technologies: string[]
  outcome: string
}

export const ECOSYSTEM_STAGES: EcosystemStage[] = [
  {
    id: 'idea',
    number: '01',
    label: 'Business Idea',
    title: 'Transform Ideas into Viable Concepts',
    tagline: 'Before writing code, validate feasibility and market architecture.',
    icon: Lightbulb,
    color: '#b4833e',
    description:
      'We deconstruct your operational bottleneck or startup vision into a clear, validated technical hypothesis. We analyze technical feasibility, risk boundaries, and market expectations.',
    keyQuestions: [
      'What software should we build?',
      'Is the proposed technical approach feasible within our budget?',
      'What are the core technical constraints and regulatory guardrails?',
    ],
    deliverables: [
      'Technical Feasibility Assessment',
      'System Boundary Definition',
      'Initial Feature Priority Matrix',
    ],
    technologies: ['Design Sprints', 'Domain Modeling', 'Risk Analysis', 'User Journey Mapping'],
    outcome: 'Clear validation of what to build and why, eliminating wasted engineering cycles.',
  },
  {
    id: 'strategy',
    number: '02',
    label: 'Strategy',
    title: 'Technology & Startup Roadmap',
    tagline: 'Start with the right technology decisions.',
    icon: Compass,
    color: '#6c6b9e',
    description:
      'Help founders and businesses select the ideal technology stack, plan infrastructure cost trajectories, and establish architecture blueprints before heavy capital commitments.',
    keyQuestions: [
      'What technology stack best balances velocity with long-term durability?',
      'How do we structure our MVP milestones for speed to market?',
      'How should our system architecture be designed for future extensibility?',
    ],
    deliverables: [
      'Technology Roadmap & Architecture Spec',
      'Technology Stack Selection Matrix',
      'Infrastructure Cost Projection Model',
    ],
    technologies: ['Modern Web Stacks', 'Cloud Providers', 'API Contracts', 'Data Modeling'],
    outcome: 'Architectural clarity and an actionable technical roadmap aligned with business goals.',
  },
  {
    id: 'software',
    number: '03',
    label: 'Software',
    title: 'Software & Product Engineering',
    tagline: 'From idea to production-ready software.',
    icon: Code2,
    color: '#4a6fa5',
    description:
      'Full-lifecycle software engineering from rapid, high-integrity MVPs to robust multi-tenant web applications, mobile platforms, APIs, and mission-critical customer portals.',
    keyQuestions: [
      'How do we build and launch a production-grade MVP quickly?',
      'How do we enforce code quality, security, and maintainability?',
      'How do we build responsive customer-facing experiences and internal admin tools?',
    ],
    deliverables: [
      'Production MVP / Web & Mobile Apps',
      'REST & Event-Driven API Frameworks',
      'Admin Dashboards & Internal Portals',
    ],
    technologies: ['React', 'Next.js', 'FastAPI', 'Python', 'Node.js', 'TypeScript', 'Tailwind CSS'],
    outcome: 'High-performance, secure software that solves real user problems and earns revenue.',
  },
  {
    id: 'data',
    number: '04',
    label: 'Data',
    title: 'Data Architecture & Intelligence',
    tagline: 'Turn business data into better decisions.',
    icon: Database,
    color: '#40808a',
    description:
      'Build dependable data pipelines, transactional database structures, analytical data warehouses, and automated KPI dashboards that empower leadership with real-time clarity.',
    keyQuestions: [
      'How should our database and data systems be structured?',
      'How do we eliminate data silos and keep records synchronized?',
      'How can we use operational metrics to make data-driven product decisions?',
    ],
    deliverables: [
      'Normalized & Relational Database Design',
      'Automated ETL/ELT Ingestion Pipelines',
      'Executive KPI & Business Intelligence Dashboards',
    ],
    technologies: ['PostgreSQL', 'MySQL', 'Redis', 'ClickHouse / BigQuery', 'Python Data Pipelines'],
    outcome: 'Clean, reliable, centralized data powering automated reporting and actionable analytics.',
  },
  {
    id: 'ai',
    number: '05',
    label: 'AI',
    title: 'Practical AI & Automation',
    tagline: 'Build AI that creates real business value.',
    icon: Bot,
    color: '#4d8b6f',
    description:
      'Move past artificial hype into high-impact applied AI: proprietary knowledge assistants, Retrieval-Augmented Generation (RAG), intelligent customer support agents, and automated document processing.',
    keyQuestions: [
      'Where can AI create measurable business value rather than gimmicks?',
      'How do we automate repetitive customer support and operational tasks?',
      'How do we integrate AI agents securely into existing company databases?',
    ],
    deliverables: [
      'RAG Knowledge Bases & Internal AI Agents',
      'Intelligent Workflow Automation Pipelines',
      'Domain-Specific Natural Language Interfaces',
    ],
    technologies: ['LLM Orchestration', 'Vector Embeddings', 'PgVector / Qdrant', 'FastAPI AI Middleware'],
    outcome: 'Streamlined operations, 24/7 intelligent customer triage, and compounding efficiency.',
  },
  {
    id: 'team',
    number: '06',
    label: 'Team',
    title: 'Build Your Technical Team',
    tagline: 'Build the team behind your technology.',
    icon: Users,
    color: '#9e5a68',
    description:
      'Provide fractional CTO leadership while helping non-technical founders hire, evaluate, onboard, and establish engineering standards for their permanent in-house technical team.',
    keyQuestions: [
      'How do we evaluate and hire the right technical talent?',
      'How do we establish engineering standards, PR reviews, and CI/CD habits?',
      'How do we transition from external partner to a self-sustaining internal engineering team?',
    ],
    deliverables: [
      'Technical Hiring Rubrics & Interview Support',
      'Engineering Guidelines, CI/CD, & Architecture Docs',
      'Fractional CTO Advisory & Strategic Mentorship',
    ],
    technologies: ['Git Workflows', 'CI/CD Pipelines', 'Engineering Culture', 'Architecture Documentation'],
    outcome: 'A self-sustaining, high-performing technical team operating with clear engineering discipline.',
  },
  {
    id: 'scale',
    number: '07',
    label: 'Scale',
    title: 'Cloud Infrastructure & Sustainable Growth',
    tagline: 'Build technology that is ready to grow.',
    icon: TrendingUp,
    color: '#5671a8',
    description:
      'Scale infrastructure, optimize database queries, implement multi-region caching, robust observability, and cloud automation so systems never stumble during traffic surges.',
    keyQuestions: [
      'How do we move from a small startup to a scalable technology business?',
      'How do we ensure zero-downtime deployments and resilient failovers?',
      'How do we continuously optimize infrastructure cost as users multiply 10x?',
    ],
    deliverables: [
      'Containerized Multi-Environment Cloud Clusters',
      'Zero-Downtime CI/CD & Automated Backups',
      'Comprehensive Monitoring, Tracing, & Alerting',
    ],
    technologies: ['Docker', 'Kubernetes / Container Engines', 'Cloudflare', 'Redis Caching', 'Prometheus'],
    outcome: 'Bulletproof infrastructure capable of supporting exponential business growth without degradation.',
  },
]

export function EcosystemVisualizer() {
  const [selectedId, setSelectedId] = useState<string>('idea')
  const activeStage = ECOSYSTEM_STAGES.find((s) => s.id === selectedId) || ECOSYSTEM_STAGES[0]

  return (
    <div className="relative mx-auto w-full max-w-6xl rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0f172a]/90 p-5 shadow-2xl backdrop-blur-xl sm:p-8 text-[#0f172a] dark:text-white transition-colors">
      {/* Top Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#375a8a]/10 px-3 py-1 text-xs font-semibold text-[#375a8a] dark:text-[#8ea9d4] border border-[#375a8a]/25">
            <Sparkles className="size-3.5 text-[#375a8a] dark:text-[#8ea9d4]" />
            <span>Interactive Technology Ecosystem</span>
          </div>
          <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            The Aqivo Lifecycle: From Idea to Scalable Business
          </h3>
          <p className="mt-1 text-xs sm:text-sm theme-muted">
            Select any stage below to inspect the architectural questions, deliverables, and engineering capabilities.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium theme-muted">
          <span className="flex size-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
          <span>Active Technology Engine</span>
        </div>
      </div>

      {/* Horizontal Flow Line on Desktop / Scrollable on Mobile */}
      <div className="mt-4 overflow-x-auto py-5 px-2 scrollbar-none">
        <div className="flex items-center justify-between min-w-[740px] gap-2 px-2 py-2">
          {ECOSYSTEM_STAGES.map((stage, idx) => {
            const Icon = stage.icon
            const isSelected = stage.id === selectedId

            return (
              <div key={stage.id} className="flex items-center flex-1">
                {/* Stage Button */}
                <button
                  type="button"
                  onClick={() => setSelectedId(stage.id)}
                  className={cn(
                    'group relative flex flex-col items-center rounded-2xl p-3 sm:p-3.5 transition-all duration-200 w-full text-center shrink-0 min-w-[90px]',
                    isSelected
                      ? 'bg-[#375a8a] text-white shadow-md border-2 border-[#375a8a]'
                      : 'theme-pill-inactive'
                  )}
                >
                  {/* Step pill */}
                  <span
                    className={cn(
                      'text-[10px] font-bold tracking-wider uppercase mb-1',
                      isSelected ? 'text-white' : 'theme-muted'
                    )}
                  >
                    {stage.number}
                  </span>

                  {/* Icon */}
                  <div
                    className={cn(
                      'grid size-10 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105',
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/5'
                    )}
                    style={{ color: isSelected ? '#ffffff' : stage.color }}
                  >
                    <Icon className="size-5" />
                  </div>

                  {/* Label */}
                  <span className="mt-2 text-xs font-bold leading-tight line-clamp-1">{stage.label}</span>

                  {/* Active indicator bar */}
                  {isSelected && (
                    <motion.span
                      layoutId="active-indicator"
                      className="absolute bottom-1.5 inset-x-4 h-0.5 rounded-full bg-white"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>

                {/* Arrow connector */}
                {idx < ECOSYSTEM_STAGES.length - 1 && (
                  <div className="mx-1 flex items-center justify-center text-slate-400 dark:text-zinc-600 shrink-0">
                    <ArrowRight className="size-4" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail Showcase Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStage.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="mt-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#080d1a] p-6 sm:p-8 shadow-sm"
        >
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            {/* Left: Deep Dive & Core Questions */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div
                  className="grid size-12 place-items-center rounded-2xl text-white shadow-sm"
                  style={{ backgroundColor: activeStage.color }}
                >
                  <activeStage.icon className="size-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#375a8a] dark:text-[#8ea9d4]">
                    Phase {activeStage.number} — {activeStage.label}
                  </span>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{activeStage.title}</h4>
                </div>
              </div>

              <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-zinc-300 font-normal">
                {activeStage.description}
              </p>

              {/* Questions Answered */}
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow-2xs">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-200 mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-[#375a8a] dark:text-[#8ea9d4]" />
                  <span>Strategic Questions Solved</span>
                </h5>
                <ul className="space-y-2">
                  {activeStage.keyQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-zinc-300">
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#375a8a]/15 text-[10px] font-bold text-[#375a8a] dark:text-[#8ea9d4] mt-0.5">
                        ?
                      </span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Key Deliverables */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider theme-muted mb-2.5">
                  Standard Deliverables
                </h5>
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeStage.deliverables.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg bg-white dark:bg-white/5 px-3 py-2 text-xs font-medium text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-white/10"
                    >
                      <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Architectural Capabilities & Outcome Box */}
            <div className="flex flex-col justify-between space-y-5 rounded-2xl bg-[#0f172a] border border-slate-800 p-6 text-slate-100 shadow-md">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#8ea9d4]">
                    Technology & Stack Capabilities
                  </span>
                  <Cpu className="size-4 text-[#8ea9d4]" />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {activeStage.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200 border border-white/10"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Guiding Principle</p>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed font-mono">
                    "{activeStage.tagline}"
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-[#375a8a]/15 border border-[#375a8a]/30 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#8ea9d4]">Validated Outcome</p>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">{activeStage.outcome}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
