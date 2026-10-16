import { useLock } from 'hass-react'
import { Lock, LockOpen } from 'lucide-react'
import { entityName } from '#/lib/entityName'
import { cn } from '#/lib/cn'
import { Button } from '#/components/ui/button'
import { notify } from '#/components/ui/toast'

export function LockTile({ entityId }: { entityId: string }) {
  const lock = useLock(entityId)
  const name = entityName(entityId, lock.attributes.friendly_name)
  const unavailable = lock.isUnavailable

  async function toggle() {
    try {
      if (lock.isLocked) await lock.unlock()
      else await lock.lock()
    } catch (e) {
      notify('Lock failed', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface p-4',
        unavailable && 'opacity-40',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'grid size-11 place-items-center rounded-xl',
            lock.isLocked ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
          )}
        >
          {lock.isLocked ? <Lock className="size-5" /> : <LockOpen className="size-5" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{name}</p>
          <p className="text-xs capitalize text-ink-muted">
            {unavailable ? 'Unavailable' : lock.state}
          </p>
        </div>
      </div>
      <Button
        size="md"
        variant={lock.isLocked ? 'secondary' : 'accent'}
        disabled={unavailable}
        onClick={() => void toggle()}
      >
        {lock.isLocked ? 'Unlock' : 'Lock'}
      </Button>
    </div>
  )
}
