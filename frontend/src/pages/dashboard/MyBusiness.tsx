import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { Button, Card, CardHeader, Field, Input, PageHeader, PageLoading, SelectField, TextAreaField, TextField, ComingSoon } from '@/components/ui'
import type { Business } from '@/types'

const DAYS = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']] as const
type Hours = Business['opening_hours']

export function HoursEditor({ value, onChange }: { value: Hours; onChange: (h: Hours) => void }) {
  return (
    <div className="space-y-2">
      {DAYS.map(([k, label]) => {
        const day = value[k]
        return (
          <div key={k} className="grid grid-cols-[100px_1fr] items-center gap-3 sm:grid-cols-[130px_auto_1fr]">
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-4 accent-ink" checked={!!day} onChange={(e) => onChange({ ...value, [k]: e.target.checked ? { open: '09:00', close: '18:00' } : null })} />{label}</label>
            {day ? (
              <div className="flex items-center gap-2 sm:col-span-1">
                <Input aria-label={`${label} opens`} type="time" value={day.open} onChange={(e) => onChange({ ...value, [k]: { ...day, open: e.target.value } })} className="w-32" />
                <span className="text-muted">to</span>
                <Input aria-label={`${label} closes`} type="time" value={day.close} onChange={(e) => onChange({ ...value, [k]: { ...day, close: e.target.value } })} className="w-32" />
              </div>
            ) : <span className="text-sm text-muted">Closed</span>}
          </div>
        )
      })}
    </div>
  )
}

export default function MyBusiness() {
  const { business, refresh, summary } = useBusiness()
  const toast = useToast()
  const [f, setF] = useState<Business | null>(null)
  const [blocked, setBlocked] = useState('')
  const countries = useQuery({ queryKey: ['config'], queryFn: () => api.get<{ locales: string[] }>('/businesses/config'), staleTime: Infinity })
  useEffect(() => { if (business) setF(business) }, [business])
  const save = useMutation({
    mutationFn: (b: Business) => api.patch('/businesses/me', {
      name: b.name, category: b.category, description: b.description, tagline: b.tagline, phone: b.phone, whatsapp: b.whatsapp, email: b.email || undefined, city: b.city, address: b.address,
      opening_hours: b.opening_hours, blocked_dates: b.blocked_dates, slot_interval_minutes: b.slot_interval_minutes, booking_lead_hours: b.booking_lead_hours,
      social_links: b.social_links, whatsapp_greeting: b.whatsapp_greeting, whatsapp_default_message: b.whatsapp_default_message, locale: b.locale,
      ...(summary?.permissions_all && b.slug !== business?.slug ? { slug: b.slug } : {}),
    }),
    onSuccess: async () => { await refresh(); toast.ok('Saved') },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Could not save'),
  })
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      await api.upload('/businesses/me/logo', file)
      await refresh()
      toast.ok('Logo updated')
    } catch (err) {
      toast.err(err instanceof Error ? err.message : 'Logo upload failed')
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  if (!f) return <PageLoading />
  const set = <K extends keyof Business>(k: K, v: Business[K]) => setF((s) => (s ? { ...s, [k]: v } : s))
  const wa = (f.whatsapp_default_message || '').replace('{business}', f.name).replace('{service}', 'Knotless Braids')

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(f) }} className="space-y-6">
      <PageHeader title="My business" sub="The details customers see on your profile, website and WhatsApp." actions={<Button type="submit" loading={save.isPending}>Save changes</Button>} />
      <Card><CardHeader title="Business details" />
        <div className="flex items-center gap-4 border-b border-line px-5 py-4">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-line ring-1 ring-line">
            {business?.logo_url ? <img src={business.logo_url} alt="" className="size-full object-cover" /> : <span className="text-2xl font-black text-muted">{f.name?.[0]}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">Business Logo</p>
            <p className="text-xs text-muted">Upload your brand mark or logo image.</p>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-sm hover:bg-black/5">
              <span>{uploadingLogo ? 'Uploading…' : business?.logo_url ? 'Change logo' : 'Upload logo'}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleLogoUpload} disabled={uploadingLogo} />
            </label>
          </div>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <TextField label="Business name" required value={f.name} onChange={(e) => set('name', e.target.value)} />
          <TextField label="Category" value={f.category} onChange={(e) => set('category', e.target.value)} hint="e.g. Barbershop, Restaurant, Dental Clinic" />
          <div className="md:col-span-2"><TextField label="Tagline" value={f.tagline} maxLength={200} onChange={(e) => set('tagline', e.target.value)} hint="One line under your name." /></div>
          <div className="md:col-span-2"><TextAreaField label="Description" rows={4} maxLength={2000} value={f.description} onChange={(e) => set('description', e.target.value)} hint="Tell customers what you do and who you serve (40+ characters helps your online presence score)." /></div>
          <TextField label="Phone" type="tel" value={f.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
          <TextField label="WhatsApp" type="tel" value={f.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} />
          <TextField label="Email" type="email" value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} hint="Where we send bookings, leads and review alerts." />
          <TextField label="City / area" value={f.city} onChange={(e) => set('city', e.target.value)} />
          <div className="md:col-span-2"><TextField label="Street address" value={f.address} onChange={(e) => set('address', e.target.value)} /></div>
          {summary?.permissions_all && <TextField label="Business link" value={f.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} hint={`aqivo.shop/${f.slug} — changing this changes your public link.`} />}
          <SelectField label="Language" value={f.locale} onChange={(e) => set('locale', e.target.value)} hint="Dashboard language. More translations are coming.">
            {(countries.data?.locales ?? ['en']).map((l) => <option key={l} value={l}>{({ en: 'English', sw: 'Kiswahili', so: 'Somali', fr: 'Français', ar: 'العربية', am: 'አማርኛ' } as Record<string, string>)[l] ?? l}</option>)}
          </SelectField>
        </div>
      </Card>

      <Card><CardHeader title="Opening hours" sub="Used on your profile and to offer booking times." />
        <div className="p-5"><HoursEditor value={f.opening_hours} onChange={(h) => set('opening_hours', h)} /></div></Card>

      <Card><CardHeader title="Booking settings" />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <SelectField label="Time between slots" value={String(f.slot_interval_minutes)} onChange={(e) => set('slot_interval_minutes', Number(e.target.value))}>{[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}</SelectField>
          <SelectField label="Minimum notice" value={String(f.booking_lead_hours)} onChange={(e) => set('booking_lead_hours', Number(e.target.value))}>{[0, 1, 2, 4, 12, 24, 48].map((h) => <option key={h} value={h}>{h === 0 ? 'No notice needed' : `${h} hour${h > 1 ? 's' : ''}`}</option>)}</SelectField>
          <div className="md:col-span-2"><Field label="Blocked dates (closed)" hint="Days customers can't book, e.g. holidays.">
            <div className="flex flex-wrap gap-2">{f.blocked_dates.map((d) => <button type="button" key={d} onClick={() => set('blocked_dates', f.blocked_dates.filter((x) => x !== d))} className="rounded-full bg-black/5 px-3 py-1 text-sm font-semibold hover:bg-black/10">{d} ✕</button>)}
              <Input type="date" aria-label="Add blocked date" value={blocked} onChange={(e) => { if (e.target.value) { set('blocked_dates', [...new Set([...f.blocked_dates, e.target.value])].sort()); setBlocked('') } }} className="w-44" /></div></Field></div>
        </div>
      </Card>

      <Card><CardHeader title="WhatsApp" sub="What opens when a customer taps WhatsApp on your page." />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <TextField label="Greeting" value={f.whatsapp_greeting} onChange={(e) => set('whatsapp_greeting', e.target.value)} hint="Used for the general WhatsApp button. {business} is replaced with your name." />
          <TextField label="Default message for a service" value={f.whatsapp_default_message} onChange={(e) => set('whatsapp_default_message', e.target.value)} hint="{business} and {service} are filled in automatically." />
          <div className="md:col-span-2 rounded-xl bg-[#e7f7e4] p-4"><p className="text-xs font-bold uppercase tracking-wide text-green-900/60">Preview</p><p className="mt-1 text-sm text-green-950">{wa}</p></div>
        </div>
      </Card>

      <Card><CardHeader title="Social links" />
        <div className="grid gap-4 p-5 md:grid-cols-3">
          {(['instagram', 'facebook', 'tiktok'] as const).map((k) => <TextField key={k} label={k[0].toUpperCase() + k.slice(1)} type="url" placeholder="https://" value={f.social_links[k] ?? ''} onChange={(e) => set('social_links', { ...f.social_links, [k]: e.target.value })} />)}
        </div>
        <div className="border-t border-line p-5"><ComingSoon title="Google Business Profile & social integrations" body="Aqivo doesn't change your Google or social accounts yet. Keep your details identical there for the best results." /></div>
      </Card>
      <div className="sticky bottom-20 flex justify-end md:static"><Button type="submit" size="lg" loading={save.isPending}>Save changes</Button></div>
    </form>
  )
}
