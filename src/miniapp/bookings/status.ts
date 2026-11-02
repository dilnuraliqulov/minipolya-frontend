import type { ParseKeys } from 'i18next'
import type { BadgeTone } from '../components'

/**
 * THE booking status → badge mapping. An unknown status shows its raw value in
 * a neutral badge (`labelKey: null`).
 */
export function bookingStatusBadge(status: string): {
  tone: BadgeTone
  labelKey: ParseKeys | null
  raw: string
} {
  switch (status) {
    case 'pending':
      return { tone: 'warning', labelKey: 'bookings.status.pending', raw: status }
    case 'confirmed':
      return { tone: 'success', labelKey: 'bookings.status.confirmed', raw: status }
    case 'completed':
      return { tone: 'neutral', labelKey: 'bookings.status.completed', raw: status }
    case 'expired':
      return { tone: 'neutral', labelKey: 'bookings.status.expired', raw: status }
    case 'cancelled_by_user':
    case 'cancelled_by_owner':
    case 'cancelled_opponent_left':
      return { tone: 'danger', labelKey: 'bookings.status.cancelled', raw: status }
    default:
      return { tone: 'neutral', labelKey: null, raw: status }
  }
}
