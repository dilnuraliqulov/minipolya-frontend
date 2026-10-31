/**
 * THE list of endpoints (and fields) the admin panel needs that the backend
 * has not shipped yet, each with its request in docs/backend-requests.md, e.g.
 * `'GET /api/admin/payments': 'R16'`.
 *
 * While an endpoint is listed, everything that needs it shows "Tez orada":
 * its section says so, its column or field is hidden, its filter or button is
 * disabled with the tooltip "Tez orada", and nothing is requested. Nothing is
 * ever filled in instead.
 *
 * When the backend ships one, delete its line: the real call takes over.
 * Every request the panel had asked for has shipped (backend 00d3bb7), so the
 * list is empty.
 */
export const MISSING_ENDPOINTS: Record<string, string> = {}

export type Availability = 'available' | 'soon'

export function availability(endpoint: string): Availability {
  return Object.hasOwn(MISSING_ENDPOINTS, endpoint) ? 'soon' : 'available'
}

export function isAvailable(endpoint: string): boolean {
  return availability(endpoint) === 'available'
}
