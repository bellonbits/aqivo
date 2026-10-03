import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, LayoutTemplate } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, Field, Modal, PageLoading, Select, TextAreaField, TextField } from '@/components/ui'
import { TargetPicker } from './LinksQR'
import { money } from '@/lib/format'
import type { Campaign, CampaignRow, Discount, LinkTargets } from '@/types'

const OBJECTIVES: [string, string][] = [['SALES', 'Sell products'], ['BOOKINGS', 'Get bookings'], ['LEADS', 'Get enquiries'], ['REVIEWS', 'Collect reviews'], ['WINBACK', 'Win customers back'], ['AWARENESS', 'Get found']]
const CHANNELS: [string, string][] = [['instagram', 'Instagram'], ['whatsapp', 'WhatsApp'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['google', 'Google Business'], ['website', 'Website banner'], ['qr', 'QR poster']]

export function GrowthCampaignModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const targets = useQuery({ queryKey: ['link-targets'], queryFn: () => api.get<LinkTargets>('/marketing/link-targets'), enabled: open })
  const codes = useQuery({ queryKey: ['discounts'], queryFn: () => api.get<Discount[]>('/discounts'), enabled: open })
  const [f, setF] = useState({ name: '', objective: 'SALES', offer: '', code: '', type: 'storefront', ref: '', channels: ['instagram', 'whatsapp'] as string[], starts: '', ends: '', audience: 'none' })
  const make = useMutation({
    mutationFn: () => api.post<Campaign>('/marketing/growth-campaigns', { name: f.name, objective: f.objective, offer_text: f.offer, discount_code: f.code || null, target_type: f.type, target_ref: f.ref || null, channels: f.channels, starts_on: f.starts || null, ends_on: f.ends || null,
      audience: f.audience === 'none' ? null : f.audience.startsWith('inactive') ? { type: 'inactive', days: Number(f.audience.slice(8)) } : { type: f.audience } }),
    onSuccess: (c) => { void qc.invalidateQueries({ queryKey: ['campaigns'] }); onCreated(c.id); toast.ok('Campaign draft created') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Could not create the campaign'),
  })
  const toggle = (k: string) => setF((s) => ({ ...s, channels: s.channels.includes(k) ? s.channels.filter((x) => x !== k) : [...s.channels, k] }))
  return (
    <Modal open={open} onClose={onClose} wide title="New growth campaign" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={make.isPending} disabled={!f.name.trim() || !f.channels.length || (['product', 'service', 'category', 'collection', 'page'].includes(f.type) && !f.ref)} onClick={() => make.mutate()}>Create draft</Button></>}>
      {!targets.data ? <PageLoading /> : (
        <div className="space-y-4">
          <p className="text-sm text-muted">One offer, promoted on several channels. You get ready-to-post copy and a tracked link for each, so you can see which one brings customers.</p>
          <TextField label="Campaign name" value={f.name} maxLength={160} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Scarf week" />
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Goal"><Select value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })}>{OBJECTIVES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field label="Discount code (optional)"><Select value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })}><option value="">None</option>{codes.data?.filter((d) => d.is_active).map((d) => <option key={d.id} value={d.code}>{d.code}</option>)}</Select></Field></div>
          <TextAreaField label="The offer, in your words" rows={2} maxLength={300} value={f.offer} onChange={(e) => setF({ ...f, offer: e.target.value })} placeholder="Silk scarves, 10% off this week" hint="I won't invent prices or discounts — what you write here is what the posts say." />
          <TargetPicker targets={targets.data} type={f.type} refId={f.ref} onType={(v) => setF({ ...f, type: v })} onRef={(v) => setF({ ...f, ref: v })} />
          <div><p className="mb-2 text-sm font-bold">Channels</p><div className="flex flex-wrap gap-2">{CHANNELS.map(([k, l]) => <button key={k} type="button" aria-pressed={f.channels.includes(k)} onClick={() => toggle(k)} className={`h-9 rounded-full px-4 text-sm font-bold ${f.channels.includes(k) ? 'btn-brand' : 'bg-white/80 ring-1 ring-line'}`}>{l}</button>)}</div></div>
          <div className="grid gap-3 sm:grid-cols-2"><TextField label="Starts" type="date" value={f.starts} onChange={(e) => setF({ ...f, starts: e.target.value })} /><TextField label="Ends" type="date" value={f.ends} onChange={(e) => setF({ ...f, ends: e.target.value })} /></div>
          {f.channels.includes('whatsapp') && <Field label="Also prepare WhatsApp messages for"><Select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}><option value="none">Nobody — I'll post it myself</option><option value="all">All customers with a phone number</option><option value="inactive45">Customers away 45+ days</option><option value="inactive90">Customers away 90+ days</option></Select></Field>}
        </div>)}
    </Modal>
  )
}

export function GrowthCampaignDetail({ id, onClose, perf }: { id: string; onClose: () => void; perf?: CampaignRow }) {
  const toast = useToast()
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['campaigns'], queryFn: () => api.get<Campaign[]>('/marketing/campaigns') })
  const c = list.data?.find((x) => x.id === id)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState('')
  useEffect(() => setEdits({}), [id])
  const save = useMutation({ mutationFn: () => api.patch<Campaign>(`/marketing/growth-campaigns/${id}`, { content: Object.fromEntries(Object.entries(edits).map(([k, v]) => [k, { text: v }])) }), onSuccess: () => { setEdits({}); void qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.ok('Copy saved') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Could not save') })
  const banner = useMutation({ mutationFn: () => api.post<{ message: string }>(`/marketing/growth-campaigns/${id}/website-banner`), onSuccess: (r) => toast.ok(r.message), onError: (e) => toast.err(e instanceof Error ? e.message : 'Could not add the banner') })
  const copy = (k: string, text: string) => { void navigator.clipboard.writeText(text); setCopied(k); setTimeout(() => setCopied(''), 1200) }
  return (
    <Modal open onClose={onClose} wide title={c?.name ?? 'Campaign'} footer={c && <>{Object.keys(edits).length > 0 && <Button loading={save.isPending} onClick={() => save.mutate()}>Save copy</Button>}{c.channels?.includes('website') && <Button variant="secondary" loading={banner.isPending} onClick={() => banner.mutate()}><LayoutTemplate className="size-4" /> Add banner to storefront</Button>}</>}>
      {!c ? <PageLoading /> : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">{c.created_by_ai && <Badge tone="lime">Drafted by Aqivo AI</Badge>}{c.discount_code && <Badge>Code {c.discount_code}</Badge>}{c.starts_on && <span className="text-sm text-muted">{c.starts_on}{c.ends_on ? ` → ${c.ends_on}` : ''}</span>}</div>
          {c.offer_text && <p className="text-lg font-bold">{c.offer_text}</p>}
          {perf && <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">{[['Visitors', perf.visitors], ['Enquiries', perf.leads], ['Orders', perf.orders], ['Bookings', perf.bookings], ['Tracked revenue', money(perf.revenue)]].map(([k, v]) => <div key={k as string} className="rounded-xl bg-paper p-3"><dt className="text-xs font-semibold text-muted">{k}</dt><dd className="text-lg font-extrabold">{v}</dd></div>)}</dl>}
          <div className="space-y-4">{Object.entries(c.content ?? {}).map(([ch, v]) => (
            <section key={ch} className="rounded-2xl bg-white/80 p-4 ring-1 ring-line">
              <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold">{v.label}</h3><span className="text-xs text-muted">{v.source === 'llm' ? 'AI-polished' : v.source === 'owner' ? 'Edited by you' : 'Template'}</span></div>
              <TextAreaField label="" aria-label={`${v.label} copy`} rows={ch === 'qr' || ch === 'website' ? 1 : 4} value={edits[ch] ?? v.text} onChange={(e) => setEdits({ ...edits, [ch]: e.target.value })} />
              <div className="mt-2 flex flex-wrap items-center gap-2"><Button size="sm" variant="secondary" onClick={() => copy(ch, edits[ch] ?? v.text)}>{copied === ch ? <Check className="size-4" /> : <Copy className="size-4" />} Copy text</Button>
                <Button size="sm" variant="secondary" onClick={() => copy(`${ch}-l`, v.link)}>{copied === `${ch}-l` ? <Check className="size-4" /> : <Copy className="size-4" />} Copy tracked link</Button></div>
              <p className="mt-2 truncate text-xs text-muted">{v.link}</p>
            </section>))}</div>
          <p className="text-xs text-muted">Nothing is posted for you. Copy each post to the channel yourself — the links carry the tracking.</p>
        </div>)}
    </Modal>
  )
}
