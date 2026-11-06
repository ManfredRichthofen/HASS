import { createFileRoute } from '@tanstack/react-router'
import { useBinarySensor, useEntity, useEntityGroup, useLock } from 'hass-react'
import {
  DoorClosed,
  DoorOpen,
  Droplets,
  Flame,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  UserRoundX,
} from 'lucide-react'
import { CameraTile } from '#/components/entities/CameraTile'
import { DeviceList, DeviceRow } from '#/components/entities/DeviceRow'
import { EntityGrid } from '#/components/entities/EntityGrid'
import { LockTile } from '#/components/entities/LockTile'
import { HouseModeGrid } from '#/components/home/HouseModeGrid'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'
import { notify } from '#/components/ui/toast'
import { entities } from '#/config/dashboard'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
import { cn } from '#/lib/cn'
import { openDoorbellPopup } from '#/lib/doorbellUi'
import { m, staggerContainer, staggerItem } from '#/lib/motion'

export const Route = createFileRoute('/security')({ component: SecurityPage })

const leakIds = entities.security.leaks.map((l) => l.id)
const securityCameras = entities.security.cameras

function StateWord({ value, tone }: { value: string; tone: 'ok' | 'bad' | 'muted' }) {
  return (
    <span
      className={cn(
        'mr-3 shrink-0 text-sm font-semibold',
        tone === 'ok' && 'text-success',
        tone === 'bad' && 'text-danger',
        tone === 'muted' && 'text-ink-muted',
      )}
    >
      {value}
    </span>
  )
}

const OFFLINE = <StateWord value="Offline" tone="muted" />

/** What the alarm reports, in words a household would use. */
const alarmLabels: Record<string, string> = {
  disarmed: 'Off',
  armed_home: 'Armed, home',
  armed_away: 'Armed, away',
  armed_night: 'Armed, night',
  arming: 'Arming…',
  pending: 'Entry delay',
  triggered: 'Triggered',
}

type ArmMode = 'home' | 'away' | 'off'

const armModes: { value: ArmMode; label: string; service: string; done: string }[] = [
  { value: 'home', label: 'Home', service: 'alarm_arm_home', done: 'Alarm armed, home' },
  { value: 'away', label: 'Away', service: 'alarm_arm_away', done: 'Alarm armed, away' },
  { value: 'off', label: 'Off', service: 'alarm_disarm', done: 'Alarm off' },
]

const armModeOf = (state: string): ArmMode | null =>
  state === 'armed_home'
    ? 'home'
    : state === 'armed_away'
      ? 'away'
      : state === 'disarmed'
        ? 'off'
        : null

function AlarmPanel({ entityId }: { entityId: string }) {
  const alarm = useEntity(entityId)
  const state = String(alarm.state)
  const { value: mode, commit, setOverride } = useOptimisticValue<ArmMode | null>(armModeOf(state))

  if (alarm.isUnavailable) {
    return (
      <DeviceList>
        <DeviceRow icon={Shield} name="Alarm" unavailable trailing={OFFLINE} />
      </DeviceList>
    )
  }

  const triggered = state === 'triggered'
  const armed = state.startsWith('armed')

  const choose = (next: (typeof armModes)[number]) => {
    if (next.value === mode) return
    commit(next.value, async () => {
      try {
        await alarm.callService('alarm_control_panel', next.service, { entity_id: entityId })
        notify(next.done)
        // The alarm may sit in an exit delay; don't keep showing a guess forever.
        window.setTimeout(() => setOverride(null), 20_000)
      } catch (e) {
        notify(
          'Alarm didn’t change',
          e instanceof Error ? e.message : 'The alarm may need a code in Home Assistant.',
        )
        throw e
      }
    })
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <DeviceList>
        <DeviceRow
          icon={triggered ? ShieldAlert : armed ? ShieldCheck : Shield}
          tone={triggered ? 'danger' : armed ? 'success' : 'neutral'}
          name="Alarm"
          trailing={
            <StateWord
              value={alarmLabels[state] ?? state}
              tone={triggered ? 'bad' : armed ? 'ok' : 'muted'}
            />
          }
        />
      </DeviceList>
      <div
        role="radiogroup"
        aria-label="Alarm mode"
        className="grid grid-cols-3 gap-1 rounded-control bg-canvas p-1"
      >
        {armModes.map((item) => (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={item.value === mode}
            onClick={() => choose(item)}
            className={cn(
              'press min-h-11 rounded-control text-sm font-semibold transition-ui',
              item.value === mode
                ? 'bg-accent text-on-accent'
                : 'text-ink-muted hover:bg-surface-hover hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function OvenRow() {
  const { stateId, onId, leftOnId } = entities.security.oven
  const oven = useEntity(stateId)
  const on = useBinarySensor(onId)
  const leftOn = useBinarySensor(leftOnId)
  if (oven.isUnavailable && on.isUnavailable) {
    return <DeviceRow icon={Flame} name="Oven" unavailable trailing={OFFLINE} />
  }
  const running = !on.isUnavailable && on.isOn
  const warn = !leftOn.isUnavailable && leftOn.isOn
  return (
    <DeviceRow
      icon={Flame}
      tone={warn ? 'danger' : running ? 'info' : 'neutral'}
      name="Oven"
      caption={oven.isUnavailable ? undefined : String(oven.state)}
      trailing={
        <StateWord
          value={warn ? 'Left on' : running ? 'On' : 'Off'}
          tone={warn ? 'bad' : running ? 'muted' : 'ok'}
        />
      }
    />
  )
}

function PersonRow({ entityId, label }: { entityId: string; label: string }) {
  const person = useEntity(entityId)
  if (person.isUnavailable) {
    return <DeviceRow icon={UserRoundX} name={label} unavailable trailing={OFFLINE} />
  }
  const home = person.state === 'home'
  const place = home ? 'Home' : person.state === 'not_home' ? 'Away' : String(person.state)
  return (
    <DeviceRow
      icon={home ? UserRound : UserRoundX}
      tone={home ? 'success' : 'neutral'}
      name={label}
      trailing={<StateWord value={place} tone={home ? 'ok' : 'muted'} />}
    />
  )
}

const isGone = (state: unknown) => state === 'unavailable' || state === 'unknown'

function SecurityPage() {
  const lock = useLock(entities.lock)
  const door = useBinarySensor(entities.security.doorContact)
  const leaks = useEntityGroup(leakIds)
  const alarm = useEntity(entities.security.alarm)
  const occupancy = useBinarySensor(entities.occupancyAny)
  const ovenLeftOn = useBinarySensor(entities.security.oven.leftOnId)

  const lockKnown = !lock.isUnavailable
  const doorKnown = !door.isUnavailable
  const leakKnown = leaks.filter((l) => !isGone(l.state))
  const leaking = leaks.some((l) => l.state === 'on')

  const issues: string[] = []
  if (String(alarm.state) === 'triggered') issues.push('the alarm was triggered')
  if (!ovenLeftOn.isUnavailable && ovenLeftOn.isOn) issues.push('the oven was left on')
  if (lockKnown && !lock.isLocked) issues.push('the front door is unlocked')
  if (doorKnown && door.isOn) issues.push('the front door is open')
  if (leaking) issues.push('a water leak was detected')

  // Sensors we expected to hear from. Silence is not the same as "fine".
  const offline: string[] = []
  if (!lockKnown) offline.push('door lock')
  if (!doorKnown) offline.push('door sensor')
  entities.security.leaks.forEach((leak, i) => {
    if (isGone(leaks[i]?.state)) offline.push(`${leak.label.toLowerCase()} leak sensor`)
  })

  // Say only what was actually checked.
  const confirmed: string[] = []
  if (lockKnown && doorKnown) confirmed.push('Door locked and closed')
  else if (lockKnown) confirmed.push('Door locked')
  else if (doorKnown) confirmed.push('Door closed')
  if (leakKnown.length > 0 && !leaking) confirmed.push('no leaks')

  const hasIssues = issues.length > 0
  const someoneHome = !occupancy.isUnavailable && occupancy.isOn

  return (
    <m.div initial="initial" animate="animate" variants={staggerContainer}>
      <Page>
        <PageHeader title="Security" />

        <m.div
          variants={staggerItem}
          role="status"
          aria-live="polite"
          className="flex items-start gap-4 @xl:gap-3"
        >
          <span
            className={cn(
              'mt-1 shrink-0',
              hasIssues ? 'text-danger' : confirmed.length > 0 ? 'text-success' : 'text-ink-muted',
            )}
          >
            {hasIssues ? (
              <ShieldAlert className="size-8" />
            ) : confirmed.length > 0 ? (
              <ShieldCheck className="size-8" />
            ) : (
              <Shield className="size-8" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-display text-[1.75rem] leading-tight text-balance text-ink walnut:font-light @xl:text-[1.5rem]">
              {hasIssues ? (
                <>
                  Check the house — <span className="text-danger">{issues.join(', and ')}</span>.
                </>
              ) : confirmed.length > 0 ? (
                `${confirmed.join(', ')}.`
              ) : (
                'Can’t confirm the house is secure.'
              )}
            </p>
            {offline.length > 0 ? (
              <p className="mt-1 text-sm text-ink-muted">Not reporting: {offline.join(', ')}.</p>
            ) : null}
          </div>
        </m.div>

        {/*
          One reading path, most urgent first: who can get in, who is watching,
          how the house is armed, then what the sensors and people say.
          Tablet (@xl) flows the same four groups into two columns.
        */}
        <div className="grid items-start gap-section @xl:grid-cols-2 @xl:gap-x-6">
          <Section title="Entry">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
              <LockTile entityId={entities.lock} label="Front door" />
              <DeviceList>
                <DeviceRow
                  icon={door.isOn ? DoorOpen : DoorClosed}
                  tone={doorKnown ? (door.isOn ? 'danger' : 'success') : 'neutral'}
                  name="Door position"
                  unavailable={!doorKnown}
                  trailing={
                    doorKnown ? (
                      <StateWord
                        value={door.isOn ? 'Open' : 'Closed'}
                        tone={door.isOn ? 'bad' : 'ok'}
                      />
                    ) : (
                      OFFLINE
                    )
                  }
                />
              </DeviceList>
            </div>
          </Section>

          {securityCameras.length > 0 ? (
            <Section title="Cameras">
              <EntityGrid
                className={cn(
                  // Cap at 2 cols — the page never shows more than 4 cameras.
                  securityCameras.length === 1
                    ? 'grid-cols-1 @md:grid-cols-1 @2xl:grid-cols-1 @5xl:grid-cols-1'
                    : 'grid-cols-2 @md:grid-cols-2 @2xl:grid-cols-2 @5xl:grid-cols-2',
                )}
              >
                {securityCameras.map((cam) => (
                  <CameraTile
                    key={cam.id}
                    entityId={cam.id}
                    label={cam.label}
                    className={securityCameras.length === 1 ? '@xl:aspect-video' : undefined}
                    onOpen={
                      cam.id === entities.doorbell.cameraId ? () => openDoorbellPopup() : undefined
                    }
                  />
                ))}
              </EntityGrid>
            </Section>
          ) : null}

          <div className="grid grid-cols-[minmax(0,1fr)] gap-section">
            <Section title="Alarm">
              <AlarmPanel entityId={entities.security.alarm} />
            </Section>

            <Section title="House mode">
              <div className="rounded-card border-ui border-border-subtle bg-surface px-4 py-1 shadow-card modern:border-transparent">
                <HouseModeGrid />
              </div>
            </Section>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-section">
            <Section title="Sensors">
              <DeviceList>
                {entities.security.leaks.map((leak, i) => {
                  const sensor = leaks[i]
                  const gone = !sensor || isGone(sensor.state)
                  const wet = !gone && sensor.state === 'on'
                  return (
                    <DeviceRow
                      key={leak.id}
                      icon={Droplets}
                      tone={wet ? 'danger' : 'info'}
                      name={leak.label}
                      caption="Leak sensor"
                      unavailable={gone}
                      trailing={
                        gone ? (
                          OFFLINE
                        ) : (
                          <StateWord value={wet ? 'Leak' : 'Dry'} tone={wet ? 'bad' : 'ok'} />
                        )
                      }
                    />
                  )
                })}
                <OvenRow />
              </DeviceList>
            </Section>

            <Section title="People">
              <DeviceList>
                {entities.security.people.map((p) => (
                  <PersonRow key={p.id} entityId={p.id} label={p.label} />
                ))}
                <DeviceRow
                  icon={someoneHome ? UserRound : UserRoundX}
                  tone={someoneHome ? 'success' : 'neutral'}
                  name="Movement in the house"
                  caption="Any room"
                  unavailable={occupancy.isUnavailable}
                  trailing={
                    occupancy.isUnavailable ? (
                      OFFLINE
                    ) : (
                      <StateWord
                        value={someoneHome ? 'Yes' : 'None'}
                        tone={someoneHome ? 'ok' : 'muted'}
                      />
                    )
                  }
                />
              </DeviceList>
            </Section>
          </div>
        </div>
      </Page>
    </m.div>
  )
}
