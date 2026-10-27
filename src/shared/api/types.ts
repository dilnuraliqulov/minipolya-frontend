/**
 * Shapes shared by every endpoint. Endpoint-specific types live with the
 * feature that uses them.
 */

/**
 * The wrapper around every response (`dto/response/ApiResponse.java`).
 *
 * The backend sends `success`, `data` and `message` only. `code` is not sent
 * today (docs/api-reference.md, Q1); it is typed so the client picks it up
 * automatically once the backend adds it.
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
