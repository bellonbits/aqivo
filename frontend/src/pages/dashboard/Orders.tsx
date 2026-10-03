import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ExternalLink, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageLoading, Select, Tabs, TextAreaField, TextField } from '@/components/ui'
import { fmtDateTime, money, relativeTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Order, Page, Product, Service, Variant } from '@/types'

const STATUS_LABEL: Record<string, string> = { PENDING: 'New', CONFIRMED: 'Confirmed', PREPARING: 'Preparing', READY: 'Ready', COMPLETED: 'Completed', CANCELLED: 'Cancelled', REFUNDED: 'Refunded' }
const STATUS_TONE: Record<string, 'warn' | 'info' | 'ok' | 'neutral' | 'bad'> = { PENDING: 'warn', CONFIRMED: 'info', PREPARING: 'info', READY: 'info', COMPLETED: 'ok', CANCELLED: 'neutral', REFUNDED: 'neutral' }
const PAY_LABEL: Record<string, string> = { UNPAID: 'Unpaid', PENDING: 'Awaiting check', PAID: 'Paid', REFUNDED: 'Refunded' }
const PAY_TONE: Record<string, 'warn' | 'ok' | 'neutral' | 'bad'> = { UNPAID: 'bad', PENDING: 'warn', PAID: 'ok', REFUNDED: 'neutral' }
const METHOD_LABEL: Record<string, string> = { CASH: 'Cash on delivery / pickup', MPESA: 'M-Pesa', BANK: 'Bank transfer', WHATSAPP: 'Arranged on WhatsApp' }
const NEXT: Record<string, string[]> = { PENDING: ['CONFIRMED'], CONFIRMED: ['PREPARING', 'READY', 'COMPLETED'], PREPARING: ['READY', 'COMPLETED'], READY: ['COMPLETED'], COMPLETED: [], CANCELLED: [], REFUNDED: [] }
const NEXT_LABEL: Record<string, string> = { CONFIRMED: 'Confirm order', PREPARING: 'Start preparing', READY: 'Mark ready', COMPLETED: 'Mark completed' }

type OrdersRes = Page<Order> & { counts: Record<string, number> }

export default function Orders() {
  const { summary } = useBusiness()
  const [tab, setTab] = useState('')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const canWrite = !!summary && (summary.permissions_all || ['BUSINESS_MANAGER', 'BUSINESS_ADMIN', 'SALES'].includes(summary.role))
  const list = useQuery({ queryKey: ['orders', tab, q], queryFn: () => api.get<OrdersRes>('/orders', { status: tab || undefined, q: q || undefined, limit: 100 }), refetchInterval: 30_000 })
  const sum = useQuery({ queryKey: ['orders-summary'], queryFn: () => api.get<{ orders_30d: number; paid_revenue_30d: number; pending: number; currency: string }>('/orders/summary') })
  if (list.isLoading) return <PageLoading />
  if (list.error || !list.data) return <ErrorState message="Couldn't load your orders." onRetry={() => void list.refetch()} />
  const c = list.data.counts
  const total = Object.values(c).reduce((a, b) => a + b, 0)
  const items = list.data.items
  return (
    <div>
      <PageHeader title="Orders" sub="Orders from your storefront and the ones you record yourself." actions={canWrite && <Button onClick={() => setCreating(true)}><Plus className="size-4" /> Create order</Button>} />
      {sum.data && <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs font-semibold text-muted">New orders</p><p className="text-2xl font-extrabold">{sum.data.pending}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold text-muted">Orders, 30 days</p><p className="text-2xl font-extrabold">{sum.data.orders_30d}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold text-muted">Paid, 30 days</p><p className="text-2xl font-extrabold">{money(sum.data.paid_revenue_30d, sum.data.currency)}</p></Card>
      </div>}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Tabs value={tab} onChange={setTab} items={[{ value: '', label: 'All', count: total }, ...['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'REFUNDED'].map((s) => ({ value: s, label: STATUS_LABEL[s], count: c[s] ?? 0 }))]} />
        <div className="relative ml-auto w-56"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input aria-label="Search orders" placeholder="Name, phone or #" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" /></div>
      </div>
      <Card>
        {items.length === 0 ? <EmptyState icon={<ShoppingBag className="size-5" />} title={q || tab ? 'No orders match' : 'No orders yet'} body={q || tab ? 'Try another filter.' : 'Orders will appear here when customers buy from your store.'} /> : (
          <ul className="divide-y divide-line">{items.map((o) => (
            <li key={o.id}><button onClick={() => setOpen(o.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-paper md:px-5">
              <span className="w-16 shrink-0 font-extrabold">#{o.number}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-bold">{o.customer_name}</span><span className="block truncate text-xs text-muted">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')} · {relativeTime(o.created_at)}</span></span>
              <span className="hidden gap-1.5 sm:flex"><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge><Badge tone={PAY_TONE[o.payment_status]}>{PAY_LABEL[o.payment_status]}</Badge></span>
              <span className="shrink-0 font-extrabold">{money(o.total, o.currency)}</span>
            </button></li>))}</ul>)}
      </Card>
      <OrderDrawer id={open} onClose={() => setOpen(null)} canWrite={canWrite} />
      <CreateOrder open={creating} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setOpen(id) }} />
    </div>
  )
}

function OrderDrawer({ id, onClose, canWrite }: { id: string | null; onClose: () => void; canWrite: boolean }) {
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: ['order', id], queryFn: () => api.get<Order>(`/orders/${id}`), enabled: !!id })
  const [note, setNote] = useState('')
  const [ref, setRef] = useState('')
  const [confirm, setConfirm] = useState<'CANCELLED' | 'REFUND' | null>(null)
  const done = (o: Order) => { qc.setQueryData(['order', o.id], o); void qc.invalidateQueries({ queryKey: ['orders'] }); void qc.invalidateQueries({ queryKey: ['orders-summary'] }); void qc.invalidateQueries({ queryKey: ['products'] }); void qc.invalidateQueries({ queryKey: ['inventory'] }) }
  const err = (e: unknown) => toast.err(e instanceof Error ? e.message : 'Something went wrong')
  const status = useMutation({ mutationFn: (s: string) => api.patch<Order>(`/orders/${id}/status`, { status: s }), onSuccess: (o) => { done(o); setConfirm(null); toast.ok('Order updated') }, onError: err })
  const paid = useMutation({ mutationFn: () => api.post<Order>(`/orders/${id}/payment`, { reference: ref || undefined }), onSuccess: (o) => { done(o); setRef(''); toast.ok('Marked as paid') }, onError: err })
  const refund = useMutation({ mutationFn: () => api.post<Order>(`/orders/${id}/refund`, { restock: true }), onSuccess: (o) => { done(o); setConfirm(null); toast.ok('Order refunded') }, onError: err })
  const [cr, setCr] = useState<{ name: string; phone: string; url: string } | null>(null)
  const courier = useMutation({ mutationFn: (v: { name: string; phone: string; url: string }) => api.patch<Order>(`/orders/${id}/delivery`, { courier_name: v.name, courier_phone: v.phone, tracking_url: v.url }), onSuccess: (o) => { done(o); setCr(null); toast.ok('Delivery details saved') }, onError: err })
  const addNote = useMutation({ mutationFn: () => api.post<Order>(`/orders/${id}/note`, { message: note }), onSuccess: (o) => { done(o); setNote('') }, onError: err })
  const o = q.data
  return (
    <Modal open={!!id} onClose={onClose} wide title={o ? `Order #${o.number}` : 'Order'}>
      {!o ? <PageLoading /> : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2"><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge><Badge tone={PAY_TONE[o.payment_status]}>{PAY_LABEL[o.payment_status]}</Badge><span className="text-sm text-muted">{fmtDateTime(o.created_at)} · {o.channel === 'WHATSAPP' ? 'Taken by you' : 'Online'}{o.source ? ` · from ${o.source}` : ''}</span></div>
          {canWrite && (NEXT[o.status].length > 0 || o.status === 'PENDING') && <div className="flex flex-wrap gap-2">
            {NEXT[o.status].map((s, i) => <Button key={s} variant={i === 0 ? 'primary' : 'secondary'} size="sm" loading={status.isPending && status.variables === s} onClick={() => status.mutate(s)}>{NEXT_LABEL[s]}</Button>)}
            {!['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status) && <Button variant="danger" size="sm" onClick={() => setConfirm('CANCELLED')}>Cancel order</Button>}
          </div>}
          {canWrite && o.status === 'COMPLETED' && <Button variant="danger" size="sm" onClick={() => setConfirm('REFUND')}>Refund order</Button>}

          <section><h3 className="mb-2 text-sm font-bold">Items</h3>
            <ul className="divide-y divide-line rounded-xl bg-white/70 ring-1 ring-line">{o.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 p-3">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-line text-sm font-bold text-muted">{i.image_url ? <img src={i.image_url} alt="" className="size-full object-cover" /> : i.name[0]}</div>
                <div className="min-w-0 flex-1"><p className="truncate font-bold">{i.name}</p><p className="text-xs text-muted">{i.variant_title ? `${i.variant_title} · ` : ''}{i.quantity} × {money(i.unit_price, o.currency)}</p></div>
                <p className="font-bold">{money(i.line_total, o.currency)}</p></li>))}</ul>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(o.subtotal, o.currency)}</dd></div>
              {Number(o.discount) > 0 && <div className="flex justify-between"><dt className="text-muted">Discount {o.discount_code && `(${o.discount_code})`}</dt><dd>−{money(o.discount, o.currency)}</dd></div>}
              {o.delivery_method === 'DELIVERY' && <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{Number(o.delivery_fee) > 0 ? money(o.delivery_fee, o.currency) : 'Free'}</dd></div>}
              {Number(o.tax) > 0 && <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd>{money(o.tax, o.currency)}</dd></div>}
              <div className="flex justify-between border-t border-line pt-2 text-base font-extrabold"><dt>Total</dt><dd>{money(o.total, o.currency)}</dd></div>
            </dl></section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-xl bg-white/70 p-3.5 ring-1 ring-line"><h3 className="mb-1 text-sm font-bold">Customer</h3><p className="font-semibold">{o.customer_name}</p>
              {o.customer_phone && <p className="text-sm"><a className="underline" href={`https://wa.me/${o.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{o.customer_phone} <ExternalLink className="inline size-3" /></a></p>}
              {o.customer_email && <p className="text-sm text-muted">{o.customer_email}</p>}{o.scheduled_for && <p className="mt-2 text-sm"><b>Wants it:</b> {o.scheduled_for.replace('T', ' ')}</p>}{o.notes && <p className="mt-2 text-sm italic text-muted">“{o.notes}”</p>}</section>
            <section className="rounded-xl bg-white/70 p-3.5 ring-1 ring-line"><h3 className="mb-1 text-sm font-bold">{o.delivery_method === 'DELIVERY' ? 'Delivery' : 'Pickup'}</h3>
              <p className="text-sm">{o.delivery_method === 'DELIVERY' ? <>{o.delivery_zone && <b>{o.delivery_zone} — </b>}{o.address}</> : 'Customer collects the order.'}</p></section>
          </div>

          <section className="rounded-xl bg-white/70 p-3.5 ring-1 ring-line"><h3 className="mb-1 text-sm font-bold">Payment — {METHOD_LABEL[o.payment_method] ?? o.payment_method}</h3>
            {o.payment_reference && <p className="text-sm">Customer's code: <b className="font-mono">{o.payment_reference}</b> <span className="text-muted">— check it in your M-Pesa / bank before confirming.</span></p>}
            {canWrite && o.payment_status !== 'PAID' && !['CANCELLED', 'REFUNDED'].includes(o.status) && (
              <div className="mt-2 flex flex-wrap items-end gap-2"><div className="w-48"><Field label="Reference (optional)"><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="M-Pesa code" /></Field></div><Button size="sm" loading={paid.isPending} onClick={() => paid.mutate()}><Check className="size-4" /> Mark as paid</Button></div>)}
          </section>

          {o.delivery_method === 'DELIVERY' && !['CANCELLED', 'REFUNDED'].includes(o.status) && (
            <section className="rounded-xl bg-white/70 p-3.5 ring-1 ring-line"><h3 className="mb-1 text-sm font-bold">Rider / courier</h3>
              {!cr ? <div className="flex flex-wrap items-center gap-3 text-sm">{o.courier_name || o.tracking_url ? <p>{o.courier_name}{o.courier_phone ? ` · ${o.courier_phone}` : ''}{o.tracking_url && <> · <a className="underline" href={o.tracking_url} target="_blank" rel="noreferrer">tracking link</a></>}</p> : <p className="text-muted">No rider assigned yet. The customer sees these details on their order page.</p>}
                {canWrite && <Button size="sm" variant="secondary" onClick={() => setCr({ name: o.courier_name ?? '', phone: o.courier_phone ?? '', url: o.tracking_url ?? '' })}>{o.courier_name ? 'Change' : 'Assign rider'}</Button>}</div>
              : <div className="grid gap-2 sm:grid-cols-3"><Field label="Name"><Input value={cr.name} onChange={(e) => setCr({ ...cr, name: e.target.value })} placeholder="Peter (boda)" /></Field><Field label="Phone"><Input value={cr.phone} onChange={(e) => setCr({ ...cr, phone: e.target.value })} inputMode="tel" /></Field><Field label="Tracking link (https)"><Input value={cr.url} onChange={(e) => setCr({ ...cr, url: e.target.value })} placeholder="optional" /></Field>
                <div className="flex gap-2 sm:col-span-3"><Button size="sm" loading={courier.isPending} onClick={() => courier.mutate(cr)}>Save</Button><Button size="sm" variant="secondary" onClick={() => setCr(null)}>Cancel</Button></div></div>}
            </section>)}

          <section><h3 className="mb-2 text-sm font-bold">Timeline</h3>
            <ol className="space-y-3 border-l-2 border-line pl-4">{[...o.events].reverse().map((e) => (
              <li key={e.id} className="relative text-sm"><span className={cn('absolute -left-[22px] top-1.5 size-2.5 rounded-full', e.kind === 'PAYMENT' ? 'bg-ok' : e.kind === 'NOTE' ? 'bg-muted' : 'bg-brand')} />{e.message}<span className="block text-xs text-muted">{fmtDateTime(e.created_at)}{e.kind === 'NOTE' ? ' · private note' : ''}</span></li>))}</ol>
            {canWrite && <div className="mt-3 flex gap-2"><Input aria-label="Private note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a private note" maxLength={300} /><Button variant="secondary" disabled={!note.trim()} loading={addNote.isPending} onClick={() => addNote.mutate()}>Add</Button></div>}
          </section>
        </div>)}
      <ConfirmDialog open={confirm === 'CANCELLED'} title="Cancel this order?" body="Items return to stock and the customer is told if they gave an email. If they already paid, you'll need to refund them yourself." confirmLabel="Cancel order" danger loading={status.isPending} onConfirm={() => status.mutate('CANCELLED')} onClose={() => setConfirm(null)} />
      <ConfirmDialog open={confirm === 'REFUND'} title="Refund this order?" body="The order is marked refunded and items return to stock. Send the money back through M-Pesa, your bank or cash — Aqivo doesn't move it for you." confirmLabel="Mark refunded" danger loading={refund.isPending} onConfirm={() => refund.mutate()} onClose={() => setConfirm(null)} />
    </Modal>
  )
}

interface Line { key: string; kind: 'product' | 'service'; id: string; variant_id: string | null; qty: number; label: string }
function CreateOrder({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [lines, setLines] = useState<Line[]>([])
  const [f, setF] = useState({ name: '', phone: '', payment: 'cash', delivery_method: 'PICKUP', address: '', notes: '' })
  const [pick, setPick] = useState({ ref: '', variant: '' })
  const products = useQuery({ queryKey: ['products', 'all-active'], queryFn: () => api.get<Page<Product>>('/products', { status: 'ACTIVE', limit: 200 }), enabled: open })
  const services = useQuery({ queryKey: ['services'], queryFn: () => api.get<Service[]>('/services'), enabled: open })
  const chosen = products.data?.items.find((p) => `p:${p.id}` === pick.ref)
  const variants = useQuery({ queryKey: ['variants', chosen?.id], queryFn: () => api.get<Variant[]>(`/products/${chosen!.id}/variants`), enabled: !!chosen && chosen.variant_count > 0 })
  const create = useMutation({
    mutationFn: () => api.post<Order>('/orders', { lines: lines.map((l) => ({ kind: l.kind, id: l.id, variant_id: l.variant_id, qty: l.qty })), ...f, address: f.delivery_method === 'DELIVERY' ? f.address : '' }),
    onSuccess: (o) => { void qc.invalidateQueries({ queryKey: ['orders'] }); void qc.invalidateQueries({ queryKey: ['products'] }); setLines([]); setF({ name: '', phone: '', payment: 'cash', delivery_method: 'PICKUP', address: '', notes: '' }); onCreated(o.id); toast.ok(`Order #${o.number} created`) },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Could not create order'),
  })
  const add = () => {
    if (!pick.ref) return
    const [kind, id] = pick.ref.split(':')
    if (kind === 'p') {
      const p = products.data!.items.find((x) => x.id === id)!
      if (p.variant_count > 0 && !pick.variant) return toast.err('Choose an option first')
      const v = variants.data?.find((x) => x.id === pick.variant)
      const key = `p:${id}:${pick.variant}`
      setLines((ls) => ls.some((l) => l.key === key) ? ls.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l)) : [...ls, { key, kind: 'product', id, variant_id: pick.variant || null, qty: 1, label: `${p.name}${v ? ` – ${v.title}` : ''}` }])
    } else {
      const s = services.data!.find((x) => x.id === id)!
      const key = `s:${id}:`
      setLines((ls) => ls.some((l) => l.key === key) ? ls.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l)) : [...ls, { key, kind: 'service', id, variant_id: null, qty: 1, label: s.name }])
    }
    setPick({ ref: '', variant: '' })
  }
  return (
    <Modal open={open} onClose={onClose} wide title="Create order" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.isPending} disabled={!lines.length || !f.name.trim() || !f.phone.trim()} onClick={() => create.mutate()}>Create order</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-muted">Record an order taken by phone, WhatsApp or in person. Prices, stock and discounts follow the same rules as your website.</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1"><Field label="Add an item"><Select value={pick.ref} onChange={(e) => setPick({ ref: e.target.value, variant: '' })}><option value="">Choose…</option>
            {products.data?.items.length ? <optgroup label="Products">{products.data.items.map((p) => <option key={p.id} value={`p:${p.id}`}>{p.name}</option>)}</optgroup> : null}
            {services.data?.length ? <optgroup label="Services">{services.data.map((s) => <option key={s.id} value={`s:${s.id}`}>{s.name}</option>)}</optgroup> : null}</Select></Field></div>
          {chosen && chosen.variant_count > 0 && <div className="w-40"><Field label="Option"><Select value={pick.variant} onChange={(e) => setPick({ ...pick, variant: e.target.value })}><option value="">Choose…</option>{variants.data?.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}</Select></Field></div>}
          <Button variant="secondary" onClick={add} disabled={!pick.ref}><Plus className="size-4" /> Add</Button>
        </div>
        {lines.length > 0 && <ul className="divide-y divide-line rounded-xl bg-white/70 ring-1 ring-line">{lines.map((l) => (
          <li key={l.key} className="flex items-center gap-2 p-2.5 text-sm"><span className="min-w-0 flex-1 truncate font-semibold">{l.label}</span>
            <Input aria-label={`Quantity of ${l.label}`} type="number" min={1} max={99} value={l.qty} onChange={(e) => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, qty: Math.max(1, Math.min(99, Number(e.target.value) || 1)) } : x)))} className="h-9 w-20" />
            <button aria-label={`Remove ${l.label}`} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="grid size-8 place-items-center rounded-full text-bad hover:bg-red-50"><Trash2 className="size-4" /></button></li>))}</ul>}
        <div className="grid grid-cols-2 gap-3"><TextField label="Customer name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><TextField label="Phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Handover"><Select value={f.delivery_method} onChange={(e) => setF({ ...f, delivery_method: e.target.value })}><option value="PICKUP">Pickup</option><option value="DELIVERY">Delivery</option></Select></Field>
          <Field label="Payment"><Select value={f.payment} onChange={(e) => setF({ ...f, payment: e.target.value })}><option value="cash">Cash / on collection</option><option value="mpesa">M-Pesa</option><option value="bank">Bank transfer</option><option value="whatsapp">Arranged on WhatsApp</option></Select></Field>
        </div>
        {f.delivery_method === 'DELIVERY' && <TextAreaField label="Delivery address" rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />}
        <TextAreaField label="Notes (optional)" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </div>
    </Modal>
  )
}
