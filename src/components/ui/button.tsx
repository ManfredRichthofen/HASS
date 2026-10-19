import { Button as BaseButton } from '@base-ui/react/button'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary: 'bg-surface-hover text-ink border border-border hover:bg-border active:scale-[0.98]',
  secondary:
    'bg-surface text-ink border border-border-subtle hover:border-border hover:bg-surface-hover',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-hover hover:text-ink',
  danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
  accent: 'bg-accent text-canvas font-semibold hover:bg-accent-strong active:scale-[0.98]',
}

const sizes: Record<Size, string> = {
  sm: 'h-11 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-base gap-2 rounded-xl',
  icon: 'size-11 rounded-xl inline-flex items-center justify-center',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ComponentProps<typeof BaseButton> & {
  variant?: Variant
  size?: Size
}) {
  return (
    <BaseButton
      className={cn(
        'inline-flex items-center justify-center font-medium transition select-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:opacity-40 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
