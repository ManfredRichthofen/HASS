import { Segmented } from '#/components/ui/segmented'
import { perfOptions, usePerf } from '#/lib/perf'

/** Full effects, or Smooth for lower-powered tablets. Auto picks Smooth on weaker hardware. */
export function PerformancePicker() {
  const { setting, smooth, setPerf } = usePerf()

  return (
    <div className="grid gap-3">
      <Segmented label="Performance" options={perfOptions} value={setting} onChange={setPerf} />
      <p className="text-[0.8125rem] text-ink-muted">
        {smooth
          ? 'Smooth: no blur, a still background, lighter shadows and less motion.'
          : 'Full: frosted glass, a living background and all animation.'}{' '}
        {setting === 'auto' ? 'Auto chose this for this device.' : null}
      </p>
    </div>
  )
}
