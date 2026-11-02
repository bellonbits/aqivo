import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Compass,
  Code2,
  Database,
  Bot,
  Cloud,
  Users,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Plus,
  Minus,
  Sliders,
  Layers,
} from 'lucide-react'
import { EcosystemVisualizer } from '@/components/ecosystem/EcosystemVisualizer'
import { cn } from '@/lib/cn'

const SOLUTIONS = [
  {
    id: 'strategy',
    title: 'Strategy',
    sub: 'Technology & Startup Strategy',
    keyMessage: 'Start with the right technology decisions.',
    desc: 'Help founders make sound architectural decisions, select the right tech stack, and develop comprehensive MVP roadmaps before committing heavy engineering capital.',
    icon: Compass,
    color: 'from-violet-500/10 to-violet-500/5',
    iconColor: 'text-violet-600',
    link: '/services#strategy',
    tags: ['Feasibility Analysis', 'Stack Selection', 'MVP Scoping', 'Cost Trajectory'],
    image: '/img/professional-5.webp',
  },
  {
    id: 'software',
    title: 'Software',
    sub: 'Software & Product Engineering',
    keyMessage: 'From idea to production-ready software.',
    desc: 'Design and build digital products that solve real business problems. From web & mobile applications to custom SaaS, marketplaces, APIs, and enterprise internal tools.',
    icon: Code2,
    color: 'from-blue-500/10 to-blue-500/5',
    iconColor: 'text-blue-600',
    link: '/services#software',
    tags: ['Web & Mobile Apps', 'Production MVPs', 'SaaS Architecture', 'Internal Portals'],
    image: '/img/professional-3.webp',
  },
  {
    id: 'data',
    title: 'Data',
    sub: 'Data Architecture & Intelligence',
    keyMessage: 'Turn business data into better decisions.',
    desc: 'Build systems that transform raw, scattered operational data into reliable single sources of truth, robust ETL pipelines, data warehouses, and decision dashboards.',
    icon: Database,
    color: 'from-cyan-500/10 to-cyan-500/5',
    iconColor: 'text-cyan-600',
    link: '/services#data',
    tags: ['Database Design', 'ETL/ELT Pipelines', 'Warehouses & Lakehouse', 'Executive BI'],
    image: '/img/professional-4.webp',
  },
  {
    id: 'ai',
    title: 'AI',
    sub: 'Artificial Intelligence & Automation',
    keyMessage: 'Build AI that creates real business value.',
    desc: 'Practical, reliable AI solutions built to solve measurable problems: retrieval-augmented generation (RAG), AI agents, intelligent customer support, and document intelligence.',
    icon: Bot,
    color: 'from-emerald-500/10 to-emerald-500/5',
    iconColor: 'text-emerald-600',
    link: '/services#ai',
    tags: ['RAG Systems', 'AI Agents & LLMs', 'Workflow Automation', 'Predictive Analytics'],
    image: '/img/professional-6.webp',
  },
  {
    id: 'engineering',
    title: 'Cloud & Engineering',
    sub: 'Scalable Technology Infrastructure',
    keyMessage: 'Build technology that is ready to grow.',
    desc: 'Construct dependable cloud foundations with zero-downtime CI/CD, modern containerization, multi-environment security, observability, and database optimization.',
    icon: Cloud,
    color: 'from-indigo-500/10 to-indigo-500/5',
    iconColor: 'text-indigo-600',
    link: '/services#infrastructure',
    tags: ['Cloud Architecture', 'DevOps & CI/CD', 'Observability', 'Security Hardening'],
    image: '/img/professional-1.webp',
  },
  {
    id: 'teams',
    title: 'Teams',
    sub: 'Build Your Technical Team',
    keyMessage: 'Build the team behind your technology.',
    desc: 'Strategic technology advisory and fractional CTO support to help startups evaluate, recruit, interview, and mentor their in-house engineering and data teams.',
    icon: Users,
    color: 'from-rose-500/10 to-rose-500/5',
    iconColor: 'text-rose-600',
    link: '/services#teams',
    tags: ['Technical Hiring Rubrics', 'Fractional CTO', 'Code Reviews & Standards', 'Team Mentorship'],
    image: '/img/professional-2.webp',
  },
]

const PROBLEMS = [
  {
    title: 'Building the Wrong Product',
    desc: 'Investing months building complex features before validating whether customers actually need or will pay for them.',
  },
  {
    title: 'Choosing the Wrong Tech Stack',
    desc: 'Adopting hyped frameworks or bloated architectures that cripple development speed and require painful rewrites later.',
  },
  {
    title: 'Poor System Architecture',
    desc: 'Constructing brittle schemas and single-point-of-failure databases that crash during traffic spikes or data influx.',
  },
  {
    title: 'Slow or Unreliable Software',
    desc: 'Shipping unoptimized code, sluggish queries, and unmonitored bugs that frustrate early users and cause churn.',
  },
  {
    title: 'Disconnected Business Data',
    desc: 'Operating with siloed spreadsheets, misaligned records, and zero clear visibility into real customer KPIs.',
  },
  {
    title: 'AI Without Strategy',
    desc: 'Adding superficial AI wrappers and gimmicks that burn API costs without solving measurable business bottlenecks.',
  },
  {
    title: 'Difficulty Hiring Technical Talent',
    desc: 'Struggling to screen, interview, and evaluate engineering resumes without an experienced technical leader.',
  },
  {
    title: 'Lack of Technical Leadership',
    desc: 'Founders forced to make major architectural and infrastructure choices alone without trusted senior guidance.',
  },
]

const PROCESS_STEPS = [
  {
    number: '01',
    title: 'Understand',
    desc: 'We deeply understand your business model, customer workflows, operational constraints, and commercial targets.',
  },
  {
    number: '02',
    title: 'Strategize',
    desc: 'We define the technical roadmap, choose the right stack, and prioritize what to build first to test high-value assumptions.',
  },
  {
    number: '03',
    title: 'Architect',
    desc: 'We design the software domain, database schemas, API boundaries, security controls, and cloud infrastructure.',
  },
  {
    number: '04',
    title: 'Build',
    desc: 'We engineer the production software, web apps, mobile solutions, or MVP using clean, well-tested code.',
  },
  {
    number: '05',
    title: 'Integrate',
    desc: 'We connect business databases, automated payment webhooks, CRM pipelines, and intelligent AI models.',
  },
  {
    number: '06',
    title: 'Scale',
    desc: 'We optimize query performance, monitor uptime, harden security, and mentor your internal engineering team.',
  },
]

const STAGES = [
  {
    stage: 'Stage 1 — Idea',
    title: 'From Concept to Clear Blueprint',
    focus: 'Technology Strategy, Feasibility & MVP Roadmap',
    desc: 'Validate technical viability, avoid premature over-engineering, choose the optimal stack, and plan an MVP scope that hits the market quickly.',
    services: ['Startup technology strategy', 'Technical feasibility analysis', 'MVP scope definition', 'Infrastructure cost modeling'],
    badge: 'Discovery & Feasibility',
  },
  {
    stage: 'Stage 2 — MVP',
    title: 'From Blueprint to Working Software',
    focus: 'Software Development & Core Architecture',
    desc: 'Ship a high-quality, production-ready MVP that real customers can use and pay for, built on clean foundations ready for growth.',
    services: ['Web & mobile applications', 'Database & API engineering', 'Cloud deployment & CI/CD', 'Automated payments & auth'],
    badge: 'Build & Launch',
  },
  {
    stage: 'Stage 3 — Growth',
    title: 'From Traction to Scalable Operations',
    focus: 'Data Architecture, BI & System Optimization',
    desc: 'Optimize application performance, eliminate database bottlenecks, consolidate business data, and build executive reporting.',
    services: ['Performance profiling & caching', 'Data warehousing & ETL', 'Automated business workflows', 'Customer dashboards'],
    badge: 'Optimize & Consolidate',
  },
  {
    stage: 'Stage 4 — Scale',
    title: 'From Growth to Category Leadership',
    focus: 'Enterprise Systems, Applied AI & Team Building',
    desc: 'Deploy practical AI automation, harden multi-tenant infrastructure, achieve compliance, and recruit senior in-house developers.',
    services: ['Custom AI & RAG pipelines', 'High-availability infrastructure', 'Technical interview rubrics', 'Fractional CTO leadership'],
    badge: 'Automate & Lead',
  },
]

const ENGAGEMENT_MODELS = [
  {
    title: 'Project Engagement',
    pill: 'Fixed-Scope Sprints',
    desc: 'Ideal for startups needing a concrete MVP, new digital product, custom software platform, or targeted data pipeline.',
    features: ['Milestone-based delivery', 'Complete code ownership & documentation', 'Regular sprint demonstrations', 'Fixed timeline & budget clarity'],
    image: '/img/professional-3.webp',
  },
  {
    title: 'Dedicated Technology Partner',
    pill: 'Continuous Partnership',
    desc: 'Ongoing collaboration supporting your engineering, product updates, infrastructure scaling, and technical decisions as you grow.',
    features: ['Embedded senior engineering bandwidth', 'Proactive architecture reviews', 'Continuous deployment & CI/CD', 'Priority response SLAs'],
    image: '/img/professional-1.webp',
  },
  {
    title: 'Fractional CTO',
    pill: 'Strategic Advisory',
    desc: 'Executive technical advisory for founders who need strategic engineering leadership without the full-time C-suite overhead.',
    features: ['Investor tech audits & due diligence', 'System architecture governance', 'Vendor & SaaS stack negotiation', 'Quarterly technical roadmaps'],
    image: '/img/professional-5.webp',
  },
  {
    title: 'Technical Team Building',
    pill: 'Hiring & Mentorship',
    desc: 'Helping founders screen, interview, evaluate, and mentor developers to build their permanent in-house engineering team.',
    features: ['Custom coding challenges & rubrics', 'Senior engineering candidate screening', 'Team structure & workflow setup', 'Smooth codebase handover'],
    image: '/img/professional-2.webp',
  },
]

const USE_CASES = [
  {
    id: 'public-systems',
    title: 'Public Systems & High-Trust Architecture',
    desc: 'Transparent registries, sovereign digital credentials, and verifiably immutable audit trails for civic institutions and regulated enterprises.',
    img: '/img/aerion/use-case-1.webp',
    badge: 'High-Trust Infrastructure',
  },
  {
    id: 'energy',
    title: 'Energy, IoT & Distributed Telemetry',
    desc: 'Decentralized automated micro-grid settlements, renewable energy accounting, and sub-second IoT telemetry verification for operational hardware.',
    img: '/img/aerion/use-case-2.webp',
    badge: 'IoT & Telemetry',
  },
  {
    id: 'infrastructure',
    title: 'Cloud Infrastructure & High-Volume Payments',
    desc: 'High-concurrency payment rails, multi-currency settlement channels, and decoupled microservices architectures for mission-critical logistics.',
    img: '/img/aerion/use-case-3.webp',
    badge: 'Cloud & Payments',
  },
  {
    id: 'data-ai',
    title: 'Data Engineering, BI & Applied AI',
    desc: 'Production-grade RAG systems, customer support copilot agents, and unified data warehouse pipelines for fast-growing platforms.',
    img: '/img/aerion/use-case-4.webp',
    badge: 'Applied AI & Data',
  },
]

const FAQS = [
  {
    id: 0,
    category: 'architecture',
    question: 'How is Aqivo different from a traditional digital marketing agency?',
    answer:
      'Aqivo is a technology partner and software engineering consultancy, not a marketing agency. We focus on core software engineering, domain architecture, scalable database design, production-grade cloud infrastructure, practical AI implementations, and technical team mentoring.',
  },
  {
    id: 1,
    category: 'mvp',
    question: 'How fast can Aqivo design and deploy a production MVP?',
    answer:
      'Most MVPs are scoped and shipped within 4 to 8 weeks. We cut non-essential features, architect clean database boundaries, build with production-tested stacks (React, TypeScript, FastAPI/Node.js, PostgreSQL), and establish automated CI/CD from day one.',
  },
  {
    id: 2,
    category: 'ai',
    question: 'How does Aqivo implement Artificial Intelligence without burning unnecessary capital?',
    answer:
      'We strictly focus on practical AI that solves measurable operational bottlenecks—such as automated customer support copilots, OCR document intelligence, retrieval-augmented generation (RAG) on internal knowledge bases, and predictive analytics. We avoid superficial gimmicks.',
  },
  {
    id: 3,
    category: 'teams',
    question: 'Can Aqivo help us transition to an in-house engineering team later?',
    answer:
      'Yes. One of our core engagement models is Technical Team Building. We act as your interim engineering leadership, help write job specs, conduct technical coding interviews, establish code review standards, and mentor new hires for a seamless transition.',
  },
  {
    id: 4,
    category: 'architecture',
    question: 'Do we own 100% of the code, intellectual property, and infrastructure?',
    answer:
      'Absolutely. 100% of all software, database schemas, repository commits, and cloud configurations belong exclusively to your company under strict confidentiality and IP assignment agreements.',
  },
]

export default function Home() {
  // Use cases carousel index
  const [carouselIdx, setCarouselIdx] = useState(0)

  // FAQ Tab Filter and Accordion State
  const [faqCategory, setFaqCategory] = useState<'all' | 'architecture' | 'mvp' | 'ai' | 'teams'>('all')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  // Terminal active tab state
  const [terminalTab, setTerminalTab] = useState<'platform' | 'architecture' | 'metrics'>('platform')

  const filteredFaqs = faqCategory === 'all' ? FAQS : FAQS.filter((f) => f.category === faqCategory)

  return (
    <div className="space-y-24 sm:space-y-36 pb-24 overflow-x-hidden selection:bg-purple-100 selection:text-purple-900">
      {/* =========================================================================
          SECTION 1 — THE CINEMATIC HERO (EXACTLY MATCHING USER'S SCREENSHOT)
          ========================================================================= */}
      <section className="relative w-full -mt-20 sm:-mt-24 min-h-[640px] sm:min-h-[740px] md:min-h-[840px] lg:h-[90vh] overflow-hidden flex flex-col justify-center items-center text-center px-5 sm:px-8">
        {/* Full-bleed scenic vibrant landscape background */}
        <img
          src="/img/aerion/hero-cinematic.webp"
          alt="Aqivo Cinematic Landscape"
          className="absolute inset-0 size-full object-cover object-[center_28%] -z-10"
        />
        {/* Transparent gradient only at top edge for nav contrast — no grey fog over image */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/15 pointer-events-none -z-10" />

        <div className="relative z-10 max-w-4xl mx-auto pt-24 sm:pt-28 pb-8">
          {/* Pill Badge with Glowing Emerald Dot (Exactly from screenshot) */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/20 backdrop-blur-md px-4 py-1.5 text-xs font-semibold text-white shadow-sm mb-6">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span>Designed for sustainable growth</span>
          </div>

          {/* Headline in Editorial Serif (Exact font & wording from user screenshot) */}
          <h1 className="font-editorial text-4xl sm:text-6xl md:text-7xl lg:text-[78px] font-normal sm:font-medium tracking-normal text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)] leading-[1.08] text-balance">
            Where Growth Feels Natural for the Long Term
          </h1>

          {/* Subtitle (Exact layout from user screenshot) */}
          <p className="mx-auto mt-6 max-w-xl text-sm sm:text-base md:text-lg text-white/95 leading-relaxed font-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">
            Aqivo combines intelligent technology with thoughtful design to help your business grow steadily over time.
          </p>

          {/* Buttons: Our Approach & View Portfolios (Exact styling from user screenshot) */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
            <Link
              to="/contact"
              className="rounded-full bg-slate-950/90 hover:bg-slate-950 text-white border border-white/20 px-8 py-3.5 text-sm sm:text-base font-semibold shadow-2xl backdrop-blur-md transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>Our Approach</span>
            </Link>
            <a
              href="#solutions"
              className="rounded-full border border-white/50 bg-white/25 hover:bg-white/35 text-white backdrop-blur-md px-8 py-3.5 text-sm sm:text-base font-semibold shadow-md transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>View Portfolios</span>
            </a>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2 — THE EDITORIAL MANIFESTO (Matching Image with Inline Chips)
          ========================================================================= */}
      <section className="mx-auto max-w-5xl px-5 sm:px-8 text-center pt-8 sm:pt-14">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white mb-6">
          <span className="size-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span>About Aqivo</span>
        </div>

        <p className="font-editorial text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-slate-900 leading-snug font-normal text-balance">
          Aqivo is building the quiet infrastructure{' '}
          <span className="inline-block align-middle mx-1.5 overflow-hidden rounded-full border border-slate-300 shadow-xs h-7 w-16 sm:h-9 sm:w-20">
            <img src="/img/aerion/pill-1.webp" alt="Infrastructure" className="w-full h-full object-cover" />
          </span>{' '}
          behind the next era of modern business. We design modular systems that
          prioritize clarity, flexibility, and long-term trust across{' '}
          <span className="inline-block align-middle mx-1.5 overflow-hidden rounded-full border border-slate-300 shadow-xs h-7 w-16 sm:h-9 sm:w-20">
            <img src="/img/aerion/pill-2.webp" alt="Scalability" className="w-full h-full object-cover" />
          </span>{' '}
          complex enterprise networks and growing startups.
        </p>

        <p className="mt-6 text-xs sm:text-sm text-slate-500 uppercase tracking-widest font-semibold">
          Explore the solutions and operational principles powering our work
        </p>

        {/* Embedded Interactive Ecosystem Visualizer */}
        <div className="mt-14 text-left">
          <EcosystemVisualizer />
        </div>
      </section>

      {/* =========================================================================
          SECTION 3 — INTERACTIVE PLATFORM SHOWCASE (Matching Image 2's Card with Tabs)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 sm:p-12 shadow-sm">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-brand mb-3">
                  <Sliders className="size-3.5" />
                  <span>Aqivo Platform</span>
                </span>
                <h2 className="font-editorial text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  Aqivo Platform
                </h2>
                <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                  Aqivo is the foundation for building high-trust, scalable software, data infrastructure, and practical
                  AI automation for modern ventures.
                </p>
              </div>

              <div>
                <Link
                  to="/contact"
                  className="btn-dark inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs sm:text-sm font-bold shadow-md transition hover:bg-brand"
                >
                  <span>Start a Conversation</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>

              {/* 4 Architectural Guarantees */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                {[
                  {
                    title: 'Build on clean foundations',
                    desc: 'Composable, modern architectures engineered for low maintenance and zero technical debt.',
                  },
                  {
                    title: 'Connect ecosystems & data',
                    desc: 'Unified database models, real-time webhooks, and single-source-of-truth analytics.',
                  },
                  {
                    title: 'Scale with confidence',
                    desc: 'Stateless API layers, connection pooling, and multi-region CDN caching for high concurrency.',
                  },
                  {
                    title: 'Secure by design',
                    desc: 'Zero-trust access policies, encrypted secrets management, and automated security scans.',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="size-4 text-brand shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Card: Interactive Telemetry & Architecture Terminal */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 shadow-xl bg-slate-950 aspect-[16/11] flex flex-col">
              {/* Background Network Graphic */}
              <img
                src="/img/aerion/network-card.webp"
                alt="Aqivo Network Infrastructure"
                className="absolute inset-0 size-full object-cover opacity-30 pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40 pointer-events-none" />

              {/* Card Header & Tabs */}
              <div className="relative z-10 flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-rose-500/80" />
                  <div className="size-2.5 rounded-full bg-amber-500/80" />
                  <div className="size-2.5 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] font-mono text-slate-400 ml-2">aqivo-core-runtime</span>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 rounded-full bg-black/40 p-1 border border-white/10 text-[11px] font-medium">
                  {(['platform', 'architecture', 'metrics'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setTerminalTab(tab)}
                      className={cn(
                        'px-2.5 py-1 rounded-full capitalize transition',
                        terminalTab === tab ? 'bg-white/20 text-white font-bold' : 'text-slate-400 hover:text-white'
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Content based on Active Tab */}
              <div className="relative z-10 flex-1 p-5 font-mono text-xs text-slate-300 overflow-y-auto space-y-4">
                {terminalTab === 'platform' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-slate-400">Environment</span>
                      <span className="text-emerald-400 font-bold">production-multi-region</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-slate-400">Runtime Layer</span>
                      <span className="text-white">TypeScript 5.x / FastAPI 0.110+</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-slate-400">Database Engine</span>
                      <span className="text-white">PostgreSQL 16 (ACID, pgvector)</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-slate-400">Caching & Queues</span>
                      <span className="text-white">Redis 7.2 (Sub-millisecond)</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-slate-400">Containerization</span>
                      <span className="text-purple-400 font-bold">Docker / Automated CI/CD</span>
                    </div>
                    <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Cluster status: 100% operational · 0 critical alerts</span>
                    </div>
                  </div>
                )}

                {terminalTab === 'architecture' && (
                  <div className="space-y-3 text-[11px]">
                    <p className="text-purple-300 font-bold">Domain Architecture Topology:</p>
                    <div className="bg-black/50 p-3 rounded-lg border border-white/10 space-y-1.5 text-slate-300">
                      <p>Client App (React/Vite) ──► Edge CDN (Cloudflare)</p>
                      <p>                   │</p>
                      <p>                   ▼</p>
                      <p>API Gateway (FastAPI / Auth Middleware)</p>
                      <p>  ├── Core Domain Services (Orders, Inventory, Users)</p>
                      <p>  ├── Data Pipeline (Async Ingestion, pgvector RAG)</p>
                      <p>  └── Event Bus (Redis Pub/Sub, Webhooks)</p>
                    </div>
                    <p className="text-emerald-400">✓ Decoupled state channels for maximum throughput</p>
                  </div>
                )}

                {terminalTab === 'metrics' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                        <p className="text-[10px] uppercase text-slate-400">API Response Time</p>
                        <p className="text-lg font-bold text-white mt-0.5">38 ms</p>
                        <p className="text-[10px] text-emerald-400">p99 &lt; 85ms</p>
                      </div>
                      <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                        <p className="text-[10px] uppercase text-slate-400">System Availability</p>
                        <p className="text-lg font-bold text-emerald-400 mt-0.5">99.98%</p>
                        <p className="text-[10px] text-slate-400">Zero unplanned downtime</p>
                      </div>
                      <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                        <p className="text-[10px] uppercase text-slate-400">Test Coverage</p>
                        <p className="text-lg font-bold text-white mt-0.5">94.2%</p>
                        <p className="text-[10px] text-purple-300">Automated pytest & vitest</p>
                      </div>
                      <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                        <p className="text-[10px] uppercase text-slate-400">Security Score</p>
                        <p className="text-lg font-bold text-emerald-400 mt-0.5">Grade A+</p>
                        <p className="text-[10px] text-slate-400">SSL, CSP, Zero-Trust</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom interactive action bar inside terminal */}
              <div className="relative z-10 border-t border-white/10 px-4 py-2.5 bg-black/40 flex items-center justify-between text-[11px] text-slate-400">
                <span>Deterministic deployment verification</span>
                <span className="text-emerald-400 font-bold">Status: Online</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4 — BUILT TO SCALE REAL-WORLD COMPLEXITY (Matching Image 2)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white mb-4">
          <span className="size-1.5 rounded-full bg-purple-400" />
          <span>Foundational Scale</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_2fr] items-start">
          <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Built to scale real-world complexity
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
              <div className="size-10 rounded-xl bg-purple-100 text-brand grid place-items-center mb-4">
                <Layers className="size-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Modular by design</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                Composable, enterprise-grade architecture engineered for clean separation of concerns, deterministic
                state management, and modular microservices execution.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
              <div className="size-10 rounded-xl bg-purple-100 text-brand grid place-items-center mb-4">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Enterprise governance</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                Auditable access controls, end-to-end data encryption, automated backup routines, and fractional CTO
                governance designed for strict compliance standards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5 — BUILT FOR REAL-WORLD USE CASES (Matching Image 2 Carousel)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h2 className="font-editorial text-2xl sm:text-4xl font-extrabold text-slate-900">Built for Real-World Use Cases</h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              Architectural solutions proven across high-trust industries and high-concurrency platforms.
            </p>
          </div>

          {/* Carousel Navigation Buttons from Image 2 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCarouselIdx((prev) => (prev > 0 ? prev - 1 : USE_CASES.length - 1))}
              className="grid size-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-xs hover:bg-slate-100 transition active:scale-95"
              aria-label="Previous use case"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setCarouselIdx((prev) => (prev < USE_CASES.length - 1 ? prev + 1 : 0))}
              className="grid size-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-xs hover:bg-slate-100 transition active:scale-95"
              aria-label="Next use case"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* 4 Cards Grid / Carousel */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map((uc, i) => (
            <div
              key={uc.id}
              className={cn(
                'group relative overflow-hidden rounded-2xl border transition-all duration-300 aspect-[4/5] flex flex-col justify-end p-6',
                carouselIdx === i ? 'ring-2 ring-brand shadow-xl' : 'border-slate-200/90 shadow-sm'
              )}
            >
              {/* Background Image */}
              <img
                src={uc.img}
                alt={uc.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              <div className="relative z-10 text-white space-y-2">
                <span className="rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  {uc.badge}
                </span>
                <h3 className="text-lg font-bold leading-snug drop-shadow-xs">{uc.title}</h3>
                <p className="text-xs text-slate-200/90 line-clamp-3 leading-relaxed">{uc.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 6 — THE PROBLEM (Startup Technology Challenges)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-8 sm:p-14 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand">The Reality of Startup Engineering</p>
              <h2 className="font-editorial mt-2 text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                Building a Business Is Hard. Building the Right Technology Shouldn't Be.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                Most startup technology failures are not caused by bad programming—they are caused by poor architectural
                and strategic decisions made before a single line of code is written. Aqivo eliminates these expensive pitfalls.
              </p>
            </div>

            {/* Strategic Callout Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-md">
              <div className="relative aspect-[16/10] w-full">
                <img
                  src="/img/professional-6.webp"
                  alt="Senior engineering leadership and strategic planning"
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold text-slate-900 shadow-xs">
                    Engineering Architecture
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-purple-300">The Cost of Tech Debt</p>
                  <p className="text-xs sm:text-sm font-semibold mt-0.5 leading-snug">
                    Over 65% of early software rewrites stem from missing architectural blueprints.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROBLEMS.map((prob, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 transition-all hover:bg-white hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-rose-600 mb-2.5">
                  <AlertCircle className="size-4 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900">{prob.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{prob.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7 — AQIVO SOLUTIONS (The 6 Solution Pillars)
          ========================================================================= */}
      <section id="solutions" className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Core Solutions</p>
          <h2 className="font-editorial mt-2 text-3xl sm:text-5xl font-extrabold text-slate-900">
            Engineered for Modern Business Realities
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600">
            Aqivo provides high-impact technology capabilities spanning strategy, software engineering, data architecture,
            applied AI, cloud infrastructure, and technical team building.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((sol) => {
            const Icon = sol.icon
            return (
              <div
                key={sol.id}
                className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div>
                  {/* Photo Header */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                    <img
                      src={sol.image}
                      alt={sol.sub}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold text-slate-900 shadow-xs">
                        {sol.title}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="text-xs font-semibold text-purple-300 drop-shadow-xs">{sol.keyMessage}</p>
                      <h3 className="text-lg font-bold drop-shadow-xs">{sol.sub}</h3>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn('p-2.5 rounded-xl bg-slate-100', sol.iconColor)}>
                        <Icon className="size-5" />
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{sol.title}</h4>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">{sol.desc}</p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {sol.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <Link
                    to={sol.link}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-brand hover:underline"
                  >
                    <span>Learn More About {sol.title}</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 8 — HOW AQIVO WORKS (01 Understand ... 06 Scale)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-slate-50/70 p-8 sm:p-14">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">Delivery Process</p>
            <h2 className="font-editorial mt-2 text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900">
              From Problem to Scalable Solution
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              A structured, transparent engineering methodology that replaces guesswork with measurable execution.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROCESS_STEPS.map((step) => (
              <div
                key={step.number}
                className="relative rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs transition-all hover:shadow-md"
              >
                <span className="text-3xl font-black text-slate-300 font-mono">{step.number}</span>
                <h3 className="mt-2 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 9 — STARTUP TECHNOLOGY JOURNEY (Idea, MVP, Growth, Scale)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">The Startup Journey</p>
          <h2 className="font-editorial mt-2 text-3xl sm:text-5xl font-extrabold text-slate-900">
            Supporting Businesses at Every Stage of Growth
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600">
            We adapt our engineering capabilities to match your exact maturity stage—from pre-code strategy to scaling teams.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs hover:shadow-lg transition-all"
            >
              <div>
                <span className="rounded-full bg-purple-100 text-brand px-3 py-1 text-[11px] font-bold">
                  {s.badge}
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{s.stage}</h3>
                <p className="text-xs font-semibold text-brand mt-1">{s.focus}</p>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">{s.desc}</p>

                <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                  {s.services.map((item) => (
                    <li key={item} className="flex items-start gap-1.5">
                      <CheckCircle2 className="size-3.5 text-brand shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 10 — PRODUCT ECOSYSTEM: AQIVO STORE
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="overflow-hidden rounded-3xl border border-purple-200/80 bg-gradient-to-br from-white via-purple-50/30 to-white p-8 sm:p-14 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 mb-4">
                <ShoppingBag className="size-3.5" />
                <span>Aqivo Product Ecosystem</span>
              </div>

              <h2 className="font-editorial text-2xl sm:text-4xl font-extrabold text-slate-900">
                Aqivo Store: Physical Shop → Aqivo → Online Store
              </h2>

              <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                Alongside our strategic technology advisory and custom software engineering, Aqivo builds proprietary products.
                <strong> Aqivo Store</strong> is a premium digital storefront platform engineered to help African retail,
                fashion, and commercial businesses move from physical selling to high-converting online sales.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-slate-700">
                {[
                  'Digital Storefront & Custom Branding',
                  'Inventory & Real-Time Stock Sync',
                  'Automated WhatsApp Order Ingestion',
                  'M-Pesa & Card Payment Webhooks',
                  'Customer Analytics & CRM',
                  'Multi-Branch Merchant Dashboards',
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/products"
                  className="btn-brand inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs sm:text-sm font-bold shadow-md transition hover:scale-[1.02] active:scale-95"
                >
                  <span>Explore Aqivo Store</span>
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/register"
                  className="glass inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs sm:text-sm font-bold text-slate-800 transition hover:bg-white active:scale-95 border border-slate-200"
                >
                  <span>Launch Merchant Storefront</span>
                </Link>
              </div>
            </div>

            {/* Visual Storefront Mockup */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-slate-900 aspect-[16/11]">
              <img
                src="/img/retail-4.webp"
                alt="Aqivo Store Digital Platform"
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <span className="rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  Live Merchant Product
                </span>
                <p className="text-base font-bold mt-1">Multi-Tenant Digital Commerce Engine</p>
                <p className="text-xs text-slate-300 mt-0.5">
                  Powering retail storefronts with automated payments, WhatsApp receipts, and inventory reconciliation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 11 — ENGAGEMENT MODELS
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Collaboration Structures</p>
          <h2 className="font-editorial mt-2 text-3xl sm:text-5xl font-extrabold text-slate-900">
            Flexible Ways to Work With Aqivo
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600">
            From targeted technical sprints to long-term advisory and fractional leadership.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ENGAGEMENT_MODELS.map((model, i) => (
            <div
              key={i}
              className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div>
                {/* Photo Header */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                  <img
                    src={model.image}
                    alt={model.title}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold text-slate-900 shadow-xs">
                      {model.pill}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="text-base font-bold drop-shadow-xs">{model.title}</h3>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">{model.desc}</p>

                  <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-700">
                    {model.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <CheckCircle2 className="size-3.5 text-brand shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-6 pt-0">
                <Link
                  to="/contact"
                  className="btn-dark w-full rounded-full py-2.5 text-xs font-bold text-center block transition hover:bg-brand"
                >
                  Discuss Engagement
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 12 — EVERYTHING YOU NEED TO KNOW (Matching Image 2 FAQ)
          ========================================================================= */}
      <section className="mx-auto max-w-4xl px-5 sm:px-8">
        <div className="text-center">
          <h2 className="font-editorial text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Everything you need to know
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Direct answers about our architectural methodology, engagement structures, and engineering standards.
          </p>
        </div>

        {/* Filter Tabs from Image 2 */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {(
            [
              { id: 'all', label: 'All Questions' },
              { id: 'architecture', label: 'Architecture' },
              { id: 'mvp', label: 'Software & MVP' },
              { id: 'ai', label: 'Data & AI' },
              { id: 'teams', label: 'Engagements' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFaqCategory(tab.id)}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-semibold transition',
                faqCategory === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Accordion FAQ Items */}
        <div className="mt-10 space-y-3">
          {filteredFaqs.map((faq) => {
            const isOpen = openFaq === faq.id
            return (
              <div
                key={faq.id}
                className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                  className="flex w-full items-center justify-between p-5 text-left transition hover:bg-slate-50/50"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base font-bold text-slate-900 pr-4">{faq.question}</span>
                  <div className="grid size-7 place-items-center rounded-full bg-slate-100 text-slate-700 shrink-0">
                    {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="border-t border-slate-100 p-5 pt-3 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal bg-slate-50/40">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 13 — ATMOSPHERIC BOTTOM CTA BANNER (Matching Image 2)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl sm:rounded-[36px] min-h-[420px] flex items-center justify-center p-8 sm:p-16 text-center text-white shadow-2xl">
          {/* Atmospheric Panoramic Clouds/Mountains Background from Image 2 */}
          <img
            src="/img/aerion/mountains-fog.webp"
            alt="Scenic atmospheric panorama"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px]" />

          <div className="relative z-10 mx-auto max-w-3xl space-y-6">
            <h2 className="font-editorial text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
              Where Technology Becomes a Competitive Advantage
            </h2>

            <p className="text-sm sm:text-base md:text-lg text-slate-200 leading-relaxed font-normal max-w-2xl mx-auto">
              Partner with senior engineers and advisors to build systems that scale, endure, and transform operational potential into enterprise value.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm sm:text-base font-bold text-slate-900 shadow-xl transition hover:bg-slate-100 active:scale-95"
              >
                <span>Talk to Our Team</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-8 py-4 text-sm sm:text-base font-bold text-white transition hover:bg-white/20 active:scale-95"
              >
                <span>Explore Solutions</span>
              </Link>
            </div>

            <p className="text-xs text-slate-400 pt-2 font-mono">
              Confidential discussions · Direct senior engineering review · Pragmatic solutions
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}