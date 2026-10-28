import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef } from 'react'

/**
 * A small, static-feeling OpenStreetMap view with one marker. Loaded lazily
 * (React.lazy) so Leaflet is only downloaded when a stadium has coordinates.
 */
export default function StadiumMap({
  latitude,
  longitude,
  label,
}: {
  latitude: number
  longitude: number
  label: string
}) {
  const node = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!node.current) return
    const map = L.map(node.current, {
      center: [latitude, longitude],
      zoom: 15,
      scrollWheelZoom: false,
      attributionControl: true,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    // A circle marker needs no image assets. Leaflet paints with plain colours,
    // so read the theme tokens rather than hard-coding any.
    const token = (name: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    L.circleMarker([latitude, longitude], {
      radius: 9,
      color: token('--on-accent'),
      weight: 3,
      fillColor: token('--accent'),
      fillOpacity: 1,
    })
      .addTo(map)
      .bindTooltip(label)
    return () => {
      map.remove()
    }
  }, [latitude, longitude, label])

  return (
    <div
      ref={node}
      role="img"
      aria-label={`Xarita: ${label}`}
      className="isolate h-48 w-full overflow-hidden rounded-lg border border-border"
    />
  )
}
