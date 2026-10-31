import { afterEach } from 'vitest'
import { MISSING_ENDPOINTS } from '../api/missing'

const removed = new Map<string, string>()

/** Pretends the backend shipped `endpoint` for the current test. */
export function markAvailable(endpoint: string): void {
  const request = MISSING_ENDPOINTS[endpoint]
  if (request === undefined) return
  removed.set(endpoint, request)
  delete MISSING_ENDPOINTS[endpoint]
}

afterEach(() => {
  for (const [endpoint, request] of removed) MISSING_ENDPOINTS[endpoint] = request
  removed.clear()
})
