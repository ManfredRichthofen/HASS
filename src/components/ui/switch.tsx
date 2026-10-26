import { Switch as BaseSwitch } from '@base-ui/react/switch'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/cn'

/** Pill toggle for plain on/off devices. Lights never use this — the LightTile is the switch. */
export function Switch({ className, ...props }: ComponentProps<typeof BaseSwitch.Root>) {
  return (
    <BaseSwitch.Root
      className={cn(
        'group relative inline-grid h-11 w-15 shrink-0 cursor-pointer place-items-center',
        'disabled:cursor-default disabled:opacity-40',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          'h-8 w-13 rounded-pill border-ui border-border-strong bg-transparent transition-[background-color,border-color] duration-normal',
          'group-data-checked:border-accent group-data-checked:bg-accent',
          'glass:border-transparent glass:bg-ink/10 glass:group-data-checked:border-white glass:group-data-checked:bg-white glass:group-data-checked:shadow-card',
        )}
      />
      <BaseSwitch.Thumb
        className={cn(
          'absolute top-1/2 left-1/2 -mt-[11px] -ml-[21px] size-[22px] rounded-pill bg-border-strong',
          'transition-[transform,background-color] duration-[260ms] ease-spring',
          'data-checked:translate-x-5 data-checked:bg-on-accent',
          'glass:bg-white glass:data-checked:bg-[#141a2e] forest:data-checked:bg-[#10241d]',
        )}
      />
    </BaseSwitch.Root>
  )
}
