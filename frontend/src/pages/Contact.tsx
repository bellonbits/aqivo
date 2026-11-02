import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Building2,
  Mail,
  Code2,
  Database,
  Bot,
  Cloud,
  Users,
  Compass,
} from 'lucide-react'
import { cn } from '@/lib/cn'

const CATEGORIES = [
  { id: 'software', label: 'Software & Product Engineering', icon: Code2 },
  { id: 'strategy', label: 'Technology & Startup Strategy', icon: Compass },
  { id: 'data', label: 'Data Architecture & Intelligence', icon: Database },
  { id: 'ai', label: 'AI & Workflow Automation', icon: Bot },
  { id: 'infrastructure', label: 'Cloud Infrastructure & DevOps', icon: Cloud },
  { id: 'teams', label: 'Technical Team Building & CTO', icon: Users },
]

const STAGES = [
  'Idea / Pre-Product',
  'MVP in Development',
  'Launched & Seeking Early Traction',
  'Growing / Scaling Operations',
  'Established Business / Modernization',
]

const TIMELINES = [
  'Immediate (Within 2-4 weeks)',
  'Within 1-2 months',
  'Planning for next quarter',
  'Just exploring options',
]

export default function Contact() {
  const [params] = useSearchParams()
  const initialCategory = params.get('interest') || 'software'

  const [category, setCategory] = useState(initialCategory)
  const [stage, setStage] = useState(STAGES[0])
  const [timeline, setTimeline] = useState(TIMELINES[0])
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [currentChallenges, setCurrentChallenges] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Accessible error announcement helper
  useEffect(() => {
    const updateAriaState = (event: Event) => {
      const input = event.target as HTMLElement
      if (!input?.matches?.('input, textarea, select')) return
      const isUserInvalid = input.matches(':user-invalid')
      if (isUserInvalid) {
        input.setAttribute('aria-invalid', 'true')
      } else {
        input.removeAttribute('aria-invalid')
      }
    }

    document.addEventListener('blur', updateAriaState, true)
    document.addEventListener('focus', updateAriaState, true)
    document.addEventListener('input', (event) => {
      const input = event.target as HTMLElement
      if (!input?.matches?.('input, textarea, select')) return
      if (input.getAttribute('aria-invalid') === 'true') {
        updateAriaState(event)
      }
    })
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate reliable dispatch
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitted(true)
    }, 600)
  }

  return (
    <div className="space-y-24 sm:space-y-32 pb-24">
      {/* Full-Width Hero Header */}
      <section className="relative w-full border-b border-slate-200/80 bg-gradient-to-b from-white via-purple-50/20 to-slate-50/70 pt-14 pb-16 sm:pt-20 sm:pb-24">
        <div className="tech-grid absolute inset-0 opacity-30 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3.5 py-1 text-xs font-semibold text-brand mb-4 shadow-2xs">
              <Sparkles className="size-3.5" />
              <span>Direct Engineering Consultation</span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Let's Build What Your Business Needs Next.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Tell us about your product vision, architecture bottlenecks, or data challenges. Every inquiry is reviewed
              directly by a senior technology partner.
            </p>
          </div>
        </div>
      </section>

      {/* Discovery Form Container */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          {/* Form / Success Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-sm">
            {submitted ? (
              <div className="py-12 text-center space-y-6">
                <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="size-8" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Discovery Brief Received
                </h2>
                <p className="mx-auto max-w-md text-sm text-slate-600 leading-relaxed font-normal">
                  Thank you, <strong className="text-slate-900">{name || 'there'}</strong>. Our engineering and strategy
                  team has received your project details for <strong className="text-slate-900">{company || 'your business'}</strong>.
                </p>
                <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left text-xs text-slate-700 space-y-2">
                  <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Next Steps</p>
                  <p>1. A senior engineer will review your requirements against our feasibility frameworks.</p>
                  <p>2. We will follow up via email ({email}) within 24 business hours to schedule an initial architecture discovery call.</p>
                  <p>3. Zero sales pressure—just direct technical evaluation and actionable guidance.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="rounded-full bg-slate-100 hover:bg-slate-200 px-6 py-2.5 text-xs font-bold text-slate-700 transition"
                >
                  Submit Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8" noValidate={false}>
                {/* 1. Category Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
                    1. Primary Area of Interest <span className="text-brand">*</span>
                  </label>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon
                      const isSelected = category === cat.id
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={cn(
                            'flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all',
                            isSelected
                              ? 'border-brand bg-purple-50/60 text-brand ring-1 ring-brand'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          )}
                        >
                          <div
                            className={cn(
                              'grid size-8 place-items-center rounded-xl shrink-0',
                              isSelected ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <span className="text-xs font-bold">{cat.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Contact Information */}
                <div className="space-y-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
                    2. Contact Details
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs font-medium text-slate-700 mb-1">
                        Your Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Kimani"
                        aria-errormessage="contact-name-error"
                        className="field-control w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-hidden"
                      />
                      <span id="contact-name-error" className="field-error-msg text-xs mt-1">
                        Please provide your name.
                      </span>
                    </div>

                    <div>
                      <label htmlFor="contact-company" className="block text-xs font-medium text-slate-700 mb-1">
                        Company or Project Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="contact-company"
                        type="text"
                        required
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g. Nexus Logistics"
                        aria-errormessage="contact-company-error"
                        className="field-control w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-hidden"
                      />
                      <span id="contact-company-error" className="field-error-msg text-xs mt-1">
                        Please provide your company or project name.
                      </span>
                    </div>

                    <div>
                      <label htmlFor="contact-email" className="block text-xs font-medium text-slate-700 mb-1">
                        Work Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@company.com"
                        aria-errormessage="contact-email-error"
                        className="field-control w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-hidden"
                      />
                      <span id="contact-email-error" className="field-error-msg text-xs mt-1">
                        Please enter a valid email address.
                      </span>
                    </div>

                    <div>
                      <label htmlFor="contact-phone" className="block text-xs font-medium text-slate-700 mb-1">
                        Phone / WhatsApp
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+254 7..."
                        className="field-control w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Stage & Timeline */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="business-stage" className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">
                      Current Stage
                    </label>
                    <select
                      id="business-stage"
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-brand focus:outline-hidden"
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="target-timeline" className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">
                      Estimated Project Timeline
                    </label>
                    <select
                      id="target-timeline"
                      value={timeline}
                      onChange={(e) => setTimeline(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-brand focus:outline-hidden"
                    >
                      {TIMELINES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Project Scope & Technical Challenges */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="project-description" className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">
                      What Are You Looking to Build or Solve? <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="project-description"
                      required
                      rows={3}
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="Describe your core product concept, current system requirements, or operational bottlenecks..."
                      aria-errormessage="project-description-error"
                      className="field-control w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-hidden resize-y"
                    />
                    <span id="project-description-error" className="field-error-msg text-xs mt-1">
                      Please provide a brief description of what you are looking to build.
                    </span>
                  </div>

                  <div>
                    <label htmlFor="current-challenges" className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">
                      Current Technology Challenges (Optional)
                    </label>
                    <textarea
                      id="current-challenges"
                      rows={2}
                      value={currentChallenges}
                      onChange={(e) => setCurrentChallenges(e.target.value)}
                      placeholder="e.g. Database queries timing out under load, choosing between FastAPI and Node, lack of in-house technical leadership..."
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-hidden resize-y"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-brand w-full flex items-center justify-center gap-2 rounded-full py-4 text-sm sm:text-base font-bold shadow-lg transition hover:scale-[1.01] active:scale-95 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <span>Transmitting Discovery Brief...</span>
                    ) : (
                      <>
                        <span>Submit Project Brief for Architecture Review</span>
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                  <p className="mt-3 text-center text-xs text-slate-400">
                    Confidential · Reviewed by Senior Engineering Leadership · Response within 24 hours
                  </p>
                </div>
              </form>
            )}
          </div>

          {/* Consultation Guarantees & Direct Info */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-brand">Direct Engagement</span>
              <h3 className="text-xl font-bold text-slate-900">What to Expect on Your Discovery Call</h3>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero Aggressive Sales:</strong> You speak with software architects and technical strategists, not commission-based quota reps.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Actionable Feasibility Review:</strong> We analyze your stack, constraints, and cost projections transparently.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Strict NDA & Confidentiality:</strong> Your proprietary concepts, source logic, and business metrics remain completely confidential.
                  </span>
                </li>
              </ul>
            </div>

            {/* Direct Contact info */}
            <div className="rounded-3xl border border-slate-200/90 bg-slate-900 p-6 sm:p-8 text-white space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Direct Inquiries</span>
              <h4 className="text-lg font-bold">Aqivo Advisory & Engineering</h4>
              <div className="space-y-2.5 text-xs text-slate-300">
                <p className="flex items-center gap-2">
                  <Mail className="size-4 text-brand shrink-0" />
                  <span>info@aqivo.shop</span>
                </p>
                <p className="flex items-center gap-2">
                  <Building2 className="size-4 text-brand shrink-0" />
                  <span>Strategic Engineering, Data & AI Partner</span>
                </p>
              </div>
              <p className="text-[11px] text-slate-400 pt-2 border-t border-white/10">
                Are you an existing Aqivo Store merchant needing product support? Log in to your merchant dashboard or email support@aqivo.shop.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
