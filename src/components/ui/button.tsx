import { Button as BaseButton } from '@base-ui/react/button'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/cn'

/**
 * `primary` is the ink colour used as a fill (choice = inversion).
 * `accent` is kept as an alias of `primary` for older call sites.
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-strong',
  accent: 'bg-accent text-on-accent hover:bg-accent-strong',
  secondary: 'border-ui border-border bg-transparent text-ink hover:bg-surface-hover',
  ghost: 'bg-transparent text-ink-muted shadow-none! hover:bg-surface-hover hover:text-ink',
  danger: 'border-ui border-danger/45 bg-transparent text-danger hover:bg-danger/10',
}

const sizes: Record<Size, string> = {
  sm: 'h-11 px-4 text-sm gap-1.5',
  md: 'h-12 px-5 text-[0.9375rem] gap-2',
  lg: 'h-13 px-6 text-base gap-2',
  icon: 'size-12 p-0',
}

export function Button({
  className,
  variant = 'secondary',
  size = 'md',
  ...props
}: ComponentProps<typeof BaseButton> & {
  variant?: Variant
  size?: Size
}) {
  return (
    <BaseButton
      className={cn(
        'press inline-flex shrink-0 items-center justify-center rounded-pill font-semibold whitespace-nowrap select-none',
        'disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
