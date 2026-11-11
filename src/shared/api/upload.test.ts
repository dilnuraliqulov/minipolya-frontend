import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installFakeXhr } from '../../test/fakeXhr'
import { ApiError } from './ApiError'
import { configureApiClient, uploadWithProgress } from './client'
import { createMemoryTokenStore } from './tokenStore'

describe('uploadWithProgress', () => {
  const tokenStore = createMemoryTokenStore()
  const onUnauthorized = vi.fn()

  beforeEach(() => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_API_URL', 'http://api.test/')
    tokenStore.set('jwt-1')
    configureApiClient({ tokenStore, onUnauthorized })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('posts to the API host with the bearer token, reports progress and returns data', async () => {
    const { requests } = installFakeXhr((request) => {
      request.progress(0.25)
      request.progress(1)
      return { data: { id: 'p1' } }
    })
    const progress: number[] = []
    const body = new FormData()
    const result = await uploadWithProgress('/api/x/photos', body, {
      onProgress: (f) => progress.push(f),
    })
    expect(result).toEqual({ id: 'p1' })
    expect(progress).toEqual([0.25, 1])
    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: 'http://api.test/api/x/photos',
      body,
      headers: { Authorization: 'Bearer jwt-1', Accept: 'application/json' },
    })
  })

  it('throws ApiError with the status and message, and runs the 401 hook', async () => {
    installFakeXhr(() => ({ status: 400, message: 'Unsupported image type' }))
    await expect(uploadWithProgress('/api/x', new FormData())).rejects.toEqual(
      new ApiError('Unsupported image type', 400),
    )
    installFakeXhr(() => ({ status: 401, message: 'Unauthorized' }))
    await expect(uploadWithProgress('/api/x', new FormData())).rejects.toMatchObject({
      status: 401,
    })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('a dropped connection is a network error (status 0)', async () => {
    installFakeXhr(() => 'network')
    await expect(uploadWithProgress('/api/x', new FormData())).rejects.toMatchObject({ status: 0 })
  })

  it('can be aborted', async () => {
    installFakeXhr(() => new Promise(() => {}))
    const controller = new AbortController()
    const pending = uploadWithProgress('/api/x', new FormData(), { signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})
