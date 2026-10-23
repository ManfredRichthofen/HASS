export type { Transition, Variants } from 'motion/react'
export {
  AnimatePresence,
  domAnimation,
  domMax,
  LayoutGroup,
  LazyMotion,
  MotionConfig,
  m,
  motion,
} from 'motion/react'

/**
 * Motion system — keep CSS tokens in styles.css in sync:
 * `--ease-out`, `--ease-in`, `--duration-fast|normal|slow`
 *
 * Prefer these presets over one-off springs/durations so the app feels
 * like one continuous motion language.
 */

/** Shared ease curves — match CSS `--ease-out` / `--ease-in` */
export const easeOut = [0.22, 1, 0.36, 1] as const
export const easeIn = [0.4, 0, 1, 1] as const

/** Durations in seconds — match CSS `--duration-*` */
export const duration = {
  fast: 0.15,
  normal: 0.22,
  slow: 0.3,
} as const

/** Fast press / icon swaps — short travel, quick settle */
export const snappy = {
  type: 'spring' as const,
  stiffness: 480,
  damping: 34,
  mass: 0.65,
}

/** Sheets, expand/collapse, floating chrome — buttery, low bounce */
export const soft = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 36,
  mass: 0.9,
}

/** Shared layout morphs (nav pills, segmented, indicators) */
export const fluid = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 38,
  mass: 0.8,
}

/** Alias used by nav indicators — same as fluid for one language */
export const indicator = fluid

/**
 * Press feedback scales — pass to `whileTap`.
 * soft: large cards / rows · medium: chips / tiles · hard: icon buttons
 */
export const tap = {
  soft: { scale: 0.98 },
  medium: { scale: 0.97 },
  hard: { scale: 0.92 },
} as const

/**
 * Page route enter (AppShell AnimatedOutlet). Enter-only, opacity-only: no exit
 * (an exiting Outlet renders the new route, doubling the mount) and no
 * transform (page sections already rise via staggerItem).
 */
export const pageFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: duration.fast, ease: easeOut },
}

/** Generic fade-up for standalone entrances */
export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: { duration: duration.normal, ease: easeOut },
}

/** Floating sheet / now-playing bar entrance */
export const slideUp = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 16, scale: 0.97 },
  transition: soft,
}

/** Panel / tab content swap (Music segmented panels, etc.) */
export const panelFade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: duration.fast, ease: easeOut },
}

/** Label / status text swap (AnimatePresence mode="popLayout") */
export const swapText = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: duration.fast, ease: easeOut },
}

/** Icon / control crossfade (play↔pause) */
export const swapIcon = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.85 },
  transition: snappy,
}

/** Parent for staggered page sections / grids */
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.02,
    },
  },
}

/**
 * Child of staggerContainer — soft rise.
 * Opacity stays at 1 so nested pageFade + stagger don't multiply into a blank
 * flash (especially heavy pages like Climate).
 */
export const staggerItem = {
  initial: { y: 10 },
  animate: {
    y: 0,
    transition: { duration: duration.normal, ease: easeOut },
  },
}

/** Height auto expand/collapse (dimmers, fan controls) */
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
    transition: { duration: duration.fast, ease: easeIn },
  },
}
