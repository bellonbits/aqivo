import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
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
  Sparkles,
  Server,
  Plus,
  Minus,
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
    iconColor: 'text-violet-600',
    bgColor: 'bg-violet-50',
    link: '/services#strategy',
    tags: ['Startup Technology Strategy', 'Feasibility Analysis', 'MVP Roadmap', 'Stack Selection', 'Cost Modeling'],
  },
  {
    id: 'software',
    title: 'Software',
    sub: 'Software & Product Engineering',
    keyMessage: 'From idea to production-ready software.',
    desc: 'Design and build digital products that solve real business problems. From web & mobile applications to custom SaaS platforms, marketplaces, APIs, and internal portals.',
    icon: Code2,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    link: '/services#software',
    tags: ['MVP Development', 'SaaS Platforms', 'Web & Mobile Apps', 'APIs & Integrations', 'Custom Portals'],
  },
  {
    id: 'data',
    title: 'Data',
    sub: 'Data Architecture & Intelligence',
    keyMessage: 'Turn business data into better decisions.',
    desc: 'Build systems that transform raw, scattered operational data into reliable single sources of truth, robust ETL pipelines, data warehouses, and decision dashboards.',
    icon: Database,
    iconColor: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    link: '/services#data',
    tags: ['Database Design', 'ETL/ELT Pipelines', 'Data Warehouses', 'Business Intelligence', 'Data Governance'],
  },
  {
    id: 'ai',
    title: 'AI',
    sub: 'Artificial Intelligence & Automation',
    keyMessage: 'Build AI that creates real business value.',
    desc: 'Practical, reliable AI solutions built to solve measurable operational bottlenecks: retrieval-augmented generation (RAG), AI agents, customer support copilots, and intelligent automation.',
    icon: Bot,
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    link: '/services#ai',
    tags: ['AI Strategy & Architecture', 'RAG Systems', 'AI Agents & LLMs', 'Intelligent Automation', 'Document AI'],
  },
  {
    id: 'engineering',
    title: 'Cloud & Engineering',
    sub: 'Scalable Technology Infrastructure',
    keyMessage: 'Build technology that is ready to grow.',
    desc: 'Construct dependable cloud foundations with automated CI/CD, modern containerization, multi-environment security, observability, and database optimization.',
    icon: Cloud,
    iconColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    link: '/services#infrastructure',
    tags: ['Cloud Architecture', 'DevOps & CI/CD', 'API Architecture', 'Observability', 'Scalability & Reliability'],
  },
  {
    id: 'teams',
    title: 'Teams',
    sub: 'Build Your Technical Team',
    keyMessage: 'Build the team behind your technology.',
    desc: 'Strategic technology advisory and fractional CTO support to help startups evaluate, recruit, interview, and mentor their in-house engineering and data teams.',
    icon: Users,
    iconColor: 'text-rose-600',
    bgColor: 'bg-rose-50',
    link: '/services#teams',
    tags: ['Technical Team Planning', 'Recruitment Support', 'Developer Evaluations', 'Fractional CTO', 'Code Standards'],
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
    title: 'AI Implemented Without Strategy',
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
    desc: 'Understand the business model, customers, operational challenges, unit economics, and commercial goals.',
  },
  {
    number: '02',
    title: 'Strategize',
    desc: 'Define the product roadmap, technology stack, system architecture, and immediate milestone priorities.',
  },
  {
    number: '03',
    title: 'Architect',
    desc: 'Design the software structure, database schemas, API contracts, security boundaries, and AI foundations.',
  },
  {
    number: '04',
    title: 'Build',
    desc: 'Develop and implement the solution using clean, maintainable, production-grade code with automated tests.',
  },
  {
    number: '05',
    title: 'Integrate',
    desc: 'Connect systems, databases, payment rails, third-party APIs, automated workflows, and practical AI models.',
  },
  {
    number: '06',
    title: 'Scale',
    desc: 'Optimize query performance, monitor uptime, harden infrastructure reliability, and mentor your technical team.',
  },
]

const STAGES = [
  {
    stage: 'Stage 1 — Idea',
    title: 'From Concept to Clear Blueprint',
    focus: 'Technology Strategy, Feasibility & MVP Roadmap',
    desc: 'Validate technical viability, avoid premature over-engineering, choose the optimal stack, and plan an MVP scope that hits the market quickly.',
    services: ['Startup technology strategy', 'Technical feasibility analysis', 'MVP planning & scoping', 'Cost & infrastructure planning'],
    badge: 'Discovery & Feasibility',
  },
  {
    stage: 'Stage 2 — MVP',
    title: 'From Blueprint to Working Software',
    focus: 'Product Design, Software Development & Core Infra',
    desc: 'Ship a high-quality, production-ready MVP that real customers can use and pay for, built on clean foundations ready for growth.',
    services: ['Product design & UX', 'Full-stack software engineering', 'Core database & API architecture', 'Automated CI/CD deployment'],
    badge: 'Build & Launch',
  },
  {
    stage: 'Stage 3 — Growth',
    title: 'From Traction to Scalable Operations',
    focus: 'Performance Optimization, Data Architecture & Automation',
    desc: 'Optimize application performance, eliminate database bottlenecks, consolidate business data, and build executive reporting.',
    services: ['Performance profiling & caching', 'Data architecture & ETL pipelines', 'Business intelligence & KPI dashboards', 'Process automation'],
    badge: 'Optimize & Consolidate',
  },
  {
    stage: 'Stage 4 — Scale',
    title: 'From Growth to Category Leadership',
    focus: 'Practical AI, Cloud Scalability & Engineering Teams',
    desc: 'Deploy practical AI automation, harden multi-tenant infrastructure, achieve enterprise reliability, and build senior in-house developers.',
    services: ['Production AI & RAG systems', 'High-availability cloud architecture', 'Technical team recruitment & rubrics', 'Fractional CTO leadership'],
    badge: 'Scale & Lead',
  },
]

const CAPABILITIES = [
  {
    category: 'Frontend Engineering',
    desc: 'Modern, high-performance interfaces engineered for speed, mobile responsiveness, and clean component architecture.',
    stack: ['React', 'Next.js', 'Vite', 'TypeScript', 'Tailwind CSS'],
    icon: Code2,
  },
  {
    category: 'Backend & APIs',
    desc: 'Reliable, well-documented backend services and REST/GraphQL APIs with strong typing and strict validation.',
    stack: ['FastAPI', 'Python', 'Node.js / Express', 'Java / Spring Boot', 'Go'],
    icon: Server,
  },
  {
    category: 'Data Architecture',
    desc: 'Scalable relational, analytical, and vector storage engines configured for ACID compliance and low-latency queries.',
    stack: ['PostgreSQL', 'MySQL', 'Redis', 'Data Warehouses', 'ETL/ELT Pipelines', 'Apache Spark'],
    icon: Database,
  },
  {
    category: 'Artificial Intelligence',
    desc: 'Pragmatic AI systems and autonomous workflows designed around measurable business problems, not gimmicks.',
    stack: ['Large Language Models', 'Retrieval-Augmented Generation (RAG)', 'Vector Databases', 'Machine Learning', 'AI Agents'],
    icon: Bot,
  },
  {
    category: 'Cloud & Infrastructure',
    desc: 'Automated deployment pipelines, secure container orchestration, and continuous observability.',
    stack: ['Docker', 'AWS / Google Cloud', 'CI/CD Pipelines', 'Monitoring & Metrics', 'Edge Caching & CDN'],
    icon: Cloud,
  },
]

const INDUSTRIES = [
  {
    name: 'E-commerce & Retail',
    desc: 'Catalog synchronization, high-concurrency checkouts, inventory reconciliation, and automated WhatsApp order alerts.',
  },
  {
    name: 'Logistics & Supply Chain',
    desc: 'Fleet tracking APIs, automated dispatching, multi-warehouse inventory systems, and delivery status webhooks.',
  },
  {
    name: 'Financial Services & Fintech',
    desc: 'Secure payment gateway integrations, double-entry ledger databases, automated reconciliation, and audit trails.',
  },
  {
    name: 'Healthcare & HealthTech',
    desc: 'HIPAA-conscious patient record architectures, appointment engines, secure telemedicine portals, and doctor scheduling.',
  },
  {
    name: 'Education & EdTech',
    desc: 'Course delivery portals, interactive assessment engines, student progress analytics, and cohort communication systems.',
  },
  {
    name: 'Real Estate & PropTech',
    desc: 'Property listing databases, lead ingestion funnels, automated tour booking, and digital tenancy management.',
  },
  {
    name: 'Professional Services',
    desc: 'Client portals, document exchange systems, automated billing workflows, and time-tracking integrations.',
  },
  {
    name: 'Marketplaces & Platforms',
    desc: 'Multi-sided buyer/seller architectures, escrow payment flows, review verification engines, and search indexing.',
  },
  {
    name: 'B2B & SaaS',
    desc: 'Multi-tenant database isolation, subscription billing via Stripe/Paystack, RBAC authorization, and user onboarding.',
  },
]

const ENGAGEMENT_MODELS = [
  {
    title: 'Project Engagement',
    pill: 'Fixed-Scope Delivery',
    desc: 'For clearly defined software or technology projects with fixed deliverables, clear milestones, and verified outcomes.',
    features: [
      'Concrete MVP scoping & architecture',
      'Milestone-based sprint deliverables',
      'Full source code ownership from day one',
      'Comprehensive documentation & handover',
    ],
  },
  {
    title: 'Dedicated Technology Partner',
    pill: 'Continuous Partnership',
    desc: 'For startups and growing businesses needing ongoing technical bandwidth, architecture advisory, and engineering execution.',
    features: [
      'Embedded senior engineering support',
      'Proactive system reviews & optimization',
      'Continuous deployment & feature development',
      'Priority response SLA for critical infrastructure',
    ],
  },
  {
    title: 'Fractional CTO',
    pill: 'Strategic Leadership',
    desc: 'For founders who need seasoned technical leadership to guide architecture, evaluate vendor proposals, and represent tech to investors.',
    features: [
      'Strategic technology roadmap planning',
      'Investor tech due-diligence preparation',
      'Architecture governance & security audits',
      'Vendor negotiation & stack governance',
    ],
  },
  {
    title: 'Technical Team Building',
    pill: 'Hiring & Mentorship',
    desc: 'For companies building their permanent in-house engineering, data, or AI teams who need help vetting and onboarding talent.',
    features: [
      'Job description & competency design',
      'Technical interview rubrics & screenings',
      'Engineering workflow & code review standards',
      'Mentorship & smooth codebase transition',
    ],
  },
]

const FAQS = [
  {
    question: 'How is Aqivo different from a traditional website design agency?',
    answer:
      'Aqivo is a technology partner, software engineering consultancy, and systems architect. Traditional agencies focus on superficial marketing themes. We design, engineer, and scale complex software, data systems, databases, cloud infrastructure, practical AI pipelines, and technical teams that businesses run on.',
  },
  {
    question: 'At what stage should a startup partner with Aqivo?',
    answer:
      'We engage with companies across the entire lifecycle: at the Idea stage (to validate feasibility, select tech stacks, and scope the MVP), at the MVP stage (to engineer production-ready software), at the Growth stage (to optimize performance and data infrastructure), and at the Scale stage (for AI automation and team building).',
  },
  {
    question: 'How fast can Aqivo help build and launch a production MVP?',
    answer:
      'Most MVPs are scoped and shipped within 4 to 8 weeks. We eliminate non-essential complexity, design clean database schemas, build with battle-tested production stacks, and establish automated CI/CD from day one.',
  },
  {
    question: 'How does Aqivo implement Artificial Intelligence?',
    answer:
      'We do not treat AI as a gimmick. We focus strictly on practical AI systems that solve measurable business bottlenecks—such as retrieval-augmented generation (RAG) on proprietary documents, AI-powered customer support agents, document intelligence, and workflow automation.',
  },
  {
    question: 'Do we own 100% of the code, intellectual property, and infrastructure?',
    answer:
      'Yes, completely. 100% of all software, database schemas, repository commits, and cloud configurations belong exclusively to your company under strict confidentiality and IP assignment agreements.',
  },
  {
    question: 'Can Aqivo help us transition to an in-house engineering team later?',
    answer:
      'Yes. One of our core engagement models is Technical Team Building. We act as your interim engineering leadership, help write job specs, conduct technical coding interviews, establish code review standards, and mentor new hires for a seamless transition.',
  },
]

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div className="space-y-24 sm:space-y-36 pb-24 overflow-x-hidden selection:bg-purple-100 selection:text-purple-900">
      {/* =========================================================================
          SECTION 1 — HERO SECTION
          ========================================================================= */}
      <section className="relative px-4 sm:px-6 pt-10 sm:pt-16 md:pt-20">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-purple-200/40 via-indigo-100/30 to-blue-100/20 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="mx-auto max-w-5xl text-center">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200/80 bg-purple-50/80 px-4 py-1.5 text-xs font-bold text-brand shadow-2xs mb-6">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Strategic Technology Partner for Startups & Growing Businesses</span>
          </div>

          {/* Primary Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.08] text-balance">
            We Build the Technology Behind <span className="text-gradient">Growing Businesses.</span>
          </h1>

          {/* Supporting Text */}
          <p className="mx-auto mt-6 max-w-3xl text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed font-normal text-balance">
            From startup ideas and MVPs to scalable software, data infrastructure, AI systems, and technical teams,
            Aqivo helps businesses build the technology foundations they need to grow.
          </p>

          {/* Primary & Secondary CTAs */}
          <div className="mt-8 sm:mt-10 flex flex-col xs:flex-row items-center justify-center gap-3.5 sm:gap-4">
            <Link
              to="/contact"
              className="btn-brand w-full xs:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm sm:text-base font-bold shadow-lg transition hover:scale-[1.02] active:scale-95 text-center"
            >
              <span>Talk to Our Team</span>
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#solutions"
              className="glass w-full xs:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm sm:text-base font-bold text-slate-800 transition hover:bg-white active:scale-95 border border-slate-200 shadow-xs text-center"
            >
              <span>Explore Our Solutions</span>
            </a>
          </div>
        </div>

        {/* =========================================================================
            INTERACTIVE AQIVO ECOSYSTEM VISUALIZATION
            BUSINESS IDEA → STRATEGY → SOFTWARE → DATA → AI → TEAM → SCALE
            ========================================================================= */}
        <div className="mt-14 sm:mt-20">
          <EcosystemVisualizer />
        </div>
      </section>

      {/* =========================================================================
          SECTION 2 — THE PROBLEM (Startup Technology Challenges)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-12 md:p-16 shadow-xs">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">The Reality of Modern Ventures</p>
            <h2 className="mt-2 text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              Building a Business Is Hard. Building the Right Technology Shouldn't Be.
            </h2>
            <p className="mt-4 text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed font-normal">
              Most technology failures are not caused by bad programming—they are caused by poor architectural and strategic
              decisions made before a single line of code is written. Aqivo positions itself as the partner that helps solve
              these connected challenges before they become expensive rewrites.
            </p>
          </div>

          <div className="mt-10 sm:mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROBLEMS.map((prob, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 transition-all hover:bg-white hover:shadow-md hover:border-purple-200"
              >
                <div className="flex items-center gap-2 text-rose-600 mb-2.5">
                  <AlertCircle className="size-4 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{prob.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{prob.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-purple-50/70 border border-purple-200/60 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Primary Positioning Statement
              </p>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Aqivo is a technology partner that helps startups and growing businesses design, build, and scale software,
                data, and AI systems while creating the technical foundations and teams required for long-term growth.
              </p>
            </div>
            <Link
              to="/contact"
              className="btn-brand shrink-0 rounded-full px-5 py-2.5 text-xs font-bold shadow-xs whitespace-nowrap"
            >
              Start a Conversation
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3 — AQIVO SOLUTIONS (The 6 Major Solution Areas)
          ========================================================================= */}
      <section id="solutions" className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Core Solutions</p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-bold tracking-tight text-slate-900">
            Engineered for Modern Business Realities
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600">
            Aqivo helps businesses solve technology problems from the earliest stages of an idea through product
            development, scaling, data infrastructure, artificial intelligence, and technical team building.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((sol) => {
            const Icon = sol.icon
            return (
              <div
                key={sol.id}
                className="group flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn('p-3 rounded-2xl', sol.bgColor, sol.iconColor)}>
                      <Icon className="size-6" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Aqivo {sol.title}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900">{sol.title}</h3>
                  <p className="text-xs font-semibold text-brand mt-0.5">{sol.sub}</p>
                  <p className="text-xs font-bold text-slate-800 mt-2 bg-slate-100/80 rounded-lg px-2.5 py-1.5 inline-block">
                    “{sol.keyMessage}”
                  </p>

                  <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {sol.desc}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4">
                    {sol.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-slate-50 border border-slate-200/70 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
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
          SECTION 4 — HOW AQIVO WORKS (01 Understand ... 06 Scale)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-slate-50/70 p-7 sm:p-12 md:p-16">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">Execution Process</p>
            <h2 className="mt-2 text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
              From Problem to Scalable Solution
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              A structured, transparent engineering methodology that replaces guesswork with measurable execution.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PROCESS_STEPS.map((step) => (
              <div
                key={step.number}
                className="relative rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs transition-all hover:shadow-md"
              >
                <span className="text-3xl font-extrabold text-slate-300 font-mono">{step.number}</span>
                <h3 className="mt-2 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5 — STARTUP TECHNOLOGY JOURNEY (Idea, MVP, Growth, Scale)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">The Startup Journey</p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-bold tracking-tight text-slate-900">
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
              className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-lg transition-all"
            >
              <div>
                <span className="rounded-full bg-purple-100 text-brand px-3 py-1 text-[11px] font-bold">
                  {s.badge}
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{s.stage}</h3>
                <p className="text-xs font-semibold text-brand mt-1">{s.focus}</p>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">{s.desc}</p>

                <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
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
          SECTION 6 — TECHNICAL CAPABILITIES
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-12 md:p-16 shadow-xs">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">Engineering Excellence</p>
            <h2 className="mt-2 text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
              Modern Capabilities for Real-World Systems
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              Technology choices should always be driven by the client's actual business requirements, not personal preferences or industry hype.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon
              return (
                <div
                  key={cap.category}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 transition-all hover:bg-white hover:shadow-md"
                >
                  <div className="size-10 rounded-xl bg-purple-100 text-brand grid place-items-center mb-4">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{cap.category}</h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{cap.desc}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-slate-200/60">
                    {cap.stack.map((item) => (
                      <span
                        key={item}
                        className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7 — AQIVO PRODUCT ECOSYSTEM: AQIVO STORE
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="overflow-hidden rounded-3xl border border-purple-200/80 bg-gradient-to-br from-white via-purple-50/40 to-white p-7 sm:p-12 md:p-16 shadow-xs">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 mb-4">
                <ShoppingBag className="size-3.5" />
                <span>Aqivo Products Ecosystem</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Aqivo Store — Turn your physical business into an online store.
              </h2>

              <p className="mt-2 text-sm font-bold text-brand">
                Physical Shop → Aqivo → Online Store
              </p>

              <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                While Aqivo operates as a broad technology partner for ambitious businesses, the company also builds
                purpose-driven digital products. <strong>Aqivo Store</strong> is a digital storefront platform that
                helps businesses move from physical selling to online selling without complexity.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700">
                {[
                  'Digital storefront',
                  'Product management',
                  'Inventory management',
                  'Order management',
                  'Customer ordering',
                  'WhatsApp integration',
                  'Social media sharing',
                  'Business dashboard & branding',
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
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

              <p className="mt-4 text-[11px] text-slate-400">
                * Future ecosystem products (Aqivo Analytics, Aqivo AI, Aqivo Cloud, Aqivo Teams) are on our internal roadmap.
              </p>
            </div>

            {/* Visual Storefront Mockup Card */}
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
                  Integrated with M-Pesa STK, Daraja webhooks, automated WhatsApp receipts, and catalog management.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 8 — INDUSTRIES
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Domain Expertise</p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-bold tracking-tight text-slate-900">
            Technology Solutions Designed Around Your Business Model
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600">
            We adapt system architectures to the operational reality and regulatory constraints of your specific industry.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((ind) => (
            <div
              key={ind.name}
              className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs hover:shadow-md transition-all hover:border-purple-200"
            >
              <h3 className="text-base font-bold text-slate-900">{ind.name}</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">{ind.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 9 — ENGAGEMENT MODELS
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Collaboration Structures</p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-bold tracking-tight text-slate-900">
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
              className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div>
                <span className="rounded-full bg-purple-50 text-brand border border-purple-200 px-2.5 py-0.5 text-[10px] font-bold">
                  {model.pill}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-3">{model.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal mt-2">{model.desc}</p>

                <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-700">
                  {model.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-1.5">
                      <CheckCircle2 className="size-3.5 text-brand shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
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
          SECTION 10 — ABOUT AQIVO & PHILOSOPHY
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-12 md:p-16 shadow-xs">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand">Our Philosophy</p>
              <h2 className="mt-2 text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
                Technology Should Help Businesses Move Forward.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                Aqivo believes startups should not have to make major technology decisions alone. The company combines
                business understanding, software engineering, data expertise, AI capabilities, technology architecture,
                and technical leadership. The goal is to help companies build technology that is useful today and ready for tomorrow.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700">
                {[
                  'Business understanding',
                  'Software engineering',
                  'Data expertise',
                  'AI capabilities',
                  'Technology architecture',
                  'Technical leadership',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-brand shrink-0" />
                    <span className="font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900 p-6 sm:p-8 text-white space-y-4 shadow-xl">
              <p className="text-xs font-mono uppercase tracking-wider text-purple-300">The Aqivo Mission</p>
              <p className="text-xl sm:text-2xl font-bold leading-snug">
                Help ambitious businesses transform ideas and operational problems into scalable technology solutions.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed font-mono pt-2 border-t border-white/10">
                Idea → Strategy → Architecture → MVP → Product Development → Data → AI → Team → Scale
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 11 — FAQS
          ========================================================================= */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 md:px-8">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Direct answers about our architectural methodology, engagement structures, and engineering standards.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = openFaq === i
            return (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
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
          SECTION 12 — FINAL CALL TO ACTION
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl sm:rounded-[36px] bg-slate-950 p-8 sm:p-16 text-center text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-gradient-to-bl from-purple-600/20 via-brand/10 to-transparent blur-3xl pointer-events-none" />

          <div className="relative z-10 mx-auto max-w-3xl space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 px-3.5 py-1 text-xs font-bold">
              <Sparkles className="size-3.5 text-purple-300" />
              <span>Let's Build Together</span>
            </span>

            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              Let's Build What Your Business Needs Next.
            </h2>

            <p className="text-sm sm:text-base md:text-lg text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto">
              From startup ideas and MVPs to scalable software, data infrastructure, AI systems, and technical teams,
              Aqivo helps businesses build the technology foundations they need to grow.
            </p>

            <div className="pt-4 flex flex-col xs:flex-row items-center justify-center gap-3.5 sm:gap-4">
              <Link
                to="/contact"
                className="btn-brand w-full xs:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm sm:text-base font-bold shadow-xl transition hover:scale-[1.02] active:scale-95"
              >
                <span>Talk to Our Team</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/solutions"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-8 py-4 text-sm sm:text-base font-bold text-white transition hover:bg-white/20 active:scale-95 w-full xs:w-auto"
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
