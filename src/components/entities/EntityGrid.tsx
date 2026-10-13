import type { ReactNode } from 'react'
import { cn } from '#/lib/cn'

export function EntityGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4',
        className,
      )}
    >
      {children}
    </div>
  )
}
