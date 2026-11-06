import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { OSM_TILES, PIN_HTML } from '../lib/mapPin'

/**
 * A small, still OpenStreetMap preview (Leaflet) with the stadium's pin.
 * Moving around happens in the full map ("Xaritada ochish").
 */
export function StadiumMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const { t } = useTranslation()
  const container = useRef<HTMLDivElement>(null)
  const attribution = t('stadium.mapAttribution')

  useEffect(() => {
    if (!container.current) return
    const map = L.map(container.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    })
    L.tileLayer(OSM_TILES, {
      maxZoom: 19,
      attribution,
    }).addTo(map)
    L.marker([latitude, longitude], {
      icon: L.divIcon({ className: '', html: PIN_HTML, iconSize: [36, 36], iconAnchor: [18, 18] }),
      interactive: false,
      // Without this Leaflet makes the pin a focusable, unlabelled role="button".
      keyboard: false,
    }).addTo(map)
    return () => {
      map.remove()
    }
  }, [latitude, longitude, attribution])

  return (
    <div
      ref={container}
      role="img"
      aria-label={t('stadium.mapLabel')}
      className="isolate h-35 overflow-hidden rounded-xl bg-surface"
    />
  )
}
