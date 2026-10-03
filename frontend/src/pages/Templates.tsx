import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Monitor, Smartphone } from 'lucide-react'
import { api } from '@/lib/api'
import type { IndustryConfig, Template } from '@/types'
import { SiteNav } from './landing/Hero'
import { SiteFooter } from './landing/Sections'
import { PageLoading } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from '@/features/auth/AuthContext'
import { PhoneFrame } from '@/components/PhoneFrame'

function TemplateCard({ t }: { t: Template }) {
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop')
  const nav = useNavigate()
  const { me } = useAuth()
  const use = () => nav(me?.memberships.length ? `/dashboard/website?template=${t.key}` : `/register?template=${t.key}`)
  return (
    <article id={t.key} className="scroll-mt-24 overflow-hidden rounded-[24px] glass">
      <div className="grid lg:grid-cols-[1.4fr_1fr]">
        <div className="relative flex min-h-[560px] items-center justify-center bg-white/40 p-4 sm:p-6">
          <div className="absolute right-4 top-4 z-10 flex rounded-full bg-white p-1 ring-1 ring-line">
            {([['desktop', Monitor], ['mobile', Smartphone]] as const).map(([m, Icon]) => (
              <button key={m} onClick={() => setMode(m)} aria-label={`${m} preview`} aria-pressed={mode === m} className={cn('grid size-8 place-items-center rounded-full', mode === m ? 'btn-brand' : 'text-muted')}><Icon className="size-4" /></button>
            ))}
          </div>
          {mode === 'desktop' ? (
            <div className="h-[420px] w-[640px] max-w-full overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/10">
              <iframe title={`${t.name} desktop preview`} src={t.preview_url} loading="lazy" className="origin-top-left border-0" style={{ width: '1200px', height: '800px', transform: 'scale(0.5333)' }} />
            </div>
          ) : (
            <PhoneFrame width={390} scale={0.65} label={`${t.name} mobile preview`}>
              <iframe title={`${t.name} mobile preview`} src={t.preview_url} loading="lazy" className="h-full w-full border-0 bg-white" style={{ width: '390px', height: '844px' }} />
            </PhoneFrame>
          )}
        </div>
        <div className="flex flex-col p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">{t.industry}</p>
          <h2 className="mt-1 text-2xl">{t.name}</h2>
          <p className="mt-2 text-sm text-muted">{t.description}</p>
          <ul className="mt-5 space-y-1.5 text-sm">{t.features.map((f) => <li key={f} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink" />{f}</li>)}</ul>
          <div className="mt-6 flex gap-2">{[t.theme.bg, t.theme.accent, t.theme.ink].map((c, i) => <span key={i} className="size-7 rounded-full ring-1 ring-black/10" style={{ background: c }} aria-hidden />)}</div>
          <button onClick={use} className="mt-auto rounded-full btn-brand px-6 py-3.5 text-sm font-bold lg:mt-8">Use this design</button>
        </div>
      </div>
    </article>
  )
}

export default function Templates() {
  const { data, isLoading } = useQuery({ queryKey: ['templates'], queryFn: () => api.get<Template[]>('/templates') })
  const cfg = useQuery({ queryKey: ['config'], queryFn: () => api.get<{ industries: IndustryConfig[] }>('/businesses/config'), staleTime: Infinity })
  const [ind, setInd] = useState('all')
  const shown = (data ?? []).filter((t) => ind === 'all' || t.industry === ind)
  const present = new Set((data ?? []).map((t) => t.industry))
  return (
    <>
      <SiteNav dark={false} />
      <main className="mx-auto max-w-7xl px-5 pb-24 pt-8 md:px-10">
        <h1 className="max-w-3xl text-4xl md:text-6xl">Designs made for every kind of business.</h1>
        <p className="mt-4 max-w-2xl text-muted">Every design is generated from your own business details. Pick a look — you can switch any time without losing your content. Previews use a demo business.</p>
        <div className="scrollbar-none -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">{[{ key: 'all', label: 'All' }, ...(cfg.data?.industries ?? []).filter((i) => present.has(i.key))].map((i) => <button key={i.key} onClick={() => setInd(i.key)} aria-pressed={ind === i.key} className={cn('h-10 shrink-0 rounded-full px-5 text-sm font-bold', ind === i.key ? 'btn-brand' : 'glass text-muted')}>{i.label}</button>)}</div>
        {isLoading ? <PageLoading /> : <div className="mt-6 space-y-6">{shown.map((t) => <TemplateCard key={t.key} t={t} />)}</div>}
        <p className="mt-10 text-sm text-muted">Don't see your industry? Pick the closest design — you can change every colour, font and word. <Link to="/register" className="font-bold text-ink underline">Start your business</Link>.</p>
      </main>
      <SiteFooter />
    </>
  )
}
