import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge needs to know the theme's custom utilities, otherwise it
 * mistakes e.g. `border-ui` (a width) for a border colour and drops it when a
 * real colour follows, or merges `text-display` with `text-ink`.
 */
const twMerge = extendTailwindMerge<'theme-type' | 'lit-fill'>({
  extend: {
    classGroups: {
      'border-w': ['border-ui'],
      shadow: [{ shadow: ['card', 'on', 'sheet', 'press'] }],
      rounded: [{ rounded: ['card', 'control', 'pill', 'sheet'] }],
      'theme-type': ['text-display', 'text-label'],
      'lit-fill': ['bg-on'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
