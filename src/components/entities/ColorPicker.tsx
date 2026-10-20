import { cn } from '#/lib/cn'

const presets: Array<{ label: string; rgb: [number, number, number] }> = [
  { label: 'Warm', rgb: [255, 196, 120] },
  { label: 'Soft', rgb: [255, 230, 200] },
  { label: 'Day', rgb: [255, 255, 245] },
  { label: 'Cool', rgb: [180, 210, 255] },
  { label: 'Red', rgb: [255, 64, 64] },
  { label: 'Orange', rgb: [255, 140, 40] },
  { label: 'Amber', rgb: [232, 165, 75] },
  { label: 'Green', rgb: [64, 200, 120] },
  { label: 'Teal', rgb: [40, 190, 190] },
  { label: 'Blue', rgb: [64, 140, 255] },
  { label: 'Purple', rgb: [160, 90, 255] },
  { label: 'Pink', rgb: [255, 110, 180] },
]

function toHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function fromHex(hex: string): [number, number, number] | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!match) return null
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)]
}

export function ColorPicker({
  value,
  disabled,
  onChange,
}: {
  value?: [number, number, number] | null
  disabled?: boolean
  onChange: (rgb: [number, number, number]) => void
}) {
  const current = value ?? [255, 200, 120]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink-muted">Color</span>
        <label
          className={cn(
            'relative size-9 overflow-hidden rounded-full border border-border shadow-inner',
            disabled && 'opacity-40',
          )}
          style={{ backgroundColor: toHex(current) }}
        >
          <input
            type="color"
            disabled={disabled}
            value={toHex(current)}
            aria-label="Pick color"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => {
              const next = fromHex(e.target.value)
              if (next) onChange(next)
            }}
          />
        </label>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {presets.map((preset) => {
          const selected =
            current[0] === preset.rgb[0] &&
            current[1] === preset.rgb[1] &&
            current[2] === preset.rgb[2]
          return (
            <button
              key={preset.label}
              type="button"
              disabled={disabled}
              title={preset.label}
              aria-label={preset.label}
              onClick={() => onChange(preset.rgb)}
              className={cn(
                'aspect-square rounded-full border-2 transition-ui active:scale-[0.92]',
                selected ? 'border-ink' : 'border-transparent',
                disabled && 'opacity-40',
              )}
              style={{ backgroundColor: toHex(preset.rgb) }}
            />
          )
        })}
      </div>
    </div>
  )
}
