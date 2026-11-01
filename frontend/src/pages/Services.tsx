import { Link } from 'react-router-dom'
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
    color: '#8B5CF6',
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
      '2. Technical Feasibility & Constraint Audit',
      '3. Technology Roadmap & Stack Recommendation',
      '4. Architecture Blueprints & Sizing Handover',
    ],
  },
  {
    id: 'software',
    title: 'Software & Product Engineering',
    tagline: 'From idea to production-ready software.',
    icon: Code2,
    color: '#3B82F6',
    problem:
      'Agencies frequently deliver fragile, rushed prototypes that cannot be extended, lack automated testing, or break under user concurrency, forcing costly rewrites after gaining initial traction.',
    approach:
      'We engineer production-grade software adhering to strict quality, security, and maintainability standards. Our codebases feature modular architectures, automated testing suites, and clear documentation.',
    services: [
      'MVP Design & Rapid Development',
      'SaaS Platforms & Multi-Tenant Architectures',
      'Responsive Web Applications (React, Next.js)',
      'Cross-Platform & Native Mobile Applications',
      'Multi-Sided Marketplaces & Transaction Engines',
      'Modern E-commerce Platforms',
      'Internal Business Management Systems',
      'RESTful & GraphQL API Infrastructure',
      'Customer Portals & Real-Time Dashboards',
      'Custom Enterprise Workflow Systems',
    ],
    capabilities: [
      'React, Next.js, Vite, TypeScript',
      'FastAPI, Python, Spring Boot / Java, Node.js',
      'Tailwind CSS, Modern Accessible UI',
      'Automated Unit & End-to-End Testing',
      'Event-Driven Microservices',
    ],
    process: [
      '1. User Journey & Interface Wireframing',
      '2. Schema & API Contract Specification',
      '3. Agile Bi-Weekly Development Sprints',
      '4. Quality Assurance, Security & Deployment',
    ],
  },
  {
    id: 'data',
    title: 'Data Architecture & Intelligence',
    tagline: 'Turn business data into better decisions.',
    icon: Database,
    color: '#06B6D4',
    problem:
      'Valuable business data remains trapped across isolated spreadsheets, disconnected SaaS tools, and unindexed databases, leaving executives without reliable metrics or real-time decision clarity.',
    approach:
      'We architect synchronized, dependable data systems that turn raw transactional logs into structured operational insights. We establish strict data schemas, automated ETL/ELT pipelines, and real-time executive dashboards.',
    services: [
      'Relational Database Architecture & Schema Design',
      'ETL & ELT Pipeline Engineering',
      'Data Warehousing & Lakehouse Implementation',
      'Business Intelligence (BI) & Executive Dashboards',
      'Real-Time KPI & Metrics Tracking Systems',
      'Automated Financial & Operational Reporting',
      'Data Governance & Compliance Frameworks',
      'Data Quality, Anomaly Detection & Auditing',
    ],
    capabilities: [
      'PostgreSQL, MySQL, Redis Caching',
      'Modern Columnar Warehouses (ClickHouse, BigQuery)',
      'Automated Ingestion Pipelines & Event Streaming',
      'Interactive Analytics & Reporting Engines',
      'Schema Migration & Zero-Downtime Indexing',
    ],
    process: [
      '1. Data Source Mapping & Entity Modeling',
      '2. Pipeline Architecture & Storage Design',
      '3. Automated Transformation & Cleansing Setup',
      '4. Dashboard Delivery & Analytics Training',
    ],
  },
  {
    id: 'ai',
    title: 'Artificial Intelligence & Automation',
    tagline: 'Build AI that creates real business value.',
    icon: Bot,
    color: '#10B981',
    problem:
      'AI is frequently deployed as a marketing gimmick or ungrounded chatbot wrapper that hallucinates, leaks proprietary context, and fails to impact core unit economics.',
    approach:
      'We implement practical, verified AI systems focused squarely on solving measurable operational bottlenecks: context-grounded Retrieval-Augmented Generation (RAG), intelligent customer triage, automated document extraction, and predictive business models.',
    services: [
      'Enterprise AI Strategy & Opportunity Assessment',
      'Retrieval-Augmented Generation (RAG) Architecture',
      'Autonomous AI Agents & Multi-Step Task Executors',
      'AI-Powered Customer Support & Live Triage',
      'Intelligent Business Workflow Automation',
      'Document Intelligence & OCR Extraction',
      'Recommendation Engines & Personalization',
      'Predictive Analytics & Churn Forecasting',
      'Proprietary Internal Knowledge Assistants',
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
    color: '#6366F1',
    problem:
      'Fragile hosting configurations collapse under sudden traffic spikes, suffer from sluggish page loads, lack automated disaster recovery, or incur runaway monthly cloud bills.',
    approach:
      'We construct automated, hardened, cost-efficient cloud architectures engineered for high availability and zero operational panic. We implement seamless CI/CD, multi-region CDN caching, comprehensive observability, and proactive security.',
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
    color: '#F43F5E',
    problem:
      'Non-technical founders frequently struggle to evaluate engineering candidates, set coding benchmarks, or establish structured development processes, leading to poor hires and misaligned deliverables.',
    approach:
      'We act as your interim technical leadership and gradual transition partner. We evaluate engineering candidates, conduct rigorous technical interviews, establish version-control best practices, and mentor your engineers into an independent, high-output team.',
    services: [
      'Fractional CTO Leadership & Executive Advisory',
      'Technical Team Organization & Capacity Planning',
      'Developer Screening, Coding Rubrics & Interviews',
      'Engineering Workflow & Code Review Standards',
      'CI/CD & Release Governance Process Design',
      'In-House Developer Training & Technical Upskilling',
      'Comprehensive System Architecture Documentation',
      'Transition Handover from External Partner to Internal Team',
    ],
    capabilities: [
      'Engineering Competency Frameworks',
      'Rigorous Practical Code Challenge Design',
      'Agile Sprint Frameworks & Jira/Linear Setup',
      'Developer Onboarding Handbooks',
      'Codebase Ownership & IP Transfer Management',
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
    <div className="space-y-20 sm:space-y-28 py-10">
      {/* Header */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3.5 py-1 text-xs font-semibold text-brand mb-4">
            <Sparkles className="size-3.5" />
            <span>End-to-End Technology Services</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Strategic Engineering Services for Growing Businesses
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Aqivo provides comprehensive technology capabilities across strategy, product engineering, data systems,
            applied AI, cloud infrastructure, and technical leadership.
          </p>
        </div>

        {/* Quick Nav Anchors */}
        <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-200 pb-6">
          {SERVICE_PILLARS.map((p) => (
            <a
              key={p.id}
              href={`#${p.id}`}
              className="rounded-full bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition"
            >
              {p.title}
            </a>
          ))}
        </div>
      </section>

      {/* Pillars Deep Dive */}
      <div className="mx-auto max-w-7xl px-5 sm:px-8 space-y-24">
        {SERVICE_PILLARS.map((pillar, idx) => {
          const Icon = pillar.icon
          return (
            <section
              key={pillar.id}
              id={pillar.id}
              className="scroll-mt-28 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-12 shadow-sm"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-4">
                  <div
                    className="grid size-14 place-items-center rounded-2xl text-white shadow-md shrink-0"
                    style={{ backgroundColor: pillar.color }}
                  >
                    <Icon className="size-7" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Pillar 0{idx + 1}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{pillar.title}</h2>
                  </div>
                </div>
                <div className="rounded-full bg-purple-50 px-4 py-1.5 text-xs font-bold text-brand border border-purple-200/60">
                  {pillar.tagline}
                </div>
              </div>

              {/* The Business Problem vs How Aqivo Approaches */}
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-6">
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-2">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>The Business Problem</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{pillar.problem}</p>
                </div>

                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-6">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-2">
                    <ShieldCheck className="size-4 shrink-0" />
                    <span>How Aqivo Approaches It</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{pillar.approach}</p>
                </div>
              </div>

              {/* Services Offered & Capabilities Grid */}
              <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
                {/* Services list */}
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">
                    Services Offered
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {pillar.services.map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs sm:text-sm font-medium text-slate-800"
                      >
                        <CheckCircle2 className="size-4 text-brand shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Capabilities and Process */}
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
                      <Cpu className="size-4 text-brand" />
                      <span>Typical Technology Capabilities</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {pillar.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 shadow-2xs"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-3 flex items-center gap-1.5">
                      <Workflow className="size-4 text-purple-400" />
                      <span>Engagement Process</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {pillar.process.map((step) => (
                        <li key={step} className="font-mono">
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* CTA footer for section */}
              <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-100 pt-6">
                <p className="text-xs text-slate-500">
                  Ready to solve this challenge? Talk with an Aqivo senior engineer.
                </p>
                <Link
                  to={`/contact?interest=${pillar.id}`}
                  className="btn-brand inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold shadow-xs"
                >
                  <span>Engage on {pillar.title}</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </section>
          )
        })}
      </div>

      {/* Global Bottom CTA */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl bg-slate-900 p-8 sm:p-14 text-center text-white">
          <h2 className="text-2xl sm:text-4xl font-extrabold">Need a Tailored Combination of Services?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-slate-300">
            Most client engagements combine software development, data design, and cloud architecture in integrated
            sprints.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              to="/contact"
              className="btn-brand rounded-full px-8 py-3.5 text-sm sm:text-base font-bold shadow-lg"
            >
              Start a Conversation
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
