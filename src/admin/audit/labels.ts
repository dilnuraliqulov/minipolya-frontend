/**
 * THE mapping file for the audit log: every action, actor type, entity type
 * and changed field the backend writes (api-reference §10.9, backend
 * `AuditAction` and the services' `.change(...)` calls), in plain Uzbek.
 *
 * Unknown codes are shown as the code itself, so a new backend action still
 * reads, just untranslated. Values are never shown as raw JSON.
 */
import { formatNumber, formatSom } from '../../shared/format'
import { formatDate, formatDateTime } from '../../shared/format'
import type { AuditActorType, AuditValue } from '../api/audit'
import {
  BOOKING_PAYMENT_STATUSES,
  BOOKING_STATUSES,
  GAME_STATUSES,
  GAME_TYPES,
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  STADIUM_STATUSES,
  SURFACE_TYPES,
} from '../statuses'

export const ACTION_LABELS: Record<string, string> = {
  // Admin
  ADMIN_LOGIN_SUCCEEDED: 'Panelga kirdi',
  ADMIN_LOGIN_FAILED: 'Panelga kira olmadi',
  APPLICATION_APPROVED: 'Egalik arizasini tasdiqladi',
  APPLICATION_REJECTED: 'Egalik arizasini rad etdi',
  STADIUM_APPROVED: 'Maydonni tasdiqladi',
  STADIUM_REJECTED: 'Maydonni rad etdi',
  STADIUM_BLOCKED: 'Maydonni blokladi',
  STADIUM_UNBLOCKED: 'Maydonni blokdan chiqardi',
  STADIUM_STATUS_CHANGED: 'Maydon holatini oʻzgartirdi',
  USER_BLOCKED: 'Foydalanuvchini blokladi',
  USER_UNBLOCKED: 'Foydalanuvchini blokdan chiqardi',
  USER_ROLE_CHANGED: 'Foydalanuvchi rolini oʻzgartirdi',
  SETTINGS_CHANGED: 'Sozlamalarni oʻzgartirdi',
  PLATFORM_SETTINGS_UPDATED: 'Sozlamalarni oʻzgartirdi',
  // Owner
  STADIUM_CREATED: 'Maydon qoʻshdi',
  STADIUM_UPDATED: 'Maydon maʼlumotlarini oʻzgartirdi',
  PRICING_RULE_CREATED: 'Narx qoidasini qoʻshdi',
  PRICING_RULE_UPDATED: 'Narx qoidasini oʻzgartirdi',
  PRICING_RULE_DELETED: 'Narx qoidasini oʻchirdi',
  CLOSURE_CREATED: 'Maydonni vaqtincha yopdi',
  CLOSURE_DELETED: 'Yopilishni bekor qildi',
  PROMOTION_CREATED: 'Aksiya qoʻshdi',
  PROMOTION_DEACTIVATED: 'Aksiyani toʻxtatdi',
  MANUAL_BOOKING_CREATED: 'Qoʻlda bron qoʻshdi',
  CASH_RECEIVED: 'Naqd pulni qabul qildi',
  BOOKING_CANCELLED_BY_OWNER: 'Bronni bekor qildi',
  // Player
  BOOKING_CREATED: 'Bron qildi',
  BOOKING_CANCELLED_BY_USER: 'Bronni bekor qildi',
  BOOKING_REMAINDER_PAID: 'Bron qoldigʻini toʻladi',
  BOOKING_SERIES_CREATED: 'Doimiy bron qildi',
  BOOKING_SERIES_CANCELLED: 'Doimiy bronni bekor qildi',
  GAME_CREATED: 'Oʻyin yaratdi',
  GAME_JOINED: 'Oʻyinga qoʻshildi',
  GAME_LEFT: 'Oʻyindan chiqdi',
  GAME_CANCELLED: 'Oʻyinni bekor qildi',
  GAME_OPPONENT_LEFT: 'Raqib sifatida chiqib ketdi',
  GAME_REMAINDER_PAID: 'Oʻyin qoldigʻini toʻladi',
  // System
  BOOKING_CONFIRMED: 'Bron tasdiqlandi',
  BOOKING_EXPIRED: 'Bron muddati oʻtdi',
  BOOKING_COMPLETED: 'Bron yakunlandi',
  GAME_CONFIRMED: 'Oʻyin tasdiqlandi',
  GAME_AUTO_CANCELLED: 'Oʻyin avtomatik bekor qilindi',
  PAYMENT_COMPLETED: 'Toʻlov qabul qilindi',
  PAYMENT_RELEASED: 'Ushlab turilgan pul boʻshatildi',
  REFUND_CREATED: 'Pul qaytarildi',
  PROMOTION_EXPIRED: 'Aksiya muddati tugadi',
}

export const ACTOR_TYPE_LABELS: Record<AuditActorType, string> = {
  ADMIN: 'Admin',
  OWNER: 'Maydon egasi',
  PLAYER: 'Oʻyinchi',
  SYSTEM: 'Tizim',
}

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  user: 'Foydalanuvchi',
  stadium: 'Maydon',
  owner_application: 'Egalik arizasi',
  platform_settings: 'Sozlamalar',
  pricing_rule: 'Narx qoidasi',
  stadium_closure: 'Yopilish',
  promotion: 'Aksiya',
  booking: 'Bron',
  booking_series: 'Doimiy bron',
  game: 'Oʻyin',
  payment: 'Toʻlov',
}

type Kind =
  | 'money'
  | 'percent'
  | 'bool'
  | 'datetime'
  | 'date'
  | 'time'
  | 'day'
  | 'hours'
  | 'count'
  | 'status'
  | 'enum'
  | 'id'
  | 'list'
  | 'text'

interface FieldLabel {
  label: string
  kind: Kind
  /** For `enum`: the value labels. */
  values?: Record<string, string>
}

const AMENITY = (label: string): FieldLabel => ({ label, kind: 'bool' })

export const FIELD_LABELS: Record<string, FieldLabel> = {
  status: { label: 'Holat', kind: 'status' },
  paymentStatus: {
    label: 'Toʻlov holati',
    kind: 'enum',
    values: Object.fromEntries(
      Object.entries(BOOKING_PAYMENT_STATUSES).map(([k, v]) => [k, v.label]),
    ),
  },
  paidAmount: { label: 'Toʻlangan', kind: 'money' },
  price: { label: 'Narx', kind: 'money' },
  totalPrice: { label: 'Umumiy narx', kind: 'money' },
  amount: { label: 'Summa', kind: 'money' },
  refundAmount: { label: 'Qaytarilgan summa', kind: 'money' },
  releasedAmount: { label: 'Boʻshatilgan summa', kind: 'money' },
  refundPaymentId: { label: 'Qaytarish toʻlovi', kind: 'id' },
  bookingId: { label: 'Bron', kind: 'id' },
  method: { label: 'Usul', kind: 'enum', values: PAYMENT_METHODS },
  provider: { label: 'Provayder', kind: 'enum', values: PAYMENT_PROVIDERS },
  paymentOption: {
    label: 'Toʻlov varianti',
    kind: 'enum',
    values: { MINIMUM: 'Minimal summa', FULL: 'Toʻliq', minimum: 'Minimal summa', full: 'Toʻliq' },
  },
  startsAt: { label: 'Boshlanishi', kind: 'datetime' },
  endsAt: { label: 'Tugashi', kind: 'datetime' },
  durationHours: { label: 'Davomiyligi', kind: 'hours' },
  dayOfWeek: { label: 'Hafta kuni', kind: 'day' },
  startTime: { label: 'Boshlanish vaqti', kind: 'time' },
  endTime: { label: 'Tugash vaqti', kind: 'time' },
  startDate: { label: 'Boshlanish sanasi', kind: 'date' },
  endDate: { label: 'Tugash sanasi', kind: 'date' },
  pricePerHour: { label: 'Soatlik narx', kind: 'money' },
  discountPercent: { label: 'Chegirma', kind: 'percent' },
  name: { label: 'Nomi', kind: 'text' },
  clientName: { label: 'Mijoz', kind: 'text' },
  type: { label: 'Turi', kind: 'enum', values: GAME_TYPES },
  maxPlayers: { label: 'Oʻyinchilar soni', kind: 'count' },
  team: { label: 'Jamoa', kind: 'text' },
  teamA: { label: 'A jamoa', kind: 'text' },
  side: { label: 'Tomon', kind: 'enum', values: { a: 'A jamoa', b: 'B jamoa' } },
  players: { label: 'Oʻyinchilar', kind: 'list' },
  isActive: { label: 'Faol', kind: 'bool' },
  isOwner: { label: 'Maydon egasi', kind: 'bool' },
  isAdmin: { label: 'Admin', kind: 'bool' },
  isBlocked: { label: 'Bloklangan', kind: 'bool' },
  failedLoginAttempts: { label: 'Muvaffaqiyatsiz urinishlar', kind: 'count' },
  lockedUntil: { label: 'Qulflangan', kind: 'datetime' },
  lastLoginAt: { label: 'Oxirgi kirish', kind: 'datetime' },
  bookingCommissionPercent: { label: 'Oddiy bronlar komissiyasi', kind: 'percent' },
  teamGamePlatformFee: { label: 'Jamoa vs jamoa: platforma haqi', kind: 'money' },
  casualGameServiceFee: { label: 'Doʻstlar bilan oʻyin: xizmat haqi', kind: 'money' },
  // The stadium snapshot (owner edits).
  address: { label: 'Manzil', kind: 'text' },
  latitude: { label: 'Kenglik', kind: 'text' },
  longitude: { label: 'Uzunlik', kind: 'text' },
  phone: { label: 'Telefon', kind: 'text' },
  description: { label: 'Tavsif', kind: 'text' },
  format: { label: 'Format', kind: 'text' },
  surfaceType: { label: 'Qoplama', kind: 'enum', values: SURFACE_TYPES },
  openTime: { label: 'Ochilish vaqti', kind: 'time' },
  closeTime: { label: 'Yopilish vaqti', kind: 'time' },
  minBookingAmount: { label: 'Minimal toʻlov', kind: 'money' },
  cancellationHours: { label: 'Bekor qilish muddati', kind: 'hours' },
  photos: { label: 'Rasmlar', kind: 'list' },
  'amenities.parking': AMENITY('Avtoturargoh'),
  'amenities.lighting': AMENITY('Yoritish'),
  'amenities.showers': AMENITY('Dush'),
  'amenities.lockerRoom': AMENITY('Kiyinish xonasi'),
  'amenities.wifi': AMENITY('Wi-Fi'),
  'amenities.cafe': AMENITY('Kafe'),
  'amenities.equipmentRental': AMENITY('Jihoz ijarasi'),
  'amenities.tribune': AMENITY('Tribuna'),
}

const DAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba']

/** `status` means different things on different entities. */
const STATUS_BY_ENTITY: Record<string, Record<string, { label: string }>> = {
  booking: BOOKING_STATUSES,
  game: GAME_STATUSES,
  stadium: STADIUM_STATUSES,
  payment: PAYMENT_STATUSES,
}

export function actionLabel(code: string): string {
  return ACTION_LABELS[code] ?? code
}

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field]?.label ?? field
}

/** One value of a change, readable: money formatted, statuses in Uzbek, Ha/Yoʻq. Null → "—". */
export function formatAuditValue(
  field: string,
  value: AuditValue | undefined,
  entityType?: string,
): string {
  if (value === null || value === undefined || value === '') return '—'
  const spec = FIELD_LABELS[field]
  if (Array.isArray(value)) {
    if (field === 'photos') return `${formatNumber(value.length)} ta rasm`
    return value.length ? value.map((v) => formatAuditValue('', v)).join(', ') : '—'
  }
  if (typeof value === 'boolean') return value ? 'Ha' : 'Yoʻq'
  switch (spec?.kind) {
    case 'money':
      return typeof value === 'number' ? formatSom(value) : String(value)
    case 'percent':
      return `${String(value)}%`
    case 'hours':
      return `${String(value)} soat`
    case 'count':
      return typeof value === 'number' ? formatNumber(value) : String(value)
    case 'day':
      return typeof value === 'number' ? (DAYS[value] ?? String(value)) : String(value)
    case 'datetime':
      return typeof value === 'string' ? safe(() => formatDateTime(value), value) : String(value)
    case 'date':
      // A LocalDate ("2026-11-02") has no time zone; show it as is, reordered.
      return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? value.split('-').reverse().join('.')
        : typeof value === 'string'
          ? safe(() => formatDate(value), value)
          : String(value)
    case 'time':
      // A LocalTime ("09:00:00") → "09:00".
      return String(value).slice(0, 5)
    case 'status': {
      const map = entityType ? STATUS_BY_ENTITY[entityType] : undefined
      return map?.[String(value)]?.label ?? String(value)
    }
    case 'enum':
      return spec.values?.[String(value)] ?? String(value)
    default:
      return typeof value === 'number' ? String(value) : value
  }
}

function safe(format: () => string, fallback: string): string {
  try {
    return format()
  } catch {
    return fallback
  }
}
