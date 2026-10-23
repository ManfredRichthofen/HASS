import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '#/lib/cn'

/**
 * Everything that isn't a light, as one grouped list with hairline dividers.
 * Brutalist numbers the rows 01, 02, 03.
 */
export function DeviceList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'card grid grid-cols-[minmax(0,1fr)] pr-1.5 pl-4.5',
        'brutal:[counter-reset:device] brutal:border-ink',
        className,
      )}
    >
      {children}
    </div>
  )
}

export type DeviceTone = 'neutral' | 'success' | 'danger' | 'info' | 'light'

const toneClass: Record<DeviceTone, string> = {
  neutral: 'text-ink-muted',
  success: 'text-success',
  danger: 'text-danger',
  info: 'text-info',
  light: 'text-light',
}

/** One row: icon well, name, a short state line, and the control that fits the device. */
export function DeviceRow({
  icon: Icon,
  name,
  caption,
  tone = 'neutral',
  trailing,
  unavailable,
  className,
}: {
  icon: LucideIcon
  name: ReactNode
  caption?: ReactNode
  tone?: DeviceTone
  trailing?: ReactNode
  unavailable?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-17 items-center gap-4 border-b border-border-subtle py-2.5 last:border-b-0',
        'brutal:border-b-2 brutal:border-ink brutal:last:border-b-0',
        'brutal:before:w-5 brutal:before:shrink-0 brutal:before:font-label brutal:before:text-xs brutal:before:[counter-increment:device] brutal:before:content-[counter(device,decimal-leading-zero)]',
        unavailable && 'opacity-45',
        className,
      )}
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-control bg-icon-well',
          'modern:w-7 modern:bg-transparent',
          'brutal:border-2 brutal:border-ink brutal:bg-surface',
          'glass:rounded-pill glass:bg-raised glass:shadow-card',
          toneClass[tone],
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] leading-5 font-semibold text-ink">
          {name}
        </span>
        {caption ? (
          <span className="block truncate text-[0.8125rem] leading-[1.125rem] text-ink-muted first-letter:uppercase brutal:font-label brutal:text-xs">
            {caption}
          </span>
        ) : null}
      </span>
      {trailing}
    </div>
  )
}

/** Inline content for a row that opens something: a quiet chevron target. */
export function RowChevron({ children }: { children: ReactNode }) {
  return <span className="grid size-11 shrink-0 place-items-center text-ink-faint">{children}</span>
}
