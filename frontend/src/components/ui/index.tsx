import { cloneElement, forwardRef, isValidElement, useEffect, useId, useRef, type ReactElement, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CountUp } from '@/lib/motion'
import { Loader2, Lock, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/cn'

/* ---------- Buttons ---------- */
type Variant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger' | 'lime'
const variants: Record<Variant, string> = {
  primary: 'btn-brand',
  dark: 'bg-ink text-white hover:bg-ink-3',
  lime: 'btn-brand',
  secondary: 'bg-white/80 text-ink border border-line-strong hover:bg-white',
  ghost: 'text-ink hover:bg-black/5',
  danger: 'bg-white text-bad border border-red-200 hover:bg-red-50',
}
const sizes = { sm: 'h-9 min-h-[36px] px-3.5 text-sm', md: 'h-11 min-h-[44px] px-5 text-sm', lg: 'h-12 min-h-[48px] px-6 text-base' }
const base = 'inline-flex select-none items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap shrink-0 transition duration-200 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50'

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: keyof typeof sizes; loading?: boolean }
export const Button = forwardRef<HTMLButtonElement, BtnProps>(({ variant = 'primary', size = 'md', loading, className, children, disabled, type = 'button', ...p }, ref) => (
  <button ref={ref} type={type} disabled={disabled || loading} className={cn(base, variants[variant], sizes[size], className)} {...p}>
    {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
    {children}
  </button>
))
Button.displayName = 'Button'

export function LinkButton({ variant = 'primary', size = 'md', className, ...p }: LinkProps & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...p} />
}

/* ---------- Layout bits ---------- */
export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn('rounded-[20px] glass', className)}>{children}</div>
)
export const CardHeader = ({ title, action, sub }: { title: ReactNode; action?: ReactNode; sub?: ReactNode }) => (
  <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
    <div><h3 className="text-base">{title}</h3>{sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}</div>
    {action}
  </div>
)

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0"><h1 className="text-2xl md:text-3xl">{title}</h1>{sub && <p className="mt-1 max-w-2xl text-sm text-muted">{sub}</p>}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ---------- Form fields ---------- */
const fieldBase = 'w-full rounded-xl border border-line-strong bg-white px-3.5 text-[15px] placeholder:text-muted/70 focus:border-ink disabled:bg-paper disabled:text-muted'
export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  const auto = useId()
  const id = htmlFor ?? auto
  // Wire the label to a single form-control child automatically (accessible names for every field).
  const child = !htmlFor && isValidElement(children) ? cloneElement(children as ReactElement<{ id?: string }>, { id: (children as ReactElement<{ id?: string }>).props.id ?? id }) : children
  const target = isValidElement(children) && (children as ReactElement<{ id?: string }>).props.id ? (children as ReactElement<{ id?: string }>).props.id : id
  return (
    <div className="block">
      <label htmlFor={target} className="mb-1.5 block text-sm font-semibold">{label}</label>
      {child}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-bad" role="alert">{error}</p>}
    </div>
  )
}
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => <input ref={ref} className={cn(fieldBase, 'h-11', className)} {...p} />)
Input.displayName = 'Input'
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => <textarea ref={ref} className={cn(fieldBase, 'py-2.5', className)} {...p} />)
Textarea.displayName = 'Textarea'
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => <select ref={ref} className={cn(fieldBase, 'h-11', className)} {...p} />)
Select.displayName = 'Select'

/** Labelled input that wires label→control for accessibility. */
export function TextField({ label, hint, error, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId()
  return <Field label={label} hint={hint} error={error} htmlFor={id}><Input id={id} {...p} /></Field>
}
export function TextAreaField({ label, hint, error, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }) {
  const id = useId()
  return <Field label={label} hint={hint} error={error} htmlFor={id}><Textarea id={id} {...p} /></Field>
}
export function SelectField({ label, hint, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  const id = useId()
  return <Field label={label} hint={hint} htmlFor={id}><Select id={id} {...p}>{children}</Select></Field>
}

/* ---------- Badges ---------- */
const tones = {
  neutral: 'bg-black/5 text-ink', ok: 'bg-green-100 text-green-800', warn: 'bg-amber-100 text-amber-800', bad: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800', lime: 'bg-lime text-lime-ink',
}
export const Badge = ({ tone = 'neutral', children }: { tone?: keyof typeof tones; children: ReactNode }) => (
  <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold', tones[tone])}>{children}</span>
)
const statusTone: Record<string, keyof typeof tones> = {
  NEW: 'info', CONTACTED: 'warn', QUALIFIED: 'warn', BOOKED: 'lime', CONVERTED: 'ok', LOST: 'neutral',
  PENDING: 'warn', CONFIRMED: 'info', COMPLETED: 'ok', CANCELLED: 'neutral', NO_SHOW: 'bad',
  PAID: 'ok', FAILED: 'bad', REFUNDED: 'neutral', DRAFT: 'neutral', SCHEDULED: 'info', SENT: 'ok',
  TRIAL: 'info', ACTIVE: 'ok', PAST_DUE: 'warn', EXPIRED: 'bad', SUSPENDED: 'bad', PUBLISHED: 'ok', UNPUBLISHED: 'neutral',
  OPEN: 'warn', RESOLVED: 'ok', DEMO: 'info', INTERESTED: 'lime', ONBOARDING: 'warn',
}
export const StatusBadge = ({ status }: { status: string }) => <Badge tone={statusTone[status] ?? 'neutral'}>{status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</Badge>

/* ---------- States ---------- */
export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn('size-5 animate-spin text-muted', className)} aria-label="Loading" />
export const PageLoading = () => <div className="grid min-h-[40vh] place-items-center"><Spinner className="size-7" /></div>

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-full bg-black/5 text-muted">{icon}</div>}
      <h3 className="text-base">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
export const NotEnoughData = ({ hint }: { hint?: string }) => (
  <div className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center">
    <p className="text-sm font-semibold">Not enough data yet.</p>
    {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
  </div>
)
export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <EmptyState title="Couldn't load this" body={message} action={onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>} />
)
export const ComingSoon = ({ title, body }: { title: string; body?: string }) => (
  <div className="flex items-start gap-3 rounded-xl border border-dashed border-line-strong bg-paper px-4 py-3.5">
    <Badge tone="neutral">Coming soon</Badge>
    <div><p className="text-sm font-semibold">{title}</p>{body && <p className="text-sm text-muted">{body}</p>}</div>
  </div>
)
export const NotConfigured = ({ title, body }: { title: string; body?: string }) => (
  <div className="flex items-start gap-3 rounded-xl border border-dashed border-line-strong bg-paper px-4 py-3.5">
    <Badge tone="warn">Not configured</Badge>
    <div><p className="text-sm font-semibold">{title}</p>{body && <p className="text-sm text-muted">{body}</p>}</div>
  </div>
)

export function UpgradePrompt({ feature, title, body }: { feature?: string; title?: string; body?: string }) {
  return (
    <Card className="mx-auto mt-4 max-w-xl p-8 text-center">
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-lime text-lime-ink"><Lock className="size-5" /></div>
      <h2 className="text-xl">{title ?? 'This is part of a paid plan'}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body ?? `Upgrade to unlock ${feature ? feature.replace(/_/g, ' ') : 'this feature'}. Your data stays safe either way.`}</p>
      <div className="mt-5"><LinkButton to="/dashboard/settings#plan" variant="primary"><Sparkles className="size-4" /> See plans</LinkButton></div>
    </Card>
  )
}

/* ---------- Stat ---------- */
export function Stat({ label, value, sub, tone = 'default' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'default' | 'lime' }) {
  return (
    <div className={cn('rounded-[18px] border p-4', tone === 'lime' ? 'border-white bg-gradient-to-br from-[#dfe6ff] to-[#e9defe]' : 'glass')}>
      <p className={cn('text-xs font-semibold uppercase tracking-wide', tone === 'lime' ? 'text-lime-ink/70' : 'text-muted')}>{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight md:text-3xl">{typeof value === 'number' ? <CountUp to={value} duration={900} /> : value}</p>
      {sub && <p className={cn('mt-0.5 text-xs', tone === 'lime' ? 'text-lime-ink/70' : 'text-muted')}>{sub}</p>}
    </div>
  )
}

/* ---------- Modal / bottom sheet ---------- */
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus() }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex items-end justify-center bg-[#1b1f3b]/40 backdrop-blur-sm md:items-center md:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          <motion.div ref={ref} role="dialog" aria-modal="true" aria-label={title} initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.98 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} className={cn('glass-strong flex max-h-[92dvh] w-full flex-col rounded-t-2xl shadow-2xl md:rounded-2xl', wide ? 'md:max-w-2xl' : 'md:max-w-lg')}>
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-lg">{title}</h2>
              <button aria-label="Close" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-black/5"><X className="size-5" /></button>
            </div>
            <div className="overflow-y-auto px-5 py-5">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5 pb-safe">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', danger, loading, onConfirm, onClose }: { open: boolean; title: string; body: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <div className="text-sm text-muted">{body}</div>
    </Modal>
  )
}

/* ---------- Tabs ---------- */
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist">
      {items.map((i) => (
        <button key={i.value} role="tab" aria-selected={value === i.value} onClick={() => onChange(i.value)}
          className={cn('h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors', value === i.value ? 'btn-brand' : 'bg-white/70 text-muted ring-1 ring-line hover:text-ink')}>
          {i.label}{i.count !== undefined && <span className="ml-1.5 opacity-60">{i.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* ---------- Copy row ---------- */
export function CopyField({ label, value, onCopied }: { label: string; value: string; onCopied?: () => void }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-paper py-1.5 pl-3 pr-1.5">
        <span className="min-w-0 flex-1 truncate text-sm">{value}</span>
        <Button size="sm" variant="secondary" onClick={() => { void navigator.clipboard.writeText(value); onCopied?.() }}>Copy</Button>
      </div>
    </div>
  )
}
