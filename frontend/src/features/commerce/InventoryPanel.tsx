import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Tabs, TextField } from '@/components/ui'
import { fmtDateTime } from '@/lib/format'
import type { Movement, Page, StockRow } from '@/types'

type Res = Page<StockRow> & { counts: { out: number; low: number } }
const REASON: Record<string, string> = { SALE: 'Sale', RESTOCK: 'Restock', ADJUSTMENT: 'Adjustment', RETURN: 'Return', CANCELLED: 'Order cancelled', INITIAL: 'Opening stock' }

export function InventoryPanel({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [view, setView] = useState<'all' | 'low' | 'out'>('all')
  const [q, setQ] = useState('')
  const [adj, setAdj] = useState<StockRow | null>(null)
  const [mode, setMode] = useState<'add' | 'set'>('add')
  const [val, setVal] = useState('')
  const [reason, setReason] = useState('RESTOCK')
  const [note, setNote] = useState('')
  const [hist, setHist] = useState(false)
  const list = useQuery({ queryKey: ['inventory', view, q], queryFn: () => api.get<Res>('/inventory', { view, q: q || undefined, limit: 200 }) })
  const moves = useQuery({ queryKey: ['inventory-moves'], queryFn: () => api.get<Page<Movement>>('/inventory/movements', { limit: 60 }), enabled: hist })
  const save = useMutation({
    mutationFn: () => api.post('/inventory/adjust', { product_id: adj!.product_id, variant_id: adj!.variant_id, reason, note, ...(mode === 'add' ? { delta: Number(val) } : { set_to: Number(val) }) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['inventory'] }); void qc.invalidateQueries({ queryKey: ['inventory-moves'] }); void qc.invalidateQueries({ queryKey: ['products'] }); setAdj(null); setVal(''); setNote(''); toast.ok('Stock updated') },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Could not update stock'),
  })
  const c = list.data?.counts
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Tabs value={view} onChange={setView} items={[{ value: 'all', label: 'All stock' }, { value: 'low', label: 'Low', count: c?.low }, { value: 'out', label: 'Out of stock', count: c?.out }]} />
        <div className="ml-auto flex items-center gap-2"><Input aria-label="Search stock" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-48" /><Button size="sm" variant="secondary" onClick={() => setHist(true)}>History</Button></div>
      </div>
      <Card>
        {list.isLoading ? <div className="grid h-32 place-items-center"><Spinner /></div> : !list.data?.items.length ? (
          <EmptyState icon={<Boxes className="size-5" />} title={view === 'all' ? 'No tracked products' : 'Nothing here'} body={view === 'all' ? 'Turn on “Track stock” on a product to manage its quantity here. Services and made-to-order items don’t need it.' : 'Great — no products in this state.'} />
        ) : (
          <ul className="divide-y divide-line">{list.data.items.map((r) => (
            <li key={`${r.product_id}${r.variant_id}`} className="flex items-center gap-3 px-4 py-3 md:px-5">
              <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-line text-sm font-bold text-muted">{r.image ? <img src={r.image} alt="" className="size-full object-cover" /> : r.name[0]}</div>
              <div className="min-w-0 flex-1"><p className="truncate font-bold">{r.name}{r.variant && <span className="font-medium text-muted"> — {r.variant}</span>}</p><p className="text-xs text-muted">{r.sku ? `SKU ${r.sku} · ` : ''}Alert at {r.threshold}</p></div>
              {r.stock <= 0 ? <Badge tone="bad">Sold out</Badge> : r.stock <= r.threshold ? <Badge tone="warn">Low</Badge> : null}
              <p className="w-14 text-right text-lg font-extrabold">{r.stock}</p>
              {canWrite && <Button size="sm" variant="secondary" onClick={() => { setAdj(r); setMode('add'); setReason('RESTOCK'); setVal('') }}>Adjust</Button>}
            </li>))}</ul>)}
      </Card>
      <Modal open={!!adj} onClose={() => setAdj(null)} title={adj ? `Adjust ${adj.name}${adj.variant ? ` — ${adj.variant}` : ''}` : ''} footer={<><Button variant="secondary" onClick={() => setAdj(null)}>Cancel</Button><Button loading={save.isPending} disabled={val === '' || Number.isNaN(Number(val))} onClick={() => save.mutate()}>Save</Button></>}>
        {adj && <div className="space-y-4">
          <p className="text-sm text-muted">Currently <b className="text-ink">{adj.stock}</b> in stock.</p>
          <Tabs value={mode} onChange={(m) => { setMode(m); setReason(m === 'add' ? 'RESTOCK' : 'ADJUSTMENT') }} items={[{ value: 'add', label: 'Add or remove' }, { value: 'set', label: 'Set total' }]} />
          <TextField label={mode === 'add' ? 'Change (use − to remove)' : 'New total'} type="number" value={val} onChange={(e) => setVal(e.target.value)} hint={mode === 'add' && val !== '' ? `New total: ${adj.stock + Number(val)}` : undefined} />
          <Field label="Reason"><Select value={reason} onChange={(e) => setReason(e.target.value)}><option value="RESTOCK">New stock arrived</option><option value="ADJUSTMENT">Correction / damaged / lost</option><option value="RETURN">Customer return</option></Select></Field>
          <TextField label="Note (optional)" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
        </div>}
      </Modal>
      <Modal open={hist} onClose={() => setHist(false)} wide title="Stock history">
        {moves.isLoading ? <Spinner /> : <ul className="divide-y divide-line">{moves.data?.items.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2.5 text-sm"><span className={m.delta > 0 ? 'w-12 font-extrabold text-ok' : 'w-12 font-extrabold text-bad'}>{m.delta > 0 ? '+' : ''}{m.delta}</span>
            <span className="min-w-0 flex-1"><b className="block truncate">{m.product_name}</b><span className="text-xs text-muted">{REASON[m.reason] ?? m.reason}{m.note ? ` · ${m.note}` : ''} · {fmtDateTime(m.created_at)}</span></span><span className="text-xs text-muted">now {m.qty_after}</span></li>))}</ul>}
      </Modal>
    </>
  )
}
