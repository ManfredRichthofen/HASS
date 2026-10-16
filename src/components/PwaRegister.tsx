import { useEffect } from 'react'
import { isTauri } from '#/lib/deviceLocation'

/** Registers the service worker once on the client (web only — skip Tauri WebView). */
export function PwaRegister() {
  useEffect(() => {
    if (isTauri()) return
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
