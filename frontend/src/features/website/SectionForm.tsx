import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Button, Field, Select, TextAreaField, TextField } from '@/components/ui'
import { ImageInput } from './ImageInput'
import { cn } from '@/lib/cn'
import type { Category, FieldDef, Section, SectionDef } from '@/types'

const cap = (s: string) => (s[0]?.toUpperCase() ?? '') + s.slice(1).replace(/_/g, ' ')
const ACTION_LABEL: Record<string, string> = { auto: 'Best option (automatic)', whatsapp: 'WhatsApp chat', book: 'Booking form', call: 'Phone call', shop: 'Products', services: 'Services', contact: 'Contact section', url: 'A link I choose' }
const STYLE_LABEL: Record<string, Record<string, string>> = {
  bg: { none: 'Page colour', tint: 'Soft tint', contrast: 'Dark', accent: 'Accent colour' },
  pad: { none: 'None', sm: 'Compact', md: 'Normal', lg: 'Roomy' },
  align: { left: 'Left', center: 'Centred' },
  width: { normal: 'Normal', narrow: 'Narrow', wide: 'Wide' },
}

type V = Record<string, unknown>

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-white/70 p-3 ring-1 ring-line">
      <span><span className="block text-sm font-bold">{label}</span>{hint && <span className="block text-xs text-muted">{hint}</span>}</span>
      <button type="button" role="switch" aria-label={label} aria-checked={checked} onClick={() => onChange(!checked)} className={cn('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-brand' : 'bg-line-strong')}>
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  )
}

function FieldInput({ f, value, onChange, values, categories, collections }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void; values: V; categories: Category[]; collections: { id: string; name: string }[] }) {
  if (f.show_if && values[f.show_if[0]] !== f.show_if[1]) return null
  const label = f.label
  switch (f.kind) {
    case 'text': return <TextField label={label} maxLength={f.max} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} hint={f.help || undefined} />
    case 'textarea': return <TextAreaField label={label} rows={f.max > 800 ? 6 : 3} maxLength={f.max} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} hint={f.help || undefined} className={f.key === 'html' ? 'font-mono text-xs' : undefined} />
    case 'url': return <TextField label={label} maxLength={f.max} placeholder="https://…" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} hint={f.help || undefined} />
    case 'image': return <ImageInput label={label} value={value as string | null} onChange={onChange} hint={f.help || undefined} />
    case 'number': return <TextField label={label} type="number" min={f.min} max={f.max} value={String(value ?? f.default ?? '')} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
    case 'bool': return <Toggle label={label} checked={value === undefined || value === null ? f.default === true : value === true} onChange={onChange} />
    case 'select': {
      const isCat = f.options[0] === '@categories'
      const isCol = f.options[0] === '@collections'
      return (
        <Field label={label}>
          <Select value={(value as string) ?? (isCat || isCol ? '' : String(f.default ?? ''))} onChange={(e) => onChange(e.target.value)}>
            {isCol ? <><option value="">Choose a collection…</option>{collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</>
              : isCat ? <><option value="">Choose a category…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</>
              : f.options.map((o) => <option key={o} value={o}>{f.key === 'cta_action' || f.key === 'action' ? ACTION_LABEL[o] ?? cap(o) : cap(o)}</option>)}
          </Select>
        </Field>
      )
    }
    case 'button': {
      const b = (value as { label?: string; action?: string; url?: string } | null) ?? {}
      const set = (patch: Record<string, string>) => onChange({ label: b.label ?? '', action: b.action ?? 'auto', url: b.url ?? '', ...patch })
      return (
        <div className="space-y-2 rounded-xl bg-white/70 p-3 ring-1 ring-line">
          <p className="text-sm font-bold">{label}</p>
          <TextField label="Button text" maxLength={40} value={b.label ?? ''} onChange={(e) => set({ label: e.target.value })} placeholder="Leave empty for no button" />
          <Field label="Goes to"><Select value={b.action ?? 'auto'} onChange={(e) => set({ action: e.target.value })}>{['auto', 'whatsapp', 'book', 'call', 'shop', 'services', 'contact', 'url'].map((o) => <option key={o} value={o}>{ACTION_LABEL[o]}</option>)}</Select></Field>
          {b.action === 'url' && <TextField label="Link" value={b.url ?? ''} onChange={(e) => set({ url: e.target.value })} placeholder="https://…" />}
        </div>
      )
    }
    case 'list': {
      const rows = (Array.isArray(value) ? value : []) as V[]
      const item = f.item ?? []
      const setRow = (i: number, k: string, v: unknown) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
      return (
        <div className="space-y-2">
          <p className="text-sm font-bold">{label}</p>
          {rows.map((r, i) => (
            <div key={i} className="space-y-2 rounded-xl bg-white/70 p-3 ring-1 ring-line">
              {item.map((sf) => sf.kind === 'textarea'
                ? <TextAreaField key={sf.key} label={sf.label} rows={3} maxLength={sf.max} value={(r[sf.key] as string) ?? ''} onChange={(e) => setRow(i, sf.key, e.target.value)} />
                : <TextField key={sf.key} label={sf.label} maxLength={sf.max} value={(r[sf.key] as string) ?? ''} onChange={(e) => setRow(i, sf.key, e.target.value)} />)}
              <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="inline-flex items-center gap-1 text-xs font-bold text-bad"><Trash2 className="size-3.5" /> Remove</button>
            </div>))}
          {rows.length < f.max_items && <Button size="sm" variant="secondary" onClick={() => onChange([...rows, Object.fromEntries(item.map((sf) => [sf.key, '']))])}><Plus className="size-4" /> Add</Button>}
        </div>
      )
    }
  }
}

export function SectionForm({ def, section, onSettings, onStyles }: { def: SectionDef; section: Section; onSettings: (k: string, v: unknown) => void; onStyles: (k: string, v: string) => void }) {
  const cols = useQuery({ queryKey: ['collections'], queryFn: () => api.get<{ id: string; name: string }[]>('/collections'), enabled: def.fields.some((f) => f.options[0] === '@collections') })
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories'), enabled: def.fields.some((f) => f.options[0] === '@categories') })
  const hasNeeds = def.needs && ['products', 'services', 'gallery', 'staff'].includes(def.needs)
  return (
    <div className="space-y-3">
      {def.fields.map((f) => <FieldInput key={f.key} f={f} value={section.settings[f.key]} values={section.settings} onChange={(v) => onSettings(f.key, v)} categories={cats.data ?? []} collections={cols.data ?? []} />)}
      {hasNeeds && <p className="text-xs text-muted">{def.needs === 'products' ? 'Products come from the Products page.' : def.needs === 'services' ? 'Services come from the Services page.' : def.needs === 'gallery' ? 'Photos come from your gallery (Photos tab).' : 'Team members come from Settings.'}</p>}
      <details className="rounded-xl bg-white/50 p-3 ring-1 ring-line">
        <summary className="cursor-pointer text-sm font-bold">Section style</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(['bg', 'pad', 'align', 'width'] as const).map((k) => (
            <Field key={k} label={{ bg: 'Background', pad: 'Spacing', align: 'Text', width: 'Width' }[k]}>
              <Select value={section.styles[k] ?? (k === 'bg' ? 'none' : k === 'pad' ? 'md' : k === 'align' ? 'left' : 'normal')} onChange={(e) => onStyles(k, e.target.value)}>
                {(k === 'pad' ? ['sm', 'md', 'lg', 'none'] : k === 'bg' ? ['none', 'tint', 'contrast', 'accent'] : k === 'align' ? ['left', 'center'] : ['normal', 'narrow', 'wide']).map((o) => <option key={o} value={o}>{STYLE_LABEL[k][o] ?? cap(o)}</option>)}
              </Select>
            </Field>))}
        </div>
      </details>
    </div>
  )
}

