import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configureApiClient, createMemoryTokenStore } from '../../shared/api'
import i18n from '../i18n'
import { installFakeTelegram, removeFakeTelegram } from '../test/fakeTelegram'
import { fakeJwt, jsonResponse, makeUser } from '../test/api'
import { createSession, type Session } from './session'

let session: Session
let queryClient: QueryClient
const tokenStore = createMemoryTokenStore()

function setup() {
  queryClient = new QueryClient()
  session = createSession({ tokenStore, queryClient })
  configureApiClient({
    tokenStore,
    onUnauthorized: session.handleUnauthorized,
    onAccountBlocked: session.handleAccountBlocked,
  })
}

/** Resolves once the session leaves `loading`. */
async function settled() {
  await vi.waitFor(() => expect(session.getState().status).not.toBe('loading'))
  return session.getState()
}

beforeEach(() => {
  vi.stubEnv('DEV', true)
  tokenStore.clear()
  setup()
})

afterEach(async () => {
  removeFakeTelegram()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  await i18n.changeLanguage('uz')
})

describe('Mini App session', () => {
  it('posts the raw initData, keeps the JWT in memory and loads the profile language', async () => {
    const { webApp } = installFakeTelegram()
    const token = fakeJwt({ isOwner: false })
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { token, user: makeUser({ language: 'ru' }) }))
    vi.stubGlobal('fetch', fetchMock)

    session.start()
    const state = await settled()

    expect(state).toMatchObject({ status: 'ready', user: { language: 'ru' } })
    expect(tokenStore.get()).toBe(token)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/api\/auth\/telegram$/)
    expect(JSON.parse(init.body as string)).toEqual({ initData: webApp.initData })
    expect(i18n.language).toBe('ru')
  })

  it('stops with "no-telegram" when there is no initData (a plain browser)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    session.start()
    expect(await settled()).toEqual({ status: 'no-telegram' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the blocked screen when the login answers 403 "Account is blocked"', async () => {
    installFakeTelegram()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(403, null, 'Account is blocked')))
    session.start()
    expect(await settled()).toMatchObject({ status: 'blocked' })
    expect(tokenStore.get()).toBeNull()
  })

  it('also recognises the ACCOUNT_BLOCKED code', async () => {
    installFakeTelegram()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(403, null, 'whatever', 'ACCOUNT_BLOCKED')),
    )
    session.start()
    expect(await settled()).toMatchObject({ status: 'blocked' })
  })

  it('shows an error when the login fails, and "Qayta urinish" logs in again', async () => {
    installFakeTelegram()
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(jsonResponse(200, { token: fakeJwt({}), user: makeUser() }))
    vi.stubGlobal('fetch', fetchMock)

    session.start()
    expect(await settled()).toMatchObject({ status: 'error', reason: 'network' })

    session.retry()
    await vi.waitFor(() => expect(session.getState().status).toBe('ready'))
  })

  it('logs in again once on a 401 and refetches, then gives up if the new token is refused too', async () => {
    installFakeTelegram()
    const first = fakeJwt({ n: 1 })
    const second = fakeJwt({ n: 2 })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: first, user: makeUser() }))
      .mockResolvedValueOnce(jsonResponse(200, { token: second, user: makeUser() }))
    vi.stubGlobal('fetch', fetchMock)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    session.start()
    await settled()

    // A request with the first token answers 401 → one silent re-login.
    session.handleUnauthorized()
    await vi.waitFor(() => expect(tokenStore.get()).toBe(second))
    expect(session.getState().status).toBe('ready')
    expect(invalidate).toHaveBeenCalled()

    // The fresh token is refused as well → full error screen, no loop.
    session.handleUnauthorized()
    expect(session.getState()).toMatchObject({ status: 'error', reason: 'session' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shows the error screen when the re-login itself fails', async () => {
    installFakeTelegram()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { token: fakeJwt({ n: 1 }), user: makeUser() }))
        .mockResolvedValueOnce(jsonResponse(401, null, 'Invalid Telegram signature')),
    )
    session.start()
    await settled()

    session.handleUnauthorized()
    await vi.waitFor(() => expect(session.getState()).toMatchObject({ status: 'error' }))
  })

  it('switches to the blocked screen when any request reports the account blocked', async () => {
    installFakeTelegram()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { token: fakeJwt({}), user: makeUser() })),
    )
    session.start()
    await settled()
    queryClient.setQueryData(['x'], 1)

    session.handleAccountBlocked()

    expect(session.getState()).toMatchObject({ status: 'blocked' })
    expect(tokenStore.get()).toBeNull()
    expect(queryClient.getQueryData(['x'])).toBeUndefined()
  })

  it('logs in again when /users/me reports role flags that disagree with the token', async () => {
    installFakeTelegram()
    const promoted = fakeJwt({ isOwner: true, n: 2 })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, { token: fakeJwt({ isOwner: false }), user: makeUser() }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { token: promoted, user: makeUser({ isOwner: true }) }),
      )
    vi.stubGlobal('fetch', fetchMock)
    session.start()
    await settled()

    session.checkRoles(makeUser({ isOwner: false }))
    expect(fetchMock).toHaveBeenCalledTimes(1)

    session.checkRoles(makeUser({ isOwner: true }))
    await vi.waitFor(() => expect(tokenStore.get()).toBe(promoted))
  })
})
