import { useSyncExternalStore } from 'react'

/**
 * Performance profile. `smooth` drops the expensive effects (backdrop blur, the drifting
 * background, large soft shadows, layout animations) for lower-powered tablets. `auto` picks
 * `smooth` on devices that report little memory or few cores.
 */
export type PerfSetting = 'auto' | 'full' | 'smooth'

const KEY = 'casa.perf'

export const perfOptions: { value: PerfSetting; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'full', label: 'Full' },
  { value: 'smooth', label: 'Smooth' },
]

function isPerfSetting(value: unknown): value is PerfSetting {
  return value === 'auto' || value === 'full' || value === 'smooth'
}

/** Few cores or little memory: treat as lower-powered. Missing signals count as capable. */
function looksLowPower() {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { deviceMemory?: number }
  return (
    (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) ||
    (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4)
  )
}

function readSetting(): PerfSetting {
  try {
    const stored = localStorage.getItem(KEY)
    return isPerfSetting(stored) ? stored : 'auto'
  } catch {
    return 'auto'
  }
}

export const resolveSmooth = (setting: PerfSetting) =>
  setting === 'smooth' || (setting === 'auto' && looksLowPower())

let setting: PerfSetting | null = null
const listeners = new Set<() => void>()

function current(): PerfSetting {
  if (setting) return setting
  if (typeof window === 'undefined') return 'auto'
  setting = readSetting()
  return setting
}

function apply(next: PerfSetting) {
  if (typeof document === 'undefined') return
  if (resolveSmooth(next)) document.documentElement.setAttribute('data-perf', 'smooth')
  else document.documentElement.removeAttribute('data-perf')
}

export function setPerf(next: PerfSetting) {
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* private mode: applies for this session */
  }
  setting = next
  apply(next)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function usePerf() {
  const value = useSyncExternalStore(subscribe, current, () => 'auto' as PerfSetting)
  return { setting: value, smooth: resolveSmooth(value), setPerf }
}

/** Inline <head> script: sets data-perf before first paint so there is no flash of the heavy look. */
export const perfBootScript = `(function(){try{var s=localStorage.getItem('${KEY}');var n=navigator;var low=(typeof n.deviceMemory==='number'&&n.deviceMemory<=4)||(typeof n.hardwareConcurrency==='number'&&n.hardwareConcurrency<=4);if(s==='smooth'||((s!=='full')&&low))document.documentElement.setAttribute('data-perf','smooth')}catch(e){}})();`
