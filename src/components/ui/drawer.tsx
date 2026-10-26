import { Drawer as BaseDrawer } from '@base-ui/react/drawer'
import type { ReactNode } from 'react'
import { cn } from '#/lib/cn'

export function Drawer({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <BaseDrawer.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </BaseDrawer.Root>
  )
}

/**
 * The bottom sheet behind every tile: a device's full controls.
 * Walnut: attached to the bottom edge. Modern: a floating card inset from the
 * edges. Brutalist: square, ruled, over a hatched scrim.
 */
export function DrawerContent({
  title,
  description,
  children,
  className,
}: {
  title?: string
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <BaseDrawer.Portal>
      <BaseDrawer.Backdrop className="fixed inset-0 z-50 bg-black/55 transition-ui data-ending-style:opacity-0 data-starting-style:opacity-0 modern:bg-ink/30" />
      <BaseDrawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center modern:p-2.5 glass:p-2.5 sm:p-4">
        <BaseDrawer.Popup
          className={cn(
            'relative flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-sheet border-ui border-b-0 border-border bg-canvas-elevated shadow-sheet outline-none',
            'modern:rounded-[1.75rem] modern:border-0 glass:rounded-[2rem] glass:border-b',
            'sm:rounded-b-sheet sm:border-b',
            'transition-ui duration-slow data-ending-style:translate-y-8 data-ending-style:opacity-0 data-starting-style:translate-y-8 data-starting-style:opacity-0',
            'pb-[max(1.5rem,env(safe-area-inset-bottom))] modern:pb-6 glass:pb-6',
            className,
          )}
        >
          <div className="mx-auto mt-3 h-1 w-9 rounded-pill bg-border-strong" />
          {(title || description) && (
            <div className="px-6 pt-5 pb-2">
              {title ? (
                <BaseDrawer.Title className="text-display text-2xl leading-tight text-ink">
                  {title}
                </BaseDrawer.Title>
              ) : null}
              {description ? (
                <BaseDrawer.Description className="mt-1 text-sm text-ink-muted">
                  {description}
                </BaseDrawer.Description>
              ) : null}
            </div>
          )}
          <BaseDrawer.Content className="overflow-y-auto px-6 pt-3 pb-2">
            {children}
          </BaseDrawer.Content>
        </BaseDrawer.Popup>
      </BaseDrawer.Viewport>
    </BaseDrawer.Portal>
  )
}
