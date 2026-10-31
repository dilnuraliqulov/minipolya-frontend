/**
 * Thrown by the API client for every failed request.
 *
 * Branch on `code` where the backend sends one, otherwise on `status`.
 * `message` is the backend's prose — never show it to a user directly, and
 * only compare it against the constants in `./messages.ts`.
 */
export class ApiError extends Error {
  /** HTTP status, or 0 when no response arrived (network failure, CORS). */
  readonly status: number
  /** Machine-readable code. Sent only on some errors so far (see `API_CODES`). */
  readonly code?: string
  /** The envelope's `data` on an error — e.g. `{ minutesRemaining }` with `ACCOUNT_LOCKED`. */
  readonly data?: unknown

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
