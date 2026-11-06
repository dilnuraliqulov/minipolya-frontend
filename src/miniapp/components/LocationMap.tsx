import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Minus, Plus } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { TASHKENT, type LatLon } from '../../shared/map'
import { OSM_TILES, PIN_HTML } from '../lib/mapPin'

const START_ZOOM = 12
const POINT_ZOOM = 17

const reducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export interface LocationMapProps {
  point: LatLon | null
  /** Changes when the point was set from outside (my location, a link): the map flies there. */
  focus: number
  onPick: (point: LatLon) => void
}

/**
 * The interactive map of LocationPicker (Leaflet + OpenStreetMap, loaded
 * lazily with it): a tap anywhere moves the pin, the pin can be dragged.
 * Starts on Tashkent (zoom 12), or on the point (zoom 17).
 */
export function LocationMap({ point, focus, onPick }: LocationMapProps) {
  const { t } = useTranslation()
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const marker = useRef<L.Marker | null>(null)
  const pick = useRef(onPick)
  useEffect(() => {
    pick.current = onPick
  })
  const attribution = t('stadium.mapAttribution')
  const initial = useRef(point)

  useEffect(() => {
    if (!container.current) return
    const start = initial.current
    const instance = L.map(container.current, {
      center: start ? [start.lat, start.lon] : [TASHKENT.lat, TASHKENT.lon],
      zoom: start ? POINT_ZOOM : START_ZOOM,
      zoomControl: false,
      keyboard: false,
    })
    L.tileLayer(OSM_TILES, { maxZoom: 19, attribution }).addTo(instance)
    instance.on('click', (event: L.LeafletMouseEvent) =>
      pick.current({ lat: event.latlng.lat, lon: event.latlng.lng }),
    )
    map.current = instance
    return () => {
      instance.remove()
      map.current = null
      marker.current = null
    }
  }, [attribution])

  const lat = point?.lat
  const lon = point?.lon
  useEffect(() => {
    const instance = map.current
    if (!instance) return
    if (lat === undefined || lon === undefined) {
      marker.current?.remove()
      marker.current = null
      return
    }
    if (marker.current) {
      marker.current.setLatLng([lat, lon])
      return
    }
    const created = L.marker([lat, lon], {
      icon: L.divIcon({ className: '', html: PIN_HTML, iconSize: [36, 36], iconAnchor: [18, 18] }),
      draggable: true,
      keyboard: false,
    }).addTo(instance)
    created.on('dragend', () => {
      const at = created.getLatLng()
      pick.current({ lat: at.lat, lon: at.lng })
    })
    marker.current = created
  }, [lat, lon])

  useEffect(() => {
    if (focus === 0 || lat === undefined || lon === undefined) return
    map.current?.flyTo([lat, lon], POINT_ZOOM, { animate: !reducedMotion() })
    // Only a new focus moves the view; a tap or a drag leaves it where the owner put it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])

  return (
    <div className="relative isolate h-50 overflow-hidden rounded-xl border border-border bg-surface">
      <div
        ref={container}
        role="application"
        aria-label={t('owner.location.mapLabel')}
        className="size-full"
      />
      <div className="absolute top-2 right-2 z-[1000] flex flex-col overflow-hidden rounded-lg border border-border bg-background shadow-md">
        <button
          type="button"
          aria-label={t('owner.location.zoomIn')}
          onClick={() => map.current?.zoomIn()}
          className="flex size-11 items-center justify-center text-primary"
        >
          <Plus size={18} aria-hidden />
        </button>
        <span className="h-px bg-border" aria-hidden />
        <button
          type="button"
          aria-label={t('owner.location.zoomOut')}
          onClick={() => map.current?.zoomOut()}
          className="flex size-11 items-center justify-center text-primary"
        >
          <Minus size={18} aria-hidden />
        </button>
      </div>
    </div>
  )
}

export default LocationMap
