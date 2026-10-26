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

/** A confirmation: question as the title, consequence underneath, actions bottom-right. */
export function DialogContent({
  title,
  description,
  children,
  actions,
  className,
}: {
  title: string
  description?: string
  children?: ReactNode
  /** Buttons for the bottom row. Defaults to a single Close. */
  actions?: ReactNode
  className?: string
}) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/55 transition-ui data-ending-style:opacity-0 data-starting-style:opacity-0 modern:bg-ink/35" />
      <BaseDialog.Popup
        className={cn(
          'fixed top-1/2 left-1/2 z-50 w-[min(100%-2rem,23rem)] -translate-x-1/2 -translate-y-1/2 rounded-card border-ui border-border bg-canvas-elevated p-6 pb-5 shadow-sheet outline-none',
          'transition-ui duration-slow data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
          'modern:border-transparent',
          className,
        )}
      >
        <BaseDialog.Title className="text-display text-[1.375rem] leading-tight text-ink">
          {title}
        </BaseDialog.Title>
        {description ? (
          <BaseDialog.Description className="mt-1.5 text-[0.9375rem] text-ink-muted">
            {description}
          </BaseDialog.Description>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-6 flex justify-end gap-2">
          {actions ?? (
            <BaseDialog.Close className="press inline-flex h-11 items-center rounded-pill px-4 text-sm font-semibold text-ink-muted hover:bg-surface-hover hover:text-ink">
              Close
            </BaseDialog.Close>
          )}
        </div>
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  )
}

export const DialogClose = BaseDialog.Close
