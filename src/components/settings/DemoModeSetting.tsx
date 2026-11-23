import { FlaskConical } from 'lucide-react'
import { Switch } from '#/components/ui/switch'
import { DEMO_MODE, setDemoMode } from '#/lib/demoMode'

/** Try every control without touching the house. Toggling reloads the app. */
export function DemoModeSetting() {
  return (
    <div className="rounded-card border-ui border-border-subtle bg-surface p-4 shadow-card modern:border-transparent">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FlaskConical className="size-4 shrink-0 text-accent" aria-hidden />
            <p className="text-sm font-semibold text-ink">Demo mode</p>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Shows the real house, but taps only change what this screen shows. Nothing is sent to
            your devices. The app reloads when you switch it on or off.
          </p>
        </div>
        <Switch
          aria-label="Demo mode"
          checked={DEMO_MODE}
          onCheckedChange={(checked) => setDemoMode(checked)}
        />
      </div>
    </div>
  )
}
