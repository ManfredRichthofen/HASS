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

export const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
}

export const pageFade = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.14, ease: [0.22, 1, 0.36, 1] as const },
}

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.025,
      delayChildren: 0,
    },
  },
}

export const staggerItem = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const },
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
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] as const },
  },
}
