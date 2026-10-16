import { Input as BaseInput } from '@base-ui/react/input'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/cn'

export function Input({
  className,
  ...props
}: ComponentProps<typeof BaseInput>) {
  return (
    <BaseInput
      className={cn(
        'h-12 w-full rounded-xl border border-border-subtle bg-surface px-4 text-sm text-ink outline-none transition',
        'placeholder:text-ink-faint',
        'focus:border-accent/50 focus:ring-2 focus:ring-accent/20',
        'disabled:opacity-40',
        className,
      )}
      {...props}
    />
  )
}
