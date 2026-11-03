import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { animate } from 'animejs'
import { Sparkles, Cpu, Zap, Activity } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/cn'

interface CreativeRobotProps {
  className?: string
  variant?: 'floating' | 'pedestal' | 'compact'
  size?: 'sm' | 'md' | 'lg'
  badgeText?: string
  showOrbits?: boolean
  mascot?: '1' | '2' | 'mascot1' | 'mascot2' | 'auto'
}

export function CreativeRobot({
  className,
  variant = 'floating',
  size = 'md',
  badgeText = 'Autonomous Architecture Vanguard',
  showOrbits = true,
  mascot = 'auto',
}: CreativeRobotProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const containerRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  // Framer Motion 3D Tilt on Hover
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 20, stiffness: 150 }
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), springConfig)
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(x)
    mouseY.set(y)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  // AnimeJS Particle & Energy Loop
  useEffect(() => {
    if (!ringRef.current || !showOrbits) return

    // Animate energy ring rotate via AnimeJS
    const ringAnim = animate(ringRef.current, {
      rotate: '360deg',
      duration: 18000,
      loop: true,
      ease: 'linear',
    })

    // Animate orbiting particles
    let particleAnim: ReturnType<typeof animate> | null = null
    if (particlesRef.current) {
      const dots = particlesRef.current.querySelectorAll('.orbit-dot')
      if (dots.length > 0) {
        particleAnim = animate(dots, {
          scale: [0.8, 1.3, 0.8],
          opacity: [0.3, 1, 0.3],
          duration: 2400,
          loop: true,
          delay: (_target: unknown, i: number = 0) => i * 400,
          ease: 'easeInOutQuad',
        })
      }
    }

    return () => {
      try {
        ringAnim?.pause()
        particleAnim?.pause()
      } catch {
        // cleanup safe
      }
    }
  }, [showOrbits])

  const sizeClasses = {
    sm: 'max-h-[220px] sm:max-h-[260px]',
    md: 'max-h-[300px] sm:max-h-[360px]',
    lg: 'max-h-[380px] sm:max-h-[460px]',
  }[size]

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative flex flex-col items-center justify-center select-none perspective-[1000px] overflow-visible',
        className
      )}
    >
      {/* Orbiting Tech Rings in Dim Slate (AnimeJS Target) */}
      {showOrbits && (
        <div
          ref={ringRef}
          className="absolute size-[320px] sm:size-[420px] rounded-full border border-slate-400/20 dark:border-slate-700/30 pointer-events-none -z-10 [border-style:dashed]"
        >
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 size-2.5 rounded-full bg-[#375a8a]/60" />
          <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 size-2 rounded-full bg-slate-300 dark:bg-slate-600" />
          <div className="absolute -bottom-1 left-1/3 size-2 rounded-full bg-[#375a8a]/50" />
        </div>
      )}

      {/* Orbiting Particle Dots Container */}
      {showOrbits && (
        <div ref={particlesRef} className="absolute inset-0 pointer-events-none -z-10">
          <div className="orbit-dot absolute top-[18%] left-[15%] size-1.5 rounded-full bg-[#375a8a]/40" />
          <div className="orbit-dot absolute top-[28%] right-[12%] size-2 rounded-full bg-slate-300/60 dark:bg-slate-600/60" />
          <div className="orbit-dot absolute bottom-[22%] left-[18%] size-1.5 rounded-full bg-[#375a8a]/40" />
          <div className="orbit-dot absolute bottom-[30%] right-[16%] size-1.5 rounded-full bg-slate-400/30" />
        </div>
      )}

      {/* Status Pill Badge Floating Above - Dim Subdued Colors */}
      {badgeText && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={cn(
            'mb-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold shadow-xs z-20 transition-colors',
            isDark
              ? 'bg-[#0e1629] border-slate-700/60 text-slate-300'
              : 'bg-white border-slate-200 text-slate-700'
          )}
        >
          <Sparkles className="size-3.5 text-[#375a8a] dark:text-[#8ea9d4]" />
          <span>{badgeText}</span>
          <span className="flex size-1.5 rounded-full bg-[#375a8a]" />
        </motion.div>
      )}

      {/* Levitating 3D Robot Mascot (Framer Motion Tilt & Levitation) */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        animate={{
          y: [-8, 8, -8],
          rotateZ: [-1, 1, -1],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative z-10 flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        {/* Transparent Robot Cutout Asset - mascot1 (docs/folder) or mascot2 (peace sign) */}
        <img
          src={
            mascot === '1' || mascot === 'mascot1'
              ? '/img/theme/mascot1.webp'
              : mascot === '2' || mascot === 'mascot2'
              ? '/img/theme/mascot2.webp'
              : variant === 'pedestal'
              ? '/img/theme/mascot1.webp'
              : '/img/theme/mascot2.webp'
          }
          alt="Aqivo Autonomous AI & Engineering Mascot"
          className={cn(
            'w-auto object-contain drop-shadow-[0_12px_24px_rgba(15,23,42,0.18)] transition-all duration-300 hover:scale-105',
            sizeClasses
          )}
        />

        {/* Floating Interactive HUD Tags */}
        <motion.div
          animate={{ y: [4, -4, 4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className={cn(
            'absolute -top-2 -right-4 sm:-right-8 hidden xs:flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-mono shadow-xs transition-colors',
            isDark ? 'border-slate-800 bg-[#0e1629] text-slate-300' : 'border-slate-200 bg-white text-slate-700'
          )}
        >
          <Cpu className="size-3 text-[#375a8a] dark:text-[#8ea9d4]" />
          <span>v3.8 Scaled Architecture</span>
        </motion.div>

        <motion.div
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className={cn(
            'absolute bottom-10 -left-4 sm:-left-8 hidden xs:flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-mono shadow-xs transition-colors',
            isDark ? 'border-slate-800 bg-[#0e1629] text-slate-300' : 'border-slate-200 bg-white text-slate-700'
          )}
        >
          <Activity className="size-3 text-emerald-600 dark:text-emerald-400" />
          <span>Zero Tech Debt</span>
        </motion.div>
      </motion.div>

      {/* Floating Floor Pedestal Shadow & Pulse - Dim Solid Tone */}
      {variant === 'pedestal' && (
        <div className="relative -mt-6 sm:-mt-10 flex flex-col items-center">
          {/* Shadow Ellipse */}
          <motion.div
            animate={{
              scale: [0.9, 1.1, 0.9],
              opacity: [0.15, 0.3, 0.15],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="w-48 sm:w-64 h-3.5 rounded-full bg-slate-900/20 dark:bg-black/50 blur-xs -z-10"
          />

          {/* Cybernetic Pedestal Base */}
          <div
            className={cn(
              'mt-1 flex items-center gap-2.5 px-4 py-1 rounded-full border text-[11px] font-mono transition-colors',
              isDark ? 'bg-[#0e1629] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-xs'
            )}
          >
            <Zap className="size-3 text-[#375a8a] dark:text-[#8ea9d4]" />
            <span>High Concurrency Engine</span>
          </div>
        </div>
      )}
    </div>
  )
}
