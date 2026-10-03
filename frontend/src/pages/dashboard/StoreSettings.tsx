import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, Card, CardHeader, ErrorState, Field, PageHeader, PageLoading, Select, TextAreaField, TextField } from '@/components/ui'
import { Toggle } from '@/features/website/SectionForm'
import type { StoreSettings as S } from '@/types'

interface Res { settings: S; payment_options: { key: string; label: string }[]; online_providers: { name: string; connected: boolean }[]; gateways: { key: string; label: string; connected: boolean }[]; whatsapp_connected: boolean; online_gateway: string | null; currency: string }

export default function StoreSettings() {
  const qc = useQueryClient()
  const toast = useToast()
  const { summary } = useBusiness()
  const canWrite = !!summary && (summary.permissions_all || ['BUSINESS_MANAGER', 'BUSINESS_ADMIN'].includes(summary.role))
  const q = useQuery({ queryKey: ['store-settings'], queryFn: () => api.get<Res>('/store/settings') })
  const [s, setS] = useState<S | null>(null)
  useEffect(() => { if (q.data) setS(q.data.settings) }, [q.data])
  const save = useMutation({
    mutationFn: (v: S) => api.patch('/store/settings', { settings: { tax_rate: v.tax_rate, tax_inclusive: v.tax_inclusive, min_order: v.min_order, require_email: v.require_email, fulfilment: v.fulfilment, delivery: v.delivery, payments: v.payments, online_gateway: v.online_gateway ?? '', wa_order_updates: v.wa_order_updates ?? true,
      mpesa_number: v.mpesa_number, mpesa_kind: v.mpesa_kind, bank_details: v.bank_details, pickup_note: v.pickup_note, thank_you: v.thank_you } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['store-settings'] }); toast.ok('Checkout settings saved') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Could not save'),
  })
  if (q.isLoading || !s) return <PageLoading />
  if (q.error || !q.data) return <ErrorState message="Couldn't load your settings." onRetry={() => void q.refetch()} />
  const cur = q.data.currency
  const set = (patch: Partial<S>) => setS({ ...s, ...patch })
  const d = s.delivery
  const num = (v: string) => (v === '' ? 0 : Number(v))
  return (
    <div className="space-y-6">
      <PageHeader title="Checkout & delivery" sub="How customers receive and pay for orders. Prices, delivery fees and discounts are always calculated on our side."
        actions={canWrite && <Button loading={save.isPending} onClick={() => save.mutate(s)}>Save changes</Button>} />
      <Card>
        <CardHeader title="Delivery & pickup" />
        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2"><Toggle label="Pickup" hint="Customers collect from you." checked={s.fulfilment.pickup} onChange={(v) => set({ fulfilment: { ...s.fulfilment, pickup: v } })} /><Toggle label="Delivery" hint="You bring it to them." checked={s.fulfilment.delivery} onChange={(v) => set({ fulfilment: { ...s.fulfilment, delivery: v } })} /></div>
          <TextField label="Pickup instructions" value={s.pickup_note} maxLength={200} onChange={(e) => set({ pickup_note: e.target.value })} placeholder="Ask for Mary at the front desk" />
          {s.fulfilment.delivery && <>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField label={`Standard fee (${cur})`} type="number" min={0} value={d.flat_fee} onChange={(e) => set({ delivery: { ...d, flat_fee: num(e.target.value) } })} hint="Used when you have no areas below." />
              <TextField label={`Free delivery over (${cur})`} type="number" min={0} value={d.free_over ?? ''} onChange={(e) => set({ delivery: { ...d, free_over: e.target.value === '' ? null : Number(e.target.value) } })} hint="Optional" />
              <TextField label="Delivery time" value={d.estimate} maxLength={80} onChange={(e) => set({ delivery: { ...d, estimate: e.target.value } })} placeholder="Same day in Nairobi" />
            </div>
            <div className="space-y-2"><p className="text-sm font-bold">Delivery areas <span className="font-medium text-muted">— optional, each with its own fee</span></p>
              {d.zones.map((z, i) => (
                <div key={i} className="flex items-center gap-2"><TextField label="" aria-label="Area name" placeholder="Westlands" value={z.name} maxLength={80} onChange={(e) => set({ delivery: { ...d, zones: d.zones.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) } })} />
                  <div className="w-32 shrink-0"><TextField label="" aria-label="Area fee" type="number" min={0} value={z.fee} onChange={(e) => set({ delivery: { ...d, zones: d.zones.map((x, j) => (j === i ? { ...x, fee: num(e.target.value) } : x)) } })} /></div>
                  <button aria-label="Remove area" onClick={() => set({ delivery: { ...d, zones: d.zones.filter((_, j) => j !== i) } })} className="grid size-9 shrink-0 place-items-center rounded-full text-bad hover:bg-red-50"><Trash2 className="size-4" /></button></div>))}
              <Button size="sm" variant="secondary" onClick={() => set({ delivery: { ...d, zones: [...d.zones, { name: '', fee: 0 }] } })}><Plus className="size-4" /> Add area</Button></div>
            <p className="text-xs text-muted">Courier integrations aren’t connected yet — you arrange delivery yourself and update the order status.</p>
          </>}
        </div>
      </Card>
      <Card>
        <CardHeader title="Payment options" sub="Customers choose one at checkout. You confirm each payment on the order." />
        <div className="space-y-3 p-5">
          <Toggle label="Pay on delivery / pickup" checked={s.payments.cash} onChange={(v) => set({ payments: { ...s.payments, cash: v } })} />
          <Toggle label="M-Pesa" hint="Customers pay your till, paybill or phone and send you the code." checked={s.payments.mpesa} onChange={(v) => set({ payments: { ...s.payments, mpesa: v } })} />
          {s.payments.mpesa && <div className="grid gap-3 sm:grid-cols-2"><Field label="Type"><Select value={s.mpesa_kind} onChange={(e) => set({ mpesa_kind: e.target.value as S['mpesa_kind'] })}><option value="TILL">Buy Goods till</option><option value="PAYBILL">Paybill</option><option value="SEND">Send money (phone)</option></Select></Field><TextField label="Number" inputMode="numeric" value={s.mpesa_number} onChange={(e) => set({ mpesa_number: e.target.value })} hint="Not shown to customers until it's filled in." /></div>}
          <Toggle label="Bank transfer" checked={s.payments.bank} onChange={(v) => set({ payments: { ...s.payments, bank: v } })} />
          {s.payments.bank && <TextAreaField label="Bank details" rows={3} maxLength={400} value={s.bank_details} onChange={(e) => set({ bank_details: e.target.value })} placeholder={'Bank: …\nAccount name: …\nAccount number: …'} />}
          <Toggle label="Arrange on WhatsApp" hint="No payment is requested online; you sort it out in chat." checked={s.payments.whatsapp} onChange={(v) => set({ payments: { ...s.payments, whatsapp: v } })} />
          <div className="space-y-3 rounded-xl bg-white/60 p-3 ring-1 ring-line"><p className="text-sm font-bold">Online payments</p>
            {(() => { const g = (k: string) => q.data.gateways.find((x) => x.key === k); const card = q.data.gateways.filter((x) => x.key !== 'daraja'); const anyCard = card.some((x) => x.connected)
              return (<>
                <Toggle label="Card & mobile money checkout" hint={anyCard ? 'Customers are sent to your provider’s secure page; the order is confirmed automatically when they pay.' : 'Switch on after connecting Paystack or Flutterwave — customers only see it once a provider is connected.'} checked={!!s.payments.online} onChange={(v) => set({ payments: { ...s.payments, online: v } })} />
                {anyCard && card.filter((x) => x.connected).length > 1 && <Field label="Provider to use"><Select value={s.online_gateway ?? q.data.online_gateway ?? ''} onChange={(e) => set({ online_gateway: e.target.value })}>{card.filter((x) => x.connected).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</Select></Field>}
                <Toggle label="M-Pesa prompt (STK push)" hint={g('daraja')?.connected ? (cur === 'KES' ? 'The customer gets a PIN prompt on their phone.' : 'Only available for stores priced in KES.') : 'Connect your Daraja account first — hidden from customers until then.'} checked={!!s.payments.mpesa_stk} onChange={(v) => set({ payments: { ...s.payments, mpesa_stk: v } })} />
                <div className="flex flex-wrap items-center gap-1.5">{q.data.gateways.map((x) => <Badge key={x.key} tone={x.connected ? 'ok' : 'neutral'}>{x.label.split(' (')[0]} · {x.connected ? 'connected' : 'not connected'}</Badge>)}
                  <Link to="/dashboard/connections" className="ml-1 text-xs font-bold underline">Manage connections</Link></div>
                <p className="text-xs text-muted">Not available yet: {q.data.online_providers.map((p) => p.name).join(', ')}.</p></>) })()}
          </div>
          <div className="space-y-2 rounded-xl bg-white/60 p-3 ring-1 ring-line"><p className="text-sm font-bold">WhatsApp order updates</p>
            <Toggle label="Message customers when their order status changes" hint={q.data.whatsapp_connected ? 'Sent from your own WhatsApp number. Outside WhatsApp’s 24-hour window this uses your approved order template.' : 'Connect your WhatsApp Business number first — nothing is sent until then.'} checked={s.wa_order_updates !== false} onChange={(v) => set({ wa_order_updates: v })} /></div>
        </div>
      </Card>
      <Card>
        <CardHeader title="Tax & checkout rules" />
        <div className="space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-3"><TextField label="Tax rate (%)" type="number" min={0} max={40} value={s.tax_rate} onChange={(e) => set({ tax_rate: num(e.target.value) })} hint="0 = no tax line" />
            <Field label="Prices"><Select value={s.tax_inclusive ? 'in' : 'ex'} onChange={(e) => set({ tax_inclusive: e.target.value === 'in' })}><option value="in">Include tax</option><option value="ex">Exclude tax (added at checkout)</option></Select></Field>
            <TextField label={`Minimum order (${cur})`} type="number" min={0} value={s.min_order ?? ''} onChange={(e) => set({ min_order: e.target.value === '' ? null : Number(e.target.value) })} hint="Optional" /></div>
          <Toggle label="Require email at checkout" hint="Otherwise a phone number is enough." checked={s.require_email} onChange={(v) => set({ require_email: v })} />
          <TextField label="Thank-you message" value={s.thank_you} maxLength={300} onChange={(e) => set({ thank_you: e.target.value })} placeholder="Thank you! We'll confirm your order shortly." />
        </div>
      </Card>
    </div>
  )
}
