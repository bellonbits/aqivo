import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Check, MessageCircle, Plus, Star, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { Button, Card, EmptyState, ErrorState, Field, Modal, PageHeader, PageLoading, Select, Stat, StatusBadge, Tabs, TextField, UpgradePrompt } from '@/components/ui'
import { fmtDate, fmtTime, money } from '@/lib/format'
import type { Booking, Customer, Page, Service } from '@/types'

type View = 'upcoming' | 'today' | 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
interface Overview { today: number; upcoming: number; pending: number; completed: number; cancelled: number; no_show: number }

export default function Bookings() {
  const { has, business, summary } = useBusiness()
  const qc = useQueryClient()
  const toast = useToast()
  const [view, setView] = useState<View>('upcoming')
  const [add, setAdd] = useState(false)
  const tz = business?.timezone
  const ov = useQuery({ queryKey: ['bookings-overview'], queryFn: () => api.get<Overview>('/bookings/overview'), enabled: has('bookings') })
  const range = useMemo(() => {
    const now = new Date(); const start = new Date(now); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 1)
    if (view === 'today') return { start: start.toISOString(), end: end.toISOString() }
    if (view === 'upcoming') return { start: start.toISOString(), status: undefined as string | undefined }
    return { status: view }
  }, [view])
  const list = useQuery({ queryKey: ['bookings', view], queryFn: () => api.get<Page<Booking>>('/bookings', { ...range, limit: 200, order: ['PENDING', 'upcoming', 'today'].includes(view) ? 'asc' : 'desc' }), enabled: has('bookings') })
  const inv = () => { void qc.invalidateQueries({ queryKey: ['bookings'] }); void qc.invalidateQueries({ queryKey: ['bookings-overview'] }); void qc.invalidateQueries({ queryKey: ['overview'] }) }
  const setStatus = useMutation({ mutationFn: (v: { id: string; status: string }) => api.patch(`/bookings/${v.id}`, { status: v.status }), onSuccess: inv, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  const askReview = useMutation({ mutationFn: (id: string) => api.post<{ whatsapp_url: string | null }>('/reviews/requests', { booking_id: id }), onSuccess: (r) => { inv(); if (r.whatsapp_url) window.open(r.whatsapp_url, '_blank') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })

  if (!has('bookings')) return <div><PageHeader title="Bookings" /><UpgradePrompt feature="online bookings" body="Let customers pick a service and a time on your website. Available on Grow and above." /></div>
  if (list.isLoading) return <PageLoading />
  if (list.error) return <ErrorState message="Couldn't load bookings." onRetry={() => void list.refetch()} />

  const groups = new Map<string, Booking[]>()
  for (const b of list.data?.items ?? []) { const k = fmtDate(b.starts_at, { weekday: 'long', day: 'numeric', month: 'long' }); groups.set(k, [...(groups.get(k) ?? []), b]) }
  const canWrite = summary?.role !== undefined
  const o = ov.data

  return (
    <div>
      <PageHeader title="Bookings" actions={canWrite && <Button onClick={() => setAdd(true)}><Plus className="size-4" /> New booking</Button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Today" value={o?.today ?? '—'} /><Stat label="Upcoming" value={o?.upcoming ?? '—'} /><Stat label="Waiting to confirm" value={o?.pending ?? '—'} /><Stat label="Completed" value={o?.completed ?? '—'} /></div>
      <div className="mb-4"><Tabs<View> value={view} onChange={setView} items={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'today', label: 'Today', count: o?.today }, { value: 'PENDING', label: 'Pending', count: o?.pending }, { value: 'COMPLETED', label: 'Completed' }, { value: 'CANCELLED', label: 'Cancelled' }, { value: 'NO_SHOW', label: 'No-show' }]} /></div>
      {!groups.size ? <Card><EmptyState icon={<CalendarDays className="size-5" />} title="No bookings here" body="Booking requests from your website appear here. You can also add a booking yourself for walk-ins and phone calls." /></Card> : (
        <div className="space-y-5">{[...groups].map(([day, items]) => (
          <section key={day}><h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{day}</h2>
            <Card><ul className="divide-y divide-line">{items.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-4 md:px-5">
                <div className="w-16 shrink-0 text-lg font-extrabold">{fmtTime(b.starts_at, tz)}</div>
                <div className="min-w-0 flex-1 basis-48"><p className="font-bold">{b.customer_name}</p><p className="truncate text-sm text-muted">{b.items.map((i) => i.name).join(', ')} · {money(b.total_amount, b.currency)}</p>{b.notes && <p className="text-sm">“{b.notes}”</p>}</div>
                <StatusBadge status={b.status} />
                <div className="flex gap-1.5">
                  {b.customer_phone && <a aria-label={`WhatsApp ${b.customer_name}`} href={`https://wa.me/${b.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="grid size-9 place-items-center rounded-full bg-[#25D366] text-[#053b1a]"><MessageCircle className="size-4" /></a>}
                  {b.status === 'PENDING' && <Button size="sm" onClick={() => setStatus.mutate({ id: b.id, status: 'CONFIRMED' })}><Check className="size-4" /> Confirm</Button>}
                  {(b.status === 'PENDING' || b.status === 'CONFIRMED') && <><Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: b.id, status: 'COMPLETED' })}>Complete</Button><Button size="sm" variant="ghost" aria-label="No-show" onClick={() => setStatus.mutate({ id: b.id, status: 'NO_SHOW' })}>No-show</Button><Button size="sm" variant="danger" aria-label="Cancel booking" onClick={() => setStatus.mutate({ id: b.id, status: 'CANCELLED' })}><X className="size-4" /></Button></>}
                  {b.status === 'COMPLETED' && !b.review_requested_at && has('reviews') && <Button size="sm" variant="secondary" loading={askReview.isPending && askReview.variables === b.id} onClick={() => askReview.mutate(b.id)}><Star className="size-4" /> Ask for review</Button>}
                </div></li>))}</ul></Card></section>))}</div>)}
      <NewBooking open={add} onClose={() => setAdd(false)} onDone={inv} />
    </div>
  )
}

function NewBooking({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const { business } = useBusiness()
  const services = useQuery({ queryKey: ['services'], queryFn: () => api.get<Service[]>('/services'), enabled: open })
  const customers = useQuery({ queryKey: ['customers', ''], queryFn: () => api.get<Page<Customer>>('/customers', { limit: 200 }), enabled: open })
  const [cid, setCid] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [sid, setSid] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [any, setAny] = useState(false)
  const create = useMutation({
    mutationFn: () => api.post('/bookings', { service_ids: [sid], starts_at: new Date(`${date}T${time}`).toISOString(), customer_id: cid || null, customer_name: name || null, customer_phone: phone || null, ignore_availability: any }),
    onSuccess: () => { onDone(); onClose(); toast.ok('Booking added') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed'),
  })
  return (
    <Modal open={open} onClose={onClose} title="New booking" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} disabled={!sid || !date || (!cid && !name.trim())} onClick={() => create.mutate()}>Add booking</Button></>}>
      <div className="space-y-4">
        <Field label="Service"><Select value={sid} onChange={(e) => setSid(e.target.value)}><option value="">Choose…</option>{services.data?.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.name} — {money(s.price, business?.currency)}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-3"><TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /><TextField label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        <Field label="Existing customer"><Select value={cid} onChange={(e) => setCid(e.target.value)}><option value="">New customer…</option>{customers.data?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        {!cid && <div className="grid grid-cols-2 gap-3"><TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} /><TextField label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={any} onChange={(e) => setAny(e.target.checked)} /> Ignore opening hours and existing bookings (owner only)</label>
      </div>
    </Modal>
  )
}
