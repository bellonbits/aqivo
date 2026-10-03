import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, Circle, ExternalLink, Lock } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/AuthContext'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { Card, CardHeader, CopyField, ErrorState, LinkButton, NotEnoughData, PageLoading, Stat, StatusBadge } from '@/components/ui'
import { PlanPanel } from '@/features/ai/PlanPanel'
import { money } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Overview } from '@/types'

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

export default function Home() {
  const { me } = useAuth()
  const { summary, business, has } = useBusiness()
  const toast = useToast()
  const q = useQuery({ queryKey: ['overview'], queryFn: () => api.get<Overview>('/analytics/overview') })
  if (!summary || !business) return <PageLoading />
  if (q.isLoading) return <PageLoading />
  if (q.error || !q.data) return <ErrorState message="We couldn't load your dashboard." onRetry={() => void q.refetch()} />
  const o = q.data
  const s = o.summary
  const live = summary.website.status === 'PUBLISHED'
  const first = me?.user.full_name.split(' ')[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl">{greeting()}, {first}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          {live ? <><StatusBadge status="PUBLISHED" /> Your website is live.</> : summary.plan.features.includes('website') ? <>Your website isn't published yet. <Link to="/dashboard/website" className="font-bold text-ink underline">Publish it</Link></> : <>Your free profile is live.</>}
          <a href={summary.urls.profile} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-ink underline">{summary.urls.short} <ExternalLink className="size-3" /></a>
        </p>
      </div>

      <section aria-label="Last 30 days">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Last 30 days</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Visitors" value={s.visitors} />
          <Stat label="New leads" value={s.leads} sub={o.leads_new ? `${o.leads_new} waiting for a reply` : undefined} />
          <Stat label="Booking requests" value={s.booking_requests} />
          <Stat label="Completed" value={s.completed_bookings} />
          <Stat tone="lime" label="Revenue recorded" value={money(s.revenue, s.currency)} />
        </div>
        {!s.has_data && <div className="mt-3"><NotEnoughData hint="Share your business link on WhatsApp and Instagram — real numbers appear here as customers visit, message and book." /></div>}
      </section>

      {has('ai') && <section aria-label="Growth plan"><PlanPanel limit={3} compact /><p className="mt-2 text-right text-xs"><Link to="/dashboard/ai" className="font-bold underline">See the full plan</Link></p></section>}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Your next actions" sub="Based on your real activity" />
          {o.actions.length === 0 ? <div className="px-5 py-8 text-sm text-muted">You're all caught up. Nice work.</div> : (
            <ul className="divide-y divide-line">{o.actions.map((a) => (
              <li key={a.key}><Link to={a.href} className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm font-semibold hover:bg-paper"><span>{a.text}</span><ArrowRight className="size-4 shrink-0 text-muted" /></Link></li>))}</ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Get found checklist" action={<span className="text-2xl font-extrabold">{o.checklist.completion}%</span>} sub="Your online presence" />
          <div className="px-5 pt-4"><div className="h-2 overflow-hidden rounded-full bg-line"><div className="h-full bg-brand" style={{ width: `${o.checklist.completion}%` }} /></div></div>
          <ul className="space-y-1 px-5 py-4">{o.checklist.items.map((i) => (
            <li key={i.key}><Link to={i.fix} className="flex items-center gap-2.5 py-1 text-sm hover:underline">
              {i.done ? <Check className="size-4 text-ok" /> : i.locked ? <Lock className="size-4 text-muted" /> : <Circle className="size-4 text-line-strong" />}
              <span className={cn(i.done && 'text-muted')}>{i.label}</span>{i.locked && <span className="text-xs text-muted">(paid plan)</span>}</Link></li>))}</ul>
          <p className="border-t border-line px-5 py-3 text-xs text-muted">This checks what's complete in Aqivo. It doesn't change your Google or social accounts.</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Share your business" sub="Your link, WhatsApp link and review link" action={<LinkButton to="/dashboard/settings#share" variant="secondary" size="sm">QR code</LinkButton>} />
        <div className="grid gap-4 p-5 md:grid-cols-3">
          <CopyField label="Business link" value={summary.urls.profile} onCopied={() => toast.ok('Link copied')} />
          {summary.urls.whatsapp && <CopyField label="WhatsApp link" value={summary.urls.whatsapp} onCopied={() => toast.ok('Link copied')} />}
          <CopyField label="Review link" value={summary.urls.review} onCopied={() => toast.ok('Link copied')} />
        </div>
      </Card>
    </div>
  )
}
