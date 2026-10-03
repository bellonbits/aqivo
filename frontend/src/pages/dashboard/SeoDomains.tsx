import { useSearchParams } from 'react-router-dom'
import { PageHeader, Tabs } from '@/components/ui'
import { DomainsTab } from '@/features/seo/DomainsTab'
import { AuditTab, IntegrationsTab, RedirectsTab, SharingTab, TrackingTab } from '@/features/seo/SeoTabs'

const TABS = [['audit', 'SEO check'], ['domains', 'Domains'], ['sharing', 'Social sharing'], ['redirects', 'Redirects'], ['tracking', 'Tracking & branding'], ['integrations', 'Integrations']] as const
type Tab = (typeof TABS)[number][0]

export default function SeoDomains() {
  const [params, setParams] = useSearchParams()
  const tab = (TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'audit') as Tab
  return (
    <div className="space-y-5">
      <PageHeader title="Domain & SEO" sub="Get found on Google, use your own address, and connect the tools you already use." />
      <Tabs<Tab> value={tab} onChange={(v) => setParams({ tab: v })} items={TABS.map(([value, label]) => ({ value, label }))} />
      {tab === 'audit' && <AuditTab />}{tab === 'domains' && <DomainsTab />}{tab === 'sharing' && <SharingTab />}{tab === 'redirects' && <RedirectsTab />}{tab === 'tracking' && <TrackingTab />}{tab === 'integrations' && <IntegrationsTab />}
    </div>
  )
}
