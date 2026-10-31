/**
 * Shapes shared by every endpoint. Endpoint-specific types live with the
 * feature that uses them.
 */

/**
 * The wrapper around every response (`dto/response/ApiResponse.java`).
 *
 * The backend always sends `success`, `data` and `message`, and adds `code`
 * only on errors that carry one (e.g. `TOKEN_REVOKED`; see `API_CODES`).
 */
export interface ApiEnvelope<T> {
  success: boolean
  data: T | null
  message: string | null
  code?: string
}

/** `data` of a paged endpoint (`dto/response/PageResponse.java`). */
export interface Page<T> {
  content: T[]
  /** 0-based. */
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** Query parameters every paged endpoint accepts. There is no `sort`. */
export interface PageParams {
  page?: number
  size?: number
}
