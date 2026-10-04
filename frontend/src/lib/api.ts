// Thin fetch client. Access token lives in memory only; the refresh token is an httpOnly cookie.
let accessToken: string | null = null
let refreshing: Promise<string | null> | null = null
let businessOverride: string | null = null

export const setAccessToken = (t: string | null) => { accessToken = t }
export const getAccessToken = () => accessToken
export const setBusinessOverride = (id: string | null) => { businessOverride = id }

export class ApiError extends Error {
  status: number
  code?: string
  feature?: string
  constructor(status: number, message: string, code?: string, feature?: string) {
    super(message)
    this.status = status
    this.code = code
    this.feature = feature
  }
}

async function refresh(): Promise<string | null> {
  if (!refreshing) {
    refreshing = fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (r) => (r.ok ? ((await r.json()) as { access_token: string }).access_token : null))
      .catch(() => null)
      .finally(() => { refreshing = null })
  }
  const t = await refreshing
  accessToken = t
  return t
}

export const tryRefresh = refresh

function toError(status: number, body: unknown): ApiError {
  const detail = (body as { detail?: unknown })?.detail
  if (typeof detail === 'string') return new ApiError(status, detail)
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const d = detail as { message?: string; code?: string; feature?: string }
    return new ApiError(status, d.message ?? 'Request failed', d.code, d.feature)
  }
  if (Array.isArray(detail) && detail[0]?.msg) {
    const first = detail[0] as { msg: string; loc?: (string | number)[] }
    const field = first.loc?.filter((x) => x !== 'body').join('.')
    return new ApiError(status, field ? `${field}: ${first.msg}` : first.msg)
  }
  return new ApiError(status, status >= 500 ? 'Something went wrong on our side. Please try again.' : 'Request failed')
}

export async function request<T>(path: string, opts: { method?: string; body?: unknown; form?: FormData; query?: Record<string, unknown>; raw?: boolean } = {}, retried = false): Promise<T> {
  const url = new URL(`/api/v1${path}`, window.location.origin)
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k, String(x)))
    else url.searchParams.set(k, String(v))
  }
  const headers: Record<string, string> = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  if (businessOverride) headers['X-Business-Id'] = businessOverride
  let body: BodyInit | undefined
  if (opts.form) body = opts.form
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }
  const res = await fetch(url, { method: opts.method ?? 'GET', headers, body, credentials: 'include' })
  if (res.status === 401 && !retried && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh')) {
    const t = await refresh()
    if (t) return request<T>(path, opts, true)
    window.dispatchEvent(new Event('aqivo:signed-out'))
    window.dispatchEvent(new Event('bizora:signed-out'))
  }
  if (!res.ok) {
    let payload: unknown = null
    try { payload = await res.json() } catch { /* non-JSON error */ }
    throw toError(res.status, payload)
  }
  if (res.status === 204) return undefined as T
  if (opts.raw) return res as unknown as T
  const ct = res.headers.get('content-type') ?? ''
  return (ct.includes('json') ? res.json() : res.text()) as Promise<T>
}

export const api = {
  get: <T>(p: string, query?: Record<string, unknown>) => request<T>(p, { query }),
  post: <T>(p: string, body?: unknown, query?: Record<string, unknown>) => request<T>(p, { method: 'POST', body, query }),
  put: <T>(p: string, body?: unknown) => request<T>(p, { method: 'PUT', body }),
  patch: <T>(p: string, body?: unknown) => request<T>(p, { method: 'PATCH', body }),
  del: <T = void>(p: string) => request<T>(p, { method: 'DELETE' }),
  upload: <T>(p: string, file: File) => { const f = new FormData(); f.append('file', file); return request<T>(p, { method: 'POST', form: f }) },
  blob: async (p: string) => { const r = await request<Response>(p, { raw: true }); return r.blob() },
}
