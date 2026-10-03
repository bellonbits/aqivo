import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Search, Trash2, Upload } from 'lucide-react'
import { api, request } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { Button, EmptyState, Input, Modal, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { MediaAsset, Page } from '@/types'

export const MEDIA_FOLDERS: [string, string][] = [['', 'All'], ['storefront', 'Storefront'], ['products', 'Products'], ['services', 'Services'], ['logo', 'Logo'], ['gallery', 'Gallery']]

/** The business's image library: pick an existing image or upload (click or drag & drop). Calls onPick with the page-sized URL. */
export function MediaPicker({ open, onClose, onPick, folder = 'storefront', multiple }: { open: boolean; onClose: () => void; onPick: (urls: string[]) => void; folder?: string; multiple?: boolean }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [tab, setTab] = useState('')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [drag, setDrag] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const list = useQuery({ queryKey: ['media', tab, q], queryFn: () => api.get<Page<MediaAsset>>('/media', { folder: tab || undefined, q: q || undefined, limit: 120 }), enabled: open })
  const doUpload = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, 12)
    if (!arr.length) return toast.err('Choose JPEG, PNG or WebP images')
    try {
      const made: MediaAsset[] = []
      for (const f of arr) {
        const fd = new FormData(); fd.append('file', f); fd.append('folder', folder)
        made.push(await request<MediaAsset>('/media', { method: 'POST', form: fd }))
      }
      await qc.invalidateQueries({ queryKey: ['media'] })
      if (!multiple && made[0]) { onPick([made[0].url]); onClose() } else setSelected((s) => [...s, ...made.map((m) => m.url)])
    } catch (e) { toast.err(e instanceof Error ? e.message : 'Upload failed') }
  }
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/media/${id}`), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['media'] }); toast.ok('Removed from library') } })
  const toggle = (url: string) => { if (!multiple) { onPick([url]); onClose(); return } setSelected((s) => (s.includes(url) ? s.filter((x) => x !== url) : [...s, url])) }
  const items = list.data?.items ?? []

  return (
    <Modal open={open} onClose={onClose} title="Choose an image" wide footer={multiple ? <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!selected.length} onClick={() => { onPick(selected); setSelected([]); onClose() }}>Use {selected.length || ''} image{selected.length === 1 ? '' : 's'}</Button></> : undefined}>
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void doUpload(e.dataTransfer.files) }} className={cn('rounded-2xl', drag && 'ring-2 ring-brand')}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="scrollbar-none flex gap-1 overflow-x-auto">{MEDIA_FOLDERS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={cn('h-8 shrink-0 rounded-full px-3 text-xs font-bold', tab === k ? 'btn-brand' : 'bg-white/80 ring-1 ring-line')}>{l}</button>)}</div>
          <div className="relative ml-auto w-40"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input aria-label="Search images" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 pl-9" /></div>
          <Button size="sm" onClick={() => input.current?.click()}><Upload className="size-4" /> Upload</Button>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" aria-label="Upload images" onChange={(e) => { if (e.target.files) void doUpload(e.target.files); e.target.value = '' }} />
        </div>
        {list.isLoading ? <div className="grid h-40 place-items-center"><Spinner /></div> : items.length === 0 ? (
          <EmptyState icon={<ImagePlus className="size-5" />} title="No images yet" body="Drop images here or press Upload. They are resized and optimised for you." action={<Button onClick={() => input.current?.click()}>Upload images</Button>} />
        ) : (
          <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">{items.map((a) => (
            <li key={a.id} className="group relative">
              <button onClick={() => toggle(a.url)} aria-label={`Use ${a.name}`} aria-pressed={selected.includes(a.url)} className={cn('block aspect-square w-full overflow-hidden rounded-xl bg-line ring-1 ring-line', selected.includes(a.url) && 'ring-2 ring-brand')}>
                <img src={a.thumb_url ?? a.url} alt={a.name} loading="lazy" className="size-full object-cover" />
              </button>
              <button aria-label={`Delete ${a.name}`} onClick={() => remove.mutate(a.id)} className="absolute right-1.5 top-1.5 hidden size-7 place-items-center rounded-full bg-white/90 text-bad shadow group-hover:grid"><Trash2 className="size-3.5" /></button>
            </li>))}</ul>
        )}
      </div>
    </Modal>
  )
}
