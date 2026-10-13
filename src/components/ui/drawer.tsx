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

export function DrawerContent({
  title,
  description,
  children,
  className,
}: {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <BaseDrawer.Portal>
      <BaseDrawer.Backdrop className="fixed inset-0 bg-black/55 backdrop-blur-[2px] transition data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <BaseDrawer.Viewport className="fixed inset-0 flex items-end justify-center p-0 sm:items-end sm:p-4">
        <BaseDrawer.Popup
          className={cn(
            'relative flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl border border-border bg-canvas-elevated shadow-2xl outline-none',
            'transition duration-300 data-ending-style:translate-y-8 data-ending-style:opacity-0 data-starting-style:translate-y-8 data-starting-style:opacity-0',
            'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
            className,
          )}
        >
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border" />
          {(title || description) && (
            <div className="px-5 pb-2 pt-4">
              {title ? (
                <BaseDrawer.Title className="font-display text-xl font-semibold tracking-tight text-ink">
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
          <BaseDrawer.Content className="overflow-y-auto px-5 pb-2 pt-2">
            {children}
          </BaseDrawer.Content>
        </BaseDrawer.Popup>
      </BaseDrawer.Viewport>
    </BaseDrawer.Portal>
  )
}
