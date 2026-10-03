import { cn } from '@/lib/cn'
import { brand } from '@/config/brand'

export interface AqivoLogoProps {
  variant?: 'full' | 'mark' | 'wordmark'
  theme?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showDomain?: boolean
}

export function AqivoLogo({
  variant = 'full',
  theme = 'light',
  size = 'md',
  className,
  showDomain = false,
}: AqivoLogoProps) {
  // Size classes
  const heights = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
    xl: 'h-12',
  }

  const markHeights = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-12 w-12',
  }

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }

  const isDark = theme === 'dark'

  if (variant === 'mark') {
    return (
      <img
        src={brand.assets.mark}
        alt={brand.name}
        className={cn('inline-block object-contain select-none', markHeights[size], className)}
      />
    )
  }

  if (variant === 'full') {
    const logoSrc = isDark ? brand.assets.logoWhite : brand.assets.logo
    return (
      <img
        src={logoSrc}
        alt={brand.fullName}
        className={cn('inline-block object-contain select-none w-auto', heights[size], className)}
      />
    )
  }

  // Variant === 'wordmark'
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-bold tracking-tight select-none', textSizes[size], className)}>
      <span className={isDark ? 'text-white' : 'text-[#0B1736]'}>Aqivo</span>
      {showDomain && (
        <span className="text-[#5B21F5] font-extrabold text-[0.85em]">.shop</span>
      )}
    </span>
  )
}
