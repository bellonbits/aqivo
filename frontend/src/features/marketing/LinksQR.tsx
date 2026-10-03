import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Download, QrCode, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, Modal, Select, TextField } from '@/components/ui'
import type { LinkTargets, QrCode as Qr } from '@/types'

const TARGETS: [string, string][] = [['storefront', 'Storefront home'], ['shop', 'Shop (all products)'], ['product', 'A product'], ['service', 'A service'], ['category', 'A category'], ['collection', 'A collection'], ['page', 'A page'], ['booking', 'Booking page']]

export function TargetPicker({ targets, type, refId, onType, onRef }: { targets: LinkTargets; type: string; refId: string; onType: (v: string) => void; onRef: (v: string) => void }) {
  const list = type === 'product' ? targets.products : type === 'service' ? targets.services : type === 'category' ? targets.categories : type === 'collection' ? targets.collections : type === 'page' ? targets.pages : null
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Link to"><Select value={type} onChange={(e) => { onType(e.target.value); onRef('') }}>{TARGETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
      {list && <Field label="Which one"><Select value={refId} onChange={(e) => onRef(e.target.value)}><option value="">Choose…</option>{list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>}
    </div>
  )
}

function QrImage({ id, name }: { id: string; name: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let url: string | null = null
    void api.blob(`/marketing/qr-codes/${id}/image?fmt=png`).then((b) => { url = URL.createObjectURL(b); setSrc(url) }).catch(() => setSrc(null))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [id])
  return src ? <img src={src} alt={`QR code for ${name}`} className="size-28 rounded-lg bg-white p-1 ring-1 ring-line" /> : <div className="size-28 animate-pulse rounded-lg bg-line" />
}

export function LinksQR() {
  const qc = useQueryClient()
  const toast = useToast()
  const targets = useQuery({ queryKey: ['link-targets'], queryFn: () => api.get<LinkTargets>('/marketing/link-targets') })
  const codes = useQuery({ queryKey: ['qr-codes'], queryFn: () => api.get<Qr[]>('/marketing/qr-codes') })
  const [l, setL] = useState({ type: 'storefront', ref: '', source: 'instagram', campaign: '' })
  const [url, setUrl] = useState('')
  const [qrOpen, setQrOpen] = useState(false)
  const [q, setQ] = useState({ name: '', type: 'storefront', ref: '', headline: '' })
  const [del, setDel] = useState<Qr | null>(null)
  const err = (e: unknown) => toast.err(e instanceof Error ? e.message : 'Something went wrong')
  const build = useMutation({ mutationFn: () => api.post<{ url: string }>('/marketing/links', { target_type: l.type, target_ref: l.ref || null, source: l.source, campaign: l.campaign || null }), onSuccess: (r) => setUrl(r.url), onError: err })
  const make = useMutation({ mutationFn: () => api.post<Qr>('/marketing/qr-codes', { name: q.name, target_type: q.type, target_ref: q.ref || null, headline: q.headline }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['qr-codes'] }); setQrOpen(false); setQ({ name: '', type: 'storefront', ref: '', headline: '' }); toast.ok('QR code created') }, onError: err })
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/marketing/qr-codes/${id}`), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['qr-codes'] }); setDel(null) } })
  const download = async (c: Qr, fmt: 'png' | 'svg' | 'pdf') => {
    try { const b = await api.blob(`/marketing/qr-codes/${c.id}/image?fmt=${fmt}`); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${c.campaign}.${fmt}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) } catch (e) { err(e) }
  }
  if (!targets.data) return null
  const t = targets.data
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Tracked link builder" sub="Add the channel to any link before you share it. Visits, enquiries and sales that follow are credited to it." />
        <div className="space-y-4 p-5">
          <TargetPicker targets={t} type={l.type} refId={l.ref} onType={(v) => setL({ ...l, type: v })} onRef={(v) => setL({ ...l, ref: v })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Where will you share it?"><Select value={l.source} onChange={(e) => setL({ ...l, source: e.target.value })}>{t.channels.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</Select></Field>
            <TextField label="Campaign name (optional)" value={l.campaign} maxLength={64} onChange={(e) => setL({ ...l, campaign: e.target.value })} placeholder="spring-sale" hint="Groups results in Analytics → Campaigns." />
          </div>
          <Button loading={build.isPending} disabled={['product', 'service', 'category', 'collection', 'page'].includes(l.type) && !l.ref} onClick={() => build.mutate()}>Create link</Button>
          {url && <div className="flex items-center gap-2 rounded-xl border border-line bg-paper py-1.5 pl-3 pr-1.5"><span className="min-w-0 flex-1 truncate text-sm">{url}</span><Button size="sm" variant="secondary" onClick={() => { void navigator.clipboard.writeText(url); toast.ok('Link copied') }}><Copy className="size-4" /> Copy</Button></div>}
        </div>
      </Card>
      <Card>
        <CardHeader title="QR codes" sub="Print them on posters, packaging and receipts. Scans are counted." action={<Button size="sm" onClick={() => setQrOpen(true)}>New QR code</Button>} />
        {!codes.data?.length ? <EmptyState icon={<QrCode className="size-5" />} title="No QR codes yet" body="Create one for your counter, menu or flyers — for example “Scan to order”." action={<Button onClick={() => setQrOpen(true)}>Create a QR code</Button>} /> : (
          <ul className="divide-y divide-line">{codes.data.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <QrImage id={c.id} name={c.name} />
              <div className="min-w-0 flex-1"><p className="font-bold">{c.name}</p><p className="truncate text-xs text-muted">{c.headline || 'Scan to visit us'} · {c.url.split('?')[0].replace(/^https?:\/\//, '')}</p><p className="mt-1 text-sm"><b className="text-xl font-extrabold">{c.scans}</b> scan{c.scans === 1 ? '' : 's'}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{(['png', 'svg', 'pdf'] as const).map((f) => <Button key={f} size="sm" variant="secondary" onClick={() => void download(c, f)}><Download className="size-3.5" /> {f === 'pdf' ? 'Poster PDF' : f.toUpperCase()}</Button>)}</div></div>
              <button aria-label={`Delete ${c.name}`} onClick={() => setDel(c)} className="grid size-9 place-items-center rounded-full text-bad hover:bg-red-50"><Trash2 className="size-4" /></button>
            </li>))}</ul>)}
      </Card>
      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="New QR code" footer={<><Button variant="secondary" onClick={() => setQrOpen(false)}>Cancel</Button><Button loading={make.isPending} disabled={!q.name.trim() || (['product', 'service', 'category', 'collection', 'page'].includes(q.type) && !q.ref)} onClick={() => make.mutate()}>Create</Button></>}>
        <div className="space-y-4"><TextField label="Name" value={q.name} maxLength={120} onChange={(e) => setQ({ ...q, name: e.target.value })} placeholder="Counter poster" hint="Only you see this." />
          <TargetPicker targets={t} type={q.type} refId={q.ref} onType={(v) => setQ({ ...q, type: v })} onRef={(v) => setQ({ ...q, ref: v })} />
          <TextField label="Poster headline" value={q.headline} maxLength={28} onChange={(e) => setQ({ ...q, headline: e.target.value })} placeholder="Scan to order" /></div>
      </Modal>
      <ConfirmDialog open={!!del} title="Delete this QR code?" body="Printed copies will still open your page, but scans will no longer be listed here." confirmLabel="Delete" danger loading={remove.isPending} onConfirm={() => del && remove.mutate(del.id)} onClose={() => setDel(null)} />
    </div>
  )
}
