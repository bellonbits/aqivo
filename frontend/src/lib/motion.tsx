// Motion helpers. framer-motion drives mount/scroll/layout transitions; anime.js drives ambient loops and number tweens.
// Everything degrades to static when the user prefers reduced motion.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { motion, useInView, useReducedMotion, type Variants } from 'framer-motion'
import { animate, stagger } from 'animejs'

export const ease = [0.22, 1, 0.36, 1] as const

export function useReduced(): boolean {
  return !!useReducedMotion()
}

/** Fade-and-rise when scrolled into view. */
export function Reveal({ children, delay = 0, y = 28, x = 0, className, as = 'div' }: { children: ReactNode; delay?: number; y?: number; x?: number; className?: string; as?: 'div' | 'li' | 'section' }) {
  const M = motion[as] as typeof motion.div
  return (
    <M className={className} initial={{ opacity: 0, y, x }} whileInView={{ opacity: 1, y: 0, x: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, delay, ease }}>
      {children}
    </M>
  )
}

export const staggerParent = (gap = 0.08, delayChildren = 0): Variants => ({ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren } } })
export const riseChild: Variants = { hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 0.65, ease } } }

/** Container whose children (wrapped in <Item>) stagger in when scrolled into view. */
export function Stagger({ children, className, gap = 0.08 }: { children: ReactNode; className?: string; gap?: number }) {
  return <motion.div className={className} variants={staggerParent(gap)} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>{children}</motion.div>
}
export function Item({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} variants={riseChild}>{children}</motion.div>
}

/** Slow bobbing loop (anime.js). */
export function useFloat(ref: RefObject<HTMLElement | null>, { amp = 10, duration = 3600, delay = 0, rotate = 0 } = {}) {
  const reduced = useReduced()
  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    const a = animate(el, { y: [-amp / 2, amp / 2], rotate: rotate ? [-rotate, rotate] : 0, duration, delay, loop: true, alternate: true, ease: 'inOutSine' })
    return () => { a.revert() }
  }, [ref, amp, duration, delay, rotate, reduced])
}

export function Floaty({ children, className, amp, duration, delay, rotate }: { children: ReactNode; className?: string; amp?: number; duration?: number; delay?: number; rotate?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useFloat(ref, { amp, duration, delay, rotate })
  return <div ref={ref} className={className}>{children}</div>
}

/** Number that tweens up (anime.js) the first time it is visible. */
export function CountUp({ to, duration = 1400, prefix = '', suffix = '' }: { to: number; duration?: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduced = useReduced()
  const [v, setV] = useState(reduced ? to : 0)
  useEffect(() => {
    if (!inView) return
    if (reduced) { setV(to); return }
    const o = { n: 0 }
    const a = animate(o, { n: to, duration, ease: 'outExpo', onUpdate: () => setV(Math.round(o.n)) })
    return () => { a.revert() }
  }, [inView, to, duration, reduced])
  return <span ref={ref}>{prefix}{v.toLocaleString('en')}{suffix}</span>
}

/** Ambient drifting blobs for hero backgrounds (anime.js). */
export function DriftingBlobs() {
  const root = useRef<HTMLDivElement>(null)
  const reduced = useReduced()
  useEffect(() => {
    if (!root.current || reduced) return
    const a = animate(root.current.children, { x: () => Math.random() * 120 - 60, y: () => Math.random() * 80 - 40, scale: [1, 1.15], duration: () => 7000 + Math.random() * 4000, delay: stagger(300), loop: true, alternate: true, ease: 'inOutSine' })
    return () => { a.revert() }
  }, [reduced])
  return (
    <div ref={root} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <span className="absolute -left-20 top-10 size-72 rounded-full bg-white/70 blur-3xl" />
      <span className="absolute right-0 top-32 size-80 rounded-full bg-[#c8b8ff]/50 blur-3xl" />
      <span className="absolute bottom-0 left-1/3 size-96 rounded-full bg-white/60 blur-3xl" />
    </div>
  )
}
