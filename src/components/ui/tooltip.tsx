import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import type { ReactElement, ReactNode } from 'react'
import { cn } from '#/lib/cn'

export function Tooltip({
  content,
  children,
  className,
}: {
  content: ReactNode
  children: ReactElement
  className?: string
}) {
  return (
    <BaseTooltip.Provider>
      <BaseTooltip.Root>
        <BaseTooltip.Trigger render={children} />
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner sideOffset={6}>
            <BaseTooltip.Popup
              className={cn(
                'rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink shadow-lg',
                'data-ending-style:opacity-0 data-starting-style:opacity-0',
                className,
              )}
            >
              {content}
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  )
}
