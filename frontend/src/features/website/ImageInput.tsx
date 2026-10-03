import { useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { MediaPicker } from './MediaPicker'
import { Field } from '@/components/ui'

export function ImageInput({ label, value, onChange, folder = 'storefront', hint }: { label: string; value: string | null | undefined; onChange: (v: string | null) => void; folder?: string; hint?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} aria-label={value ? `Change ${label}` : `Choose ${label}`} className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-line text-muted ring-1 ring-line hover:ring-brand">
          {value ? <img src={value} alt="" className="size-full object-cover" /> : <ImagePlus className="size-5" />}
        </button>
        <div className="flex gap-2 text-xs font-bold">
          <button type="button" onClick={() => setOpen(true)} className="underline">{value ? 'Change' : 'Choose image'}</button>
          {value && <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 text-muted"><X className="size-3" /> Remove</button>}
        </div>
      </div>
      <MediaPicker open={open} onClose={() => setOpen(false)} folder={folder} onPick={(u) => onChange(u[0] ?? null)} />
    </Field>
  )
}
