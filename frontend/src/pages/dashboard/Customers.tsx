import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Phone, Plus, Search, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { Button, Card, EmptyState, ErrorState, Input, LinkButton, Modal, PageHeader, PageLoading, Spinner, StatusBadge, TextAreaField, TextField, UpgradePrompt } from '@/components/ui'
import { fmtDate, initials, money, relativeTime } from '@/lib/format'
import type { Booking, Customer, Page, TimelineEvent } from '@/types'

interface Detail { customer: Customer; notes: { id: string; kind: string; body: string; created_at: string }[]; bookings: Booking[] }

export default function Customers() {
  const { has, business, summary } = useBusiness()
  const qc = useQueryClient()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [add, setAdd] = useState(false)
  const [f, setF] = useState({ name: '', phone: '', email: '', notes: '' })
  const list = useQuery({ queryKey: ['customers', q], queryFn: () => api.get<Page<Customer>>('/customers', { q, limit: 100 }), enabled: has('customers') })
  const inactive = useQuery({ queryKey: ['inactive', 45], queryFn: () => api.get<{ count: number }>('/customers/inactive', { days: 45 }), enabled: has('customers') })
  const create = useMutation({ mutationFn: () => api.post('/customers', { name: f.name, phone: f.phone || null, email: f.email || null, notes: f.notes }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['customers'] }); setAdd(false); setF({ name: '', phone: '', email: '', notes: '' }); toast.ok('Customer added') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })

  if (!has('customers')) return <div><PageHeader title="Customers" /><UpgradePrompt feature="customer management" body="Remember every customer's visits, spend and favourite services. Available on Grow and above." /></div>
  if (list.isLoading) return <PageLoading />
  if (list.error) return <ErrorState message="Couldn't load customers." onRetry={() => void list.refetch()} />
  const cur = business?.currency

  return (
    <div>
      <PageHeader title="Customers" sub={`${list.data?.total ?? 0} customers`} actions={summary?.role !== 'STAFF' && <Button onClick={() => setAdd(true)}><Plus className="size-4" /> Add customer</Button>} />
      {!!inactive.data?.count && has('marketing') && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-lime px-5 py-4 text-lime-ink"><p className="font-bold">{inactive.data.count} customers haven't visited in 45+ days.</p><LinkButton to="/dashboard/marketing" variant="dark" size="sm">Create reactivation campaign</LinkButton></div>)}
      <div className="relative mb-4"><Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted" /><Input aria-label="Search customers" placeholder="Search by name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" /></div>
      <Card>
        {!list.data?.items.length ? <EmptyState icon={<Users className="size-5" />} title={q ? 'No matches' : 'No customers yet'} body={q ? 'Try a different search.' : 'Customers appear when someone books online, or when you convert a lead or add them yourself.'} /> : (
          <ul className="divide-y divide-line">{list.data.items.map((c) => (
            <li key={c.id}><button onClick={() => setOpen(c.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-paper md:px-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lime text-sm font-extrabold text-lime-ink">{initials(c.name)}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-bold">{c.name}</span><span className="block truncate text-sm text-muted">{c.phone ?? c.email ?? '—'} · {c.completed_bookings} visit{c.completed_bookings === 1 ? '' : 's'}{c.last_visit ? ` · last ${fmtDate(c.last_visit, { day: 'numeric', month: 'short' })}` : ''}</span></span>
              <span className="text-right font-extrabold">{money(c.total_spent, cur)}</span></button></li>))}</ul>)}
      </Card>
      <CustomerModal id={open} onClose={() => setOpen(null)} />
      <Modal open={add} onClose={() => setAdd(false)} title="Add customer" footer={<><Button variant="secondary" onClick={() => setAdd(false)}>Cancel</Button><Button loading={create.isPending} disabled={!f.name.trim()} onClick={() => create.mutate()}>Add</Button></>}>
        <div className="space-y-4"><TextField label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><TextField label="Phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /><TextField label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /><TextAreaField label="Notes" rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      </Modal>
    </div>
  )
}

function CustomerModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient()
  const { business } = useBusiness()
  const toast = useToast()
  const [note, setNote] = useState('')
  const q = useQuery({ queryKey: ['customer', id], queryFn: () => api.get<Detail>(`/customers/${id}`), enabled: !!id })
  const addNote = useMutation({ mutationFn: (kind: string) => api.post(`/customers/${id}/notes`, { kind, body: note }), onSuccess: () => { setNote(''); void qc.invalidateQueries({ queryKey: ['customer', id] }) }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  const tl = useQuery({ queryKey: ['customer-timeline', id], queryFn: () => api.get<{ events: TimelineEvent[] }>(`/customers/${id}/timeline`), enabled: !!id })
  const c = q.data?.customer
  return (
    <Modal open={!!id} onClose={onClose} title={c?.name ?? 'Customer'} wide>
      {!c ? <div className="grid place-items-center py-10"><Spinner /></div> : (
        <div className="space-y-5">
          <p className="text-sm text-muted">Customer since {fmtDate(c.created_at, { month: 'long', year: 'numeric' })}</p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Bookings', c.total_bookings], ['Total spent', money(c.total_spent, business?.currency)], ['Last visit', c.last_visit ? fmtDate(c.last_visit) : '—'], ['Next booking', c.next_booking ? fmtDate(c.next_booking) : '—'], ['Favourite service', c.favourite_service ?? '—'], ['Last contacted', c.last_contacted_at ? fmtDate(c.last_contacted_at) : '—'], ['Phone', c.phone ?? '—'], ['Email', c.email ?? '—']].map(([k, v]) => <div key={k as string} className="rounded-xl bg-paper p-3"><dt className="text-xs font-semibold text-muted">{k}</dt><dd className="mt-0.5 break-words text-sm font-extrabold">{v}</dd></div>)}</dl>
          {c.phone && <div className="flex gap-2"><a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" onClick={() => { setNote('Messaged on WhatsApp'); }} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-bold text-[#053b1a]"><MessageCircle className="size-4" /> WhatsApp</a><a href={`tel:${c.phone}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong bg-white px-4 text-sm font-bold"><Phone className="size-4" /> Call</a></div>}
          {c.acquisition_source && <p className="rounded-xl bg-paper p-3 text-sm">Came from <b>{c.acquisition_source}</b>{c.acquisition_campaign ? <> · campaign <b>{c.acquisition_campaign}</b></> : null}{c.total_orders ? <> · {c.total_orders} order{c.total_orders === 1 ? '' : 's'}</> : null}</p>}
          <div><h3 className="mb-2 text-sm">Timeline</h3>
            <ol className="space-y-3 border-l-2 border-line pl-4">{tl.data?.events.slice(0, 40).map((e, i) => <li key={i} className="relative text-sm"><span className="absolute -left-[22px] top-1.5 size-2.5 rounded-full bg-brand" /><b>{e.title}</b>{e.detail && <span className="block text-muted">{e.detail}</span>}<span className="block text-xs text-muted">{fmtDate(e.at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></li>)}{tl.isLoading && <li className="text-sm text-muted">Loading…</li>}</ol></div>
          <div><h3 className="mb-2 text-sm">Notes & communication</h3>
            <div className="flex gap-2"><Input aria-label="Add a note" placeholder="Add a note or log a conversation" value={note} onChange={(e) => setNote(e.target.value)} /><Button variant="secondary" disabled={!note.trim()} loading={addNote.isPending} onClick={() => addNote.mutate('NOTE')}>Add</Button></div>
            <ul className="mt-3 space-y-2">{q.data?.notes.map((n) => <li key={n.id} className="rounded-xl bg-paper p-3 text-sm"><span className="mr-2 text-xs font-bold text-muted">{n.kind} · {relativeTime(n.created_at)}</span>{n.body}</li>)}{!q.data?.notes.length && <li className="text-sm text-muted">No notes yet.</li>}</ul></div>
          <div><h3 className="mb-2 text-sm">Booking history</h3>
            <ul className="divide-y divide-line rounded-xl border border-line">{q.data?.bookings.map((b) => <li key={b.id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm"><span>{fmtDate(b.starts_at)} · {b.items.map((i) => i.name).join(', ')}</span><span className="flex items-center gap-2"><b>{money(b.total_amount, b.currency)}</b><StatusBadge status={b.status} /></span></li>)}{!q.data?.bookings.length && <li className="px-3 py-3 text-sm text-muted">No bookings yet.</li>}</ul></div>
        </div>)}
    </Modal>
  )
}
