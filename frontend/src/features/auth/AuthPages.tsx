import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { api } from '@/lib/api'
import { Button, TextField } from '@/components/ui'
import { Logo } from '@/components/Logo'

function AuthShell({ title, sub, children, footer }: { title: string; sub: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link to="/"><Logo size="lg" /></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B1736]">{title}</h1>
          <p className="mt-2 text-sm text-muted">{sub}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-6 text-sm text-muted">{footer}</div>
          <div className="mt-4 text-xs text-muted/70">© 2026 Aqivo.shop</div>
        </div>
      </div>
      <div className="sky relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-end bg-[#0B1736] text-white">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-[#5B21F5]/30 blur-3xl" aria-hidden />
        <div className="absolute -left-20 -bottom-20 size-80 rounded-full bg-[#7C3AED]/20 blur-3xl" aria-hidden />
        <p className="text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl text-white">
          Build your store.<br />
          Sell online.<br />
          <span className="text-[#A78BFA]">Grow your business.</span>
        </p>
        <p className="mt-5 max-w-md text-slate-300">
          Aqivo.shop is a modern digital commerce platform. Create a beautiful online store, sell products and services, accept orders, and manage your business from one platform.
        </p>
      </div>
    </div>
  )
}

function useSubmit(fn: () => Promise<void>) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true)
    try { await fn() } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong') } finally { setBusy(false) }
  }
  return { error, busy, submit }
}

export function LoginPage() {
  const { login, guest } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { error, busy, submit } = useSubmit(async () => { await login(email, password); nav((loc.state as { from?: string } | null)?.from ?? '/dashboard', { replace: true }) })
  const tryGuest = useSubmit(async () => { await guest(); nav('/dashboard', { replace: true }) })
  return (
    <AuthShell
      title="Welcome to Aqivo"
      sub="Build your store. Sell online. Grow your business."
      footer={<>New to Aqivo? <Link className="font-bold text-[#5B21F5] hover:underline" to="/register">Create your store</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-bad" role="alert">{error}</p>}
        <Button type="submit" size="lg" className="w-full bg-[#5B21F5] hover:bg-[#4a18d1] text-white" loading={busy}>Sign in</Button>
        <p className="text-center text-sm"><Link to="/forgot-password" className="font-semibold underline text-[#5B21F5]">Forgot password?</Link></p>
      </form>
      <div className="mt-5 border-t border-line pt-5 text-center">
        <Button variant="secondary" size="lg" className="w-full" loading={tryGuest.busy} onClick={(e) => void tryGuest.submit(e as unknown as FormEvent)}>Try demo store as guest</Button>
        <p className="mt-2 text-xs text-muted">No sign-up. Click around a sample Aqivo store. Guest data is temporary and private to you.</p>
        {tryGuest.error && <p className="mt-2 text-sm text-bad" role="alert">{tryGuest.error}</p>}
      </div>
    </AuthShell>
  )
}

const nav_q = (p: URLSearchParams) => (p.get('ref') || p.get('template') ? '&' : '?')

export function RegisterPage() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { error, busy, submit } = useSubmit(async () => { await register(email, password, name); nav('/onboarding' + (params.get('ref') ? `?ref=${params.get('ref')}` : '') + (params.get('template') ? `${params.get('ref') ? '&' : '?'}template=${params.get('template')}` : '') + (params.get('industry') ? `${nav_q(params)}industry=${params.get('industry')}` : ''), { replace: true }) })
  return (
    <AuthShell
      title="Create your Aqivo store"
      sub="Launch a beautiful online store for your business in minutes."
      footer={<>Already have an account? <Link className="font-bold text-[#5B21F5] hover:underline" to="/login">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Your name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Password" type="password" autoComplete="new-password" minLength={8} required hint="At least 8 characters." value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-bad" role="alert">{error}</p>}
        <Button type="submit" size="lg" className="w-full bg-[#5B21F5] hover:bg-[#4a18d1] text-white" loading={busy}>Create your store</Button>
        <p className="text-xs text-muted">By continuing you agree to our terms and privacy policy.</p>
      </form>
    </AuthShell>
  )
}

export function ForgotPage() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const { error, busy, submit } = useSubmit(async () => { await api.post('/auth/forgot-password', { email }); setDone(true) })
  return (
    <AuthShell title="Reset your password" sub="We'll email you a link to choose a new one." footer={<Link className="font-bold text-ink underline" to="/login">Back to sign in</Link>}>
      {done ? <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-900" role="status">If that email has an account, a reset link is on its way.</p> : (
        <form onSubmit={submit} className="space-y-4">
          <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <p className="text-sm font-medium text-bad" role="alert">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={busy}>Send reset link</Button>
        </form>
      )}
    </AuthShell>
  )
}

export function ResetPage() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const { error, busy, submit } = useSubmit(async () => { await api.post('/auth/reset-password', { token: params.get('token') ?? '', new_password: pw }); nav('/login', { replace: true }) })
  return (
    <AuthShell title="Choose a new password" sub="Use at least 8 characters." footer={<Link className="font-bold text-ink underline" to="/login">Back to sign in</Link>}>
      <form onSubmit={submit} className="space-y-4">
        <TextField label="New password" type="password" minLength={8} required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        {error && <p className="text-sm font-medium text-bad" role="alert">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Update password</Button>
      </form>
    </AuthShell>
  )
}
