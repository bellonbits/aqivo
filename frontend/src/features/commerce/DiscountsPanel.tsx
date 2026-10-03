import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Modal, Select, TextField } from '@/components/ui'
import { Toggle } from '@/features/website/SectionForm'
import { fmtDate, money } from '@/lib/format'
import type { Category, Discount, Page, Product } from '@/types'

interface F { id?: string; code: string; description: string; type: Discount['type']; value: string; min_order: string; usage_limit: string; starts: string; ends: string; once: boolean; active: boolean; scope: 'all' | 'products' | 'categories'; product_ids: string[]; category_ids: string[] }
const blank: F = { code: '', description: '', type: 'PERCENT', value: '10', min_order: '', usage_limit: '', starts: '', ends: '', once: false, active: true, scope: 'all', product_ids: [], category_ids: [] }
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '')

export function DiscountsPanel({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient()
  const toast = useToast()
  const { business } = useBusiness()
  const cur = business?.currency
  const [form, setForm] = useState<F | null>(null)
  const [del, setDel] = useState<Discount | null>(null)
  const list = useQuery({ queryKey: ['discounts'], queryFn: () => api.get<Discount[]>('/discounts') })
  const products = useQuery({ queryKey: ['products', 'for-discount'], queryFn: () => api.get<Page<Product>>('/products', { status: 'ACTIVE', limit: 200 }), enabled: !!form })
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories'), enabled: !!form })
  const err = (e: unknown) => toast.err(e instanceof Error ? e.message : 'Could not save')
  const inv = () => void qc.invalidateQueries({ queryKey: ['discounts'] })
  const save = useMutation({
    mutationFn: (f: F) => {
      const body = { description: f.description, type: f.type, value: f.type === 'FREE_DELIVERY' ? '0' : String(Number(f.value)), min_order: f.min_order ? String(Number(f.min_order)) : null, usage_limit: f.usage_limit ? Number(f.usage_limit) : null,
        starts_at: f.starts ? new Date(f.starts).toISOString() : null, ends_at: f.ends ? new Date(`${f.ends}T23:59:59`).toISOString() : null, once_per_customer: f.once, is_active: f.active,
        product_ids: f.scope === 'products' ? f.product_ids : [], category_ids: f.scope === 'categories' ? f.category_ids : [] }
      return f.id ? api.patch(`/discounts/${f.id}`, body) : api.post('/discounts', { code: f.code, ...body })
    }, onSuccess: () => { inv(); setForm(null); toast.ok('Discount saved') }, onError: err,
  })
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/discounts/${id}`), onSuccess: () => { inv(); setDel(null) }, onError: err })
  const toggle = useMutation({ mutationFn: (d: Discount) => api.patch(`/discounts/${d.id}`, { is_active: !d.is_active }), onSuccess: inv })
  const label = (d: Discount) => (d.type === 'PERCENT' ? `${Number(d.value)}% off` : d.type === 'FIXED' ? `${money(d.value, cur)} off` : 'Free delivery')
  const edit = (d: Discount) => setForm({ id: d.id, code: d.code, description: d.description, type: d.type, value: String(Number(d.value)), min_order: d.min_order ? String(Number(d.min_order)) : '', usage_limit: d.usage_limit ? String(d.usage_limit) : '', starts: day(d.starts_at), ends: day(d.ends_at), once: d.once_per_customer, active: d.is_active, scope: d.product_ids.length ? 'products' : d.category_ids.length ? 'categories' : 'all', product_ids: d.product_ids, category_ids: d.category_ids })
  return (
    <>
      <div className="mb-3 flex justify-end">{canWrite && <Button size="sm" onClick={() => setForm(blank)}><Plus className="size-4" /> Add discount</Button>}</div>
      <Card>
        {!list.data?.length ? <EmptyState icon={<Tag className="size-5" />} title="No discount codes" body="Create a code like WELCOME10. Customers enter it at checkout and the discount is checked on our side." action={canWrite && <Button onClick={() => setForm(blank)}>Create a code</Button>} /> : (
          <ul className="divide-y divide-line">{list.data.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3 md:px-5">
              <div className="min-w-0 flex-1"><p className="flex flex-wrap items-center gap-2"><b className="font-mono text-base">{d.code}</b><Badge tone={d.is_active ? 'ok' : 'neutral'}>{d.is_active ? 'Active' : 'Off'}</Badge></p>
                <p className="text-sm text-muted">{label(d)}{d.min_order ? ` · min ${money(d.min_order, cur)}` : ''}{d.ends_at ? ` · ends ${fmtDate(d.ends_at)}` : ''} · used {d.used_count}{d.usage_limit ? `/${d.usage_limit}` : ''}</p></div>
              {canWrite && <div className="flex items-center gap-1"><button role="switch" aria-checked={d.is_active} aria-label={`${d.is_active ? 'Turn off' : 'Turn on'} ${d.code}`} onClick={() => toggle.mutate(d)} className="rounded-full px-3 py-1 text-xs font-bold ring-1 ring-line">{d.is_active ? 'Turn off' : 'Turn on'}</button>
                <button aria-label={`Edit ${d.code}`} onClick={() => edit(d)} className="grid size-8 place-items-center rounded-full hover:bg-black/5"><Pencil className="size-4" /></button>
                <button aria-label={`Delete ${d.code}`} onClick={() => setDel(d)} className="grid size-8 place-items-center rounded-full text-bad hover:bg-red-50"><Trash2 className="size-4" /></button></div>}
            </li>))}</ul>)}
      </Card>
      <Modal open={!!form} onClose={() => setForm(null)} wide title={form?.id ? `Edit ${form.code}` : 'Add discount'} footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button loading={save.isPending} disabled={!form || form.code.trim().length < 3 || (form.type !== 'FREE_DELIVERY' && !form.value)} onClick={() => form && save.mutate(form)}>Save</Button></>}>
        {form && <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3"><TextField label="Code" value={form.code} disabled={!!form.id} maxLength={32} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} placeholder="WELCOME10" hint="Customers type this at checkout." />
            <Field label="Type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Discount['type'] })}><option value="PERCENT">Percentage off</option><option value="FIXED">Amount off</option><option value="FREE_DELIVERY">Free delivery</option></Select></Field></div>
          {form.type !== 'FREE_DELIVERY' && <TextField label={form.type === 'PERCENT' ? 'Percent off' : `Amount off (${cur})`} type="number" min={1} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />}
          <TextField label="Description (only you see it)" value={form.description} maxLength={160} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3"><TextField label={`Minimum order (${cur})`} type="number" min={0} value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} hint="Optional" /><TextField label="Total uses allowed" type="number" min={1} value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} hint="Optional" /></div>
          <div className="grid grid-cols-2 gap-3"><TextField label="Starts" type="date" value={form.starts} onChange={(e) => setForm({ ...form, starts: e.target.value })} /><TextField label="Ends" type="date" value={form.ends} onChange={(e) => setForm({ ...form, ends: e.target.value })} /></div>
          {form.type !== 'FREE_DELIVERY' && <><Field label="Applies to"><Select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as F['scope'] })}><option value="all">Everything in the bag</option><option value="products">Chosen products</option><option value="categories">Chosen categories</option></Select></Field>
            {form.scope === 'products' && <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-white/70 p-3 ring-1 ring-line">{products.data?.items.map((p) => <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[#5b3cf5]" checked={form.product_ids.includes(p.id)} onChange={(e) => setForm({ ...form, product_ids: e.target.checked ? [...form.product_ids, p.id] : form.product_ids.filter((x) => x !== p.id) })} />{p.name}</label>)}</div>}
            {form.scope === 'categories' && <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-white/70 p-3 ring-1 ring-line">{cats.data?.map((c) => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[#5b3cf5]" checked={form.category_ids.includes(c.id)} onChange={(e) => setForm({ ...form, category_ids: e.target.checked ? [...form.category_ids, c.id] : form.category_ids.filter((x) => x !== c.id) })} />{c.name}</label>)}</div>}</>}
          <Toggle label="One use per customer" hint="Checked by phone number." checked={form.once} onChange={(v) => setForm({ ...form, once: v })} />
          <Toggle label="Active" checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
        </div>}
      </Modal>
      <ConfirmDialog open={!!del} title="Delete this code?" body={<>“{del?.code}” will stop working. Past orders keep it on record.</>} confirmLabel="Delete" danger loading={remove.isPending} onConfirm={() => del && remove.mutate(del.id)} onClose={() => setDel(null)} />
    </>
  )
}
