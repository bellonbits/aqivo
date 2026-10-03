import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, Card, CardHeader, CopyField, EmptyState, Field, Input, Modal, PageHeader, PageLoading, Select, Stat, StatusBadge, Tabs, TextAreaField, TextField } from '@/components/ui'
import { cap, fmtDate, money, relativeTime } from '@/lib/format'
import type { Business, CountryConfig } from '@/types'

interface Dash { total_businesses: number; active_businesses: number; trial_businesses: number; cancelled_businesses: number; past_due: number; suspended: number; mrr: Record<string, number>; new_registrations_30d: number; websites_live: number; bookings_total: number; leads_total: number; open_tickets: number; sales_pipeline: Record<string, number> }

export function AdminDashboard() {
  const q = useQuery({ queryKey: ['admin-dash'], queryFn: () => api.get<Dash>('/admin/dashboard') })
  if (!q.data) return <PageLoading />
  const d = q.data
  const mrr = Object.entries(d.mrr)
  return (
    <div className="space-y-6"><PageHeader title="Overview" actions={<Link to="/admin/businesses/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white"><Plus className="size-4" /> Create business</Link>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat tone="lime" label="MRR" value={mrr.length ? mrr.map(([c, v]) => money(v, c)).join(' · ') : '—'} sub="Active paid subscriptions" /><Stat label="Total businesses" value={d.total_businesses} /><Stat label="Active" value={d.active_businesses} /><Stat label="On trial" value={d.trial_businesses} />
        <Stat label="Cancelled / expired" value={d.cancelled_businesses} /><Stat label="Past due" value={d.past_due} /><Stat label="New (30 days)" value={d.new_registrations_30d} /><Stat label="Websites live" value={d.websites_live} />
        <Stat label="Bookings" value={d.bookings_total} /><Stat label="Leads" value={d.leads_total} /><Stat label="Open tickets" value={d.open_tickets} /><Stat label="Suspended" value={d.suspended} /></div>
      <Card><CardHeader title="Sales pipeline" action={<Link className="text-sm font-bold underline" to="/admin/sales">Open CRM</Link>} /><div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 lg:grid-cols-7">{Object.entries(d.sales_pipeline).map(([k, v]) => <div key={k} className="rounded-xl bg-paper p-3"><p className="text-xs font-semibold text-muted">{cap(k)}</p><p className="text-2xl font-extrabold">{v}</p></div>)}</div></Card>
    </div>
  )
}

export function AdminBusinesses() {
  const [q, setQ] = useState('')
  const list = useQuery({ queryKey: ['admin-biz', q], queryFn: () => api.get<{ items: Row[]; total: number }>('/admin/businesses', { q, limit: 100 }) })
  interface Row { id: string; name: string; slug: string; city: string; status: string; is_demo: boolean; plan: string | null; subscription_status: string | null; owner_email: string | null; website_status: string | null; created_at: string }
  return (
    <div><PageHeader title="Businesses" sub={`${list.data?.total ?? 0} total`} actions={<Link to="/admin/businesses/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white"><Plus className="size-4" /> Create business</Link>} />
      <Input aria-label="Search businesses" className="mb-4" placeholder="Search name, link or city" value={q} onChange={(e) => setQ(e.target.value)} />
      <Card>{!list.data ? <PageLoading /> : !list.data.items.length ? <EmptyState title="No businesses" /> : <ul className="divide-y divide-line">{list.data.items.map((b) => <li key={b.id}><Link to={`/admin/businesses/${b.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-paper"><div className="min-w-0 flex-1 basis-56"><p className="font-bold">{b.name} {b.is_demo && <Badge>demo</Badge>}</p><p className="truncate text-sm text-muted">/{b.slug} · {b.owner_email ?? 'no owner'} · {b.city}</p></div><Badge>{b.plan ?? '—'}</Badge>{b.subscription_status && <StatusBadge status={b.subscription_status} />}{b.status === 'SUSPENDED' && <StatusBadge status="SUSPENDED" />}<StatusBadge status={b.website_status ?? 'DRAFT'} /></Link></li>)}</ul>}</Card></div>
  )
}

export function AdminNewBusiness() {
  const nav = useNavigate()
  const toast = useToast()
  const cfg = useQuery({ queryKey: ['config'], queryFn: () => api.get<{ countries: CountryConfig[] }>('/businesses/config'), staleTime: Infinity })
  const tpls = useQuery({ queryKey: ['templates'], queryFn: () => api.get<{ key: string; name: string }[]>('/templates') })
  const [f, setF] = useState({ name: '', owner_name: '', owner_email: '', phone: '', whatsapp: '', city: '', country_code: 'KE', category: 'Beauty Salon', template_key: 'beauty_studio_01', plan_key: 'GROW', trial: false, description: '' })
  const [created, setCreated] = useState<{ business: Business; owner_email: string; temporary_password: string | null; urls: { profile: string } } | null>(null)
  const m = useMutation({ mutationFn: () => api.post<NonNullable<typeof created>>('/admin/businesses', { ...f, phone: f.phone || null, whatsapp: f.whatsapp || null }), onSuccess: setCreated, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }))
  if (created) return (
    <div className="mx-auto max-w-xl space-y-4"><PageHeader title="Business created" sub={`${created.business.name} is ready. Next: add services and photos, then publish.`} />
      <Card className="space-y-4 p-5"><CopyField label="Owner login" value={created.owner_email} onCopied={() => toast.ok('Copied')} />{created.temporary_password && <CopyField label="Temporary password (shown once)" value={created.temporary_password} onCopied={() => toast.ok('Copied')} />}<CopyField label="Business link" value={created.urls.profile} onCopied={() => toast.ok('Copied')} /></Card>
      <Button size="lg" onClick={() => nav(`/admin/businesses/${created.business.id}`)}>Open business</Button></div>
  )
  return (
    <div className="mx-auto max-w-2xl"><PageHeader title="Create business" sub="Manual onboarding: creates the owner login, business, website and subscription in one step." />
      <Card><form className="grid gap-4 p-5 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); m.mutate() }}>
        <TextField label="Business name" required value={f.name} onChange={(e) => set('name', e.target.value)} /><TextField label="Category" value={f.category} onChange={(e) => set('category', e.target.value)} />
        <TextField label="Owner name" required value={f.owner_name} onChange={(e) => set('owner_name', e.target.value)} /><TextField label="Owner email" type="email" required value={f.owner_email} onChange={(e) => set('owner_email', e.target.value)} />
        <TextField label="Phone" type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} /><TextField label="WhatsApp" type="tel" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} hint="Defaults to the phone number." />
        <Field label="Country"><Select value={f.country_code} onChange={(e) => set('country_code', e.target.value)}>{cfg.data?.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</Select></Field><TextField label="City / area" value={f.city} onChange={(e) => set('city', e.target.value)} />
        <Field label="Template"><Select value={f.template_key} onChange={(e) => set('template_key', e.target.value)}>{tpls.data?.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}</Select></Field>
        <Field label="Plan"><Select value={f.plan_key} onChange={(e) => set('plan_key', e.target.value)}>{['FREE', 'GROW', 'PRO', 'BUSINESS'].map((p) => <option key={p} value={p}>{p}</option>)}</Select></Field>
        <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2"><input type="checkbox" className="size-4 accent-ink" checked={f.trial} onChange={(e) => set('trial', e.target.checked)} /> Start as a free trial (otherwise the plan is created active — activate billing afterwards)</label>
        <div className="md:col-span-2"><TextAreaField label="Description" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
        <div className="md:col-span-2"><Button type="submit" size="lg" loading={m.isPending}>Create business</Button></div></form></Card></div>
  )
}

interface Detail { business: Business; urls: { profile: string }; owner: { email: string; name: string } | null; subscription: { status: string; plan_key: string; trial_ends_at: string | null; current_period_end: string | null; price_override: string | null } | null; website: { status: string; template: string } | null; counts: { leads: number; customers: number; bookings: number }; activity: { action: string; created_at: string; impersonator_id: string | null }[] }

export function AdminBusinessDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const nav = useNavigate()
  const toast = useToast()
  const { startImpersonation } = useAuth()
  const q = useQuery({ queryKey: ['admin-biz', id], queryFn: () => api.get<Detail>(`/admin/businesses/${id}`) })
  const [sub, setSub] = useState({ plan_key: 'GROW', action: 'activate', months: '1' })
  const [modal, setModal] = useState(false)
  const inv = () => { void qc.invalidateQueries({ queryKey: ['admin-biz'] }) }
  const act = (path: string, msg: string, body?: unknown) => api.post(`/admin/businesses/${id}/${path}`, body).then(() => { inv(); toast.ok(msg) }).catch((e: Error) => toast.err(e.message))
  const imp = useMutation({ mutationFn: () => api.post<{ access_token: string }>(`/admin/businesses/${id}/impersonate`), onSuccess: async (r) => { await startImpersonation(r.access_token); nav('/dashboard') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  if (!q.data) return <PageLoading />
  const d = q.data
  const b = d.business
  return (
    <div className="space-y-6">
      <PageHeader title={b.name} sub={<span className="flex flex-wrap items-center gap-2">/{b.slug}<StatusBadge status={b.status} />{d.website && <StatusBadge status={d.website.status} />}<a className="inline-flex items-center gap-1 font-bold underline" href={d.urls.profile} target="_blank" rel="noreferrer">View <ExternalLink className="size-3" /></a></span>}
        actions={<><Button variant="lime" loading={imp.isPending} onClick={() => imp.mutate()}>Manage as owner</Button><Button variant="secondary" onClick={() => void act('publish', 'Website published')}>Publish website</Button>{b.status === 'ACTIVE' ? <Button variant="danger" onClick={() => void act('suspend', 'Business suspended')}>Suspend</Button> : <Button onClick={() => void act('activate', 'Business activated')}>Activate</Button>}</>} />
      <p className="-mt-3 text-xs text-muted">“Manage as owner” opens their dashboard in support mode. It is never silent: the start and every change are written to the audit log with your name.</p>
      <div className="grid grid-cols-3 gap-3"><Stat label="Leads" value={d.counts.leads} /><Stat label="Customers" value={d.counts.customers} /><Stat label="Bookings" value={d.counts.bookings} /></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Owner & details" /><dl className="space-y-2 p-5 text-sm">{[['Owner', d.owner ? `${d.owner.name} · ${d.owner.email}` : '—'], ['Phone', b.phone ?? '—'], ['WhatsApp', b.whatsapp ?? '—'], ['Location', [b.city, b.country_code].filter(Boolean).join(', ')], ['Currency', b.currency], ['Created', fmtDate(b.created_at)], ['Template', d.website?.template ?? '—']].map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>)}</dl></Card>
        <Card><CardHeader title="Subscription" action={<Button size="sm" onClick={() => setModal(true)}>Change</Button>} />{d.subscription ? <dl className="space-y-2 p-5 text-sm">{[['Plan', d.subscription.plan_key], ['Status', cap(d.subscription.status)], ['Trial ends', fmtDate(d.subscription.trial_ends_at)], ['Period ends', fmtDate(d.subscription.current_period_end)], ['Price override', d.subscription.price_override ? money(d.subscription.price_override, b.currency) : 'None']].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>)}</dl> : <p className="p-5 text-sm text-muted">None</p>}</Card></div>
      <Card><CardHeader title="Recent activity" /><ul className="divide-y divide-line text-sm">{d.activity.map((a, i) => <li key={i} className="flex justify-between px-5 py-2.5"><span>{a.action}{a.impersonator_id && <Badge tone="warn"> by admin</Badge>}</span><span className="text-muted">{relativeTime(a.created_at)}</span></li>)}{!d.activity.length && <li className="px-5 py-4 text-muted">No activity yet.</li>}</ul></Card>
      <Modal open={modal} onClose={() => setModal(false)} title="Change subscription" footer={<><Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button onClick={() => { void act('subscription', 'Subscription updated', { plan_key: sub.plan_key, action: sub.action, months: Number(sub.months) }); setModal(false) }}>Apply</Button></>}>
        <div className="space-y-4"><Field label="Action"><Select value={sub.action} onChange={(e) => setSub({ ...sub, action: e.target.value })}><option value="activate">Activate (payment received)</option><option value="trial">Start trial</option><option value="cancel">Cancel now</option><option value="expire">Mark expired</option><option value="suspend">Suspend</option></Select></Field><Field label="Plan"><Select value={sub.plan_key} onChange={(e) => setSub({ ...sub, plan_key: e.target.value })}>{['FREE', 'GROW', 'PRO', 'BUSINESS'].map((p) => <option key={p}>{p}</option>)}</Select></Field>{sub.action === 'activate' && <TextField label="Months paid" type="number" min={1} max={24} value={sub.months} onChange={(e) => setSub({ ...sub, months: e.target.value })} />}</div></Modal>
    </div>
  )
}

interface SL { id: string; business_name: string; owner_name: string; phone: string | null; industry: string; location: string; source: string; status: string; notes: string; follow_up_on: string | null; business_id: string | null }
const SL_STATUS = ['NEW', 'CONTACTED', 'DEMO', 'INTERESTED', 'ONBOARDING', 'ACTIVE', 'LOST']
export function AdminSales() {
  const qc = useQueryClient()
  const toast = useToast()
  const [status, setStatus] = useState('ALL')
  const [open, setOpen] = useState<Partial<SL> | null>(null)
  const q = useQuery({ queryKey: ['sales'], queryFn: () => api.get<SL[]>('/admin/sales-leads') })
  const inv = () => void qc.invalidateQueries({ queryKey: ['sales'] })
  const save = useMutation({ mutationFn: (s: Partial<SL>) => (s.id ? api.patch(`/admin/sales-leads/${s.id}`, s) : api.post('/admin/sales-leads', { ...s, follow_up_on: s.follow_up_on || null })), onSuccess: () => { inv(); setOpen(null) }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  const setSt = useMutation({ mutationFn: (v: { id: string; status: string }) => api.patch(`/admin/sales-leads/${v.id}`, { status: v.status }), onSuccess: inv })
  const items = (q.data ?? []).filter((s) => status === 'ALL' || s.status === status)
  return (
    <div><PageHeader title="Sales CRM" sub="Businesses you're bringing on board manually." actions={<Button onClick={() => setOpen({ status: 'NEW', industry: 'beauty' })}><Plus className="size-4" /> Add lead</Button>} />
      <div className="mb-4"><Tabs value={status} onChange={setStatus} items={[{ value: 'ALL', label: 'All', count: q.data?.length }, ...SL_STATUS.map((s) => ({ value: s, label: cap(s), count: q.data?.filter((x) => x.status === s).length }))]} /></div>
      <Card>{!items.length ? <EmptyState title="No sales leads here" body="Found a salon? Add it, then move it through the pipeline." /> : <ul className="divide-y divide-line">{items.map((s) => <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5"><button className="min-w-0 flex-1 basis-56 text-left" onClick={() => setOpen(s)}><p className="font-bold">{s.business_name}</p><p className="truncate text-sm text-muted">{s.owner_name} · {s.phone ?? 'no phone'} · {s.location}{s.follow_up_on ? ` · follow up ${fmtDate(s.follow_up_on)}` : ''}</p></button><Select aria-label={`Status of ${s.business_name}`} className="h-9 w-40 rounded-full py-0 text-sm" value={s.status} onChange={(e) => setSt.mutate({ id: s.id, status: e.target.value })}>{SL_STATUS.map((x) => <option key={x} value={x}>{cap(x)}</option>)}</Select>{!s.business_id && ['INTERESTED', 'ONBOARDING'].includes(s.status) && <Link className="text-sm font-bold underline" to={`/admin/businesses/new?lead=${s.id}`}>Create business</Link>}</li>)}</ul>}</Card>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.id ? 'Edit lead' : 'New sales lead'} footer={<><Button variant="secondary" onClick={() => setOpen(null)}>Cancel</Button><Button loading={save.isPending} disabled={!open?.business_name?.trim()} onClick={() => open && save.mutate(open)}>Save</Button></>}>
        {open && <div className="space-y-4"><TextField label="Business" value={open.business_name ?? ''} onChange={(e) => setOpen({ ...open, business_name: e.target.value })} /><div className="grid grid-cols-2 gap-3"><TextField label="Owner" value={open.owner_name ?? ''} onChange={(e) => setOpen({ ...open, owner_name: e.target.value })} /><TextField label="Phone" value={open.phone ?? ''} onChange={(e) => setOpen({ ...open, phone: e.target.value })} /><TextField label="Location" value={open.location ?? ''} onChange={(e) => setOpen({ ...open, location: e.target.value })} /><TextField label="Source" value={open.source ?? ''} onChange={(e) => setOpen({ ...open, source: e.target.value })} placeholder="Instagram, walk-in…" /></div><TextField label="Follow-up date" type="date" value={open.follow_up_on ?? ''} onChange={(e) => setOpen({ ...open, follow_up_on: e.target.value })} /><TextAreaField label="Notes" rows={3} value={open.notes ?? ''} onChange={(e) => setOpen({ ...open, notes: e.target.value })} /></div>}</Modal></div>
  )
}

interface Ticket { id: string; business_name: string | null; subject: string; body: string; status: string; priority: string; admin_notes: string; created_at: string }
export function AdminSupport() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['tickets'], queryFn: () => api.get<Ticket[]>('/admin/support-tickets') })
  const upd = useMutation({ mutationFn: (v: { id: string; status: string }) => api.patch(`/admin/support-tickets/${v.id}`, { status: v.status }), onSuccess: () => void qc.invalidateQueries({ queryKey: ['tickets'] }) })
  return (
    <div><PageHeader title="Support" sub="Requests from businesses, including upgrade requests." /><Card>{!q.data?.length ? <EmptyState title="No tickets" /> : <ul className="divide-y divide-line">{q.data.map((t) => <li key={t.id} className="space-y-1 px-5 py-4"><div className="flex flex-wrap items-center gap-2"><b>{t.subject}</b>{t.priority === 'HIGH' && <Badge tone="bad">High</Badge>}<StatusBadge status={t.status} /><span className="text-xs text-muted">{t.business_name} · {relativeTime(t.created_at)}</span></div><p className="text-sm text-muted">{t.body}</p><div className="flex gap-2 pt-1">{t.status !== 'RESOLVED' ? <Button size="sm" variant="secondary" onClick={() => upd.mutate({ id: t.id, status: 'RESOLVED' })}>Resolve</Button> : <Button size="sm" variant="ghost" onClick={() => upd.mutate({ id: t.id, status: 'OPEN' })}>Reopen</Button>}</div></li>)}</ul>}</Card></div>
  )
}

interface AP { key: string; name: string; description: string; prices: Record<string, string>; features: string[]; is_public: boolean; limits: Record<string, number> }
export function AdminPlans() {
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: ['admin-plans'], queryFn: () => api.get<{ plans: AP[]; all_features: Record<string, string>; limit_labels: Record<string, string> }>('/admin/plans') })
  const save = useMutation({ mutationFn: (p: AP) => api.patch(`/admin/plans/${p.key}`, { name: p.name, description: p.description, prices: p.prices, features: p.features, limits: p.limits }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin-plans'] }); toast.ok('Plan saved') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  const [edit, setEdit] = useState<Record<string, AP>>({})
  if (!q.data) return <PageLoading />
  return (
    <div className="space-y-5"><PageHeader title="Plans & pricing" sub="Prices and features are read from here everywhere — the website and dashboards never hardcode them. Super admin only." />
      {q.data.plans.map((orig) => { const p = edit[orig.key] ?? orig; const set = (n: AP) => setEdit({ ...edit, [orig.key]: n }); return (
        <Card key={p.key}><CardHeader title={`${p.key}`} action={<Button size="sm" loading={save.isPending && save.variables?.key === p.key} disabled={!edit[orig.key]} onClick={() => save.mutate(p)}>Save</Button>} />
          <div className="grid gap-4 p-5 md:grid-cols-3"><TextField label="Name" value={p.name} onChange={(e) => set({ ...p, name: e.target.value })} />{['KES', 'USD'].map((c) => <TextField key={c} label={`Monthly price (${c})`} type="number" min={0} value={p.prices[c] ?? ''} onChange={(e) => set({ ...p, prices: { ...p.prices, [c]: e.target.value } })} />)}
            <div className="md:col-span-3"><p className="mb-2 text-sm font-semibold">Features</p><div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(q.data.all_features).map(([k, label]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={p.features.includes(k)} onChange={(e) => set({ ...p, features: e.target.checked ? [...p.features, k] : p.features.filter((x) => x !== k) })} />{label}</label>)}</div></div>
            <div className="md:col-span-3"><p className="mb-2 text-sm font-semibold">Limits <span className="font-normal text-muted">— leave empty for unlimited</span></p><div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">{Object.entries(q.data.limit_labels).map(([k, label]) => <TextField key={k} label={label} type="number" min={0} value={p.limits?.[k] ?? ''} onChange={(e) => { const l = { ...(p.limits ?? {}) }; if (e.target.value === '') delete l[k]; else l[k] = Number(e.target.value); set({ ...p, limits: l }) }} />)}</div></div></div></Card>) })}</div>
  )
}

export function AdminAudit() {
  const [action, setAction] = useState('')
  const q = useQuery({ queryKey: ['audit', action], queryFn: () => api.get<{ id: string; action: string; user_id: string | null; impersonator_id: string | null; business_id: string | null; ip: string | null; created_at: string; metadata: Record<string, unknown> }[]>('/admin/audit-logs', { action, limit: 200 }) })
  return (
    <div><PageHeader title="Audit log" sub="Logins, business creation, publications, subscriptions, payments, admin actions and impersonation." /><Input aria-label="Filter by action" className="mb-4 max-w-sm" placeholder="Filter, e.g. admin. or auth." value={action} onChange={(e) => setAction(e.target.value)} />
      <Card><ul className="divide-y divide-line text-sm">{q.data?.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5"><span className="font-semibold">{a.action}{a.impersonator_id && <Badge tone="warn"> impersonated</Badge>}</span><span className="text-xs text-muted">{a.ip ?? '—'} · {fmtDate(a.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></li>)}{q.data && !q.data.length && <li className="px-5 py-6 text-muted">No entries.</li>}</ul></Card></div>
  )
}
