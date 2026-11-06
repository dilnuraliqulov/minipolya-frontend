import {
  Armchair,
  Coffee,
  DoorOpen,
  GlassWater,
  Lightbulb,
  Shirt,
  ShowerHead,
  SquareParking,
  Toilet,
  Umbrella,
  Volleyball,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import type { Amenities } from '../api/stadiums'

export type FacilityKey = keyof Amenities

export interface Facility {
  key: FacilityKey
  icon: LucideIcon
  /** Translation key of its name. */
  label: `stadium.amenity.${FacilityKey}`
}

const facility = (key: FacilityKey, icon: LucideIcon): Facility => ({
  key,
  icon,
  label: `stadium.amenity.${key}`,
})

/**
 * The ten facilities an owner ticks ("Qulayliklar"), in the design's order.
 * `wifi` and `cafe` stay in the API (D9) but are not offered: see `ALL_FACILITIES`.
 */
export const FACILITIES: readonly Facility[] = [
  facility('parking', SquareParking),
  facility('lockerRoom', DoorOpen),
  facility('showers', ShowerHead),
  facility('toilet', Toilet),
  facility('lighting', Lightbulb),
  facility('covered', Umbrella),
  facility('equipmentRental', Volleyball),
  facility('bibs', Shirt),
  facility('drinkingWater', GlassWater),
  facility('tribune', Armchair),
]

/** Every amenity the API has, for showing what a stadium offers (older stadiums may have wifi/cafe). */
export const ALL_FACILITIES: readonly Facility[] = [
  ...FACILITIES,
  facility('wifi', Wifi),
  facility('cafe', Coffee),
]

/** No amenity ticked: the starting point of a new stadium. */
export const NO_AMENITIES: Amenities = {
  parking: false,
  lighting: false,
  showers: false,
  lockerRoom: false,
  wifi: false,
  cafe: false,
  equipmentRental: false,
  tribune: false,
  toilet: false,
  covered: false,
  bibs: false,
  drinkingWater: false,
}

/** The facilities a stadium has, in display order. */
export function presentFacilities(amenities: Partial<Amenities> | undefined): Facility[] {
  return ALL_FACILITIES.filter((f) => amenities?.[f.key])
}
