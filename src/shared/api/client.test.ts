import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './ApiError'
import { api, configureApiClient } from './client'
import { shouldRetry } from './queryClient'
import { createMemoryTokenStore } from './tokenStore'

function respond(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('api client', () => {
  const tokenStore = createMemoryTokenStore()
  const onUnauthorized = vi.fn()
  const onAccountBlocked = vi.fn()

  beforeEach(() => {
    // Behave like a production build unless a test says otherwise.
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_API_URL', 'http://api.test/')
    tokenStore.clear()
    configureApiClient({ tokenStore, onUnauthorized, onAccountBlocked })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('unwraps data and sends the bearer token', async () => {
    const fetchMock = respond(200, { success: true, data: { id: 'a' }, message: null })
    vi.stubGlobal('fetch', fetchMock)
    tokenStore.set('jwt-123')

    await expect(
      api.get('/api/users/me', { query: { page: 0, size: undefined } }),
    ).resolves.toEqual({
      id: 'a',
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://api.test/api/users/me?page=0')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123')
  })

  it('calls its own origin in dev, for the Vite /api proxy', async () => {
    vi.stubEnv('DEV', true)
    const fetchMock = respond(200, { success: true, data: null, message: null })
    vi.stubGlobal('fetch', fetchMock)

    await api.get('/api/users/me')

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe(`${window.location.origin}/api/users/me`)
  })

  it('fails loudly when a production build has no VITE_API_URL', async () => {
    vi.stubEnv('VITE_API_URL', '')
    await expect(api.get('/x')).rejects.toThrow('VITE_API_URL is not set')
  })

  it('sends a JSON body', async () => {
    const fetchMock = respond(200, { success: true, data: null, message: null })
    vi.stubGlobal('fetch', fetchMock)

    await api.post('/api/auth/telegram', { initData: 'x' })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"initData":"x"}')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('throws ApiError with status and message', async () => {
    vi.stubGlobal(
      'fetch',
      respond(409, { success: false, data: null, message: 'Slot is already booked' }),
    )

    const error = await api.post('/api/bookings', {}).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, message: 'Slot is already booked', code: undefined })
  })

  it('passes a code through once the backend sends one', async () => {
    vi.stubGlobal(
      'fetch',
      respond(400, { success: false, data: null, message: 'x', code: 'SLOT_TAKEN' }),
    )

    await expect(api.get('/x')).rejects.toMatchObject({ code: 'SLOT_TAKEN' })
  })

  it('treats success: false on a 2xx as an error', async () => {
    vi.stubGlobal('fetch', respond(200, { success: false, data: null, message: 'odd' }))

    await expect(api.get('/x')).rejects.toMatchObject({ status: 200, message: 'odd' })
  })

  it('passes the envelope code on, e.g. TOKEN_REVOKED', async () => {
    vi.stubGlobal(
      'fetch',
      respond(401, {
        success: false,
        data: null,
        message: 'Session ended because the password was changed; sign in again',
        code: 'TOKEN_REVOKED',
      }),
    )
    tokenStore.set('old-token')

    await expect(api.get('/api/admin/settings')).rejects.toMatchObject({
      status: 401,
      code: 'TOKEN_REVOKED',
    })
    expect(onUnauthorized).toHaveBeenCalledOnce()
    expect((onUnauthorized.mock.calls[0]?.[0] as ApiError).code).toBe('TOKEN_REVOKED')
  })

  it('reports 401 and the blocked-account 403 globally', async () => {
    vi.stubGlobal(
      'fetch',
      respond(401, { success: false, data: null, message: 'Authentication required' }),
    )
    await expect(api.get('/x')).rejects.toBeInstanceOf(ApiError)
    expect(onUnauthorized).toHaveBeenCalledOnce()

    vi.stubGlobal(
      'fetch',
      respond(403, { success: false, data: null, message: 'Account is blocked' }),
    )
    await expect(api.get('/x')).rejects.toBeInstanceOf(ApiError)
    expect(onAccountBlocked).toHaveBeenCalledOnce()

    vi.stubGlobal('fetch', respond(403, { success: false, data: null, message: 'Access denied' }))
    await expect(api.get('/x')).rejects.toBeInstanceOf(ApiError)
    expect(onAccountBlocked).toHaveBeenCalledOnce()
  })

  it('handles a non-JSON error body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>', { status: 502, statusText: 'Bad Gateway' })),
    )

    await expect(api.get('/x')).rejects.toMatchObject({ status: 502, message: 'Bad Gateway' })
  })

  it('maps a network failure to status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = await api.get('/x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).isNetworkError).toBe(true)
  })
})

describe('shouldRetry', () => {
  it('never retries a 4xx', () => {
    expect(shouldRetry(0, new ApiError('nope', 404))).toBe(false)
  })

  it('retries 5xx and network failures a limited number of times', () => {
    expect(shouldRetry(0, new ApiError('boom', 500))).toBe(true)
    expect(shouldRetry(0, new ApiError('offline', 0))).toBe(true)
    expect(shouldRetry(2, new ApiError('boom', 500))).toBe(false)
  })
})
