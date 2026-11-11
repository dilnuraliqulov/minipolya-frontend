/**
 * An OpenStreetMap link for a stadium: its coordinates, or a search for its
 * address. Used by both apps ("Xaritada ochish").
 */
export function mapLink({
  latitude,
  longitude,
  address,
}: {
  latitude?: number
  longitude?: number
  address: string
}): string {
  if (latitude !== undefined && longitude !== undefined) {
    return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`
  }
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`
}

/** Yandex Maps with a pin on the point (Yandex writes longitude first). */
export function yandexMapsLink(latitude: number, longitude: number): string {
  return `https://yandex.uz/maps/?pt=${longitude},${latitude}&z=17&l=map`
}

/** Google Maps searching the point, which drops a pin on it. */
export function googleMapsLink(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
}

/** Uzbekistan's bounding box, as the backend checks a stadium's location ("Location must be inside Uzbekistan"). */
export const UZBEKISTAN_BOUNDS = { latMin: 37.1, latMax: 45.6, lonMin: 55.9, lonMax: 73.2 } as const

export function isInUzbekistan(latitude: number, longitude: number): boolean {
  const b = UZBEKISTAN_BOUNDS
  return (
    latitude >= b.latMin && latitude <= b.latMax && longitude >= b.lonMin && longitude <= b.lonMax
  )
}

/** Tashkent's centre, where a map with no point yet starts. */
export const TASHKENT = { lat: 41.2995, lon: 69.2401 } as const
