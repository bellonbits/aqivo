import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Check, Copy, ImagePlus, Plus, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/AuthContext'
import { useBusiness, BUSINESS_KEY } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { Button, Field, Input, Select, PageLoading, Badge, CopyField } from '@/components/ui'
import { Logo } from '@/components/Logo'
import { PhoneFrame } from '@/components/PhoneFrame'
import { cn } from '@/lib/cn'
import type { Business, CountryConfig, GalleryImage, IndustryConfig, Template } from '@/types'

const STEPS = ['Name', 'Industry', 'Location', 'Contact', 'Services', 'Photos', 'Logo', 'Design', 'Preview', 'Publish']
interface Draft { name: string; industry: string; category: string; country: string; city: string; address: string; phone: string; whatsapp: string }
interface Row { name: string; price: string; minutes: string }

export default function Onboarding() {
  const { me, loading } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const qc = useQueryClient()
  const { summary, isLoading: bizLoading } = useBusiness()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [d, setD] = useState<Draft>({ name: '', industry: 'beauty', category: 'Beauty Salon', country: 'KE', city: '', address: '', phone: '', whatsapp: '' })
  const [sameWa, setSameWa] = useState(true)
  const [rows, setRows] = useState<Row[]>([{ name: '', price: '', minutes: '60' }])
  const [template, setTemplate] = useState(params.get('template') ?? 'booking_ecom')
  const [published, setPublished] = useState(false)
  const countries = useQuery({ queryKey: ['config'], queryFn: () => api.get<{ countries: CountryConfig[]; industries: IndustryConfig[] }>('/businesses/config'), staleTime: Infinity })
  const templates = useQuery({ queryKey: ['templates'], queryFn: () => api.get<Template[]>('/templates') })
  const business: Business | undefined = summary?.business
  const started = useRef(false)

  useEffect(() => {
    if (loading) return
    if (!me) nav('/login', { replace: true })
  }, [loading, me, nav])
  useEffect(() => {
    if (started.current || !summary) return
    started.current = true
    if (summary.business.onboarding_completed) nav('/dashboard', { replace: true })
    else setStep(4) // business already created; resume at services
  }, [summary, nav])

  const country = countries.data?.countries.find((c) => c.code === d.country)
  const set = (k: keyof Draft, v: string) => setD((s) => ({ ...s, [k]: v }))
  const industries = countries.data?.industries ?? []
  const activeKey = business?.industry ?? d.industry
  const industry = industries.find((i) => i.key === activeKey)
  const suggestions: [string, number, number][] = (industry?.suggestions ?? []).map((x) => [x.name, x.price, x.minutes])
  const pickIndustry = (i: IndustryConfig) => { setD((s) => ({ ...s, industry: i.key, category: i.categories[0] })); if (!params.get('template')) setTemplate(i.template) }
  const industryParam = params.get('industry')
  useEffect(() => { const i = industries.find((x) => x.key === industryParam); if (i && !business) pickIndustry(i) // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industryParam, industries.length])

  const run = async (fn: () => Promise<void>) => { setError(''); setBusy(true); try { await fn() } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong') } finally { setBusy(false) } }
  const refresh = () => qc.invalidateQueries({ queryKey: BUSINESS_KEY })

  const next = () => {
    if (step === 0 && d.name.trim().length < 2) return setError('Enter your business name')
    if (step === 3 && !d.phone.trim()) return setError('Enter a phone number')
    setError('')
    if (step === 3 && !business) {
      return void run(async () => {
        await api.post('/businesses', { name: d.name.trim(), industry: d.industry, category: d.category, country_code: d.country, city: d.city, phone: d.phone, whatsapp: sameWa ? d.phone : d.whatsapp, template_key: template })
        if (d.address) await api.patch('/businesses/me', { address: d.address })
        await refresh()
        setStep(4)
      })
    }
    if (step === 4) {
      const valid = rows.filter((r) => r.name.trim() && r.price !== '')
      return void run(async () => {
        for (const r of valid) await api.post('/services', { name: r.name.trim(), price: String(Number(r.price)), duration_minutes: Number(r.minutes) || 60 })
        setStep(5)
      })
    }
    if (step === 7) return void run(async () => { await api.post('/websites/me/template', { template_key: template }); setStep(8) })
    setStep((s) => s + 1)
  }

  const publish = () => run(async () => {
    await api.post('/websites/me/publish')
    await api.post('/businesses/me/onboarding-complete')
    await refresh(); setPublished(true)
  })
  const finishWithoutPublishing = () => run(async () => { await api.post('/businesses/me/onboarding-complete'); await refresh(); nav('/dashboard') })

  if (loading || bizLoading) return <PageLoading />

  return (
    <div className="min-h-dvh">
      <header className="border-b border-white/70 glass"><div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4"><Logo /><p className="text-sm font-semibold text-muted">Step {Math.min(step + 1, 10)} of 10 · {STEPS[Math.min(step, 9)]}</p></div>
        <div className="h-1 bg-line"><div className="h-1 bg-brand transition-all" style={{ width: `${((Math.min(step, 9) + 1) / 10) * 100}%` }} /></div></header>
      <main className="mx-auto max-w-2xl px-5 py-8 pb-28">
        {published ? <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}><Done business={business} /></motion.div> : (
          <AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }}>
            {step === 0 && <Step title="What's your business called?" sub="This is the name customers will see."><Field label="Business name"><Input autoFocus value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Mary's Beauty Studio" maxLength={160} onKeyDown={(e) => e.key === 'Enter' && next()} /></Field></Step>}
            {step === 1 && (
              <Step title="What kind of business is it?" sub="Pick the closest match — we'll set up the right design, wording and starter services.">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{industries.map((i) => (
                  <button key={i.key} onClick={() => pickIndustry(i)} aria-pressed={d.industry === i.key} className={cn('group relative aspect-[4/3] overflow-hidden rounded-2xl text-left ring-2 transition', d.industry === i.key ? 'ring-brand' : 'ring-transparent hover:ring-line-strong')}>
                    <img src={`/img/${i.photo}-sm.webp`} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute inset-0 bg-gradient-to-t from-[#1b1550]/85 via-[#1b1550]/20 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 p-3 text-white"><span className="block text-sm font-extrabold leading-tight">{i.label}</span></span>
                    {d.industry === i.key && <span className="btn-brand absolute right-2 top-2 grid size-6 place-items-center rounded-full"><Check className="size-4" /></span>}
                  </button>))}</div>
                {industry && <div className="mt-6"><p className="mb-2 text-sm font-bold">Which describes you best?</p><div className="flex flex-wrap gap-2">{industry.categories.map((c) => <button key={c} onClick={() => set('category', c)} aria-pressed={d.category === c} className={cn('rounded-full border px-4 py-2 text-sm font-bold', d.category === c ? 'btn-brand border-transparent' : 'border-line-strong bg-white/80 hover:border-ink')}>{c}</button>)}</div></div>}
              </Step>)}
            {step === 2 && (
              <Step title="Where are you based?" sub="Customers use this to find and reach you.">
                <div className="space-y-4">
                  <Field label="Country"><Select value={d.country} onChange={(e) => set('country', e.target.value)}>{(countries.data?.countries ?? []).map((c) => <option key={c.code} value={c.code}>{c.name} ({c.currency})</option>)}</Select></Field>
                  <Field label="Town / area"><Input value={d.city} onChange={(e) => set('city', e.target.value)} placeholder="Pangani, Nairobi" /></Field>
                  <Field label="Street address (optional)" hint="Shown with your directions button."><Input value={d.address} onChange={(e) => set('address', e.target.value)} placeholder="Muthaiga Rd, next to Total" /></Field>
                </div>
              </Step>)}
            {step === 3 && (
              <Step title="How should customers reach you?" sub="Aqivo opens WhatsApp with a ready-made message when customers tap your buttons.">
                <div className="space-y-4">
                  <Field label="Phone number" hint={country ? `Country code +${country.dial_code} is added automatically.` : undefined}><Input type="tel" inputMode="tel" value={d.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0712 345 678" /></Field>
                  <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={sameWa} onChange={(e) => setSameWa(e.target.checked)} className="size-4 accent-ink" /> My WhatsApp number is the same</label>
                  {!sameWa && <Field label="WhatsApp number"><Input type="tel" inputMode="tel" value={d.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="0712 345 678" /></Field>}
                </div>
              </Step>)}
            {step === 4 && (
              <Step title="Add your services" sub="Name, price and how long each takes. You can add more later.">
                <div className="space-y-3">
                  {rows.map((r, i) => (
                    <div key={i} className="grid grid-cols-[1fr_88px_72px_36px] items-center gap-2">
                      <Input aria-label="Service name" placeholder="Service" value={r.name} onChange={(e) => setRows((s) => s.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                      <Input aria-label="Price" type="number" inputMode="decimal" min={0} placeholder="Price" value={r.price} onChange={(e) => setRows((s) => s.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                      <Input aria-label="Minutes" type="number" inputMode="numeric" min={5} placeholder="Min" value={r.minutes} onChange={(e) => setRows((s) => s.map((x, j) => (j === i ? { ...x, minutes: e.target.value } : x)))} />
                      <button aria-label="Remove service" onClick={() => setRows((s) => (s.length > 1 ? s.filter((_, j) => j !== i) : s))} className="grid size-9 place-items-center rounded-full text-muted hover:bg-black/5"><Trash2 className="size-4" /></button>
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" onClick={() => setRows((s) => [...s, { name: '', price: '', minutes: '60' }])}><Plus className="size-4" /> Add another</Button>
                </div>
                <div className="mt-6"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Quick add ({business?.currency ?? 'KES'} — edit prices to match yours)</p>
                  <div className="flex flex-wrap gap-2">{suggestions.map(([n, p, m]) => <button key={n} onClick={() => setRows((s) => [...s.filter((x) => x.name || x.price), { name: n, price: String(p), minutes: String(m) }])} className="rounded-full border border-line-strong bg-white px-3 py-1.5 text-xs font-bold hover:border-ink">+ {n}</button>)}</div></div>
              </Step>)}
            {step === 5 && <Step title="Show your work" sub="Add a few photos of your best work. They're resized automatically so your site stays fast."><PhotoStep /></Step>}
            {step === 6 && <Step title="Add your logo" sub="Optional — you can skip this and add it later."><LogoStep logo={business?.logo_url ?? null} onDone={refresh} /></Step>}
            {step === 7 && (
              <Step title="Choose a design" sub="Your website is generated from your details. You can switch designs any time.">
                <div className="grid gap-3 sm:grid-cols-2">{(templates.data ?? []).filter((t) => t.industry === activeKey).map((t) => (
                  <button key={t.key} onClick={() => setTemplate(t.key)} aria-pressed={template === t.key} className={cn('overflow-hidden rounded-2xl border text-left', template === t.key ? 'border-ink ring-2 ring-ink' : 'border-line hover:border-ink')}>
                    <div className="h-36 overflow-hidden bg-line"><iframe title={t.name} src={t.preview_url} loading="lazy" tabIndex={-1} className="pointer-events-none h-[1000px] w-[1200px] origin-top-left border-0" style={{ transform: 'scale(0.29)' }} /></div>
                    <div className="flex items-center justify-between p-3"><div><p className="font-extrabold">{t.name}</p><p className="line-clamp-1 text-xs text-muted">{t.description}</p></div>{template === t.key && <Check className="size-5" />}</div>
                  </button>))}</div>
              </Step>)}
            {step === 8 && <Step title="Preview your website" sub="This is exactly how customers will see it."><Preview /></Step>}
            {step === 9 && (
              <Step title="Ready to publish?" sub="Your website goes live at your business link. You can edit and republish any time.">
                <div className="rounded-2xl border border-line bg-white p-5"><p className="text-sm text-muted">Your link</p><p className="mt-1 break-all text-2xl font-extrabold">{summary?.urls.short}</p></div>
                {summary?.plan.features.includes('website') ? null : <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Your plan doesn't include the website — your free profile will go live instead.</p>}
              </Step>)}
            {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-bad" role="alert">{error}</p>}
          </motion.div></AnimatePresence>
        )}
      </main>
      {!published && (
        <footer className="fixed inset-x-0 bottom-0 border-t border-line bg-white/95 backdrop-blur pb-safe"><div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-3">
          <Button variant="ghost" disabled={step === 0 || (!!business && step <= 4)} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
          <div className="flex gap-2">
            {(step === 5 || step === 6) && <Button variant="secondary" onClick={() => setStep(step + 1)}>Skip</Button>}
            {step === 9 ? <><Button variant="secondary" onClick={() => void finishWithoutPublishing()} disabled={busy}>Not yet</Button><Button variant="lime" loading={busy} onClick={() => void publish()}>Publish my website</Button></>
              : <Button loading={busy} onClick={next}>{step === 3 ? 'Create my business' : 'Continue'}</Button>}
          </div></div></footer>
      )}
    </div>
  )
}

function Step({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return <section><h1 className="text-3xl">{title}</h1><p className="mt-2 text-muted">{sub}</p><div className="mt-7">{children}</div></section>
}

function PhotoStep() {
  const qc = useQueryClient()
  const toast = useToast()
  const { data } = useQuery({ queryKey: ['gallery'], queryFn: () => api.get<GalleryImage[]>('/gallery') })
  const [up, setUp] = useState(0)
  const onFiles = async (files: FileList | null) => {
    if (!files) return
    for (const f of Array.from(files).slice(0, 6)) {
      setUp((n) => n + 1)
      try { await api.upload('/gallery', f) } catch (e) { toast.err(e instanceof Error ? e.message : 'Upload failed') }
      setUp((n) => n - 1)
    }
    void qc.invalidateQueries({ queryKey: ['gallery'] })
  }
  return (
    <div>
      <label className="grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-line-strong bg-white px-4 py-10 text-center hover:border-ink">
        <ImagePlus className="size-8 text-muted" /><span className="mt-2 font-bold">Tap to add photos</span><span className="text-xs text-muted">JPEG, PNG or WebP — up to 8 MB each</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => void onFiles(e.target.files)} />
      </label>
      {up > 0 && <p className="mt-3 text-sm text-muted">Uploading {up}…</p>}
      <div className="mt-4 grid grid-cols-3 gap-2">{(data ?? []).map((g) => <img key={g.id} src={g.thumb_url ?? g.url} alt={g.caption || 'Gallery photo'} className="aspect-square rounded-xl object-cover" />)}</div>
    </div>
  )
}

function LogoStep({ logo, onDone }: { logo: string | null; onDone: () => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  return (
    <label className="grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-line-strong bg-white px-4 py-10 text-center hover:border-ink">
      {logo ? <img src={logo} alt="Your logo" className="size-24 rounded-full object-cover" /> : <Camera className="size-8 text-muted" />}
      <span className="mt-2 font-bold">{busy ? 'Uploading…' : logo ? 'Change logo' : 'Tap to add your logo'}</span>
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setBusy(true); try { await api.upload('/businesses/me/logo', f); onDone() } catch (er) { toast.err(er instanceof Error ? er.message : 'Upload failed') } finally { setBusy(false) } }} />
    </label>
  )
}

export function Preview() {
  const [html, setHtml] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [mobile, setMobile] = useState(false)
  useEffect(() => { void (async () => { try { setHtml(await api.get<string>('/websites/me/preview')) } catch (e) { setErr(e instanceof Error ? e.message : 'Preview failed') } })() }, [])
  if (err) return <p className="text-sm text-bad">{err}</p>
  if (html === null) return <PageLoading />
  return (
    <div>
      <div className="mb-3 flex gap-2"><Button size="sm" variant={mobile ? 'secondary' : 'primary'} onClick={() => setMobile(false)}>Desktop</Button><Button size="sm" variant={mobile ? 'primary' : 'secondary'} onClick={() => setMobile(true)}>Mobile</Button></div>
      <div className="grid place-items-center rounded-2xl bg-white/40 p-3">
        {mobile ? (
          <PhoneFrame width={390} scale={0.75} label="Mobile preview">
            <iframe title="Website preview" sandbox="allow-scripts" srcDoc={html} className="h-full w-full border-0 bg-white" style={{ width: 390, height: 844 }} />
          </PhoneFrame>
        ) : (
          <iframe title="Website preview" sandbox="allow-scripts" srcDoc={html} className="h-[520px] w-full rounded-lg border-0 bg-white" />
        )}
      </div>
    </div>
  )
}

function Done({ business }: { business?: Business }) {
  const { summary } = useBusiness()
  const nav = useNavigate()
  const toast = useToast()
  const [qr, setQr] = useState<string | null>(null)
  useEffect(() => { void api.blob('/businesses/me/qr?fmt=png').then((b) => setQr(URL.createObjectURL(b))).catch(() => undefined) }, [])
  const urls = summary?.urls
  const share = useMemo(() => (urls ? `https://wa.me/?text=${encodeURIComponent(`Visit ${business?.name} online: ${urls.profile}`)}` : '#'), [urls, business])
  if (!urls) return null
  return (
    <section className="text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-lime"><Check className="size-8" /></div>
      <h1 className="mt-5 text-3xl md:text-4xl">{business?.name} is live!</h1>
      <p className="mt-2 text-muted">Share your link, put the QR code on your shop window, and start getting customers.</p>
      <div className="mt-8 grid gap-4 text-left sm:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <CopyField label="Business link" value={urls.profile} onCopied={() => toast.ok('Link copied')} />
          {urls.whatsapp && <CopyField label="WhatsApp link" value={urls.whatsapp} onCopied={() => toast.ok('Link copied')} />}
          <CopyField label="Review link" value={urls.review} onCopied={() => toast.ok('Link copied')} />
          <a href={share} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-[#053b1a]"><Copy className="size-4" /> Share on WhatsApp</a>
        </div>
        <div className="mx-auto w-40 rounded-2xl border border-line bg-white p-3 text-center">{qr ? <img src={qr} alt="QR code for your business page" className="w-full" /> : <PageLoading />}<p className="mt-1 text-xs font-semibold">Scan to visit</p><a href="/api/v1/businesses/me/qr?fmt=svg" onClick={(e) => { e.preventDefault(); void api.blob('/businesses/me/qr?fmt=svg').then((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${business?.slug}-qr.svg`; a.click() }) }} className="text-xs font-bold underline">Download SVG</a></div>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3"><Button size="lg" onClick={() => nav('/dashboard')}>Go to my dashboard</Button><a href={urls.profile} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center rounded-full border border-line-strong bg-white px-6 font-bold">View my website</a></div>
      <p className="mt-6 text-xs text-muted">Your {summary?.plan.name} plan {summary?.subscription?.status === 'TRIAL' ? 'trial is running' : 'is active'}.</p>
      <Badge tone="lime">Business online</Badge>
    </section>
  )
}
