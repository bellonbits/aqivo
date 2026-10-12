import { useState, useEffect, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2, MessageSquare, RefreshCw, ShieldCheck } from 'lucide-react'
import { useAuth } from './AuthContext'
import { api } from '@/lib/api'
import { Button, Input, TextField } from '@/components/ui'
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
  const [showPassword, setShowPassword] = useState(false)
  const { error, busy, submit } = useSubmit(async () => {
    await login(email.trim().toLowerCase(), password)
    nav((loc.state as { from?: string } | null)?.from ?? '/dashboard', { replace: true })
  })
  const tryGuest = useSubmit(async () => { await guest(); nav('/dashboard', { replace: true }) })
  return (
    <AuthShell
      title="Welcome to Aqivo"
      sub="Build your store. Sell online. Grow your business."
      footer={<>New to Aqivo? <Link className="font-bold text-[#5B21F5] hover:underline" to="/register">Create your store</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-ink">Password</label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors p-1"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
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
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const { error, busy, submit } = useSubmit(async () => {
    await register(email, password, name, phone.trim() || undefined)
    nav('/onboarding' + (params.get('ref') ? `?ref=${params.get('ref')}` : '') + (params.get('template') ? `${params.get('ref') ? '&' : '?'}template=${params.get('template')}` : '') + (params.get('industry') ? `${nav_q(params)}industry=${params.get('industry')}` : ''), { replace: true })
  })
  return (
    <AuthShell
      title="Create your Aqivo store"
      sub="Launch a beautiful online store for your business in minutes."
      footer={<>Already have an account? <Link className="font-bold text-[#5B21F5] hover:underline" to="/login">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Your name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Mobile phone number"
          type="tel"
          autoComplete="tel"
          placeholder="0712 345 678"
          hint="For SMS order notifications & verification."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
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

export function VerifyPhonePage() {
  const { me, requestPhoneCode, verifyPhone } = useAuth()
  const [params] = useSearchParams()
  const nav = useNavigate()

  const [step, setStep] = useState<'input' | 'code' | 'done'>('input')
  const [phone, setPhone] = useState(params.get('phone') || me?.user?.phone || '')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) { setError('Please enter your phone number'); return }
    setError(''); setBusy(true)
    try {
      await requestPhoneCode(phone.trim())
      setStep('code')
      setCooldown(60)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification SMS.')
    } finally {
      setBusy(false)
    }
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    if (!code.trim()) { setError('Please enter the 6-digit code'); return }
    setError(''); setBusy(true)
    try {
      await verifyPhone(code.trim(), phone.trim())
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired verification code.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Verify your mobile phone"
      sub="We use OpenSMS to secure your account and send instant order alerts."
      footer={<Link className="font-bold text-[#5B21F5] hover:underline" to="/dashboard">Skip to dashboard</Link>}
    >
      {step === 'input' && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5 border border-line">
            <div className="grid size-10 place-items-center rounded-xl bg-[#5B21F5]/10 text-[#5B21F5] shrink-0">
              <ShieldCheck className="size-5" />
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Enter your mobile number to receive a 6-digit verification code via SMS.
            </p>
          </div>
          <TextField
            label="Mobile phone number"
            type="tel"
            autoComplete="tel"
            placeholder="0712 345 678"
            hint="Kenyan (07XX, 01XX) or international number."
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-bad" role="alert">{error}</p>}
          <Button type="submit" size="lg" className="w-full bg-[#5B21F5] hover:bg-[#4a18d1] text-white" loading={busy}>
            Send SMS Verification Code
          </Button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-indigo-50/70 p-3.5 border border-indigo-100">
            <div className="grid size-10 place-items-center rounded-xl bg-[#5B21F5] text-white shrink-0">
              <MessageSquare className="size-5" />
            </div>
            <div className="text-xs text-slate-700 leading-relaxed">
              We sent an SMS with a 6-digit code to <span className="font-bold text-[#5B21F5]">{phone}</span>.
            </div>
          </div>
          <div className="space-y-2 text-center">
            <label className="block text-sm font-semibold text-ink">Enter 6-digit SMS code</label>
            <div className="flex justify-center">
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="h-14 w-52 text-center text-2xl font-extrabold tracking-[0.35em] text-[#0B1736]"
                placeholder="······"
                autoFocus
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 text-xs">
            <button type="button" onClick={() => setStep('input')} className="font-semibold text-muted hover:text-ink underline">
              Change number
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || busy}
              onClick={(e) => void handleSendCode(e)}
              className="inline-flex items-center gap-1 font-semibold text-[#5B21F5] hover:underline disabled:text-muted disabled:no-underline"
            >
              <RefreshCw className={`size-3 ${busy ? 'animate-spin' : ''}`} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend SMS code'}
            </button>
          </div>
          {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-bad" role="alert">{error}</p>}
          <Button type="submit" size="lg" className="w-full bg-[#5B21F5] hover:bg-[#4a18d1] text-white" loading={busy} disabled={code.trim().length < 4}>
            Confirm & Verify Phone
          </Button>
        </form>
      )}

      {step === 'done' && (
        <div className="space-y-4 py-4 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="size-10" />
          </div>
          <h3 className="text-xl font-bold text-ink">Phone Verified!</h3>
          <p className="text-sm text-muted">
            Your phone number <span className="font-semibold text-ink">{phone}</span> is now confirmed and connected.
          </p>
          <Button size="lg" className="w-full bg-[#5B21F5] hover:bg-[#4a18d1] text-white" onClick={() => nav('/dashboard')}>
            Continue to Dashboard
          </Button>
        </div>
      )}
    </AuthShell>
  )
}

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { me, resendEmailVerification } = useAuth()
  const [status, setStatus] = useState<'checking' | 'success' | 'error' | 'sent'>('checking')
  const [errorMsg, setErrorMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const token = params.get('token')

  useEffect(() => {
    if (token) {
      api.post('/auth/verify-email', { token })
        .then(() => setStatus('success'))
        .catch((err) => {
          setStatus('error')
          setErrorMsg(err instanceof Error ? err.message : 'Invalid or expired verification token.')
        })
    } else {
      setStatus('checking')
    }
  }, [token])

  const handleResend = async () => {
    setBusy(true)
    try {
      await resendEmailVerification()
      setStatus('sent')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to resend verification email.')
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Verify your email"
      sub="Confirm your email address to access all features."
      footer={<Link className="font-bold text-[#5B21F5] hover:underline" to="/dashboard">Back to dashboard</Link>}
    >
      <div className="space-y-4 py-4 text-center">
        {status === 'success' && (
          <>
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="size-10" />
            </div>
            <h3 className="text-xl font-bold text-ink">Email Confirmed!</h3>
            <p className="text-sm text-muted">Your email address has been successfully verified.</p>
            <Button size="lg" className="w-full bg-[#5B21F5] hover:bg-[#4a18d1] text-white" onClick={() => nav('/dashboard')}>
              Go to Dashboard
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-bad" role="alert">
              {errorMsg || 'This verification link is invalid or has expired.'}
            </p>
            <Button size="lg" className="w-full bg-[#5B21F5] hover:bg-[#4a18d1] text-white" loading={busy} onClick={handleResend}>
              Resend Verification Email
            </Button>
          </>
        )}

        {(status === 'checking' || status === 'sent') && !token && (
          <>
            <p className="text-sm text-muted">
              We sent a verification link to <span className="font-semibold text-ink">{me?.user?.email || 'your email'}</span>. Click the link in the message to verify your account.
            </p>
            {status === 'sent' && (
              <p className="rounded-xl bg-emerald-50 px-3.5 py-2 text-sm text-emerald-700">
                A fresh verification link has been sent to your email.
              </p>
            )}
            <Button size="lg" variant="secondary" className="w-full" loading={busy} onClick={handleResend}>
              Resend Verification Email
            </Button>
          </>
        )}
      </div>
    </AuthShell>
  )
}
