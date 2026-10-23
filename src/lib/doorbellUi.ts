/** Lightweight bridge so Security (or elsewhere) can open the doorbell popup. */

type Listener = (open: boolean) => void

const listeners = new Set<Listener>()

export function openDoorbellPopup() {
  for (const listener of listeners) listener(true)
}

export function subscribeDoorbellOpen(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
