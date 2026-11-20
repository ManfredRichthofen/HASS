import { useEffect, useState } from 'react'

/** Run `cb` once the browser is idle after first paint (timeout keeps it from starving). */
export function onIdle(cb: () => void, timeout = 2_000): () => void {
  if (typeof window === 'undefined') return () => {}
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(cb, { timeout })
    return () => window.cancelIdleCallback(id)
  }
  const id = setTimeout(cb, 200)
  return () => clearTimeout(id)
}

/** False on first render, true once the browser has been idle — for mounting non-critical UI. */
export function useIdle(timeout?: number): boolean {
  const [idle, setIdle] = useState(false)
  useEffect(() => onIdle(() => setIdle(true), timeout), [timeout])
  return idle
}
