import { Progress as BaseProgress } from '@base-ui/react/progress'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/cn'

export function Progress({ className, value, ...props }: ComponentProps<typeof BaseProgress.Root>) {
  return (
    <BaseProgress.Root className={cn('grid gap-1', className)} value={value} {...props}>
      <BaseProgress.Track className="h-1.5 overflow-hidden rounded-pill bg-surface-hover brutal:h-2.5 brutal:border-2 brutal:border-ink">
        <BaseProgress.Indicator className="h-full rounded-pill bg-accent transition-[width] duration-slow" />
      </BaseProgress.Track>
    </BaseProgress.Root>
  )
}
