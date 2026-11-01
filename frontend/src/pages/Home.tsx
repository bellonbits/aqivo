import { Link } from 'react-router-dom'
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
  Sparkles,
  ShoppingBag,
  ChevronRight,
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
    title: 'Engineering',
    sub: 'Cloud, Infrastructure & Scalability',
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
    desc: 'Fragile, monolithic codebases with tightly coupled logic that break under moderate user concurrency or schema shifts.',
  },
  {
    title: 'Disconnected Business Data',
    desc: 'Valuable customer and financial data trapped across isolated spreadsheets and third-party tools with zero consolidated visibility.',
  },
  {
    title: 'AI Implemented Without Strategy',
    desc: 'Adding superficial chatbot wrappers that hallucinate and cost money instead of automating concrete operational bottlenecks.',
  },
  {
    title: 'Hiring Without Technical Leadership',
    desc: 'Non-technical founders struggling to assess developer seniority, resulting in missed delivery dates and unmaintainable code.',
  },
]

const PROCESS_STEPS = [
  {
    number: '01',
    title: 'Understand',
    desc: 'Deeply evaluate the business model, unit economics, target users, operational friction, and commercial goals.',
  },
  {
    number: '02',
    title: 'Strategize',
    desc: 'Formulate an actionable technology roadmap, select appropriate stacks, and establish phased architectural milestones.',
  },
  {
    number: '03',
    title: 'Architect',
    desc: 'Design the software schema, data models, cloud infrastructure, security policies, and AI boundaries.',
  },
  {
    number: '04',
    title: 'Build',
    desc: 'Execute clean, maintainable engineering with automated testing, continuous integration, and rapid delivery cycles.',
  },
  {
    number: '05',
    title: 'Integrate',
    desc: 'Unify internal workflows, third-party APIs, data pipelines, and intelligent automation into a cohesive ecosystem.',
  },
  {
    number: '06',
    title: 'Scale',
    desc: 'Continuously optimize database queries, cloud infrastructure, reliability engineering, and technical team capacity.',
  },
]

const TECH_DOMAINS = [
  {
    domain: 'Frontend & User Experience',
    tech: ['React', 'Next.js', 'Vite', 'TypeScript', 'Tailwind CSS', 'State Management'],
    desc: 'Fast, responsive, accessible web and mobile interfaces built for high user conversion and retention.',
  },
  {
    domain: 'Backend & System APIs',
    tech: ['FastAPI', 'Python', 'Node.js', 'Spring Boot / Java', 'REST & GraphQL', 'Event Queues'],
    desc: 'Secure, high-throughput microservices and APIs engineered for business logic integrity.',
  },
  {
    domain: 'Data & Analytics',
    tech: ['PostgreSQL', 'MySQL', 'Redis', 'Modern Data Warehouses', 'ETL/ELT Pipelines', 'Apache Spark'],
    desc: 'High-availability transactional databases, optimized caching layers, and analytical pipelines.',
  },
  {
    domain: 'Applied AI & ML',
    tech: ['Large Language Models', 'Retrieval-Augmented Gen (RAG)', 'Vector DBs (pgvector)', 'AI Agents', 'Automation'],
    desc: 'Pragmatic, measurable AI applications that streamline workflows without unnecessary overhead.',
  },
  {
    domain: 'Infrastructure & Cloud',
    tech: ['Docker & Containers', 'Cloud Environments', 'CI/CD Pipelines', 'Monitoring & Tracing', 'Cloudflare'],
    desc: 'Resilient, automated cloud infrastructure designed to scale smoothly with zero operational panic.',
  },
]

const ENGAGEMENT_MODELS = [
  {
    title: 'Project Engagement',
    desc: 'For clearly defined software, data, or AI initiatives with specific deliverables, milestones, and timelines.',
    features: ['Fixed-scope or sprint-based delivery', 'Complete architecture & documentation', 'Full IP and codebase handover'],
    image: '/img/professional-3.webp',
    pill: 'Fixed Milestones',
  },
  {
    title: 'Dedicated Technology Partner',
    desc: 'For startups that require ongoing engineering velocity, architectural guidance, and continuous product iteration.',
    features: ['Embedded senior engineering capacity', 'Ongoing architecture & data oversight', 'Sprint-by-sprint technical alignment'],
    image: '/img/professional-1.webp',
    pill: 'Continuous Velocity',
  },
  {
    title: 'Fractional CTO',
    desc: 'For non-technical founders or growing companies needing high-level strategic technology direction without a full-time hire.',
    features: ['Technical roadmapping & stack selection', 'Vendor & partner technical evaluation', 'Board & investor technical advisory'],
    image: '/img/professional-5.webp',
    pill: 'Strategic Advisory',
  },
  {
    title: 'Team Building & Mentorship',
    desc: 'For businesses transitioning to an internal team, ensuring they hire the right talent and adopt mature standards.',
    features: ['Technical interview support & coding rubrics', 'Engineering culture & workflow setup', 'Onboarding & codebase knowledge transfer'],
    image: '/img/professional-2.webp',
    pill: 'In-House Talent',
  },
]

export default function Home() {
  return (
    <div className="space-y-24 sm:space-y-32 pb-20">
      {/* =========================================================================
          SECTION 1 — HERO
          ========================================================================= */}
      <section className="relative px-4 pt-6 sm:px-6 sm:pt-12 md:pt-16">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl sm:rounded-[36px] border border-slate-200/90 bg-gradient-to-b from-white via-purple-50/20 to-slate-50/90 p-6 sm:p-12 md:p-16 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
          {/* Subtle Ambient Grid */}
          <div className="tech-grid absolute inset-0 opacity-40 pointer-events-none" />

          <div className="relative mx-auto max-w-4xl text-center">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100/80 px-4 py-1.5 text-xs font-semibold text-brand ring-1 ring-purple-200 mb-6">
              <Sparkles className="size-3.5 text-brand" />
              <span>Technology Partner for Startups & Growing Businesses</span>
            </div>

            {/* Hero Headline */}
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-[64px] leading-[1.12]">
              We Build the Technology Behind Growing Businesses.
            </h1>

            {/* Supporting Text */}
            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed font-normal">
              From startup ideas and MVPs to scalable software, data infrastructure, AI systems, and technical teams, Aqivo
              helps businesses build the technology foundations they need to grow.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <Link
                to="/contact"
                className="btn-brand inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm sm:text-base font-bold shadow-lg transition hover:scale-[1.02] active:scale-95"
              >
                <span>Talk to Our Team</span>
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#solutions"
                className="glass inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm sm:text-base font-bold text-slate-800 transition hover:bg-white active:scale-95 border border-slate-200"
              >
                <span>Explore Our Solutions</span>
              </a>
            </div>
          </div>

          {/* Interactive Ecosystem Visualizer in Hero */}
          <div className="relative mt-12 sm:mt-16">
            <EcosystemVisualizer />
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2 — THE PROBLEM
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-8 sm:p-12 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand">The Reality of Startup Engineering</p>
              <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                Building a Business Is Hard. Building the Right Technology Shouldn't Be.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                Most startup failures are not market failures—they are technical execution failures. Founders spend precious
                capital navigating fragmented decisions without strategic technical partnership.
              </p>
            </div>

            {/* Strategic Reality Photographic Callout */}
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

          <div className="mt-8 rounded-2xl bg-purple-50/80 border border-purple-200/80 p-5 sm:p-6 text-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">The Aqivo Advantage</p>
                <p className="text-sm sm:text-base font-semibold text-slate-900 mt-0.5">
                  Aqivo bridges business strategy and deep engineering discipline so you build right the first time.
                </p>
              </div>
              <Link
                to="/about"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-brand hover:underline shrink-0"
              >
                <span>Read our philosophy</span>
                <ChevronRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3 — AQIVO SOLUTIONS (6 Major Pillars with Photographic Bento Cards)
          ========================================================================= */}
      <section id="solutions" className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Comprehensive Capabilities</p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-extrabold text-slate-900">
            Six Pillars of Strategic Technology
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600">
            Whether you need to validate an initial architecture or scale high-volume systems, Aqivo provides senior
            capabilities across every facet of modern engineering.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((sol) => {
            const Icon = sol.icon
            return (
              <div
                key={sol.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-slate-300"
              >
                <div>
                  {/* Photo Header */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                    <img
                      src={sol.image}
                      alt={sol.sub}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <div className={cn('grid size-9 place-items-center rounded-xl bg-white/95 backdrop-blur-md shadow-xs', sol.iconColor)}>
                        <Icon className="size-4.5" />
                      </div>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="rounded-full bg-slate-900/80 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white border border-white/20">
                        Aqivo {sol.title}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="text-[10px] font-semibold text-purple-200">"{sol.keyMessage}"</p>
                      <h3 className="text-base font-bold drop-shadow-xs line-clamp-1">{sol.sub}</h3>
                    </div>
                  </div>

                  <div className="p-6">
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

                <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                  <Link
                    to={sol.link}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 group-hover:text-brand transition-colors"
                  >
                    <span>Learn more about {sol.title}</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 4 — HOW AQIVO WORKS (The 6-Step Process)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-900 via-slate-900 to-[#101a38] p-8 sm:p-14 text-white shadow-2xl">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Our Methodology</span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold leading-tight">
              From Problem to Scalable Solution.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300">
              We apply an engineering process that balances commercial speed with architectural durability.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROCESS_STEPS.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xs transition hover:bg-white/10"
              >
                <span className="text-2xl font-black text-purple-400">{step.number}</span>
                <h3 className="mt-2 text-lg font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
            <p className="text-xs text-slate-400">
              Clear sprint timelines, transparent Git repositories, and direct senior communication.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 transition hover:bg-slate-100"
            >
              <span>Schedule Initial Technical Audit</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5 — STARTUP TECHNOLOGY JOURNEY (Stages)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Long-Term Partnership</p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-extrabold text-slate-900">
            Meeting You at Every Stage of Growth
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600">
            Aqivo does not abandon you after an MVP launch. We stay by your side as an enduring technical partner.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              stage: 'Stage 1 — Idea',
              desc: 'Transform initial business hypotheses into validated technical roadmaps and feasibility specs.',
              services: ['Technology Strategy', 'Feasibility Analysis', 'MVP Planning & Scoping'],
              pill: 'Pre-Seed',
              image: '/img/professional-5.webp',
            },
            {
              stage: 'Stage 2 — MVP',
              desc: 'Build and deploy a production-grade initial product with high reliability and quick feedback loops.',
              services: ['Product Design', 'Software Development', 'Core Cloud Infrastructure'],
              pill: 'Seed & Launch',
              image: '/img/professional-3.webp',
            },
            {
              stage: 'Stage 3 — Growth',
              desc: 'Optimize database bottlenecks, streamline operational data, and automate repetitive workflows.',
              services: ['Performance Optimization', 'Data Architecture', 'Analytics & Automation'],
              pill: 'Series A / Traction',
              image: '/img/professional-4.webp',
            },
            {
              stage: 'Stage 4 — Scale',
              desc: 'Deploy resilient multi-cloud architecture, applied AI systems, and transition to in-house teams.',
              services: ['AI Systems & Agents', 'Cloud Reliability Engineering', 'Engineering Team Hiring'],
              pill: 'Scale & Enterprise',
              image: '/img/professional-2.webp',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div>
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                  <img
                    src={item.image}
                    alt={item.stage}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="rounded-full bg-white/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-brand border border-white/60">
                      {item.pill}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 text-white">
                    <h3 className="text-base font-bold drop-shadow-xs">{item.stage}</h3>
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Core Services</p>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {item.services.map((s) => (
                        <li key={s} className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <div className="pt-2 border-t border-slate-100">
                  <Link
                    to="/services"
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                  >
                    <span>Explore stage services</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 6 — PRODUCT ECOSYSTEM SPOTLIGHT (Aqivo Store)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-r from-purple-50/50 via-white to-blue-50/50 p-8 sm:p-12 shadow-sm">
          <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <ShoppingBag className="size-3.5" />
                <span>Aqivo Product Ecosystem</span>
              </div>

              <h2 className="mt-4 text-2xl sm:text-4xl font-extrabold text-slate-900">
                Aqivo Store: From Physical Shop to Modern Online Commerce
              </h2>

              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                As part of our commitment to empowering businesses, we created <strong>Aqivo Store</strong>—a premium
                digital storefront platform engineered for merchants and retailers moving from physical selling to online selling.
              </p>

              <div className="mt-4 flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700">
                <span className="rounded-md bg-white px-2.5 py-1 border border-slate-200">Physical Shop</span>
                <span>→</span>
                <span className="rounded-md bg-purple-100 text-brand px-2.5 py-1 border border-purple-200">Aqivo</span>
                <span>→</span>
                <span className="rounded-md bg-white px-2.5 py-1 border border-slate-200">Online Store</span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 text-xs sm:text-sm text-slate-700">
                {[
                  'Digital storefront with fast checkout',
                  'Product & live inventory management',
                  'Itemized WhatsApp order routing',
                  'M-Pesa, card & mobile payment verification',
                  'Customer tracking and live status updates',
                  'Custom branding, domains & SEO readiness',
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-brand shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/products"
                  className="btn-brand inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs sm:text-sm font-bold shadow-md"
                >
                  <span>Explore Aqivo Store</span>
                  <ArrowRight className="size-3.5" />
                </Link>
                <Link
                  to="/register"
                  className="glass inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs sm:text-sm font-bold text-slate-800 border border-slate-200"
                >
                  <span>Launch a Merchant Store</span>
                </Link>
              </div>
            </div>

            {/* Store Preview Illustration with Real Retail Imagery */}
            <div className="relative rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 px-2">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-red-400" />
                  <div className="size-2.5 rounded-full bg-amber-400" />
                  <div className="size-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs font-mono text-slate-400">aqivo.shop/two-sides</span>
              </div>

              <div className="mt-3 space-y-3">
                {/* Physical Store Photo with Digital Storefront Overlay */}
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-100">
                  <img
                    src="/img/retail-1.webp"
                    alt="Physical merchant transformed to digital store"
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold text-slate-900 shadow-xs">
                      Physical Store → Online
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-purple-200">Automated Catalog</p>
                      <p className="text-sm font-bold">Two Sides Boutique</p>
                    </div>
                    <span className="rounded-lg bg-emerald-500/90 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
                      WhatsApp Live
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <p className="text-[11px] text-slate-500">Orders Received</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5">100% Automated</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">Direct itemized cart</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <p className="text-[11px] text-slate-500">Instant Payments</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5">M-Pesa STK</p>
                    <p className="text-[10px] text-brand mt-0.5">Auto-reconciliation</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center italic">
                  Aqivo Store is one of several products in the Aqivo technology ecosystem.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7 — TECHNICAL CAPABILITIES
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Modern Tooling</p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-extrabold text-slate-900">
            Pragmatic Engineering Capabilities
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600">
            We do not mandate every technology for every project. Technology choices are strictly driven by your business
            requirements, scalability targets, and team capabilities.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TECH_DOMAINS.map((domain, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <h3 className="text-base font-bold text-slate-900">{domain.domain}</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">{domain.desc}</p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
                {domain.tech.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200/60"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 8 — ENGAGEMENT MODELS
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Collaboration Structures</p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-extrabold text-slate-900">
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
          SECTION 9 — INDUSTRIES OVERVIEW (With Photographic Showcase)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-slate-50/80 p-8 sm:p-12">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">Domain Experience</p>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-slate-900">
              Technology Solutions Designed Around Your Business Model
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              Every vertical presents unique technical hurdles—whether it is real-time inventory synchronization,
              regulatory compliance, or low-latency event processing.
            </p>
          </div>

          {/* Featured 4-Photo Showcase Grid */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Retail & Digital Commerce',
                metric: 'Real-Time Sync',
                desc: 'Digital storefronts, inventory tracking, and M-Pesa automated reconciliation.',
                img: '/img/retail-1.webp',
              },
              {
                title: 'Fleet & Logistics',
                metric: 'Telemetry & Dispatch',
                desc: 'Driver dispatch apps, route telemetry, and delivery tracking systems.',
                img: '/img/auto-1.webp',
              },
              {
                title: 'Healthcare & Clinics',
                metric: 'Data Protection',
                desc: 'Patient appointment triage, encrypted records, and compliance logging.',
                img: '/img/clinic-1.webp',
              },
              {
                title: 'SaaS & Professional Firms',
                metric: 'Multi-Tenant Portals',
                desc: 'Client workspaces, role-based workflows, and automated invoice billing.',
                img: '/img/professional-4.webp',
              },
            ].map((ind, idx) => (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs hover:shadow-lg transition-all"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <img
                    src={ind.img}
                    alt={ind.title}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                  <div className="absolute top-2.5 left-2.5">
                    <span className="rounded-full bg-white/90 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-slate-900">
                      {ind.metric}
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                    <h3 className="text-xs sm:text-sm font-bold drop-shadow-xs">{ind.title}</h3>
                  </div>
                </div>
                <div className="p-3.5">
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{ind.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-2 sm:gap-3">
            {[
              'E-commerce & Retail',
              'Logistics & Freight',
              'Financial Services & FinTech',
              'Education & EdTech',
              'Healthcare & Clinics',
              'Real Estate & PropTech',
              'Professional Services',
              'Multi-Sided Marketplaces',
              'B2B SaaS Platforms',
            ].map((ind) => (
              <span
                key={ind}
                className="rounded-full bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 border border-slate-200/80 shadow-2xs"
              >
                {ind}
              </span>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200/70 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              We focus on system architecture, database integrity, and operational flow rather than superficial redesigns.
            </p>
            <Link
              to="/industries"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-brand hover:underline"
            >
              <span>Explore Industry Architectures</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 10 — ABOUT AQIVO & FINAL CTA
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl sm:rounded-[36px] bg-gradient-to-br from-slate-900 via-slate-900 to-[#1e1045] p-8 sm:p-16 text-center text-white shadow-2xl">
          <div className="tech-grid-dark absolute inset-0 pointer-events-none opacity-20" />

          <div className="relative mx-auto max-w-3xl space-y-6">
            <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-semibold text-purple-200 border border-white/15">
              Start Your Technology Journey
            </span>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Technology Should Help Businesses Move Forward.
            </h2>

            <p className="text-sm sm:text-base md:text-lg text-slate-300 leading-relaxed font-normal">
              You shouldn't have to navigate complex software architecture, data modeling, AI implementation, and engineering
              recruitment alone. Aqivo is your partner from the first line of strategy to long-term scale.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm sm:text-base font-bold text-slate-900 shadow-xl transition hover:bg-slate-100 active:scale-95"
              >
                <span>Start a Conversation</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-8 py-4 text-sm sm:text-base font-bold text-white transition hover:bg-white/20 active:scale-95"
              >
                <span>Review All Services</span>
              </Link>
            </div>

            <p className="text-xs text-slate-400 pt-2">
              Confidential discussions · Direct senior engineering review · Pragmatic solutions
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
