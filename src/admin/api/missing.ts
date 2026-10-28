import { SHOW_SAMPLE_DATA } from './sample'

/**
 * THE list of endpoints (and fields) the admin panel calls that the backend
 * has not shipped yet, each with its request in docs/backend-requests.md.
 *
 * The API functions are written against those contracts and go through
 * `viaSample` below. While an endpoint is listed here:
 * - in development, a sample adapter (`./sample/adapter`, never in a
 *   production build) answers instead, and every value it gives is tagged
 *   "Namuna";
 * - in a production build, the section shows "Tez orada" and its actions are
 *   disabled.
 *
 * When the backend ships one, delete its line: the real call takes over unchanged.
 */
export const MISSING_ENDPOINTS = {
  'GET /api/admin/stats → failedRefunds, oldestFailedRefundAt': 'R8',
} as const

export type MissingEndpoint = keyof typeof MISSING_ENDPOINTS

export type Availability =
  /** The backend serves it. */
  | 'real'
  /** Missing; development answers with sample data. */
  | 'sample'
  /** Missing; a production build shows "Tez orada". */
  | 'soon'

export function availability(endpoint: string | null): Availability {
  if (endpoint === null || !Object.hasOwn(MISSING_ENDPOINTS, endpoint)) return 'real'
  return SHOW_SAMPLE_DATA ? 'sample' : 'soon'
}

/** The backend request for a missing endpoint, for the "Namuna" tag. */
export function requestFor(endpoint: string): string | undefined {
  return (MISSING_ENDPOINTS as Record<string, string>)[endpoint]
}

/** Thrown when a production build reaches an endpoint that does not exist yet. */
export class NotAvailableError extends Error {
  readonly endpoint: string
  constructor(endpoint: string) {
    super(`Not available yet: ${endpoint}`)
    this.endpoint = endpoint
    this.name = 'NotAvailableError'
  }
}

export type SampleAdapter = typeof import('./sample/adapter')

/**
 * Calls the real endpoint, or — while it is missing — the development sample
 * adapter. The adapter is imported only behind `import.meta.env.DEV`, so a
 * production build contains none of it.
 */
export async function viaSample<T>(
  endpoint: string,
  real: () => Promise<T>,
  sample: (adapter: SampleAdapter) => T | Promise<T>,
): Promise<T> {
  const mode = availability(endpoint)
  if (mode === 'real') return real()
  // Both conditions: the DEV check is what keeps the adapter out of a production build.
  if (mode === 'sample' && import.meta.env.DEV) {
    const adapter = await import('./sample/adapter')
    return sample(adapter)
  }
  throw new NotAvailableError(endpoint)
}
