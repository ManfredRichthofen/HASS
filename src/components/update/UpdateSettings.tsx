import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  checkForAppUpdate,
  type UpdateCheckResult,
} from '#/lib/appUpdate'
import { isTauri } from '#/lib/deviceLocation'
import { Button } from '#/components/ui/button'
import { notify } from '#/components/ui/toast'

export function UpdateSettings({ autoCheck = true }: { autoCheck?: boolean }) {
  const [result, setResult] = useState<UpdateCheckResult | null>(null)
  const [busy, setBusy] = useState(false)
  const native = isTauri()

  const runCheck = useCallback(async (silent = false) => {
    if (!isTauri()) return
    setBusy(true)
    try {
      const next = await checkForAppUpdate()
      setResult(next)
      if (!silent) {
        if (next.status === 'upToDate') notify('You are up to date')
        else if (next.status === 'available') {
          notify('Update available', `Version ${next.version}`)
        } else if (next.status === 'error') {
          notify('Update check failed', next.message)
        }
      }
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (!autoCheck || !native) return
    void runCheck(true)
  }, [autoCheck, native, runCheck])

  if (!native) return null

  const statusLabel =
    result == null
      ? '—'
      : result.status === 'upToDate'
        ? `Up to date (${result.version})`
        : result.status === 'available'
          ? `Update ${result.version} available`
          : result.status === 'error'
            ? result.message
            : 'Not supported'

  return (
    <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface p-4">
      <div className="flex items-start gap-2">
        <RefreshCw className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">App updates</p>
          <p className="mt-1 text-xs text-ink-muted">
            Checks GitHub releases for Casa (
            <code className="text-ink">ManfredRichthofen/HASS</code>). Desktop
            installs update in-app; Android opens the latest APK release.
          </p>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 text-sm">
        <span className="shrink-0 text-ink-muted">Status</span>
        <span className="min-w-0 break-words text-right text-ink">{statusLabel}</span>
      </div>

      {result?.status === 'available' && result.notes ? (
        <p className="max-h-24 overflow-auto whitespace-pre-wrap text-xs text-ink-muted">
          {result.notes}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="secondary"
          className="w-full"
          disabled={busy}
          onClick={() => void runCheck(false)}
        >
          {busy ? 'Checking…' : 'Check for updates'}
        </Button>
        {result?.status === 'available' ? (
          <Button
            variant="accent"
            className="w-full"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void result
                .install()
                .then(() => notify('Installing update…'))
                .catch((e) =>
                  notify(
                    'Update failed',
                    e instanceof Error ? e.message : 'Error',
                  ),
                )
                .finally(() => setBusy(false))
            }}
          >
            Install update
          </Button>
        ) : null}
      </div>
    </div>
  )
}
