import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  BadgeCheck,
  Bell,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  Layers,
  LifeBuoy,
  Plus,
  RefreshCw,
  Search,
  Send,
  Server,
  ShoppingBag,
  Store
} from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/hooks/useToast'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CopyField,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  PageLoading,
  Select,
  Stat,
  StatusBadge,
  Tabs,
  TextAreaField,
  TextField
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { cap, fmtDate, money, relativeTime } from '@/lib/format'
import type { Business, CountryConfig } from '@/types'

// ============================================================================
// 1. MAIN DASHBOARD
// ============================================================================
interface Dash {
  total_businesses: number
  active_businesses: number
  trial_businesses: number
  cancelled_businesses: number
  past_due: number
  suspended: number
  mrr: Record<string, number>
  merchant_gmv: Record<string, number>
  total_orders: number
  total_products: number
  new_registrations_30d: number
  websites_live: number
  bookings_total: number
  leads_total: number
  open_tickets: number
  sales_pipeline: Record<string, number>
  recent_orders: {
    id: string
    number: number
    business_name: string
    business_slug: string
    customer_name: string
    customer_phone: string | null
    total: number
    currency: string
    status: string
    payment_status: string
    channel: string
    created_at: string
  }[]
  recent_merchants: {
    id: string
    name: string
    slug: string
    city: string
    status: string
    plan: string
    created_at: string
  }[]
  chart_growth: {
    date: string
    merchants: number
    orders: number
  }[]
  system_status: {
    api: string
    database: string
    storage: string
    email: string
  }
}

export function AdminDashboard() {
  const q = useQuery({ queryKey: ['admin-dash'], queryFn: () => api.get<Dash>('/admin/dashboard') })
  if (!q.data) return <PageLoading />
  const d = q.data
  const mrrEntries = Object.entries(d.mrr)
  const gmvEntries = Object.entries(d.merchant_gmv || {})

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Platform Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time operations, subscription revenue, merchant stores, and system performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/businesses/new"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#5B21F5] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#4d16e0] transition"
          >
            <Plus className="size-4" /> Add Merchant
          </Link>
          <Link
            to="/admin/orders"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <ShoppingBag className="size-4 text-slate-500" /> View Orders
          </Link>
          <Link
            to="/admin/notifications"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <Bell className="size-4 text-slate-500" /> Broadcast
          </Link>
        </div>
      </div>

      {/* Revenue Separation Banner */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider backdrop-blur-sm">
              Aqivo Platform Income
            </span>
            <CreditCard className="size-5 opacity-80" />
          </div>
          <p className="mt-4 text-xs font-semibold text-violet-200 uppercase tracking-wider">
            Monthly Recurring Revenue (MRR)
          </p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">
            {mrrEntries.length ? mrrEntries.map(([c, v]) => money(v, c)).join(' · ') : 'KES 0'}
          </p>
          <p className="mt-2 text-xs text-violet-200">
            From {d.active_businesses} active paid platform subscriptions. Does not include merchant store checkout revenue.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-800 p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider backdrop-blur-sm">
              Merchants' Gross Sales (GMV)
            </span>
            <Store className="size-5 opacity-80" />
          </div>
          <p className="mt-4 text-xs font-semibold text-emerald-200 uppercase tracking-wider">
            Total Merchant Order Sales
          </p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">
            {gmvEntries.length ? gmvEntries.map(([c, v]) => money(v, c)).join(' · ') : 'KES 0'}
          </p>
          <p className="mt-2 text-xs text-emerald-200">
            Total sales volume across {d.total_orders} merchant customer orders. Retained 100% by merchants.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total Merchants" value={d.total_businesses} sub={`${d.new_registrations_30d} new in 30d`} />
        <Stat label="Active Paid" value={d.active_businesses} sub="Subscribed stores" />
        <Stat label="On Trial" value={d.trial_businesses} sub="Evaluating platform" />
        <Stat label="Total Orders" value={d.total_orders} sub="Storefront & WhatsApp" />
        <Stat label="Listed Products" value={d.total_products} sub="Active catalog items" />
        <Stat label="Live Storefronts" value={d.websites_live} sub="Published websites" />
      </div>

      {/* Chart Section: Growth & Orders */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 bg-white">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900">Merchant Store Growth</h3>
              <p className="text-xs text-slate-500">New store registrations over the last 14 days</p>
            </div>
            <Badge tone="info">14-Day View</Badge>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.chart_growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5B21F5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#5B21F5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Area type="monotone" dataKey="merchants" name="New Stores" stroke="#5B21F5" strokeWidth={2.5} fillOpacity={1} fill="url(#growthGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 bg-white">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900">Platform Order Volume</h3>
              <p className="text-xs text-slate-500">Customer orders placed across all storefronts</p>
            </div>
            <Badge tone="ok">All Channels</Badge>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.chart_growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="orders" name="Orders" fill="#0EA5E9" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Two Column Tables: Recent Orders & Recent Merchants */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card className="bg-white">
          <CardHeader
            title="Recent Orders Across Platform"
            sub="Latest merchant orders from storefronts & WhatsApp"
            action={
              <Link to="/admin/orders" className="text-xs font-bold text-[#5B21F5] hover:underline flex items-center gap-1">
                View all orders →
              </Link>
            }
          />
          {!d.recent_orders?.length ? (
            <div className="p-8 text-center text-sm text-slate-500">No customer orders recorded yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.recent_orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between p-4 hover:bg-slate-50/80 transition">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">#{o.number}</span>
                      <span className="text-xs font-semibold text-slate-500 truncate">({o.business_name})</span>
                      <Badge tone={o.channel === 'WHATSAPP' ? 'ok' : 'info'}>{o.channel}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 truncate">
                      {o.customer_name} {o.customer_phone ? `• ${o.customer_phone}` : ''} • {relativeTime(o.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-slate-900">{money(o.total, o.currency)}</p>
                    <StatusBadge status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent Registered Merchants */}
        <Card className="bg-white">
          <CardHeader
            title="Recent Registered Merchants"
            sub="Newest stores created on Aqivo"
            action={
              <Link to="/admin/businesses" className="text-xs font-bold text-[#5B21F5] hover:underline flex items-center gap-1">
                View all merchants →
              </Link>
            }
          />
          {!d.recent_merchants?.length ? (
            <div className="p-8 text-center text-sm text-slate-500">No registered merchants yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.recent_merchants.map((m) => (
                <li key={m.id} className="flex items-center justify-between p-4 hover:bg-slate-50/80 transition">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/businesses/${m.id}`} className="font-bold text-sm text-slate-900 hover:text-[#5B21F5] truncate">
                        {m.name}
                      </Link>
                      <Badge>{m.plan}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 truncate">
                      /{m.slug} {m.city ? `• ${m.city}` : ''} • {relativeTime(m.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={m.status} />
                    <Link
                      to={`/admin/businesses/${m.id}`}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                      title="Inspect store"
                    >
                      <Eye className="size-4" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Pipeline & Infrastructure Status */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 bg-white lg:col-span-2">
          <CardHeader
            title="Sales CRM Onboarding Pipeline"
            sub="Merchants being onboarded manually"
            action={<Link to="/admin/sales" className="text-xs font-bold text-[#5B21F5] underline">Open CRM</Link>}
          />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {Object.entries(d.sales_pipeline || {}).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
                <p className="text-[11px] font-bold uppercase text-slate-500 truncate">{cap(k)}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{v}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 bg-white">
          <CardHeader title="System & API Status" sub="Live health & services" action={<Link to="/admin/health" className="text-xs font-bold text-[#5B21F5] underline">Diagnostics</Link>} />
          <div className="mt-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <Server className="size-3.5 text-slate-500" /> API Gateway
              </span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500" /> Operational
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <Activity className="size-3.5 text-slate-500" /> PostgreSQL DB
              </span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500" /> Connected
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <Layers className="size-3.5 text-slate-500" /> Media & Images
              </span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500" /> Ready
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <LifeBuoy className="size-3.5 text-slate-500" /> Open Tickets
              </span>
              <span className="font-bold text-amber-600">{d.open_tickets} pending</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// 2. MERCHANTS & STORE MANAGEMENT
// ============================================================================
interface MerchantRow {
  id: string
  name: string
  slug: string
  city: string
  country_code: string
  phone: string | null
  whatsapp: string | null
  status: string
  is_demo: boolean
  is_verified: boolean
  is_featured: boolean
  primary_domain: string | null
  plan: string
  subscription_status: string | null
  owner_email: string | null
  owner_name: string | null
  website_status: string | null
  product_count: number
  order_count: number
  created_at: string
}

export function AdminBusinesses() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('ALL')
  const [plan, setPlan] = useState('ALL')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const qc = useQueryClient()
  const toast = useToast()

  const list = useQuery({
    queryKey: ['admin-biz', q, status, plan, verifiedOnly],
    queryFn: () => api.get<{ items: MerchantRow[]; total: number }>('/admin/businesses', { q, status, plan, verified_only: verifiedOnly, limit: 100 }),
  })

  const verifyMut = useMutation({
    mutationFn: (id: string) => api.post<{ is_verified: boolean }>(`/admin/businesses/${id}/verify`),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['admin-biz'] })
      toast.ok(r.is_verified ? 'Merchant verified' : 'Verification badge removed')
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed to update verification')
  })

  const featureMut = useMutation({
    mutationFn: (id: string) => api.post<{ is_featured: boolean }>(`/admin/businesses/${id}/feature`),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['admin-biz'] })
      toast.ok(r.is_featured ? 'Store featured on homepage' : 'Store removed from featured list')
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed to feature store')
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Merchants & Stores"
        sub={`Manage registered merchants, verify legitimate businesses, and inspect storefronts. (${list.data?.total ?? 0} total)`}
        actions={
          <Link
            to="/admin/businesses/new"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#5B21F5] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#4d16e0] transition"
          >
            <Plus className="size-4" /> Create Store
          </Link>
        }
      />

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
            <Input
              className="pl-10"
              placeholder="Search store name, owner, phone, email, or slug..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
          </div>
          <div>
            <Select value={plan} onChange={(e) => setPlan(e.target.value)}>
              <option value="ALL">All Plans</option>
              <option value="FREE">Free</option>
              <option value="GROW">Grow</option>
              <option value="PRO">Pro</option>
              <option value="BUSINESS">Business</option>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
          <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              className="size-4 accent-[#5B21F5] rounded"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            Show verified merchants only
          </label>
          <span className="text-slate-500">{list.data?.items.length ?? 0} merchants displayed</span>
        </div>
      </Card>

      {/* Merchants List */}
      <Card className="bg-white overflow-hidden">
        {!list.data ? (
          <PageLoading />
        ) : !list.data.items.length ? (
          <EmptyState
            title="No merchants match your filters"
            body="Try clearing your search query or status filter to see all stores."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="py-3.5 pl-5 pr-3">Store Details</th>
                  <th className="px-3 py-3.5">Owner & Contacts</th>
                  <th className="px-3 py-3.5">Catalog & Orders</th>
                  <th className="px-3 py-3.5">Plan & Billing</th>
                  <th className="px-3 py-3.5 text-center">Badges</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {list.data.items.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 pl-5 pr-3">
                      <div className="flex items-start gap-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link to={`/admin/businesses/${b.id}`} className="font-bold text-slate-900 hover:text-[#5B21F5]">
                              {b.name}
                            </Link>
                            {b.is_demo && <Badge>demo</Badge>}
                            {b.is_verified && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-extrabold text-emerald-700">
                                <BadgeCheck className="size-3 text-emerald-600" /> Verified
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-2">
                            <span>/{b.slug}</span>
                            <span>•</span>
                            <span>{b.city || 'Kenya'}</span>
                            <a
                              href={`/${b.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                            >
                              Live <ExternalLink className="size-2.5" />
                            </a>
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-4 text-xs">
                      <p className="font-bold text-slate-800">{b.owner_name || 'No owner'}</p>
                      <p className="text-slate-500 truncate max-w-[180px]">{b.owner_email || '—'}</p>
                      <p className="text-slate-500">{b.phone || b.whatsapp || '—'}</p>
                    </td>

                    <td className="px-3 py-4 text-xs">
                      <p className="font-semibold text-slate-800">{b.product_count} products</p>
                      <p className="text-slate-500">{b.order_count} orders</p>
                    </td>

                    <td className="px-3 py-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Badge tone="lime">{b.plan}</Badge>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {b.subscription_status ? cap(b.subscription_status) : 'Free tier'}
                      </p>
                    </td>

                    <td className="px-3 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => verifyMut.mutate(b.id)}
                          title={b.is_verified ? 'Click to revoke verification' : 'Click to verify store'}
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[11px] font-bold border transition',
                            b.is_verified
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
                          )}
                        >
                          {b.is_verified ? 'Verified ✓' : '+ Verify'}
                        </button>
                        <button
                          onClick={() => featureMut.mutate(b.id)}
                          title={b.is_featured ? 'Click to remove from homepage' : 'Click to feature on homepage'}
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[11px] font-bold border transition',
                            b.is_featured
                              ? 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100'
                              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
                          )}
                        >
                          {b.is_featured ? 'Featured ★' : 'Feature'}
                        </button>
                      </div>
                    </td>

                    <td className="py-4 pl-3 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/admin/businesses/${b.id}`}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                        >
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ============================================================================
// 3. ORDER MANAGEMENT & MONITORING
// ============================================================================
interface OrderItemRow {
  id: string
  name: string
  variant_title: string | null
  quantity: number
  unit_price: number
  line_total: number
  image_url: string | null
}

interface OrderDetailData {
  order: {
    id: string
    number: number
    token: string
    customer_name: string
    customer_phone: string | null
    customer_email: string | null
    address: string
    delivery_method: string
    delivery_zone: string | null
    notes: string
    status: string
    payment_method: string
    payment_status: string
    currency: string
    subtotal: number
    discount: number
    delivery_fee: number
    total: number
    channel: string
    source: string | null
    courier_name: string | null
    courier_phone: string | null
    created_at: string
  }
  business: {
    id: string
    name: string
    slug: string
    phone: string | null
    whatsapp: string | null
  }
  items: OrderItemRow[]
  events: {
    kind: string
    status: string | null
    message: string
    created_at: string
  }[]
}

export function AdminOrders() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('ALL')
  const [channel, setChannel] = useState('ALL')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const ordersQuery = useQuery({
    queryKey: ['admin-orders', q, status, channel],
    queryFn: () => api.get<{ items: any[]; total: number }>('/admin/orders', { q, status, channel, limit: 100 })
  })

  const detailQuery = useQuery({
    queryKey: ['admin-order-detail', selectedOrderId],
    queryFn: () => api.get<OrderDetailData>(`/admin/orders/${selectedOrderId}`),
    enabled: !!selectedOrderId
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders Monitor"
        sub="Track, search, and inspect customer orders placed across all Aqivo storefronts. Merchants control fulfillment."
      />

      {/* Notice Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 flex items-start gap-3">
        <ShoppingBag className="size-4 shrink-0 text-blue-600 mt-0.5" />
        <div>
          <p className="font-bold">Merchant Order Isolation & Oversight</p>
          <p className="mt-0.5 text-blue-700">
            Admins have complete read and audit access to help merchants troubleshoot cart issues and payment verification. Merchants retain 100% control over fulfilling deliveries and communicating with their buyers.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
            <Input
              className="pl-10"
              placeholder="Search order #, customer, phone, or store..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">All Order Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PREPARING">Preparing</option>
              <option value="READY">Ready</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </div>
          <div>
            <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="ALL">All Channels (Web + WhatsApp)</option>
              <option value="WEBSITE">Online Storefront</option>
              <option value="WHATSAPP">WhatsApp Checkout</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card className="bg-white overflow-hidden">
        {!ordersQuery.data ? (
          <PageLoading />
        ) : !ordersQuery.data.items.length ? (
          <EmptyState title="No orders found" body="Try adjusting your search criteria." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="py-3.5 pl-5 pr-3">Order</th>
                  <th className="px-3 py-3.5">Store</th>
                  <th className="px-3 py-3.5">Customer</th>
                  <th className="px-3 py-3.5">Channel / Method</th>
                  <th className="px-3 py-3.5">Total Amount</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {ordersQuery.data.items.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 pl-5 pr-3 font-bold text-slate-900">
                      #{o.number}
                      <p className="text-[11px] font-normal text-slate-400">{relativeTime(o.created_at)}</p>
                    </td>

                    <td className="px-3 py-4">
                      <p className="font-bold text-slate-800">{o.business_name}</p>
                      <p className="text-xs text-slate-500">/{o.business_slug}</p>
                    </td>

                    <td className="px-3 py-4 text-xs">
                      <p className="font-bold text-slate-900">{o.customer_name}</p>
                      <p className="text-slate-500">{o.customer_phone || '—'}</p>
                    </td>

                    <td className="px-3 py-4 text-xs">
                      <Badge tone={o.channel === 'WHATSAPP' ? 'ok' : 'info'}>{o.channel}</Badge>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {o.payment_method} • <span className="font-bold">{o.payment_status}</span>
                      </p>
                    </td>

                    <td className="px-3 py-4">
                      <p className="font-extrabold text-slate-900">{money(o.total, o.currency)}</p>
                      {o.delivery_fee > 0 && <p className="text-[10px] text-slate-500">+{money(o.delivery_fee, o.currency)} del.</p>}
                    </td>

                    <td className="px-3 py-4">
                      <StatusBadge status={o.status} />
                    </td>

                    <td className="py-4 pl-3 pr-5 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setSelectedOrderId(o.id)}>
                        <Eye className="size-3.5" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Inspect Order Drawer Modal */}
      <Modal
        open={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        title={detailQuery.data ? `Order #${detailQuery.data.order.number} Details` : 'Order Details'}
        wide
      >
        {!detailQuery.data ? (
          <PageLoading />
        ) : (
          <div className="space-y-6 text-sm">
            {/* Header info */}
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Order #{detailQuery.data.order.number}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Store: <span className="font-bold text-slate-700">{detailQuery.data.business.name}</span> (/{detailQuery.data.business.slug})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={detailQuery.data.order.channel === 'WHATSAPP' ? 'ok' : 'info'}>
                    {detailQuery.data.order.channel}
                  </Badge>
                  <StatusBadge status={detailQuery.data.order.status} />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                <div>
                  <p className="text-slate-500">Customer</p>
                  <p className="font-bold text-slate-800">{detailQuery.data.order.customer_name}</p>
                  <p className="text-slate-600">{detailQuery.data.order.customer_phone || 'No phone'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Payment</p>
                  <p className="font-bold text-slate-800">{detailQuery.data.order.payment_method}</p>
                  <p className="font-semibold text-emerald-600">{detailQuery.data.order.payment_status}</p>
                </div>
                <div>
                  <p className="text-slate-500">Delivery</p>
                  <p className="font-bold text-slate-800">{detailQuery.data.order.delivery_method}</p>
                  <p className="text-slate-600">{detailQuery.data.order.delivery_zone || 'Standard'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Date Placed</p>
                  <p className="font-bold text-slate-800">{fmtDate(detailQuery.data.order.created_at)}</p>
                  <p className="text-slate-500">{relativeTime(detailQuery.data.order.created_at)}</p>
                </div>
              </div>

              {detailQuery.data.order.address && (
                <div className="mt-3 pt-3 border-t border-slate-200 text-xs">
                  <span className="font-bold text-slate-600">Delivery Address: </span>
                  <span className="text-slate-800">{detailQuery.data.order.address}</span>
                </div>
              )}
            </div>

            {/* Itemized product list */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2">Ordered Items ({detailQuery.data.items.length})</h4>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white">
                {detailQuery.data.items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between p-3 text-xs">
                    <div className="flex items-center gap-3">
                      {it.image_url ? (
                        <img src={it.image_url} alt="" className="size-10 rounded-lg object-cover bg-slate-100" />
                      ) : (
                        <div className="size-10 rounded-lg bg-slate-100 grid place-items-center text-slate-400">
                          <ShoppingBag className="size-5" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-900">{it.name}</p>
                        {it.variant_title && <p className="text-slate-500">{it.variant_title}</p>}
                        <p className="text-slate-400">Qty: {it.quantity} × {money(it.unit_price, detailQuery.data?.order.currency || 'KES')}</p>
                      </div>
                    </div>
                    <p className="font-extrabold text-slate-900">
                      {money(it.line_total, detailQuery.data?.order.currency || 'KES')}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-3 rounded-xl bg-slate-50 p-3 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{money(detailQuery.data.order.subtotal, detailQuery.data.order.currency)}</span>
                </div>
                {detailQuery.data.order.delivery_fee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Fee</span>
                    <span>+{money(detailQuery.data.order.delivery_fee, detailQuery.data.order.currency)}</span>
                  </div>
                )}
                {detailQuery.data.order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount</span>
                    <span>-{money(detailQuery.data.order.discount, detailQuery.data.order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total</span>
                  <span>{money(detailQuery.data.order.total, detailQuery.data.order.currency)}</span>
                </div>
              </div>
            </div>

            {/* Order Event Timeline */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2">Order Activity Log</h4>
              <div className="space-y-2">
                {detailQuery.data.events.map((ev, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs rounded-lg border border-slate-100 bg-white p-2.5">
                    <span className="font-bold text-slate-800">{ev.kind}:</span>
                    <span className="text-slate-600 flex-1">{ev.message || ev.status || 'Updated'}</span>
                    <span className="text-slate-400">{relativeTime(ev.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ============================================================================
// 4. SUBSCRIPTIONS & BILLING MANAGEMENT
// ============================================================================
export function AdminSubscriptions() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('ALL')
  const [planKey, setPlanKey] = useState('ALL')
  const [payModal, setPayModal] = useState<any | null>(null)
  const qc = useQueryClient()
  const toast = useToast()

  const subsQuery = useQuery({
    queryKey: ['admin-subs', q, status, planKey],
    queryFn: () => api.get<{ items: any[]; total: number }>('/admin/subscriptions', { q, status, plan_key: planKey, limit: 100 }),
  })

  const [form, setForm] = useState({
    amount: '1500',
    currency: 'KES',
    months: 1,
    reference: '',
    payment_method: 'MPESA',
    plan_key: 'GROW',
    notes: ''
  })

  const payMut = useMutation({
    mutationFn: (body: any) => api.post('/admin/subscriptions/record-payment', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-subs'] })
      void qc.invalidateQueries({ queryKey: ['admin-dash'] })
      toast.ok('Payment recorded and subscription activated!')
      setPayModal(null)
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed to record payment')
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Subscriptions & Billing"
        sub="Manage merchant SaaS plans, manual payments (M-Pesa / Bank), and recurring revenue records."
        actions={
          <Link
            to="/admin/plans"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <Layers className="size-4 text-slate-500" /> Configure Plans & Limits
          </Link>
        }
      />

      {/* Subscription Revenue Explanation */}
      <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 text-xs text-violet-900 flex items-start gap-3">
        <CreditCard className="size-4 shrink-0 text-violet-600 mt-0.5" />
        <div>
          <p className="font-bold">Honest Billing Architecture</p>
          <p className="mt-0.5 text-violet-700">
            Aqivo charges merchants monthly/annual fees for using the platform. Because early African SaaS operations often collect subscription fees via founder M-Pesa till or bank transfers, this portal provides verified manual payment recording and audited activation.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
            <Input className="pl-10" placeholder="Search store name or slug..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Paid</option>
              <option value="TRIAL">On Free Trial</option>
              <option value="PAST_DUE">Past Due</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </div>
          <div>
            <Select value={planKey} onChange={(e) => setPlanKey(e.target.value)}>
              <option value="ALL">All Plans</option>
              <option value="FREE">Free</option>
              <option value="GROW">Grow</option>
              <option value="PRO">Pro</option>
              <option value="BUSINESS">Business</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Subscriptions Table */}
      <Card className="bg-white overflow-hidden">
        {!subsQuery.data ? (
          <PageLoading />
        ) : !subsQuery.data.items.length ? (
          <EmptyState title="No subscriptions found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="py-3.5 pl-5 pr-3">Store</th>
                  <th className="px-3 py-3.5">Owner</th>
                  <th className="px-3 py-3.5">Plan & Rate</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="px-3 py-3.5">Period Dates</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {subsQuery.data.items.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 pl-5 pr-3">
                      <p className="font-bold text-slate-900">{s.business_name}</p>
                      <p className="text-xs text-slate-500">/{s.business_slug}</p>
                    </td>

                    <td className="px-3 py-4 text-xs">
                      <p className="font-bold text-slate-800">{s.owner_name || 'No owner'}</p>
                      <p className="text-slate-500">{s.owner_email || '—'}</p>
                    </td>

                    <td className="px-3 py-4 text-xs">
                      <Badge tone="lime">{s.plan_key}</Badge>
                      <p className="mt-1 font-bold text-slate-900">{money(s.price, s.currency)} / mo</p>
                    </td>

                    <td className="px-3 py-4">
                      <StatusBadge status={s.status} />
                    </td>

                    <td className="px-3 py-4 text-xs text-slate-500">
                      {s.status === 'TRIAL' ? (
                        <p>Trial ends: <span className="font-bold text-slate-700">{fmtDate(s.trial_ends_at)}</span></p>
                      ) : (
                        <p>Period ends: <span className="font-bold text-slate-700">{fmtDate(s.current_period_end)}</span></p>
                      )}
                    </td>

                    <td className="py-4 pl-3 pr-5 text-right">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setPayModal(s)
                          setForm((prev) => ({ ...prev, plan_key: s.plan_key, amount: s.price }))
                        }}
                      >
                        Record Payment
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Record Manual Payment Modal */}
      <Modal
        open={!!payModal}
        onClose={() => setPayModal(null)}
        title={payModal ? `Record Payment for ${payModal.business_name}` : 'Record Payment'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayModal(null)}>Cancel</Button>
            <Button
              loading={payMut.isPending}
              disabled={!form.reference.trim()}
              onClick={() => {
                if (!payModal) return
                payMut.mutate({
                  business_id: payModal.business_id,
                  amount: Number(form.amount),
                  currency: form.currency,
                  months: Number(form.months),
                  reference: form.reference,
                  payment_method: form.payment_method,
                  plan_key: form.plan_key,
                  notes: form.notes
                })
              }}
            >
              Verify & Activate Plan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Records an out-of-band payment received from this merchant, extends the subscription end date, and records an audited ledger transaction.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan to activate">
              <Select value={form.plan_key} onChange={(e) => setForm({ ...form, plan_key: e.target.value })}>
                <option value="GROW">Grow (KES 1,500/mo)</option>
                <option value="PRO">Pro (KES 3,500/mo)</option>
                <option value="BUSINESS">Business (KES 7,500/mo)</option>
              </Select>
            </Field>
            <TextField
              label="Months paid"
              type="number"
              min={1}
              max={24}
              value={form.months}
              onChange={(e) => setForm({ ...form, months: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Amount Paid"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Field label="Currency">
              <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="KES">KES</option>
                <option value="USD">USD</option>
              </Select>
            </Field>
          </div>
          <TextField
            label="Payment Reference / Transaction Code"
            placeholder="e.g. QK89102919 or Equity Ref"
            required
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            hint="The M-Pesa receipt code or bank deposit slip number."
          />
          <TextAreaField
            label="Internal Notes (Audited)"
            placeholder="Received via paybill, confirmed with customer."
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  )
}

// ============================================================================
// 5. STOREFRONTS & THEMES MANAGEMENT
// ============================================================================
export function AdminStorefronts() {
  const q = useQuery({
    queryKey: ['admin-storefronts'],
    queryFn: () => api.get<{ templates: any[]; featured: any[]; domains: any[] }>('/admin/storefronts')
  })
  const [previewTpl, setPreviewTpl] = useState<any | null>(null)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')

  if (!q.data) return <PageLoading />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Storefronts & Themes"
        sub="Control global theme templates, preview responsive layouts, and monitor verified custom domains."
      />

      {/* Available Themes Library */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-3">Default Storefront Templates</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {q.data.templates.map((tpl) => (
            <Card key={tpl.key} className="bg-white overflow-hidden p-5 flex flex-col justify-between border border-slate-200">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="size-4 rounded-full border" style={{ backgroundColor: tpl.theme?.accent || '#5B21F5' }} />
                  <Badge tone="info">{tpl.industry}</Badge>
                </div>
                <h4 className="font-extrabold text-base text-slate-900">{tpl.name}</h4>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{tpl.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {tpl.features?.slice(0, 3).map((f: string) => (
                    <span key={f} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">/{tpl.key}</span>
                <Button size="sm" variant="secondary" onClick={() => setPreviewTpl(tpl)}>
                  Preview
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Featured Stores & Domains Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 bg-white">
          <CardHeader title="Featured Stores on Aqivo Showcase" sub="Stores highlighted on Aqivo's marketing homepage" />
          {!q.data.featured?.length ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No stores featured yet. Click "Feature" on any merchant in the Merchants list.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 mt-2">
              {q.data.featured.map((st: any) => (
                <li key={st.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-bold text-slate-900">{st.name}</p>
                    <p className="text-xs text-slate-500">/{st.slug} • {st.city}</p>
                  </div>
                  <a
                    href={`/${st.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#5B21F5] hover:underline"
                  >
                    Open <ExternalLink className="size-3" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 bg-white">
          <CardHeader title="Verified Custom Domains" sub="Merchants with custom domain DNS active" />
          {!q.data.domains?.length ? (
            <div className="p-6 text-center text-xs text-slate-500">No custom domains configured yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100 mt-2">
              {q.data.domains.map((d: any) => (
                <li key={d.business_id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-bold text-slate-900">{d.primary_domain}</p>
                    <p className="text-xs text-slate-500">{d.name} (/{d.slug})</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="size-3.5" /> SSL Active
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Theme Simulator Modal */}
      <Modal
        open={!!previewTpl}
        onClose={() => setPreviewTpl(null)}
        title={previewTpl ? `Theme Preview: ${previewTpl.name}` : 'Theme Preview'}
        wide
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-slate-100 p-2">
            <span className="text-xs font-bold text-slate-700">Preview Viewport</span>
            <div className="flex gap-1">
              <button
                onClick={() => setDevice('desktop')}
                className={cn('px-3 py-1 text-xs font-bold rounded-lg', device === 'desktop' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500')}
              >
                Desktop
              </button>
              <button
                onClick={() => setDevice('mobile')}
                className={cn('px-3 py-1 text-xs font-bold rounded-lg', device === 'mobile' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500')}
              >
                Mobile (Phone)
              </button>
            </div>
          </div>

          <div className="flex justify-center bg-slate-900/5 rounded-2xl p-4 overflow-hidden min-h-[450px]">
            {previewTpl && (
              <div
                className={cn(
                  'rounded-xl border border-slate-300 bg-white shadow-xl transition-all duration-300 overflow-hidden flex flex-col',
                  device === 'mobile' ? 'w-[375px] h-[550px]' : 'w-full h-[550px]'
                )}
              >
                <div className="h-9 bg-slate-100 border-b border-slate-200 flex items-center px-3 gap-2">
                  <div className="flex gap-1.5">
                    <span className="size-2.5 rounded-full bg-red-400" />
                    <span className="size-2.5 rounded-full bg-amber-400" />
                    <span className="size-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 text-center font-mono text-[11px] text-slate-500 truncate">
                    https://demo.aqivo.shop/{previewTpl.key}
                  </div>
                </div>
                <iframe
                  src={`/ecomm-templates/${previewTpl.key}/index.html`}
                  title={previewTpl.name}
                  className="w-full flex-1 border-0"
                />
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================================
// 6. PLATFORM CONTENT & CATEGORIES MANAGEMENT
// ============================================================================
export function AdminCategories() {
  const q = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.get<{ industries: any[] }>('/admin/categories')
  })

  if (!q.data) return <PageLoading />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products & Categories"
        sub="Configure supported business sectors, starter products, and catalog templates for onboarding."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {q.data.industries.map((ind) => (
          <Card key={ind.key} className="p-5 bg-white border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <Badge tone="info">{ind.item_word}</Badge>
              <span className="text-xs font-bold text-slate-500">{ind.business_count} stores</span>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">{ind.label}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{ind.blurb}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Categories</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {ind.categories.slice(0, 5).map((c: string) => (
                  <span key={c} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 font-semibold">
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span className="font-bold text-slate-700">Starter Suggestions: </span>
              {ind.suggestions?.map((s: any) => s.name).join(', ') || 'Standard items'}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// 7. NOTIFICATIONS & BROADCASTS
// ============================================================================
export function AdminNotifications() {
  const qc = useQueryClient()
  const toast = useToast()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [targetPlan, setTargetPlan] = useState('ALL')
  const [channel, setChannel] = useState('EMAIL')

  const list = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => api.get<any[]>('/admin/notifications'),
  })

  const sendMut = useMutation({
    mutationFn: () => api.post<{ ok: boolean; recipients: number }>('/admin/notifications/broadcast', { subject, body, target_plan: targetPlan, channel }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['admin-notifications'] })
      toast.ok(`Broadcast sent to ${r.recipients} merchants!`)
      setSubject('')
      setBody('')
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed to send broadcast')
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Broadcasts & Communication"
        sub="Send announcements, maintenance notices, and plan alerts to all or targeted merchants."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Composer Card */}
        <Card className="p-5 bg-white">
          <CardHeader title="Send Merchant Broadcast" sub="Dispatch notifications directly to merchant inboxes" />
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              sendMut.mutate()
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Target Audience">
                <Select value={targetPlan} onChange={(e) => setTargetPlan(e.target.value)}>
                  <option value="ALL">All Registered Merchants</option>
                  <option value="TRIAL">Merchants on Free Trial</option>
                  <option value="GROW">Grow Plan Subscribers</option>
                  <option value="PRO">Pro Plan Subscribers</option>
                  <option value="BUSINESS">Business Plan Subscribers</option>
                </Select>
              </Field>
              <Field label="Delivery Channel">
                <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
                  <option value="EMAIL">Email Notification</option>
                  <option value="IN_APP">Platform / In-App Notification</option>
                </Select>
              </Field>
            </div>

            <TextField
              label="Subject / Headline"
              required
              placeholder="e.g. Platform update: New WhatsApp Checkout features"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />

            <TextAreaField
              label="Broadcast Message Body"
              required
              rows={4}
              placeholder="Write announcement text here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />

            <Button type="submit" loading={sendMut.isPending} disabled={!subject || !body}>
              <Send className="size-4" /> Send Broadcast
            </Button>
          </form>
        </Card>

        {/* History Card */}
        <Card className="bg-white">
          <CardHeader title="Recent Notification Activity" sub="Log of sent announcements and system emails" />
          {!list.data?.length ? (
            <div className="p-8 text-center text-xs text-slate-500">No notifications sent yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
              {list.data.map((n) => (
                <li key={n.id} className="p-4 hover:bg-slate-50 transition text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate max-w-[280px]">{n.subject}</span>
                    <Badge tone={n.status === 'SENT' ? 'ok' : 'neutral'}>{n.status}</Badge>
                  </div>
                  <p className="mt-1 text-slate-500 truncate">{n.recipient} • {relativeTime(n.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// 8. STAFF & SECURITY
// ============================================================================
export function AdminStaff() {
  const qc = useQueryClient()
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'ADMIN' })

  const q = useQuery({
    queryKey: ['admin-staff'],
    queryFn: () => api.get<{ staff: any[]; available_roles: any[] }>('/admin/staff')
  })

  const addMut = useMutation({
    mutationFn: () => api.post('/admin/staff', form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-staff'] })
      toast.ok('Staff member added!')
      setModalOpen(false)
      setForm({ email: '', full_name: '', password: '', role: 'ADMIN' })
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed to add staff member')
  })

  if (!q.data) return <PageLoading />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff, Permissions & Security"
        sub="Role-based access control, active administrators, and security policy management."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="size-4" /> Add Admin
          </Button>
        }
      />

      {/* Staff Directory Table */}
      <Card className="bg-white overflow-hidden">
        <CardHeader title="Platform Administrators & Staff" sub="Users with elevated platform control access" />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <tr>
                <th className="py-3.5 pl-5 pr-3">Name & Email</th>
                <th className="px-3 py-3.5">Assigned Platform Role</th>
                <th className="px-3 py-3.5">Last Login</th>
                <th className="px-3 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-xs">
              {q.data.staff.map((st) => (
                <tr key={st.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 pl-5 pr-3">
                    <p className="font-bold text-slate-900">{st.full_name}</p>
                    <p className="text-slate-500">{st.email}</p>
                  </td>
                  <td className="px-3 py-3.5">
                    <Badge tone={st.platform_role === 'SUPER_ADMIN' ? 'lime' : 'info'}>
                      {st.platform_role}
                    </Badge>
                  </td>
                  <td className="px-3 py-3.5 text-slate-500">
                    {st.last_login_at ? fmtDate(st.last_login_at) : 'Never'}
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="font-bold text-emerald-600">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Roles & Permissions Breakdown */}
      <Card className="p-5 bg-white">
        <CardHeader title="Platform Roles & Access Matrix" sub="Permission levels configured for platform governance" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          {q.data.available_roles.map((r) => (
            <div key={r.role} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <span className="font-bold text-xs text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                {r.role}
              </span>
              <p className="mt-2 font-bold text-slate-900 text-sm">{r.label}</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">{r.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Add Admin Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Platform Administrator"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={addMut.isPending} onClick={() => addMut.mutate()}>Create Account</Button>
          </>
        }
      >
        <div className="space-y-4">
          <TextField label="Full Name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <TextField label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextField label="Password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Field label="Platform Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="ADMIN">Operations Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================================
// 9. ANALYTICS & REPORTS
// ============================================================================
export function AdminAnalytics() {
  const q = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api.get<any>('/admin/analytics'),
  })

  if (!q.data) return <PageLoading />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Reports"
        sub="Platform growth trends, conversion rates, merchant leaderboards, and CSV exports."
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Trial-to-Paid Rate" value={`${q.data.conversion_rate}%`} sub="Conversion efficiency" tone="lime" />
        <Stat label="Total Merchants" value={q.data.total_merchants} sub="All registered stores" />
        <Stat label="Paid Subscribers" value={q.data.paid_merchants} sub="Active subscriptions" />
        <Stat label="Web vs WA Orders" value={`${q.data.channel_breakdown.website} / ${q.data.channel_breakdown.whatsapp}`} sub="Channel split" />
      </div>

      {/* CSV Exports */}
      <Card className="p-5 bg-white">
        <CardHeader title="Data Export (CSV)" sub="Generate complete audit and reporting spreadsheets" />
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/api/v1/admin/export/merchants"
            download
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            <Download className="size-4 text-slate-500" /> Export All Merchants (CSV)
          </a>
          <a
            href="/api/v1/admin/export/orders"
            download
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            <Download className="size-4 text-slate-500" /> Export All Orders (CSV)
          </a>
        </div>
      </Card>

      {/* Top 10 Merchants Leaderboard */}
      <Card className="bg-white overflow-hidden">
        <CardHeader title="Top Performing Merchants by Order Volume" sub="Highest order counts across storefronts" />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <tr>
                <th className="py-3.5 pl-5 pr-3">Rank</th>
                <th className="px-3 py-3.5">Store Name</th>
                <th className="px-3 py-3.5">Store Slug</th>
                <th className="px-3 py-3.5">Total Orders</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Merchant Sales (GMV)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-xs">
              {q.data.top_merchants?.map((tm: any, idx: number) => (
                <tr key={tm.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 pl-5 pr-3 font-bold text-slate-500">#{idx + 1}</td>
                  <td className="px-3 py-3.5 font-bold text-slate-900">{tm.name}</td>
                  <td className="px-3 py-3.5 text-slate-500">/{tm.slug}</td>
                  <td className="px-3 py-3.5 font-bold text-slate-800">{tm.order_count} orders</td>
                  <td className="py-3.5 pl-3 pr-5 text-right font-extrabold text-emerald-600">
                    KES {tm.gmv.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ============================================================================
// 10. SYSTEM HEALTH
// ============================================================================
export function AdminHealth() {
  const q = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => api.get<any>('/admin/health'),
    refetchInterval: 30_000
  })

  if (!q.data) return <PageLoading />

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health & Infrastructure"
        sub="Live technical diagnostics, database connectivity, and media storage checks."
        actions={
          <Button variant="secondary" onClick={() => q.refetch()}>
            <RefreshCw className="size-4" /> Refresh Now
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 bg-white border border-slate-200">
          <p className="text-xs font-bold uppercase text-slate-500">API Status</p>
          <p className="mt-1 text-xl font-black text-emerald-600 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" /> Operational
          </p>
          <p className="mt-1 text-xs text-slate-400">Uptime: {q.data.api_uptime}</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <p className="text-xs font-bold uppercase text-slate-500">PostgreSQL Latency</p>
          <p className="mt-1 text-xl font-black text-slate-900">{q.data.database.latency_ms} ms</p>
          <p className="mt-1 text-xs text-emerald-600 font-bold">Connected</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <p className="text-xs font-bold uppercase text-slate-500">Media Storage</p>
          <p className="mt-1 text-xl font-black text-slate-900">{q.data.storage.status}</p>
          <p className="mt-1 text-xs text-slate-400 truncate">{q.data.storage.path}</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <p className="text-xs font-bold uppercase text-slate-500">Environment</p>
          <p className="mt-1 text-xl font-black text-slate-900">{q.data.runtime.environment}</p>
          <p className="mt-1 text-xs text-slate-400">Python {q.data.runtime.python_version}</p>
        </Card>
      </div>

      {/* Database Record Table Counters */}
      <Card className="p-5 bg-white">
        <CardHeader title="Database Table Record Counts" sub="Total rows persisted across primary tables" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(q.data.records || {}).map(([tbl, cnt]) => (
            <div key={tbl} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
              <p className="text-[11px] font-bold uppercase text-slate-500">{tbl}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{(cnt as number).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ============================================================================
// 11. PLATFORM CONFIGURATION & SETTINGS
// ============================================================================
export function AdminSettings() {
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: ['admin-settings'], queryFn: () => api.get<any>('/admin/settings') })
  const [form, setForm] = useState<any>(null)

  const saveMut = useMutation({
    mutationFn: (body: any) => api.patch('/admin/settings', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-settings'] })
      toast.ok('Platform settings saved successfully')
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed to save settings')
  })

  if (!q.data) return <PageLoading />
  const cur = form ?? q.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Configuration"
        sub="Default currency, support contacts, subscription payment instructions, and maintenance mode."
      />

      <Card className="p-5 bg-white space-y-6">
        <div>
          <h3 className="font-bold text-slate-900">Platform Identity</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <TextField
              label="Platform Name"
              value={cur.platform_name || ''}
              onChange={(e) => setForm({ ...cur, platform_name: e.target.value })}
            />
            <TextField
              label="Default Currency"
              value={cur.default_currency || 'KES'}
              onChange={(e) => setForm({ ...cur, default_currency: e.target.value })}
            />
            <TextField
              label="Contact Email"
              type="email"
              value={cur.contact_email || ''}
              onChange={(e) => setForm({ ...cur, contact_email: e.target.value })}
            />
            <TextField
              label="Support WhatsApp"
              value={cur.support_whatsapp || ''}
              onChange={(e) => setForm({ ...cur, support_whatsapp: e.target.value })}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h3 className="font-bold text-slate-900">Subscription Payment Instructions (M-Pesa / Bank)</h3>
          <p className="text-xs text-slate-500 mb-3">Shown to merchants when paying for their Aqivo plan.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="M-Pesa Paybill / Till Number"
              value={cur.subscription_instructions?.mpesa_shortcode || ''}
              onChange={(e) =>
                setForm({
                  ...cur,
                  subscription_instructions: { ...cur.subscription_instructions, mpesa_shortcode: e.target.value }
                })
              }
            />
            <TextField
              label="Account Name"
              value={cur.subscription_instructions?.account_name || ''}
              onChange={(e) =>
                setForm({
                  ...cur,
                  subscription_instructions: { ...cur.subscription_instructions, account_name: e.target.value }
                })
              }
            />
          </div>
          <div className="mt-3">
            <TextAreaField
              label="Payment Verification Note"
              rows={2}
              value={cur.subscription_instructions?.notes || ''}
              onChange={(e) =>
                setForm({
                  ...cur,
                  subscription_instructions: { ...cur.subscription_instructions, notes: e.target.value }
                })
              }
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <label className="flex items-center gap-2.5 font-bold text-sm text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              className="size-4 accent-[#5B21F5]"
              checked={!!cur.maintenance_mode}
              onChange={(e) => setForm({ ...cur, maintenance_mode: e.target.checked })}
            />
            Platform Maintenance Mode (Disable new store registrations)
          </label>
          <Button loading={saveMut.isPending} onClick={() => saveMut.mutate(cur)}>
            Save Configuration
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ============================================================================
// 12. CREATE BUSINESS, DETAIL, SALES, PLANS, SUPPORT, AUDIT (INTEGRATED)
// ============================================================================
export function AdminNewBusiness() {
  const nav = useNavigate()
  const toast = useToast()
  const cfg = useQuery({ queryKey: ['config'], queryFn: () => api.get<{ countries: CountryConfig[] }>('/businesses/config'), staleTime: Infinity })
  const tpls = useQuery({ queryKey: ['templates'], queryFn: () => api.get<{ key: string; name: string }[]>('/templates') })
  const [f, setF] = useState({
    name: '', owner_name: '', owner_email: '', phone: '', whatsapp: '', city: '', country_code: 'KE',
    category: 'Beauty Salon', template_key: 'twosidesboutique', plan_key: 'GROW', trial: false, description: ''
  })
  const [created, setCreated] = useState<any | null>(null)
  const m = useMutation({
    mutationFn: () => api.post<any>('/admin/businesses', { ...f, phone: f.phone || null, whatsapp: f.whatsapp || null }),
    onSuccess: setCreated,
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed')
  })
  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }))

  if (created) return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader title="Business Created" sub={`${created.business.name} is ready. Owner login credentials generated.`} />
      <Card className="space-y-4 p-5 bg-white">
        <CopyField label="Owner login" value={created.owner_email} onCopied={() => toast.ok('Copied')} />
        {created.temporary_password && (
          <CopyField label="Temporary password (shown once)" value={created.temporary_password} onCopied={() => toast.ok('Copied')} />
        )}
        <CopyField label="Business link" value={created.urls.profile} onCopied={() => toast.ok('Copied')} />
      </Card>
      <Button size="lg" onClick={() => nav(`/admin/businesses/${created.business.id}`)}>Open business</Button>
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Create Store" sub="Manual onboarding: creates the owner login, business, website and subscription in one step." />
      <Card className="bg-white">
        <form className="grid gap-4 p-5 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); m.mutate() }}>
          <TextField label="Business name" required value={f.name} onChange={(e) => set('name', e.target.value)} />
          <TextField label="Category" value={f.category} onChange={(e) => set('category', e.target.value)} />
          <TextField label="Owner name" required value={f.owner_name} onChange={(e) => set('owner_name', e.target.value)} />
          <TextField label="Owner email" type="email" required value={f.owner_email} onChange={(e) => set('owner_email', e.target.value)} />
          <TextField label="Phone" type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          <TextField label="WhatsApp" type="tel" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} hint="Defaults to the phone number." />
          <Field label="Country">
            <Select value={f.country_code} onChange={(e) => set('country_code', e.target.value)}>
              {cfg.data?.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </Select>
          </Field>
          <TextField label="City / area" value={f.city} onChange={(e) => set('city', e.target.value)} />
          <Field label="Template">
            <Select value={f.template_key} onChange={(e) => set('template_key', e.target.value)}>
              {tpls.data?.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Plan">
            <Select value={f.plan_key} onChange={(e) => set('plan_key', e.target.value)}>
              {['FREE', 'GROW', 'PRO', 'BUSINESS'].map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2">
            <input type="checkbox" className="size-4 accent-[#5B21F5]" checked={f.trial} onChange={(e) => set('trial', e.target.checked)} />
            Start as a free trial
          </label>
          <div className="md:col-span-2">
            <TextAreaField label="Description" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" size="lg" loading={m.isPending}>Create business</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

interface Detail {
  business: Business
  urls: { profile: string }
  is_verified?: boolean
  is_featured?: boolean
  owner: { id: string; email: string; name: string } | null
  subscription: {
    status: string
    plan_key: string
    trial_ends_at: string | null
    current_period_end: string | null
    price_override: string | null
  } | null
  website: { status: string; template: string } | null
  counts: { leads: number; customers: number; bookings: number; products?: number; orders?: number }
  activity: { action: string; created_at: string; impersonator_id: string | null }[]
}

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
  const act = (path: string, msg: string, body?: unknown) =>
    api.post(`/admin/businesses/${id}/${path}`, body).then(() => { inv(); toast.ok(msg) }).catch((e: Error) => toast.err(e.message))

  const imp = useMutation({
    mutationFn: () => api.post<{ access_token: string }>(`/admin/businesses/${id}/impersonate`),
    onSuccess: async (r) => { await startImpersonation(r.access_token); nav('/dashboard') },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed')
  })

  if (!q.data) return <PageLoading />
  const d = q.data
  const b = d.business

  return (
    <div className="space-y-6">
      <PageHeader
        title={b.name}
        sub={
          <span className="flex flex-wrap items-center gap-2">
            /{b.slug}
            <StatusBadge status={b.status} />
            {d.website && <StatusBadge status={d.website.status} />}
            {d.is_verified && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-extrabold text-emerald-700">
                <BadgeCheck className="size-3 text-emerald-600" /> Verified
              </span>
            )}
            <a className="inline-flex items-center gap-1 font-bold underline" href={d.urls.profile} target="_blank" rel="noreferrer">
              View Storefront <ExternalLink className="size-3" />
            </a>
          </span>
        }
        actions={
          <>
            <Button variant="primary" loading={imp.isPending} onClick={() => imp.mutate()}>
              Manage as owner
            </Button>
            <Button variant="secondary" onClick={() => void act('verify', 'Verification status toggled')}>
              {d.is_verified ? 'Revoke verification' : 'Verify merchant'}
            </Button>
            <Button variant="secondary" onClick={() => void act('publish', 'Website published')}>
              Publish website
            </Button>
            {b.status === 'ACTIVE' ? (
              <Button variant="danger" onClick={() => void act('suspend', 'Business suspended')}>Suspend</Button>
            ) : (
              <Button onClick={() => void act('activate', 'Business activated')}>Activate</Button>
            )}
          </>
        }
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
        “Manage as owner” opens their dashboard in support mode. It is never silent: the start and every change are written to the audit log with your name.
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Products" value={d.counts.products ?? 0} />
        <Stat label="Orders" value={d.counts.orders ?? 0} />
        <Stat label="Leads" value={d.counts.leads} />
        <Stat label="Bookings" value={d.counts.bookings} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white">
          <CardHeader title="Owner & Store Info" />
          <dl className="space-y-2 p-5 text-sm">
            {[
              ['Owner', d.owner ? `${d.owner.name} (${d.owner.email})` : '—'],
              ['Phone', b.phone ?? '—'],
              ['WhatsApp', b.whatsapp ?? '—'],
              ['Location', [b.city, b.country_code].filter(Boolean).join(', ')],
              ['Currency', b.currency],
              ['Created', fmtDate(b.created_at)],
              ['Template', d.website?.template ?? '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-semibold text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="bg-white">
          <CardHeader title="Subscription & Plan" action={<Button size="sm" onClick={() => setModal(true)}>Change</Button>} />
          {d.subscription ? (
            <dl className="space-y-2 p-5 text-sm">
              {[
                ['Plan Tier', d.subscription.plan_key],
                ['Billing Status', cap(d.subscription.status)],
                ['Trial Ends', fmtDate(d.subscription.trial_ends_at)],
                ['Period Ends', fmtDate(d.subscription.current_period_end)],
                ['Price Override', d.subscription.price_override ? money(d.subscription.price_override, b.currency) : 'Standard'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-semibold text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="p-5 text-sm text-slate-500">No active subscription record.</p>
          )}
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader title="Recent Activity & Impersonation Audit" />
        <ul className="divide-y divide-slate-100 text-sm">
          {d.activity.map((a, i) => (
            <li key={i} className="flex justify-between px-5 py-2.5">
              <span>{a.action}{a.impersonator_id && <Badge tone="warn"> by admin</Badge>}</span>
              <span className="text-slate-400">{relativeTime(a.created_at)}</span>
            </li>
          ))}
          {!d.activity.length && <li className="px-5 py-4 text-slate-400">No activity recorded yet.</li>}
        </ul>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Change subscription" footer={
        <>
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={() => { void act('subscription', 'Subscription updated', { plan_key: sub.plan_key, action: sub.action, months: Number(sub.months) }); setModal(false) }}>Apply</Button>
        </>
      }>
        <div className="space-y-4">
          <Field label="Action">
            <Select value={sub.action} onChange={(e) => setSub({ ...sub, action: e.target.value })}>
              <option value="activate">Activate (payment received)</option>
              <option value="trial">Start trial</option>
              <option value="cancel">Cancel now</option>
              <option value="expire">Mark expired</option>
              <option value="suspend">Suspend</option>
            </Select>
          </Field>
          <Field label="Plan">
            <Select value={sub.plan_key} onChange={(e) => setSub({ ...sub, plan_key: e.target.value })}>
              {['FREE', 'GROW', 'PRO', 'BUSINESS'].map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          {sub.action === 'activate' && (
            <TextField label="Months paid" type="number" min={1} max={24} value={sub.months} onChange={(e) => setSub({ ...sub, months: e.target.value })} />
          )}
        </div>
      </Modal>
    </div>
  )
}

// Support Tickets
interface Ticket {
  id: string
  business_name: string | null
  business_slug: string | null
  subject: string
  body: string
  status: string
  priority: string
  admin_notes: string
  created_at: string
}

export function AdminSupport() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['tickets'], queryFn: () => api.get<Ticket[]>('/admin/support-tickets') })
  const upd = useMutation({
    mutationFn: (v: { id: string; status: string }) => api.patch(`/admin/support-tickets/${v.id}`, { status: v.status }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['tickets'] })
  })

  return (
    <div className="space-y-5">
      <PageHeader title="Support Center" sub="Merchant enquiries, billing questions, and assistance tickets." />
      <Card className="bg-white">
        {!q.data?.length ? (
          <EmptyState title="No support tickets" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {q.data.map((t) => (
              <li key={t.id} className="space-y-2 px-5 py-4 hover:bg-slate-50 transition">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{t.subject}</span>
                    {t.priority === 'HIGH' && <Badge tone="bad">High Priority</Badge>}
                    <StatusBadge status={t.status} />
                  </div>
                  <span className="text-xs text-slate-400">
                    {t.business_name} • {relativeTime(t.created_at)}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{t.body}</p>
                <div className="flex gap-2 pt-1">
                  {t.status !== 'RESOLVED' ? (
                    <Button size="sm" variant="secondary" onClick={() => upd.mutate({ id: t.id, status: 'RESOLVED' })}>
                      Mark Resolved
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => upd.mutate({ id: t.id, status: 'OPEN' })}>
                      Reopen Ticket
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

// Sales CRM
interface SL {
  id: string
  business_name: string
  owner_name: string
  phone: string | null
  industry: string
  location: string
  source: string
  status: string
  notes: string
  follow_up_on: string | null
  business_id: string | null
}
const SL_STATUS = ['NEW', 'CONTACTED', 'DEMO', 'INTERESTED', 'ONBOARDING', 'ACTIVE', 'LOST']

export function AdminSales() {
  const qc = useQueryClient()
  const toast = useToast()
  const [status, setStatus] = useState('ALL')
  const [open, setOpen] = useState<Partial<SL> | null>(null)
  const q = useQuery({ queryKey: ['sales'], queryFn: () => api.get<SL[]>('/admin/sales-leads') })
  const inv = () => void qc.invalidateQueries({ queryKey: ['sales'] })
  const save = useMutation({
    mutationFn: (s: Partial<SL>) => (s.id ? api.patch(`/admin/sales-leads/${s.id}`, s) : api.post('/admin/sales-leads', { ...s, follow_up_on: s.follow_up_on || null })),
    onSuccess: () => { inv(); setOpen(null) },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed')
  })
  const setSt = useMutation({
    mutationFn: (v: { id: string; status: string }) => api.patch(`/admin/sales-leads/${v.id}`, { status: v.status }),
    onSuccess: inv
  })
  const items = (q.data ?? []).filter((s) => status === 'ALL' || s.status === status)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales CRM"
        sub="Acquisition pipeline for manually onboarded salons, boutiques, and merchants."
        actions={<Button onClick={() => setOpen({ status: 'NEW', industry: 'beauty' })}><Plus className="size-4" /> Add Lead</Button>}
      />
      <div className="mb-4">
        <Tabs
          value={status}
          onChange={setStatus}
          items={[
            { value: 'ALL', label: 'All', count: q.data?.length },
            ...SL_STATUS.map((s) => ({ value: s, label: cap(s), count: q.data?.filter((x) => x.status === s).length }))
          ]}
        />
      </div>
      <Card className="bg-white">
        {!items.length ? (
          <EmptyState title="No sales leads in this stage" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition">
                <button className="min-w-0 flex-1 basis-56 text-left" onClick={() => setOpen(s)}>
                  <p className="font-bold text-slate-900">{s.business_name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {s.owner_name} • {s.phone ?? 'No phone'} • {s.location}{s.follow_up_on ? ` • Follow up ${fmtDate(s.follow_up_on)}` : ''}
                  </p>
                </button>
                <Select
                  className="h-9 w-40 rounded-full py-0 text-xs"
                  value={s.status}
                  onChange={(e) => setSt.mutate({ id: s.id, status: e.target.value })}
                >
                  {SL_STATUS.map((x) => <option key={x} value={x}>{cap(x)}</option>)}
                </Select>
                {!s.business_id && ['INTERESTED', 'ONBOARDING'].includes(s.status) && (
                  <Link className="text-xs font-bold text-[#5B21F5] underline" to={`/admin/businesses/new?lead=${s.id}`}>
                    Create Store
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.id ? 'Edit Lead' : 'New Sales Lead'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(null)}>Cancel</Button>
            <Button loading={save.isPending} disabled={!open?.business_name?.trim()} onClick={() => open && save.mutate(open)}>Save</Button>
          </>
        }
      >
        {open && (
          <div className="space-y-4">
            <TextField label="Business" value={open.business_name ?? ''} onChange={(e) => setOpen({ ...open, business_name: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Owner" value={open.owner_name ?? ''} onChange={(e) => setOpen({ ...open, owner_name: e.target.value })} />
              <TextField label="Phone" value={open.phone ?? ''} onChange={(e) => setOpen({ ...open, phone: e.target.value })} />
              <TextField label="Location" value={open.location ?? ''} onChange={(e) => setOpen({ ...open, location: e.target.value })} />
              <TextField label="Source" value={open.source ?? ''} onChange={(e) => setOpen({ ...open, source: e.target.value })} placeholder="Instagram, Walk-in…" />
            </div>
            <TextField label="Follow-up Date" type="date" value={open.follow_up_on ?? ''} onChange={(e) => setOpen({ ...open, follow_up_on: e.target.value })} />
            <TextAreaField label="Notes" rows={3} value={open.notes ?? ''} onChange={(e) => setOpen({ ...open, notes: e.target.value })} />
          </div>
        )}
      </Modal>
    </div>
  )
}

// Plans & Pricing
interface AP {
  key: string
  name: string
  description: string
  prices: Record<string, string>
  features: string[]
  is_public: boolean
  limits: Record<string, number>
}

export function AdminPlans() {
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => api.get<{ plans: AP[]; all_features: Record<string, string>; limit_labels: Record<string, string> }>('/admin/plans')
  })
  const save = useMutation({
    mutationFn: (p: AP) => api.patch(`/admin/plans/${p.key}`, { name: p.name, description: p.description, prices: p.prices, features: p.features, limits: p.limits }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin-plans'] }); toast.ok('Plan saved') },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed')
  })
  const [edit, setEdit] = useState<Record<string, AP>>({})
  if (!q.data) return <PageLoading />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Plans & Pricing"
        sub="Prices, features, and quota limits per tier. Values are read dynamically across the platform."
      />
      {q.data.plans.map((orig) => {
        const p = edit[orig.key] ?? orig
        const set = (n: AP) => setEdit({ ...edit, [orig.key]: n })
        return (
          <Card key={p.key} className="bg-white">
            <CardHeader
              title={`${p.key} Tier`}
              action={
                <Button
                  size="sm"
                  loading={save.isPending && save.variables?.key === p.key}
                  disabled={!edit[orig.key]}
                  onClick={() => save.mutate(p)}
                >
                  Save Tier
                </Button>
              }
            />
            <div className="grid gap-4 p-5 md:grid-cols-3">
              <TextField label="Name" value={p.name} onChange={(e) => set({ ...p, name: e.target.value })} />
              {['KES', 'USD'].map((c) => (
                <TextField
                  key={c}
                  label={`Monthly price (${c})`}
                  type="number"
                  min={0}
                  value={p.prices[c] ?? ''}
                  onChange={(e) => set({ ...p, prices: { ...p.prices, [c]: e.target.value } })}
                />
              ))}
              <div className="md:col-span-3">
                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Tier Features</p>
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(q.data.all_features).map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        className="size-4 accent-[#5B21F5]"
                        checked={p.features.includes(k)}
                        onChange={(e) =>
                          set({ ...p, features: e.target.checked ? [...p.features, k] : p.features.filter((x) => x !== k) })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-3">
                <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                  Resource Limits <span className="font-normal text-slate-400">— leave blank for unlimited</span>
                </p>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {Object.entries(q.data.limit_labels).map(([k, label]) => (
                    <TextField
                      key={k}
                      label={label}
                      type="number"
                      min={0}
                      value={p.limits?.[k] ?? ''}
                      onChange={(e) => {
                        const l = { ...(p.limits ?? {}) }
                        if (e.target.value === '') delete l[k]
                        else l[k] = Number(e.target.value)
                        set({ ...p, limits: l })
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// Audit Log
export function AdminAudit() {
  const [action, setAction] = useState('')
  const q = useQuery({
    queryKey: ['audit', action],
    queryFn: () => api.get<any[]>('/admin/audit-logs', { action, limit: 200 })
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform Audit Log"
        sub="Complete immutable trail: logins, impersonations, payments, subscriptions, and administrative actions."
      />
      <Input
        aria-label="Filter by action"
        className="max-w-sm bg-white"
        placeholder="Filter, e.g. admin. or auth."
        value={action}
        onChange={(e) => setAction(e.target.value)}
      />
      <Card className="bg-white overflow-hidden">
        <ul className="divide-y divide-slate-100 text-xs">
          {q.data?.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-slate-50 transition">
              <span className="font-semibold text-slate-900">
                {a.action}
                {a.impersonator_id && <Badge tone="warn">impersonated</Badge>}
              </span>
              <span className="text-slate-400">
                {a.ip ?? '—'} • {fmtDate(a.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </li>
          ))}
          {q.data && !q.data.length && <li className="px-5 py-6 text-slate-400">No log entries found.</li>}
        </ul>
      </Card>
    </div>
  )
}
