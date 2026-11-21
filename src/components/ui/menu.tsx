import { Menu as BaseMenu } from '@base-ui/react/menu'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '#/lib/cn'

export const Menu = BaseMenu.Root
export const MenuTrigger = BaseMenu.Trigger

/** A small action list that floats over sheets (z-55: above drawers, below toasts). */
export function MenuContent({
  children,
  className,
  align = 'end',
}: {
  children: ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
}) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner className="z-[55] outline-none" sideOffset={6} align={align}>
        <BaseMenu.Popup
          className={cn(
            'min-w-[13rem] origin-[var(--transform-origin)] overflow-hidden rounded-control border-ui border-border bg-canvas-elevated p-1 shadow-sheet outline-none',
            'transition-[opacity,scale] duration-fast data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
            'motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100',
            className,
          )}
        >
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  )
}

export function MenuItem({ className, ...props }: ComponentProps<typeof BaseMenu.Item>) {
  return (
    <BaseMenu.Item
      className={cn(
        'flex min-h-11 cursor-pointer items-center gap-3 rounded-[0.75rem] px-3 text-[0.9375rem] font-medium text-ink outline-none select-none',
        'data-highlighted:bg-surface-hover data-disabled:opacity-40 [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-ink-muted',
        className,
      )}
      {...props}
    />
  )
}
