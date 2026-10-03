import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Send, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { Badge, Button, Card, PageHeader, UpgradePrompt } from '@/components/ui'
import { PlanPanel, useRunAction } from '@/features/ai/PlanPanel'
import type { AiAnswer } from '@/types'

interface Turn { q: string; a?: AiAnswer; err?: string }

export default function AI() {
  const { has } = useBusiness()
  const { click, dialog } = useRunAction()
  const [turns, setTurns] = useState<Turn[]>([])
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const sugg = useQuery({ queryKey: ['ai-sugg'], queryFn: () => api.get<{ suggestions: string[] }>('/ai/suggestions'), enabled: has('ai') })
  const ask = useMutation({
    mutationFn: (q: string) => api.post<AiAnswer>('/ai/ask', { question: q }),
    onMutate: (q) => { setTurns((t) => [...t, { q }]); setTimeout(() => end.current?.scrollIntoView({ behavior: 'smooth' }), 50) },
    onSuccess: (a) => setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, a } : x))),
    onError: (e) => setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, err: e instanceof Error ? e.message : 'Failed' } : x))),
  })
  if (!has('ai')) return <div><PageHeader title="AI Assistant" /><UpgradePrompt feature="Aqivo AI" title="Meet Aqivo AI" body="Ask questions about your business and let AI draft campaigns for you to approve. Available on Pro and Business." /></div>
  const submit = (q: string) => { if (!q.trim() || ask.isPending) return; setText(''); ask.mutate(q.trim()) }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Ask Aqivo" sub="Answers come from your own data. I can draft things for you — nothing is sent or changed until you confirm." />
      <div className="mb-8"><PlanPanel /></div>
      <h2 className="mb-3 text-lg">Ask a question</h2>
      <div className="space-y-5 pb-4">
        {!turns.length && <Card className="p-6"><div className="mb-3 grid size-10 place-items-center rounded-full bg-lime"><Sparkles className="size-5" /></div><p className="font-bold">Try asking</p><div className="mt-3 flex flex-wrap gap-2">{(sugg.data?.suggestions ?? []).map((s) => <button key={s} onClick={() => submit(s)} className="rounded-full border border-line-strong bg-white px-3.5 py-2 text-left text-sm font-semibold hover:border-ink">“{s}”</button>)}</div></Card>}
        {turns.map((t, i) => (
          <div key={i} className="space-y-3"><p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-sm text-white">{t.q}</p>
            {t.err ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-bad">{t.err}</p> : !t.a ? <p className="text-sm text-muted">Thinking…</p> : (
              <Card className="space-y-4 p-5"><p className="whitespace-pre-line text-[15px]">{t.a.answer}</p>
                {t.a.draft && <blockquote className="whitespace-pre-line rounded-xl bg-paper p-4 text-sm">{t.a.draft}<p className="mt-2 text-xs text-muted">{t.a.source === 'llm' ? 'Drafted with AI' : 'Built-in template (AI drafting not configured)'}</p></blockquote>}
                {!!t.a.data.length && <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">{t.a.data.map((d) => <div key={d.label} className="rounded-xl bg-paper p-3"><dt className="text-xs font-semibold text-muted">{d.label}</dt><dd className="mt-0.5 text-sm font-extrabold">{d.value}</dd></div>)}</dl>}
                {!!t.a.actions.length && <div className="flex flex-wrap gap-2">{t.a.actions.map((a, j) => <Button key={j} size="sm" variant={a.type === 'navigate' ? 'secondary' : 'primary'} onClick={() => click(a)}>{a.label}</Button>)}</div>}
                {t.a.suggestions && <div className="flex flex-wrap gap-2">{t.a.suggestions.map((s) => <button key={s} onClick={() => submit(s)} className="rounded-full border border-line-strong px-3 py-1.5 text-xs font-semibold hover:border-ink">{s}</button>)}</div>}
                {t.a.actions.some((a) => a.requires_confirmation) && <Badge>Needs your confirmation</Badge>}</Card>)}</div>))}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); submit(text) }} className="sticky bottom-20 flex gap-2 rounded-full border border-line-strong bg-white p-1.5 shadow-sm md:bottom-4"><input aria-label="Ask Aqivo" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about your business…" maxLength={500} className="min-w-0 flex-1 rounded-full bg-transparent px-4 text-[15px] focus:outline-none" /><Button type="submit" aria-label="Send" loading={ask.isPending} className="size-11 !px-0"><Send className="size-4" /></Button></form>
      {dialog}
    </div>
  )
}
