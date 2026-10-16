import { useEffect } from 'react'

/** Registers the service worker once on the client. */
export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (import.meta.env.DEV) return

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch (error) {
        console.warn('Service worker registration failed', error)
      }
    }

    void register()
  }, [])

  return null
}
