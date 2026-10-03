import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ToastProvider } from '@/hooks/useToast'
import { ForgotPage, LoginPage, RegisterPage, ResetPage } from '@/features/auth/AuthPages'
import { PageLoading } from '@/components/ui'
import Landing from '@/pages/Landing'

const Templates = lazy(() => import('@/pages/Templates'))
const Onboarding = lazy(() => import('@/features/onboarding/Onboarding'))
const DashboardLayout = lazy(() => import('@/layouts/DashboardLayout'))
const AdminLayout = lazy(() => import('@/layouts/AdminLayout'))
const page = (loader: () => Promise<{ default: React.ComponentType }>) => lazy(loader)
const Home = page(() => import('@/pages/dashboard/Home'))
const MyBusiness = page(() => import('@/pages/dashboard/MyBusiness'))
const WebsitePage = page(() => import('@/pages/dashboard/Editor'))
const Services = page(() => import('@/pages/dashboard/Services'))
const Products = page(() => import('@/pages/dashboard/Products'))
const Orders = page(() => import('@/pages/dashboard/Orders'))
const SeoDomains = page(() => import('@/pages/dashboard/SeoDomains'))
const Connections = page(() => import('@/pages/dashboard/Connections'))
const WhatsAppInbox = page(() => import('@/pages/dashboard/WhatsAppInbox'))
const StoreSettings = page(() => import('@/pages/dashboard/StoreSettings'))
const Customers = page(() => import('@/pages/dashboard/Customers'))
const Leads = page(() => import('@/pages/dashboard/Leads'))
const Bookings = page(() => import('@/pages/dashboard/Bookings'))
const Reviews = page(() => import('@/pages/dashboard/Reviews'))
const Payments = page(() => import('@/pages/dashboard/Payments'))
const Marketing = page(() => import('@/pages/dashboard/Marketing'))
const Analytics = page(() => import('@/pages/dashboard/Analytics'))
const AI = page(() => import('@/pages/dashboard/AI'))
const Settings = page(() => import('@/pages/dashboard/Settings'))
const adm = <K extends string>(k: K) => lazy(() => import('@/pages/admin/Admin').then((m) => ({ default: (m as unknown as Record<K, React.ComponentType>)[k] })))
const AdminDashboard = adm('AdminDashboard'), AdminBusinesses = adm('AdminBusinesses'), AdminNewBusiness = adm('AdminNewBusiness'), AdminBusinessDetail = adm('AdminBusinessDetail'),
  AdminSales = adm('AdminSales'), AdminSupport = adm('AdminSupport'), AdminPlans = adm('AdminPlans'), AdminAudit = adm('AdminAudit')

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 } } })

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPage />} />
                <Route path="/reset-password" element={<ResetPage />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<Home />} />
                  <Route path="business" element={<MyBusiness />} />
                  <Route path="website" element={<WebsitePage />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="products" element={<Products />} />
                  <Route path="store" element={<StoreSettings />} />
                  <Route path="seo" element={<SeoDomains />} />
                  <Route path="connections" element={<Connections />} />
                  <Route path="whatsapp" element={<WhatsAppInbox />} />
                  <Route path="services" element={<Services />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="leads" element={<Leads />} />
                  <Route path="bookings" element={<Bookings />} />
                  <Route path="reviews" element={<Reviews />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="marketing" element={<Marketing />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="ai" element={<AI />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="businesses" element={<AdminBusinesses />} />
                  <Route path="businesses/new" element={<AdminNewBusiness />} />
                  <Route path="businesses/:id" element={<AdminBusinessDetail />} />
                  <Route path="sales" element={<AdminSales />} />
                  <Route path="support" element={<AdminSupport />} />
                  <Route path="plans" element={<AdminPlans />} />
                  <Route path="audit" element={<AdminAudit />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
      </MotionConfig>
    </QueryClientProvider>
  )
}
