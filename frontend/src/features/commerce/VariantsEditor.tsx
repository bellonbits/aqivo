import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { Button, Input, Spinner } from '@/components/ui'
import type { Product, Variant } from '@/types'

interface Opt { name: string; values: string }

/** Options (Size, Colour…) → every combination becomes a variant with its own stock, price and SKU. */
export function VariantsEditor({ product, onChanged }: { product: Pick<Product, 'id' | 'options' | 'track_stock' | 'currency'>; onChanged: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [opts, setOpts] = useState<Opt[]>(() => product.options.map((o) => ({ name: (o as { name: string }).name, values: (o as { values: string[] }).values.join(', ') })))
  const variants = useQuery({ queryKey: ['variants', product.id], queryFn: () => api.get<Variant[]>(`/products/${product.id}/variants`) })
  const [rows, setRows] = useState<Variant[]>([])
  useEffect(() => { if (variants.data) setRows(variants.data) }, [variants.data])
  const err = (e: unknown) => toast.err(e instanceof Error ? e.message : 'Could not save')
  const inv = () => { void qc.invalidateQueries({ queryKey: ['variants', product.id] }); void qc.invalidateQueries({ queryKey: ['products'] }); void qc.invalidateQueries({ queryKey: ['inventory'] }); onChanged() }
  const gen = useMutation({
    mutationFn: () => api.put<Variant[]>(`/products/${product.id}/options`, { options: opts.filter((o) => o.name.trim() && o.values.trim()).map((o) => ({ name: o.name.trim(), values: o.values.split(',').map((v) => v.trim()).filter(Boolean) })) }),
    onSuccess: (r) => { setRows(r); inv(); toast.ok(r.length ? `${r.length} variants ready` : 'Options removed') }, onError: err,
  })
  const patch = useMutation({ mutationFn: (p: { id: string; body: Record<string, unknown> }) => api.patch<Variant>(`/products/${product.id}/variants/${p.id}`, p.body), onSuccess: inv, onError: err })
  const combos = opts.reduce((n, o) => n * Math.max(1, o.values.split(',').filter((v) => v.trim()).length), opts.length ? 1 : 0)
  const upd = (id: string, patchRow: Partial<Variant>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patchRow } : r)))
  return (
    <div className="space-y-3 rounded-xl bg-white/50 p-3 ring-1 ring-line">
      <div><p className="text-sm font-bold">Options &amp; variants</p><p className="text-xs text-muted">For products that come in sizes, colours or other choices. Each combination gets its own stock and, if you like, its own price.</p></div>
      {opts.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input aria-label="Option name" placeholder="Size" value={o.name} maxLength={30} onChange={(e) => setOpts((x) => x.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} className="w-32 shrink-0" />
          <Input aria-label="Option values" placeholder="S, M, L" value={o.values} onChange={(e) => setOpts((x) => x.map((r, j) => (j === i ? { ...r, values: e.target.value } : r)))} />
          <button aria-label="Remove option" onClick={() => setOpts((x) => x.filter((_, j) => j !== i))} className="grid size-9 shrink-0 place-items-center rounded-full text-bad hover:bg-red-50"><Trash2 className="size-4" /></button>
        </div>))}
      <div className="flex flex-wrap items-center gap-2">
        {opts.length < 3 && <Button size="sm" variant="secondary" onClick={() => setOpts([...opts, { name: '', values: '' }])}><Plus className="size-4" /> Add option</Button>}
        <Button size="sm" loading={gen.isPending} onClick={() => gen.mutate()} disabled={combos > 100}>{opts.length ? `Update variants${combos ? ` (${combos})` : ''}` : 'Remove variants'}</Button>
        {combos > 100 && <span className="text-xs text-bad">More than 100 combinations — use fewer values.</span>}
      </div>
      {variants.isLoading ? <Spinner /> : rows.length > 0 && (
        <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm"><thead><tr className="text-left text-xs text-muted"><th className="py-1 pr-2">Variant</th><th className="pr-2">SKU</th><th className="pr-2">Price ({product.currency})</th><th>Stock</th></tr></thead>
          <tbody>{rows.map((v) => (
            <tr key={v.id} className="border-t border-line">
              <td className="py-1.5 pr-2 font-semibold">{v.title}</td>
              <td className="pr-2"><Input aria-label={`SKU ${v.title}`} value={v.sku ?? ''} onChange={(e) => upd(v.id, { sku: e.target.value })} onBlur={() => patch.mutate({ id: v.id, body: { sku: v.sku || null } })} className="h-9" /></td>
              <td className="pr-2"><Input aria-label={`Price ${v.title}`} type="number" min={0} placeholder="Same" value={v.price ? String(Number(v.price)) : ''} onChange={(e) => upd(v.id, { price: e.target.value })} onBlur={() => patch.mutate({ id: v.id, body: v.price && Number(v.price) > 0 ? { price: String(Number(v.price)) } : { clear_price: true } })} className="h-9 w-28" /></td>
              <td><Input aria-label={`Stock ${v.title}`} type="number" min={0} disabled={!product.track_stock} title={product.track_stock ? undefined : 'Turn on Track stock first'} value={v.stock_qty} onChange={(e) => upd(v.id, { stock_qty: Number(e.target.value) })} onBlur={() => product.track_stock && patch.mutate({ id: v.id, body: { stock_qty: Math.max(0, v.stock_qty) } })} className="h-9 w-20" /></td>
            </tr>))}</tbody></table>
          {!product.track_stock && <p className="mt-2 text-xs text-muted">Stock is off for this product — turn on “Track stock” above to count each variant.</p>}</div>)}
    </div>
  )
}
