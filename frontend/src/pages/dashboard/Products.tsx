import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageLoading, Select, Tabs, TextAreaField, TextField } from '@/components/ui'
import { Toggle } from '@/features/website/SectionForm'
import { VariantsEditor } from '@/features/commerce/VariantsEditor'
import { AiCatalogButton } from '@/features/commerce/AiCatalog'
import { CollectionsPanel } from '@/features/commerce/CollectionsPanel'
import { InventoryPanel } from '@/features/commerce/InventoryPanel'
import { DiscountsPanel } from '@/features/commerce/DiscountsPanel'
import { MediaPicker } from '@/features/website/MediaPicker'
import { ImageInput } from '@/features/website/ImageInput'
import { money } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Category, Page, Product } from '@/types'

type Tab = 'products' | 'categories' | 'collections' | 'inventory' | 'discounts'

/** Categories flattened depth-first so children sit under their parent. */
function tree(cats: Category[]): (Category & { depth: number })[] {
  const kids = new Map<string | null, Category[]>()
  for (const c of cats) { const k = cats.some((p) => p.id === c.parent_id) ? c.parent_id : null; kids.set(k, [...(kids.get(k) ?? []), c]) }
  const out: (Category & { depth: number })[] = []
  const walk = (parent: string | null, depth: number) => { for (const c of kids.get(parent) ?? []) { out.push({ ...c, depth }); walk(c.id, depth + 1) } }
  walk(null, 0)
  return out
}
const catLabel = (c: Category & { depth: number }) => `${'— '.repeat(c.depth)}${c.name}`

interface PForm {
  id?: string; name: string; short_description: string; description: string; price: string; compare_at_price: string; cost_price: string; category_id: string
  images: string[]; sku: string; barcode: string; tags: string; is_digital: boolean; track_stock: boolean; stock_qty: string; low_stock_threshold: string
  status: Product['status']; featured: boolean; seo_title: string; seo_description: string; options: unknown[]
}
const blank: PForm = { name: '', short_description: '', description: '', price: '', compare_at_price: '', cost_price: '', category_id: '', images: [], sku: '', barcode: '', tags: '', is_digital: false, track_stock: false, stock_qty: '0', low_stock_threshold: '3', status: 'ACTIVE', featured: false, seo_title: '', seo_description: '', options: [] }
const fromProduct = (p: Product): PForm => ({
  id: p.id, name: p.name, short_description: p.short_description, description: p.description, price: String(Number(p.price)), compare_at_price: p.compare_at_price ? String(Number(p.compare_at_price)) : '', cost_price: p.cost_price ? String(Number(p.cost_price)) : '',
  category_id: p.category_id ?? '', images: p.images, sku: p.sku ?? '', barcode: p.barcode ?? '', tags: p.tags.join(', '), is_digital: p.is_digital, track_stock: p.track_stock, stock_qty: String(p.stock_qty), low_stock_threshold: String(p.low_stock_threshold),
  status: p.status, featured: p.featured, seo_title: p.seo_title ?? '', seo_description: p.seo_description ?? '', options: p.options,
})
const num = (v: string) => (v.trim() === '' ? null : Number(v))
const toBody = (f: PForm) => ({
  name: f.name.trim(), short_description: f.short_description, description: f.description, price: String(Number(f.price)), compare_at_price: num(f.compare_at_price) === null ? null : String(num(f.compare_at_price)),
  cost_price: num(f.cost_price) === null ? null : String(num(f.cost_price)), category_id: f.category_id || null, images: f.images, sku: f.sku.trim() || null, barcode: f.barcode.trim() || null,
  tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean), is_digital: f.is_digital, track_stock: f.track_stock, stock_qty: Number(f.stock_qty) || 0, low_stock_threshold: Number(f.low_stock_threshold) || 0,
  status: f.status, featured: f.featured, seo_title: f.seo_title || null, seo_description: f.seo_description || null,
})

export default function Products() {
  const qc = useQueryClient()
  const toast = useToast()
  const { business, summary } = useBusiness()
  const [tab, setTab] = useState<Tab>('products')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [status, setStatus] = useState('')
  const [low, setLow] = useState(false)
  const [form, setForm] = useState<PForm | null>(null)
  const [del, setDel] = useState<Product | null>(null)
  const canWrite = summary?.role !== 'STAFF'
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories') })
  const list = useQuery({ queryKey: ['products', q, cat, status, low], queryFn: () => api.get<Page<Product>>('/products', { q, category_id: cat, status, low_stock: low || undefined, limit: 100 }) })
  const flat = useMemo(() => tree(cats.data ?? []), [cats.data])
  const catName = (id: string | null) => (id ? cats.data?.find((c) => c.id === id)?.name : undefined)
  const inv = () => { void qc.invalidateQueries({ queryKey: ['products'] }); void qc.invalidateQueries({ queryKey: ['website'] }) }
  const save = useMutation({
    mutationFn: (f: PForm) => (f.id ? api.patch(`/products/${f.id}`, toBody(f)) : api.post('/products', toBody(f))),
    onSuccess: () => { inv(); setForm(null); toast.ok('Product saved') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Could not save'),
  })
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/products/${id}`), onSuccess: () => { inv(); setDel(null); toast.ok('Product deleted') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Could not delete') })

  if (list.isLoading || cats.isLoading) return <PageLoading />
  if (list.error || !list.data) return <ErrorState message="Couldn't load your products." onRetry={() => void list.refetch()} />
  const items = list.data.items
  const cur = business?.currency

  return (
    <div>
      <PageHeader title="Products" sub="What you sell. Products appear on your storefront, in the shopping bag and in WhatsApp orders." actions={canWrite && <div className="flex gap-2"><AiCatalogButton kind="product" /><Button onClick={() => setForm(blank)}><Plus className="size-4" /> Add product</Button></div>} />
      <div className="mb-4"><Tabs value={tab} onChange={setTab} items={[{ value: 'products', label: 'Products', count: list.data.total }, { value: 'categories', label: 'Categories', count: cats.data?.length }, { value: 'collections', label: 'Collections' }, { value: 'inventory', label: 'Inventory' }, { value: 'discounts', label: 'Discounts' }]} /></div>

      {tab === 'products' && <>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input aria-label="Search products" placeholder="Search name or SKU" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" /></div>
          <Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)} className="w-44"><option value="">All categories</option>{flat.map((c) => <option key={c.id} value={c.id}>{catLabel(c)}</option>)}</Select>
          <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-36"><option value="">Any status</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></Select>
          <button aria-pressed={low} onClick={() => setLow(!low)} className={cn('h-11 rounded-full px-4 text-sm font-bold', low ? 'btn-brand' : 'bg-white/70 ring-1 ring-line')}>Low stock</button>
        </div>
        <Card>
          {items.length === 0 ? (
            <EmptyState icon={<Package className="size-5" />} title={q || cat || status || low ? 'No products match' : 'No products yet'} body={q || cat || status || low ? 'Try clearing a filter.' : 'Add your first product and start building your store.'} action={canWrite && !(q || cat || status || low) && <Button onClick={() => setForm(blank)}>Add a product</Button>} />
          ) : (
            <ul className="divide-y divide-line">{items.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3 md:px-5">
                <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-line text-lg font-extrabold text-muted">{p.images[0] ? <img src={p.images[0]} alt="" className="size-full object-cover" /> : p.name[0]}</div>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 font-bold">{p.name}{p.featured && <Star className="size-3.5 fill-amber-400 text-amber-400" aria-label="Featured" />}{p.status !== 'ACTIVE' && <Badge>{p.status === 'DRAFT' ? 'Draft' : 'Archived'}</Badge>}
                    {p.track_stock && p.total_stock !== null && (p.total_stock <= 0 ? <Badge tone="bad">Sold out</Badge> : p.total_stock <= p.low_stock_threshold ? <Badge tone="warn">{p.total_stock} left</Badge> : null)}</p>
                  <p className="truncate text-sm text-muted">{catName(p.category_id) ?? 'No category'}{p.variant_count ? ` · ${p.variant_count} variants` : ''}{p.track_stock ? ` · ${p.total_stock} in stock` : ''}{p.sku ? ` · ${p.sku}` : ''}</p>
                </div>
                <p className="shrink-0 text-right font-extrabold">{money(p.price, p.currency)}{p.compare_at_price && <span className="block text-xs font-medium text-muted line-through">{money(p.compare_at_price, p.currency)}</span>}</p>
                {canWrite && <div className="flex shrink-0 items-center">
                  <button aria-label={`Edit ${p.name}`} onClick={() => setForm(fromProduct(p))} className="grid size-8 place-items-center rounded-full hover:bg-black/5"><Pencil className="size-4" /></button>
                  <button aria-label={`Delete ${p.name}`} onClick={() => setDel(p)} className="grid size-8 place-items-center rounded-full text-bad hover:bg-red-50"><Trash2 className="size-4" /></button></div>}
              </li>))}</ul>)}
        </Card>
      </>}

      {tab === 'collections' && <CollectionsPanel canWrite={canWrite} />}
      {tab === 'inventory' && <InventoryPanel canWrite={canWrite} />}
      {tab === 'discounts' && <DiscountsPanel canWrite={canWrite} />}
      {tab === 'categories' && <CategoriesPanel cats={cats.data ?? []} flat={flat} canWrite={canWrite} />}

      <ProductModal form={form} setForm={setForm} onSave={(f) => save.mutate(f)} saving={save.isPending} flat={flat} cur={cur} />
      <ConfirmDialog open={!!del} title="Delete this product?" body={<>“{del?.name}” will disappear from your storefront. Past orders keep their record.</>} confirmLabel="Delete" danger loading={remove.isPending} onConfirm={() => del && remove.mutate(del.id)} onClose={() => setDel(null)} />
    </div>
  )
}

function ProductModal({ form, setForm, onSave, saving, flat, cur }: { form: PForm | null; setForm: (f: PForm | null) => void; onSave: (f: PForm) => void; saving: boolean; flat: (Category & { depth: number })[]; cur?: string }) {
  const [pick, setPick] = useState(false)
  const set = (patch: Partial<PForm>) => form && setForm({ ...form, ...patch })
  const compareBad = form && form.compare_at_price !== '' && Number(form.compare_at_price) <= Number(form.price)
  return (
    <Modal open={!!form} onClose={() => setForm(null)} wide title={form?.id ? 'Edit product' : 'Add product'}
      footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button loading={saving} onClick={() => form && onSave(form)} disabled={!form?.name.trim() || form?.price === ''}>Save product</Button></>}>
      {form && <div className="space-y-5">
        <div className="space-y-3">
          <TextField label="Name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Kitenge wrap dress" maxLength={160} />
          <TextField label="Short description" value={form.short_description} onChange={(e) => set({ short_description: e.target.value })} maxLength={300} hint="Shown on the product card." />
          <TextAreaField label="Description" rows={4} value={form.description} onChange={(e) => set({ description: e.target.value })} maxLength={5000} />
        </div>
        <div>
          <p className="mb-2 text-sm font-bold">Photos <span className="font-medium text-muted">— the first is the cover</span></p>
          <div className="flex flex-wrap gap-2">
            {form.images.map((u, i) => (
              <div key={u + i} className="relative size-20 overflow-hidden rounded-xl ring-1 ring-line">
                <img src={u} alt="" className="size-full object-cover" />
                {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-center text-[10px] font-bold text-white">Cover</span>}
                <button aria-label="Remove photo" onClick={() => set({ images: form.images.filter((_, j) => j !== i) })} className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-white/90"><X className="size-3" /></button>
                {i > 0 && <button aria-label="Make cover" onClick={() => set({ images: [u, ...form.images.filter((_, j) => j !== i)] })} className="absolute left-1 top-1 grid size-5 place-items-center rounded-full bg-white/90"><Star className="size-3" /></button>}
              </div>))}
            {form.images.length < 12 && <button onClick={() => setPick(true)} className="grid size-20 place-items-center rounded-xl border-2 border-dashed border-line-strong text-xs font-bold text-muted hover:border-brand hover:text-brand">+ Add</button>}
          </div>
          <MediaPicker open={pick} onClose={() => setPick(false)} folder="products" multiple onPick={(u) => set({ images: [...form.images, ...u].slice(0, 12) })} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextField label={`Price (${cur ?? ''})`} type="number" inputMode="decimal" min={0} value={form.price} onChange={(e) => set({ price: e.target.value })} />
          <TextField label="Was price" type="number" inputMode="decimal" min={0} value={form.compare_at_price} onChange={(e) => set({ compare_at_price: e.target.value })} error={compareBad ? 'Must be higher than the price' : undefined} hint={compareBad ? undefined : 'Optional. Shows a saving.'} />
          <TextField label="Cost" type="number" inputMode="decimal" min={0} value={form.cost_price} onChange={(e) => set({ cost_price: e.target.value })} hint="Only you see this." />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Category"><Select value={form.category_id} onChange={(e) => set({ category_id: e.target.value })}><option value="">No category</option>{flat.map((c) => <option key={c.id} value={c.id}>{catLabel(c)}</option>)}</Select></Field>
          <Field label="Status"><Select value={form.status} onChange={(e) => set({ status: e.target.value as Product['status'] })}><option value="ACTIVE">Active — visible</option><option value="DRAFT">Draft — hidden</option><option value="ARCHIVED">Archived — hidden</option></Select></Field>
        </div>
        {form.id ? <VariantsEditor key={form.id} product={{ id: form.id, options: form.options, track_stock: form.track_stock, currency: cur ?? 'KES' }} onChanged={() => undefined} /> : <p className="rounded-xl bg-white/50 p-3 text-xs text-muted ring-1 ring-line">Save the product first, then reopen it to add sizes, colours or other options.</p>}
        <TextField label="Tags" value={form.tags} onChange={(e) => set({ tags: e.target.value })} hint="Comma separated, e.g. handmade, sale" />
        <div className="space-y-2">
          <Toggle label="Featured" hint="Eligible for ‘Featured products’ sections." checked={form.featured} onChange={(v) => set({ featured: v })} />
          <Toggle label="Track stock" hint="Shows ‘Sold out’ at zero and ‘Low stock’ near the threshold. Leave off for made-to-order items." checked={form.track_stock} onChange={(v) => set({ track_stock: v })} />
          {form.track_stock && <div className="grid grid-cols-2 gap-3"><TextField label="In stock" type="number" min={0} value={form.stock_qty} onChange={(e) => set({ stock_qty: e.target.value })} /><TextField label="Low-stock alert at" type="number" min={0} value={form.low_stock_threshold} onChange={(e) => set({ low_stock_threshold: e.target.value })} /></div>}
          <Toggle label="Digital product" hint="No delivery needed." checked={form.is_digital} onChange={(v) => set({ is_digital: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3"><TextField label="SKU" value={form.sku} onChange={(e) => set({ sku: e.target.value })} maxLength={64} /><TextField label="Barcode" value={form.barcode} onChange={(e) => set({ barcode: e.target.value })} maxLength={64} /></div>
        <details className="rounded-xl bg-white/50 p-3 ring-1 ring-line"><summary className="cursor-pointer text-sm font-bold">Search listing (SEO)</summary>
          <div className="mt-3 space-y-3"><TextField label="Title" value={form.seo_title} onChange={(e) => set({ seo_title: e.target.value })} maxLength={200} /><TextAreaField label="Description" rows={2} value={form.seo_description} onChange={(e) => set({ seo_description: e.target.value })} maxLength={320} /></div></details>
      </div>}
    </Modal>
  )
}

interface CForm { id?: string; name: string; description: string; parent_id: string; is_visible: boolean; image_url: string | null }
function CategoriesPanel({ cats, flat, canWrite }: { cats: Category[]; flat: (Category & { depth: number })[]; canWrite: boolean }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState<CForm | null>(null)
  const [del, setDel] = useState<Category | null>(null)
  const inv = () => { void qc.invalidateQueries({ queryKey: ['categories'] }); void qc.invalidateQueries({ queryKey: ['website'] }) }
  const err = (e: unknown) => toast.err(e instanceof Error ? e.message : 'Could not save')
  const save = useMutation({
    mutationFn: (f: CForm) => {
      const body = { name: f.name.trim(), description: f.description, parent_id: f.parent_id || null, is_visible: f.is_visible, image_url: f.image_url }
      return f.id ? api.patch<Category>(`/categories/${f.id}`, body) : api.post<Category>('/categories', body)
    },
    onSuccess: () => { inv(); setForm(null); toast.ok('Category saved') }, onError: err,
  })
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/categories/${id}`), onSuccess: () => { inv(); setDel(null); toast.ok('Category deleted. Its products are kept.') }, onError: err })
  const countKids = (id: string) => cats.filter((c) => c.parent_id === id).length
  return (
    <>
      <div className="mb-3 flex justify-end">{canWrite && <Button size="sm" onClick={() => setForm({ name: '', description: '', parent_id: '', is_visible: true, image_url: null })}><Plus className="size-4" /> Add category</Button>}</div>
      <Card>
        {flat.length === 0 ? <EmptyState icon={<Package className="size-5" />} title="No categories yet" body="Group products so customers can browse, e.g. Women → Dresses." action={canWrite && <Button onClick={() => setForm({ name: '', description: '', parent_id: '', is_visible: true, image_url: null })}>Add a category</Button>} /> : (
          <ul className="divide-y divide-line">{flat.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3 md:px-5" style={{ paddingLeft: `${16 + c.depth * 22}px` }}>
              <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-line text-sm font-extrabold text-muted">{c.image_url ? <img src={c.image_url} alt="" className="size-full object-cover" /> : c.name[0]}</div>
              <div className="min-w-0 flex-1"><p className="flex items-center gap-2 font-bold">{c.name}{!c.is_visible && <Badge>Hidden</Badge>}</p><p className="truncate text-xs text-muted">{countKids(c.id) ? `${countKids(c.id)} sub-categories` : c.description || 'No description'}</p></div>
              {canWrite && <div className="flex shrink-0">
                <button aria-label={`Edit ${c.name}`} onClick={() => setForm({ id: c.id, name: c.name, description: c.description, parent_id: c.parent_id ?? '', is_visible: c.is_visible, image_url: c.image_url })} className="grid size-8 place-items-center rounded-full hover:bg-black/5"><Pencil className="size-4" /></button>
                <button aria-label={`Delete ${c.name}`} onClick={() => setDel(c)} className="grid size-8 place-items-center rounded-full text-bad hover:bg-red-50"><Trash2 className="size-4" /></button></div>}
            </li>))}</ul>)}
      </Card>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit category' : 'Add category'} footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button loading={save.isPending} disabled={!form?.name.trim()} onClick={() => form && save.mutate(form)}>Save</Button></>}>
        {form && <div className="space-y-4">
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={160} />
          <TextAreaField label="Description" rows={2} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Field label="Inside" hint="Nest it under another category, up to three levels."><Select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}><option value="">Top level</option>{flat.filter((c) => c.id !== form.id && c.depth < 2).map((c) => <option key={c.id} value={c.id}>{catLabel(c)}</option>)}</Select></Field>
          <ImageInput label="Cover image" folder="products" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} hint="Used on category tiles." />
          <Toggle label="Visible on storefront" checked={form.is_visible} onChange={(v) => setForm({ ...form, is_visible: v })} />
        </div>}
      </Modal>
      <ConfirmDialog open={!!del} title="Delete this category?" body={<>“{del?.name}” is removed. Products and sub-categories inside it are kept and become uncategorised.</>} confirmLabel="Delete" danger loading={remove.isPending} onConfirm={() => del && remove.mutate(del.id)} onClose={() => setDel(null)} />
    </>
  )
}
