import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardHeader, NotEnoughData, PageLoading, Select } from '@/components/ui'
import { cap, money } from '@/lib/format'
import { useState } from 'react'
import type { CampaignRow, FunnelStep, ProductPerf, SourceRow } from '@/types'

type Period = 'today' | '7d' | '30d' | '90d'
const label = (s: string) => (s === 'direct' ? 'Direct / unknown' : s === 'offline' ? 'Taken by you (phone, WhatsApp)' : s === 'qr' ? 'QR codes' : cap(s))

function Bar({ value, max, tone = 'bg-brand' }: { value: number; max: number; tone?: string }) {
  return <div className="h-2 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${tone}`} style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} /></div>
}

function Table<T extends { visitors: number; leads: number; orders: number; bookings: number; revenue: number; conversion: number | null; whatsapp_clicks: number; customers: number }>({ rows, name, currency }: { rows: T[]; name: (r: T) => string; currency: string }) {
  const max = Math.max(1, ...rows.map((r) => r.revenue))
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead><tr className="text-xs text-muted"><th className="px-5 py-2">&nbsp;</th><th>Visitors</th><th>WhatsApp taps</th><th>Leads</th><th>Orders + bookings</th><th>New customers</th><th>Conversion</th><th className="pr-5 text-right">Tracked revenue</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={name(r)} className="border-t border-line align-top">
            <td className="px-5 py-3 font-bold">{name(r)}<div className="mt-1.5 w-40"><Bar value={r.revenue} max={max} /></div></td>
            <td>{r.visitors}</td><td>{r.whatsapp_clicks}</td><td>{r.leads}</td><td>{r.orders + r.bookings}</td><td>{r.customers}</td><td>{r.conversion === null ? '—' : `${r.conversion}%`}</td>
            <td className="pr-5 text-right font-extrabold">{money(r.revenue, currency)}</td></tr>))}</tbody>
      </table>
    </div>
  )
}

export function SourcesTab({ period }: { period: Period }) {
  const q = useQuery({ queryKey: ['a-sources', period], queryFn: () => api.get<{ rows: SourceRow[]; currency: string; has_data: boolean }>('/analytics/sources', { period }) })
  if (q.isLoading) return <PageLoading />
  const rows = (q.data?.rows ?? []).filter((r) => r.visitors || r.leads || r.orders || r.bookings || r.customers)
  return (
    <Card>
      <CardHeader title="Where your customers come from" sub="Visitors, enquiries, sales and money by source. Add ?source= to the links you share (Marketing → Links & QR) to tell channels apart." />
      {!rows.length ? <div className="p-5"><NotEnoughData hint="Share tracked links on Instagram, TikTok, WhatsApp and posters. Results appear here as customers arrive." /></div> : <Table rows={rows} name={(r) => label(r.source)} currency={q.data?.currency ?? 'KES'} />}
      <p className="border-t border-line px-5 py-3 text-xs text-muted">Tracked revenue = paid online orders + completed bookings attributed to the source. “Direct / unknown” means no source link or recognisable referrer.</p>
    </Card>
  )
}

export function CampaignsTab({ period }: { period: Period }) {
  const q = useQuery({ queryKey: ['a-campaigns', period], queryFn: () => api.get<{ rows: CampaignRow[]; currency: string }>('/analytics/campaigns', { period }) })
  if (q.isLoading) return <PageLoading />
  const rows = q.data?.rows ?? []
  return (
    <Card>
      <CardHeader title="Campaign results" sub="Everything that arrived through a campaign link or QR code" />
      {!rows.length ? <div className="p-5"><NotEnoughData hint="Create a campaign or QR code in Marketing and share its link. Results show up here." /></div> : <Table rows={rows} name={(r) => r.name} currency={q.data?.currency ?? 'KES'} />}
    </Card>
  )
}

export function FunnelTab({ period, sources }: { period: Period; sources: string[] }) {
  const [src, setSrc] = useState('')
  const q = useQuery({ queryKey: ['a-funnel', period, src], queryFn: () => api.get<{ steps: FunnelStep[]; has_data: boolean; note: string }>('/analytics/funnel', { period, source: src || undefined }) })
  const steps = q.data?.steps ?? []
  const max = Math.max(1, ...steps.map((s) => s.count))
  return (
    <Card>
      <CardHeader title="Customer funnel" sub="From first visit to a completed sale" action={<div className="w-44"><Select aria-label="Filter by source" value={src} onChange={(e) => setSrc(e.target.value)}><option value="">All sources</option>{sources.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select></div>} />
      {q.isLoading ? <PageLoading /> : !q.data?.has_data ? <div className="p-5"><NotEnoughData /></div> : (
        <ol className="space-y-4 p-5">{steps.map((s) => (
          <li key={s.key}><div className="mb-1 flex items-baseline justify-between gap-3"><span className="text-sm font-semibold">{s.label}</span><span className="text-sm"><b className="text-lg font-extrabold">{s.count}</b>{s.pct_of_visitors !== null && s.key !== 'visitors' && <span className="ml-2 text-muted">{s.pct_of_visitors}% of visitors</span>}</span></div><Bar value={s.count} max={max} /></li>))}</ol>)}
      <p className="border-t border-line px-5 py-3 text-xs text-muted">{q.data?.note}</p>
    </Card>
  )
}

export function ProductsTab({ period }: { period: Period }) {
  const q = useQuery({ queryKey: ['a-products', period], queryFn: () => api.get<{ products: ProductPerf[]; categories: { name: string; units: number; revenue: number }[]; services: { name: string; views: number }[]; has_data: boolean; currency: string }>('/analytics/products', { period }) })
  if (q.isLoading) return <PageLoading />
  const d = q.data
  if (!d?.has_data) return <Card><CardHeader title="Products & services" /><div className="p-5"><NotEnoughData hint="Product views, bag additions and sales appear as customers browse your storefront." /></div></Card>
  return (
    <div className="space-y-6">
      {!!d.products.length && <Card><CardHeader title="Products" sub="Views, bag additions and sales" />
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="text-xs text-muted"><th className="px-5 py-2">Product</th><th>People who viewed</th><th>Added to bag</th><th>Units sold</th><th>Views → sale</th><th className="pr-5 text-right">Revenue</th></tr></thead>
          <tbody>{d.products.map((p) => <tr key={p.id} className="border-t border-line"><td className="px-5 py-3 font-bold">{p.name}</td><td>{p.viewers}</td><td>{p.added_to_bag}</td><td>{p.units}</td><td>{p.conversion === null ? '—' : `${p.conversion}%`}</td><td className="pr-5 text-right font-extrabold">{money(p.revenue, d.currency)}</td></tr>)}</tbody></table></div></Card>}
      <div className="grid gap-6 lg:grid-cols-2">
        {!!d.categories.length && <Card><CardHeader title="Categories by revenue" /><ul className="divide-y divide-line">{d.categories.map((c) => <li key={c.name} className="flex items-center justify-between px-5 py-3 text-sm"><span className="font-semibold">{c.name}</span><span className="text-muted">{c.units} sold · <b className="text-ink">{money(c.revenue, d.currency)}</b></span></li>)}</ul></Card>}
        {!!d.services.length && <Card><CardHeader title="Most viewed services" /><ul className="divide-y divide-line">{d.services.map((s) => <li key={s.name} className="flex items-center justify-between px-5 py-3 text-sm"><span className="font-semibold">{s.name}</span><b>{s.views} views</b></li>)}</ul></Card>}
      </div>
    </div>
  )
}
