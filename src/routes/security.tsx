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

        <m.div variants={staggerItem} className="flex items-start gap-4 @xl:gap-3">
          <span className={cn('mt-1 shrink-0', secure ? 'text-success' : 'text-danger')}>
            {secure ? <ShieldCheck className="size-8" /> : <ShieldAlert className="size-8" />}
          </span>
          <p className="text-display text-[1.75rem] leading-tight text-balance text-ink walnut:font-light @xl:text-[1.5rem]">
            {secure ? (
              'Everything is locked and dry.'
            ) : (
              <>
                Check the house — <span className="text-danger">{issues.join(', and ')}</span>.
              </>
            )}
          </p>
        </m.div>

        {/*
          Mobile: stacked cameras → door → mode → sensors.
          Tablet (@xl): 2×2 mosaic so modes/sensors sit beside door, not under a short
          camera column (max 4 cams → at most a 2×2 tile grid).
        */}
        <div className="grid items-start gap-section @xl:grid-cols-2 @xl:gap-x-6 @xl:gap-y-5">
          {securityCameras.length > 0 ? (
            <Section
              title="Cameras"
              className="min-w-0 @xl:[&>div:first-child]:mb-2.5 @xl:[&>div:first-child]:min-h-9"
            >
              <EntityGrid
                className={cn(
                  '@xl:gap-2.5',
                  // Cap at 2 cols — page never shows more than 4 cameras.
                  securityCameras.length === 1
                    ? 'grid-cols-1 @md:grid-cols-1 @2xl:grid-cols-1 @5xl:grid-cols-1'
                    : 'grid-cols-2 @md:grid-cols-2 @2xl:grid-cols-2 @5xl:grid-cols-2',
                )}
              >
                {securityCameras.map((cam) => {
                  const isDoorbell =
                    cam.id === entities.doorbell.cameraId ||
                    /doorbell/i.test(`${cam.id} ${cam.label}`)
                  return (
                    <CameraTile
                      key={cam.id}
                      entityId={cam.id}
                      label={cam.label}
                      className={cn(
                        '@xl:min-h-[9.5rem]',
                        securityCameras.length === 1 && '@xl:min-h-[12rem] @xl:aspect-video',
                      )}
                      onOpen={isDoorbell ? () => openDoorbellPopup() : undefined}
                    />
                  )
                })}
              </EntityGrid>
            </Section>
          ) : null}

          <Section
            title="Front door"
            className="min-w-0 @xl:[&>div:first-child]:mb-2.5 @xl:[&>div:first-child]:min-h-9"
          >
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
              <LockTile
                entityId={entities.lock}
                label="Front door"
                className="@xl:gap-3 @xl:py-3.5 @xl:pr-3.5 @xl:pl-4"
              />
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

          <Section
            title="House mode"
            className="min-w-0 @xl:[&>div:first-child]:mb-2.5 @xl:[&>div:first-child]:min-h-9"
          >
            <div className="rounded-card border-ui border-border-subtle bg-surface px-5 py-1 shadow-card modern:border-transparent">
              <HouseModeGrid />
            </div>
          </Section>

          <Section
            title="Water & presence"
            className="min-w-0 @xl:[&>div:first-child]:mb-2.5 @xl:[&>div:first-child]:min-h-9"
          >
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
        </div>
      </Page>
    </m.div>
  )
}
