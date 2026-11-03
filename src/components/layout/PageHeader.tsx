import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '#/lib/cn'
import { m, staggerItem } from '#/lib/motion'

/** A page's title block: optional back link, a large display title, a muted line, one action. */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
  backTo,
  backLabel = 'Back',
  backClassName,
  className,
  children,
}: {
  title: string
  subtitle?: ReactNode
  /** Small label above the title ("6 rooms"). */
  eyebrow?: ReactNode
  action?: ReactNode
  backTo?: '/rooms' | '/' | '/climate' | '/media' | '/security' | '/settings'
  backLabel?: string
  backClassName?: string
  className?: string
  /** Extra content under the subtitle (readings, actions). */
  children?: ReactNode
}) {
  return (
    <m.header
      variants={staggerItem}
      className={cn(
        'grid gap-3 pt-[max(0.5rem,env(safe-area-inset-top))] md:gap-2 md:pt-[max(0rem,env(safe-area-inset-top))]',
        className,
      )}
    >
      {backTo ? (
        <Link
          to={backTo}
          aria-label={`Back to ${backLabel}`}
          className={cn(
            '-mb-1 inline-flex min-h-11 items-center gap-1.5 justify-self-start text-sm font-semibold text-ink-muted transition-ui hover:text-ink md:hidden',
            backClassName,
          )}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {backLabel}
        </Link>
      ) : null}
      <div className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          {backTo ? (
            <Link
              to={backTo}
              aria-label={`Back to ${backLabel}`}
              className={cn(
                'hidden size-11 shrink-0 place-items-center rounded-pill text-ink-muted transition-ui hover:bg-surface-hover hover:text-ink md:-ml-2 md:grid',
                backClassName,
              )}
            >
              <ArrowLeft className="size-5" aria-hidden />
            </Link>
          ) : null}
          <div className="min-w-0">
          {eyebrow ? <div className="text-label mb-1.5">{eyebrow}</div> : null}
          <h1 className="text-display text-[2.25rem] leading-[1.02] text-ink md:text-[2rem] walnut:font-light">
            {title}
          </h1>
          {subtitle ? (
            <div className="mt-2 text-[0.9375rem] text-ink-muted md:mt-1">{subtitle}</div>
          ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </m.header>
  )
}
