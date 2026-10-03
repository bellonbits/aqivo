import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, ApiError } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { Card, CardHeader, ErrorState, NotEnoughData, PageHeader, PageLoading, Stat, Tabs, UpgradePrompt } from '@/components/ui'
import { cap, fmtDate, money } from '@/lib/format'
import type { AnalyticsSummary, Health } from '@/types'
import { Link, useSearchParams } from 'react-router-dom'
import { CampaignsTab, FunnelTab, ProductsTab, SourcesTab } from '@/features/analytics/GrowthTabs'

type Period = 'today' | '7d' | '30d' | '90d'
type AView = 'overview' | 'sources' | 'funnel' | 'campaigns' | 'products'
type Metric = 'visitors' | 'whatsapp' | 'leads' | 'bookings' | 'revenue'
const METRICS: { value: Metric; label: string; adv?: boolean }[] = [{ value: 'visitors', label: 'Visitors' }, { value: 'whatsapp', label: 'WhatsApp clicks' }, { value: 'leads', label: 'Leads' }, { value: 'bookings', label: 'Bookings' }, { value: 'revenue', label: 'Revenue', adv: true }]

/** Single-series bar chart: one ink colour (no legend needed — the title names the series), recessive grid, rounded data-ends, hover tooltip. */
function Series({ metric, period, currency }: { metric: Metric; period: Period; currency: string }) {
  const { has } = useBusiness()
  const locked = metric === 'revenue' && !has('analytics_advanced')
  const q = useQuery({ queryKey: ['ts', metric, period], queryFn: () => api.get<{ points: { date: string; value: number }[] }>('/analytics/timeseries', { metric, period }), enabled: !locked })
  if (locked) return <UpgradePrompt feature="advanced analytics" title="Revenue charts are on Pro" body="See revenue over time with Pro and Business." />
  if (q.isLoading) return <PageLoading />
  const pts = q.data?.points ?? []
  if (!pts.length) return <NotEnoughData hint="This chart fills in as real activity is recorded." />
  const label = METRICS.find((m) => m.value === metric)!.label
  const fmt = (v: number) => (metric === 'revenue' ? money(v, currency) : String(v))
  return (
    <>
      <div className="h-64 w-full" role="img" aria-label={`${label} per day. Data table below.`}>
        <ResponsiveContainer>
          <BarChart data={pts} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#E7E6E0" />
            <XAxis dataKey="date" tickFormatter={(d: string) => fmtDate(d, { day: 'numeric', month: 'short' })} tick={{ fontSize: 12, fill: '#6B6B66' }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={{ fontSize: 12, fill: '#6B6B66' }} axisLine={false} tickLine={false} allowDecimals={false} width={48} />
            <Tooltip cursor={{ fill: 'rgba(15,15,15,0.05)' }} formatter={(v) => [fmt(Number(v)), label]} labelFormatter={(d) => fmtDate(String(d))} contentStyle={{ borderRadius: 12, border: '1px solid #E7E6E0', fontSize: 13 }} />
            <Bar dataKey="value" fill="#0F0F0F" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm"><summary className="cursor-pointer font-semibold text-muted">View as table</summary>
        <table className="mt-2 w-full text-left"><thead><tr className="text-xs text-muted"><th className="py-1">Date</th><th>{label}</th></tr></thead><tbody>{pts.map((p) => <tr key={p.date} className="border-t border-line"><td className="py-1">{fmtDate(p.date)}</td><td>{fmt(p.value)}</td></tr>)}</tbody></table></details>
    </>
  )
}

export default function Analytics() {
  const { has, business } = useBusiness()
  const [period, setPeriod] = useState<Period>('30d')
  const [metric, setMetric] = useState<Metric>('visitors')
  const [params, setParams] = useSearchParams()
  const view = (['overview', 'sources', 'funnel', 'campaigns', 'products'].includes(params.get('tab') ?? '') ? params.get('tab') : 'overview') as AView
  const srcList = useQuery({ queryKey: ['a-sources', period], queryFn: () => api.get<{ rows: { source: string }[] }>('/analytics/sources', { period }), enabled: has('analytics') && view === 'funnel' })
  const s = useQuery({ queryKey: ['analytics', period], queryFn: () => api.get<AnalyticsSummary>('/analytics/summary', { period }), enabled: has('analytics') })
  const h = useQuery({ queryKey: ['health'], queryFn: () => api.get<Health>('/analytics/health'), enabled: has('analytics') })
  if (!has('analytics')) return <div><PageHeader title="Analytics" /><UpgradePrompt feature="analytics" body="See visitors, WhatsApp taps, bookings and revenue — real numbers only. Available on Grow and above." /></div>
  if (s.isLoading) return <PageLoading />
  if (s.error || !s.data) return <ErrorState message={s.error instanceof ApiError ? s.error.message : 'Failed to load'} onRetry={() => void s.refetch()} />
  const d = s.data
  const cur = business?.currency ?? 'KES'
  const cards: [string, string | number | null, string?][] = [['Visitors', d.visitors], ['Profile views', d.profile_views], ['WhatsApp clicks', d.whatsapp_clicks], ['Phone clicks', d.phone_clicks], ['Booking requests', d.booking_requests], ['Completed bookings', d.completed_bookings], ['Lead conversion', d.lead_conversion_rate === null ? '—' : `${d.lead_conversion_rate}%`, d.lead_conversion_rate === null ? 'No leads yet' : undefined], ['Reviews', d.reviews, d.average_rating ? `${d.average_rating}★ average` : undefined], ['Revenue', money(d.revenue, cur)], ['Returning customers', d.returning_customers]]
  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" sub="Every number here comes from real activity on your page and dashboard." actions={<Tabs<Period> value={period} onChange={setPeriod} items={[{ value: 'today', label: 'Today' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }]} />} />
      <Tabs<AView> value={view} onChange={(v) => setParams(v === 'overview' ? {} : { tab: v })} items={[{ value: 'overview', label: 'Overview' }, { value: 'sources', label: 'Sources' }, { value: 'funnel', label: 'Funnel' }, { value: 'campaigns', label: 'Campaigns' }, { value: 'products', label: 'Products' }]} />
      {view === 'sources' && <SourcesTab period={period} />}
      {view === 'funnel' && <FunnelTab period={period} sources={(srcList.data?.rows ?? []).map((r) => r.source)} />}
      {view === 'campaigns' && <CampaignsTab period={period} />}
      {view === 'products' && <ProductsTab period={period} />}
      {view === 'overview' && <>
      {!d.has_data && <NotEnoughData hint="Nothing recorded in this period yet. Share your link to start collecting data." />}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{cards.map(([l, v, sub]) => <Stat key={l} label={l} value={v} sub={sub} />)}</div>
      <Card><CardHeader title="Over time" action={<Tabs<Metric> value={metric} onChange={setMetric} items={METRICS.map((m) => ({ value: m.value, label: m.label }))} />} /><div className="p-5"><Series metric={metric} period={period} currency={cur} /></div></Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Where leads come from" />{d.leads_by_source?.length ? <ul className="divide-y divide-line">{d.leads_by_source.map((x) => <li key={x.source} className="flex items-center justify-between px-5 py-3 text-sm"><span>{cap(x.source)}</span><b>{x.count}</b></li>)}</ul> : <div className="p-5"><NotEnoughData /></div>}</Card>
        <Card><CardHeader title="Services getting interest" sub="Bookings, leads and WhatsApp taps" />{d.top_services?.length ? <ul className="divide-y divide-line">{d.top_services.map((x) => <li key={x.service} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span className="font-semibold">{x.service}</span><span className="text-muted">{x.bookings} bookings · {x.leads} leads · {x.whatsapp_clicks} WhatsApp</span></li>)}</ul> : <div className="p-5"><NotEnoughData /></div>}</Card>
      </div>
      <Card><CardHeader title="Business health" sub="A private diagnostic — not a public ranking" />
        {h.data ? <div className="p-5"><div className="flex items-end gap-3"><span className="text-5xl font-extrabold">{h.data.overall === null ? '—' : `${h.data.overall}%`}</span>{h.data.overall === null && <span className="pb-2 text-sm text-muted">Not enough data yet</span>}</div>
          <ul className="mt-4 space-y-3">{Object.entries(h.data.components).map(([k, c]) => <li key={k}><div className="flex justify-between text-sm"><span className="font-semibold">{cap(k)}</span><span className="font-bold">{c.score === null ? 'No data yet' : `${c.score}%`}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-ink" style={{ width: `${c.score ?? 0}%` }} /></div><p className="mt-1 text-xs text-muted">{c.basis}</p></li>)}</ul>
          {!!h.data.recommendations.length && <div className="mt-5 border-t border-line pt-4"><p className="mb-2 text-sm font-bold">Recommendations</p><ol className="list-decimal space-y-1.5 pl-5 text-sm">{h.data.recommendations.map((r) => <li key={r.key}><Link className="hover:underline" to={r.href}>{r.text}</Link></li>)}</ol></div>}
          <p className="mt-4 text-xs text-muted">{h.data.note}</p></div> : <PageLoading />}</Card>
      </>}
    </div>
  )
}
