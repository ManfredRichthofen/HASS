import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { notify } from '#/components/ui/toast'
import { checkForAppUpdate } from '#/lib/appUpdate'
import { isTauri } from '#/lib/deviceLocation'

const NOTIFIED_KEY = 'casa.update.notified_version'

/** Quiet startup check; toasts once per available version. */
export function UpdateChecker() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isTauri()) return

    let cancelled = false
    void (async () => {
      const result = await checkForAppUpdate()
      if (cancelled || result.status !== 'available') return
      try {
        if (localStorage.getItem(NOTIFIED_KEY) === result.version) return
        localStorage.setItem(NOTIFIED_KEY, result.version)
      } catch {
        /* private mode */
      }
      notify(`Casa ${result.version} is available`, 'Tap to open App updates', {
        onClick: () => {
          void navigate({ to: '/settings' })
        },
        timeout: 8000,
      })
    })()

    return () => {
      cancelled = true
    }
  }, [navigate])

  return null
}
