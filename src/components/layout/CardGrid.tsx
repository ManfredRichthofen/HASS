import type { ReactNode } from 'react'
import { cn } from '#/lib/cn'

/**
 * Wide-card list: one column on phones, two from md. A lone trailing card
 * spans the full row so odd counts never leave a hole.
 */
export function CardGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2 [&>*]:min-w-0 md:[&>*:last-child:nth-child(odd)]:col-span-2',
        className,
      )}
    >
      {children}
    </div>
  )
}
