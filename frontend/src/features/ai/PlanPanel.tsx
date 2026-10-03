import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, Card, CardHeader, ConfirmDialog, PageLoading } from '@/components/ui'
import { Toggle } from '@/features/website/SectionForm'
import { cn } from '@/lib/cn'
import type { AiAction, PlanItem } from '@/types'

interface Plan { items: PlanItem[]; automations: Record<string, boolean | string | null>; automation_options: Record<string, string>; prepared_today: { kind: string; title: string; campaign_id: string }[] }

export const ACTION_EXPLAIN: Record<string, string> = {
  create_campaign: 'This prepares a draft campaign with one WhatsApp message per customer. You review it; nothing is sent.',
  follow_up_leads: 'This prepares a WhatsApp follow-up for each waiting lead. You review and tap to send; nothing is sent by Aqivo.',
  request_reviews: 'This creates single-use review links and a message for each customer. You review and send them yourself.',
  create_growth_campaign: 'This creates a campaign draft with copy and tracked links for each channel (and a discount code if one is shown). Nothing is posted.',
  update_product_description: 'This replaces the product description with the draft shown. You can edit it again afterwards.',
  update_description: 'This replaces your business description. You can edit it again afterwards.',
}

export function useRunAction() {
  const nav = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const [pending, setPending] = useState<AiAction | null>(null)
  const run = useMutation({
    mutationFn: (a: AiAction) => api.post<{ message: string; href?: string }>('/ai/actions', { type: a.type, payload: a.payload, confirmed: true }),
    onSuccess: (r) => { setPending(null); toast.ok(r.message); void qc.invalidateQueries({ queryKey: ['ai-plan'] }); void qc.invalidateQueries({ queryKey: ['campaigns'] }); if (r.href) nav(r.href) },
    onError: (e) => { setPending(null); toast.err(e instanceof Error ? e.message : 'Failed') },
  })
  const click = (a: AiAction) => { if (a.type === 'navigate') nav(String(a.payload.href)); else setPending(a) }
  const dialog = <ConfirmDialog open={!!pending} title={pending?.label ?? ''} body={pending ? ACTION_EXPLAIN[pending.type] ?? 'Continue?' : ''} confirmLabel="Yes, do it" loading={run.isPending} onConfirm={() => pending && run.mutate(pending)} onClose={() => setPending(null)} />
  return { click, dialog }
}

const TONE = { 1: 'bg-red-50 text-red-800', 2: 'bg-amber-50 text-amber-900', 3: 'bg-blue-50 text-blue-900' } as const
const WORD = { 1: 'Do first', 2: 'This week', 3: 'Worth knowing' } as const

export function PlanPanel({ limit, compact }: { limit?: number; compact?: boolean }) {
  const qc = useQueryClient()
  const toast = useToast()
  const { click, dialog } = useRunAction()
  const q = useQuery({ queryKey: ['ai-plan'], queryFn: () => api.get<Plan>('/ai/plan') })
  const setAuto = useMutation({ mutationFn: (b: Record<string, boolean>) => api.patch('/ai/automations', b), onSuccess: () => void qc.invalidateQueries({ queryKey: ['ai-plan'] }), onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  if (q.isLoading) return <PageLoading />
  const items = (q.data?.items ?? []).slice(0, limit)
  return (
    <>
      <Card>
        <CardHeader title="Today's growth plan" sub="Built from your real numbers. Actions are proposals — you confirm each one." />
        {q.data?.prepared_today.length ? <div className="border-b border-line bg-lime/30 px-5 py-3 text-sm font-semibold"><Sparkles className="mr-1.5 inline size-4" />Prepared for you today: {q.data.prepared_today.map((p) => p.title).join(' · ')}. Open Marketing to review.</div> : null}
        {!items.length ? <div className="px-5 py-8 text-sm text-muted">Nothing needs your attention right now. Keep sharing your link — I'll flag things as they come up.</div> : (
          <ul className="divide-y divide-line">{items.map((i) => (
            <li key={i.key} className="space-y-2 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2"><span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', TONE[i.priority as 1 | 2 | 3])}>{WORD[i.priority as 1 | 2 | 3]}</span><h3 className="text-base">{i.title}</h3></div>
              {!compact && <p className="text-sm text-muted">{i.detail}</p>}
              {!compact && !!i.stats.length && <div className="flex flex-wrap gap-4 text-sm">{i.stats.map((s) => <span key={s.label}><b className="text-base font-extrabold">{s.value}</b> <span className="text-muted">{s.label}</span></span>)}</div>}
              {!compact && i.opportunity && <p className="text-sm"><span className="text-muted">{i.opportunity.label}: </span><b>{i.opportunity.value}</b></p>}
              {i.action && <Button size="sm" variant={i.action.type === 'navigate' ? 'secondary' : 'primary'} onClick={() => click(i.action!)}>{i.action.label}{i.action.type === 'navigate' && <ArrowRight className="size-4" />}</Button>}
            </li>))}</ul>)}
      </Card>
      {!compact && q.data && (
        <Card className="mt-6">
          <CardHeader title="Prepare things for me each day" sub="Aqivo can get drafts ready every morning. It never sends anything — you review and send." />
          <div className="space-y-3 p-5">{Object.entries(q.data.automation_options).map(([k, label]) => <Toggle key={k} label={label} checked={q.data!.automations[k] === true} onChange={(v) => setAuto.mutate({ [k]: v })} />)}
            <p className="text-xs text-muted">Needs the Pro plan. <Badge>Drafts only</Badge></p></div>
        </Card>)}
      {dialog}
    </>
  )
}
