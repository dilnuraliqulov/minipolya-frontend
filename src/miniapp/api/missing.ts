import {
  BOOKING_CASH_PAID,
  BOOKING_PAY,
  BOOKING_QUOTE,
  BOOKING_STADIUM_FIELDS,
  BOOKINGS_WHEN,
} from './bookings'
import { TEAM_GAME_QUOTE } from './games'
import { STADIUMS_FREE_ON_DATE, STADIUMS_NEARBY } from './stadiums'

/**
 * THE list of endpoints (and fields) the Mini App needs that the backend has
 * not shipped yet, each with its request in docs/backend-requests.md.
 *
 * While an endpoint is listed, everything that needs it shows "Tez orada" or
 * is hidden, and nothing is requested. Nothing is ever filled in instead.
 * When the backend ships one, delete its line: the real call takes over.
 * Keys are the constants next to the API functions (e.g. `'GET /api/foo'`).
 *
 * Open: R24 (list sorted by distance/rating), R25 (list filtered to stadiums
 * free on a date), R27 (booking quote), R28 (pay a pending booking), R29
 * (upcoming/past filter on the booking list), R30 (cash paid on a booking),
 * R31 (stadium photo, district and format on a booking), R33 (team game quote),
 * R34 (server guard, nothing to gate) and R45 (a game being joined still on
 * the challenge board; teams/pendingJoins.ts covers this launch, nothing to
 * gate). R32, R35–R39, R41–R43 and R44 shipped
 * (docs/backend-requests.md, Done). R20, R21 and R23
 * shipped in backend `4d5faf0`.
 */
export const MISSING_ENDPOINTS: Record<string, string> = {
  [STADIUMS_NEARBY]: 'R24',
  [STADIUMS_FREE_ON_DATE]: 'R25',
  [BOOKING_QUOTE]: 'R27',
  [BOOKING_PAY]: 'R28',
  [BOOKINGS_WHEN]: 'R29',
  [BOOKING_CASH_PAID]: 'R30',
  [BOOKING_STADIUM_FIELDS]: 'R31',
  [TEAM_GAME_QUOTE]: 'R33',
}

export type Availability = 'available' | 'soon'

export function availability(endpoint: string): Availability {
  return Object.hasOwn(MISSING_ENDPOINTS, endpoint) ? 'soon' : 'available'
}

export function isAvailable(endpoint: string): boolean {
  return availability(endpoint) === 'available'
}
