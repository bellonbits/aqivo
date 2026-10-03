import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface Toast { id: number; kind: 'ok' | 'err'; text: string }
const Ctx = createContext<{ ok: (t: string) => void; err: (t: string) => void } | null>(null)
let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = ++seq
    setItems((s) => [...s, { id, kind, text }])
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), kind === 'err' ? 6000 : 3500)
  }, [])
  return (
    <Ctx.Provider value={{ ok: (t) => push('ok', t), err: (t) => push('err', t) }}>
      {children}
      <div className="fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6" role="status" aria-live="polite">
        <AnimatePresence>{items.map((t) => (
          <motion.div layout key={t.id} initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className="flex max-w-md items-start gap-2 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-lg">
            {t.kind === 'ok' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#a99bff]" /> : <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" />}
            <span>{t.text}</span>
            <button aria-label="Dismiss" onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} className="ml-2 opacity-60 hover:opacity-100"><X className="size-4" /></button>
          </motion.div>
        ))}</AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}
export const useToast = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useToast outside ToastProvider')
  return v
}
