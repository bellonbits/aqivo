import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Download } from 'lucide-react'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, Card, CardHeader, ComingSoon, LinkButton, ConfirmDialog, CopyField, Field, Input, Modal, PageHeader, PageLoading, Select, StatusBadge, TextField } from '@/components/ui'
import { cn } from '@/lib/cn'
import { fmtDate, money } from '@/lib/format'
import type { Plan } from '@/types'

interface SubMe { effective_plan: { key: string; name: string }; subscription: { status: string; plan_key: string; plan_name: string; price: string; currency: string; current_period_end: string | null; trial_ends_at: string | null; cancel_at_period_end: boolean; data_retained_until: string | null } | null; transactions: { id: string; amount: string; currency: string; status: string; created_at: string }[]; providers: { name: string; configured: boolean }[] }

export default function Settings() {
  const { hash } = useLocation()
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }) }, [hash])
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <PlanCard /><UsageCard /><ShareCard /><TeamCard /><DomainsCard /><AccountCard /><SupportCard />
    </div>
  )
}

function PlanCard() {
  const { business, refresh, summary } = useBusiness()
  const qc = useQueryClient()
  const toast = useToast()
  const cur = business?.currency ?? 'KES'
  const plans = useQuery({ queryKey: ['plans', cur], queryFn: () => api.get<Plan[]>('/subscriptions/plans', { currency: cur }) })
  const me = useQuery({ queryKey: ['sub-me'], queryFn: () => api.get<SubMe>('/subscriptions/me') })
  const [pick, setPick] = useState<Plan | null>(null)
  const [phone, setPhone] = useState('')
  const [cancel, setCancel] = useState(false)
  const owner = !!summary?.permissions_all
  const inv = () => { void qc.invalidateQueries({ queryKey: ['sub-me'] }); void refresh() }
  const checkout = useMutation({ mutationFn: () => api.post<{ status: string; message: string }>('/subscriptions/checkout', { plan_key: pick!.key, phone: phone || null }), onSuccess: (r) => { setPick(null); inv(); toast.ok(r.message) }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  const stop = useMutation({ mutationFn: () => api.post<{ message: string }>('/subscriptions/cancel'), onSuccess: (r) => { setCancel(false); inv(); toast.ok(r.message) } })
  const resume = useMutation({ mutationFn: () => api.post('/subscriptions/resume'), onSuccess: inv })
  if (!plans.data || !me.data) return <PageLoading />
  const sub = me.data.subscription
  const mpesa = me.data.providers.find((p) => p.name === 'MPESA')
  return (
    <Card><div id="plan" className="scroll-mt-24" />
      <CardHeader title="Plan & billing" sub={sub ? <span className="flex flex-wrap items-center gap-2"><b>{sub.plan_name}</b> <StatusBadge status={sub.status} />{sub.status === 'TRIAL' && <>ends {fmtDate(sub.trial_ends_at)}</>}{sub.status === 'ACTIVE' && <>{sub.cancel_at_period_end ? 'ends' : 'renews'} {fmtDate(sub.current_period_end)}</>}</span> : 'No subscription'} />
      <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">{plans.data.map((p) => {
        const current = sub?.plan_key === p.key && ['TRIAL', 'ACTIVE', 'PAST_DUE'].includes(sub.status)
        return <div key={p.key} className={cn('flex flex-col rounded-2xl border p-4', current ? 'border-ink ring-1 ring-ink' : 'border-line')}>
          <div className="flex items-center justify-between"><h3 className="text-lg">{p.name}</h3>{current && <Badge tone="lime">Current</Badge>}</div>
          <p className="mt-2 text-2xl font-extrabold">{Number(p.price) > 0 ? money(p.price, p.currency) : 'Free'}<span className="text-xs font-semibold text-muted">{Number(p.price) > 0 ? ' /month' : ''}</span></p>
          <ul className="mt-3 flex-1 space-y-1.5 text-sm">{p.highlights.map((h) => <li key={h} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" />{h}</li>)}</ul>
          {owner && p.key !== 'FREE' && !current && <Button className="mt-4" size="sm" onClick={() => setPick(p)}>{sub?.plan_key === p.key ? 'Renew' : 'Choose'} {p.name}</Button>}</div>
      })}</div>
      <div className="space-y-3 border-t border-line p-5">
        {!mpesa?.configured && <ComingSoon title="Online payment isn't switched on yet" body="Choosing a plan sends an upgrade request to the Aqivo team, who'll help you pay (e.g. M-Pesa) and activate it." />}
        {sub?.status === 'ACTIVE' && owner && (sub.cancel_at_period_end ? <Button variant="secondary" onClick={() => resume.mutate()}>Keep my plan</Button> : <Button variant="danger" size="sm" onClick={() => setCancel(true)}>Cancel plan</Button>)}
        {sub && ['EXPIRED', 'CANCELLED'].includes(sub.status) && <p className="text-sm text-muted">Your data is kept until {fmtDate(sub.data_retained_until)}. Your free profile stays live.</p>}
        {!!me.data.transactions.length && <div><p className="mb-1 text-sm font-bold">Billing history</p><ul className="divide-y divide-line text-sm">{me.data.transactions.map((t) => <li key={t.id} className="flex justify-between py-1.5"><span>{fmtDate(t.created_at)}</span><span>{money(t.amount, t.currency)} <StatusBadge status={t.status} /></span></li>)}</ul></div>}
      </div>
      <Modal open={!!pick} onClose={() => setPick(null)} title={`Upgrade to ${pick?.name}`} footer={<><Button variant="secondary" onClick={() => setPick(null)}>Cancel</Button><Button loading={checkout.isPending} onClick={() => checkout.mutate()}>{mpesa?.configured ? 'Pay with M-Pesa' : 'Send upgrade request'}</Button></>}>
        <p className="text-sm text-muted">{pick && money(pick.price, pick.currency)} per month. Cancel any time — your data is always kept.</p>{mpesa?.configured && <div className="mt-4"><TextField label="M-Pesa phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} hint="You'll get a prompt on your phone to enter your PIN." /></div>}</Modal>
      <ConfirmDialog open={cancel} title="Cancel your plan?" body="Your plan stays active until the end of the period you've paid for. Nothing is deleted, and your free profile stays live." confirmLabel="Cancel plan" danger loading={stop.isPending} onConfirm={() => stop.mutate()} onClose={() => setCancel(false)} />
    </Card>
  )
}

function ShareCard() {
  const { summary, business } = useBusiness()
  const toast = useToast()
  const [qr, setQr] = useState<string | null>(null)
  useEffect(() => { void api.blob('/businesses/me/qr?fmt=png').then((b) => setQr(URL.createObjectURL(b))).catch(() => undefined) }, [])
  const dl = async (fmt: 'png' | 'svg') => { const b = await api.blob(`/businesses/me/qr?fmt=${fmt}`); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${business?.slug}-qr.${fmt}`; a.click() }
  if (!summary) return null
  const u = summary.urls
  const share = `https://wa.me/?text=${encodeURIComponent(`${business?.name}: ${u.profile}`)}`
  return (
    <Card><div id="share" className="scroll-mt-24" /><CardHeader title="Share & QR code" sub="Put it on business cards, posters, shop windows, receipts and packaging." />
      <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto]">
        <div className="space-y-4"><CopyField label="Business link" value={u.profile} onCopied={() => toast.ok('Copied')} />{u.whatsapp && <CopyField label="WhatsApp link" value={u.whatsapp} onCopied={() => toast.ok('Copied')} />}<CopyField label="Booking link" value={u.booking} onCopied={() => toast.ok('Copied')} /><CopyField label="Review link" value={u.review} onCopied={() => toast.ok('Copied')} />
          <a href={share} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-full bg-[#25D366] px-5 text-sm font-bold text-[#053b1a]">Share on WhatsApp</a></div>
        <div className="mx-auto w-48 rounded-2xl border border-line p-3 text-center">{qr ? <img src={qr} alt="QR code" className="w-full" /> : <PageLoading />}<p className="mt-1 text-sm font-bold">Scan to visit</p><p className="text-xs text-muted">{business?.name}</p><div className="mt-2 flex justify-center gap-2"><Button size="sm" variant="secondary" onClick={() => void dl('png')}><Download className="size-3.5" /> PNG</Button><Button size="sm" variant="secondary" onClick={() => void dl('svg')}><Download className="size-3.5" /> SVG</Button></div></div>
      </div>
      {business?.referral_code && <div className="border-t border-line p-5 text-sm"><b>Refer a business</b> — share code <code className="rounded bg-paper px-1.5 py-0.5 font-bold">{business.referral_code}</code>. Referral rewards (free months, credits) will be configured by Aqivo. <Badge>Coming soon</Badge></div>}
    </Card>
  )
}

function TeamCard() {
  const { has, summary } = useBusiness()
  const qc = useQueryClient()
  const toast = useToast()
  const owner = !!summary?.permissions_all
  const q = useQuery({ queryKey: ['members'], queryFn: () => api.get<{ id: string; email: string; full_name: string; role: string }[]>('/businesses/me/members'), enabled: owner })
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ email: '', full_name: '', role: 'STAFF' })
  const [temp, setTemp] = useState<string | null>(null)
  const add = useMutation({ mutationFn: () => api.post<{ temporary_password: string | null }>('/businesses/me/members', f), onSuccess: (r) => { void qc.invalidateQueries({ queryKey: ['members'] }); setTemp(r.temporary_password); setOpen(false) }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  const del = useMutation({ mutationFn: (id: string) => api.del(`/businesses/me/members/${id}`), onSuccess: () => void qc.invalidateQueries({ queryKey: ['members'] }) })
  if (!owner) return null
  return (
    <Card><CardHeader title="Team" sub="Give managers and staff their own login" action={has('staff') ? <Button size="sm" onClick={() => setOpen(true)}>Add member</Button> : <Badge>Business plan</Badge>} />
      <ul className="divide-y divide-line">{q.data?.map((m) => <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span><b>{m.full_name}</b> · {m.email}</span><span className="flex items-center gap-2"><Badge>{m.role.replace('BUSINESS_', '').toLowerCase()}</Badge>{m.role !== 'BUSINESS_OWNER' && <Button size="sm" variant="ghost" onClick={() => del.mutate(m.id)}>Remove</Button>}</span></li>)}</ul>
      {temp && <p className="border-t border-line p-4 text-sm">Temporary password (shown once): <code className="rounded bg-paper px-1.5 py-0.5 font-bold">{temp}</code></p>}
      <Modal open={open} onClose={() => setOpen(false)} title="Add team member" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={add.isPending} disabled={!f.email || !f.full_name} onClick={() => add.mutate()}>Add</Button></>}>
        <div className="space-y-4"><TextField label="Name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /><TextField label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /><Field label="Role"><Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="STAFF">Staff — assigned bookings, customers and orders (view)</option><option value="SALES">Sales — orders, customers, leads and bookings</option><option value="EDITOR">Editor — storefront, products and photos</option><option value="BUSINESS_MANAGER">Manager — everything except billing and team</option><option value="BUSINESS_ADMIN">Admin — manager plus team and payments</option></Select></Field></div></Modal>
    </Card>
  )
}

function DomainsCard() {
  return (
    <Card><CardHeader title="Domains" action={<LinkButton to="/dashboard/seo?tab=domains" variant="secondary" size="sm">Manage domains</LinkButton>} />
      <p className="p-5 text-sm text-muted">Connect your own domain, set your main address, and check your search readiness in <b>Domain &amp; SEO</b>.</p></Card>
  )
}

function UsageCard() {
  const q = useQuery({ queryKey: ['usage'], queryFn: () => api.get<{ plan: { name: string }; usage: Record<string, { used: number; limit: number | null; label: string }> }>('/subscriptions/usage') })
  if (!q.data) return null
  const rows = Object.entries(q.data.usage).filter(([, u]) => u.limit !== null || u.used > 0)
  return (
    <Card><CardHeader title="Plan usage" sub={`What your ${q.data.plan.name} plan includes`} />
      <ul className="grid gap-4 p-5 sm:grid-cols-2">{rows.map(([k, u]) => { const pct = u.limit ? Math.min(100, Math.round((u.used / u.limit) * 100)) : 0; return (
        <li key={k}><div className="flex justify-between text-sm"><span className="font-semibold capitalize">{u.label}</span><span className="text-muted">{u.used}{u.limit === null ? ' · unlimited' : ` / ${u.limit}`}</span></div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line"><div className={cn('h-full rounded-full', pct >= 90 ? 'bg-bad' : pct >= 70 ? 'bg-amber-500' : 'bg-brand')} style={{ width: `${u.limit === null ? 4 : Math.max(pct, u.used ? 3 : 0)}%` }} /></div></li>) })}</ul></Card>
  )
}

function AccountCard() {
  const toast = useToast()
  const [f, setF] = useState({ current: '', next: '' })
  const m = useMutation({ mutationFn: () => api.post('/auth/change-password', { current_password: f.current, new_password: f.next }), onSuccess: () => { setF({ current: '', next: '' }); toast.ok('Password changed') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  return (
    <Card><CardHeader title="Password" /><form className="grid gap-4 p-5 md:grid-cols-3 md:items-end" onSubmit={(e) => { e.preventDefault(); m.mutate() }}>
      <TextField label="Current password" type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /><TextField label="New password" type="password" autoComplete="new-password" minLength={8} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /><Button type="submit" loading={m.isPending} disabled={!f.current || f.next.length < 8}>Change password</Button></form></Card>
  )
}

function SupportCard() {
  const toast = useToast()
  const [s, setS] = useState('')
  const [b, setB] = useState('')
  const m = useMutation({ mutationFn: () => api.post('/support/tickets', undefined, { subject: s, body: b }), onSuccess: () => { setS(''); setB(''); toast.ok("Message sent — we'll get back to you") }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  return (
    <Card><CardHeader title="Contact support" /><div className="space-y-4 p-5"><Field label="Subject"><Input value={s} onChange={(e) => setS(e.target.value)} maxLength={200} /></Field><Field label="How can we help?"><textarea className="w-full rounded-xl border border-line-strong px-3.5 py-2.5" rows={3} value={b} onChange={(e) => setB(e.target.value)} /></Field><Button loading={m.isPending} disabled={!s.trim()} onClick={() => m.mutate()}>Send</Button></div></Card>
  )
}
