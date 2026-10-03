import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileText, Plus, Wallet } from 'lucide-react'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { Button, Card, ComingSoon, EmptyState, ErrorState, Field, Modal, PageHeader, PageLoading, Select, Stat, StatusBadge, Tabs, TextAreaField, TextField, UpgradePrompt, Input } from '@/components/ui'
import { cap, fmtDate, money } from '@/lib/format'
import type { Customer, Invoice, Page, Payment } from '@/types'

interface Summary { currency: string; revenue_total: string; revenue_this_month: string; pending: string; refunded: string; outstanding_invoices: string; transactions: number }
type Tab = 'payments' | 'invoices'

export default function Payments() {
  const { has, business } = useBusiness()
  const qc = useQueryClient()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('payments')
  const [addPay, setAddPay] = useState(false)
  const [addInv, setAddInv] = useState(false)
  const sum = useQuery({ queryKey: ['pay-summary'], queryFn: () => api.get<Summary>('/payments/summary'), enabled: has('customers') })
  const pays = useQuery({ queryKey: ['payments'], queryFn: () => api.get<Payment[]>('/payments'), enabled: has('customers') })
  const invs = useQuery({ queryKey: ['invoices'], queryFn: () => api.get<Invoice[]>('/invoices'), enabled: has('invoices') })
  const inv = () => { for (const k of ['payments', 'invoices', 'pay-summary', 'overview']) void qc.invalidateQueries({ queryKey: [k] }) }
  const status = useMutation({ mutationFn: (v: { id: string; status: string }) => api.patch(`/payments/${v.id}`, { status: v.status }), onSuccess: inv })
  const markPaid = useMutation({ mutationFn: (id: string) => api.post(`/invoices/${id}/mark-paid`), onSuccess: () => { inv(); toast.ok('Invoice marked paid') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  const cur = business?.currency
  const pdf = async (i: Invoice) => { const b = await api.blob(`/invoices/${i.id}/pdf`); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${i.number}.pdf`; a.click() }

  if (!has('customers')) return <div><PageHeader title="Payments" /><UpgradePrompt feature="payment tracking" /></div>
  if (sum.isLoading || pays.isLoading) return <PageLoading />
  if (sum.error || !sum.data) return <ErrorState message="Couldn't load payments." onRetry={() => void sum.refetch()} />
  const s = sum.data

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" sub="Track revenue, payments and what customers still owe you." actions={<><Button variant="secondary" onClick={() => setAddPay(true)}><Plus className="size-4" /> Record payment</Button>{has('invoices') && <Button onClick={() => setAddInv(true)}><FileText className="size-4" /> New invoice</Button>}</>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat tone="lime" label="Revenue this month" value={money(s.revenue_this_month, cur)} /><Stat label="Total revenue" value={money(s.revenue_total, cur)} /><Stat label="Outstanding invoices" value={money(s.outstanding_invoices, cur)} /><Stat label="Transactions" value={s.transactions} /></div>
      <ComingSoon title="M-Pesa collection from your customers" body="For now, record payments as customers pay you (cash, M-Pesa, bank). Aqivo doesn't show payments that didn't happen." />
      <Tabs<Tab> value={tab} onChange={setTab} items={[{ value: 'payments', label: 'Payments' }, { value: 'invoices', label: 'Invoices' }]} />
      {tab === 'payments' && <Card>{!pays.data?.length ? <EmptyState icon={<Wallet className="size-5" />} title="No payments recorded" body="Record a payment when a customer pays you." /> : <ul className="divide-y divide-line">{pays.data.map((p) => <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5"><div className="min-w-0 flex-1"><p className="font-bold">{money(p.amount, p.currency)}</p><p className="text-sm text-muted">{cap(p.method)} · {fmtDate(p.paid_at ?? p.created_at)}{p.provider_reference ? ` · ${p.provider_reference}` : ''}{p.note ? ` · ${p.note}` : ''}</p></div><StatusBadge status={p.status} />{p.status === 'PAID' && <Button size="sm" variant="ghost" onClick={() => status.mutate({ id: p.id, status: 'REFUNDED' })}>Mark refunded</Button>}{p.status === 'PENDING' && <Button size="sm" variant="secondary" onClick={() => status.mutate({ id: p.id, status: 'PAID' })}>Mark paid</Button>}</li>)}</ul>}</Card>}
      {tab === 'invoices' && (has('invoices') ? <Card>{!invs.data?.length ? <EmptyState icon={<FileText className="size-5" />} title="No invoices yet" body="Create a professional PDF invoice for any customer." /> : <ul className="divide-y divide-line">{invs.data.map((i) => <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5"><div className="min-w-0 flex-1"><p className="font-bold">{i.number} · {i.customer_name}</p><p className="text-sm text-muted">{fmtDate(i.issued_on)} · {money(i.total, i.currency)}</p></div><StatusBadge status={i.payment_status} />{i.payment_status !== 'PAID' && <Button size="sm" variant="secondary" onClick={() => markPaid.mutate(i.id)}>Mark paid</Button>}<Button size="sm" variant="ghost" aria-label={`Download ${i.number}`} onClick={() => void pdf(i)}><Download className="size-4" /> PDF</Button></li>)}</ul>}</Card> : <UpgradePrompt feature="invoices" title="Invoices are on Pro" body="Generate PDF invoices with discounts and tax on Pro and Business." />)}
      <PaymentModal open={addPay} onClose={() => setAddPay(false)} onDone={inv} />
      <InvoiceModal open={addInv} onClose={() => setAddInv(false)} onDone={inv} />
    </div>
  )
}

function PaymentModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const { business } = useBusiness()
  const [f, setF] = useState({ amount: '', method: 'CASH', ref: '', note: '' })
  const m = useMutation({ mutationFn: () => api.post('/payments', { amount: String(Number(f.amount)), method: f.method, provider_reference: f.ref || null, note: f.note }), onSuccess: () => { onDone(); onClose(); setF({ amount: '', method: 'CASH', ref: '', note: '' }); toast.ok('Payment recorded') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  return <Modal open={open} onClose={onClose} title="Record a payment" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={m.isPending} disabled={!f.amount} onClick={() => m.mutate()}>Save</Button></>}>
    <div className="space-y-4"><TextField label={`Amount (${business?.currency})`} type="number" inputMode="decimal" min={0} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
      <Field label="Method"><Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{['CASH', 'MPESA', 'CARD', 'BANK', 'OTHER'].map((x) => <option key={x} value={x}>{cap(x)}</option>)}</Select></Field>
      <TextField label="Reference (e.g. M-Pesa code)" value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} /><TextAreaField label="Note" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div></Modal>
}

function InvoiceModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const { business } = useBusiness()
  const customers = useQuery({ queryKey: ['customers', ''], queryFn: () => api.get<Page<Customer>>('/customers', { limit: 200 }), enabled: open })
  const [cid, setCid] = useState('')
  const [name, setName] = useState('')
  const [items, setItems] = useState([{ description: '', quantity: '1', price: '' }])
  const [discount, setDiscount] = useState('0')
  const [tax, setTax] = useState(false)
  const m = useMutation({ mutationFn: () => api.post('/invoices', { customer_id: cid || null, customer_name: name || null, items: items.filter((i) => i.description && i.price).map((i) => ({ description: i.description, quantity: Number(i.quantity) || 1, unit_price: String(Number(i.price)) })), discount: String(Number(discount) || 0), apply_tax: tax }), onSuccess: () => { onDone(); onClose(); toast.ok('Invoice created') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  return <Modal open={open} onClose={onClose} title="New invoice" wide footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={m.isPending} disabled={(!cid && !name.trim()) || !items.some((i) => i.description && i.price)} onClick={() => m.mutate()}>Create invoice</Button></>}>
    <div className="space-y-4"><Field label="Customer"><Select value={cid} onChange={(e) => setCid(e.target.value)}><option value="">Someone else…</option>{customers.data?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      {!cid && <TextField label="Customer name" value={name} onChange={(e) => setName(e.target.value)} />}
      <div className="space-y-2"><p className="text-sm font-semibold">Items</p>{items.map((it, i) => <div key={i} className="grid grid-cols-[1fr_64px_100px] gap-2"><Input aria-label="Description" placeholder="Description" value={it.description} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} /><Input aria-label="Quantity" type="number" min={1} value={it.quantity} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} /><Input aria-label={`Price (${business?.currency})`} type="number" min={0} placeholder="Price" value={it.price} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} /></div>)}<Button size="sm" variant="secondary" onClick={() => setItems([...items, { description: '', quantity: '1', price: '' }])}><Plus className="size-4" /> Add line</Button></div>
      <div className="grid grid-cols-2 gap-3"><TextField label="Discount" type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} /><label className="mt-7 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-4 accent-ink" checked={tax} onChange={(e) => setTax(e.target.checked)} /> Add VAT for my country</label></div></div></Modal>
}
