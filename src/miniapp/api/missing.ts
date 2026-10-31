/**
 * THE list of endpoints (and fields) the Mini App needs that the backend has
 * not shipped yet, each with its request in docs/backend-requests.md.
 *
 * While an endpoint is listed, everything that needs it shows "Tez orada" or
 * is hidden, and nothing is requested. Nothing is ever filled in instead.
 * When the backend ships one, delete its line: the real call takes over.
 * Keys are the constants next to the API functions (e.g. `PROFILE_FIELDS`).
 */
export const MISSING_ENDPOINTS: Record<string, string> = {
  'PATCH /api/users/me firstName, lastName, phone': 'R20',
  '403 Account is blocked data.reason, data.blockedAt': 'R21',
}

export type Availability = 'available' | 'soon'

export function availability(endpoint: string): Availability {
  return Object.hasOwn(MISSING_ENDPOINTS, endpoint) ? 'soon' : 'available'
}

export function isAvailable(endpoint: string): boolean {
  return availability(endpoint) === 'available'
}
