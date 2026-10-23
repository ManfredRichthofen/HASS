import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { cn } from '#/lib/cn'

export type SegmentOption<T extends string> = { value: T; label: string; disabled?: boolean }

/**
 * One choice from two to five, side by side. Walnut: the chosen segment fills
 * cream. Modern: it lifts as a white chip. Brutalist: a ruled bar with the
 * chosen cell inverted.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled,
  className,
}: {
  options: readonly SegmentOption<T>[]
  value: T | null
  onChange: (value: T) => void
  label: string
  disabled?: boolean
  className?: string
}) {
  return (
    <ToggleGroup
      aria-label={label}
      value={value ? [value] : []}
      onValueChange={(next) => {
        const picked = next[0] as T | undefined
        if (picked) onChange(picked)
      }}
      disabled={disabled}
      className={cn(
        'flex gap-1 rounded-pill bg-surface-hover p-1',
        'brutal:gap-0 brutal:border-2 brutal:border-ink brutal:bg-surface brutal:p-0',
        disabled && 'opacity-40',
        className,
      )}
    >
      {options.map((o) => (
        <Toggle
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          className={cn(
            'min-h-10 flex-1 cursor-pointer rounded-pill px-3.5 text-sm font-semibold whitespace-nowrap text-ink-muted capitalize transition-ui',
            'hover:text-ink data-pressed:bg-accent data-pressed:text-on-accent',
            'modern:data-pressed:bg-surface modern:data-pressed:text-ink modern:data-pressed:shadow-[0_1px_3px_#14141326]',
            'glass:data-pressed:bg-raised glass:data-pressed:text-on-raised glass:data-pressed:shadow-card',
            'brutal:min-h-11 brutal:font-label brutal:text-xs brutal:font-medium brutal:uppercase brutal:tracking-[0.04em] brutal:text-ink brutal:not-first:border-l-2 brutal:not-first:border-ink',
          )}
        >
          {o.label}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}
