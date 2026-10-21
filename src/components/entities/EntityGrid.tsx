import type { ReactNode } from 'react'
import { cn } from '#/lib/cn'

export function EntityGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 md:gap-3 lg:grid-cols-4 [&>*]:min-w-0 [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1',
        className,
      )}
    >
      {children}
    </div>
  )
}
