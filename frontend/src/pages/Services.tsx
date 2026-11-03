import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Compass,
  Code2,
  Database,
  Bot,
  Cloud,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Cpu,
  Workflow,
} from 'lucide-react'
import { CreativeRobot } from '@/components/ui/CreativeRobot'

interface ServicePillar {
  id: string
  title: string
  tagline: string
  problem: string
  approach: string
  services: string[]
  capabilities: string[]
  process: string[]
  icon: typeof Compass
  color: string
}

const SERVICE_PILLARS: ServicePillar[] = [
  {
    id: 'strategy',
    title: 'Startup Technology Strategy',
    tagline: 'Start with the right technology decisions.',
    icon: Compass,
    color: '#375a8a',
    problem:
      'Founders often burn through their initial funding building overly complicated products, choosing inappropriate tech stacks, or failing to anticipate infrastructure scaling costs before launch.',
    approach:
      'We conduct rigorous technical feasibility analysis and align architecture directly with commercial milestones. We define clean system boundaries, prioritize high-leverage features, and eliminate architectural debt before code is written.',
    services: [
      'Startup Technology Strategy & Feasibility',
      'Technical Feasibility Analysis',
      'Product Strategy & MVP Scoping',
      'Technology Roadmap Development',
      'Technology Stack Selection (Web, Mobile, Cloud)',
      'Digital Transformation Strategy',
      'System Architecture & Domain Modeling',
      'Cost Trajectory & Cloud Budget Planning',
    ],
    capabilities: [
      'Architecture Decision Records (ADRs)',
      'Domain-Driven Design (DDD)',
      'Total Cost of Ownership (TCO) Projections',
      'Compliance & Security Scoping',
      'API Contract Design',
    ],
    process: [
      '1. Business Discovery & Discovery Call',
      '2. Technical Scoping & Risk Evaluation',
      '3. Architecture Blueprint & Stack Proposal',
      '4. Iterative Milestone Execution Plan',
    ],
  },
  {
    id: 'software',
    title: 'Software & Product Engineering',
    tagline: 'From idea to production-ready software.',
    icon: Code2,
    color: '#3b82f6',
    problem:
      'Startups frequently suffer from buggy MVPs, sluggish load times, tangled codebases, and poor UX, forcing expensive full rewrites when user numbers finally grow.',
    approach:
      'We design and engineer bespoke web and mobile platforms with clean component boundaries, resilient data access layers, and responsive UI systems that scale smoothly.',
    services: [
      'Custom Web Application Development',
      'Mobile App Development (iOS & Android)',
      'MVP Development for Early-Stage Startups',
      'SaaS Platform Engineering & Multi-Tenancy',
      'API Design & Microservice Integration',
      'Internal Tools, Portals & Operations Dashboards',
      'E-commerce & Transaction Platforms',
      'Performance Profiling & Legacy Refactoring',
    ],
    capabilities: [
      'React, TypeScript, Tailwind CSS',
      'FastAPI, Node.js, Go Microservices',
      'PostgreSQL, Redis, Supabase',
      'Async Queues & WebSocket Telemetry',
      'Clean Code & Comprehensive Unit Testing',
    ],
    process: [
      '1. UI/UX Wireframing & Schema Architecture',
      '2. Rapid Agile Sprint Development',
      '3. Integration Testing & Edge Case Hardening',
      '4. Zero-Downtime Deployment & Handover',
    ],
  },
  {
    id: 'data',
    title: 'Data Architecture & Intelligence',
    tagline: 'Turn business data into better decisions.',
    icon: Database,
    color: '#06b6d4',
    problem:
      'Operational records trapped in scattered spreadsheets, siloed tools, and untracked databases make accurate financial reporting, inventory visibility, and user retention tracking nearly impossible.',
    approach:
      'We establish dependable, single-source-of-truth data architectures with automated ETL pipelines, analytics warehouses, and real-time operational reporting dashboards.',
    services: [
      'Database Schema Architecture & Modeling',
      'Data Warehouse Design (PostgreSQL / ClickHouse)',
      'Automated ETL/ELT Pipeline Engineering',
      'Executive Dashboards & Business Intelligence',
      'Real-Time Analytics & User Funnel Tracking',
      'Data Migration & Consolidation Services',
      'Data Governance, Audit Trails & Integrity',
    ],
    capabilities: [
      'Relational & Columnar Database Engineering',
      'Python Data Pipelines & Scheduled Ingestion',
      'Event-Driven Analytics & Webhooks',
      'Interactive Charting & BI Telemetry',
      'Role-Based Data Access Controls',
    ],
    process: [
      '1. Source Data Audit & Inventory Mapping',
      '2. Centralized Schema & Warehouse Design',
      '3. Automated ETL Pipeline Ingestion',
      '4. Executive BI Dashboard Validation',
    ],
  },
  {
    id: 'ai',
    title: 'Artificial Intelligence & Automation',
    tagline: 'Build AI that creates real business value.',
    icon: Bot,
    color: '#10b981',
    problem:
      'Companies rush to adopt generic AI wrappers that hallucinate answers, expose confidential internal documents, or fail to connect into underlying transaction engines.',
    approach:
      'We build domain-grounded AI systems using Retrieval-Augmented Generation (RAG) and structured autonomous agents that automate manual operational bottlenecks with verifiable accuracy.',
    services: [
      'AI Strategy & Practical Use-Case Discovery',
      'Custom LLM Integration & Middleware Design',
      'Retrieval-Augmented Generation (RAG) on Company Docs',
      'Autonomous Task & Operations Agents',
      'AI-Powered Customer Support & Live Triage',
      'Intelligent Business Workflow Automation',
      'Document Intelligence & OCR Extraction',
      'Recommendation Engines & Personalization',
    ],
    capabilities: [
      'Large Language Model Orchestration',
      'Vector Search & Hybrid Retrieval (pgvector, Qdrant)',
      'Semantic Chunking & Context Grounding',
      'Structured Tool Calling & Agent Safety Guards',
      'FastAPI AI Middleware & Latency Streaming',
    ],
    process: [
      '1. High-Value Use Case Identification',
      '2. Knowledge Base & Vector Indexing Pipeline',
      '3. Prototype Verification & Accuracy Benchmarking',
      '4. Secure Production Deployment & Continuous Monitoring',
    ],
  },
  {
    id: 'infrastructure',
    title: 'Cloud & Infrastructure Engineering',
    tagline: 'Build technology that is ready to grow.',
    icon: Cloud,
    color: '#2c476f',
    problem:
      'Fragile hosting configurations collapse under sudden traffic spikes, suffer from sluggish page loads, lack automated disaster recovery, or incur runaway monthly cloud bills.',
    approach:
      'We construct automated, hardened, cost-efficient cloud architectures engineered for high availability and zero operational panic with automated CI/CD, multi-region CDN caching, and proactive security.',
    services: [
      'Modern Cloud Architecture (AWS, GCP, DigitalOcean)',
      'Containerization (Docker, Orchestration)',
      'Continuous Integration & Continuous Delivery (CI/CD)',
      'API Gateway & Microservices Infrastructure',
      'Database Query & Caching Optimization (Redis)',
      'Application Performance Optimization & Edge CDN',
      'Security Hardening, SSL/TLS, & Secrets Management',
      'Observability, Distributed Tracing & Proactive Alerting',
      'High-Availability Architecture & Disaster Recovery',
    ],
    capabilities: [
      'Docker & Containerized Deployments',
      'Automated Zero-Downtime Rollouts',
      'Edge Caching & Cloudflare Infrastructure',
      'Prometheus, Grafana, & Log Aggregation',
      'Database Connection Pooling & Replication',
    ],
    process: [
      '1. Infrastructure Audit & Bottleneck Diagnosis',
      '2. Cloud Topography Design & Security Blueprint',
      '3. Automated CI/CD & Container Migration',
      '4. Load Stress Testing & Monitoring Verification',
    ],
  },
  {
    id: 'teams',
    title: 'Technical Team Building & Fractional CTO',
    tagline: 'Build the team behind your technology.',
    icon: Users,
    color: '#e11d48',
    problem:
      'Non-technical founders frequently struggle to evaluate engineering candidates, set coding benchmarks, or establish structured development processes, leading to poor hires and misaligned deliverables.',
    approach:
      'We act as your interim technical leadership and gradual transition partner. We evaluate engineering candidates, conduct rigorous technical interviews, establish version-control best practices, and mentor your engineers into an independent, high-output team.',
    services: [
      'Fractional CTO Leadership & Executive Advisory',
      'Technical Team Organization & Capacity Planning',
      'Developer Screening, Coding Rubrics & Interviews',
      'Engineering Workflow & Code Review Standards',
      'Developer Onboarding Handbooks',
      'Codebase Ownership & IP Transfer Management',
    ],
    capabilities: [
      'Senior Engineering Hiring Rubrics',
      'Live Coding Architecture Assessment',
      'Sprint Ceremony & Agile Cadence Coaching',
      'Git Branching & Release Management Protocols',
      'Technical Roadmap Mentorship',
    ],
    process: [
      '1. Organizational Gap & Skill Audit',
      '2. Job Specification & Candidate Screening Rubrics',
      '3. Technical Interviews & Live Code Evaluations',
      '4. Structured Onboarding & Process Mentorship',
    ],
  },
]

export default function Services() {
  return (
    <div className="space-y-20 sm:space-y-28 pb-20">
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
                <span>End-to-End Technology Services</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight"
              >
                Strategic Engineering Services for Growing Businesses
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2 }}
                className="mt-5 text-base sm:text-lg theme-muted leading-relaxed font-normal"
              >
                Aqivo provides comprehensive technology capabilities across strategy, product engineering, data systems,
                applied AI, cloud infrastructure, and technical leadership.
              </motion.p>
            </div>

            {/* Creative Floating Robot Vanguard in Hero */}
            <div className="flex justify-center">
              <CreativeRobot
                variant="floating"
                size="md"
                badgeText="Precision Full-Stack Engineering"
                mascot="1"
                showOrbits={true}
              />
            </div>
          </div>

          {/* Quick Nav Anchors */}
          <div className="mt-12 flex flex-wrap gap-2 border-t border-slate-200 dark:border-white/10 pt-6">
            {SERVICE_PILLARS.map((p) => (
              <a
                key={p.id}
                href={`#${p.id}`}
                className="theme-pill-inactive rounded-full px-4 py-2 text-xs font-semibold transition shadow-2xs cursor-pointer"
              >
                {p.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars Deep Dive */}
      <div className="mx-auto max-w-7xl px-5 sm:px-8 space-y-24">
        {SERVICE_PILLARS.map((pillar, idx) => {
          const Icon = pillar.icon
          return (
            <motion.section
              key={pillar.id}
              id={pillar.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4 }}
              className="theme-card scroll-mt-28 rounded-3xl p-6 sm:p-12 shadow-2xl transition-all duration-300"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
                <div className="flex items-center gap-4">
                  <div
                    className="grid size-14 place-items-center rounded-2xl text-white shadow-md shrink-0"
                    style={{ backgroundColor: pillar.color }}
                  >
                    <Icon className="size-7" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#375a8a]">
                      Pillar 0{idx + 1}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{pillar.title}</h2>
                  </div>
                </div>
                <div className="rounded-full bg-[#375a8a]/10 px-4 py-1.5 text-xs font-mono font-bold text-[#375a8a] border border-[#375a8a]/30">
                  {pillar.tagline}
                </div>
              </div>

              {/* The Business Problem vs How Aqivo Approaches */}
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
                  <div className="flex items-center gap-2 text-rose-500 font-bold text-sm mb-2 font-mono">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>The Business Problem</span>
                  </div>
                  <p className="text-xs sm:text-sm theme-muted leading-relaxed font-normal">{pillar.problem}</p>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                  <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm mb-2 font-mono">
                    <ShieldCheck className="size-4 shrink-0" />
                    <span>How Aqivo Solves It</span>
                  </div>
                  <p className="text-xs sm:text-sm theme-muted leading-relaxed font-normal">{pillar.approach}</p>
                </div>
              </div>

              {/* Services Offered & Capabilities Grid */}
              <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
                {/* Services list */}
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider theme-muted mb-4">
                    Services Offered
                  </h3>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {pillar.services.map((item) => (
                      <div
                        key={item}
                        className="theme-card-subtle flex items-start gap-2.5 rounded-xl p-3 text-xs sm:text-sm font-medium"
                      >
                        <CheckCircle2 className="size-4 text-[#375a8a] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Capabilities and Process */}
                <div className="space-y-6">
                  <div className="theme-card-subtle rounded-2xl p-5">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-inherit mb-3 flex items-center gap-1.5">
                      <Cpu className="size-4 text-[#375a8a]" />
                      <span>Technology & Stack Capabilities</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {pillar.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="rounded-md theme-card px-2.5 py-1 text-xs font-mono"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="theme-card-subtle rounded-2xl p-5">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#375a8a] mb-3 flex items-center gap-1.5">
                      <Workflow className="size-4 text-[#375a8a]" />
                      <span>Engagement Cadence</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs theme-muted font-mono">
                      {pillar.process.map((step) => (
                        <li key={step} className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-[#375a8a]" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* CTA footer for section */}
              <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-200 dark:border-white/10 pt-6">
                <p className="text-xs theme-muted font-mono">
                  Ready to solve this challenge? Consult directly with a senior Aqivo engineer.
                </p>
                <Link
                  to={`/contact?interest=${pillar.id}`}
                  className="btn-brand inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold shadow-lg hover:scale-105 transition"
                >
                  <span>Engage on {pillar.title}</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </motion.section>
          )
        })}
      </div>

      {/* Global Bottom CTA */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl border border-slate-700/40 bg-[#0f172a] dark:bg-[#0a0f1d] p-8 sm:p-14 text-center text-white shadow-2xl relative overflow-hidden">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">Need a Tailored Combination of Services?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-white/90 font-normal">
            Most client engagements combine software development, data design, and cloud architecture into cohesive, high-impact sprints.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/contact"
              className="rounded-full bg-white text-[#09090b] px-8 py-3.5 text-sm sm:text-base font-bold shadow-xl transition hover:bg-zinc-100 hover:scale-105 active:scale-95"
            >
              Start an Architecture Discovery Call
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
