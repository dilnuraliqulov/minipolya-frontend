import { afterEach, describe, expect, it, vi } from 'vitest'
import { configureApiClient, createMemoryTokenStore } from '../../../shared/api'
import { jsonResponse, makeUser } from '../../test/api'
import { devLogin, listDevUsers } from './devAuth'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('dev auth', () => {
  it('sends X-Dev-Login-Key', async () => {
    vi.stubEnv('VITE_DEV_LOGIN_KEY', 'k1')
    configureApiClient({ tokenStore: createMemoryTokenStore() })
    const user = makeUser()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(jsonResponse(200, { token: 't', user }))
    vi.stubGlobal('fetch', fetchMock)

    await listDevUsers()
    await devLogin('u-1')

    const [listUrl, listInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(listUrl).toMatch(/\/api\/auth\/dev\/users$/)
    expect((listInit.headers as Record<string, string>)['X-Dev-Login-Key']).toBe('k1')
    const [loginUrl, loginInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(loginUrl).toMatch(/\/api\/auth\/dev\/login$/)
    expect(JSON.parse(loginInit.body as string)).toEqual({ userId: 'u-1' })
    expect((loginInit.headers as Record<string, string>)['X-Dev-Login-Key']).toBe('k1')
  })
})
