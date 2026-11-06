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
  /** Serialised as JSON — or, as `FormData`, sent as multipart (the browser sets the boundary). */
  body?: unknown
  /** `undefined` and `null` values are dropped. */
  query?: Record<string, QueryValue>
  signal?: AbortSignal
  /** Extra headers, merged after the defaults. */
  headers?: Record<string, string>
}

/**
 * Dev: same origin — the Vite dev server proxies /api to the local backend.
 * Production builds: VITE_API_URL.
 */
function baseUrl(): string {
  if (import.meta.env.DEV) return window.location.origin
  const url = import.meta.env.VITE_API_URL
  if (!url) {
    throw new Error('VITE_API_URL is not set for this production build')
  }
  return url.replace(/\/+$/, '')
}

/**
 * A URL the backend hands out for a file it serves itself (e.g. an uploaded
 * photo, `/api/uploads/...`) made absolute against the API host; any other
 * URL unchanged.
 */
export function mediaUrl(url: string): string {
  return url.startsWith('/') ? baseUrl() + url : url
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
  // Caller headers first, so they can add but never replace Accept / Authorization / Content-Type.
  const headers: Record<string, string> = { ...options.headers, Accept: 'application/json' }
  const token = config.tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  const multipart = options.body instanceof FormData
  if (options.body !== undefined && !multipart) headers['Content-Type'] = 'application/json'

  // Outside the try: a configuration error must not look like a network failure.
  const url = buildUrl(path, options.query)

  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body === undefined
          ? undefined
          : multipart
            ? (options.body as FormData)
            : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError('Network request failed', 0)
  }

  const envelope = await readEnvelope<T>(response)
  return unwrap(response.ok, response.status, response.statusText, envelope)
}

/** The envelope's `data`, or the `ApiError` for a failure (after the 401 / blocked hooks). */
function unwrap<T>(
  ok: boolean,
  status: number,
  statusText: string,
  envelope: ApiEnvelope<T> | null,
): T {
  if (!ok || !envelope?.success) {
    const error = new ApiError(
      envelope?.message || statusText || 'Request failed',
      status,
      envelope?.code,
      envelope?.data ?? undefined,
    )
    if (error.status === 401) config.onUnauthorized?.(error)
    if (error.status === 403 && error.message === API_MESSAGES.accountBlocked) {
      config.onAccountBlocked?.(error)
    }
    throw error
  }
  return envelope.data as T
}

export interface UploadOptions {
  /** 0–1, as the request body goes out. */
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

/**
 * `POST` a multipart body with upload progress — `fetch` cannot report it, so
 * this one request type uses `XMLHttpRequest`. Same base URL, bearer token,
 * envelope and errors as `apiRequest`.
 */
export function uploadWithProgress<T>(
  path: string,
  body: FormData,
  { onProgress, signal }: UploadOptions = {},
): Promise<T> {
  const url = buildUrl(path)
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Accept', 'application/json')
    const token = config.tokenStore.get()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      let envelope: ApiEnvelope<T> | null
      try {
        envelope = JSON.parse(xhr.responseText) as ApiEnvelope<T>
      } catch {
        envelope = null
      }
      try {
        const ok = xhr.status >= 200 && xhr.status < 300
        resolve(unwrap(ok, xhr.status, xhr.statusText, envelope))
      } catch (error) {
        reject(error)
      }
    }
    xhr.onerror = () => reject(new ApiError('Network request failed', 0))
    xhr.ontimeout = xhr.onerror
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'))
    signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(body)
  })
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
