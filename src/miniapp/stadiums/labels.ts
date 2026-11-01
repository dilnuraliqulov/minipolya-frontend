import type { Amenities } from '../api/stadiums'

/** `"7x7"` → `"7×7"`, as the design writes formats. */
export function formatLabel(format: string): string {
  return format.replace('x', '×')
}

/** A rating from the API for display: `4.83` → `"4.8"`. */
export function ratingLabel(rating: number): string {
  return rating.toFixed(1)
}

/** `surfaceType` → translation key; unknown values show as they are. */
export const SURFACE_KEYS = {
  natural: 'stadium.surface.natural',
  artificial: 'stadium.surface.artificial',
  hybrid: 'stadium.surface.hybrid',
} as const

export function isKnownSurface(value: string): value is keyof typeof SURFACE_KEYS {
  return Object.hasOwn(SURFACE_KEYS, value)
}

/** The translated surface name; an unknown value shows as it is. */
export function surfaceLabel(
  value: string,
  t: (key: (typeof SURFACE_KEYS)[keyof typeof SURFACE_KEYS]) => string,
): string {
  return isKnownSurface(value) ? t(SURFACE_KEYS[value]) : value
}

/** The amenities the API reports, in the design's order, with their labels. */
export const AMENITY_KEYS = {
  lighting: 'stadium.amenity.lighting',
  lockerRoom: 'stadium.amenity.lockerRoom',
  showers: 'stadium.amenity.showers',
  parking: 'stadium.amenity.parking',
  tribune: 'stadium.amenity.tribune',
  equipmentRental: 'stadium.amenity.equipmentRental',
  wifi: 'stadium.amenity.wifi',
  cafe: 'stadium.amenity.cafe',
} as const satisfies Record<keyof Amenities, string>
