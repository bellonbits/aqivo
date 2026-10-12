import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, MessageSquare, Phone, RefreshCw, ShieldCheck } from 'lucide-react'
import { useAuth } from './AuthContext'
import { useToast } from '@/hooks/useToast'
import { Button, Input, Modal } from '@/components/ui'

interface PhoneVerificationModalProps {
  open: boolean
  onClose: () => void
  initialPhone?: string | null
  onVerified?: (phone: string) => void
}

export function PhoneVerificationModal({ open, onClose, initialPhone, onVerified }: PhoneVerificationModalProps) {
  const { me, requestPhoneCode, verifyPhone } = useAuth()
  const toast = useToast()

  const [step, setStep] = useState<'input' | 'code' | 'success'>('input')
  const [phone, setPhone] = useState(initialPhone || me?.user?.phone || '')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setStep('input')
      setPhone(initialPhone || me?.user?.phone || '')
      setCode('')
      setError('')
      setBusy(false)
    }
  }, [open, initialPhone, me?.user?.phone])

  useEffect(() => {
    if (cooldown <= 0) return
    const interval = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [cooldown])

  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => codeInputRef.current?.focus(), 150)
    }
  }, [step])

  const handleSendCode = async () => {
    const raw = phone.trim()
    if (!raw) {
      setError('Please enter your phone number.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const res = await requestPhoneCode(raw)
      setStep('code')
      setCooldown(60)
      toast.ok(res.message || 'SMS verification code sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send SMS code.')
    } finally {
      setBusy(false)
    }
  }

  const handleVerify = async () => {
    const cleanCode = code.trim()
    if (cleanCode.length < 4) {
      setError('Please enter the verification code sent to your phone.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const res = await verifyPhone(cleanCode, phone.trim())
      setStep('success')
      toast.ok(res.message || 'Phone number verified successfully!')
      onVerified?.(res.phone)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired verification code.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 'success' ? 'Phone Verified' : 'Verify Mobile Phone'}
      footer={
        step === 'input' ? (
          <>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              className="bg-[#5B21F5] hover:bg-[#4a18d1] text-white"
              loading={busy}
              disabled={phone.trim().length < 8}
              onClick={handleSendCode}
            >
              Send SMS Code
            </Button>
          </>
        ) : step === 'code' ? (
          <>
            <Button variant="secondary" onClick={() => setStep('input')} disabled={busy}>
              Change Number
            </Button>
            <Button
              className="bg-[#5B21F5] hover:bg-[#4a18d1] text-white"
              loading={busy}
              disabled={code.trim().length < 4}
              onClick={handleVerify}
            >
              Verify Code
            </Button>
          </>
        ) : (
          <Button className="w-full bg-[#5B21F5] hover:bg-[#4a18d1] text-white" onClick={onClose}>
            Done
          </Button>
        )
      }
    >
      <div className="space-y-4 py-2">
        {step === 'input' && (
          <>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5 border border-line">
              <div className="grid size-10 place-items-center rounded-xl bg-[#5B21F5]/10 text-[#5B21F5] shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <p className="text-xs text-muted leading-relaxed">
                We use OpenSMS to deliver a 6-digit security code to your mobile phone. You'll receive real-time order alerts and customer inquiry notifications.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-ink">Mobile phone number</label>
              <div className="relative">
                <Input
                  type="tel"
                  placeholder="0712 345 678 or +254 712 345 678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    setError('')
                  }}
                  autoFocus
                  className="pl-10"
                />
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
              </div>
              <p className="text-xs text-muted">Supports Kenyan formats (07XX, 01XX, +2547XX) and international numbers.</p>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-bad" role="alert">
                {error}
              </p>
            )}
          </>
        )}

        {step === 'code' && (
          <>
            <div className="flex items-center gap-3 rounded-2xl bg-indigo-50/70 p-3.5 border border-indigo-100">
              <div className="grid size-10 place-items-center rounded-xl bg-[#5B21F5] text-white shrink-0">
                <MessageSquare className="size-5" />
              </div>
              <div className="text-xs text-slate-700 leading-relaxed">
                SMS verification code sent to <span className="font-bold text-[#5B21F5]">{phone}</span>.
                <br />
                It expires in 10 minutes.
              </div>
            </div>

            <div className="space-y-2 text-center">
              <label className="block text-sm font-semibold text-ink">Enter 6-digit SMS code</label>
              <div className="flex justify-center">
                <Input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ''))
                    setError('')
                  }}
                  className="h-14 w-52 text-center text-2xl font-extrabold tracking-[0.35em] text-[#0B1736]"
                  placeholder="······"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="font-semibold text-muted hover:text-ink underline"
              >
                Wrong number?
              </button>
              <button
                type="button"
                disabled={cooldown > 0 || busy}
                onClick={handleSendCode}
                className="inline-flex items-center gap-1 font-semibold text-[#5B21F5] hover:underline disabled:text-muted disabled:no-underline"
              >
                <RefreshCw className={`size-3 ${busy ? 'animate-spin' : ''}`} />
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend SMS code'}
              </button>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-bad" role="alert">
                {error}
              </p>
            )}
          </>
        )}

        {step === 'success' && (
          <div className="py-4 text-center space-y-3">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="size-10" />
            </div>
            <h4 className="text-lg font-bold text-ink">Mobile Phone Verified!</h4>
            <p className="text-sm text-muted max-w-sm mx-auto">
              Your number <span className="font-semibold text-ink">{phone}</span> is confirmed. Your account is now secured and ready to receive customer alerts and OTP sign-ins.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
