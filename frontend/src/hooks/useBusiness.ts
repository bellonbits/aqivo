import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { BusinessSummary } from '@/types'

export const BUSINESS_KEY = ['business', 'me']

export function useBusiness() {
  const q = useQuery({ queryKey: BUSINESS_KEY, queryFn: () => api.get<BusinessSummary>('/businesses/me'), staleTime: 30_000 })
  const qc = useQueryClient()
  const has = (feature: string) => !!q.data?.plan.features.includes(feature)
  const can = (allOwner = false) => !allOwner || !!q.data?.permissions_all
  return { ...q, business: q.data?.business, summary: q.data, has, can, refresh: () => qc.invalidateQueries({ queryKey: BUSINESS_KEY }) }
}
