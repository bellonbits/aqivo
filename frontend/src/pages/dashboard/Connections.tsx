import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useBusiness } from '@/hooks/useBusiness'
import { ErrorState, PageHeader, PageLoading } from '@/components/ui'
import { ConnectionCard, type Connection } from '@/features/connections/ConnectionCard'

const GROUPS: [string, string, string[]][] = [
  ['Take payments', 'Customers pay you directly. Aqivo never holds your money — it uses your own account with each provider.', ['paystack', 'flutterwave', 'daraja']],
  ['Talk to customers', 'Send order updates and login codes from your own WhatsApp number, and read replies in the inbox.', ['whatsapp_cloud']],
  ['Show your social proof', 'Show your Instagram posts and Google reviews on your storefront.', ['instagram', 'google_places']],
]

export default function Connections() {
  const { summary } = useBusiness()
  const canWrite = !!summary && (summary.permissions_all || ['BUSINESS_MANAGER', 'BUSINESS_ADMIN'].includes(summary.role))
  const q = useQuery({ queryKey: ['connections'], queryFn: () => api.get<{ providers: Connection[] }>('/connections') })
  if (q.isLoading) return <PageLoading />
  if (q.error || !q.data) return <ErrorState message="Couldn't load your connections." onRetry={() => void q.refetch()} />
  const by = Object.fromEntries(q.data.providers.map((p) => [p.provider, p]))
  return (
    <div className="space-y-8">
      <PageHeader title="Connections" sub="Connect your own accounts. Nothing is switched on for customers until the connection works." />
      {GROUPS.map(([title, sub, keys]) => (
        <section key={title} className="space-y-3"><div><h2 className="text-lg">{title}</h2><p className="text-sm text-muted">{sub}</p></div>
          <div className="grid gap-4 lg:grid-cols-2">{keys.filter((k) => by[k]).map((k) => <ConnectionCard key={`${k}:${by[k].status}:${by[k].last_tested_at}`} c={by[k]} canWrite={canWrite} />)}</div></section>
      ))}
      <p className="text-xs text-muted">Not available yet: Pesapal, DPO, PawaPay and Airtel Money checkout; publishing posts to Instagram; Google Merchant Center; courier company APIs.</p>
    </div>
  )
}
