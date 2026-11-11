import { isInUzbekistan } from '../../shared/map'
import { DISTRICTS } from '../api/stadiums'
import { isCompletePhone } from '../profile/phone'

/**
 * The backend's rules for a stadium an owner adds or edits (`StadiumRules`,
 * design D1, D10–D15), checked here only so the owner hears about a mistake
 * before "Davom etish" / "Saqlash" — the backend still decides. Each check
 * answers a translation key, or null when the value is fine.
 */
export const STADIUM_LIMITS = {
  nameMin: 3,
  nameMax: 150,
  addressMin: 5,
  addressMax: 300,
  descriptionMax: 500,
  landmarkMax: 150,
  /** Soʻm. */
  priceMin: 10_000,
  priceMax: 5_000_000,
  photosMin: 3,
  photosMax: 10,
} as const

export type RuleKey =
  | 'owner.rules.nameLength'
  | 'owner.rules.addressLength'
  | 'owner.rules.districtRequired'
  | 'owner.rules.phoneFormat'
  | 'owner.rules.locationRequired'
  | 'owner.rules.outsideUzbekistan'
  | 'owner.rules.priceRange'
  | 'owner.rules.hoursOrder'
  | 'owner.rules.descriptionLength'
  | 'owner.rules.landmarkLength'
  | 'owner.rules.photosMin'

const L = STADIUM_LIMITS

const within = (value: string, min: number, max: number) => {
  const length = value.trim().length
  return length >= min && length <= max
}

export function checkName(name: string): RuleKey | null {
  return within(name, L.nameMin, L.nameMax) ? null : 'owner.rules.nameLength'
}

export function checkAddress(address: string): RuleKey | null {
  return within(address, L.addressMin, L.addressMax) ? null : 'owner.rules.addressLength'
}

export function checkDistrict(district: string): RuleKey | null {
  return (DISTRICTS as readonly string[]).includes(district) ? null : 'owner.rules.districtRequired'
}

/** `required: false` (editing an older stadium without one): empty is fine, anything typed must be whole. */
export function checkPhone(phone: string, required = true): RuleKey | null {
  const digits = phone.replace(/\D/g, '').replace(/^998/, '')
  if (!required && digits === '') return null
  return isCompletePhone(phone) ? null : 'owner.rules.phoneFormat'
}

export function checkLocation(point: { lat: number; lon: number } | null): RuleKey | null {
  if (!point) return 'owner.rules.locationRequired'
  return isInUzbekistan(point.lat, point.lon) ? null : 'owner.rules.outsideUzbekistan'
}

/** `som`: whole soʻm as typed (0 when empty). */
export function checkPrice(som: number): RuleKey | null {
  return som >= L.priceMin && som <= L.priceMax ? null : 'owner.rules.priceRange'
}

/** Whole hours 0–23 (D15); closing after midnight is not supported (D14). */
export function checkHours(open: number, close: number): RuleKey | null {
  return Number.isInteger(open) &&
    Number.isInteger(close) &&
    open >= 0 &&
    close <= 23 &&
    open < close
    ? null
    : 'owner.rules.hoursOrder'
}

export function checkDescription(description: string): RuleKey | null {
  return description.length <= L.descriptionMax ? null : 'owner.rules.descriptionLength'
}

export function checkLandmark(landmark: string): RuleKey | null {
  return landmark.trim().length <= L.landmarkMax ? null : 'owner.rules.landmarkLength'
}

export function checkPhotoCount(count: number): RuleKey | null {
  return count >= L.photosMin ? null : 'owner.rules.photosMin'
}

/** `8` → `"08:00:00"`, the API's `LocalTime`. */
export const hourToTime = (hour: number) => `${String(hour).padStart(2, '0')}:00:00`

/** `"08:00:00"` → `8`; a time off the hour (an older stadium) rounds down. */
export const timeToHour = (time: string) => Number(time.slice(0, 2)) || 0

/** `8` → `"08:00"` */
export const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`
