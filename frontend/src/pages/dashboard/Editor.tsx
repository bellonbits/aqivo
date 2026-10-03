import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, Copy, ExternalLink, Eye, EyeOff, GripVertical, Monitor, Plus, RotateCcw, Smartphone, Tablet, Trash2, Wand2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, ConfirmDialog, Field, Input, PageLoading, Select, StatusBadge, TextAreaField, TextField, UpgradePrompt } from '@/components/ui'
import { AddSectionModal } from '@/features/website/AddSectionModal'
import { SectionForm, Toggle } from '@/features/website/SectionForm'
import { sectionIcon } from '@/features/website/sectionIcons'
import { PagesPanel } from '@/features/website/PagesPanel'
import { PhotosTab, SeoTab, TestimonialsEditor } from './Website'
import { cn } from '@/lib/cn'
import { PhoneFrame } from '@/components/PhoneFrame'
import type { Registry, Section, SectionDef, Template, Website } from '@/types'

type Tab = 'sections' | 'pages' | 'style' | 'photos' | 'settings'
const TABS: [Tab, string][] = [['sections', 'Sections'], ['pages', 'Pages & menu'], ['style', 'Style'], ['photos', 'Photos'], ['settings', 'Settings']]
type Device = 'desktop' | 'tablet' | 'mobile'
const DEVICE_W: Record<Device, number> = { desktop: 1280, tablet: 820, mobile: 390 }

const FONT_HINT: Record<string, string> = { Fraunces: 'Elegant serif', 'Playfair Display': 'Classic serif', 'DM Serif Display': 'Bold serif', Manrope: 'Clean sans', Inter: 'Neutral sans', Poppins: 'Friendly sans', 'Space Grotesk': 'Techy sans', Outfit: 'Rounded sans' }

function ColorField({ label, value, fallback, onChange }: { label: string; value?: string; fallback: string; onChange: (v: string) => void }) {
  const v = value || fallback
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={label} value={v} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line-strong bg-white p-1" />
        <Input value={v} maxLength={7} onChange={(e) => /^#[0-9a-fA-F]{6}$/.test(e.target.value) && onChange(e.target.value.toUpperCase())} className="h-10 min-w-0 flex-1 font-mono text-xs uppercase" aria-label={`${label} hex`} />
        {value && <button type="button" onClick={() => onChange('')} className="shrink-0 text-xs font-semibold text-muted underline">reset</button>}
      </div>
    </Field>
  )
}


function summaryOf(s: Section) {
  const st = s.settings
  return (st.title ?? st.headline ?? st.label ?? st.text ?? '') as string
}

function SectionRow({ section, def, selected, onSelect, onToggle, onDuplicate, onDelete, children }: {
  section: Section; def: SectionDef | undefined; selected: boolean; onSelect: () => void; onToggle: () => void; onDuplicate: () => void; onDelete: () => void; children?: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
  const Icon = sectionIcon(def?.icon ?? '')
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} data-section-row={section.id}
      className={cn('overflow-hidden rounded-2xl bg-white/85 ring-1 transition-shadow w-full min-w-0 max-w-full', selected ? 'ring-2 ring-brand' : 'ring-line', isDragging && 'z-10 shadow-xl', !section.enabled && 'opacity-60')}>
      <div className="flex items-center gap-1 px-1.5 py-1.5">
        <button {...attributes} {...listeners} aria-label={`Drag to move ${def?.label ?? section.type}`} className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-full text-muted hover:bg-black/5 active:cursor-grabbing"><GripVertical className="size-4" /></button>
        <button onClick={onSelect} aria-expanded={selected} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1.5 text-left">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><Icon className="size-4" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{def?.label ?? section.type}</span><span className="block truncate text-xs text-muted">{summaryOf(section) || 'No title'}</span></span>
        </button>
        <button aria-label={section.enabled ? 'Hide section' : 'Show section'} aria-pressed={!section.enabled} onClick={onToggle} className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-black/5">{section.enabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button>
        <button aria-label="Duplicate section" onClick={onDuplicate} className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-black/5"><Copy className="size-4" /></button>
        <button aria-label="Delete section" onClick={onDelete} className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-bad"><Trash2 className="size-4" /></button>
      </div>
      {selected && <div className="border-t border-line p-3">{children}</div>}
    </div>
  )
}

type Pending = { sections: Record<string, { settings?: Record<string, unknown>; styles?: Record<string, string>; enabled?: boolean }>; theme: Record<string, string>; settings: Record<string, boolean | string> }
const emptyPending = (): Pending => ({ sections: {}, theme: {}, settings: {} })

export default function Editor() {
  const { has, business, summary, refresh } = useBusiness()
  const qc = useQueryClient()
  const toast = useToast()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>(params.get('template') ? 'style' : 'sections')
  const [pane, setPane] = useState<'edit' | 'preview'>('edit')
  const [device, setDevice] = useState<Device>(typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop')
  const [html, setHtml] = useState<string | null>(null)
  const [previewTpl, setPreviewTpl] = useState<string | null>(params.get('template'))
  const [selected, setSelected] = useState<string | null>(null)
  const [pageId, setPageId] = useState<string | null>(null)
  const pageRef = useRef<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [delId, setDelId] = useState<string | null>(null)
  const [regen, setRegen] = useState(false)
  const [state, setState] = useState<'saved' | 'saving' | 'error'>('saved')
  const [boxW, setBoxW] = useState(800)
  const [boxH, setBoxH] = useState(800)
  const site = useQuery({ queryKey: ['website'], queryFn: () => api.get<Website>('/websites/me'), enabled: has('website') })
  const registry = useQuery({ queryKey: ['registry'], queryFn: () => api.get<Registry>('/websites/me/registry'), enabled: has('website'), staleTime: 5 * 60_000 })
  const pending = useRef<Pending>(emptyPending())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<string | null>(null)
  selectedRef.current = selected
  const w = site.data
  const homeId = w?.pages.find((p) => p.is_home)?.id ?? null
  const curPage = pageId && w?.pages.some((p) => p.id === pageId) ? pageId : homeId
  pageRef.current = curPage
  const pageSections = w ? w.sections.filter((x) => x.page_id === curPage).sort((a, b) => a.position - b.position) : []
  const defs = useMemo(() => Object.fromEntries((registry.data?.types ?? []).map((d) => [d.type, d])), [registry.data])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  const loadPreview = useCallback(async (tpl: string | null) => {
    const pg = pageRef.current
    try { setHtml(await api.get<string>('/websites/me/preview', { template: tpl ?? undefined, edit: tpl ? undefined : 1, page: tpl ? undefined : pg ?? undefined })) } catch (e) { toast.err(e instanceof Error ? e.message : 'Preview failed') }
  }, [toast])
  useEffect(() => { if (has('website') && homeId) void loadPreview(previewTpl) }, [has, previewTpl, loadPreview, curPage, homeId])

  const [uploadingLogo, setUploadingLogo] = useState(false)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploadingLogo(true)
    try {
      await api.upload('/businesses/me/logo', f)
      await qc.invalidateQueries({ queryKey: ['business'] })
      await qc.invalidateQueries({ queryKey: ['website'] })
      await refresh()
      void loadPreview(previewTpl)
      toast.ok('Logo updated')
    } catch (err) {
      toast.err(err instanceof Error ? err.message : 'Logo upload failed')
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  // Preview <-> list: clicking a section in the preview selects it here; the iframe re-selects after each reload.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !e.data || typeof e.data !== 'object') return
      const d = e.data as { aqivo?: string; bizora?: string; id?: string }
      const action = d.aqivo ?? d.bizora
      if (action === 'select' && d.id) { setSelected(d.id); setTab('sections'); setPane('edit'); setTimeout(() => { const row = document.querySelector<HTMLElement>(`[data-section-row="${d.id}"]`); const sc = row?.closest<HTMLElement>('.overflow-y-auto'); if (row && sc) sc.scrollTo({ top: row.offsetTop - sc.offsetTop - 8, behavior: 'smooth' }) }, 50) }
      if (action === 'ready' && selectedRef.current) frame.current?.contentWindow?.postMessage({ aqivo: 'select', bizora: 'select', id: selectedRef.current }, '*')
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])
  useEffect(() => { frame.current?.contentWindow?.postMessage({ aqivo: 'select', bizora: 'select', id: selected }, '*') }, [selected])
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setBoxW(el.clientWidth)
      setBoxH(el.clientHeight)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [w, html === null])

  const hasPending = () => { const p = pending.current; return Object.keys(p.sections).length + Object.keys(p.theme).length + Object.keys(p.settings).length > 0 }
  const flush = useCallback(async () => {
    const p = pending.current
    pending.current = emptyPending()
    setState('saving')
    try {
      for (const [id, patch] of Object.entries(p.sections)) await api.patch(`/websites/me/sections/${id}`, patch)
      if (Object.keys(p.theme).length || Object.keys(p.settings).length) await api.patch('/websites/me/style', { theme: Object.keys(p.theme).length ? p.theme : undefined, settings: Object.keys(p.settings).length ? p.settings : undefined })
      if (!hasPending()) { await qc.invalidateQueries({ queryKey: ['website'] }); void refresh(); await loadPreview(previewTpl) }
      setState('saved')
    } catch (e) { setState('error'); toast.err(e instanceof Error ? e.message : 'Could not save') }
  }, [qc, refresh, loadPreview, previewTpl, toast])
  const queue = () => { setState('saving'); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => void flush(), 700) }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const patchSection = (id: string, patch: { settings?: Record<string, unknown>; styles?: Record<string, string>; enabled?: boolean }) => {
    const cur = pending.current.sections[id] ?? {}
    pending.current.sections[id] = { settings: { ...cur.settings, ...patch.settings }, styles: { ...cur.styles, ...patch.styles }, enabled: patch.enabled ?? cur.enabled }
    if (!patch.settings) delete pending.current.sections[id].settings
    if (!patch.styles) delete pending.current.sections[id].styles
    qc.setQueryData<Website>(['website'], (o) => o && { ...o, sections: o.sections.map((s) => (s.id === id ? { ...s, settings: { ...s.settings, ...patch.settings }, styles: { ...s.styles, ...patch.styles }, enabled: patch.enabled ?? s.enabled } : s)) })
    queue()
  }
  const setTheme = (k: string, v: string) => { pending.current.theme[k] = v; qc.setQueryData<Website>(['website'], (o) => { if (!o) return o; const t = { ...o.theme_overrides }; if (v) t[k] = v; else delete t[k]; return { ...o, theme_overrides: t } }); queue() }
  const setSetting = (k: string, v: boolean | string) => { pending.current.settings[k] = v; qc.setQueryData<Website>(['website'], (o) => o && { ...o, settings: { ...o.settings, [k]: v } }); queue() }

  const afterStructure = async () => { await qc.invalidateQueries({ queryKey: ['website'] }); void refresh(); await loadPreview(previewTpl) }
  const err = (e: unknown) => toast.err(e instanceof Error ? e.message : 'Something went wrong')
  const add = useMutation({
    mutationFn: (p: { type: string; settings?: Record<string, unknown> }) => api.post<Website & { added_id: string }>('/websites/me/sections', { ...p, page_id: curPage, after_id: selected && pageSections.some((x) => x.id === selected) ? selected : undefined }),
    onSuccess: async (r) => { await afterStructure(); setSelected(r.added_id); setTab('sections') }, onError: err,
  })
  const dup = useMutation({ mutationFn: (id: string) => api.post<Website & { added_id: string }>(`/websites/me/sections/${id}/duplicate`), onSuccess: async (r) => { await afterStructure(); setSelected(r.added_id) }, onError: err })
  const del = useMutation({ mutationFn: (id: string) => api.del(`/websites/me/sections/${id}`), onSuccess: async () => { setDelId(null); setSelected(null); await afterStructure() }, onError: err })
  const reorder = useMutation({ mutationFn: (order: string[]) => api.put('/websites/me/order', { order, page_id: curPage }), onSuccess: afterStructure, onError: err })
  const regenerate = useMutation({ mutationFn: () => api.post('/websites/me/regenerate'), onSuccess: async () => { setRegen(false); setSelected(null); await afterStructure(); toast.ok('Storefront rebuilt from your business details') }, onError: err })
  const publish = useMutation({
    mutationFn: async () => { if (timer.current) clearTimeout(timer.current); await flush(); return api.post('/websites/me/publish') },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['website'] }); void refresh(); toast.ok('Published — your storefront is live') }, onError: err,
  })
  const resetStyle = useMutation({ mutationFn: () => api.del('/websites/me/style'), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['website'] }); await loadPreview(previewTpl); toast.ok('Style reset to the preset defaults') } })
  const apply = useMutation({ mutationFn: (key: string) => api.post('/websites/me/template', { template_key: key }), onSuccess: async () => { setPreviewTpl(null); await qc.invalidateQueries({ queryKey: ['website'] }); void refresh(); toast.ok('Style preset applied. Your sections are unchanged — publish when ready.') }, onError: err })

  const onDragEnd = (e: DragEndEvent) => {
    if (!w || !e.over || e.active.id === e.over.id) return
    const ids = pageSections.map((s) => s.id)
    const next = arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)))
    qc.setQueryData<Website>(['website'], (o) => o && { ...o, sections: o.sections.map((s) => (next.includes(s.id) ? { ...s, position: next.indexOf(s.id) } : s)) })
    reorder.mutate(next)
  }

  if (!has('website')) return <div><h1 className="mb-6 text-2xl md:text-3xl">Storefront builder</h1><UpgradePrompt feature="website" title="Build your storefront" body="The visual builder is part of Grow and above. Your free profile stays live meanwhile." /></div>
  if (site.isLoading || registry.isLoading || !w || !registry.data || !business) return <PageLoading />
  const s = w.settings
  const to = w.theme_overrides
  const base = w.template.theme

  const sectionsTab = (
    <>
      <div className="space-y-2.5">
        <Select aria-label="Page being edited" value={curPage ?? ''} onChange={(e) => { setPageId(e.target.value); setSelected(null) }} className="w-full">
          {w.pages.map((p) => <option key={p.id} value={p.id}>{p.is_home ? 'Home page' : p.title}</option>)}
        </Select>
        <div className="flex items-center justify-between gap-2">
          <Button size="sm" variant="secondary" onClick={() => setTab('pages')} className="shrink-0 whitespace-nowrap">
            Pages &amp; menu
          </Button>
          <Button size="sm" onClick={() => setAdding(true)} className="shrink-0 whitespace-nowrap">
            <Plus className="size-4" /> Add section
          </Button>
        </div>
        <p className="text-xs text-muted">Drag to reorder. Click a section here or in preview to edit.</p>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={pageSections.map((x) => x.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {pageSections.map((sec) => {
              const def = defs[sec.type]
              return (
                <SectionRow key={sec.id} section={sec} def={def} selected={selected === sec.id} onSelect={() => setSelected(selected === sec.id ? null : sec.id)}
                  onToggle={() => patchSection(sec.id, { enabled: !sec.enabled })} onDuplicate={() => dup.mutate(sec.id)} onDelete={() => setDelId(sec.id)}>
                  {def && <SectionForm def={def} section={sec} onSettings={(k, v) => patchSection(sec.id, { settings: { [k]: v } })} onStyles={(k, v) => patchSection(sec.id, { styles: { [k]: v } })} />}
                  {sec.type === 'testimonials' && <div className="mt-3"><TestimonialsEditor /></div>}
                </SectionRow>)
            })}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="secondary" size="sm" onClick={() => setAdding(true)} className="whitespace-nowrap"><Plus className="size-4" /> Add section</Button>
        <Button variant="secondary" size="sm" onClick={() => setRegen(true)} className="whitespace-nowrap"><Wand2 className="size-4" /> Rebuild from my business details</Button>
      </div>
    </>
  )

  const editor = (
    <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-x-hidden">
      <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-white/70 px-3 py-2.5">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={cn('h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-bold', tab === k ? 'btn-brand' : 'text-muted hover:bg-white/70')}>{l}</button>)}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-4">
        {tab === 'sections' && sectionsTab}

        {tab === 'style' && <>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Style preset</p>
          <DesignPanel current={w.template.key} industry={business.industry} previewing={previewTpl} onPreview={(k) => { setPreviewTpl(k === w.template.key ? null : k); setPane('preview') }} onApply={(k) => apply.mutate(k)} applying={apply.isPending} />
          <p className="pt-3 text-xs font-bold uppercase tracking-wide text-muted">Your brand</p>
          <div className="flex items-center gap-3.5 rounded-xl border border-line bg-white/75 p-3">
            <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-line ring-1 ring-line">
              {business?.logo_url ? <img src={business.logo_url} alt="" className="size-full object-cover" /> : <span className="text-xl font-black text-muted">{business?.name?.[0]}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">Store Logo</p>
              <p className="text-xs text-muted">Displayed on the storefront header, avatar and cards.</p>
              <div className="mt-2 flex items-center gap-2">
                <label className="btn-brand inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold">
                  <span>{uploadingLogo ? 'Uploading…' : business?.logo_url ? 'Change logo' : 'Upload logo'}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleLogoUpload} disabled={uploadingLogo} />
                </label>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ColorField label="Accent colour" value={to.accent} fallback={base.accent} onChange={(v) => setTheme('accent', v)} />
            <ColorField label="Background" value={to.bg} fallback={base.bg} onChange={(v) => setTheme('bg', v)} />
            <ColorField label="Text colour" value={to.ink} fallback={base.ink} onChange={(v) => setTheme('ink', v)} />
            <ColorField label="Cards & panels" value={to.surface} fallback={base.surface} onChange={(v) => setTheme('surface', v)} />
          </div>
          <Field label="Heading font"><Select value={to.font_display ?? ''} onChange={(e) => setTheme('font_display', e.target.value)}><option value="">Preset default</option>{w.style_options.fonts.map((f) => <option key={f} value={f}>{f} — {FONT_HINT[f]}</option>)}</Select></Field>
          <Field label="Body font"><Select value={to.font_body ?? ''} onChange={(e) => setTheme('font_body', e.target.value)}><option value="">Preset default</option>{w.style_options.fonts.map((f) => <option key={f} value={f}>{f} — {FONT_HINT[f]}</option>)}</Select></Field>
          <Field label="Corner style"><Select value={to.radius ?? ''} onChange={(e) => setTheme('radius', e.target.value)}><option value="">Preset default</option>{w.style_options.radii.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}</Select></Field>
          <Button variant="secondary" size="sm" loading={resetStyle.isPending} onClick={() => resetStyle.mutate()}><RotateCcw className="size-4" /> Reset to preset</Button>
        </>}

        {tab === 'pages' && <PagesPanel site={w} pageId={curPage ?? ''} onPick={(id) => { setPageId(id); setSelected(null); setTab('sections') }} onChanged={() => void loadPreview(previewTpl)} />}
        {tab === 'photos' && <PhotosTab />}

        {tab === 'settings' && <>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">WhatsApp</p>
          <WhatsAppSettings onSaved={() => void loadPreview(previewTpl)} />
          <Toggle label="Floating WhatsApp button" hint="A round button that follows visitors down the page." checked={s.whatsapp_float !== false} onChange={(v) => setSetting('whatsapp_float', v)} />
          <p className="pt-2 text-xs font-bold uppercase tracking-wide text-muted">Store & ordering</p>
          <Toggle label="Shopping bag" hint="Visitors add items and send the order to your WhatsApp." checked={s.cart_enabled !== undefined ? s.cart_enabled === true : ['boutique', 'nova', 'catalog'].includes(w.template.layout) || ['retail', 'restaurant'].includes(business.industry)} onChange={(v) => setSetting('cart_enabled', v)} />
          <Toggle label="Show prices" checked={s.show_prices !== false} onChange={(v) => setSetting('show_prices', v)} />
          <TextAreaField label="Order message intro" rows={2} maxLength={300} value={(s.order_intro as string) ?? ''} placeholder={`Hi ${business.name}, I'd like to place an order:`} onChange={(e) => setSetting('order_intro', e.target.value)} hint="First line of the WhatsApp message. The items and total are added below it." />
          <TextField label="Order button text" maxLength={40} value={(s.order_button_label as string) ?? ''} placeholder="Order on WhatsApp" onChange={(e) => setSetting('order_button_label', e.target.value)} />
          <p className="pt-2 text-xs font-bold uppercase tracking-wide text-muted">Search & sharing</p>
          <SeoTab site={w} onSaved={() => void qc.invalidateQueries({ queryKey: ['website'] })} />
          <p className="text-xs text-muted">Opening hours, booking rules and your business link are in <a className="font-bold underline" href="/dashboard/business">My business</a>.</p>
        </>}
      </div>
    </div>
  )

  const scale = Math.min(1, (boxW - 8) / DEVICE_W[device])
  const mobileScale = Math.min(1, Math.max(0.35, (boxW - 24) / 420), Math.max(0.35, (boxH - 24) / 874))
  const preview = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-white/70 px-3 py-2.5">
        <div className="flex rounded-full bg-white/80 p-1 ring-1 ring-line">{([['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]] as const).map(([m, Icon]) => <button key={m} aria-label={`${m} preview`} aria-pressed={device === m} onClick={() => setDevice(m)} className={cn('grid size-8 place-items-center rounded-full', device === m ? 'btn-brand' : 'text-muted')}><Icon className="size-4" /></button>)}</div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted">
          {previewTpl && <Badge tone="warn">Previewing another preset</Badge>}
          <span aria-live="polite">{state === 'saving' ? 'Saving…' : state === 'error' ? 'Not saved' : w.has_unpublished_changes ? 'Saved · unpublished' : 'All changes published'}</span>
        </div>
      </div>
      <div ref={box} className="min-h-0 flex-1 overflow-auto bg-white/30 p-3">
        {html === null ? <PageLoading /> : device === 'mobile' ? (
          <div className="flex h-full min-h-0 w-full items-center justify-center overflow-auto py-2">
            <PhoneFrame width={390} scale={mobileScale} label="Storefront mobile preview">
              <iframe
                ref={frame}
                title="Storefront preview"
                sandbox="allow-scripts"
                srcDoc={html}
                className="h-full w-full border-0 bg-white"
                style={{ width: 390, height: 844 }}
              />
            </PhoneFrame>
          </div>
        ) : (
          <div className="mx-auto overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5" style={{ width: DEVICE_W[device] * scale, height: '100%' }}>
            <iframe ref={frame} title="Storefront preview" sandbox="allow-scripts" srcDoc={html} className="origin-top-left border-0 bg-white"
              style={{ width: DEVICE_W[device], height: `${100 / scale}%`, transform: `scale(${scale})` }} />
          </div>)}
      </div>
    </div>
  )

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[520px] w-full min-w-0 max-w-full flex-col overflow-x-hidden md:h-dvh">
      <div className="glass flex flex-wrap items-center justify-between gap-2 rounded-none border-x-0 border-t-0 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-base font-bold md:text-xl">Storefront builder</h1>
          <StatusBadge status={w.status} />
          <span className="hidden text-xs text-muted sm:inline">{w.template.name} preset</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-white/80 p-1 ring-1 ring-line md:hidden">
            {(['edit', 'preview'] as const).map((p) => (
              <button key={p} onClick={() => setPane(p)} aria-pressed={pane === p} className={cn('rounded-full px-3 py-1 text-xs font-bold capitalize', pane === p ? 'btn-brand' : 'text-muted')}>
                {p}
              </button>
            ))}
          </div>
          <a href={summary?.urls.profile} target="_blank" rel="noreferrer" className="hidden h-10 items-center gap-1.5 rounded-full border border-line-strong bg-white/80 px-4 text-sm font-bold sm:inline-flex">
            <ExternalLink className="size-4" /> View store
          </a>
          <Button variant="lime" loading={publish.isPending} onClick={() => publish.mutate()}>
            <Check className="size-4" /> Publish
          </Button>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 w-full min-w-0 max-w-full overflow-x-hidden md:grid-cols-[400px_minmax(0,1fr)]">
        <div className={cn('glass min-h-0 w-full min-w-0 max-w-full overflow-x-hidden rounded-none border-y-0 border-l-0', pane === 'preview' && 'hidden md:block')}>{editor}</div>
        <div className={cn('min-h-0 w-full min-w-0 max-w-full overflow-x-hidden', pane === 'edit' && 'hidden md:block')}>{preview}</div>
      </div>
      <AddSectionModal open={adding} onClose={() => setAdding(false)} registry={registry.data} onPick={(p) => add.mutate(p)} />
      <ConfirmDialog open={!!delId} title="Delete this section?" body="It will be removed from your storefront. You can add it again any time." confirmLabel="Delete" danger loading={del.isPending} onConfirm={() => delId && del.mutate(delId)} onClose={() => setDelId(null)} />
      <ConfirmDialog open={regen} title="Rebuild your storefront?" body="This replaces all your sections with a fresh layout made from your business details, products and photos. Your products, photos and settings are not touched." confirmLabel="Rebuild" loading={regenerate.isPending} onConfirm={() => regenerate.mutate()} onClose={() => setRegen(false)} />
    </div>
  )
}


function DesignPanel({ current, industry, previewing, onPreview, onApply, applying }: { current: string; industry: string; previewing: string | null; onPreview: (k: string) => void; onApply: (k: string) => void; applying: boolean }) {
  const q = useQuery({ queryKey: ['templates'], queryFn: () => api.get<Template[]>('/templates') })
  const list = useMemo(() => (q.data ?? []).filter((t) => t.industry === industry), [q.data, industry])
  const others = useMemo(() => (q.data ?? []).filter((t) => t.industry !== industry), [q.data, industry])
  const card = (t: Template) => (
    <div key={t.key} className={cn('rounded-2xl bg-white/80 p-3 ring-1', (previewing ?? current) === t.key ? 'ring-2 ring-brand' : 'ring-line')}>
      <div className="mb-2 flex gap-1.5">{[t.theme.bg, t.theme.accent, t.theme.ink].map((c, i) => <span key={i} className="size-5 rounded-full ring-1 ring-black/10" style={{ background: c }} />)}</div>
      <p className="font-extrabold">{t.name}{t.key === current && <span className="ml-2 text-xs font-semibold text-muted">current</span>}</p><p className="text-xs text-muted">{t.description}</p>
      <div className="mt-2 flex gap-2"><Button size="sm" variant="secondary" onClick={() => onPreview(t.key)}>Preview on my site</Button>{t.key !== current && <Button size="sm" loading={applying} onClick={() => onApply(t.key)}>Use</Button>}</div>
    </div>
  )
  return <div className="space-y-3"><p className="text-xs text-muted">“Preview on my site” shows your real business in that preset — nothing changes until you press Use. Presets change colours, fonts and the header look; your sections stay as they are.</p>{list.map(card)}{!!others.length && <details className="pt-2"><summary className="cursor-pointer text-sm font-bold text-muted">Presets from other industries</summary><div className="mt-3 space-y-3">{others.map(card)}</div></details>}</div>
}


function WhatsAppSettings({ onSaved }: { onSaved: () => void }) {
  const { business, refresh } = useBusiness()
  const toast = useToast()
  const [f, setF] = useState({ whatsapp: business?.whatsapp ?? '', greeting: business?.whatsapp_greeting ?? '', msg: business?.whatsapp_default_message ?? '' })
  const save = useMutation({ mutationFn: () => api.patch('/businesses/me', { whatsapp: f.whatsapp, whatsapp_greeting: f.greeting, whatsapp_default_message: f.msg }), onSuccess: async () => { await refresh(); onSaved(); toast.ok('WhatsApp settings saved') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  return (
    <div className="space-y-3 rounded-2xl bg-white/70 p-3.5 ring-1 ring-line">
      <TextField label="WhatsApp number" type="tel" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} hint="Orders and chats are sent here." />
      <TextField label="Greeting" value={f.greeting} onChange={(e) => setF({ ...f, greeting: e.target.value })} hint="{business} is filled in." />
      <TextField label="Message when someone taps a service" value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} hint="{business} and {service} are filled in." />
      <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>Save WhatsApp settings</Button>
    </div>
  )
}
