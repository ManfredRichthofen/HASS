import { VacuumSheet } from '#/components/entities/VacuumSheet'
import { cn } from '#/lib/cn'

/** Full vacuum card for More — same sheet content as the home popup. */
export function VacuumTile({ entityId }: { entityId: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border-subtle bg-surface p-3.5 sm:p-4',
      )}
    >
      <VacuumSheet entityId={entityId} />
    </div>
  )
}
