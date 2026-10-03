import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Eye, EyeOff, FileText, Home, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { Button, ConfirmDialog, Field, Input, Modal, Select, TextAreaField, TextField } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { Category, NavItem, SitePage, Website } from '@/types'

const STARTERS: [string, string][] = [['blank', 'Blank page'], ['about', 'About us'], ['contact', 'Contact'], ['faq', 'FAQ'], ['policies', 'Delivery & returns']]
const TYPE_LABEL: Record<NavItem['type'], string> = { page: 'A page', products: 'Shop (all products)', services: 'Services', category: 'A product category', collection: 'A collection', booking: 'Booking', contact: 'Contact section', search: 'Search', url: 'External link' }

export function PagesPanel({ site, pageId, onPick, onChanged }: { site: Website; pageId: string; onPick: (id: string) => void; onChanged: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [starter, setStarter] = useState('blank')
  const [edit, setEdit] = useState<SitePage | null>(null)
  const [del, setDel] = useState<SitePage | null>(null)
  const err = (e: unknown) => toast.err(e instanceof Error ? e.message : 'Something went wrong')
  const done = async () => { await qc.invalidateQueries({ queryKey: ['website'] }); onChanged() }
  const create = useMutation({ mutationFn: () => api.post<Website & { added_id: string }>('/websites/me/pages', { title, template: starter }), onSuccess: async (r) => { setAdding(false); setTitle(''); await done(); onPick(r.added_id) }, onError: err })
  const update = useMutation({ mutationFn: (p: { id: string; body: Record<string, unknown> }) => api.patch(`/websites/me/pages/${p.id}`, p.body), onSuccess: async () => { setEdit(null); await done() }, onError: err })
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/websites/me/pages/${id}`), onSuccess: async () => { const home = site.pages.find((p) => p.is_home)!; setDel(null); onPick(home.id); await done() }, onError: err })
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-muted">Pages</p><Button size="sm" onClick={() => setAdding(true)}><Plus className="size-4" /> New page</Button></div>
      <ul className="space-y-2">{site.pages.map((p) => (
        <li key={p.id} className={cn('flex items-center gap-2 rounded-2xl bg-white/85 px-3 py-2.5 ring-1', p.id === pageId ? 'ring-2 ring-brand' : 'ring-line', !p.enabled && 'opacity-60')}>
          <button onClick={() => onPick(p.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">{p.is_home ? <Home className="size-4 shrink-0 text-brand" /> : <FileText className="size-4 shrink-0 text-brand" />}
            <span className="min-w-0"><span className="block truncate text-sm font-bold">{p.title}</span><span className="block truncate text-xs text-muted">{p.is_home ? '/' : `/p/${p.slug}`}{!p.published && ' · not published yet'}</span></span></button>
          {!p.is_home && <button aria-label={p.enabled ? `Hide ${p.title}` : `Show ${p.title}`} onClick={() => update.mutate({ id: p.id, body: { enabled: !p.enabled } })} className="grid size-8 place-items-center rounded-full text-muted hover:bg-black/5">{p.enabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button>}
          <button aria-label={`Edit ${p.title}`} onClick={() => setEdit(p)} className="grid size-8 place-items-center rounded-full text-muted hover:bg-black/5"><Pencil className="size-4" /></button>
          {!p.is_home && <button aria-label={`Delete ${p.title}`} onClick={() => setDel(p)} className="grid size-8 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-bad"><Trash2 className="size-4" /></button>}
        </li>))}</ul>
      <MenuEditor site={site} onChanged={done} />
      <Modal open={adding} onClose={() => setAdding(false)} title="New page" footer={<><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button loading={create.isPending} disabled={!title.trim()} onClick={() => create.mutate()}>Create page</Button></>}>
        <div className="space-y-4"><TextField label="Page name" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="About us" />
          <Field label="Start from"><Select value={starter} onChange={(e) => setStarter(e.target.value)}>{STARTERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field></div>
      </Modal>
      <EditPage page={edit} onClose={() => setEdit(null)} onSave={(body) => edit && update.mutate({ id: edit.id, body })} saving={update.isPending} />
      <ConfirmDialog open={!!del} title="Delete this page?" body={<>“{del?.title}” and its sections are removed, and it disappears from your menu.</>} confirmLabel="Delete" danger loading={remove.isPending} onConfirm={() => del && remove.mutate(del.id)} onClose={() => setDel(null)} />
    </div>
  )
}

function EditPage({ page, onClose, onSave, saving }: { page: SitePage | null; onClose: () => void; onSave: (b: Record<string, unknown>) => void; saving: boolean }) {
  const [f, setF] = useState({ title: '', slug: '', seo_title: '', seo_description: '' })
  useEffect(() => { if (page) setF({ title: page.title, slug: page.slug, seo_title: page.seo_title ?? '', seo_description: page.seo_description ?? '' }) }, [page])
  return (
    <Modal open={!!page} onClose={onClose} title="Page settings" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} disabled={!f.title.trim()} onClick={() => onSave({ title: f.title, ...(page?.is_home ? {} : { slug: f.slug }), seo_title: f.seo_title, seo_description: f.seo_description })}>Save</Button></>}>
      <div className="space-y-4"><TextField label="Name" value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} />
        {!page?.is_home && <TextField label="Link ending" value={f.slug} maxLength={60} onChange={(e) => setF({ ...f, slug: e.target.value })} hint="Letters, numbers and dashes. Used in the page address." />}
        <TextField label="Search title" value={f.seo_title} maxLength={200} onChange={(e) => setF({ ...f, seo_title: e.target.value })} hint="What Google shows. Leave blank to use the page name." />
        <TextAreaField label="Search description" rows={2} maxLength={320} value={f.seo_description} onChange={(e) => setF({ ...f, seo_description: e.target.value })} /></div>
    </Modal>
  )
}

function MenuEditor({ site, onChanged }: { site: Website; onChanged: () => void }) {
  const toast = useToast()
  const cols = useQuery({ queryKey: ['collections'], queryFn: () => api.get<{ id: string; name: string }[]>('/collections') })
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories') })
  const [items, setItems] = useState<NavItem[]>(site.navigation)
  const [dirty, setDirty] = useState(false)
  useEffect(() => { if (!dirty) setItems(site.navigation) }, [site.navigation, dirty])
  const save = useMutation({ mutationFn: () => api.put('/websites/me/navigation', { items }), onSuccess: () => { setDirty(false); onChanged(); toast.ok('Menu saved') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Could not save the menu') })
  const reset = useMutation({ mutationFn: () => api.del('/websites/me/navigation'), onSuccess: () => { setDirty(false); onChanged(); toast.ok('Menu reset to automatic') } })
  const change = (next: NavItem[]) => { setItems(next); setDirty(true) }
  const move = (list: NavItem[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= list.length) return list; const n = [...list]; [n[i], n[j]] = [n[j], n[i]]; return n }
  const blank = (): NavItem => ({ label: 'New link', type: 'products' })
  const row = (it: NavItem, i: number, list: NavItem[], set: (l: NavItem[]) => void, child = false) => (
    <div key={`${it.id ?? i}-${i}`} className={cn('space-y-2 rounded-xl bg-white/80 p-2.5 ring-1 ring-line', child && 'ml-5')}>
      <div className="flex items-center gap-1.5">
        <Input aria-label="Link name" value={it.label} maxLength={40} onChange={(e) => set(list.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className="h-9 min-w-0 flex-1" />
        <button aria-label="Move up" disabled={i === 0} onClick={() => set(move(list, i, -1))} className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-black/5 disabled:opacity-30"><ArrowUp className="size-4" /></button>
        <button aria-label="Move down" disabled={i === list.length - 1} onClick={() => set(move(list, i, 1))} className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-black/5 disabled:opacity-30"><ArrowDown className="size-4" /></button>
        <button aria-label="Remove link" onClick={() => set(list.filter((_, j) => j !== i))} className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-bad"><Trash2 className="size-4" /></button>
      </div>
      <div className="flex flex-wrap sm:flex-nowrap gap-1.5">
        <Select aria-label="Goes to" value={it.type} onChange={(e) => set(list.map((x, j) => (j === i ? { ...x, type: e.target.value as NavItem['type'], ref: null, url: null } : x)))} className="h-9 min-w-0 flex-1 text-sm">{(Object.keys(TYPE_LABEL) as NavItem['type'][]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</Select>
        {it.type === 'page' && <Select aria-label="Page" value={it.ref ?? ''} onChange={(e) => set(list.map((x, j) => (j === i ? { ...x, ref: e.target.value } : x)))} className="h-9 min-w-0 flex-1 text-sm"><option value="">Choose…</option>{site.pages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select>}
        {it.type === 'collection' && <Select aria-label="Collection" value={it.ref ?? ''} onChange={(e) => set(list.map((x, j) => (j === i ? { ...x, ref: e.target.value } : x)))} className="h-9 min-w-0 flex-1 text-sm"><option value="">Choose…</option>{cols.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}
        {it.type === 'category' && <Select aria-label="Category" value={it.ref ?? ''} onChange={(e) => set(list.map((x, j) => (j === i ? { ...x, ref: e.target.value } : x)))} className="h-9 min-w-0 flex-1 text-sm"><option value="">Choose…</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}
        {it.type === 'url' && <Input aria-label="Link address" placeholder="https://…" value={it.url ?? ''} onChange={(e) => set(list.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} className="h-9 min-w-0 flex-1 text-sm" />}
      </div>
      {!child && <div className="space-y-2">{(it.children ?? []).map((c, k) => row(c, k, it.children ?? [], (l) => set(list.map((x, j) => (j === i ? { ...x, children: l } : x))), true))}
        {(it.children?.length ?? 0) < 12 && <button onClick={() => set(list.map((x, j) => (j === i ? { ...x, children: [...(x.children ?? []), blank()] } : x)))} className="ml-5 text-xs font-bold text-brand">+ Add dropdown link</button>}</div>}
    </div>
  )
  return (
    <div className="space-y-2 pt-3">
      <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-muted">Menu</p>{site.navigation_custom && <button onClick={() => reset.mutate()} className="inline-flex items-center gap-1 text-xs font-bold text-muted"><RotateCcw className="size-3" /> Back to automatic</button>}</div>
      {!site.navigation_custom && !dirty && <p className="text-xs text-muted">Your menu is automatic: Home, Shop, Services, your pages, Book and Contact. Links to things that don’t exist yet are hidden. Edit it below to take control.</p>}
      {items.map((it, i) => row(it, i, items, change))}
      <div className="flex flex-wrap gap-2">{items.length < 12 && <Button size="sm" variant="secondary" onClick={() => change([...items, blank()])}><Plus className="size-4" /> Add link</Button>}{dirty && <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>Save menu</Button>}</div>
    </div>
  )
}
