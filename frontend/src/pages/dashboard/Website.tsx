import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { Button, Card, CardHeader, ConfirmDialog, EmptyState, Input, TextAreaField, TextField } from '@/components/ui'
import type { GalleryImage, Website } from '@/types'

// Small editors reused by the storefront builder (testimonials, gallery photos, SEO).
export function TestimonialsEditor() {
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: ['testimonials'], queryFn: () => api.get<{ id: string; author: string; quote: string }[]>('/testimonials') })
  const [a, setA] = useState('')
  const [t, setT] = useState('')
  const add = useMutation({ mutationFn: () => api.post('/testimonials', { author: a, quote: t }), onSuccess: () => { setA(''); setT(''); void qc.invalidateQueries({ queryKey: ['testimonials'] }) }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  const del = useMutation({ mutationFn: (id: string) => api.del(`/testimonials/${id}`), onSuccess: () => void qc.invalidateQueries({ queryKey: ['testimonials'] }) })
  return (
    <div className="rounded-xl bg-paper p-4">
      <p className="text-sm font-bold">Your own testimonials</p><p className="mb-3 text-xs text-muted">Add quotes customers have given you. Verified reviews from real bookings also appear automatically.</p>
      {q.data?.map((x) => <div key={x.id} className="mb-2 flex items-start justify-between gap-2 rounded-lg bg-white p-3 text-sm ring-1 ring-line"><span>“{x.quote}” — <b>{x.author}</b></span><button aria-label="Remove testimonial" onClick={() => del.mutate(x.id)}><Trash2 className="size-4 text-muted" /></button></div>)}
      <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"><Input aria-label="Customer name" placeholder="Customer name" value={a} onChange={(e) => setA(e.target.value)} /><Input aria-label="Quote" placeholder="What they said" value={t} onChange={(e) => setT(e.target.value)} /><Button variant="secondary" disabled={!a.trim() || !t.trim()} loading={add.isPending} onClick={() => add.mutate()}>Add</Button></div>
    </div>
  )
}

export function PhotosTab() {
  const qc = useQueryClient()
  const toast = useToast()
  const { has } = useBusiness()
  const q = useQuery({ queryKey: ['gallery'], queryFn: () => api.get<GalleryImage[]>('/gallery') })
  const [busy, setBusy] = useState(false)
  const [del, setDel] = useState<GalleryImage | null>(null)
  const refetch = () => void qc.invalidateQueries({ queryKey: ['gallery'] })
  const upload = async (files: FileList | null) => {
    if (!files) return
    setBusy(true)
    for (const f of Array.from(files)) { try { await api.upload('/gallery', f) } catch (e) { toast.err(e instanceof Error ? e.message : 'Upload failed') } }
    setBusy(false); refetch()
  }
  const move = async (i: number, d: number) => { const ids = (q.data ?? []).map((g) => g.id); const j = i + d; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; await api.put('/gallery/order', { ids }); refetch() }
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/gallery/${id}`), onSuccess: () => { setDel(null); refetch() } })
  return (
    <Card><CardHeader title="Photos" sub={has('website') ? 'Shown in your gallery. The first photo is used as your hero image.' : 'Free plan: up to 6 photos on your profile.'} action={<label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 text-sm font-bold text-white hover:bg-ink-3"><ImagePlus className="size-4" />{busy ? 'Uploading…' : 'Add photos'}<input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void upload(e.target.files)} /></label>} />
      {!q.data?.length ? <EmptyState icon={<ImagePlus className="size-5" />} title="No photos yet" body="Photos of your best work make the biggest difference to new customers." /> : (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4">{q.data.map((g, i) => (
          <figure key={g.id} className="group relative overflow-hidden rounded-xl bg-line"><img src={g.thumb_url ?? g.url} alt={g.caption || 'Gallery photo'} className="aspect-square w-full object-cover" loading="lazy" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 p-1.5 text-white"><span className="flex"><button aria-label="Move earlier" onClick={() => void move(i, -1)} className="grid size-7 place-items-center"><ArrowUp className="size-4 -rotate-90" /></button><button aria-label="Move later" onClick={() => void move(i, 1)} className="grid size-7 place-items-center"><ArrowDown className="size-4 -rotate-90" /></button></span><button aria-label="Delete photo" onClick={() => setDel(g)} className="grid size-7 place-items-center"><Trash2 className="size-4" /></button></div></figure>))}</div>)}
      <ConfirmDialog open={!!del} title="Delete this photo?" body="It will be removed from your profile and website." confirmLabel="Delete" danger loading={remove.isPending} onConfirm={() => del && remove.mutate(del.id)} onClose={() => setDel(null)} />
    </Card>
  )
}

export function SeoTab({ site, onSaved }: { site: Website; onSaved: () => void }) {
  const toast = useToast()
  const { summary } = useBusiness()
  const [title, setTitle] = useState(site.seo_title ?? '')
  const [desc, setDesc] = useState(site.seo_description ?? '')
  const save = useMutation({ mutationFn: () => api.patch('/websites/me/seo', { seo_title: title, seo_description: desc }), onSuccess: () => { onSaved(); toast.ok('Saved') } })
  return (
    <Card><CardHeader title="Search & sharing" sub="How your website looks in Google results and when shared on WhatsApp." />
      <div className="space-y-4 p-5">
        <TextField label="Page title" maxLength={70} value={title} onChange={(e) => setTitle(e.target.value)} hint="Leave blank to use your business name, category and city." />
        <TextAreaField label="Description" rows={3} maxLength={160} value={desc} onChange={(e) => setDesc(e.target.value)} hint={`${desc.length}/160 — leave blank to use your business description.`} />
        <div className="rounded-xl bg-paper p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted">Preview</p><p className="mt-1 text-lg font-semibold text-blue-800">{title || `${summary?.business.name} — ${summary?.business.category}`}</p><p className="text-sm text-ok">{summary?.urls.short}</p><p className="text-sm text-muted">{desc || summary?.business.description.slice(0, 155)}</p></div>
        <p className="text-xs text-muted">Aqivo adds structured data (LocalBusiness), a sitemap and canonical links automatically. It can't edit your Google Business Profile for you.</p>
      </div>
      <div className="border-t border-line p-4"><Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button></div>
    </Card>
  )
}
// Plus icon imported for future section additions
