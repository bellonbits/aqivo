import { Categories, Faq, FinalCta, Features, HowItWorks, EarlyAccess, Messaging, OrderManagement, PaymentsBlock, Pricing, ProfileDemo, SiteFooter, WhatsAppOrdering } from './landing/Sections'
import { Hero, SiteNav } from './landing/Hero'

export default function Landing() {
  return (
    <>
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
    </>
  )
}
