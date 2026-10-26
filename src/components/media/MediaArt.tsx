import { ListMusic } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { cn } from '#/lib/cn'

export function uniqueArtCandidates(...candidates: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue
    seen.add(candidate)
    out.push(candidate)
  }
  return out
}

/** Artwork that tries each candidate URL in order, falling back to an icon. */
export function MediaArt({
  src,
  sources,
  label,
  size = 'md',
  className,
  fallback,
}: {
  src?: string | null | undefined
  /** Tried in order; on error advances to the next candidate. */
  sources?: Array<string | null | undefined>
  label: string
  size?: 'md' | 'hero' | 'fill'
  className?: string
  /** Replaces the default icon when nothing loads. */
  fallback?: ReactNode
}) {
  const candidatesKey = (sources ? uniqueArtCandidates(...sources) : uniqueArtCandidates(src)).join(
    '\n',
  )
  const candidates = useMemo(
    () => (candidatesKey ? candidatesKey.split('\n') : []),
    [candidatesKey],
  )
  const [failed, setFailed] = useState<Set<string>>(() => new Set())
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const activeSrc = candidates.find((candidate) => !failed.has(candidate)) ?? null
  const activeLoaded = activeSrc !== null && loadedSrc === activeSrc
  // Keep the last image on screen until the new one has loaded, then fade over it.
  const previousSrc = activeSrc && !activeLoaded ? loadedSrc : null

  useEffect(() => {
    setFailed(new Set())
  }, [candidatesKey])

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden bg-surface-hover',
        size === 'hero' &&
          'aspect-square w-full rounded-card bg-on shadow-on glass:rounded-pill glass:ring-[6px] glass:ring-white/70',
        size === 'md' && 'size-12 rounded-control',
        size === 'fill' && 'size-full',
        className,
      )}
    >
      {previousSrc ? (
        <img
          key={`prev-${previousSrc}`}
          src={previousSrc}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      ) : null}
      {activeSrc ? (
        <img
          key={activeSrc}
          src={activeSrc}
          alt=""
          className={cn(
            'absolute inset-0 size-full object-cover transition-opacity duration-300',
            activeLoaded ? 'opacity-100' : 'opacity-0',
          )}
          loading={size === 'hero' ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoadedSrc(activeSrc)}
          onError={() => {
            setFailed((prev) => new Set(prev).add(activeSrc))
          }}
        />
      ) : (
        (fallback ?? (
          <div
            className={cn(
              'grid size-full place-items-center',
              size === 'hero' ? 'text-on-ink/70' : 'text-ink-faint',
            )}
          >
            <ListMusic className={size === 'hero' ? 'size-14' : 'size-4'} />
          </div>
        ))
      )}
      <span className="sr-only">{label}</span>
    </div>
  )
}
