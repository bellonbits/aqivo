import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { Button, Card, ConfirmDialog, EmptyState, Modal, PageLoading, TextAreaField, TextField } from '@/components/ui'
import { Toggle } from '@/features/website/SectionForm'
import type { Page, Product } from '@/types'

interface Collection { id: string; name: string; slug: string; description: string; image_url: string | null; is_visible: boolean; product_ids: string[] }
interface Form { id?: string; name: string; description: string; is_visible: boolean; product_ids: string[] }
const BLANK: Form = { name: '', description: '', is_visible: true, product_ids: [] }

export function CollectionsPanel({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState<Form | null>(null)
  const [del, setDel] = useState<Collection | null>(null)
  const [find, setFind] = useState('')
  const list = useQuery({ queryKey: ['collections'], queryFn: () => api.get<Collection[]>('/collections') })
  const products = useQuery({ queryKey: ['products', 'for-collection'], queryFn: () => api.get<Page<Product>>('/products', { limit: 200 }), enabled: !!form })
  const done = () => { void qc.invalidateQueries({ queryKey: ['collections'] }); void qc.invalidateQueries({ queryKey: ['website'] }) }
  const err = (e: unknown) => toast.err(e instanceof Error ? e.message : 'Something went wrong')
  const save = useMutation({
    mutationFn: (f: Form) => (f.id ? api.patch(`/collections/${f.id}`, f) : api.post('/collections', f)),
    onSuccess: () => { done(); setForm(null); toast.ok('Collection saved') }, onError: err,
  })
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/collections/${id}`), onSuccess: () => { done(); setDel(null) }, onError: err })
  if (list.isLoading) return <PageLoading />
  const toggle = (id: string) => form && setForm({ ...form, product_ids: form.product_ids.includes(id) ? form.product_ids.filter((x) => x !== id) : [...form.product_ids, id] })
  const shown = (products.data?.items ?? []).filter((p) => p.name.toLowerCase().includes(find.toLowerCase()))
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted">Hand-pick products into a group like “Summer edit” or “Gifts under 2,000”. Show it on your storefront, in the menu, or share its link.</p>
        {canWrite && <Button onClick={() => setForm(BLANK)}><Plus className="size-4" /> New collection</Button>}</div>
      <Card>{!list.data?.length ? <EmptyState icon={<Layers className="size-5" />} title="No collections yet" body="Create one, then add a “Collection” section in your storefront builder." /> : (
        <ul className="divide-y divide-line">{list.data.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-5 py-3.5"><div className="min-w-0 flex-1"><p className="font-bold">{c.name}{!c.is_visible && <span className="ml-2 text-xs font-normal text-muted">hidden</span>}</p><p className="text-sm text-muted">{c.product_ids.length} product{c.product_ids.length === 1 ? '' : 's'} · /collections/{c.slug}</p></div>
            {canWrite && <><button aria-label={`Edit ${c.name}`} className="grid size-9 place-items-center rounded-full hover:bg-black/5" onClick={() => setForm({ id: c.id, name: c.name, description: c.description, is_visible: c.is_visible, product_ids: c.product_ids })}><Pencil className="size-4" /></button>
              <button aria-label={`Delete ${c.name}`} className="grid size-9 place-items-center rounded-full text-bad hover:bg-red-50" onClick={() => setDel(c)}><Trash2 className="size-4" /></button></>}</li>))}</ul>)}</Card>
      <Modal open={!!form} onClose={() => setForm(null)} wide title={form?.id ? 'Edit collection' : 'New collection'}
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button loading={save.isPending} disabled={!form?.name.trim()} onClick={() => form && save.mutate(form)}>Save</Button></>}>
        {form && <div className="space-y-3">
          <TextField label="Name" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextAreaField label="Description (optional)" rows={2} maxLength={400} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Toggle label="Visible on my storefront" checked={form.is_visible} onChange={(v) => setForm({ ...form, is_visible: v })} />
          <div><p className="mb-1 text-sm font-bold">Products ({form.product_ids.length} selected)</p>
            <TextField label="Search products" value={find} onChange={(e) => setFind(e.target.value)} />
            <ul className="mt-2 max-h-64 divide-y divide-line overflow-auto rounded-xl border border-line">{shown.map((p) => (
              <li key={p.id}><label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-black/5"><input type="checkbox" checked={form.product_ids.includes(p.id)} onChange={() => toggle(p.id)} /><span className="min-w-0 flex-1 truncate">{p.name}</span></label></li>))}
              {!shown.length && <li className="px-3 py-4 text-sm text-muted">{products.isLoading ? 'Loading…' : 'No products found.'}</li>}</ul></div>
        </div>}
      </Modal>
      <ConfirmDialog open={!!del} title="Delete this collection?" body="The products stay. Any storefront section or menu link pointing at it will stop showing." confirmLabel="Delete" loading={remove.isPending} onConfirm={() => del && remove.mutate(del.id)} onClose={() => setDel(null)} />
    </div>
  )
}
