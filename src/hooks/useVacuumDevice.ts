import { useEffect, useMemo, useState } from 'react'
import { useHAConnection, type EntityState } from 'hass-react'

function vacuumSlug(entityId: string) {
  return entityId.replace(/^vacuum\./, '')
}

function isRelated(entityId: string, slug: string) {
  return (
    entityId === `vacuum.${slug}` ||
    entityId.includes(`_${slug}_`) ||
    entityId.endsWith(`_${slug}`) ||
    entityId.includes(`.${slug}_`)
  )
}

function preferMapCamera(
  cameras: EntityState[],
  preferredIds: readonly string[] = [],
) {
  const scored = cameras.map((camera) => {
    const id = camera.entity_id
    let score = 0
    const preferredIndex = preferredIds.indexOf(id)
    if (preferredIndex >= 0) score += 100 - preferredIndex
    if (id.includes('map_data')) score += 30
    else if (id.endsWith('_map') || id.includes('_map_')) score += 20
    if (id.includes('saved') || id.includes('recovery')) score -= 10
    if (camera.state !== 'unavailable' && camera.state !== 'unknown') score += 5
    if (camera.attributes.access_token || camera.attributes.entity_picture)
      score += 5
    return { camera, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.camera ?? null
}

export type VacuumDeviceInfo = {
  slug: string
  related: EntityState[]
  cameras: EntityState[]
  mapCameraId: string | null
  sensors: EntityState[]
  switches: EntityState[]
  binarySensors: EntityState[]
  selects: EntityState[]
  buttons: EntityState[]
  loading: boolean
}

export function useVacuumDevice(
  vacuumEntityId: string,
  preferredMapCameras: readonly string[] = [],
): VacuumDeviceInfo {
  const { connection, connected } = useHAConnection()
  const slug = vacuumSlug(vacuumEntityId)
  const [related, setRelated] = useState<EntityState[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!connection || !connected) {
      setLoading(Boolean(connection && !connected))
      return
    }

    let cancelled = false
    setLoading(true)

    void connection
      .sendMessagePromise<EntityState[]>({ type: 'get_states' })
      .then((states) => {
        if (cancelled) return
        setRelated(states.filter((state) => isRelated(state.entity_id, slug)))
      })
      .catch(() => {
        if (!cancelled) setRelated([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [connection, connected, slug])

  return useMemo(() => {
    const cameras = related.filter((e) => e.entity_id.startsWith('camera.'))
    const mapCamera = preferMapCamera(cameras, preferredMapCameras)

    return {
      slug,
      related,
      cameras,
      mapCameraId: mapCamera?.entity_id ?? preferredMapCameras[0] ?? null,
      sensors: related.filter((e) => e.entity_id.startsWith('sensor.')),
      switches: related.filter((e) => e.entity_id.startsWith('switch.')),
      binarySensors: related.filter((e) =>
        e.entity_id.startsWith('binary_sensor.'),
      ),
      selects: related.filter((e) => e.entity_id.startsWith('select.')),
      buttons: related.filter((e) => e.entity_id.startsWith('button.')),
      loading,
    }
  }, [loading, preferredMapCameras, related, slug])
}

export function friendlyLabel(entityId: string, attributes: Record<string, unknown>) {
  const name = attributes.friendly_name
  if (typeof name === 'string' && name.trim()) {
    return name
      .replace(/^X40 Ultra\s+/i, '')
      .replace(/\s+X40 Ultra$/i, '')
      .trim()
  }
  return entityId.split('.').pop()?.replace(/_/g, ' ') ?? entityId
}

export function formatSensorValue(entity: EntityState) {
  if (entity.state === 'unavailable' || entity.state === 'unknown') return '—'
  const unit =
    typeof entity.attributes.unit_of_measurement === 'string'
      ? entity.attributes.unit_of_measurement
      : ''
  const value = String(entity.state).replace(/_/g, ' ')
  return unit ? `${value}${unit.length === 1 ? '' : ' '}${unit}` : value
}
