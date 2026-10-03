import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, Modal, TextAreaField } from '@/components/ui'
import { cn } from '@/lib/cn'

interface Item { name: string; description: string; price: number | null; category: string | null; duration_minutes: number | null; estimate: boolean; exists: boolean; keep?: boolean }
interface Proposal { kind: 'product' | 'service'; source: 'ai' | 'parser' | 'starter'; categories: string[]; items: Item[]; note: string | null; ai_available: boolean }

const SOURCE_LABEL = { ai: 'Read by Aqivo AI', parser: 'Read by the built-in list reader', starter: 'Starter ideas for your type of business' } as const

/** Two ways in: let Aqivo suggest what to sell from your business details, or paste the list you already have. Nothing is saved until you press Add. */
export function AiCatalogButton({ kind, label }: { kind: 'product' | 'service'; label?: string }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [p, setP] = useState<Proposal | null>(null)
  const word = kind === 'product' ? 'product' : 'service'
  const close = () => { setOpen(false); setP(null); setText('') }
  const err = (e: unknown) => toast.err(e instanceof Error ? e.message : 'Something went wrong')
  const suggest = useMutation({
    mutationFn: (mode: 'paste' | 'profile') => api.post<Proposal>('/ai/catalog/suggest', { mode, kind, text: mode === 'paste' ? text : '' }),
    onSuccess: (r) => { if (!r.items.length) toast.err(r.note || 'Nothing found. Try a different list.'); else setP({ ...r, items: r.items.map((i) => ({ ...i, keep: !i.exists })) }) }, onError: err,
  })
  const apply = useMutation({
    mutationFn: () => api.post<{ created: number; hidden: number; skipped: { name: string; reason: string }[] }>('/ai/catalog/apply', { kind, items: p!.items.filter((i) => i.keep).map(({ name, description, price, category, duration_minutes, estimate }) => ({ name, description, price, category, duration_minutes, estimate })) }),
    onSuccess: (r) => {
      for (const k of ['products', 'services', 'categories', 'website']) void qc.invalidateQueries({ queryKey: [k] })
      toast.ok(`${r.created} added${r.hidden ? ` · ${r.hidden} saved hidden until you set a price` : ''}${r.skipped.length ? ` · ${r.skipped.length} skipped (${r.skipped[0].reason})` : ''}`)
      close()
    }, onError: err,
  })
  const set = (i: number, patch: Partial<Item>) => p && setP({ ...p, items: p.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  const chosen = p?.items.filter((i) => i.keep).length ?? 0
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}><Sparkles className="size-4" /> {label ?? 'Set up with AI'}</Button>
      <Modal open={open} onClose={close} wide title={p ? `Review your ${word}s` : `Add ${word}s faster`}
        footer={p ? <><Button variant="secondary" onClick={() => setP(null)}>Back</Button><Button loading={apply.isPending} disabled={!chosen} onClick={() => apply.mutate()}>Add {chosen} {word}{chosen === 1 ? '' : 's'}</Button></> : undefined}>
        {!p ? (
          <div className="space-y-5">
            <section className="rounded-2xl bg-white/70 p-4 ring-1 ring-line"><h3 className="font-bold">Suggest ideas from my business</h3>
              <p className="mt-1 text-sm text-muted">Aqivo looks at your business type, category and location, and proposes {word}s and categories to start with. You choose what to keep, and no prices are made up for you.</p>
              <Button className="mt-3" loading={suggest.isPending && suggest.variables === 'profile'} onClick={() => suggest.mutate('profile')}><Sparkles className="size-4" /> Suggest {word}s</Button></section>
            <section className="rounded-2xl bg-white/70 p-4 ring-1 ring-line"><h3 className="font-bold">I already have a list</h3>
              <p className="mt-1 text-sm text-muted">Paste a price list, menu or WhatsApp catalogue. One item per line, like “Summer dress – 2,500”. Lines ending in a colon become categories.</p>
              <TextAreaField label="Your list" rows={7} maxLength={8000} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Dresses:\nSummer dress – 2,500\nMaxi dress – 3,200\n\nBags:\nLeather handbag – 4,500'} />
              <Button className="mt-1" variant="secondary" disabled={!text.trim()} loading={suggest.isPending && suggest.variables === 'paste'} onClick={() => suggest.mutate('paste')}>Read my list</Button></section>
            <p className="text-xs text-muted">Nothing is added until you review it on the next screen.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2"><Badge tone={p.source === 'ai' ? 'lime' : 'neutral'}>{SOURCE_LABEL[p.source]}</Badge>{p.categories.length > 0 && <span className="text-xs text-muted">Categories: {p.categories.join(', ')}</span>}</div>
            {p.note && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{p.note}</p>}
            <ul className="divide-y divide-line rounded-xl border border-line">{p.items.map((it, i) => (
              <li key={i} className={cn('grid gap-2 p-3 sm:grid-cols-[auto_1fr_120px_130px] sm:items-center', !it.keep && 'opacity-50')}>
                <input type="checkbox" aria-label={`Keep ${it.name}`} checked={!!it.keep} onChange={(e) => set(i, { keep: e.target.checked })} />
                <div className="min-w-0"><input aria-label="Name" value={it.name} onChange={(e) => set(i, { name: e.target.value })} className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 font-bold hover:border-line focus:border-ink" />
                  <p className="truncate px-1 text-xs text-muted">{it.exists ? 'Already in your catalogue · ' : ''}{it.category ?? 'No category'}{it.duration_minutes ? ` · ${it.duration_minutes} min` : ''}{it.description ? ` · ${it.description}` : ''}</p></div>
                <input aria-label={`Price for ${it.name}`} inputMode="decimal" placeholder="Price" value={it.price ?? ''} onChange={(e) => set(i, { price: e.target.value === '' ? null : Number(e.target.value), estimate: false })} className="h-10 rounded-lg border border-line-strong bg-white/80 px-2 text-sm" />
                <span className="text-xs text-muted">{it.price === null ? 'Saved hidden' : it.estimate ? 'Example price · hidden' : 'Will be live'}</span>
              </li>))}</ul>
            <p className="text-xs text-muted">Items without a price you’ve confirmed are saved as hidden drafts, so customers never see a price you didn’t set.</p>
          </div>
        )}
      </Modal>
    </>
  )
}
