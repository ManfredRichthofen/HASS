import { createFileRoute } from '@tanstack/react-router'
import {
  useBinarySensor,
  useEntityGroup,
  useLock,
} from 'hass-react'
import {
  DoorClosed,
  DoorOpen,
  Droplets,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  UserRoundX,
  type LucideIcon,
} from 'lucide-react'
import { entities } from '#/config/dashboard'
import { LockTile } from '#/components/entities/LockTile'
import { HouseModeGrid } from '#/components/home/HouseModeGrid'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'
import { cn } from '#/lib/cn'
import { m, staggerContainer, staggerItem } from '#/lib/motion'

export const Route = createFileRoute('/security')({ component: SecurityPage })

const leakIds = entities.security.leaks.map((l) => l.id)

function StatusRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone: 'ok' | 'bad' | 'muted'
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-border-subtle bg-surface px-3.5 py-2">
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-xl',
          tone === 'ok' && 'bg-success/15 text-success',
          tone === 'bad' && 'bg-danger/15 text-danger',
          tone === 'muted' && 'bg-[#252e40] text-ink-muted',
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{label}</p>
      </div>
      <span
        className={cn(
          'shrink-0 text-sm font-semibold',
          tone === 'ok' && 'text-success',
          tone === 'bad' && 'text-danger',
          tone === 'muted' && 'text-ink-muted',
        )}
      >
        {value}
      </span>
    </div>
  )
}

function SecurityPage() {
  const lock = useLock(entities.lock)
  const door = useBinarySensor(entities.security.doorContact)
  const leaks = useEntityGroup([...leakIds])
  const occupancy = useBinarySensor(entities.occupancyAny)

  const issues: string[] = []
  if (!lock.isUnavailable && !lock.isLocked) issues.push('Front door unlocked')
  if (!door.isUnavailable && door.isOn) issues.push('Front door open')
  if (leaks.some((l) => l.state === 'on')) issues.push('Water leak detected')
  const secure = issues.length === 0

  const heroTitle = secure ? 'Home is secure' : issues[0]
  const heroSub = secure
    ? 'Doors locked · no leaks'
    : issues.length > 1
      ? `${issues.length - 1} more to check`
      : 'Needs attention'

  const someoneHome = !occupancy.isUnavailable && occupancy.isOn

  return (
    <m.div initial="initial" animate="animate" variants={staggerContainer}>
      <Page>
        <PageHeader title="Security" subtitle="Doors, leaks and house mode" />

        <m.div
          variants={staggerItem}
          className={cn(
            'flex items-center gap-4 rounded-3xl border border-border-subtle p-5 transition-colors duration-500',
            secure
              ? 'bg-gradient-to-br from-[#14261f] to-surface'
              : 'bg-gradient-to-br from-[#2e1a14] to-surface',
          )}
        >
          <span
            className={cn(
              'relative grid size-14 shrink-0 place-items-center rounded-2xl',
              secure ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
            )}
          >
            <span className="absolute inset-0 animate-ping rounded-2xl border-2 border-current opacity-20" />
            {secure ? (
              <ShieldCheck className="size-7" />
            ) : (
              <ShieldAlert className="size-7" />
            )}
          </span>
          <div className="min-w-0">
            <p className="font-display text-xl font-bold tracking-tight">
              {heroTitle}
            </p>
            <p className="text-sm text-ink-muted">{heroSub}</p>
          </div>
        </m.div>

        <m.div variants={staggerItem}>
          <Section title="House mode">
            <HouseModeGrid />
          </Section>
        </m.div>

        <m.div variants={staggerItem}>
          <Section title="Front door">
            <div className="grid gap-2.5 md:grid-cols-2">
              <LockTile entityId={entities.lock} />
              {!door.isUnavailable ? (
                <StatusRow
                  icon={door.isOn ? DoorOpen : DoorClosed}
                  label="Door"
                  value={door.isOn ? 'Open' : 'Closed'}
                  tone={door.isOn ? 'bad' : 'ok'}
                />
              ) : null}
            </div>
          </Section>
        </m.div>

        <m.div variants={staggerItem}>
          <Section title="Water leaks">
            <div className="grid gap-2.5 md:grid-cols-2">
              {entities.security.leaks.map((leak, i) => {
                const sensor = leaks[i]
                if (!sensor || sensor.state === 'unavailable') return null
                const wet = sensor.state === 'on'
                return (
                  <StatusRow
                    key={leak.id}
                    icon={Droplets}
                    label={leak.label}
                    value={wet ? 'Leak!' : 'Dry'}
                    tone={wet ? 'bad' : 'ok'}
                  />
                )
              })}
            </div>
          </Section>
        </m.div>

        <m.div variants={staggerItem}>
          <Section title="Presence">
            <StatusRow
              icon={someoneHome ? UserRound : UserRoundX}
              label="Someone home"
              value={
                occupancy.isUnavailable
                  ? '—'
                  : someoneHome
                    ? 'Yes'
                    : 'No one'
              }
              tone={someoneHome ? 'ok' : 'muted'}
            />
          </Section>
        </m.div>
      </Page>
    </m.div>
  )
}
