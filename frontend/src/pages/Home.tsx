import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Sliders,
  Layers,
  CheckCircle2,
  Terminal,
  Boxes,
} from 'lucide-react'
import { cn } from '@/lib/cn'

export default function Home() {
  // Use cases carousel index
  const [carouselIdx, setCarouselIdx] = useState(0)

  // FAQ Tab Filter and Accordion State
  const [faqCategory, setFaqCategory] = useState<'all' | 'architecture' | 'network' | 'developer'>('all')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  // Terminal active tab state
  const [terminalTab, setTerminalTab] = useState<'protocol' | 'architecture' | 'metrics'>('protocol')

  const USE_CASES = [
    {
      id: 'public-systems',
      title: 'Public Systems',
      desc: 'Transparent registry state, sovereign digital credentials, and verifiably immutable audit trails for civic and public institutions.',
      img: '/img/aerion/use-case-1.webp',
      badge: 'Public Infrastructure',
    },
    {
      id: 'energy',
      title: 'Energy & Grid',
      desc: 'Decentralized automated micro-grid settlements, renewable carbon credit accounting, and sub-second IoT telemetry verification.',
      img: '/img/aerion/use-case-2.webp',
      badge: 'Distributed Grid',
    },
    {
      id: 'infrastructure',
      title: 'Infrastructure',
      desc: 'Decoupled settlement layers, cross-chain messaging primitives, and zero-knowledge privacy channels for mission-critical logistics.',
      img: '/img/aerion/use-case-3.webp',
      badge: 'Zero-Knowledge',
    },
    {
      id: 'data-ai',
      title: 'Data & Intelligence',
      desc: 'Verifiable AI inference proofs, decentralized training provenance, and secure high-volume transactional data pipelines.',
      img: '/img/aerion/use-case-4.webp',
      badge: 'Verifiable AI',
    },
  ]

  const FAQS = [
    {
      id: 0,
      category: 'architecture',
      question: 'What is AERION?',
      answer:
        'AERION is a high-performance decentralized Layer-1 and modular infrastructure platform. Engineered with mathematical formal verification, AERION delivers sub-second deterministic finality, modular state execution, and institutional cryptographic security for modern technology ventures.',
    },
    {
      id: 1,
      category: 'network',
      question: 'How does AERION scale real-world throughput?',
      answer:
        'AERION decouples consensus ordering from execution state channels. By parallelizing transaction verification across pipelined DAG validators, the network sustains over 65,000 TPS without sacrificing decentralization or elevating hardware node requirements.',
    },
    {
      id: 2,
      category: 'developer',
      question: 'Is AERION EVM-compatible or WASM native?',
      answer:
        'AERION offers a dual runtime environment: complete bytecode compatibility for Solidity and EVM developer tooling, alongside an ultra-fast WebAssembly (WASM) execution engine for Rust, TypeScript, and Go smart contracts.',
    },
    {
      id: 3,
      category: 'developer',
      question: 'How do I build and deploy applications on AERION?',
      answer:
        'Developers can spin up nodes via the AERION CLI, test against local sandbox testnets, and deploy using standard toolchains (Hardhat, Foundry, or the native Aerion SDK) with comprehensive automated test harnesses.',
    },
    {
      id: 4,
      category: 'architecture',
      question: 'What makes AERION different from traditional networks?',
      answer:
        'Unlike fragile monolithic chains or hyped agency platforms, AERION prioritizes long-term architectural durability: zero vendor lock-in, mathematically verified state transitions, and predictable low gas fees anchored by sustainable tokenomics.',
    },
  ]

  const filteredFaqs = faqCategory === 'all' ? FAQS : FAQS.filter((f) => f.category === faqCategory)

  return (
    <div className="space-y-24 sm:space-y-36 pb-0 overflow-x-hidden selection:bg-slate-900 selection:text-white">
      {/* =========================================================================
          SECTION 1 — HERO SECTION (Cinematic Landscape Card with Floating Header)
          ========================================================================= */}
      <section className="relative px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] sm:rounded-[40px] border border-slate-200/90 shadow-[0_30px_90px_rgba(15,23,42,0.14)] min-h-[580px] sm:min-h-[660px] md:min-h-[720px] flex flex-col justify-between p-6 sm:p-10 md:p-14 text-white">
          {/* Cinematic Landscape Background Image */}
          <div className="absolute inset-0 select-none pointer-events-none">
            <img
              src="/img/aerion/hero-cinematic.webp"
              alt="Where Growth Feels Natural for the Long Term"
              className="size-full object-cover object-center scale-105 transition-transform duration-1000"
            />
            {/* Soft Ambient Cinematic Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-slate-950/30" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-transparent" />
          </div>

          {/* Top Floating Transparent Navigation Inside Card */}
          <header className="relative z-20 flex items-center justify-between border-b border-white/20 pb-5">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="grid size-9 place-items-center rounded-xl bg-white/15 backdrop-blur-md border border-white/30 text-white transition group-hover:scale-105">
                <Boxes className="size-5" />
              </div>
              <span className="font-extrabold tracking-[0.25em] text-sm uppercase text-white drop-shadow-sm">
                AERION
              </span>
            </Link>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-white/90">
              <Link to="/solutions" className="transition hover:text-white">
                Solutions
              </Link>
              <Link to="/services" className="transition hover:text-white">
                Network
              </Link>
              <Link to="/about" className="transition hover:text-white">
                About
              </Link>
              <Link to="/products" className="transition hover:text-white">
                Products
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="hidden sm:inline-block text-xs font-semibold text-white/90 hover:text-white px-3 py-1.5 transition"
              >
                Sign In
              </Link>
              <Link
                to="/contact"
                className="rounded-full bg-slate-950/90 text-white hover:bg-black px-5 py-2 text-xs font-bold tracking-wide uppercase shadow-lg border border-white/20 transition hover:scale-[1.02] active:scale-95"
              >
                Get Started
              </Link>
            </div>
          </header>

          {/* Center Hero Content */}
          <div className="relative z-10 mx-auto my-auto max-w-3xl text-center pt-10 sm:pt-14 pb-8">
            {/* Top Tag Pill */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-[11px] font-semibold text-white border border-white/30 shadow-xs mb-6">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="tracking-wider uppercase">INTRODUCING THE AERION NETWORK</span>
            </div>

            {/* Hero Headline in Editorial Serif */}
            <h1 className="font-editorial text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-normal tracking-tight text-white drop-shadow-md leading-[1.08]">
              Where Growth Feels Natural for the Long Term
            </h1>

            {/* Subtext in Clean Sans */}
            <p className="mx-auto mt-6 max-w-xl text-sm sm:text-base md:text-lg text-white/90 leading-relaxed font-normal drop-shadow-xs">
              Aqivo is building the technology behind growing businesses. We design modular systems that prioritize
              clarity, scalability, and long-term trust.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                to="/contact"
                className="rounded-full bg-slate-950 text-white hover:bg-black px-7 py-3 text-xs sm:text-sm font-bold tracking-wide uppercase shadow-xl border border-white/20 transition hover:scale-[1.02] active:scale-95"
              >
                Get Started
              </Link>
              <Link
                to="/solutions"
                className="rounded-full bg-white/85 hover:bg-white text-slate-950 px-7 py-3 text-xs sm:text-sm font-bold tracking-wide uppercase backdrop-blur-md shadow-md border border-white/80 transition hover:scale-[1.02] active:scale-95"
              >
                View Platform
              </Link>
            </div>
          </div>

          {/* Bottom subtle ambient spacer */}
          <div className="relative z-10 flex items-center justify-between text-[11px] text-white/60 pt-4">
            <span>Decentralized Modular State</span>
            <span>Sub-Second Deterministic Finality</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2 — THE PHILOSOPHY (Statement with Inline Image Pills)
          ========================================================================= */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 text-center">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-3.5 py-1 text-[11px] font-bold tracking-widest uppercase mb-8 shadow-xs">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          <span>OUR PHILOSOPHY</span>
        </div>

        {/* Big Editorial Headline with Inline Image Pills */}
        <h2 className="font-editorial text-2xl sm:text-4xl md:text-5xl lg:text-[52px] text-slate-900 leading-[1.35] max-w-4xl mx-auto font-normal">
          AERION is building the quiet infrastructure{' '}
          <span className="inline-flex align-middle mx-1.5 w-16 sm:w-20 h-7 sm:h-9 rounded-full overflow-hidden border border-slate-300 shadow-sm relative -translate-y-0.5">
            <img src="/img/aerion/pill-1.webp" alt="Infrastructure" className="size-full object-cover" />
          </span>{' '}
          behind the next era of Web3. We design modular systems that prioritize clarity, flexibility, and long-term
          trust across{' '}
          <span className="inline-flex align-middle mx-1.5 w-16 sm:w-20 h-7 sm:h-9 rounded-full overflow-hidden border border-slate-300 shadow-sm relative -translate-y-0.5">
            <img src="/img/aerion/pill-2.webp" alt="Decentralized Networks" className="size-full object-cover" />
          </span>{' '}
          decentralized networks.
        </h2>

        <p className="mt-6 text-xs sm:text-sm text-slate-500 tracking-wider uppercase font-medium">
          Built for scalable architectures and long-term stability.
        </p>
      </section>

      {/* =========================================================================
          SECTION 3 — AERION NETWORK SHOWCASE (Split Column with Terminal)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          {/* Left Column: Description & Features */}
          <div className="space-y-6">
            <h3 className="font-editorial text-3xl sm:text-5xl font-normal text-slate-900 leading-tight">
              AERION Network
            </h3>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              A modern foundation for building, executing, and scaling smart contracts and distributed systems with
              uncompromising security and developer velocity.
            </p>

            <div className="pt-2">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 text-white hover:bg-black px-6 py-3 text-xs font-bold tracking-wider uppercase shadow-md transition hover:scale-[1.02]"
              >
                <span>Learn More</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {/* 4 Feature Checklist Items */}
            <div className="pt-6 space-y-4 border-t border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Build on-chain</span>
                </div>
                <p className="pl-6 text-xs text-slate-500">
                  Comprehensive developer toolchains, native compilers, and debugger suites.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Correct by construct</span>
                </div>
                <p className="pl-6 text-xs text-slate-500">
                  Mathematical state verification preventing re-entrancy and unexpected edge execution.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Scale with confidence</span>
                </div>
                <p className="pl-6 text-xs text-slate-500">
                  Parallel execution channels sustaining 65,000+ deterministic transactions per second.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Secure by design</span>
                </div>
                <p className="pl-6 text-xs text-slate-500">
                  Hardware-segregated cryptographic validator keys and distributed multi-signature governance.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Landscape Card with Floating Dark Glassmorphic Terminal Modal */}
          <div className="relative aspect-[16/11] w-full overflow-hidden rounded-3xl border border-slate-200 shadow-2xl bg-slate-950 flex items-center justify-center p-4 sm:p-8">
            {/* Background Landscape Image */}
            <img
              src="/img/aerion/hero-cinematic.webp"
              alt="Network Landscape"
              className="absolute inset-0 size-full object-cover object-center filter saturate-125"
            />
            <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]" />

            {/* Floating Glassmorphic Terminal Window */}
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-white/20 p-5 shadow-2xl text-white">
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="size-4 text-purple-400" />
                  <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                    Launch Web3 Resources
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live 99.99%</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-3 flex items-center gap-2 border-b border-white/10 pb-2 text-[11px] font-semibold text-slate-400">
                <button
                  type="button"
                  onClick={() => setTerminalTab('protocol')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition',
                    terminalTab === 'protocol' ? 'bg-white/15 text-white' : 'hover:text-white'
                  )}
                >
                  Protocol
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalTab('architecture')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition',
                    terminalTab === 'architecture' ? 'bg-white/15 text-white' : 'hover:text-white'
                  )}
                >
                  Architecture
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalTab('metrics')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition',
                    terminalTab === 'metrics' ? 'bg-white/15 text-white' : 'hover:text-white'
                  )}
                >
                  Metrics
                </button>
              </div>

              {/* Terminal Body */}
              <div className="mt-4 space-y-3 font-mono text-xs">
                <div className="rounded-xl bg-black/40 border border-white/10 p-3 space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Target Throughput</span>
                    <span className="text-purple-300 font-bold">65,000 TPS</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full w-[88%]" />
                  </div>

                  <div className="flex justify-between text-slate-400 pt-1">
                    <span>Block Finality</span>
                    <span className="text-emerald-300 font-bold">400ms</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Active Validators</span>
                    <span className="text-white font-bold">1,280 Nodes</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-white/10 hover:bg-white/20 py-2 text-center text-xs font-semibold text-white transition border border-white/15"
                  >
                    Inspect Spec
                  </button>
                  <Link
                    to="/contact"
                    className="flex-1 rounded-lg bg-white hover:bg-slate-100 py-2 text-center text-xs font-bold text-slate-900 transition shadow-sm"
                  >
                    Deploy Node
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4 — ARCHITECTURE & SCALE (Built to scale real-world complexity)
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="border-t border-slate-200/80 pt-12">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-3.5 py-1 text-[11px] font-bold tracking-widest uppercase mb-8 shadow-xs">
            <span className="size-1.5 rounded-full bg-purple-400" />
            <span>ARCHITECTURE & SCALE</span>
          </div>

          <div className="grid gap-10 lg:grid-cols-3 items-start">
            {/* Left Headline */}
            <div>
              <h2 className="font-editorial text-3xl sm:text-5xl font-normal text-slate-900 leading-tight">
                Built to scale real-world complexity
              </h2>
            </div>

            {/* Right Pillars (2 columns) */}
            <div className="space-y-3">
              <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-900 border border-slate-200">
                <Layers className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Modular by design</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                Decoupled execution environments, custom data schemas, and isolated state channels that grow with your
                business without architectural dead-ends.
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-900 border border-slate-200">
                <Sliders className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Programmable governance</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                Automated on-chain parameter tuning, verifiable cryptographic proofs, and multi-signature authorization
                ensuring predictable operational control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5 — REAL-WORLD USE CASES CAROUSEL
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Header with Slider Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <h2 className="font-editorial text-3xl sm:text-4xl font-normal text-slate-900">
            Built for Real-World Use Cases
          </h2>

          <div className="flex items-center gap-3">
            {/* Progress line */}
            <div className="w-24 sm:w-32 h-0.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="bg-slate-900 h-full transition-all duration-300"
                style={{ width: `${((carouselIdx + 1) / USE_CASES.length) * 100}%` }}
              />
            </div>
            {/* Arrows */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCarouselIdx((prev) => (prev > 0 ? prev - 1 : USE_CASES.length - 1))}
                className="grid size-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                aria-label="Previous card"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setCarouselIdx((prev) => (prev < USE_CASES.length - 1 ? prev + 1 : 0))}
                className="grid size-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                aria-label="Next card"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Portrait Cards Grid */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map((uc) => (
            <div
              key={uc.id}
              className="group relative aspect-[4/5] overflow-hidden rounded-3xl border border-slate-200/90 bg-slate-950 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <img
                src={uc.img}
                alt={uc.title}
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />

              <div className="absolute top-4 left-4">
                <span className="rounded-full bg-white/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-slate-900 shadow-xs">
                  {uc.badge}
                </span>
              </div>

              <div className="absolute bottom-5 left-5 right-5 text-white">
                <h3 className="font-editorial text-2xl font-normal drop-shadow-xs">{uc.title}</h3>
                <p className="mt-1 text-xs text-white/80 line-clamp-2 leading-relaxed font-normal">{uc.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 6 — FAQ ACCORDION (Everything you need to know)
          ========================================================================= */}
      <section className="mx-auto max-w-4xl px-5 sm:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-editorial text-3xl sm:text-5xl font-normal text-slate-900 leading-tight">
            Everything you need to know
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-600 font-normal">
            Clear answers about our network architecture, consensus layer, and developer tooling.
          </p>

          {/* Filter Pills */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'architecture', label: 'Architecture' },
              { id: 'network', label: 'Network' },
              { id: 'developer', label: 'Developer' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFaqCategory(tab.id as any)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-semibold transition',
                  faqCategory === tab.id
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stacked Accordion Items */}
        <div className="mt-10 space-y-3">
          {filteredFaqs.map((faq) => {
            const isOpen = openFaq === faq.id
            return (
              <div
                key={faq.id}
                className={cn(
                  'overflow-hidden rounded-2xl border transition-all duration-200 bg-white',
                  isOpen ? 'border-slate-300 shadow-sm' : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                  className="flex w-full items-center justify-between p-5 text-left transition"
                >
                  <span className="text-sm sm:text-base font-bold text-slate-900">{faq.question}</span>
                  <div
                    className={cn(
                      'grid size-7 place-items-center rounded-full transition-colors',
                      isOpen ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    {isOpen ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-100 p-5 pt-3 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
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
          SECTION 7 — PRE-FOOTER CINEMATIC BANNER
          ========================================================================= */}
      <section className="relative px-3 sm:px-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] sm:rounded-[40px] border border-slate-200/90 shadow-[0_24px_70px_rgba(15,23,42,0.14)] min-h-[420px] sm:min-h-[480px] flex items-center justify-center p-8 sm:p-14 text-center text-white">
          {/* Panoramic Mountain Cloud Background */}
          <div className="absolute inset-0 select-none pointer-events-none">
            <img
              src="/img/aerion/mountains-fog.webp"
              alt="Where Decentralization Becomes Intuitive"
              className="size-full object-cover object-center scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-slate-950/40" />
          </div>

          {/* Banner Content */}
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="font-editorial text-3xl sm:text-5xl md:text-6xl font-normal tracking-tight text-white drop-shadow-md leading-tight">
              Where Decentralization Becomes Intuitive
            </h2>

            <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal drop-shadow-xs max-w-lg mx-auto">
              Partner with senior engineers and architects who care about your business for the long term.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                to="/contact"
                className="rounded-full bg-slate-950 text-white hover:bg-black px-7 py-3 text-xs sm:text-sm font-bold tracking-wide uppercase shadow-xl border border-white/20 transition hover:scale-[1.02] active:scale-95"
              >
                Start Building
              </Link>
              <Link
                to="/services"
                className="rounded-full bg-white/85 hover:bg-white text-slate-950 px-7 py-3 text-xs sm:text-sm font-bold tracking-wide uppercase backdrop-blur-md shadow-md border border-white/80 transition hover:scale-[1.02] active:scale-95"
              >
                Explore Docs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 8 — MONUMENTAL DARK FOOTER WITH GIANT WATERMARK TYPOGRAPHY
          ========================================================================= */}
      <footer className="relative bg-[#070A0F] text-white pt-20 pb-10 px-5 sm:px-10 overflow-hidden border-t border-white/10">
        <div className="mx-auto max-w-7xl relative z-10">
          {/* Top Row: Newsletter + Link Columns */}
          <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            {/* Brand + Newsletter */}
            <div className="space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-white/10 border border-white/20 text-white">
                  <Boxes className="size-4.5" />
                </div>
                <span className="font-extrabold tracking-[0.25em] text-sm uppercase text-white">
                  AERION
                </span>
              </div>

              <p className="max-w-sm text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                Decentralized modular architecture engineered for institutional reliability, micro-second consensus,
                and developer velocity.
              </p>

              {/* Email Subscription Box */}
              <div className="pt-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    alert('Thank you for subscribing to AERION updates.')
                  }}
                  className="flex items-center max-w-sm rounded-full bg-white/5 border border-white/15 p-1.5 focus-within:border-white/40 transition"
                >
                  <input
                    type="email"
                    placeholder="Enter your work email"
                    required
                    className="w-full bg-transparent px-3.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-950 hover:bg-slate-200 transition shrink-0 uppercase tracking-wider"
                  >
                    Subscribe
                  </button>
                </form>
              </div>
            </div>

            {/* Column 1: Solutions */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Solutions</h4>
              <ul className="mt-4 space-y-2.5 text-xs text-slate-400">
                <li>
                  <Link to="/solutions" className="hover:text-white transition">
                    Public Systems
                  </Link>
                </li>
                <li>
                  <Link to="/solutions" className="hover:text-white transition">
                    Enterprise Chains
                  </Link>
                </li>
                <li>
                  <Link to="/solutions" className="hover:text-white transition">
                    Energy & Micro-grids
                  </Link>
                </li>
                <li>
                  <Link to="/solutions" className="hover:text-white transition">
                    Data & AI Pipelines
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: Platform */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Platform</h4>
              <ul className="mt-4 space-y-2.5 text-xs text-slate-400">
                <li>
                  <Link to="/services" className="hover:text-white transition">
                    Protocol Spec
                  </Link>
                </li>
                <li>
                  <Link to="/services" className="hover:text-white transition">
                    Consensus Layer
                  </Link>
                </li>
                <li>
                  <Link to="/services" className="hover:text-white transition">
                    Validator Nodes
                  </Link>
                </li>
                <li>
                  <Link to="/services" className="hover:text-white transition">
                    Zero-Knowledge VM
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Resources */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Resources</h4>
              <ul className="mt-4 space-y-2.5 text-xs text-slate-400">
                <li>
                  <Link to="/insights" className="hover:text-white transition">
                    Whitepaper
                  </Link>
                </li>
                <li>
                  <Link to="/insights" className="hover:text-white transition">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link to="/ethical-architecture" className="hover:text-white transition">
                    Ethical Architecture
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white transition">
                    Contact Team
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* GIGANTIC WATERMARK TYPOGRAPHY: AERION */}
          <div className="pt-16 sm:pt-24 pb-8 select-none pointer-events-none text-center">
            <p className="font-editorial text-[18vw] font-black tracking-[0.12em] text-white/[0.04] leading-none uppercase">
              AERION
            </p>
          </div>

          {/* Bottom Copyright Bar */}
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 AERION Network. All rights reserved.</p>

            <div className="flex items-center gap-6">
              <Link to="/confidentiality-security" className="hover:text-slate-300 transition">
                Privacy Policy
              </Link>
              <Link to="/ethical-architecture" className="hover:text-slate-300 transition">
                Terms of Service
              </Link>
              <Link to="/contact" className="hover:text-slate-300 transition">
                Security
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
