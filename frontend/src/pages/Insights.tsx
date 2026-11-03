import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  ArrowRight,
  Code2,
  Database,
  Bot,
  Cloud,
  Users,
  Compass,
  Clock,
  ChevronDown,
} from 'lucide-react'
import { CreativeRobot } from '@/components/ui/CreativeRobot'
import { cn } from '@/lib/cn'

const INSIGHTS = [
  {
    slug: 'mvp-vs-off-the-shelf',
    title: 'When to Build a Custom MVP vs. Using Off-the-Shelf Tools',
    category: 'Product Strategy',
    readTime: '6 min read',
    icon: Compass,
    excerpt:
      'Founders often waste precious months writing custom code for problems that existing SaaS tools solve for $30/month—or conversely, hack together fragile no-code setups that crumble the moment traction arrives. Here is our framework for deciding what to build custom.',
    summary:
      'Only build custom software when the workflow or product represents your core proprietary advantage or unit-economic moat. For auxiliary features like authentication or email dispatch, leverage established providers and focus custom engineering on your core differentiator.',
  },
  {
    slug: 'non-technical-founders-tech-stack',
    title: "The Non-Technical Founder's Guide to Choosing a Tech Stack",
    category: 'Architecture',
    readTime: '8 min read',
    icon: Code2,
    excerpt:
      'Hype-driven development is a silent startup killer. Choosing an esoteric language because an engineer wants it on their resume creates crippling hiring bottlenecks later. Learn how to choose boring, battle-tested technologies that allow maximum speed and reliability.',
    summary:
      'Prioritize stacks with large talent pools, mature documentation, and fast iteration speeds: React/TypeScript on the frontend, Python/FastAPI or Node/TypeScript on the backend, and PostgreSQL for relational persistence. Boring technology compounds faster.',
  },
  {
    slug: 'practical-ai-in-production',
    title: 'Practical AI in 2026: Moving Past Chatbot Wrappers to True Workflow Automation',
    category: 'Applied AI',
    readTime: '7 min read',
    icon: Bot,
    excerpt:
      'Deploying an ungrounded LLM chatbot wrapper is easy. Building a reliable AI pipeline that extracts structured entities from messy customer invoices with 99.5% accuracy is engineering. Here is how growing businesses extract real value from AI.',
    summary:
      'Focus AI on bounded tasks: document intelligence, automated customer inquiry triage, semantic vector search across private manuals, and asynchronous background enrichment. Always include human-in-the-loop audit paths for high-stakes decisions.',
  },
  {
    slug: 'database-design-on-day-one',
    title: 'Data Architecture Before You Scale: Why Schema Design Matters on Day One',
    category: 'Data Engineering',
    readTime: '9 min read',
    icon: Database,
    excerpt:
      'Fixing a broken database schema when you have 100,000 paying users and millions of financial records is terrifying. Here are the core relational database principles every founding team must establish before writing feature code.',
    summary:
      'Use relational integrity constraints, foreign keys, timestamps with timezone, immutable event audit tables for transactions, and proper compound indexing. A well-modeled PostgreSQL database will comfortably serve millions of requests without complex infrastructure.',
  },
  {
    slug: 'assessing-technical-talent',
    title: 'How to Assess Senior Technical Talent When You Are Not an Engineer',
    category: 'Team Building',
    readTime: '7 min read',
    icon: Users,
    excerpt:
      'Resumes filled with acronyms can easily deceive non-technical founders. Here is how to evaluate whether a senior developer actually understands system architecture, business trade-offs, and operational reliability.',
    summary:
      'Test for clarity of thought over trivia memorization: ask candidates to walk through past architectural mistakes, how they handle database migrations under live traffic, and how they simplify complex user requirements into clean code.',
  },
  {
    slug: 'cloud-infrastructure-scaling',
    title: 'Moving from a Single-Server MVP to High-Availability Cloud Infrastructure',
    category: 'Cloud & DevOps',
    readTime: '8 min read',
    icon: Cloud,
    excerpt:
      'Your MVP is gaining traction and suddenly a social media spike crashes your single virtual machine. Here is the step-by-step roadmap to transition your application to multi-container high availability without bankrupting your startup.',
    summary:
      'Decouple state: move file uploads to object storage, extract database instances to managed high-availability clusters, add Redis connection pooling, and place Cloudflare edge caching in front of your domain before rewriting any backend code.',
  },
]

export default function Insights() {
  const [selectedPost, setSelectedPost] = useState<string | null>(null)

  return (
    <div className="space-y-24 sm:space-y-32 pb-24">
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
                <span>Engineering & Strategy Perspectives</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight"
              >
                Strategic Insights for Technical Founders & Executives
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2 }}
                className="mt-5 text-base sm:text-lg theme-muted leading-relaxed font-normal"
              >
                Clear, pragmatic frameworks on software engineering, database design, applied artificial intelligence, and
                building durable technology foundations. No marketing fluff.
              </motion.p>
            </div>

            <div className="flex justify-center">
              <CreativeRobot
                variant="floating"
                size="md"
                badgeText="Pragmatic Architectural Thinking"
                showOrbits={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {INSIGHTS.map((post, idx) => {
            const Icon = post.icon
            const isOpen = selectedPost === post.slug

            return (
              <motion.article
                key={post.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: (idx % 3) * 0.1 }}
                className="theme-card flex flex-col justify-between rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs theme-muted mb-4 font-mono">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#375a8a]/10 px-2.5 py-0.5 font-bold text-[#375a8a] border border-[#375a8a]/30">
                      <Icon className="size-3.5" />
                      <span>{post.category}</span>
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="size-3.5" />
                      <span>{post.readTime}</span>
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug transition-colors">
                    {post.title}
                  </h2>
                  <p className="mt-3 text-xs sm:text-sm theme-muted leading-relaxed font-normal">{post.excerpt}</p>

                  {/* Expandable Core Framework */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 rounded-xl border border-[#375a8a]/30 bg-[#375a8a]/10 p-4 text-xs space-y-2">
                          <p className="font-bold text-[#375a8a] uppercase tracking-wider text-[11px] font-mono">
                            The Aqivo Principle
                          </p>
                          <p className="leading-relaxed font-normal">{post.summary}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSelectedPost(isOpen ? null : post.slug)}
                    className="text-xs font-bold text-[#375a8a] hover:underline inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>{isOpen ? 'Collapse takeaway' : 'Read key takeaway'}</span>
                    <ChevronDown className={cn('size-3.5 transition-transform duration-200', isOpen && 'rotate-180')} />
                  </button>

                  <Link
                    to={`/contact?topic=${encodeURIComponent(post.title)}`}
                    className="text-xs theme-muted hover:text-[#375a8a] font-mono transition"
                  >
                    Discuss topic →
                  </Link>
                </div>
              </motion.article>
            )
          })}
        </div>
      </section>

      {/* Advisory Newsletter / Call Box */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="rounded-3xl border border-slate-700/40 bg-[#0f172a] dark:bg-[#0a0f1d] p-8 sm:p-14 text-center text-white shadow-2xl relative overflow-hidden">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">Have a Specific Architecture Challenge?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-white/95 font-normal">
            Our senior engineering partners review software design, database schemas, and AI roadmaps directly with
            founders.
          </p>
          <div className="mt-8">
            <Link
              to="/contact"
              className="rounded-full bg-white text-[#09090b] px-8 py-3.5 text-sm sm:text-base font-bold shadow-xl transition hover:bg-zinc-100 hover:scale-105 active:scale-95 inline-flex items-center gap-2"
            >
              <span>Schedule Architecture Review</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
