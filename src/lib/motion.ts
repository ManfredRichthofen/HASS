export type { Transition, Variants } from 'motion/react'
export {
  AnimatePresence,
  domAnimation,
  LayoutGroup,
  LazyMotion,
  MotionConfig,
  m,
  motion,
} from 'motion/react'

/** Shared ease-out curve — matches CSS `--ease-out` */
export const easeOut = [0.22, 1, 0.36, 1] as const
export const easeIn = [0.4, 0, 1, 1] as const

/** Fast tap / press feedback */
export const snappy = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 32,
  mass: 0.7,
}

/** Layout expand/collapse (dimmers, fan controls) */
export const soft = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 34,
  mass: 0.85,
}

/** Bottom-nav active indicator */
export const indicator = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 36,
  mass: 0.8,
}

/**
 * Press feedback scales — pass to `whileTap`.
 * soft: large cards / rows · medium: chips / tiles · hard: icon buttons
 */
export const tap = {
  soft: { scale: 0.98 },
  medium: { scale: 0.97 },
  hard: { scale: 0.92 },
} as const

export const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: { duration: 0.22, ease: easeOut },
}

export const pageFade = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.16, ease: easeOut },
}

/** Floating sheet / now-playing bar entrance */
export const slideUp = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 16, scale: 0.97 },
  transition: soft,
}

/** Label / status text swap (AnimatePresence mode="popLayout") */
export const swapText = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.16, ease: easeOut },
}

/** Icon / control crossfade (play↔pause) */
export const swapIcon = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.85 },
  transition: snappy,
}

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0,
    },
  },
}

export const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: easeOut },
  },
}

export const expandCollapse = {
  initial: { opacity: 0, height: 0 },
  animate: {
    opacity: 1,
    height: 'auto' as const,
    transition: soft,
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.16, ease: easeIn },
  },
}
