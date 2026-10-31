import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

/** lucide "map-pin", drawn inside the design's 36px accent pin. */
const PIN_HTML =
  '<span class="flex size-9 items-center justify-center rounded-full bg-accent text-on-accent shadow-md">' +
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>' +
  '<circle cx="12" cy="10" r="3"/></svg></span>'

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
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution,
    }).addTo(map)
    L.marker([latitude, longitude], {
      icon: L.divIcon({ className: '', html: PIN_HTML, iconSize: [36, 36], iconAnchor: [18, 18] }),
      interactive: false,
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
