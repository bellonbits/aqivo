import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, PageLoading } from '@/components/ui'
import { cn } from '@/lib/cn'

interface Conv { phone: string; name: string | null; last: string; last_at: string; unread: number; window_open: boolean }
interface Msg { id: string; direction: 'IN' | 'OUT'; body: string; status: string; kind: string | null; error: string | null; created_at: string }

export default function WhatsAppInbox() {
  const qc = useQueryClient()
  const toast = useToast()
  const [sel, setSel] = useState<string | null>(null)
  const [text, setText] = useState('')
  const list = useQuery({ queryKey: ['wa-convs'], queryFn: () => api.get<{ connected: boolean; items: Conv[] }>('/whatsapp/conversations'), refetchInterval: 20000 })
  const thread = useQuery({ queryKey: ['wa-thread', sel], enabled: !!sel, queryFn: () => api.get<{ window_open: boolean; messages: Msg[] }>(`/whatsapp/conversations/${sel}`), refetchInterval: 15000 })
  const send = useMutation({
    mutationFn: () => api.post(`/whatsapp/conversations/${sel}/reply`, { body: text }),
    onSuccess: () => { setText(''); void qc.invalidateQueries({ queryKey: ['wa-thread', sel] }); void qc.invalidateQueries({ queryKey: ['wa-convs'] }) },
    onError: (e) => { toast.err(e instanceof Error ? e.message : 'Could not send'); void qc.invalidateQueries({ queryKey: ['wa-thread', sel] }) },
  })
  if (list.isLoading) return <PageLoading />
  if (list.error || !list.data) return <ErrorState message="Couldn't load your inbox." onRetry={() => void list.refetch()} />
  if (!list.data.connected) return (
    <div className="space-y-5"><PageHeader title="WhatsApp inbox" sub="Replies from customers appear here." />
      <Card><EmptyState icon={<MessageCircle className="size-5" />} title="WhatsApp isn't connected" body="Connect your WhatsApp Business number to read customer replies and send order updates." action={<Link to="/dashboard/connections" className="font-bold underline">Open Connections</Link>} /></Card></div>
  )
  const items = list.data.items
  return (
    <div className="space-y-5">
      <PageHeader title="WhatsApp inbox" sub="Messages sent to your connected number. WhatsApp only lets you send free text within 24 hours of the customer’s last message." />
      {!items.length ? <Card><EmptyState icon={<MessageCircle className="size-5" />} title="No messages yet" body="When a customer messages your number — or you send an order update — the conversation shows up here. Make sure the webhook is set in Meta (see Connections)." /></Card> : (
        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          <Card><ul className="max-h-[70vh] divide-y divide-line overflow-auto">{items.map((c) => (
            <li key={c.phone}><button onClick={() => setSel(c.phone)} className={cn('flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-black/5', sel === c.phone && 'bg-black/5')}>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{c.name || `+${c.phone}`}</p><p className="truncate text-xs text-muted">{c.last}</p></div>
              {c.unread > 0 && <Badge tone="ok">{c.unread}</Badge>}</button></li>))}</ul></Card>
          <Card>{!sel ? <div className="p-8 text-center text-sm text-muted">Pick a conversation.</div> : (
            <div className="flex h-[70vh] flex-col">
              <div className="flex-1 space-y-2 overflow-auto p-4">{(thread.data?.messages ?? []).map((m) => (
                <div key={m.id} className={cn('flex', m.direction === 'OUT' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[80%] rounded-2xl px-3 py-2 text-sm', m.direction === 'OUT' ? 'bg-ink text-white' : 'bg-white ring-1 ring-line')}>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={cn('mt-1 text-[10px]', m.direction === 'OUT' ? 'text-white/60' : 'text-muted')}>{new Date(m.created_at).toLocaleString()}{m.direction === 'OUT' ? ` · ${m.status.toLowerCase()}` : ''}{m.kind === 'template' ? ' · template' : ''}</p>
                    {m.error && <p className="mt-1 text-[11px] text-red-300">{m.error}</p>}</div></div>))}</div>
              <form className="border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate() }}>
                {thread.data && !thread.data.window_open && <p className="mb-2 text-xs text-amber-700">This customer hasn’t messaged in the last 24 hours, so WhatsApp will reject free text. Wait for them to reply, or use a template from a campaign.</p>}
                <div className="flex gap-2"><textarea value={text} maxLength={2000} rows={2} onChange={(e) => setText(e.target.value)} placeholder="Type a reply…" className="min-h-11 flex-1 resize-none rounded-xl border border-line-strong bg-white/80 px-3 py-2 text-sm" />
                  <Button type="submit" loading={send.isPending} disabled={!text.trim()} aria-label="Send reply"><Send className="size-4" /></Button></div>
              </form>
            </div>)}</Card>
        </div>)}
    </div>
  )
}
