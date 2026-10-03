import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Inbox, MessageCircle, Plus, Phone, UserPlus } from 'lucide-react'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { Button, Card, EmptyState, ErrorState, Modal, PageHeader, PageLoading, Select, StatusBadge, Tabs, TextAreaField, TextField, UpgradePrompt } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { cap, relativeTime } from '@/lib/format'
import type { Lead, Page } from '@/types'

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'BOOKED', 'CONVERTED', 'LOST']
const SOURCES = ['WEBSITE', 'WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'PHONE', 'WALK_IN', 'REFERRAL', 'QR', 'OTHER']
const waLink = (phone: string, name: string) => `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${name.split(' ')[0]}, thanks for getting in touch!`)}`

export default function Leads() {
  const qc = useQueryClient()
  const toast = useToast()
  const { has } = useBusiness()
  const [status, setStatus] = useState('ALL')
  const [add, setAdd] = useState(false)
  const [f, setF] = useState({ name: '', phone: '', message: '', source: 'WHATSAPP' })
  const list = useQuery({ queryKey: ['leads', status], queryFn: () => api.get<Page<Lead>>('/leads', { status: status === 'ALL' ? undefined : status, limit: 100 }), enabled: has('leads') })
  const counts = useQuery({ queryKey: ['lead-counts'], queryFn: () => api.get<Record<string, number>>('/leads/counts'), enabled: has('leads') })
  const inv = () => { void qc.invalidateQueries({ queryKey: ['leads'] }); void qc.invalidateQueries({ queryKey: ['lead-counts'] }); void qc.invalidateQueries({ queryKey: ['overview'] }) }
  const upd = useMutation({ mutationFn: (v: { id: string; status: string }) => api.patch(`/leads/${v.id}`, { status: v.status }), onSuccess: inv, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  const convert = useMutation({ mutationFn: (id: string) => api.post(`/leads/${id}/convert`), onSuccess: () => { inv(); void qc.invalidateQueries({ queryKey: ['customers'] }); toast.ok('Added to your customers') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  const create = useMutation({ mutationFn: () => api.post('/leads', { name: f.name, phone: f.phone || null, message: f.message, source: f.source }), onSuccess: () => { inv(); setAdd(false); setF({ name: '', phone: '', message: '', source: 'WHATSAPP' }) }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })

  if (!has('leads')) return <div><PageHeader title="Leads" /><UpgradePrompt feature="leads" title="Turn enquiries into customers" body="The lead inbox collects website enquiries and booking requests in one place. Available on Grow and above." /></div>
  if (list.isLoading) return <PageLoading />
  if (list.error) return <ErrorState message={list.error instanceof ApiError ? list.error.message : 'Failed to load'} onRetry={() => void list.refetch()} />
  const c = counts.data ?? {}
  const total = Object.values(c).reduce((a, b) => a + b, 0)

  return (
    <div>
      <PageHeader title="Leads" sub={c.NEW ? `${c.NEW} new — reply while they're still interested.` : 'Every enquiry and booking request lands here.'} actions={<Button onClick={() => setAdd(true)}><Plus className="size-4" /> Add lead</Button>} />
      <div className="mb-4"><Tabs value={status} onChange={setStatus} items={[{ value: 'ALL', label: 'All', count: total }, ...STATUSES.map((s) => ({ value: s, label: cap(s), count: c[s] ?? 0 }))]} /></div>
      <Card>
        {list.data?.items.length === 0 ? <EmptyState icon={<Inbox className="size-5" />} title="No leads here yet" body="When a customer sends an enquiry or requests a booking on your website, it appears here. You can also log leads from Instagram or phone calls yourself." /> : (
          <ul className="divide-y divide-line">{list.data?.items.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-4 md:px-5">
              <div className="min-w-0 flex-1 basis-56"><p className="font-bold">{l.name}</p><p className="truncate text-sm text-muted">{l.service_name ?? 'General enquiry'} · {cap(l.source)} · {relativeTime(l.created_at)}</p>{l.message && <p className="mt-1 line-clamp-2 text-sm">{l.message}</p>}</div>
              <div className="flex items-center gap-2">
                <Select aria-label={`Status for ${l.name}`} value={l.status} onChange={(e) => upd.mutate({ id: l.id, status: e.target.value })} className="h-9 w-36 rounded-full py-0 text-sm">{STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}</Select>
                {l.phone && <><a aria-label={`WhatsApp ${l.name}`} href={waLink(l.phone, l.name)} target="_blank" rel="noreferrer" onClick={() => l.status === 'NEW' && upd.mutate({ id: l.id, status: 'CONTACTED' })} className="grid size-9 place-items-center rounded-full bg-[#25D366] text-[#053b1a]"><MessageCircle className="size-4" /></a><a aria-label={`Call ${l.name}`} href={`tel:${l.phone}`} className="grid size-9 place-items-center rounded-full bg-white ring-1 ring-line-strong"><Phone className="size-4" /></a></>}
                {l.status !== 'CONVERTED' && <Button size="sm" variant="secondary" loading={convert.isPending && convert.variables === l.id} onClick={() => convert.mutate(l.id)}><UserPlus className="size-4" /><span className="hidden sm:inline">Make customer</span></Button>}
                <StatusBadge status={l.status} />
              </div>
            </li>))}</ul>
        )}
      </Card>
      <Modal open={add} onClose={() => setAdd(false)} title="Add a lead" footer={<><Button variant="secondary" onClick={() => setAdd(false)}>Cancel</Button><Button loading={create.isPending} disabled={!f.name.trim()} onClick={() => create.mutate()}>Add lead</Button></>}>
        <div className="space-y-4"><TextField label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><TextField label="Phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <div><label className="mb-1.5 block text-sm font-semibold">Source</label><Select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>{SOURCES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}</Select></div>
          <TextAreaField label="What do they want?" rows={3} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></div>
      </Modal>
    </div>
  )
}
