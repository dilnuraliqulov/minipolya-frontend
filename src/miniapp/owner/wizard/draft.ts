import { somToTiyin } from '../../../shared/format'
import type { LatLon } from '../../../shared/map'
import type { CreateStadiumBody } from '../../api/owner'
import type { Amenities } from '../../api/stadiums'
import { formatPhoneInput, toWirePhone } from '../../profile/phone'
import { NO_AMENITIES } from '../../stadiums/facilities'
import {
  checkAddress,
  checkDescription,
  checkDistrict,
  checkHours,
  checkLandmark,
  checkLocation,
  checkName,
  checkPhone,
  checkPhotoCount,
  checkPrice,
  hourToTime,
  type RuleKey,
} from '../stadiumRules'

export const STEPS = ['basics', 'location', 'photos', 'facilities', 'hours', 'review'] as const
export type Step = (typeof STEPS)[number]

export interface DraftPhoto {
  /** Stays the same through upload and retries. */
  key: string
  /** Already downscaled on the device. */
  file: File
}

/** Everything the owner typed, kept while they go back and forth (D16). */
export interface Draft {
  name: string
  format: string
  surface: string
  /** As typed: "+998 90 123 45 67". */
  phone: string
  point: LatLon | null
  district: string
  address: string
  landmark: string
  photos: DraftPhoto[]
  amenities: Amenities
  description: string
  /** Whole hours, 0–23. */
  open: number
  close: number
  /** Whole soʻm, digits only. */
  price: string
}

export function initialDraft(profilePhone?: string): Draft {
  return {
    name: '',
    format: '7x7',
    surface: 'artificial',
    phone: formatPhoneInput(profilePhone ?? ''),
    point: null,
    district: '',
    address: '',
    landmark: '',
    photos: [],
    amenities: NO_AMENITIES,
    description: '',
    open: 8,
    close: 23,
    price: '',
  }
}

export type DraftAction =
  | { type: 'set'; patch: Partial<Draft> }
  | { type: 'addPhotos'; photos: DraftPhoto[] }
  | { type: 'removePhoto'; key: string }
  | { type: 'movePhoto'; from: number; to: number }

export function draftReducer(draft: Draft, action: DraftAction): Draft {
  switch (action.type) {
    case 'set':
      return { ...draft, ...action.patch }
    case 'addPhotos':
      return { ...draft, photos: [...draft.photos, ...action.photos] }
    case 'removePhoto':
      return { ...draft, photos: draft.photos.filter((p) => p.key !== action.key) }
    case 'movePhoto': {
      const photos = [...draft.photos]
      const [moved] = photos.splice(action.from, 1)
      if (!moved) return draft
      photos.splice(action.to, 0, moved)
      return { ...draft, photos }
    }
  }
}

export type DraftField =
  | 'name'
  | 'phone'
  | 'point'
  | 'district'
  | 'address'
  | 'landmark'
  | 'photos'
  | 'description'
  | 'hours'
  | 'price'

export type StepErrors = Partial<Record<DraftField, RuleKey>>

const som = (digits: string) => Number(digits || '0')

/** What is wrong on one step, mirroring the backend's rules (D12–D15). */
export function validateStep(step: Step, draft: Draft): StepErrors {
  const errors: StepErrors = {}
  const add = (field: DraftField, key: RuleKey | null) => {
    if (key) errors[field] = key
  }
  switch (step) {
    case 'basics':
      add('name', checkName(draft.name))
      add('phone', checkPhone(draft.phone))
      break
    case 'location':
      add('point', checkLocation(draft.point))
      add('district', checkDistrict(draft.district))
      add('address', checkAddress(draft.address))
      add('landmark', checkLandmark(draft.landmark))
      break
    case 'photos':
      add('photos', checkPhotoCount(draft.photos.length))
      break
    case 'facilities':
      add('description', checkDescription(draft.description))
      break
    case 'hours':
      add('hours', checkHours(draft.open, draft.close))
      add('price', checkPrice(som(draft.price)))
      break
    case 'review':
      break
  }
  return errors
}

/** The first step with a problem, or null when the whole draft is fine. */
export function firstInvalidStep(draft: Draft): Step | null {
  return STEPS.find((step) => Object.keys(validateStep(step, draft)).length > 0) ?? null
}

/** `POST /api/owner/stadiums` from a valid draft. */
export function toCreateBody(draft: Draft): CreateStadiumBody {
  const point = draft.point ?? { lat: 0, lon: 0 }
  const landmark = draft.landmark.trim()
  const description = draft.description.trim()
  return {
    name: draft.name.trim(),
    format: draft.format,
    surfaceType: draft.surface,
    phone: toWirePhone(draft.phone),
    latitude: Number(point.lat.toFixed(6)),
    longitude: Number(point.lon.toFixed(6)),
    district: draft.district,
    address: draft.address.trim(),
    ...(landmark ? { landmark } : {}),
    ...(description ? { description } : {}),
    amenities: draft.amenities,
    openTime: hourToTime(draft.open),
    closeTime: hourToTime(draft.close),
    pricePerHour: somToTiyin(som(draft.price)),
  }
}

/** Whether leaving would lose anything the owner entered. */
export function isDirty(draft: Draft, initial: Draft): boolean {
  return (
    JSON.stringify({ ...draft, photos: draft.photos.length }) !==
    JSON.stringify({ ...initial, photos: initial.photos.length })
  )
}
