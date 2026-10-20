import { Toggle as BaseToggle } from '@base-ui/react/toggle'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/cn'

export function Toggle({ className, ...props }: ComponentProps<typeof BaseToggle>) {
  return (
    <BaseToggle
      className={cn(
        'inline-flex h-11 items-center justify-center rounded-xl border border-border-subtle bg-surface px-3 text-sm font-medium text-ink-muted transition-ui',
        'hover:bg-surface-hover hover:text-ink',
        'data-pressed:border-accent/40 data-pressed:bg-accent-soft data-pressed:text-accent',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      )}
      {...props}
    />
  )
}
