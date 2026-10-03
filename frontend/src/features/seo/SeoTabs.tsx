import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, ExternalLink, Info, Trash2, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, Card, CardHeader, EmptyState, Field, PageLoading, Select, TextField, UpgradePrompt } from '@/components/ui'
import { ImageInput } from '@/features/website/ImageInput'
import { Toggle } from '@/features/website/SectionForm'
import { cn } from '@/lib/cn'
import type { Website } from '@/types'

interface Issue { severity: 'error' | 'warn' | 'info'; area: string; message: string; fix: string; count: number | null }

export function AuditTab() {
  const q = useQuery({ queryKey: ['seo-audit'], queryFn: () => api.get<{ score: number; issues: Issue[]; passed: string[] }>('/seo/audit') })
  if (!q.data) return <PageLoading />
  const d = q.data
  const icon = { error: <XCircle className="size-4 text-bad" />, warn: <AlertTriangle className="size-4 text-amber-600" />, info: <Info className="size-4 text-blue-600" /> }
  return (
    <div className="space-y-6">
      <Card><div className="flex items-center gap-5 p-5"><div className={cn('grid size-20 place-items-center rounded-full text-2xl font-extrabold', d.score >= 80 ? 'bg-green-100 text-green-800' : d.score >= 55 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800')}>{d.score}</div>
        <div><h2 className="text-lg">Search readiness</h2><p className="text-sm text-muted">Checks what your storefront actually publishes: titles, descriptions, photos, local details and sharing. Fixing the top items helps most.</p></div></div></Card>
      <Card><CardHeader title={d.issues.length ? `${d.issues.length} thing${d.issues.length === 1 ? '' : 's'} to improve` : 'Nothing to fix'} />
        {d.issues.length ? <ul className="divide-y divide-line">{d.issues.map((i, k) => <li key={k} className="flex items-start gap-3 px-5 py-3.5"><span className="mt-0.5">{icon[i.severity]}</span><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wide text-muted">{i.area}</p><p className="text-sm">{i.message}</p></div><Link to={i.fix} className="shrink-0 text-sm font-bold underline">Fix</Link></li>)}</ul> : <div className="px-5 py-8 text-sm text-muted">Great — nothing needs attention.</div>}</Card>
      {!!d.passed.length && <Card><CardHeader title="Looking good" /><ul className="space-y-2 p-5">{d.passed.map((p) => <li key={p} className="flex items-center gap-2 text-sm"><Check className="size-4 text-ok" />{p}</li>)}</ul></Card>}
    </div>
  )
}

export function RedirectsTab() {
  const qc = useQueryClient()
  const toast = useToast()
  const [f, setF] = useState({ from: '', to: '', permanent: true })
  const q = useQuery({ queryKey: ['redirects'], queryFn: () => api.get<{ items: { id: string; from_path: string; to_path: string; permanent: boolean; hits: number }[]; available: boolean }>('/seo/redirects') })
  const err = (e: unknown) => toast.err(e instanceof Error ? e.message : 'Something went wrong')
  const add = useMutation({ mutationFn: () => api.post('/seo/redirects', { from_path: f.from, to_path: f.to, permanent: f.permanent }), onSuccess: () => { setF({ from: '', to: '', permanent: true }); void qc.invalidateQueries({ queryKey: ['redirects'] }); toast.ok('Redirect created') }, onError: err })
  const del = useMutation({ mutationFn: (id: string) => api.del(`/seo/redirects/${id}`), onSuccess: () => void qc.invalidateQueries({ queryKey: ['redirects'] }) })
  if (!q.data) return <PageLoading />
  if (!q.data.available) return <UpgradePrompt feature="seo_tools" title="Redirects" body="Send old links to the right page so you never lose a customer or search ranking. Part of the Grow plan and above." />
  return (
    <div className="space-y-6">
      <Card><CardHeader title="New redirect" sub="When someone opens the first address, send them to the second." />
        <form className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_auto_auto] md:items-end" onSubmit={(e) => { e.preventDefault(); add.mutate() }}>
          <TextField label="From" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} placeholder="/old-dress" /><TextField label="To" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} placeholder="/products/summer-dress or https://…" />
          <Field label="Type"><Select value={f.permanent ? 'p' : 't'} onChange={(e) => setF({ ...f, permanent: e.target.value === 'p' })}><option value="p">Permanent (301)</option><option value="t">Temporary (302)</option></Select></Field>
          <Button type="submit" loading={add.isPending} disabled={!f.from.trim() || !f.to.trim()}>Add</Button></form></Card>
      <Card>{!q.data.items.length ? <EmptyState icon={<ExternalLink className="size-5" />} title="No redirects" body="Add one when you rename or remove a page or product." /> : (
        <ul className="divide-y divide-line">{q.data.items.map((r) => <li key={r.id} className="flex items-center gap-3 px-5 py-3 text-sm"><span className="min-w-0 flex-1 truncate"><b className="font-mono">{r.from_path}</b> → <span className="font-mono">{r.to_path}</span></span><Badge>{r.permanent ? '301' : '302'}</Badge><span className="w-16 text-right text-xs text-muted">{r.hits} visit{r.hits === 1 ? '' : 's'}</span>
          <button aria-label={`Delete redirect from ${r.from_path}`} onClick={() => del.mutate(r.id)} className="grid size-8 place-items-center rounded-full text-bad hover:bg-red-50"><Trash2 className="size-4" /></button></li>)}</ul>)}</Card>
    </div>
  )
}

export function TrackingTab() {
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: ['tracking'], queryFn: () => api.get<{ ga4_id: string; meta_pixel_id: string; hide_branding: boolean; can_track: boolean; can_hide_branding: boolean }>('/seo/tracking') })
  const [f, setF] = useState({ ga4: '', pixel: '' })
  useEffect(() => { if (q.data) setF({ ga4: q.data.ga4_id, pixel: q.data.meta_pixel_id }) }, [q.data])
  const save = useMutation({ mutationFn: (b: Record<string, unknown>) => api.patch('/seo/tracking', b), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['tracking'] }); void qc.invalidateQueries({ queryKey: ['website'] }); toast.ok('Saved. Publish your storefront to make it live.') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Could not save') })
  if (!q.data) return <PageLoading />
  const d = q.data
  return (
    <div className="space-y-6">
      <Card><CardHeader title="Analytics & ad pixels" sub="Sent from your published storefront only — never from the builder preview." />
        {!d.can_track ? <div className="p-5"><UpgradePrompt feature="tracking" title="Google Analytics & Meta Pixel" body="Add your measurement IDs on the Grow plan and above." /></div> : (
          <div className="space-y-4 p-5"><div className="grid gap-3 sm:grid-cols-2"><TextField label="Google Analytics 4 ID" value={f.ga4} onChange={(e) => setF({ ...f, ga4: e.target.value })} placeholder="G-ABC123XYZ" hint="Starts with G-" /><TextField label="Meta Pixel ID" value={f.pixel} onChange={(e) => setF({ ...f, pixel: e.target.value })} placeholder="1234567890" hint="Numbers only" /></div>
            <Button loading={save.isPending} onClick={() => save.mutate({ ga4_id: f.ga4, meta_pixel_id: f.pixel })}>Save</Button>
            <p className="text-xs text-muted">Only page views are sent. If your visitors are in the EU/UK or you advertise there, add your own cookie notice — Aqivo doesn't show one for you.</p></div>)}</Card>
      <Card><CardHeader title="Branding" /><div className="p-5">{d.can_hide_branding ? <Toggle label="Hide “Powered by Aqivo.shop”" hint="Removes the credit from your footer." checked={d.hide_branding} onChange={(v) => save.mutate({ hide_branding: v })} /> : <UpgradePrompt feature="remove_branding" title="Remove Aqivo branding" body="Hide the footer credit on the Grow plan and above." />}</div></Card>
    </div>
  )
}

export function SharingTab() {
  const qc = useQueryClient()
  const toast = useToast()
  const w = useQuery({ queryKey: ['website'], queryFn: () => api.get<Website & { og_image: string | null }>('/websites/me') })
  const save = useMutation({ mutationFn: (v: string | null) => api.patch('/websites/me/seo', { og_image: v }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['website'] }); void qc.invalidateQueries({ queryKey: ['seo-audit'] }); toast.ok('Saved. Publish your storefront to make it live.') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Could not save') })
  if (!w.data) return <PageLoading />
  return (
    <Card><CardHeader title="Social share image" sub="The picture shown when your link is shared on WhatsApp, Facebook or X. Use a landscape photo about 1200×630." />
      <div className="space-y-4 p-5"><ImageInput label="Image" value={w.data.og_image} onChange={(v) => save.mutate(v)} />
        <p className="text-xs text-muted">Product and category pages use their own photos. Titles and descriptions for the home page and custom pages are in the storefront builder → Settings → Search & sharing.</p></div></Card>
  )
}

interface Prov { key: string; name: string; status: string; detail: string; manage: string | null; limits: string }
const STATUS: Record<string, { label: string; tone: 'ok' | 'info' | 'neutral' | 'warn' }> = { connected: { label: 'Connected', tone: 'ok' }, linked: { label: 'Linked', tone: 'info' }, not_set: { label: 'Not set up', tone: 'neutral' }, platform_off: { label: 'Off on this server', tone: 'warn' } }

export function IntegrationsTab() {
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: ['integrations'], queryFn: () => api.get<{ providers: Prov[]; google: { google_review_url: string; google_maps_url: string }; not_available: string[] }>('/integrations') })
  const [g, setG] = useState({ review: '', maps: '' })
  useEffect(() => { if (q.data) setG({ review: q.data.google.google_review_url, maps: q.data.google.google_maps_url }) }, [q.data])
  const save = useMutation({ mutationFn: () => api.patch('/integrations', { google_review_url: g.review, google_maps_url: g.maps }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['integrations'] }); toast.ok('Saved. Publish your storefront to show the Google button.') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Could not save') })
  if (!q.data) return <PageLoading />
  return (
    <div className="space-y-6">
      <Card><CardHeader title="Google reviews link" sub="Customers can leave a Google review from your review page and reviews section." />
        <div className="space-y-3 p-5"><TextField label="Google review link" value={g.review} onChange={(e) => setG({ ...g, review: e.target.value })} placeholder="https://g.page/r/…/review" hint="In Google Business Profile → Ask for reviews → copy the link." /><TextField label="Google Maps link (optional)" value={g.maps} onChange={(e) => setG({ ...g, maps: e.target.value })} placeholder="https://maps.app.goo.gl/…" /><Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button></div></Card>
      <Card><CardHeader title="Connections" sub="What's connected today — and what isn't." />
        <ul className="divide-y divide-line">{q.data.providers.map((p) => <li key={p.key} className="flex flex-wrap items-start gap-3 px-5 py-4"><div className="min-w-0 flex-1"><p className="font-bold">{p.name}</p><p className="truncate text-sm text-muted">{p.detail}</p>{p.limits && <p className="mt-0.5 text-xs text-muted">{p.limits}</p>}</div><Badge tone={STATUS[p.status]?.tone ?? 'neutral'}>{STATUS[p.status]?.label ?? p.status}</Badge>{p.manage && <Link to={p.manage} className="text-sm font-bold underline">Manage</Link>}</li>)}</ul></Card>
      <Card><CardHeader title="Not available yet" /><ul className="space-y-1.5 p-5 text-sm text-muted">{q.data.not_available.map((n) => <li key={n}>• {n}</li>)}</ul></Card>
    </div>
  )
}

