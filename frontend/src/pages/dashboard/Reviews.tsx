import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, EyeOff, MessageCircle, Star } from 'lucide-react'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { useToast } from '@/hooks/useToast'
import { Badge, Button, Card, CardHeader, CopyField, EmptyState, ErrorState, PageHeader, PageLoading, Stat, Textarea, UpgradePrompt } from '@/components/ui'
import { relativeTime } from '@/lib/format'
import type { Review } from '@/types'

const Stars = ({ n }: { n: number }) => <span className="inline-flex text-amber-500" aria-label={`${n} out of 5`}>{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`size-4 ${i < n ? 'fill-current' : 'text-line-strong'}`} />)}</span>

export default function Reviews() {
  const { has } = useBusiness()
  const qc = useQueryClient()
  const toast = useToast()
  const [reply, setReply] = useState<{ id: string; text: string } | null>(null)
  const list = useQuery({ queryKey: ['reviews'], queryFn: () => api.get<Review[]>('/reviews'), enabled: has('reviews') })
  const sum = useQuery({ queryKey: ['review-summary'], queryFn: () => api.get<{ count: number; average: number | null; distribution: Record<string, number>; review_link: string }>('/reviews/summary'), enabled: has('reviews') })
  const pending = useQuery({ queryKey: ['pending-reviews'], queryFn: () => api.get<{ booking_id: string; customer_name: string; services: string[] }[]>('/reviews/pending-requests'), enabled: has('reviews') })
  const inv = () => { void qc.invalidateQueries({ queryKey: ['reviews'] }); void qc.invalidateQueries({ queryKey: ['review-summary'] }); void qc.invalidateQueries({ queryKey: ['pending-reviews'] }); void qc.invalidateQueries({ queryKey: ['overview'] }) }
  const respond = useMutation({ mutationFn: () => api.post(`/reviews/${reply!.id}/respond`, { response: reply!.text }), onSuccess: () => { setReply(null); inv(); toast.ok('Reply posted') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })
  const vis = useMutation({ mutationFn: (v: { id: string; published: boolean }) => api.post(`/reviews/${v.id}/visibility?published=${v.published}`), onSuccess: inv })
  const ask = useMutation({ mutationFn: (id: string) => api.post<{ whatsapp_url: string | null }>('/reviews/requests', { booking_id: id }), onSuccess: (r) => { inv(); if (r.whatsapp_url) window.open(r.whatsapp_url, '_blank') }, onError: (e) => toast.err(e instanceof Error ? e.message : 'Failed') })

  if (!has('reviews')) return <div><PageHeader title="Reviews" /><UpgradePrompt feature="reviews" body="Collect verified reviews and show them on your website. Available on Grow and above." /></div>
  if (list.isLoading || sum.isLoading) return <PageLoading />
  if (list.error || !sum.data) return <ErrorState message="Couldn't load reviews." onRetry={() => void list.refetch()} />
  const s = sum.data

  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" sub="Verified reviews build trust. Ask customers right after a visit." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Average rating" value={s.average ?? '—'} sub={s.count ? undefined : 'No reviews yet'} /><Stat label="Total reviews" value={s.count} />
        <div className="col-span-2 rounded-[14px] border border-line bg-white p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Ratings</p>{[5, 4, 3, 2, 1].map((n) => { const c = s.distribution[String(n)] ?? 0; return <div key={n} className="flex items-center gap-2 text-xs"><span className="w-3">{n}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full bg-amber-500" style={{ width: s.count ? `${(c / s.count) * 100}%` : 0 }} /></div><span className="w-5 text-right text-muted">{c}</span></div> })}</div></div>
      <Card><CardHeader title="Your review link" sub="Share by WhatsApp, SMS, QR code, receipt or social media." /><div className="p-5"><CopyField label="Review page" value={s.review_link} onCopied={() => toast.ok('Link copied')} /></div></Card>
      {!!pending.data?.length && <Card><CardHeader title="Ask for reviews" sub="Completed visits you haven't asked yet" /><ul className="divide-y divide-line">{pending.data.slice(0, 8).map((p) => <li key={p.booking_id} className="flex items-center justify-between gap-3 px-5 py-3"><span className="text-sm"><b>{p.customer_name}</b> · {p.services.join(', ')}</span><Button size="sm" variant="secondary" loading={ask.isPending && ask.variables === p.booking_id} onClick={() => ask.mutate(p.booking_id)}><MessageCircle className="size-4" /> Send via WhatsApp</Button></li>)}</ul></Card>}
      <Card><CardHeader title="Recent reviews" />
        {!list.data?.length ? <EmptyState icon={<Star className="size-5" />} title="No reviews yet" body="Share your review link after each visit. Reviews from real bookings are marked verified." /> : (
          <ul className="divide-y divide-line">{list.data.map((r) => (
            <li key={r.id} className="px-5 py-4"><div className="flex flex-wrap items-center gap-2"><Stars n={r.rating} /><span className="font-bold">{r.author_name}</span>{r.verified && <Badge tone="ok"><BadgeCheck className="mr-1 size-3" />Verified</Badge>}{!r.is_published && <Badge>Hidden</Badge>}<span className="text-xs text-muted">{relativeTime(r.created_at)}</span></div>
              {r.comment && <p className="mt-1.5 text-sm">{r.comment}</p>}
              {r.response ? <p className="mt-2 rounded-xl bg-paper p-3 text-sm"><b>Your reply:</b> {r.response}</p> : reply?.id === r.id ? <div className="mt-2 space-y-2"><Textarea aria-label="Your reply" rows={3} value={reply.text} onChange={(e) => setReply({ id: r.id, text: e.target.value })} /><div className="flex gap-2"><Button size="sm" loading={respond.isPending} disabled={!reply.text.trim()} onClick={() => respond.mutate()}>Post reply</Button><Button size="sm" variant="ghost" onClick={() => setReply(null)}>Cancel</Button></div></div> : <div className="mt-2 flex gap-2"><Button size="sm" variant="secondary" onClick={() => setReply({ id: r.id, text: '' })}>Reply</Button><Button size="sm" variant="ghost" onClick={() => vis.mutate({ id: r.id, published: !r.is_published })}><EyeOff className="size-4" />{r.is_published ? 'Hide' : 'Show'}</Button></div>}</li>))}</ul>)}</Card>
    </div>
  )
}
