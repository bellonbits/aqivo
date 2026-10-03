import { cn } from '@/lib/cn'
import { AqivoLogo } from '@/components/common/AqivoLogo'

export { AqivoLogo }

/**
 * Platform brand logo component for Aqivo.
 * Renders the official Aqivo logo with transparent background, supporting light/dark themes.
 */
export function Logo({
  className,
  dark = false,
  variant = 'full',
  size = 'md',
}: {
  className?: string
  dark?: boolean
  variant?: 'full' | 'mark' | 'wordmark'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <AqivoLogo variant={variant} theme={dark ? 'dark' : 'light'} size={size} />
    </span>
  )
}

export default Logo
