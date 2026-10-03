import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Pencil, Plus, Scissors, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { AiCatalogButton } from '@/features/commerce/AiCatalog'
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Modal, PageHeader, PageLoading, TextAreaField, TextField } from '@/components/ui'
import { money } from '@/lib/format'
import type { Service } from '@/types'

interface Form { id?: string; name: string; description: string; price: string; duration_minutes: string; is_active: boolean }
const blank: Form = { name: '', description: '', price: '', duration_minutes: '60', is_active: true }

export default function Services() {
  const qc = useQueryClient()
  const toast = useToast()
  const { business, summary, refresh } = useBusiness()
  const q = useQuery({ queryKey: ['services'], queryFn: () => api.get<Service[]>('/services') })
  const [form, setForm] = useState<Form | null>(null)
  const [del, setDel] = useState<Service | null>(null)
  const canWrite = summary?.role !== 'STAFF'
  const inv = () => { void qc.invalidateQueries({ queryKey: ['services'] }); void refresh() }
  const save = useMutation({
    mutationFn: (f: Form) => { const body = { name: f.name.trim(), description: f.description, price: String(Number(f.price)), duration_minutes: Number(f.duration_minutes), is_active: f.is_active }; return f.id ? api.patch(`/services/${f.id}`, body) : api.post('/services', body) },
    onSuccess: () => { inv(); setForm(null); toast.ok('Service saved') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Could not save'),
  })
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/services/${id}`), onSuccess: () => { inv(); setDel(null); toast.ok('Service deleted') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Could not delete') })
  const move = useMutation({ mutationFn: (ids: string[]) => api.put('/services/order', { ids }), onSuccess: inv })

  if (q.isLoading) return <PageLoading />
  if (q.error || !q.data) return <ErrorState message="Couldn't load your services." onRetry={() => void q.refetch()} />
  const items = q.data
  const shift = (i: number, d: number) => { const ids = items.map((s) => s.id); const j = i + d; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; move.mutate(ids) }

  return (
    <div>
      <PageHeader title="Services" sub="What you offer, what it costs and how long it takes. These appear on your profile, website and booking form." actions={canWrite && <div className="flex gap-2"><AiCatalogButton kind="service" /><Button onClick={() => setForm(blank)}><Plus className="size-4" /> Add service</Button></div>} />
      <Card>
        {items.length === 0 ? <EmptyState icon={<Scissors className="size-5" />} title="No services yet" body="Add your first service so customers can see prices and book." action={canWrite && <Button onClick={() => setForm(blank)}>Add a service</Button>} /> : (
          <ul className="divide-y divide-line">{items.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3.5 md:px-5">
              <div className="min-w-0 flex-1"><p className="flex items-center gap-2 font-bold">{s.name}{!s.is_active && <Badge>Hidden</Badge>}</p><p className="truncate text-sm text-muted">{s.duration_minutes} min{s.description ? ` · ${s.description}` : ''}</p></div>
              <p className="shrink-0 font-extrabold">{money(s.price, business?.currency)}</p>
              {canWrite && <div className="flex shrink-0 items-center">
                <button aria-label="Move up" disabled={i === 0} onClick={() => shift(i, -1)} className="grid size-8 place-items-center rounded-full text-muted hover:bg-black/5 disabled:opacity-30"><ArrowUp className="size-4" /></button>
                <button aria-label="Move down" disabled={i === items.length - 1} onClick={() => shift(i, 1)} className="grid size-8 place-items-center rounded-full text-muted hover:bg-black/5 disabled:opacity-30"><ArrowDown className="size-4" /></button>
                <button aria-label={`Edit ${s.name}`} onClick={() => setForm({ id: s.id, name: s.name, description: s.description, price: String(Number(s.price)), duration_minutes: String(s.duration_minutes), is_active: s.is_active })} className="grid size-8 place-items-center rounded-full hover:bg-black/5"><Pencil className="size-4" /></button>
                <button aria-label={`Delete ${s.name}`} onClick={() => setDel(s)} className="grid size-8 place-items-center rounded-full text-bad hover:bg-red-50"><Trash2 className="size-4" /></button></div>}
            </li>))}</ul>
        )}
      </Card>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit service' : 'Add service'} footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button loading={save.isPending} onClick={() => form && save.mutate(form)} disabled={!form?.name.trim() || form?.price === ''}>Save</Button></>}>
        {form && <div className="space-y-4">
          <TextField label="Service name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Knotless Braids" />
          <div className="grid grid-cols-2 gap-3"><TextField label={`Price (${business?.currency ?? ''})`} type="number" inputMode="decimal" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /><TextField label="Duration (minutes)" type="number" min={5} step={5} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></div>
          <TextAreaField label="Description (optional)" rows={3} maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-4 accent-ink" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Show this service to customers</label>
        </div>}
      </Modal>
      <ConfirmDialog open={!!del} title="Delete this service?" body={<>“{del?.name}” will no longer appear on your profile. Past bookings keep their record.</>} confirmLabel="Delete" danger loading={remove.isPending} onConfirm={() => del && remove.mutate(del.id)} onClose={() => setDel(null)} />
    </div>
  )
}
