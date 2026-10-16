import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import type { ReactNode } from 'react'
import { cn } from '#/lib/cn'

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </BaseDialog.Root>
  )
}

export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 bg-black/55 backdrop-blur-[2px] transition data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <BaseDialog.Popup
        className={cn(
          'fixed top-1/2 left-1/2 w-[min(100%-2rem,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-canvas-elevated p-5 shadow-2xl outline-none',
          'data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
          className,
        )}
      >
        <BaseDialog.Title className="font-display text-xl font-semibold text-ink">
          {title}
        </BaseDialog.Title>
        {description ? (
          <BaseDialog.Description className="mt-1 text-sm text-ink-muted">
            {description}
          </BaseDialog.Description>
        ) : null}
        <div className="mt-4">{children}</div>
        <div className="mt-4 flex justify-end">
          <BaseDialog.Close
            className="inline-flex h-9 items-center rounded-xl border border-border-subtle bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-hover"
          >
            Close
          </BaseDialog.Close>
        </div>
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  )
}
