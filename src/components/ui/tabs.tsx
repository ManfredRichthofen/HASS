import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/cn'

export function Tabs(props: ComponentProps<typeof BaseTabs.Root>) {
  return <BaseTabs.Root {...props} />
}

/** Tabs share the Segmented look. */
export function TabsList({ className, ...props }: ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      className={cn(
        'relative flex gap-1 rounded-pill bg-surface-hover p-1',
        'brutal:gap-0 brutal:border-2 brutal:border-ink brutal:bg-surface brutal:p-0',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTab({ className, ...props }: ComponentProps<typeof BaseTabs.Tab>) {
  return (
    <BaseTabs.Tab
      className={cn(
        'touch-target flex flex-1 items-center justify-center gap-2 rounded-pill px-3 text-sm font-semibold text-ink-muted transition-ui',
        'hover:text-ink data-active:bg-accent data-active:text-on-accent',
        'modern:data-active:bg-surface modern:data-active:text-ink modern:data-active:shadow-[0_1px_3px_#14141326]',
        'glass:data-active:bg-raised glass:data-active:text-on-raised glass:data-active:shadow-card',
        'brutal:font-label brutal:text-xs brutal:font-medium brutal:uppercase brutal:text-ink brutal:not-first:border-l-2 brutal:not-first:border-ink',
        className,
      )}
      {...props}
    />
  )
}

export function TabsPanel({ className, ...props }: ComponentProps<typeof BaseTabs.Panel>) {
  return <BaseTabs.Panel className={cn('outline-none', className)} {...props} />
}
