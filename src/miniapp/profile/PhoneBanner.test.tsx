import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeUser, stubApi } from '../test/api'
import { installFakeTelegram, removeFakeTelegram } from '../test/fakeTelegram'
import { renderApp } from '../test/renderApp'
import { makeStadium, page } from '../test/stadiums'

afterEach(() => {
  vi.unstubAllGlobals()
  removeFakeTelegram()
})

const LIST = 'GET /api/stadiums'
const banner = () => screen.findByRole('region', { name: 'Telefon raqamingizni ulashing' })

describe('Bosh sahifa — the phone banner', () => {
  it('asks a player with no phone, with both ways to give it', async () => {
    installFakeTelegram({ requestContact: vi.fn() })
    stubApi({ [LIST]: page([makeStadium()]), 'GET /api/users/me': makeUser({ phone: undefined }) })
    const { router } = renderApp('/')
    const box = await banner()
    expect(within(box).getByRole('button', { name: 'Telegram orqali yuborish' })).toBeVisible()
    fireEvent.click(within(box).getByRole('button', { name: 'Raqamni kiritish' }))
    expect(router.state.location.pathname).toBe('/profile/phone')
  })

  it('is absent once the profile has a phone', async () => {
    stubApi({
      [LIST]: page([makeStadium()]),
      'GET /api/users/me': makeUser({ phone: '+998901234567' }),
    })
    renderApp('/')
    await screen.findByRole('article', { name: 'Bunyodkor Arena' })
    expect(screen.queryByRole('region', { name: 'Telefon raqamingizni ulashing' })).toBeNull()
  })

  it('outside Telegram offers only typing it', async () => {
    stubApi({ [LIST]: page([makeStadium()]), 'GET /api/users/me': makeUser({ phone: undefined }) })
    renderApp('/')
    const box = await banner()
    expect(within(box).queryByRole('button', { name: 'Telegram orqali yuborish' })).toBeNull()
    expect(within(box).getByRole('button', { name: 'Raqamni kiritish' })).toBeVisible()
  })

  it('after sharing, re-reads the profile until the phone arrives, then goes away', async () => {
    let shareCallback: ((shared: boolean) => void) | undefined
    installFakeTelegram({ requestContact: vi.fn((cb) => (shareCallback = cb)) })
    let reads = 0
    stubApi({
      [LIST]: page([makeStadium()]),
      'GET /api/users/me': () =>
        ++reads < 3 ? makeUser({ phone: undefined }) : makeUser({ phone: '+998935554433' }),
    })
    renderApp('/')
    const box = await banner()
    fireEvent.click(within(box).getByRole('button', { name: 'Telegram orqali yuborish' }))
    shareCallback?.(true)
    await vi.waitFor(
      () =>
        expect(screen.queryByRole('region', { name: 'Telefon raqamingizni ulashing' })).toBeNull(),
      { timeout: 8000 },
    )
  })
})
