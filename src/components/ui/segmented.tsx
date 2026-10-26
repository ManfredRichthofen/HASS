import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { useId } from 'react'
import { cn } from '#/lib/cn'
import { fluid, LayoutGroup, m } from '#/lib/motion'

export type SegmentOption<T extends string> = { value: T; label: string; disabled?: boolean }

/**
 * One choice from two to five, side by side. Walnut: the chosen segment fills
 * cream. Modern: it lifts as a white chip. Brutalist: a ruled bar with the
 * chosen cell inverted. The active pill slides with a shared layout spring.
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
  const layoutId = `segmented-${useId()}`

  return (
    <LayoutGroup id={layoutId}>
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
          disabled && 'opacity-40',
          className,
        )}
      >
        {options.map((o) => {
          const pressed = value === o.value
          return (
            <Toggle
              key={o.value}
              value={o.value}
              disabled={o.disabled}
              className={cn(
                'relative min-h-11 flex-1 cursor-pointer rounded-pill px-3.5 text-sm font-semibold whitespace-nowrap capitalize transition-ui',
                pressed ? 'text-on-accent' : 'text-ink-muted hover:text-ink',
                'modern:data-pressed:text-ink',
                'glass:data-pressed:text-on-raised',
              )}
            >
              {pressed ? (
                <m.span
                  layoutId={layoutId}
                  transition={fluid}
                  aria-hidden
                  className={cn(
                    'absolute inset-0 rounded-pill bg-accent',
                    'modern:bg-surface modern:shadow-[0_1px_3px_#14141326]',
                    'glass:bg-raised glass:shadow-card',
                  )}
                />
              ) : null}
              <span className="relative z-[1]">{o.label}</span>
            </Toggle>
          )
        })}
      </ToggleGroup>
    </LayoutGroup>
  )
}
