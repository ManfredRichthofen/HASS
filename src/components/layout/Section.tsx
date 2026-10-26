import type { ReactNode } from 'react'
import { cn } from '#/lib/cn'
import { m, staggerItem } from '#/lib/motion'

/**
 * A titled block on a page. Walnut: italic serif title. Modern: small
 * semibold label. Brutalist: a 2px rule and a mono uppercase label.
 *
 * When nested under a staggerContainer parent, sections rise in sequence.
 */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <m.section variants={staggerItem} className={cn('min-w-0', className)}>
      {(title || action) && (
        <div className="mb-2.5 flex min-h-9 items-end justify-between gap-3">
          {title ? (
            <h2
              className={cn(
                'text-ink',
                'walnut:font-serif walnut:text-xl walnut:italic',
                'modern:text-[0.8125rem] modern:font-semibold modern:text-ink-muted',
                'glass:text-base glass:font-semibold glass:text-ink',
              )}
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action ? <div className="text-sm font-semibold text-ink-muted">{action}</div> : null}
        </div>
      )}
      {children}
    </m.section>
  )
}
