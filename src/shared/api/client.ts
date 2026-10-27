import { ApiError } from './ApiError'
import { API_MESSAGES } from './messages'
import { createMemoryTokenStore, type TokenStore } from './tokenStore'
import type { ApiEnvelope } from './types'

export interface ApiClientConfig {
  tokenStore: TokenStore
  /** Called on any 401. The Mini App re-posts initData; the admin goes to login. */
  onUnauthorized?: (error: ApiError) => void
  /** Called on 403 "Account is blocked", which can arrive from any endpoint. */
  onAccountBlocked?: (error: ApiError) => void
}

let config: ApiClientConfig = { tokenStore: createMemoryTokenStore() }

/** Each app calls this once at startup, before the first request. */
export function configureApiClient(next: ApiClientConfig): void {
  config = next
}

export function getTokenStore(): TokenStore {
  return config.tokenStore
}

type QueryValue = string | number | boolean | undefined | null

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Serialised as JSON. */
  body?: unknown
  /** `undefined` and `null` values are dropped. */
  query?: Record<string, QueryValue>
  signal?: AbortSignal
}

function baseUrl(): string {
  const url = import.meta.env.VITE_API_URL
  if (!url) {
    throw new Error('VITE_API_URL is not set — copy .env.example to .env.local')
  }
  return url.replace(/\/+$/, '')
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(baseUrl() + path)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  }
  return url.toString()
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  try {
    return (await response.json()) as ApiEnvelope<T>
  } catch {
    return null
  }
}

/**
 * Sends a request and returns the envelope's `data`. Throws `ApiError` for
 * any non-2xx status, an envelope with `success: false`, or a network failure.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = config.tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError('Network request failed', 0)
  }

  const envelope = await readEnvelope<T>(response)

  if (!response.ok || !envelope?.success) {
    const error = new ApiError(
      envelope?.message || response.statusText || 'Request failed',
      response.status,
      envelope?.code,
    )
    if (error.status === 401) config.onUnauthorized?.(error)
    if (error.status === 403 && error.message === API_MESSAGES.accountBlocked) {
      config.onAccountBlocked?.(error)
    }
    throw error
  }

  return envelope.data as T
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
}
