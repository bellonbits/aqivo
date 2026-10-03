import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, Card, Field, Select, TextField } from '@/components/ui'

export interface ConnField { key: string; label: string; help?: string; required?: boolean; secret?: boolean; default?: string; options?: string[]; has_value?: boolean; hint?: string | null; value?: string }
export interface Connection {
  provider: string; label: string; kind: string; blurb: string; setup: string | null; webhook_url: string | null; verify_token?: string
  fields: ConnField[]; config_fields: ConnField[]; enabled: boolean; status: 'NOT_SET' | 'CONNECTED' | 'ERROR' | 'PENDING'; last_error: string | null; last_tested_at: string | null; configured: boolean
}

function CopyBox({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false)
  return (
    <div><p className="mb-1 text-xs font-bold text-muted">{label}</p>
      <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 ring-1 ring-line"><code className="min-w-0 flex-1 truncate text-xs">{value}</code>
        <button type="button" aria-label={`Copy ${label}`} className="grid size-7 place-items-center rounded-full hover:bg-black/5" onClick={() => { void navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500) }}>{done ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}</button></div></div>
  )
}

const STATUS = { NOT_SET: ['Not connected', 'neutral'], PENDING: ['Saved — not tested', 'warn'], CONNECTED: ['Connected', 'ok'], ERROR: ['Problem', 'bad'] } as const

export function ConnectionCard({ c, canWrite }: { c: Connection; canWrite: boolean }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [cfg, setCfg] = useState<Record<string, string>>(() => Object.fromEntries(c.config_fields.map((f) => [f.key, f.value ?? ''])))
  const [sec, setSec] = useState<Record<string, string>>({})
  const refresh = () => void qc.invalidateQueries({ queryKey: ['connections'] })
  const err = (e: unknown) => toast.err(e instanceof Error ? e.message : 'Something went wrong')
  const save = useMutation({ mutationFn: () => api.put(`/connections/${c.provider}`, { config: cfg, secrets: Object.fromEntries(Object.entries(sec).filter(([, v]) => v.trim())) }), onSuccess: () => { setSec({}); refresh(); toast.ok('Saved. Press “Test connection” to check it works.') }, onError: err })
  const test = useMutation({ mutationFn: () => api.post<Connection>(`/connections/${c.provider}/test`), onSuccess: (r) => { refresh(); r.status === 'CONNECTED' ? toast.ok('Connected') : toast.err(r.last_error || 'The test failed') }, onError: err })
  const remove = useMutation({ mutationFn: () => api.del(`/connections/${c.provider}`), onSuccess: () => { refresh(); toast.ok('Disconnected') }, onError: err })
  const [label, tone] = STATUS[c.status] ?? STATUS.NOT_SET
  return (
    <Card>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="text-base font-bold">{c.label}</h3><p className="mt-0.5 text-sm text-muted">{c.blurb}</p></div><Badge tone={tone as never}>{label}</Badge></div>
        {c.status === 'ERROR' && c.last_error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-bad">{c.last_error}</p>}
        {!c.configured && c.status === 'NOT_SET' && c.last_error && <p className="text-xs text-muted">{c.last_error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {c.config_fields.map((f) => f.options
            ? <Field key={f.key} label={f.label}><Select disabled={!canWrite} value={cfg[f.key] ?? ''} onChange={(e) => setCfg({ ...cfg, [f.key]: e.target.value })}>{f.options.map((o) => <option key={o} value={o}>{o}</option>)}</Select></Field>
            : <TextField key={f.key} label={f.label} disabled={!canWrite} value={cfg[f.key] ?? ''} onChange={(e) => setCfg({ ...cfg, [f.key]: e.target.value })} hint={f.help} />)}
          {c.fields.filter((f) => f.secret).map((f) => (
            <TextField key={f.key} label={f.label} type="password" autoComplete="off" disabled={!canWrite} value={sec[f.key] ?? ''} onChange={(e) => setSec({ ...sec, [f.key]: e.target.value })}
              placeholder={f.has_value ? `Saved ${f.hint ?? '••••'} — leave blank to keep` : ''} hint={f.help} />))}
        </div>
        {c.webhook_url && <CopyBox label="Webhook URL (paste into the provider)" value={c.webhook_url} />}
        {c.verify_token && <CopyBox label="Verify token (paste into Meta)" value={c.verify_token} />}
        {c.setup && <p className="text-xs text-muted">{c.setup}</p>}
        <p className="text-xs text-muted">Keys are stored encrypted and are never shown again. Aqivo can’t read them back to you.</p>
        {canWrite && <div className="flex flex-wrap gap-2">
          <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
          <Button size="sm" variant="secondary" loading={test.isPending} disabled={c.status === 'NOT_SET' && !c.configured} onClick={() => test.mutate()}>Test connection</Button>
          {c.status !== 'NOT_SET' && <Button size="sm" variant="danger" loading={remove.isPending} onClick={() => { if (confirm(`Disconnect ${c.label}? Your stored keys will be deleted.`)) remove.mutate() }}><Trash2 className="size-4" />Disconnect</Button>}
        </div>}
        {c.last_tested_at && <p className="text-xs text-muted">Last tested {new Date(c.last_tested_at).toLocaleString()}</p>}
      </div>
    </Card>
  )
}
