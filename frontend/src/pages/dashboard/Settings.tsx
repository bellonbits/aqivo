import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Check, CheckCircle2, Download, Mail, Phone, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/AuthContext'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { PhoneVerificationModal } from '@/features/auth/PhoneVerificationModal'
import { Badge, Button, Card, CardHeader, ComingSoon, LinkButton, ConfirmDialog, CopyField, Field, Input, Modal, PageHeader, PageLoading, Select, StatusBadge, TextField } from '@/components/ui'
import { cn } from '@/lib/cn'
import { fmtDate, money } from '@/lib/format'
import type { Plan } from '@/types'

interface SubMe { effective_plan: { key: string; name: string }; subscription: { status: string; plan_key: string; plan_name: string; price: string; currency: string; current_period_end: string | null; trial_ends_at: string | null; cancel_at_period_end: boolean; data_retained_until: string | null } | null; transactions: { id: string; amount: string; currency: string; status: string; created_at: string }[]; providers: { name: string; configured: boolean }[] }

export default function Settings() {
  const { hash } = useLocation()
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }) }, [hash])
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <ProfileCard /><PlanCard /><UsageCard /><ShareCard /><TeamCard /><DomainsCard /><AccountCard /><SupportCard />
    </div>
  )
}

function ProfileCard() {
  const { me, updateProfile, resendEmailVerification, reload } = useAuth()
  const toast = useToast()
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [saving, setSaving] = useState(false)

  const u = me?.user
  const [fullName, setFullName] = useState(u?.full_name || '')
  const [phone, setPhone] = useState(u?.phone || '')
  const [locale, setLocale] = useState(u?.locale || 'en')

  // Auto-reload auth status on mount
  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (u) {
      setFullName(u.full_name || '')
      setPhone(u.phone || '')
      setLocale(u.locale || 'en')
    }
  }, [u?.full_name, u?.phone, u?.locale])

  if (!me || !u) return null

  const handleResendEmail = async () => {
    setResendingEmail(true)
    try {
      await resendEmailVerification()
      toast.ok('Verification email sent! Check your inbox.')
    } catch (err) {
      toast.err(err instanceof Error ? err.message : 'Failed to send verification email.')
    } finally {
      setResendingEmail(false)
    }
  }

  const handleCheckEmail = async () => {
    setCheckingEmail(true)
    try {
      await reload()
      toast.ok('Checked email verification status.')
    } catch {
      // ignore
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      toast.err('Full name is required.')
      return
    }
    setSaving(true)
    try {
      const prevPhone = u.phone
      const updated = await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        locale,
      })
      toast.ok('Profile updated successfully!')
      // If phone changed or not verified, prompt user to verify via OpenSMS
      if (updated.phone && (!updated.phone_verified || updated.phone !== prevPhone)) {
        setVerifyOpen(true)
      }
    } catch (err) {
      toast.err(err instanceof Error ? err.message : 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <div id="account" className="scroll-mt-24" />
      <CardHeader
        title="Personal profile & verification"
        sub="Manage your personal details, contact preferences, and OpenSMS security verifications."
      />

      {/* Editable profile fields */}
      <form onSubmit={handleSaveProfile} className="border-b border-line p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Full name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            hint="Your personal name displayed across your account."
          />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-ink">Email address</label>
              {u.email_verified ? (
                <Badge tone="ok" className="text-[10px]">Verified</Badge>
              ) : (
                <Badge tone="warn" className="text-[10px]">Unverified</Badge>
              )}
            </div>
            <Input
              type="email"
              disabled
              value={u.email}
              className="bg-paper/60 text-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted">Primary account email. To change, contact support.</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-ink">Mobile phone number</label>
              {u.phone_verified ? (
                <Badge tone="ok" className="text-[10px]">Verified via SMS</Badge>
              ) : (
                <Badge tone="warn" className="text-[10px]">Unverified</Badge>
              )}
            </div>
            <Input
              type="tel"
              placeholder="0712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted">
              Used for instant SMS order alerts & OpenSMS OTP verification.
            </p>
          </div>

          <Field label="Preferred language" hint="Language used for notifications and interface.">
            <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
              <option value="en">English (en)</option>
              <option value="sw">Kiswahili (sw)</option>
            </Select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="font-semibold text-ink">Role:</span>
            <Badge tone="neutral">{u.platform_role ? u.platform_role.toLowerCase() : 'Merchant'}</Badge>
            <span className="text-muted/60">·</span>
            <span>ID: <code className="rounded bg-paper px-1 py-0.5 font-mono text-[11px]">{u.id.slice(0, 8)}…</code></span>
          </div>
          <Button type="submit" loading={saving}>
            Save profile changes
          </Button>
        </div>
      </form>

      {/* Verification status cards */}
      <div className="grid gap-5 p-5 sm:grid-cols-2">
        {/* Email verification card */}
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper/50 p-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                <Mail className="size-3.5" /> Email address
              </span>
              {u.email_verified ? (
                <Badge tone="ok" className="inline-flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Verified
                </Badge>
              ) : (
                <Badge tone="warn" className="inline-flex items-center gap-1">
                  <AlertCircle className="size-3" /> Unverified
                </Badge>
              )}
            </div>
            <p className="text-base font-bold text-ink truncate">{u.email}</p>
            <p className="text-xs text-muted">
              {u.email_verified
                ? 'Your email is verified for billing receipts and account recovery.'
                : 'Confirm your email by clicking the link sent to your inbox.'}
            </p>
          </div>
          {!u.email_verified && (
            <div className="mt-4 pt-3 border-t border-line/60 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                loading={resendingEmail}
                onClick={handleResendEmail}
              >
                Resend verification email
              </Button>
              <Button
                size="sm"
                variant="ghost"
                loading={checkingEmail}
                onClick={handleCheckEmail}
              >
                Check status
              </Button>
            </div>
          )}
        </div>

        {/* Phone verification card */}
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper/50 p-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                <Phone className="size-3.5" /> Mobile phone (OpenSMS)
              </span>
              {u.phone_verified ? (
                <Badge tone="ok" className="inline-flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Verified
                </Badge>
              ) : (
                <Badge tone="warn" className="inline-flex items-center gap-1">
                  <AlertCircle className="size-3" /> Unverified
                </Badge>
              )}
            </div>
            <p className="text-base font-bold text-ink">
              {u.phone || <span className="text-muted font-normal italic">No phone number set</span>}
            </p>
            <p className="text-xs text-muted">
              {u.phone_verified
                ? 'Verified for instant order SMS alerts and customer inquiry notifications.'
                : 'Verify via 6-digit SMS code to receive instant order alerts on your phone.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-line/60">
            <Button
              size="sm"
              className={u.phone_verified ? '' : 'bg-[#5B21F5] hover:bg-[#4a18d1] text-white'}
              variant={u.phone_verified ? 'secondary' : 'primary'}
              onClick={() => setVerifyOpen(true)}
            >
              <ShieldCheck className="size-3.5" />
              {u.phone_verified ? 'Update phone number' : 'Verify via SMS'}
            </Button>
          </div>
        </div>
      </div>

      <PhoneVerificationModal
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        initialPhone={phone || u.phone}
      />
    </Card>
  )
}

function PlanCard() {
  const { business, refresh, summary } = useBusiness()
  const qc = useQueryClient()
  const toast = useToast()
  const cur = business?.currency ?? 'KES'
  const plans = useQuery({ queryKey: ['plans', cur], queryFn: () => api.get<Plan[]>('/subscriptions/plans', { currency: cur }) })
  const me = useQuery({ queryKey: ['sub-me'], queryFn: () => api.get<SubMe>('/subscriptions/me') })
  const [pick, setPick] = useState<Plan | null>(null)
  const [phone, setPhone] = useState(business?.phone || '')
  const [pendingTxId, setPendingTxId] = useState<string | null>(null)
  const [cancel, setCancel] = useState(false)
  const owner = !!summary?.permissions_all
  const inv = () => { void qc.invalidateQueries({ queryKey: ['sub-me'] }); void refresh() }
  const checkout = useMutation({
    mutationFn: () => api.post<{ status: string; message: string; transaction_id?: string }>('/subscriptions/checkout', { plan_key: pick!.key, phone: phone || null }),
    onSuccess: (r) => {
      setPick(null)
      inv()
      toast.ok(r.message)
      if (r.transaction_id) setPendingTxId(r.transaction_id)
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed')
  })
  const stop = useMutation({ mutationFn: () => api.post<{ message: string }>('/subscriptions/cancel'), onSuccess: (r) => { setCancel(false); inv(); toast.ok(r.message) } })
  const resume = useMutation({ mutationFn: () => api.post('/subscriptions/resume'), onSuccess: inv })

  useEffect(() => {
    if (!pendingTxId) return
    let attempts = 0
    const timer = setInterval(async () => {
      attempts++
      try {
        const res = await api.get<{ status: string; message?: string }>(`/subscriptions/transactions/${pendingTxId}/status`)
        if (res.status === 'PAID') {
          clearInterval(timer)
          setPendingTxId(null)
          inv()
          toast.ok('Payment received! Your subscription is now active.')
        } else if (res.status === 'FAILED' || attempts >= 20) {
          clearInterval(timer)
          setPendingTxId(null)
          inv()
          if (res.status === 'FAILED') {
            toast.err(res.message ? `M-Pesa: ${res.message}` : 'M-Pesa payment was not completed.')
          }
        }
      } catch {
        if (attempts >= 20) {
          clearInterval(timer)
          setPendingTxId(null)
        }
      }
    }, 3000)
    return () => clearInterval(timer)
  }, [pendingTxId])
  if (!plans.data || !me.data) return <PageLoading />
  const sub = me.data.subscription
  const mpesa = me.data.providers.find((p) => p.name === 'MPESA')
  return (
    <Card><div id="plan" className="scroll-mt-24" />
      <CardHeader title="Plan & billing" sub={sub ? <span className="flex flex-wrap items-center gap-2"><b>{sub.plan_name}</b> <StatusBadge status={sub.status} />{sub.status === 'TRIAL' && <>ends {fmtDate(sub.trial_ends_at)}</>}{sub.status === 'ACTIVE' && <>{sub.cancel_at_period_end ? 'ends' : 'renews'} {fmtDate(sub.current_period_end)}</>}</span> : 'No subscription'} />
      <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">{plans.data.map((p) => {
        const current = sub?.plan_key === p.key && ['TRIAL', 'ACTIVE', 'PAST_DUE'].includes(sub.status)
        return <div key={p.key} className={cn('flex flex-col rounded-2xl border p-4', current ? 'border-ink ring-1 ring-ink' : 'border-line')}>
          <div className="flex items-center justify-between"><h3 className="text-lg">{p.name}</h3>{current && <Badge tone="lime">Current</Badge>}</div>
          <p className="mt-2 text-2xl font-extrabold">{Number(p.price) > 0 ? money(p.price, p.currency) : 'Free'}<span className="text-xs font-semibold text-muted">{Number(p.price) > 0 ? ' /month' : ''}</span></p>
          <ul className="mt-3 flex-1 space-y-1.5 text-sm">{p.highlights.map((h) => <li key={h} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" />{h}</li>)}</ul>
          {owner && p.key !== 'FREE' && !current && <Button className="mt-4" size="sm" onClick={() => setPick(p)}>{sub?.plan_key === p.key ? 'Renew' : 'Choose'} {p.name}</Button>}</div>
      })}</div>
      <div className="space-y-3 border-t border-line p-5">
        {pendingTxId && (
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-sm font-bold text-ink shadow-sm">
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-ok" />
            </span>
            <span>M-Pesa prompt sent to your phone. Enter your PIN to activate your subscription...</span>
          </div>
        )}
        {!mpesa?.configured && <ComingSoon title="Online payment isn't switched on yet" body="Choosing a plan sends an upgrade request to the Aqivo team, who'll help you pay (e.g. M-Pesa) and activate it." />}
        {sub?.status === 'ACTIVE' && owner && (sub.cancel_at_period_end ? <Button variant="secondary" onClick={() => resume.mutate()}>Keep my plan</Button> : <Button variant="danger" size="sm" onClick={() => setCancel(true)}>Cancel plan</Button>)}
        {sub && ['EXPIRED', 'CANCELLED'].includes(sub.status) && <p className="text-sm text-muted">Your data is kept until {fmtDate(sub.data_retained_until)}. Your free profile stays live.</p>}
        {!!me.data.transactions.length && <div><p className="mb-1 text-sm font-bold">Billing history</p><ul className="divide-y divide-line text-sm">{me.data.transactions.map((t) => <li key={t.id} className="flex justify-between py-1.5"><span>{fmtDate(t.created_at)}</span><span>{money(t.amount, t.currency)} <StatusBadge status={t.status} /></span></li>)}</ul></div>}
      </div>
      <Modal open={!!pick} onClose={() => setPick(null)} title={`Upgrade to ${pick?.name}`} footer={<><Button variant="secondary" onClick={() => setPick(null)}>Cancel</Button><Button loading={checkout.isPending} onClick={() => checkout.mutate()}>{mpesa?.configured ? 'Pay with M-Pesa' : 'Send upgrade request'}</Button></>}>
        <p className="text-sm text-muted">{pick && money(pick.price, pick.currency)} per month. Cancel any time — your data is always kept.</p>{mpesa?.configured && <div className="mt-4"><TextField label="M-Pesa phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} hint="You'll get a prompt on your phone to enter your PIN." /></div>}</Modal>
      <ConfirmDialog open={cancel} title="Cancel your plan?" body="Your plan stays active until the end of the period you've paid for. Nothing is deleted, and your free profile stays live." confirmLabel="Cancel plan" danger loading={stop.isPending} onConfirm={() => stop.mutate()} onClose={() => setCancel(false)} />
    </Card>
  )
}

function ShareCard() {
  const { summary, business } = useBusiness()
  const toast = useToast()
  const [qr, setQr] = useState<string | null>(null)
  useEffect(() => { void api.blob('/businesses/me/qr?fmt=png').then((b) => setQr(URL.createObjectURL(b))).catch(() => undefined) }, [])
  const dl = async (fmt: 'png' | 'svg') => { const b = await api.blob(`/businesses/me/qr?fmt=${fmt}`); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${business?.slug}-qr.${fmt}`; a.click() }
  if (!summary) return null
  const u = summary.urls
  const share = `https://wa.me/?text=${encodeURIComponent(`${business?.name}: ${u.profile}`)}`
  return (
    <Card><div id="share" className="scroll-mt-24" /><CardHeader title="Share & QR code" sub="Put it on business cards, posters, shop windows, receipts and packaging." />
      <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto]">
        <div className="space-y-4"><CopyField label="Business link" value={u.profile} onCopied={() => toast.ok('Copied')} />{u.whatsapp && <CopyField label="WhatsApp link" value={u.whatsapp} onCopied={() => toast.ok('Copied')} />}<CopyField label="Booking link" value={u.booking} onCopied={() => toast.ok('Copied')} /><CopyField label="Review link" value={u.review} onCopied={() => toast.ok('Copied')} />
          <a href={share} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-full bg-[#25D366] px-5 text-sm font-bold text-[#053b1a]">Share on WhatsApp</a></div>
        <div className="mx-auto w-48 rounded-2xl border border-line p-3 text-center">{qr ? <img src={qr} alt="QR code" className="w-full" /> : <PageLoading />}<p className="mt-1 text-sm font-bold">Scan to visit</p><p className="text-xs text-muted">{business?.name}</p><div className="mt-2 flex justify-center gap-2"><Button size="sm" variant="secondary" onClick={() => void dl('png')}><Download className="size-3.5" /> PNG</Button><Button size="sm" variant="secondary" onClick={() => void dl('svg')}><Download className="size-3.5" /> SVG</Button></div></div>
      </div>
      {business?.referral_code && <div className="border-t border-line p-5 text-sm"><b>Refer a business</b> — share code <code className="rounded bg-paper px-1.5 py-0.5 font-bold">{business.referral_code}</code>. Referral rewards (free months, credits) will be configured by Aqivo. <Badge>Coming soon</Badge></div>}
    </Card>
  )
}

function TeamCard() {
  const { has, summary } = useBusiness()
  const qc = useQueryClient()
  const toast = useToast()
  const owner = !!summary?.permissions_all
  const q = useQuery({ queryKey: ['members'], queryFn: () => api.get<{ id: string; email: string; full_name: string; role: string }[]>('/businesses/me/members'), enabled: owner })
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ email: '', full_name: '', role: 'STAFF' })
  const [temp, setTemp] = useState<string | null>(null)
  const add = useMutation({ mutationFn: () => api.post<{ temporary_password: string | null }>('/businesses/me/members', f), onSuccess: (r) => { void qc.invalidateQueries({ queryKey: ['members'] }); setTemp(r.temporary_password); setOpen(false) }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  const del = useMutation({ mutationFn: (id: string) => api.del(`/businesses/me/members/${id}`), onSuccess: () => void qc.invalidateQueries({ queryKey: ['members'] }) })
  if (!owner) return null
  return (
    <Card><CardHeader title="Team" sub="Give managers and staff their own login" action={has('staff') ? <Button size="sm" onClick={() => setOpen(true)}>Add member</Button> : <Badge>Business plan</Badge>} />
      <ul className="divide-y divide-line">{q.data?.map((m) => <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span><b>{m.full_name}</b> · {m.email}</span><span className="flex items-center gap-2"><Badge>{m.role.replace('BUSINESS_', '').toLowerCase()}</Badge>{m.role !== 'BUSINESS_OWNER' && <Button size="sm" variant="ghost" onClick={() => del.mutate(m.id)}>Remove</Button>}</span></li>)}</ul>
      {temp && <p className="border-t border-line p-4 text-sm">Temporary password (shown once): <code className="rounded bg-paper px-1.5 py-0.5 font-bold">{temp}</code></p>}
      <Modal open={open} onClose={() => setOpen(false)} title="Add team member" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={add.isPending} disabled={!f.email || !f.full_name} onClick={() => add.mutate()}>Add</Button></>}>
        <div className="space-y-4"><TextField label="Name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /><TextField label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /><Field label="Role"><Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="STAFF">Staff — assigned bookings, customers and orders (view)</option><option value="SALES">Sales — orders, customers, leads and bookings</option><option value="EDITOR">Editor — storefront, products and photos</option><option value="BUSINESS_MANAGER">Manager — everything except billing and team</option><option value="BUSINESS_ADMIN">Admin — manager plus team and payments</option></Select></Field></div></Modal>
    </Card>
  )
}

function DomainsCard() {
  return (
    <Card><CardHeader title="Domains" action={<LinkButton to="/dashboard/seo?tab=domains" variant="secondary" size="sm">Manage domains</LinkButton>} />
      <p className="p-5 text-sm text-muted">Connect your own domain, set your main address, and check your search readiness in <b>Domain &amp; SEO</b>.</p></Card>
  )
}

function UsageCard() {
  const q = useQuery({ queryKey: ['usage'], queryFn: () => api.get<{ plan: { name: string }; usage: Record<string, { used: number; limit: number | null; label: string }> }>('/subscriptions/usage') })
  if (!q.data) return null
  const rows = Object.entries(q.data.usage).filter(([, u]) => u.limit !== null || u.used > 0)
  return (
    <Card><CardHeader title="Plan usage" sub={`What your ${q.data.plan.name} plan includes`} />
      <ul className="grid gap-4 p-5 sm:grid-cols-2">{rows.map(([k, u]) => { const pct = u.limit ? Math.min(100, Math.round((u.used / u.limit) * 100)) : 0; return (
        <li key={k}><div className="flex justify-between text-sm"><span className="font-semibold capitalize">{u.label}</span><span className="text-muted">{u.used}{u.limit === null ? ' · unlimited' : ` / ${u.limit}`}</span></div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line"><div className={cn('h-full rounded-full', pct >= 90 ? 'bg-bad' : pct >= 70 ? 'bg-amber-500' : 'bg-brand')} style={{ width: `${u.limit === null ? 4 : Math.max(pct, u.used ? 3 : 0)}%` }} /></div></li>) })}</ul></Card>
  )
}

function AccountCard() {
  const toast = useToast()
  const [f, setF] = useState({ current: '', next: '' })
  const m = useMutation({ mutationFn: () => api.post('/auth/change-password', { current_password: f.current, new_password: f.next }), onSuccess: () => { setF({ current: '', next: '' }); toast.ok('Password changed') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  return (
    <Card><CardHeader title="Password" /><form className="grid gap-4 p-5 md:grid-cols-3 md:items-end" onSubmit={(e) => { e.preventDefault(); m.mutate() }}>
      <TextField label="Current password" type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /><TextField label="New password" type="password" autoComplete="new-password" minLength={8} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /><Button type="submit" loading={m.isPending} disabled={!f.current || f.next.length < 8}>Change password</Button></form></Card>
  )
}

function SupportCard() {
  const toast = useToast()
  const [s, setS] = useState('')
  const [b, setB] = useState('')
  const m = useMutation({ mutationFn: () => api.post('/support/tickets', undefined, { subject: s, body: b }), onSuccess: () => { setS(''); setB(''); toast.ok("Message sent — we'll get back to you") }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  return (
    <Card><CardHeader title="Contact support" /><div className="space-y-4 p-5"><Field label="Subject"><Input value={s} onChange={(e) => setS(e.target.value)} maxLength={200} /></Field><Field label="How can we help?"><textarea className="w-full rounded-xl border border-line-strong px-3.5 py-2.5" rows={3} value={b} onChange={(e) => setB(e.target.value)} /></Field><Button loading={m.isPending} disabled={!s.trim()} onClick={() => m.mutate()}>Send</Button></div></Card>
  )
}
