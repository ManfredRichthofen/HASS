import { useLock } from 'hass-react'
import { Lock, LockOpen } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { notify } from '#/components/ui/toast'
import { cn } from '#/lib/cn'
import { entityName } from '#/lib/entityName'

function since(value?: Date | string) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `for ${mins} min`
  return `since ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

/** A lock stated in one big word, the time it changed, and the one button that reverses it. */
export function LockTile({ entityId, label }: { entityId: string; label?: string }) {
  const lock = useLock(entityId)
  const name = label ?? entityName(entityId, lock.attributes.friendly_name)
  const unavailable = lock.isUnavailable
  const open = !unavailable && !lock.isLocked
  const changed = since((lock as { lastChanged?: Date }).lastChanged)

  async function toggle() {
    try {
      if (lock.isLocked) await lock.unlock()
      else await lock.lock()
      notify(lock.isLocked ? 'Unlocked' : 'Locked', name)
    } catch (e) {
      notify('Lock failed', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-card border-ui border-border-subtle bg-surface py-4.5 pr-4.5 pl-5 shadow-card transition-state',
        'modern:border-transparent brutal:border-ink',
        open &&
          'border-danger/55 modern:border-transparent modern:shadow-[inset_0_0_0_2px_var(--c-danger)]',
        open && 'brutal:border-ink brutal:bg-danger brutal:text-white',
        unavailable && 'opacity-45',
      )}
    >
      <span
        className={cn(
          'text-success modern:grid modern:size-12 modern:place-items-center modern:rounded-pill modern:bg-success/12',
          open && 'text-danger modern:bg-danger/12 brutal:text-white',
        )}
      >
        {open ? <LockOpen className="size-7" /> : <Lock className="size-7" />}
      </span>
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'text-display block text-2xl leading-tight',
            open && 'text-danger brutal:text-white',
          )}
        >
          {unavailable ? 'Unavailable' : open ? 'Unlocked' : 'Locked'}
        </span>
        <span
          className={cn(
            'block truncate text-[0.8125rem] text-ink-muted brutal:font-label brutal:text-xs',
            open && 'brutal:text-white',
          )}
        >
          {name}
          {changed ? ` · ${changed}` : ''}
        </span>
      </div>
      <Button
        size="sm"
        variant={open ? 'primary' : 'secondary'}
        disabled={unavailable}
        onClick={() => void toggle()}
      >
        {open ? 'Lock' : 'Unlock'}
      </Button>
    </div>
  )
}

export const LockControl = LockTile
