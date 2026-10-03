import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

// Hand variant (home page only): public/phone-frame.png, a hand holding a phone, 1000×960, screen cut out.
const IMG = { w: 1000, h: 960 }
const SCREEN = { left: 459.7, top: 17.1, w: 423.7, h: 891.9 }

// Standard iPhone 14 / 15 / 16 Viewport
export const IPHONE_W = 390
export const IPHONE_H = 844
export const IPHONE_RATIO = IPHONE_H / IPHONE_W // 2.1641

/** Pixel size of the usable screen when the frame is `width` px wide (for scaling embedded pages/iframes). */
export function phoneScreen(width: number = IPHONE_W) {
  return { w: width, h: width * IPHONE_RATIO }
}

type Props = {
  width?: number
  height?: number
  scale?: number
  children: ReactNode
  className?: string
  label?: string
  variant?: 'plain' | 'hand'
  time?: string
  statusBarTheme?: 'dark' | 'light'
}

/**
 * Pixel-perfect iPhone frame matching standard Apple viewport specifications (390×844)
 * with authentic metallic chassis, side buttons, dynamic island, status bar, and home indicator.
 */
export function PhoneFrame({
  width = IPHONE_W,
  height,
  scale = 1,
  children,
  className,
  label,
  variant = 'plain',
  time = '05:41',
  statusBarTheme = 'dark',
}: Props) {
  const a11y = { role: label ? ('img' as const) : undefined, 'aria-label': label }

  if (variant === 'hand') {
    const k = width / SCREEN.w
    const h = width * (SCREEN.h / SCREEN.w)
    return (
      <div
        className={cn('relative mx-auto', className)}
        style={{ width, height: h, marginBottom: (IMG.h - SCREEN.top - SCREEN.h) * k }}
        {...a11y}
      >
        <div className="absolute inset-0 overflow-hidden bg-white" style={{ borderRadius: width * 0.085 }}>
          {children}
        </div>
        <img
          src="/phone-frame.png"
          alt=""
          aria-hidden
          width={IMG.w}
          height={IMG.h}
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={{ left: -SCREEN.left * k, top: -SCREEN.top * k, width: IMG.w * k, height: IMG.h * k }}
        />
      </div>
    )
  }

  // Exact iPhone outer dimensions & proportions
  const screenW = width
  const screenH = height ?? width * IPHONE_RATIO
  const bezel = 12
  const rim = 3
  const totalW = screenW + 2 * (bezel + rim)
  const totalH = screenH + 2 * (bezel + rim)
  const outerRadius = 52
  const innerRadius = 42

  const isLightBar = statusBarTheme === 'light'
  const textColor = isLightBar ? '#111827' : '#ffffff'

  return (
    <div
      className={cn('relative select-none', className)}
      style={{
        width: totalW * scale,
        height: totalH * scale,
      }}
      {...a11y}
    >
      <div
        className="relative origin-top-left"
        style={{
          width: totalW,
          height: totalH,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
        }}
      >
        {/* Metal rim chassis with realistic specular reflection */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: outerRadius,
            background: 'linear-gradient(145deg, #f8fafc 0%, #cbd5e1 15%, #475569 35%, #1e293b 50%, #475569 65%, #cbd5e1 85%, #f8fafc 100%)',
            boxShadow: '0 32px 72px -16px rgba(15, 23, 42, 0.45), 0 12px 28px -8px rgba(15, 23, 42, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.55)',
          }}
        />

        {/* Inner black bezel */}
        <div
          className="absolute"
          style={{
            inset: rim,
            borderRadius: outerRadius - rim,
            background: '#09090b',
          }}
        />

        {/* Hardware side buttons */}
        {/* Left: Silent Switch */}
        <span
          aria-hidden
          className="absolute rounded-l-sm bg-slate-700 shadow-sm"
          style={{ left: -3, top: totalH * 0.16, width: 3.5, height: 26 }}
        />
        {/* Left: Volume Up */}
        <span
          aria-hidden
          className="absolute rounded-l-sm bg-slate-700 shadow-sm"
          style={{ left: -3, top: totalH * 0.23, width: 3.5, height: 48 }}
        />
        {/* Left: Volume Down */}
        <span
          aria-hidden
          className="absolute rounded-l-sm bg-slate-700 shadow-sm"
          style={{ left: -3, top: totalH * 0.31, width: 3.5, height: 48 }}
        />
        {/* Right: Power / Lock Button */}
        <span
          aria-hidden
          className="absolute rounded-r-sm bg-slate-700 shadow-sm"
          style={{ right: -3, top: totalH * 0.25, width: 3.5, height: 72 }}
        />

        {/* Antenna Lines */}
        <span aria-hidden className="absolute bg-slate-600/40" style={{ left: 0, top: totalH * 0.12, width: rim, height: 3 }} />
        <span aria-hidden className="absolute bg-slate-600/40" style={{ right: 0, top: totalH * 0.12, width: rim, height: 3 }} />
        <span aria-hidden className="absolute bg-slate-600/40" style={{ left: 0, bottom: totalH * 0.12, width: rim, height: 3 }} />
        <span aria-hidden className="absolute bg-slate-600/40" style={{ right: 0, bottom: totalH * 0.12, width: rim, height: 3 }} />

        {/* Usable Screen Viewport */}
        <div
          className="absolute overflow-hidden bg-white"
          style={{
            inset: bezel + rim,
            borderRadius: innerRadius,
            width: screenW,
            height: screenH,
          }}
        >
          {/* Web App / Children Content */}
          <div className="relative h-full w-full overflow-hidden bg-white">
            {children}
          </div>

          {/* Authentic iOS Status Bar Overlay */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-11 items-center justify-between px-6"
            style={{ color: textColor }}
          >
            {/* Time */}
            <span
              className="text-[13.5px] font-bold tracking-tight select-none"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
                textShadow: isLightBar ? 'none' : '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              {time}
            </span>

            {/* Dynamic Island / Notch */}
            <div
              className="absolute left-1/2 top-2.5 -translate-x-1/2 flex items-center justify-between px-3 bg-black rounded-full"
              style={{
                width: 114,
                height: 29,
                boxShadow: '0 2px 8px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.08)',
              }}
            >
              {/* Front Camera Lens */}
              <div className="relative size-2.5 rounded-full bg-[#0a0f24] ring-1 ring-blue-950 flex items-center justify-center">
                <span className="size-1 rounded-full bg-[#1e293b]" />
              </div>
              {/* FaceID / Proximity Sensor */}
              <div className="size-2 rounded-full bg-[#111113]" />
            </div>

            {/* Right Status Icons: Signal, WiFi, Battery */}
            <div
              className="flex items-center gap-1.5"
              style={{
                filter: isLightBar ? 'none' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
              }}
            >
              {/* Cellular 4 bars */}
              <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
                <rect x="0" y="8" width="3" height="3" rx="0.6" />
                <rect x="4.5" y="5.5" width="3" height="5.5" rx="0.6" />
                <rect x="9" y="3" width="3" height="8" rx="0.6" />
                <rect x="13.5" y="0.5" width="3" height="10.5" rx="0.6" />
              </svg>

              {/* Wi-Fi Icon */}
              <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
                <path d="M7.5 9.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zm3.8-3.2a5.4 5.4 0 0 0-7.6 0 .8.8 0 1 1-1.1-1.1 7 7 0 0 1 9.8 0 .8.8 0 1 1-1.1 1.1zm3-3a9.6 9.6 0 0 0-13.6 0 .8.8 0 0 1-1.1-1.1 11.2 11.2 0 0 1 15.8 0 .8.8 0 1 1-1.1 1.1z" />
              </svg>

              {/* Battery Indicator (Pill + Terminal + Fill) */}
              <div className="flex items-center">
                <div
                  className="relative h-3 w-6 rounded-[3.5px] border border-current p-[1.5px]"
                  style={{ opacity: 0.95 }}
                >
                  <div className="h-full w-full rounded-[1.5px] bg-current" />
                </div>
                <div className="h-1.5 w-0.5 rounded-r-[1px] bg-current opacity-80" />
              </div>
            </div>
          </div>

          {/* Bottom Home Indicator Bar */}
          <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center">
            <div
              className="h-1 w-36 rounded-full"
              style={{
                background: 'rgba(0, 0, 0, 0.35)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
