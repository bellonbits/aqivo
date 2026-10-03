import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plus, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, ErrorState, Field, Modal, NotConfigured, PageHeader, PageLoading, Select, StatusBadge, Tabs, TextAreaField, TextField, UpgradePrompt } from '@/components/ui'
import { cap, relativeTime } from '@/lib/format'
import { GrowthCampaignDetail, GrowthCampaignModal } from '@/features/marketing/GrowthCampaigns'
import { LinksQR } from '@/features/marketing/LinksQR'
import type { Campaign, CampaignRow } from '@/types'

interface Detail { campaign: Campaign; messages: { id: string; recipient_name: string; recipient_phone: string | null; body: string; status: string; whatsapp_url: string | null }[] }
const KINDS = ['REACTIVATION', 'NEW_SERVICE', 'BIRTHDAY', 'REVIEW_REQUEST', 'SPECIAL_OFFER', 'WHATSAPP', 'FOLLOWUP']
const TEMPLATES: Record<string, string> = {
  REACTIVATION: "Hi {name}, it's {business}. We haven't seen you in a while and we miss you! Reply here to book your next visit.",
  NEW_SERVICE: 'Hi {name}, {business} has something new: {service}. Reply to book your slot.',
  BIRTHDAY: 'Happy birthday {name}! {business} has a little gift for you this month. Reply to book.',
  REVIEW_REQUEST: 'Hi {name}, thanks for visiting {business}. Could you leave us a quick review? {review_link}',
  SPECIAL_OFFER: 'Hi {name}, this week at {business}: {offer}. Reply to book.', FOLLOWUP: "Hi {name}, it's {business}. Thanks for your enquiry. Would you like to go ahead?", WHATSAPP: 'Hi {name}, this is {business}. ',
}
const AUD: Record<string, string> = { all: 'All customers with a phone number', inactive30: 'Not visited in 30+ days', inactive45: 'Not visited in 45+ days', inactive60: 'Not visited in 60+ days', inactive90: 'Not visited in 90+ days', birthday_month: 'Birthdays this month' }
const audience = (k: string) => (k.startsWith('inactive') ? { type: 'inactive', days: Number(k.slice(8)) } : { type: k })

const confirm_ = (m: string) => window.confirm(m)

export default function Marketing() {
  const { has } = useBusiness()
  const qc = useQueryClient()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [create, setCreate] = useState(false)
  const [growth, setGrowth] = useState(false)
  const tab = params.get('tab') === 'links' ? 'links' : 'campaigns'
  const perf = useQuery({ queryKey: ['a-campaigns', '90d'], queryFn: () => api.get<{ rows: CampaignRow[] }>('/analytics/campaigns', { period: '90d' }), enabled: has('marketing') })
  const [f, setF] = useState({ name: '', kind: 'REACTIVATION', message: TEMPLATES.REACTIVATION, aud: 'inactive45' })
  const list = useQuery({ queryKey: ['campaigns'], queryFn: () => api.get<Campaign[]>('/marketing/campaigns'), enabled: has('marketing') })
  const opp = useQuery({ queryKey: ['opportunities'], queryFn: () => api.get<{ buckets: { days: number; count: number }[] }>('/marketing/opportunities'), enabled: has('marketing') })
  const openId = params.get('open')
  const detail = useQuery({ queryKey: ['campaign', openId], queryFn: () => api.get<Detail>(`/marketing/campaigns/${openId}`), enabled: !!openId })
  const inv = () => { for (const k of ['campaigns', 'campaign', 'opportunities']) void qc.invalidateQueries({ queryKey: [k] }) }
  const make = useMutation({ mutationFn: () => api.post<Campaign>('/marketing/campaigns', { name: f.name, kind: f.kind, message_template: f.message, audience: audience(f.aud) }), onSuccess: (c) => { inv(); setCreate(false); setParams({ open: c.id }); toast.ok('Draft created — review it before anything is sent') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  const [confirm, setConfirm] = useState(false)
  const conf = useMutation({ mutationFn: () => api.post(`/marketing/campaigns/${openId}/confirm`), onSuccess: () => { inv(); setConfirm(false); toast.ok('Ready to send. Tap each customer to open WhatsApp.') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  const sent = useMutation({ mutationFn: (mid: string) => api.post(`/marketing/campaigns/${openId}/messages/${mid}/sent`), onSuccess: inv })
  const wa = useQuery({ queryKey: ['wa-status'], queryFn: () => api.get<{ connected: boolean }>('/whatsapp/status'), enabled: !!openId })
  const apiSend = useMutation({ mutationFn: () => api.post<{ sent: number; failed: number; errors: string[] }>(`/whatsapp/campaigns/${openId}/send`), onSuccess: (r) => { inv(); r.failed ? toast.err(`${r.sent} sent, ${r.failed} failed${r.errors[0] ? `: ${r.errors[0]}` : ''}`) : toast.ok(`${r.sent} message(s) sent`) }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Could not send') })
  const cancel = useMutation({ mutationFn: () => api.post(`/marketing/campaigns/${openId}/cancel`), onSuccess: inv })

  if (!has('marketing')) return <div><PageHeader title="Marketing" /><UpgradePrompt feature="marketing campaigns" title="Bring customers back" body="Run WhatsApp campaigns and customer reactivation. Available on Pro and Business." /></div>
  if (list.isLoading) return <PageLoading />
  if (list.error) return <ErrorState message="Couldn't load campaigns." onRetry={() => void list.refetch()} />
  const start = (kind: string, aud: string, name: string) => { setF({ name, kind, message: TEMPLATES[kind], aud }); setCreate(true) }
  const d = detail.data
  const growthOpen = !!openId && list.data?.find((c) => c.id === openId)?.kind === 'GROWTH'

  return (
    <div className="space-y-6">
      <PageHeader title="Marketing" sub="Campaigns to bring customers back. You review everything before it goes out." actions={tab === 'campaigns' && <><Button variant="secondary" onClick={() => start('WHATSAPP', 'all', '')}>WhatsApp broadcast</Button><Button onClick={() => setGrowth(true)}><Plus className="size-4" /> Growth campaign</Button></>} />
      <Tabs value={tab} onChange={(v) => setParams(v === 'links' ? { tab: 'links' } : {})} items={[{ value: 'campaigns', label: 'Campaigns' }, { value: 'links', label: 'Links & QR codes' }]} />
      {tab === 'links' ? <LinksQR /> : <>
      <NotConfigured title="Automatic WhatsApp sending isn't connected" body="Aqivo prepares each message with a WhatsApp link. You tap to send from your own WhatsApp — nothing is sent for you." />
      <Card><CardHeader title="Retention opportunities" sub="Customers by time since their last completed visit" />
        <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">{opp.data?.buckets.map((b) => <button key={b.days} disabled={!b.count} onClick={() => start('REACTIVATION', `inactive${b.days}`, `Come back — ${b.days}+ days`)} className="rounded-xl border border-line p-4 text-left hover:border-ink disabled:opacity-50 disabled:hover:border-line"><p className="text-3xl font-extrabold">{b.count}</p><p className="text-sm text-muted">{b.days}+ days away</p>{!!b.count && <p className="mt-2 text-xs font-bold underline">Create campaign</p>}</button>)}</div></Card>
      <Card><CardHeader title="Campaigns" />
        {!list.data?.length ? <EmptyState icon={<Megaphone className="size-5" />} title="No campaigns yet" body="Create your first campaign — for example a reactivation message to customers who haven't visited in a while." /> : <ul className="divide-y divide-line">{list.data.map((c) => <li key={c.id}><button onClick={() => setParams({ open: c.id })} className="flex w-full flex-wrap items-center gap-3 px-5 py-3.5 text-left hover:bg-paper"><div className="min-w-0 flex-1"><p className="font-bold">{c.name}{c.created_by_ai && <Badge tone="lime"> AI draft</Badge>}</p><p className="text-sm text-muted">{cap(c.kind)} · {c.recipient_count} recipients · {c.sent_count} sent · {relativeTime(c.created_at)}</p></div><StatusBadge status={c.status} /></button></li>)}</ul>}</Card>

      </>}
      <GrowthCampaignModal open={growth} onClose={() => setGrowth(false)} onCreated={(id) => { setGrowth(false); setParams({ open: id }) }} />
      {growthOpen && openId && <GrowthCampaignDetail id={openId} onClose={() => setParams({})} perf={perf.data?.rows.find((r) => r.campaign === list.data?.find((c) => c.id === openId)?.slug)} />}
      <Modal open={create} onClose={() => setCreate(false)} title="New campaign" wide footer={<><Button variant="secondary" onClick={() => setCreate(false)}>Cancel</Button><Button loading={make.isPending} disabled={!f.name.trim() || !f.message.trim()} onClick={() => make.mutate()}>Create draft</Button></>}>
        <div className="space-y-4"><TextField label="Campaign name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Type"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value, message: TEMPLATES[e.target.value] })}>{KINDS.map((k) => <option key={k} value={k}>{cap(k)}</option>)}</Select></Field>
            <Field label="Who receives it"><Select value={f.aud} onChange={(e) => setF({ ...f, aud: e.target.value })}>{Object.entries(AUD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field></div>
          <TextAreaField label="Message" rows={5} maxLength={1000} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} hint="{name}, {business}, {service}, {offer} and {review_link} are filled in for each customer." /></div></Modal>

      <Modal open={!!openId && !growthOpen} onClose={() => setParams({})} title={d?.campaign.name ?? 'Campaign'} wide footer={d && <>{d.campaign.status === 'DRAFT' && <Button onClick={() => setConfirm(true)}>Review & confirm</Button>}{d.campaign.status === 'SCHEDULED' && wa.data?.connected && <Button loading={apiSend.isPending} onClick={() => { if (confirm_(`Send ${d.messages.filter((m) => m.status !== 'SENT').length} message(s) from your WhatsApp number now?`)) apiSend.mutate() }}>Send via my WhatsApp number</Button>}{['DRAFT', 'SCHEDULED'].includes(d.campaign.status) && <Button variant="danger" onClick={() => cancel.mutate()}>Cancel campaign</Button>}</>}>
        {!d ? <PageLoading /> : <div className="space-y-4"><div className="flex items-center gap-2"><StatusBadge status={d.campaign.status} /><span className="text-sm text-muted">{d.messages.length} recipients</span></div>
          {d.campaign.status === 'DRAFT' && <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><Sparkles className="size-4 shrink-0" />This is a draft. Check the messages below, then confirm to get send links.</p>}
          {d.campaign.status === 'SCHEDULED' && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">Ready. Tap “Send on WhatsApp” for each customer — it opens WhatsApp with their message. Then mark it sent.</p>}
          {!d.messages.length && <p className="text-sm text-muted">No customers match this audience yet.</p>}
          <ul className="divide-y divide-line rounded-xl border border-line">{d.messages.map((m) => <li key={m.id} className="space-y-1.5 p-3"><div className="flex items-center justify-between gap-2"><b className="text-sm">{m.recipient_name}</b><StatusBadge status={m.status === 'PREPARED' ? 'DRAFT' : m.status} /></div><p className="text-sm text-muted">{m.body}</p>
            {d.campaign.status !== 'DRAFT' && m.status !== 'SENT' && m.whatsapp_url && <a href={m.whatsapp_url} target="_blank" rel="noreferrer" onClick={() => sent.mutate(m.id)} className="inline-flex h-9 items-center rounded-full bg-[#25D366] px-4 text-sm font-bold text-[#053b1a]">Send on WhatsApp</a>}</li>)}</ul></div>}
      </Modal>
      <ConfirmDialog open={confirm} title="Confirm this campaign?" body={<>You're approving {d?.messages.length} message(s). Aqivo won't send anything itself — you'll get a WhatsApp link per customer.</>} confirmLabel="Confirm" loading={conf.isPending} onConfirm={() => conf.mutate()} onClose={() => setConfirm(false)} />
    </div>
  )
}
