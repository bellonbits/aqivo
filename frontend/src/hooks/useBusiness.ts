import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/AuthContext'
import type { BusinessSummary, Urls } from '@/types'

export const BUSINESS_KEY = ['business', 'me']

export function cleanUrls(urls?: Urls): Urls | undefined {
  if (!urls) return urls
  const sanitize = (url?: string | null) => {
    if (!url) return url
    return url
      .replace(/^https?:\/\/localhost(:\d+)?/i, 'https://aqivo.shop')
      .replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/i, 'https://aqivo.shop')
      .replace(/^localhost\//i, 'aqivo.shop/')
      .replace(/^127\.0\.0\.1\//i, 'aqivo.shop/')
      .replace(/\.localhost$/i, '.aqivo.shop')
  }
  return {
    ...urls,
    profile: sanitize(urls.profile) || '',
    booking: sanitize(urls.booking) || '',
    review: sanitize(urls.review) || '',
    short: sanitize(urls.short) || '',
    subdomain: sanitize(urls.subdomain) || '',
    whatsapp: urls.whatsapp,
  }
}

export function useBusiness() {
  const { me } = useAuth()
  const hasMemberships = !me || me.memberships.length > 0 || me.impersonating
  const q = useQuery({
    queryKey: BUSINESS_KEY,
    queryFn: () => api.get<BusinessSummary>('/businesses/me'),
    staleTime: 30_000,
    enabled: hasMemberships,
    retry: false,
  })
  const qc = useQueryClient()
  const summary = q.data ? { ...q.data, urls: cleanUrls(q.data.urls)! } : undefined
  const has = (feature: string) => !!summary?.plan.features.includes(feature)
  const can = (allOwner = false) => !allOwner || !!summary?.permissions_all
  return { ...q, business: summary?.business, summary, has, can, refresh: () => qc.invalidateQueries({ queryKey: BUSINESS_KEY }) }
}
