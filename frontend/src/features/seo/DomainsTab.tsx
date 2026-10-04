import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Globe, RefreshCw, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, TextField, UpgradePrompt } from '@/components/ui'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/cn'

interface Rec { type: string; host: string; value: string; purpose: string }
interface Dom { id: string; domain: string; type: string; status: string; verification_status: string; ssl_status: string; is_primary: boolean; dns_ok: boolean; last_checked_at: string | null; last_error: string | null; verification_token?: string; setup?: { records: Rec[]; note: string } }
interface Res { domains: Dom[]; urls: { profile: string; short: string }; primary_domain: string | null; custom_domains: { available: boolean; used: number; limit: number | null; cname_target: string } }

function Step({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return <li className="flex items-start gap-2 text-sm"><span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', ok ? 'bg-green-100 text-green-700' : 'bg-line text-muted')}>{ok ? <Check className="size-3.5" /> : <span className="size-1.5 rounded-full bg-muted" />}</span><span><b>{label}</b>{hint && <span className="block text-xs text-muted">{hint}</span>}</span></li>
}

function Copyable({ v }: { v: string }) {
  const toast = useToast()
  return <button onClick={() => { void navigator.clipboard.writeText(v); toast.ok('Copied') }} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-paper px-2 py-1 font-mono text-xs ring-1 ring-line hover:ring-brand" title="Copy"><span className="truncate">{v}</span><Copy className="size-3 shrink-0" /></button>
}

export function DomainsTab() {
  const qc = useQueryClient()
  const toast = useToast()
  const [domain, setDomain] = useState('')
  const [del, setDel] = useState<Dom | null>(null)
  const q = useQuery({ queryKey: ['domains'], queryFn: () => api.get<Res>('/domains') })
  const err = (e: unknown) => toast.err(e instanceof Error ? e.message : 'Something went wrong')
  const inv = () => { void qc.invalidateQueries({ queryKey: ['domains'] }); void qc.invalidateQueries({ queryKey: ['business-summary'] }) }
  const add = useMutation({ mutationFn: () => api.post('/domains', { domain }), onSuccess: () => { setDomain(''); inv(); toast.ok('Domain added — now add the DNS records below') }, onError: err })
  const verify = useMutation({ mutationFn: (id: string) => api.post<Dom>(`/domains/${id}/verify`), onSuccess: (d) => { inv(); d.status === 'ACTIVE' && d.ssl_status === 'ACTIVE' ? toast.ok('Your domain is live') : toast.ok('Checked — see the status below') }, onError: err })
  const primary = useMutation({ mutationFn: (p: { id: string; primary: boolean }) => api.post(`/domains/${p.id}/primary`, { primary: p.primary }), onSuccess: () => { inv(); toast.ok('Main address updated') }, onError: err })
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/domains/${id}`), onSuccess: () => { setDel(null); inv() }, onError: err })
  if (!q.data) return null
  const c = q.data.custom_domains
  const custom = q.data.domains.filter((d) => d.type === 'CUSTOM')
  return (
    <div className="space-y-6">
      <Card><CardHeader title="Your addresses" sub="Every storefront has a free Aqivo address." />
        <ul className="divide-y divide-line text-sm">{q.data.domains.filter((d) => d.type !== 'CUSTOM').map((d) => <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3"><span className="font-semibold">{d.domain.replace(/localhost/g, 'aqivo.shop')}</span><Badge tone={q.data!.primary_domain ? 'neutral' : 'ok'}>{q.data!.primary_domain ? 'Redirects to your main address' : 'Main address'}</Badge></li>)}</ul></Card>
      {!c.available ? <UpgradePrompt feature="custom_domain" title="Use your own domain" body="Connect www.yourshop.co.ke so customers see your brand, not ours. Custom domains are part of the Grow plan and above." /> : (
        <Card><CardHeader title="Connect a custom domain" sub={`${c.used} of ${c.limit ?? '∞'} used`} />
          <form className="flex flex-wrap items-end gap-3 p-5" onSubmit={(e) => { e.preventDefault(); add.mutate() }}><div className="min-w-64 flex-1"><TextField label="Domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="www.yourshop.co.ke" hint="We recommend the www version." /></div><Button type="submit" loading={add.isPending} disabled={domain.trim().length < 4 || (c.limit !== null && c.used >= c.limit)}>Add domain</Button></form></Card>)}
      {custom.map((d) => {
        const verified = d.verification_status === 'VERIFIED'
        return (
          <Card key={d.id}>
            <CardHeader title={<span className="flex flex-wrap items-center gap-2"><Globe className="size-4" />{d.domain}{d.is_primary && <Badge tone="ok">Main address</Badge>}</span>}
              action={<div className="flex gap-2"><Button size="sm" variant="secondary" loading={verify.isPending && verify.variables === d.id} onClick={() => verify.mutate(d.id)}><RefreshCw className="size-4" /> Check now</Button>
                <button aria-label={`Remove ${d.domain}`} onClick={() => setDel(d)} className="grid size-9 place-items-center rounded-full text-bad hover:bg-red-50"><Trash2 className="size-4" /></button></div>} />
            <div className="grid gap-5 p-5 md:grid-cols-[1fr_1fr]">
              <ol className="space-y-3"><Step ok={verified} label="Ownership confirmed" hint="The TXT record is found." /><Step ok={d.dns_ok} label="Pointing at your storefront" hint="The CNAME / A record is found." /><Step ok={d.ssl_status === 'ACTIVE'} label="HTTPS is working" hint="We opened a secure connection to your domain." />
                {d.last_error && <li className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{d.last_error}</li>}
                {d.last_checked_at && <li className="text-xs text-muted">Last checked {relativeTime(d.last_checked_at)}</li>}</ol>
              <div className="space-y-2"><p className="text-sm font-bold">DNS records to add at your domain provider</p>
                {d.setup?.records.map((r, i) => <div key={i} className="space-y-1 rounded-xl bg-white/70 p-3 text-xs ring-1 ring-line"><p className="font-bold">{r.type} <span className="font-medium text-muted">— {r.purpose}</span></p><p>Host: <Copyable v={r.host} /></p><p>Value: <Copyable v={r.value} /></p></div>)}
                {d.setup?.note && <p className="text-xs text-muted">{d.setup.note}</p>}
                <p className="text-xs text-muted">DNS changes can take a few minutes to a few hours. HTTPS certificates are issued by our hosting layer once the domain points here.</p></div>
            </div>
            {verified && <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3"><Button size="sm" variant={d.is_primary ? 'secondary' : 'primary'} loading={primary.isPending} onClick={() => primary.mutate({ id: d.id, primary: !d.is_primary })}>{d.is_primary ? 'Stop using as main address' : 'Make this my main address'}</Button><span className="text-xs text-muted">The main address is used in links, QR codes and search results. Your other addresses redirect to it.</span></div>}
          </Card>)
      })}
      {c.available && !custom.length && <Card><EmptyState icon={<Globe className="size-5" />} title="No custom domain yet" body="Add one above. You'll get two DNS records to paste at your domain provider (e.g. Safaricom, Truehost, GoDaddy)." /></Card>}
      <ConfirmDialog open={!!del} title="Remove this domain?" body={<>“{del?.domain}” will stop showing your storefront. Your Aqivo address keeps working.</>} confirmLabel="Remove" danger loading={remove.isPending} onConfirm={() => del && remove.mutate(del.id)} onClose={() => setDel(null)} />
    </div>
  )
}
