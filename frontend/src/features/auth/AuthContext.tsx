import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, setAccessToken, setBusinessOverride, tryRefresh } from '@/lib/api'
import { setLocale } from '@/lib/i18n'
import type { Me, User } from '@/types'

interface AuthState {
  me: Me | null
  loading: boolean
  login: (identifier: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string, phone?: string) => Promise<void>
  guest: () => Promise<void>
  logout: () => Promise<void>
  reload: () => Promise<Me | null>
  updateProfile: (data: { full_name?: string; phone?: string; locale?: string }) => Promise<User>
  requestPhoneCode: (phone?: string) => Promise<{ message: string; phone: string }>
  verifyPhone: (code: string, phone?: string) => Promise<{ message: string; phone_verified: boolean; phone: string }>
  resendEmailVerification: () => Promise<void>
  startImpersonation: (token: string) => Promise<void>
  stopImpersonation: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)
const ADMIN_TOKEN_KEY = 'bz_admin_return'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const qc = useQueryClient()

  const reload = useCallback(async () => {
    try {
      const m = await api.get<Me>('/auth/me', { _t: Date.now() })
      setMe(m)
      setLocale(m.user.locale)
      return m
    } catch {
      setMe(null)
      return null
    }
  }, [])

  useEffect(() => {
    void (async () => {
      const t = await tryRefresh()
      if (t) await reload()
      setLoading(false)
    })()
    const out = () => { setAccessToken(null); setMe(null); qc.clear() }
    window.addEventListener('aqivo:signed-out', out)
    window.addEventListener('bizora:signed-out', out)
    return () => {
      window.removeEventListener('aqivo:signed-out', out)
      window.removeEventListener('bizora:signed-out', out)
    }
  }, [reload, qc])

  const value = useMemo<AuthState>(() => ({
    me, loading, reload,
    login: async (identifier, password) => {
      const r = await api.post<{ access_token: string }>('/auth/login', { identifier, password })
      setAccessToken(r.access_token)
      qc.clear()
      await reload()
    },
    register: async (email, password, fullName, phone) => {
      const r = await api.post<{ access_token: string }>('/auth/register', { email, password, full_name: fullName, phone: phone || null })
      setAccessToken(r.access_token)
      qc.clear()
      await reload()
    },
    updateProfile: async (data) => {
      const u = await api.patch<User>('/auth/me', data)
      await reload()
      return u
    },
    requestPhoneCode: async (phone) => {
      return await api.post<{ message: string; phone: string }>('/auth/request-phone-code', { phone: phone || null })
    },
    verifyPhone: async (code, phone) => {
      const r = await api.post<{ message: string; phone_verified: boolean; phone: string }>('/auth/verify-phone', { code, phone: phone || null })
      await reload()
      return r
    },
    resendEmailVerification: async () => {
      await api.post('/auth/resend-verification', { email: me?.user.email })
    },
    guest: async () => {
      const r = await api.post<{ access_token: string }>('/auth/guest', { industry: 'retail' })
      setAccessToken(r.access_token)
      qc.clear()
      await reload()
    },
    logout: async () => {
      try { await api.post('/auth/logout') } catch { /* cookie may already be gone */ }
      sessionStorage.removeItem(ADMIN_TOKEN_KEY)
      setAccessToken(null); setBusinessOverride(null); setMe(null); qc.clear()
    },
    startImpersonation: async (token) => {
      const { getAccessToken } = await import('@/lib/api')
      const current = getAccessToken()
      if (current) sessionStorage.setItem(ADMIN_TOKEN_KEY, current)
      setAccessToken(token); qc.clear(); await reload()
    },
    stopImpersonation: async () => {
      const back = sessionStorage.getItem(ADMIN_TOKEN_KEY)
      sessionStorage.removeItem(ADMIN_TOKEN_KEY)
      qc.clear()
      if (back) { setAccessToken(back); await reload() } else { const t = await tryRefresh(); if (t) await reload() }
    },
  }), [me, loading, reload, qc])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
