import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Code2,
  Compass,
  Database,
  Users,
  Cpu,
} from 'lucide-react'
import { CreativeRobot } from '@/components/ui/CreativeRobot'

export default function About() {
  return (
    <div className="space-y-24 sm:space-y-32 pb-24">
      {/* Full-Width Hero Section with Creative Image Composition */}
      <section className="theme-hero-section relative w-full pt-14 pb-20 sm:pt-20 sm:pb-28 overflow-hidden">
        <div className="tech-grid absolute inset-0 opacity-20 pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 rounded-full bg-[#375a8a]/10 border border-[#375a8a]/30 px-3.5 py-1 text-xs font-semibold text-[#375a8a] shadow-2xs"
              >
                <Sparkles className="size-3.5 text-[#375a8a]" />
                <span>Our Mission & Engineering Philosophy</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.12]"
              >
                Technology Should Help Businesses Move Forward.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2 }}
                className="text-base sm:text-lg theme-muted leading-relaxed font-normal"
              >
                Aqivo was established on a fundamental conviction: founders and business leaders should not have to navigate
                complex software architecture, data modeling, artificial intelligence, and engineering hiring alone.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.3 }}
                className="pt-2 flex flex-wrap gap-4"
              >
                <Link
                  to="/contact"
                  className="btn-brand inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm sm:text-base font-bold shadow-lg transition hover:scale-[1.02] active:scale-95"
                >
                  <span>Talk to Our Leadership</span>
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/services"
                  className="btn-dark inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm sm:text-base font-semibold transition"
                >
                  <span>Explore Capabilities</span>
                </Link>
              </motion.div>
            </div>

            {/* Creative Layered Image Collage + Cutout Robot Vanguard */}
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              {/* Primary Hero Photo */}
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#121215] shadow-2xl aspect-[4/3] group">
                <img
                  src="/img/professional-1.webp"
                  alt="Aqivo engineering and strategy team collaborating"
                  loading="eager"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/60" />
                
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#375a8a] backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white mb-1.5">
                    <Cpu className="size-3" />
                    <span>Senior Engineering Practice</span>
                  </span>
                  <p className="text-sm sm:text-base font-bold leading-snug">
                    Bridging Business Strategy with Technical Execution
                  </p>
                </div>
              </div>

              {/* Overlapping Floating Inset Card */}
              <div className="theme-card absolute -bottom-6 -left-4 sm:-bottom-8 sm:-left-8 max-w-[240px] sm:max-w-[280px] rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <img
                    src="/img/professional-3-sm.webp"
                    alt="Production software development"
                    loading="lazy"
                    className="size-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-white/10"
                  />
                  <div>
                    <p className="text-xs font-bold text-inherit leading-tight">Production Standards</p>
                    <p className="text-[11px] theme-muted mt-0.5 font-mono">Clean Code · Full IP Handover</p>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold mt-1">
                      <CheckCircle2 className="size-3" />
                      <span>Zero Vendor Lock-In</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Top-Right Metric Pill */}
              <div className="theme-card absolute -top-4 -right-2 sm:-top-5 sm:-right-4 rounded-full px-4 py-2 text-xs font-bold shadow-xl flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Strategic Partner</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Hybrid Model: Beyond Traditional Agencies */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="theme-card rounded-3xl p-8 sm:p-14 shadow-2xl">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] items-center">
            <div className="space-y-5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#375a8a]">
                The Aqivo Identity
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight text-slate-900 dark:text-white">
                Not a Traditional Website Agency. A Strategic Technology Partner.
              </h2>
              <p className="text-sm sm:text-base theme-muted leading-relaxed font-normal">
                Traditional software agencies typically operate as order-takers: they write code to an unvetted specification,
                deliver a fragile project, and disappear when maintenance becomes difficult.
              </p>
              <p className="text-sm sm:text-base theme-muted leading-relaxed font-normal">
                Aqivo combines the strategic foresight of a technology consultancy, the rigor of a senior software
                engineering studio, the discipline of a data architecture team, and the hands-on executive guidance of a
                fractional CTO.
              </p>

              <div className="pt-2">
                <p className="text-xs font-mono font-bold uppercase tracking-wider theme-muted mb-3">
                  Aqivo Represents the Synthesis Of:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm font-medium">
                  {[
                    'Technology Consultancy',
                    'Software Engineering Studio',
                    'Data Engineering Partner',
                    'AI Implementation Team',
                    'Startup Technology Advisor',
                    'Fractional CTO Leadership',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-[#375a8a] shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Creative Robot Vanguard + Architecture Pillars */}
            <div className="flex flex-col items-center space-y-6">
              <CreativeRobot
                variant="pedestal"
                size="md"
                badgeText="Autonomous Engineering Vanguard"
                mascot="1"
                showOrbits={true}
              />
              <div className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-5 space-y-2.5">
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider theme-muted mb-2">
                  Multidisciplinary Foundation
                </p>
                {[
                  { title: 'Business Acumen', desc: 'Understanding unit economics, market viability, and sales workflows.' },
                  { title: 'Software Engineering', desc: 'Maintainable, clean codebases with automated tests and CI/CD.' },
                  { title: 'Data Architecture', desc: 'Structured databases, clear schemas, and single sources of truth.' },
                ].map((p, i) => (
                  <div key={i} className="theme-card rounded-xl p-3 shadow-2xs">
                    <p className="text-xs font-bold text-inherit">{p.title}</p>
                    <p className="text-[11px] theme-muted font-normal">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid: How Aqivo Delivers */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-3xl mb-12">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#375a8a]">
            Integrated Disciplines
          </span>
          <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-inherit">
            How We Solve Complex Technology Challenges
          </h2>
          <p className="mt-3 text-sm sm:text-base theme-muted font-normal">
            Each project is led by senior practitioners with specialized domain experience across strategy, code, data, and teams.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Strategic Architecture',
              desc: 'Vetting technical feasibility, mapping system boundaries, and eliminating technical debt before coding.',
              img: '/img/professional-5.webp',
              icon: Compass,
              tag: 'Roadmap & Stack',
            },
            {
              title: 'Software Engineering',
              desc: 'Designing production-grade web applications, multi-tenant SaaS platforms, and high-integrity APIs.',
              img: '/img/professional-3.webp',
              icon: Code2,
              tag: 'Full-Stack & Cloud',
            },
            {
              title: 'Data Intelligence',
              desc: 'Architecting synchronized databases, automated ETL pipelines, and executive KPI reporting.',
              img: '/img/professional-4.webp',
              icon: Database,
              tag: 'Databases & BI',
            },
            {
              title: 'Team Mentorship',
              desc: 'Evaluating developer candidates, setting engineering benchmarks, and providing fractional CTO advisory.',
              img: '/img/professional-2.webp',
              icon: Users,
              tag: 'Leadership & Hiring',
            },
          ].map((item, idx) => {
            const Icon = item.icon
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.1 }}
                className="theme-card group relative overflow-hidden rounded-3xl shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                {/* Photo Header */}
                <div className="relative aspect-[16/10] overflow-hidden bg-black">
                  <img
                    src={item.img}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/60" />
                  <div className="absolute top-3 left-3">
                    <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#375a8a] border border-white/10">
                      {item.tag}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 text-white flex items-center gap-2">
                    <div className="grid size-7 place-items-center rounded-lg bg-[#375a8a] backdrop-blur-xs text-white">
                      <Icon className="size-4" />
                    </div>
                    <span className="text-sm font-bold">{item.title}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <p className="text-xs sm:text-sm theme-muted leading-relaxed font-normal">{item.desc}</p>
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10">
                    <Link
                      to="/services"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#375a8a] hover:underline transition"
                    >
                      <span>Explore discipline</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Core Engineering Principles */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-3xl mb-12">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#375a8a]">
            Operating Discipline
          </span>
          <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Our Core Operating Principles
          </h2>
          <p className="mt-3 text-sm sm:text-base theme-muted font-normal">
            Every technical decision we make is governed by uncompromising engineering principles.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Pragmatic Over Hype',
              desc: "We choose battle-tested, maintainable technologies over transient framework trends. Your tech stack should serve your business, not an engineer's resume.",
            },
            {
              title: 'Architected for Scale',
              desc: 'We design schemas, APIs, and cloud services to handle growth gracefully from day one, avoiding devastating rewrites when user volume increases.',
            },
            {
              title: 'Zero Vendor Lock-In',
              desc: 'You maintain 100% ownership of your source code, infrastructure, credentials, and documentation. No proprietary shackles or hostage codebases.',
            },
            {
              title: 'Complete Knowledge Transfer',
              desc: "We don't make ourselves indispensable through obfuscation. We train your internal team, author comprehensive architecture docs, and facilitate smooth handovers.",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="theme-card rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-[#375a8a]/50 transition"
            >
              <div>
                <span className="text-2xl font-black text-[#375a8a] font-mono">0{idx + 1}</span>
                <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-2 text-xs sm:text-sm theme-muted leading-relaxed font-normal">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The Long-Term Vision */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl border border-slate-700/40 bg-[#0f172a] dark:bg-[#0a0f1d] p-8 sm:p-14 text-white text-center shadow-2xl relative overflow-hidden">
          <div className="mx-auto max-w-3xl space-y-5">
            <span className="rounded-full bg-black/25 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-white border border-white/20">
              The Journey Ahead
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight text-white">
              From First Line of Code to Autonomous Scale
            </h2>
            <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal">
              Whether you are an ambitious solo founder turning an idea into your first functional MVP or an established
              company upgrading complex data pipelines, Aqivo provides the technical backbone for sustainable long-term growth.
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <Link
                to="/contact"
                className="rounded-full bg-white text-[#09090b] px-8 py-3.5 text-sm sm:text-base font-bold shadow-xl transition hover:bg-zinc-100 hover:scale-105 active:scale-95"
              >
                <span>Talk to Our Leadership</span>
                <ArrowRight className="size-4 ml-1 inline" />
              </Link>
              <Link
                to="/solutions"
                className="rounded-full bg-black/30 backdrop-blur-md px-8 py-3.5 text-sm sm:text-base font-bold text-white border border-white/25 hover:bg-black/40 transition"
              >
                <span>Explore Solutions Matrix</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
