import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  Plus,
  Minus,
} from 'lucide-react'
import { EcosystemVisualizer } from '@/components/ecosystem/EcosystemVisualizer'
import { CreativeRobot } from '@/components/ui/CreativeRobot'
import { cn } from '@/lib/cn'

const FEATURE_CARDS = [
  {
    title: 'Precision Architecture',
    sub: 'Startup Technology Strategy',
    desc: 'Systematic technical roadmaps, stack selection, and MVP scoping before heavy engineering commitments.',
    image: '/img/theme/feature-target.webp',
    tag: 'Strategy',
  },
  {
    title: 'Modern Tech Stack',
    sub: 'Full-Stack Software Engineering',
    desc: 'Engineered with high-concurrency databases, clean API contracts, and modular production architectures.',
    image: '/img/theme/feature-processor.webp',
    tag: 'Engineering',
  },
  {
    title: 'Practical AI & Data',
    sub: 'Data Architecture & Applied AI',
    desc: 'Practical AI agents, RAG on internal knowledge, and single-source-of-truth operational data warehouses.',
    image: '/img/theme/feature-network.webp',
    tag: 'Intelligence',
  },
  {
    title: 'Engineered to Scale',
    sub: 'Cloud Infrastructure & DevOps',
    desc: 'Automated CI/CD pipelines, container orchestration, and zero-downtime infrastructure ready for growth.',
    image: '/img/theme/feature-scale.webp',
    tag: 'Scale',
  },
]

const SERVICES_LIST = [
  {
    id: '01',
    name: 'Startup Technology Strategy',
    tagline: 'Start with the right technology decisions.',
    desc: 'Feasibility analysis, product roadmapping, tech stack selection, and infrastructure cost modeling.',
    link: '/services#strategy',
  },
  {
    id: '02',
    name: 'Software & Product Engineering',
    tagline: 'From idea to production-ready software.',
    desc: 'Web & mobile applications, multi-tenant SaaS platforms, custom enterprise systems, and high-throughput APIs.',
    link: '/services#software',
  },
  {
    id: '03',
    name: 'Data Architecture & Intelligence',
    tagline: 'Turn business data into better decisions.',
    desc: 'Database schema design, ETL/ELT pipelines, data warehouses, real-time analytics, and executive KPI systems.',
    link: '/services#data',
  },
  {
    id: '04',
    name: 'Artificial Intelligence & Automation',
    tagline: 'Build AI that creates real business value.',
    desc: 'Retrieval-augmented generation (RAG), autonomous AI agents, customer support copilots, and document AI.',
    link: '/services#ai',
  },
  {
    id: '05',
    name: 'Cloud & Scalable Infrastructure',
    tagline: 'Build technology that is ready to grow.',
    desc: 'Cloud architecture (AWS/GCP), DevOps, CI/CD, database optimization, monitoring, and security hardening.',
    link: '/services#infrastructure',
  },
  {
    id: '06',
    name: 'Technical Team Building & Fractional CTO',
    tagline: 'Build the team behind your technology.',
    desc: 'Fractional CTO advisory, technical hiring rubrics, candidate coding interviews, and engineering mentorship.',
    link: '/services#teams',
  },
]

const CAPABILITIES_STACK = [
  {
    num: '01',
    title: 'Build with confidence',
    desc: 'Composable, modern architectures engineered for low maintenance and zero premature technical debt.',
  },
  {
    num: '02',
    title: 'Unified business data',
    desc: 'Consolidated database models, real-time webhooks, and single-source-of-truth operational analytics.',
  },
  {
    num: '03',
    title: 'Scalable by design',
    desc: 'Stateless API layers, connection pooling, and multi-region CDN caching for extreme concurrency.',
  },
  {
    num: '04',
    title: 'Security & governance',
    desc: 'Zero-trust access policies, encrypted secrets management, and automated vulnerability scanning.',
  },
]

const PRINCIPLES = [
  {
    title: 'Deterministic Software',
    desc: 'We engineer with strict typing, automated testing suites, and modular boundaries for lasting code quality.',
  },
  {
    title: 'Pragmatic Business AI',
    desc: 'We never treat AI as a gimmick. We deploy AI only where it drives measurable ROI and operational efficiency.',
  },
  {
    title: 'Complete IP Ownership',
    desc: '100% of all source code, database schemas, repository commits, and cloud configurations belong to you.',
  },
  {
    title: 'Long-Term Partnership',
    desc: 'We support founders across the entire journey: from the first idea to production MVP, scaling, and team building.',
  },
]

const FAQS = [
  {
    question: 'How is Aqivo different from a traditional digital agency?',
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
]

export default function Home() {
  const [activeService, setActiveService] = useState<number>(0)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div className="space-y-24 sm:space-y-36 pb-24 overflow-x-hidden selection:bg-[#375a8a] selection:text-white">
      {/* =========================================================================
          SECTION 1 — HERO SECTION (Matching Orange Gradient Banner & Showcase)
          ========================================================================= */}
      <section className="relative px-3 sm:px-6 pt-4 sm:pt-6">
        <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[32px] sm:rounded-[44px] bg-[#0f172a] border border-[#375a8a]/30 p-6 sm:p-12 md:p-16 shadow-2xl">
          {/* Subtle Grid Lines Overlay */}
          <div className="absolute inset-0 tech-grid-dark opacity-15 pointer-events-none" />

          {/* Top Row: Headline on Left, Supporting Text & CTA on Right */}
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.3fr_1fr] items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-black/25 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-white/95 border border-white/20 mb-5">
                <Sparkles className="size-3.5 text-[#375a8a]" />
                <span>Strategic Technology Partner for Growing Businesses</span>
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[68px] font-extrabold tracking-tight text-white leading-[1.08] text-balance">
                Building Digital Experiences That Create Real Business Growth
              </h1>

              {/* Tagline numbers */}
              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold text-white/80">
                <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full border border-white/10">
                  <span className="text-[#375a8a] font-mono">01</span> Strategy & Architecture
                </span>
                <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full border border-white/10">
                  <span className="text-[#375a8a] font-mono">02</span> Production Software
                </span>
                <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full border border-white/10">
                  <span className="text-[#375a8a] font-mono">03</span> Scalable Cloud & Data
                </span>
              </div>
            </div>

            <div className="space-y-6 lg:pt-6 lg:pl-6 flex flex-col justify-between h-full">
              <p className="text-sm sm:text-base md:text-lg text-white/90 leading-relaxed font-normal">
                From startup ideas and MVPs to scalable software, data infrastructure, AI systems, and technical teams,
                Aqivo helps businesses build the technology foundations they need to grow.
              </p>

              <div>
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-zinc-100 text-[#09090b] font-bold px-8 py-4 text-sm sm:text-base shadow-2xl transition-all hover:scale-[1.02] active:scale-95"
                >
                  <span>Talk to Our Team</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Showcase Gallery (Matching Image 1's horizontal screen cards) */}
          <div className="relative z-10 mt-12 sm:mt-16 pt-8 border-t border-white/20">
            <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-4">
              Real-World Platform & Storefront Architecture
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 overflow-hidden">
              {[
                { title: 'Storefront Commerce', img: '/img/retail-1.webp', tag: 'E-commerce' },
                { title: 'Booking & Scheduling', img: '/img/spa-facial.webp', tag: 'Bookings' },
                { title: 'Logistics Telemetry', img: '/img/professional-3.webp', tag: 'Logistics' },
                { title: 'Restaurant Ordering', img: '/img/restaurant-1.webp', tag: 'Food & Bar' },
                { title: 'Fitness & Memberships', img: '/img/fitness-1.webp', tag: 'Wellness' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-2xl bg-black/40 border border-white/20 aspect-[4/3] shadow-lg transition-transform duration-300 hover:scale-[1.03]"
                >
                  <img
                    src={item.img}
                    alt={item.title}
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/60" />
                  <div className="absolute bottom-2.5 left-2.5 right-2.5">
                    <span className="text-[10px] font-bold text-[#375a8a] uppercase tracking-wider block">
                      {item.tag}
                    </span>
                    <span className="text-xs font-bold text-white truncate block">
                      {item.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ghost Outline Watermark & 4 Pillars Strip Below Hero (Matching Image 1) */}
        <div className="relative mx-auto max-w-7xl pt-10 sm:pt-14 text-center">
          {/* Subtle Watermark */}
          <p className="font-editorial text-[14vw] font-black tracking-[0.16em] text-slate-900/[0.04] dark:text-white/[0.04] uppercase select-none pointer-events-none leading-none -mb-8 sm:-mb-14">
            AQIVO
          </p>

          {/* 4 Pillars Strip */}
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { num: '01', title: 'Strategy & Architecture' },
              { num: '02', title: 'Production MVPs' },
              { num: '03', title: 'Scalable Cloud & Data' },
              { num: '04', title: 'Dedicated Tech Teams' },
            ].map((p) => (
              <div
                key={p.num}
                className="theme-card rounded-2xl p-3.5 sm:p-4 text-center transition shadow-xs"
              >
                <span className="text-[11px] font-mono font-bold text-[#375a8a] mr-1.5">{p.num}</span>
                <span className="text-xs sm:text-sm font-bold text-inherit">{p.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2 — ABOUT US: WE ARE MORE THAN A TRADITIONAL AGENCY (4 3D Cards)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#375a8a]/40 bg-[#375a8a]/10 px-3.5 py-1 text-xs font-bold text-[#375a8a] mb-4">
            <span>About Us</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            We Are More Than a Traditional Agency
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-zinc-400 leading-relaxed font-normal">
            Aqivo is a technology partner that helps startups and growing businesses design, build, and scale software,
            data, and AI systems while creating the technical foundations and teams required for long-term growth.
          </p>
        </div>

        {/* 4 Feature 3D Cards (Target, Processor, Network, Scale) */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURE_CARDS.map((card, i) => (
            <div
              key={i}
              className="theme-card group overflow-hidden rounded-3xl p-4 shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black mb-4">
                <img
                  src={card.image}
                  alt={card.title}
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute top-2.5 left-2.5">
                  <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-[#375a8a] border border-white/10">
                    {card.tag}
                  </span>
                </div>
              </div>

              <div className="px-2 pb-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#375a8a] transition-colors">
                  {card.title}
                </h3>
                <p className="text-[11px] font-semibold text-[#375a8a] mt-0.5">{card.sub}</p>
                <p className="mt-2 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-normal">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 3 — OUR VISION (Mascot on Orange + 3 Value Tabs)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] items-center">
          {/* Left Text & Tabs */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#375a8a]/40 bg-[#375a8a]/10 px-3.5 py-1 text-xs font-bold text-[#375a8a]">
              <span>Our Vision</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              We Believe Every Business Has the Potential to Grow Digitally
            </h2>

            <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 leading-relaxed font-normal">
              Building a business is hard. Choosing the right architecture, selecting the right database engine, and
              building the right technical team shouldn't hold you back.
            </p>

            <div className="space-y-3 pt-2">
              {[
                {
                  title: 'Eliminate architectural technical debt early',
                  desc: 'Validate feasibility, database boundaries, and scale trajectories before heavy capital commitments.',
                },
                {
                  title: 'Production-ready software from day one',
                  desc: 'Ship clean, well-tested code with automated CI/CD pipelines and low ongoing maintenance overhead.',
                },
                {
                  title: 'Build the team behind your technology',
                  desc: 'Transition smoothly from early partner execution to an in-house engineering team as you scale.',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="theme-card rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 transition"
                >
                  <div className="grid size-6 place-items-center rounded-full bg-[#375a8a]/20 text-[#375a8a] shrink-0 mt-0.5">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-inherit">{item.title}</h4>
                    <p className="text-xs theme-muted mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Mascot on Vibrant Orange Card */}
          <div className="relative overflow-hidden rounded-[36px] bg-[#0f172a] border border-[#375a8a]/30 p-6 sm:p-10 shadow-2xl flex flex-col justify-between aspect-[4/5]">
            <div className="relative z-10">
              <span className="rounded-full bg-black/25 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/20">
                Aqivo Intelligence & Systems
              </span>
            </div>

            {/* Mascot Image - Cutout Asset with Floating Physics & Orbit Rings */}
            <div className="relative z-10 my-auto flex justify-center py-4">
              <CreativeRobot
                variant="floating"
                size="md"
                badgeText="Aqivo Autonomous Vanguard"
                mascot="2"
                showOrbits={true}
              />
            </div>

            {/* Quote box at bottom */}
            <div className="relative z-10 rounded-2xl bg-black/35 backdrop-blur-md border border-white/20 p-4 text-white">
              <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                “Transforming ambitious ideas and operational bottlenecks into scalable technology systems that stand the test of time.”
              </p>
              <p className="text-[11px] font-mono text-white mt-1.5 uppercase tracking-wider">
                — Aqivo Core Philosophy
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4 — SERVICES: HELPING BUSINESSES BUILD DIGITAL EXPERIENCES
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#375a8a]/40 bg-[#375a8a]/10 px-3.5 py-1 text-xs font-bold text-[#375a8a] mb-4">
            <span>Services</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Helping Businesses Build Scalable Digital Experiences
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-zinc-400">
            From idea to production-ready software, data architecture, practical AI systems, and technical leadership.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr] items-start">
          {/* Left: 4 Preview Screens Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[
              { title: 'Storefront Suite', img: '/img/retail-2.webp' },
              { title: 'Booking Flow', img: '/img/spa-massage.webp' },
              { title: 'Inventory Engine', img: '/img/retail-3.webp' },
              { title: 'Executive Analytics', img: '/img/professional-4.webp' },
            ].map((s, idx) => (
              <div
                key={idx}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-black aspect-video shadow-md group"
              >
                <img
                  src={s.img}
                  alt={s.title}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/60" />
                <span className="absolute bottom-2 left-2 text-[11px] font-bold text-white">
                  {s.title}
                </span>
              </div>
            ))}
          </div>

          {/* Right: 6 Interactive Service Accordions */}
          <div className="space-y-2.5">
            {SERVICES_LIST.map((srv, idx) => {
              const isOpen = activeService === idx
              return (
                <div
                  key={srv.id}
                  className={cn(
                    'overflow-hidden rounded-2xl transition-all duration-200',
                    isOpen
                      ? 'border border-[#375a8a] bg-blue-50/50 dark:bg-[#11224d] shadow-lg shadow-blue-500/5'
                      : 'theme-card-interactive'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveService(isOpen ? -1 : idx)}
                    className="flex w-full items-center justify-between p-4 sm:p-5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn('font-mono text-xs font-bold', isOpen ? 'text-[#375a8a]' : 'text-zinc-500')}>
                        {srv.id}
                      </span>
                      <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{srv.name}</span>
                    </div>
                    <ChevronRight
                      className={cn(
                        'size-4 text-zinc-400 transition-transform duration-200',
                        isOpen && 'rotate-90 text-[#375a8a]'
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="border-t border-slate-200 dark:border-white/10 px-5 pb-5 pt-3 space-y-3">
                          <p className="text-xs font-semibold text-[#375a8a] font-mono">"{srv.tagline}"</p>
                          <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed font-normal">{srv.desc}</p>
                          <Link
                            to={srv.link}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#375a8a] hover:underline pt-1"
                          >
                            <span>Explore {srv.name}</span>
                            <ArrowRight className="size-3" />
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5 — CAPABILITIES: EVERYTHING YOU NEED TO BUILD YOUR DIGITAL FUTURE
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.3fr] items-start">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#375a8a]/40 bg-[#375a8a]/10 px-3.5 py-1 text-xs font-bold text-[#375a8a]">
              <span>Capabilities</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Everything You Need to Build Your Digital Future
            </h2>

            <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 leading-relaxed font-normal">
              Whether architecting a zero-downtime transactional database, designing an MVP, or deploying practical AI
              assistants, Aqivo supplies the deep engineering rigor required.
            </p>

            {/* Giant Background Outline Watermark in this section */}
            <div className="pt-4 select-none pointer-events-none">
              <p className="font-editorial text-[10vw] font-black tracking-[0.14em] text-slate-900/[0.04] dark:text-white/[0.04] leading-none uppercase">
                AQIVO
              </p>
            </div>
          </div>

          {/* Vertical Stack of Dark Cards with Orange Badges */}
          <div className="space-y-3.5">
            {CAPABILITIES_STACK.map((cap) => (
              <div
                key={cap.num}
                className="theme-card rounded-2xl p-5 sm:p-6 transition shadow-md"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-[#375a8a] text-white font-mono font-bold text-xs shadow-xs">
                    {cap.num}
                  </span>
                  <h3 className="text-base font-bold text-inherit">{cap.title}</h3>
                </div>
                <p className="text-xs sm:text-sm theme-muted leading-relaxed pl-10 font-normal">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6 — PRINCIPLES BEHIND OUR WORK (Mascot Dark + 4 Principles)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] items-center">
          {/* Left: Mascot on dark pedestal */}
          <div className="theme-card-subtle relative overflow-hidden rounded-[36px] p-6 sm:p-10 shadow-2xl flex items-center justify-center aspect-[4/5]">
            <CreativeRobot
              variant="pedestal"
              size="lg"
              badgeText="Zero Architectural Debt"
              mascot="1"
              showOrbits={true}
            />
          </div>

          {/* Right: Principles List */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#375a8a]/40 bg-[#375a8a]/10 px-3.5 py-1 text-xs font-bold text-[#375a8a]">
              <span>Principles</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              The Principles Behind Our Work
            </h2>

            <div className="space-y-3.5 pt-2">
              {PRINCIPLES.map((prin) => (
                <div
                  key={prin.title}
                  className="theme-card rounded-2xl p-5 transition"
                >
                  <h4 className="text-sm sm:text-base font-bold text-[#375a8a]">{prin.title}</h4>
                  <p className="text-xs sm:text-sm theme-muted mt-1.5 leading-relaxed font-normal">{prin.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7 — INTERACTIVE LIFECYCLE: THE AQIVO ECOSYSTEM
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <p className="text-xs font-bold uppercase tracking-wider text-[#375a8a]">Full Lifecycle Engineering</p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            From Idea to Scalable Technology Engine
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-zinc-400">
            Click through each phase below to inspect the architectural questions, deliverables, and capabilities.
          </p>
        </div>

        <EcosystemVisualizer />
      </section>

      {/* =========================================================================
          SECTION 8 — PRODUCT ECOSYSTEM: AQIVO STORE
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="theme-card overflow-hidden rounded-3xl p-7 sm:p-12 md:p-16 shadow-xl">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#375a8a]/15 border border-[#375a8a]/30 px-3 py-1 text-xs font-bold text-[#375a8a] mb-4">
                <ShoppingBag className="size-3.5" />
                <span>Aqivo Products Ecosystem</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                Aqivo Store — Turn your physical business into an online store.
              </h2>

              <p className="mt-2 text-sm font-bold text-[#375a8a]">
                Physical Shop → Aqivo → Online Store
              </p>

              <p className="mt-4 text-sm sm:text-base theme-muted leading-relaxed font-normal">
                While Aqivo operates as a broad technology partner for ambitious businesses, the company also builds
                purpose-driven digital products. <strong className="text-inherit">Aqivo Store</strong> is a digital storefront platform that
                helps businesses move from physical selling to online selling without complexity.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700 dark:text-zinc-300">
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
                    <CheckCircle2 className="size-3.5 text-[#375a8a] shrink-0" />
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
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-300 dark:border-white/15 transition active:scale-95"
                >
                  <span>Launch Merchant Storefront</span>
                </Link>
              </div>

              <p className="mt-4 text-[11px] text-zinc-500">
                * Future ecosystem products (Aqivo Analytics, Aqivo AI, Aqivo Cloud, Aqivo Teams) are on our internal roadmap.
              </p>
            </div>

            {/* Visual Storefront Mockup Card */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black aspect-[16/11]">
              <img
                src="/img/retail-4.webp"
                alt="Aqivo Store Digital Platform"
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <span className="rounded-full bg-[#375a8a] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Live Merchant Product
                </span>
                <p className="text-base font-bold mt-1">Multi-Tenant Digital Commerce Engine</p>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Integrated with M-Pesa STK, Daraja webhooks, automated WhatsApp receipts, and catalog management.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 9 — FAQS
          ========================================================================= */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 md:px-8">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-md mx-auto">
            Direct answers about our architectural methodology, engagement structures, and engineering standards.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = openFaq === i
            return (
              <div
                key={i}
                className="theme-card overflow-hidden rounded-2xl transition shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="flex w-full items-center justify-between p-5 text-left transition hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base font-bold text-inherit pr-4">{faq.question}</span>
                  <div className="grid size-7 place-items-center rounded-full bg-slate-100 dark:bg-white/10 text-inherit shrink-0">
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
                      <div className="border-t border-slate-200 dark:border-white/10 p-5 pt-3 text-xs sm:text-sm theme-muted leading-relaxed font-normal bg-slate-50/70 dark:bg-black/30">
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
          SECTION 10 — BOTTOM RADIANT ORANGE CTA BANNER (Matching Image 1)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl sm:rounded-[40px] bg-[#0f172a] dark:bg-[#0a0f1d] border border-slate-700/40 p-8 sm:p-16 text-center text-white shadow-2xl">
          <div className="relative z-10 mx-auto max-w-3xl space-y-6">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Ready to Build a Stronger Digital Future?
            </h2>

            <p className="text-sm sm:text-base md:text-lg text-white/95 leading-relaxed font-normal max-w-2xl mx-auto">
              From startup ideas and MVPs to scalable software, data infrastructure, AI systems, and technical teams,
              Aqivo helps businesses build the technology foundations they need to grow.
            </p>

            <div className="pt-4 flex flex-col xs:flex-row items-center justify-center gap-3.5 sm:gap-4">
              <Link
                to="/contact"
                className="w-full xs:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-zinc-100 text-[#09090b] px-8 py-4 text-sm sm:text-base font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-95"
              >
                <span>Talk to Our Team</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/solutions"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black/25 backdrop-blur-md border border-white/30 px-8 py-4 text-sm sm:text-base font-bold text-white transition hover:bg-black/35 active:scale-95 w-full xs:w-auto"
              >
                <span>Explore Solutions</span>
              </Link>
            </div>

            <p className="text-xs text-white/80 pt-2 font-mono">
              Confidential discussions · Direct senior engineering review · Pragmatic solutions
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
