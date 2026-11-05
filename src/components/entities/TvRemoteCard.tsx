import { useMediaPlayer, useServiceCall } from 'hass-react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CornerUpLeft,
  Home,
  Minus,
  Pause,
  Play,
  Plus,
  Power,
  Tv,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '#/components/ui/button'
import { notify } from '#/components/ui/toast'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
import { cn } from '#/lib/cn'
import { entityName } from '#/lib/entityName'

/** Round-ish tactile remote key. */
function Key({
  label,
  onClick,
  disabled,
  children,
  className,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'press grid size-14 place-items-center rounded-control bg-canvas text-ink transition-ui select-none hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Vertical +/− rocker (volume). */
function Rocker({
  label,
  icon,
  onUp,
  onDown,
  disabled,
}: {
  label: string
  icon: ReactNode
  onUp: () => void
  onDown: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex w-16 flex-col items-center overflow-hidden rounded-pill bg-canvas">
      <button
        type="button"
        aria-label={`${label} up`}
        disabled={disabled}
        onClick={onUp}
        className="press grid h-14 w-full place-items-center text-ink transition-ui hover:bg-surface-hover disabled:opacity-40"
      >
        <Plus className="size-5" />
      </button>
      <span className="grid h-8 place-items-center text-ink-faint">{icon}</span>
      <button
        type="button"
        aria-label={`${label} down`}
        disabled={disabled}
        onClick={onDown}
        className="press grid h-14 w-full place-items-center text-ink transition-ui hover:bg-surface-hover disabled:opacity-40"
      >
        <Minus className="size-5" />
      </button>
    </div>
  )
}

/**
 * A TV remote: power, a d-pad, back/home, volume rocker, mute, transport, and
 * a source row. Volume, mute, transport and sources use the media_player
 * entity. The d-pad needs a `remote.*` entity (Android TV, Harmony, Roku,
 * etc.) — pass `remoteId` to enable it; without one the d-pad is hidden.
 */
export function TvRemoteCard({
  entityId,
  remoteId,
  label,
  bare = false,
}: {
  entityId: string
  /** remote.* entity used for d-pad / back / home via remote.send_command. */
  remoteId?: string
  label?: string
  /** Drop the card chrome (when already inside a sheet). */
  bare?: boolean
}) {
  const tv = useMediaPlayer(entityId)
  const { callService } = useServiceCall()
  const name = label ?? entityName(entityId, tv.attributes.friendly_name)
  const unavailable = tv.isUnavailable
  const { value: isOff, commit: commitOff } = useOptimisticValue(tv.isOff)
  const { value: muted, commit: commitMuted } = useOptimisticValue(Boolean(tv.isMuted))
  const dead = unavailable || isOff

  async function run(action: () => Promise<unknown>, title: string) {
    try {
      await action()
    } catch (e) {
      notify(title, e instanceof Error ? e.message : 'Error')
    }
  }

  const togglePower = () =>
    commitOff(!isOff, async () => {
      try {
        if (isOff) await tv.turnOn()
        else await tv.turnOff()
      } catch (e) {
        notify('Power failed', e instanceof Error ? e.message : 'Error')
        throw e
      }
    })

  const toggleMute = () =>
    commitMuted(!muted, async () => {
      try {
        if (remoteId) {
          await callService('remote', 'send_command', { entity_id: remoteId, command: 'MUTE' })
        } else {
          await tv.toggleMute()
        }
      } catch (e) {
        notify('Mute failed', e instanceof Error ? e.message : 'Error')
        throw e
      }
    })

  const send = (command: string) =>
    remoteId
      ? void run(
          () => callService('remote', 'send_command', { entity_id: remoteId, command }),
          'Remote failed',
        )
      : undefined

  // Android TV media_player rarely advertises volume/transport features, so when a
  // remote.* entity exists send the real key presses; otherwise use media_player.
  const volume = (service: 'volume_up' | 'volume_down') =>
    remoteId
      ? send(service === 'volume_up' ? 'VOLUME_UP' : 'VOLUME_DOWN')
      : void run(
          () => callService('media_player', service, { entity_id: entityId }),
          'Volume failed',
        )

  const channel = (dir: 'up' | 'down') =>
    remoteId
      ? send(dir === 'up' ? 'CHANNEL_UP' : 'CHANNEL_DOWN')
      : void run(() => (dir === 'up' ? tv.nextTrack() : tv.previousTrack()), 'Channel failed')

  const playPause = () =>
    remoteId
      ? send('MEDIA_PLAY_PAUSE')
      : void run(() => (tv.isPlaying ? tv.pause() : tv.play()), 'Playback failed')

  const status = unavailable
    ? 'Unavailable'
    : isOff
      ? 'Off'
      : [tv.appName ?? tv.currentSource, tv.mediaTitle].filter(Boolean).join(' · ') || 'On'
  const playing = tv.isPlaying
  const sources = tv.sourceList.slice(0, 8)

  return (
    <div
      className={cn(
        'min-w-0 overflow-hidden',
        !bare &&
          'rounded-card border-ui border-border-subtle bg-surface p-5 shadow-card modern:border-transparent',
        !bare && !dead && 'border-success/30',
        unavailable && 'opacity-45',
      )}
    >
      {/* Header: identity + power */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-control bg-icon-well',
            dead ? 'text-ink-faint' : 'text-light',
          )}
        >
          <Tv className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-display text-lg text-ink">{name}</h3>
          <p className="truncate text-sm text-ink-muted">{status}</p>
        </div>
        <Button
          size="icon"
          variant={isOff ? 'secondary' : 'danger'}
          disabled={unavailable}
          aria-label={isOff ? 'Turn on' : 'Turn off'}
          onClick={togglePower}
        >
          <Power className="size-5" />
        </Button>
      </div>

      {/* In a room the remote appears once the TV is on; the sheet (bare) always shows it. */}
      <div
        className={cn(
          'mt-6 transition-ui',
          dead && 'pointer-events-none opacity-40',
          !bare && dead && 'hidden',
        )}
      >
        {/* D-pad */}
        {remoteId ? (
          <div className="mx-auto grid w-fit grid-cols-3 place-items-center gap-1.5 rounded-[2.25rem] bg-canvas p-2">
            <span />
            <Key label="Up" onClick={() => send('DPAD_UP')} className="bg-transparent">
              <ChevronUp className="size-6" />
            </Key>
            <span />
            <Key label="Left" onClick={() => send('DPAD_LEFT')} className="bg-transparent">
              <ChevronLeft className="size-6" />
            </Key>
            <button
              type="button"
              aria-label="Select"
              onClick={() => send('DPAD_CENTER')}
              className="press grid size-16 place-items-center rounded-full bg-accent text-sm font-semibold text-on-accent transition-ui hover:bg-accent-strong"
            >
              OK
            </button>
            <Key label="Right" onClick={() => send('DPAD_RIGHT')} className="bg-transparent">
              <ChevronRight className="size-6" />
            </Key>
            <span />
            <Key label="Down" onClick={() => send('DPAD_DOWN')} className="bg-transparent">
              <ChevronDown className="size-6" />
            </Key>
            <span />
          </div>
        ) : null}

        {/* Back / Home */}
        {remoteId ? (
          <div className="mt-4 flex justify-center gap-3">
            <Key label="Back" onClick={() => send('BACK')} className="w-24">
              <CornerUpLeft className="size-5" />
            </Key>
            <Key label="Home" onClick={() => send('HOME')} className="w-24">
              <Home className="size-5" />
            </Key>
          </div>
        ) : null}

        {/* Volume + transport */}
        <div className="mt-6 flex items-center justify-center gap-5">
          <Rocker
            label="Volume"
            icon={<Volume2 className="size-4" />}
            onUp={() => volume('volume_up')}
            onDown={() => volume('volume_down')}
            disabled={dead}
          />
          <div className="flex flex-col items-center gap-3">
            <Button
              size="icon"
              variant="accent"
              className="size-16"
              aria-label={playing ? 'Pause' : 'Play'}
              onClick={playPause}
            >
              {playing ? <Pause className="size-6" /> : <Play className="size-6" />}
            </Button>
            <Key label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}>
              {muted ? <VolumeX className="size-5 text-danger" /> : <Volume2 className="size-5" />}
            </Key>
          </div>
          <Rocker
            label="Channel"
            icon={<span className="text-xs font-semibold">CH</span>}
            onUp={() => channel('up')}
            onDown={() => channel('down')}
            disabled={dead}
          />
        </div>

        {/* Sources */}
        {sources.length > 0 ? (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {sources.map((source) => {
              const active = source === tv.currentSource
              return (
                <button
                  key={source}
                  type="button"
                  onClick={() => void run(() => tv.selectSource(source), 'Source failed')}
                  className={cn(
                    'press min-h-11 rounded-pill px-4 text-sm font-semibold transition-ui',
                    active
                      ? 'bg-accent text-on-accent'
                      : 'border-ui border-border bg-transparent text-ink-muted hover:bg-surface-hover hover:text-ink',
                  )}
                >
                  {source}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
