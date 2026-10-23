import { type MouseEvent, type PointerEvent, useRef } from 'react'

/** Pixels of movement before a press is treated as a scroll/drag and cancelled. */
export const SCROLL_PRESS_THRESHOLD = 10

type ScrollSafePressHandlers = {
  onPointerDown: (e: PointerEvent<HTMLElement>) => void
  onPointerMove: (e: PointerEvent<HTMLElement>) => void
  onPointerCancel: () => void
  onClick: (e: MouseEvent<HTMLElement>) => void
}

/**
 * Ignores clicks that follow a scroll/drag: if the pointer moves more than
 * {@link SCROLL_PRESS_THRESHOLD}px before release, `onPress` does not run.
 * Spread the returned handlers onto buttons (and keep keyboard handlers separate).
 */
export function useScrollSafePress(
  onPress: () => void,
  threshold = SCROLL_PRESS_THRESHOLD,
): ScrollSafePressHandlers {
  const start = useRef<{ x: number; y: number } | null>(null)
  const cancelled = useRef(false)
  const onPressRef = useRef(onPress)
  onPressRef.current = onPress

  return {
    onPointerDown: (e) => {
      start.current = { x: e.clientX, y: e.clientY }
      cancelled.current = false
    },
    onPointerMove: (e) => {
      if (!start.current || cancelled.current) return
      const dx = e.clientX - start.current.x
      const dy = e.clientY - start.current.y
      if (dx * dx + dy * dy >= threshold * threshold) cancelled.current = true
    },
    onPointerCancel: () => {
      start.current = null
      cancelled.current = true
    },
    onClick: (e) => {
      if (cancelled.current) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      onPressRef.current()
    },
  }
}
