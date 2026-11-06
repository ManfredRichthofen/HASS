import { useLock } from 'hass-react'
import { Lock, LockOpen } from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '#/components/ui/dialog'
import { notify } from '#/components/ui/toast'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
import { useScrollSafePress } from '#/hooks/useScrollSafePress'
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
export function LockTile({
  entityId,
  label,
  className,
}: {
  entityId: string
  label?: string
  className?: string
}) {
  const lock = useLock(entityId)
  const name = label ?? entityName(entityId, lock.attributes.friendly_name)
  const unavailable = lock.isUnavailable
  const { value: locked, commit } = useOptimisticValue(!unavailable && lock.isLocked)
  const open = !unavailable && !locked
  const changed = since((lock as { lastChanged?: Date }).lastChanged)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const toggle = () => {
    const nextLocked = !locked
    commit(nextLocked, async () => {
      try {
        if (locked) await lock.unlock()
        else await lock.lock()
        notify(nextLocked ? 'Locked' : 'Unlocked', name)
      } catch (e) {
        notify('Lock failed', e instanceof Error ? e.message : 'Error')
        throw e
      }
    })
  }

  // Locking is safe and reversible: do it at once. Unlocking asks first.
  const press = useScrollSafePress(() => (locked ? setConfirmOpen(true) : toggle()))

  return (
    <>
    <div
      className={cn(
        'flex items-center gap-4 rounded-card border-ui border-border-subtle bg-surface py-4.5 pr-4.5 pl-5 shadow-card transition-state',
        'modern:border-transparent',
        open &&
          'border-danger/55 modern:border-transparent modern:shadow-[inset_0_0_0_2px_var(--c-danger)]',
        unavailable && 'opacity-45',
        className,
      )}
    >
      <span
        className={cn(
          'text-success modern:grid modern:size-12 modern:place-items-center modern:rounded-pill modern:bg-success/12',
          open && 'text-danger modern:bg-danger/12',
        )}
      >
        {open ? <LockOpen className="size-7" /> : <Lock className="size-7" />}
      </span>
      <div className="min-w-0 flex-1">
        <span className={cn('text-display block text-2xl leading-tight', open && 'text-danger')}>
          {unavailable ? 'Unavailable' : open ? 'Unlocked' : 'Locked'}
        </span>
        <span className={cn('block truncate text-[0.8125rem] text-ink-muted')}>
          {name}
          {changed ? ` · ${changed}` : ''}
        </span>
      </div>
      <Button size="sm" variant={open ? 'primary' : 'secondary'} disabled={unavailable} {...press}>
        {open ? 'Lock' : 'Unlock'}
      </Button>
    </div>
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent
        title={`Unlock ${name.toLowerCase()}?`}
        description="Anyone at the door will be able to open it."
        actions={
          <>
            <DialogClose className="press inline-flex h-11 items-center rounded-pill px-4 text-sm font-semibold text-ink-muted hover:bg-surface-hover hover:text-ink">
              Cancel
            </DialogClose>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setConfirmOpen(false)
                toggle()
              }}
            >
              Unlock
            </Button>
          </>
        }
      />
    </Dialog>
    </>
  )
}

export const LockControl = LockTile
