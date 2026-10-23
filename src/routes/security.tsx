import { createFileRoute } from '@tanstack/react-router'
import { useBinarySensor, useEntityGroup, useLock } from 'hass-react'
import {
  DoorClosed,
  DoorOpen,
  Droplets,
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
import { entities } from '#/config/dashboard'
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
        'mr-3 shrink-0 text-sm font-semibold brutal:font-label brutal:text-xs brutal:uppercase',
        tone === 'ok' && 'text-success',
        tone === 'bad' && 'text-danger',
        tone === 'muted' && 'text-ink-muted',
      )}
    >
      {value}
    </span>
  )
}

function SecurityPage() {
  const lock = useLock(entities.lock)
  const door = useBinarySensor(entities.security.doorContact)
  const leaks = useEntityGroup(leakIds)
  const occupancy = useBinarySensor(entities.occupancyAny)

  const issues: string[] = []
  if (!lock.isUnavailable && !lock.isLocked) issues.push('the front door is unlocked')
  if (!door.isUnavailable && door.isOn) issues.push('the front door is open')
  if (leaks.some((l) => l.state === 'on')) issues.push('a water leak was detected')
  const secure = issues.length === 0
  const someoneHome = !occupancy.isUnavailable && occupancy.isOn

  return (
    <m.div initial="initial" animate="animate" variants={staggerContainer}>
      <Page>
        <PageHeader title="Security" />

        <m.div variants={staggerItem} className="flex items-start gap-4">
          <span className={cn('mt-1 shrink-0', secure ? 'text-success' : 'text-danger')}>
            {secure ? <ShieldCheck className="size-8" /> : <ShieldAlert className="size-8" />}
          </span>
          <p className="text-display text-[1.75rem] leading-tight text-balance text-ink walnut:font-light">
            {secure ? (
              'Everything is locked and dry.'
            ) : (
              <>
                Check the house — <span className="text-danger">{issues.join(', and ')}</span>.
              </>
            )}
          </p>
        </m.div>

        <div
          className={cn(
            'grid items-start gap-section',
            securityCameras.length > 0 && '@2xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @2xl:gap-8',
          )}
        >
          {securityCameras.length > 0 ? (
            <m.div variants={staggerItem}>
              <Section title="Cameras">
                <EntityGrid>
                  {securityCameras.map((cam) => {
                    const isDoorbell =
                      cam.id === entities.doorbell.cameraId ||
                      /doorbell/i.test(`${cam.id} ${cam.label}`)
                    return (
                      <CameraTile
                        key={cam.id}
                        entityId={cam.id}
                        label={cam.label}
                        onOpen={isDoorbell ? () => openDoorbellPopup() : undefined}
                      />
                    )
                  })}
                </EntityGrid>
              </Section>
            </m.div>
          ) : null}

          <div className="flex min-w-0 flex-col gap-section">
            <m.div variants={staggerItem}>
              <Section title="Front door">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
                  <LockTile entityId={entities.lock} label="Front door" />
                  {!door.isUnavailable ? (
                    <DeviceList>
                      <DeviceRow
                        icon={door.isOn ? DoorOpen : DoorClosed}
                        tone={door.isOn ? 'danger' : 'success'}
                        name="Door"
                        caption="Contact sensor"
                        trailing={
                          <StateWord
                            value={door.isOn ? 'Open' : 'Closed'}
                            tone={door.isOn ? 'bad' : 'ok'}
                          />
                        }
                      />
                    </DeviceList>
                  ) : null}
                </div>
              </Section>
            </m.div>

            <m.div variants={staggerItem}>
              <Section title="House mode">
                <div className="rounded-card border-ui border-border-subtle bg-surface px-5 py-1 shadow-card modern:border-transparent">
                  <HouseModeGrid />
                </div>
              </Section>
            </m.div>

            <m.div variants={staggerItem}>
              <Section title="Water & presence">
                <DeviceList>
                  {entities.security.leaks.map((leak, i) => {
                    const sensor = leaks[i]
                    if (!sensor || sensor.state === 'unavailable') return null
                    const wet = sensor.state === 'on'
                    return (
                      <DeviceRow
                        key={leak.id}
                        icon={Droplets}
                        tone={wet ? 'danger' : 'info'}
                        name={leak.label}
                        caption="Leak sensor"
                        trailing={
                          <StateWord value={wet ? 'Leak!' : 'Dry'} tone={wet ? 'bad' : 'ok'} />
                        }
                      />
                    )
                  })}
                  <DeviceRow
                    icon={someoneHome ? UserRound : UserRoundX}
                    tone={someoneHome ? 'success' : 'neutral'}
                    name="Someone home"
                    caption="Any room occupied"
                    trailing={
                      <StateWord
                        value={occupancy.isUnavailable ? '—' : someoneHome ? 'Yes' : 'Empty'}
                        tone={someoneHome ? 'ok' : 'muted'}
                      />
                    }
                  />
                </DeviceList>
              </Section>
            </m.div>
          </div>
        </div>
      </Page>
    </m.div>
  )
}
