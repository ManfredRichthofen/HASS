import { useEffect } from 'react'
import { checkForAppUpdate } from '#/lib/appUpdate'
import { isTauri } from '#/lib/deviceLocation'
import { notify } from '#/components/ui/toast'

/** Quiet startup check; prompts when a GitHub release is newer. */
export function UpdateChecker() {
  useEffect(() => {
    if (!isTauri()) return

    let cancelled = false
    void (async () => {
      const result = await checkForAppUpdate()
      if (cancelled || result.status !== 'available') return
      notify(
        `Casa ${result.version} is available`,
        'Open More → App updates to install',
      )
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
