import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, setAccessToken, setBusinessOverride, tryRefresh } from '@/lib/api'
import { setLocale } from '@/lib/i18n'
import type { Me } from '@/types'

interface AuthState {
  me: Me | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  guest: () => Promise<void>
  logout: () => Promise<void>
  reload: () => Promise<Me | null>
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
      const m = await api.get<Me>('/auth/me')
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
    login: async (email, password) => {
      const r = await api.post<{ access_token: string }>('/auth/login', { email, password })
      setAccessToken(r.access_token)
      qc.clear()
      await reload()
    },
    register: async (email, password, fullName) => {
      const r = await api.post<{ access_token: string }>('/auth/register', { email, password, full_name: fullName })
      setAccessToken(r.access_token)
      qc.clear()
      await reload()
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
