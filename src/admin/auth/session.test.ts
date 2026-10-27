import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  configureApiClient,
  createMemoryTokenStore,
  getTokenStore,
} from '../../shared/api'
import * as authApi from '../api/auth'
import type { User } from '../api/types'
import { queryClient } from '../queryClient'
import { getSession, logout, resetSessionForTests, restoreSession, startSession } from './session'

const admin: User = {
  id: 'u1',
  name: 'Aziz Rahimov',
  language: 'uz',
  isOwner: false,
  isAdmin: true,
  createdAt: '2026-10-01T10:00:00Z',
}

function jwt(claims: object): string {
  return `x.${btoa(JSON.stringify(claims))}.sig`
}
const future = Math.floor(Date.now() / 1000) + 3600

describe('admin session', () => {
  beforeEach(() => {
    resetSessionForTests()
    configureApiClient({ tokenStore: createMemoryTokenStore() })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('without a token is anonymous and makes no request', async () => {
    const getMe = vi.spyOn(authApi, 'getMe')
    await restoreSession()
    expect(getSession()).toEqual({ status: 'anonymous' })
    expect(getMe).not.toHaveBeenCalled()
  })

  it('drops an expired token without asking the backend', async () => {
    getTokenStore().set(jwt({ isAdmin: true, exp: 1 }))
    const getMe = vi.spyOn(authApi, 'getMe')
    await restoreSession()
    expect(getSession().status).toBe('anonymous')
    expect(getTokenStore().get()).toBeNull()
    expect(getMe).not.toHaveBeenCalled()
  })

  it('resumes from a stored token', async () => {
    getTokenStore().set(jwt({ isAdmin: true, exp: future }))
    vi.spyOn(authApi, 'getMe').mockResolvedValue(admin)
    await restoreSession()
    expect(getSession()).toEqual({ status: 'authenticated', user: admin })
  })

  it('logs out when the token roles disagree with /users/me', async () => {
    getTokenStore().set(jwt({ isAdmin: false, exp: future }))
    vi.spyOn(authApi, 'getMe').mockResolvedValue(admin)
    await restoreSession()
    expect(getSession()).toEqual({ status: 'anonymous', reason: 'roles-changed' })
    expect(getTokenStore().get()).toBeNull()
  })

  it('offers a retry when the backend is unreachable, keeping the token', async () => {
    const token = jwt({ isAdmin: true, exp: future })
    getTokenStore().set(token)
    vi.spyOn(authApi, 'getMe').mockRejectedValue(new ApiError('Network request failed', 0))
    await restoreSession()
    expect(getSession()).toEqual({ status: 'unavailable' })
    expect(getTokenStore().get()).toBe(token)
  })

  it('logout clears the token and cached queries, and says why', () => {
    startSession('t', admin)
    queryClient.setQueryData(['x'], 1)
    logout('expired')
    expect(getTokenStore().get()).toBeNull()
    expect(queryClient.getQueryData(['x'])).toBeUndefined()
    expect(getSession()).toEqual({ status: 'anonymous', reason: 'expired' })
  })

  it('a failed login attempt (401 while anonymous) shows no "expired" notice', () => {
    logout()
    logout('expired')
    expect(getSession()).toEqual({ status: 'anonymous', reason: undefined })
  })
})
