import { useMemo, useState } from 'react'
import { Lock, Search } from 'lucide-react'
import { Input, Modal } from '@/components/ui'
import { sectionIcon } from './sectionIcons'
import type { Registry } from '@/types'

type Pick = { type: string; settings?: Record<string, unknown> }

export function AddSectionModal({ open, onClose, registry, onPick }: { open: boolean; onClose: () => void; registry: Registry; onPick: (p: Pick) => void }) {
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase()
    const match = (s: string) => !term || s.toLowerCase().includes(term)
    const entries = [
      ...registry.presets.map((p) => ({ key: p.key, label: p.label, description: p.description, icon: p.icon, group: p.group, available: true, pick: { type: p.type, settings: p.settings } as Pick })),
      ...registry.types.map((t) => ({ key: t.type, label: t.label, description: t.description, icon: t.icon, group: t.group, available: t.available, pick: { type: t.type } as Pick })),
    ].filter((e) => match(e.label) || match(e.description))
    return registry.groups.map((g) => ({ g, items: entries.filter((e) => e.group === g) })).filter((x) => x.items.length)
  }, [registry, q])
  return (
    <Modal open={open} onClose={onClose} title="Add a section" wide>
      <div className="relative mb-4"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input aria-label="Search sections" placeholder="Search sections, e.g. FAQ, video, products" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" /></div>
      <div className="space-y-5">
        {groups.map(({ g, items }) => (
          <section key={g}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{g}</h3>
            <ul className="grid gap-2 sm:grid-cols-2">{items.map((e) => { const Icon = sectionIcon(e.icon); return (
              <li key={e.key}>
                <button disabled={!e.available} onClick={() => { onPick(e.pick); onClose() }} className="flex w-full items-start gap-3 rounded-xl bg-white/80 p-3 text-left ring-1 ring-line transition hover:ring-brand disabled:cursor-not-allowed disabled:opacity-50">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><Icon className="size-[18px]" /></span>
                  <span className="min-w-0"><span className="flex items-center gap-1.5 text-sm font-bold">{e.label}{!e.available && <Lock className="size-3.5" />}</span><span className="block text-xs text-muted">{e.available ? e.description : 'Needs a paid plan'}</span></span>
                </button>
              </li>) })}</ul>
          </section>))}
        {!groups.length && <p className="py-8 text-center text-sm text-muted">No sections match “{q}”.</p>}
      </div>
    </Modal>
  )
}
