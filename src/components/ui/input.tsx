import { Input as BaseInput } from '@base-ui/react/input'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/cn'

export function Input({ className, ...props }: ComponentProps<typeof BaseInput>) {
  return (
    <BaseInput
      className={cn(
        'h-12 w-full rounded-pill border-ui border-border-subtle bg-surface px-5 text-[0.9375rem] text-ink outline-none transition-ui',
        'placeholder:text-ink-faint focus:border-accent focus:ring-3 focus:ring-accent-soft',
        'modern:border-transparent brutal:border-ink brutal:focus:ring-0',
        'disabled:opacity-40',
        className,
      )}
      {...props}
    />
  )
}
