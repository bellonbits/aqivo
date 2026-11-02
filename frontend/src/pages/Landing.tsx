import { Categories, Faq, FinalCta, Features, HowItWorks, EarlyAccess, Messaging, OrderManagement, PaymentsBlock, Pricing, ProfileDemo, SiteFooter, WhatsAppOrdering } from './landing/Sections'
import { Hero, SiteNav } from './landing/Hero'

export default function Landing() {
  return (
    <div className="min-h-screen bg-sand text-ink overflow-x-hidden selection:bg-brand selection:text-white">
      <SiteNav />
      <main>
        <Hero />
        <WhatsAppOrdering />
        <OrderManagement />
        <PaymentsBlock />
        <Messaging />
        <ProfileDemo />
        <Features />
        <Categories />
        <HowItWorks />
        <Pricing />
        <EarlyAccess />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}
