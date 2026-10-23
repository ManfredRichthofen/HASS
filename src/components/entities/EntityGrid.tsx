import type { ReactNode } from 'react'
import { cn } from '#/lib/cn'

/**
 * Square tiles. Column count follows the grid's own width (container query),
 * so tiles stay a comfortable size in a phone column, a tablet half-column or
 * a full tablet row.
 */
export function EntityGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="@container">
      <div
        className={cn(
          'grid grid-cols-2 gap-3 @md:grid-cols-3 @2xl:grid-cols-4 @5xl:grid-cols-5 [&>*]:min-w-0',
          'brutal:gap-0 brutal:pt-0.5 brutal:pl-0.5 brutal:[&>*]:-mt-0.5 brutal:[&>*]:-ml-0.5 brutal:[&>*]:shadow-none!',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
