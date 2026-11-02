import { afterEach } from 'vitest'
import { MISSING_ENDPOINTS } from '../api/missing'

const removed = new Map<string, string>()
const added = new Set<string>()

/** Pretends the backend shipped `endpoint` for the current test. */
export function markAvailable(endpoint: string): void {
  const request = MISSING_ENDPOINTS[endpoint]
  if (request === undefined) return
  removed.set(endpoint, request)
  delete MISSING_ENDPOINTS[endpoint]
}

/** Puts `endpoint` on the missing list for the current test, as if not shipped. */
export function markMissing(endpoint: string, request = 'R?'): void {
  if (Object.hasOwn(MISSING_ENDPOINTS, endpoint)) return
  MISSING_ENDPOINTS[endpoint] = request
  added.add(endpoint)
}

afterEach(() => {
  for (const endpoint of added) delete MISSING_ENDPOINTS[endpoint]
  added.clear()
  for (const [endpoint, request] of removed) MISSING_ENDPOINTS[endpoint] = request
  removed.clear()
})
