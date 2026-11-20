import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { notify } from '#/components/ui/toast'
import { usePerf } from '#/lib/perf'

const TIP_KEY = 'casa.perf.tip_shown'

/**
 * One-time nudge on Android (tablet / phone WebView) toward Settings → Performance → Smooth,
 * the biggest win on weaker GPUs. Skipped when Smooth is already active or was ever chosen.
 * Mounted at idle by AppShell.
 */
export function PerfTip() {
  const { setting, smooth } = usePerf()
  const navigate = useNavigate()

  useEffect(() => {
    if (smooth || setting !== 'auto') return
    if (!/android/i.test(navigator.userAgent)) return
    try {
      if (localStorage.getItem(TIP_KEY)) return
      localStorage.setItem(TIP_KEY, '1')
    } catch {
      return
    }
    notify('Feeling sluggish?', 'Tap to turn on Smooth in Settings → Performance', {
      onClick: () => {
        void navigate({ to: '/settings' })
      },
      timeout: 8000,
    })
  }, [setting, smooth, navigate])

  return null
}
