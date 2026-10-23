import { Separator as BaseSeparator } from '@base-ui/react/separator'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/cn'

export function Separator({ className, ...props }: ComponentProps<typeof BaseSeparator>) {
  return (
    <BaseSeparator
      className={cn(
        'shrink-0 bg-border-subtle data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        'brutal:data-[orientation=horizontal]:h-0.5 brutal:data-[orientation=vertical]:w-0.5',
        className,
      )}
      {...props}
    />
  )
}
