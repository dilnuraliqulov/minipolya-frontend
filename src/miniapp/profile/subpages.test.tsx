import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AppNotification } from '../api/notifications'
import { jsonResponse, makeUser, stubApi } from '../test/api'
import { installFakeTelegram, removeFakeTelegram } from '../test/fakeTelegram'
import { renderApp } from '../test/renderApp'
import { page } from '../test/stadiums'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.useRealTimers()
  removeFakeTelegram()
})

const player = makeUser({ name: 'Aziz Karimov', phone: '+998901234567' })

function notification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n1',
    userId: player.id,
    type: 'booking_confirmed',
    title: 'Бронь подтверждена',
    message: 'raw backend prose',
    referenceType: 'booking',
    referenceId: 'b1',
    isRead: false,
    sentViaTelegram: true,
    createdAt: '2026-11-04T10:00:00Z',
    ...overrides,
  }
}

describe('Bildirishnomalar', () => {
  it('lists notifications with translated titles, never the backend text', async () => {
    stubApi({
      'GET /api/notifications': page([
        notification(),
        notification({ id: 'n2', type: 'review_reply', isRead: true, referenceType: 'review' }),
        notification({ id: 'n3', type: 'something_new', isRead: true }),
      ]),
    })
    renderApp('/profile/notifications')
    expect(await screen.findByText('Bron tasdiqlandi')).toBeInTheDocument()
    expect(screen.getByText('Sharhingizga javob berildi')).toBeInTheDocument()
    expect(screen.getByText('Yangi xabar')).toBeInTheDocument()
    expect(screen.queryByText('raw backend prose')).not.toBeInTheDocument()
    expect(screen.queryByText('Бронь подтверждена')).not.toBeInTheDocument()
  })

  it('opening one marks it read and goes to its booking', async () => {
    const api = stubApi({
      'GET /api/notifications': page([notification()]),
      'PUT /api/notifications/n1/read': null,
    })
    const { router } = renderApp('/profile/notifications')
    fireEvent.click(await screen.findByRole('button', { name: /Bron tasdiqlandi/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/bookings/b1'))
    expect(api.calls('PUT /api/notifications/n1/read')).toHaveLength(1)
  })

  it('marks all read from the header', async () => {
    const api = stubApi({
      'GET /api/notifications': page([notification()]),
      'PUT /api/notifications/read-all': null,
    })
    renderApp('/profile/notifications')
    fireEvent.click(await screen.findByRole('button', { name: 'Hammasini oʻqilgan deb belgilash' }))
    await waitFor(() => expect(api.calls('PUT /api/notifications/read-all')).toHaveLength(1))
  })

  it('has no "mark all" button when everything is read', async () => {
    stubApi({ 'GET /api/notifications': page([notification({ isRead: true })]) })
    renderApp('/profile/notifications')
    await screen.findByText('Bron tasdiqlandi')
    expect(
      screen.queryByRole('button', { name: 'Hammasini oʻqilgan deb belgilash' }),
    ).not.toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    stubApi({ 'GET /api/notifications': page([]) })
    renderApp('/profile/notifications')
    expect(await screen.findByText('Bildirishnomalar yoʻq')).toBeInTheDocument()
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stubApi({
      'GET /api/notifications': () =>
        fail ? jsonResponse(404, null, 'Not found') : page([notification()]),
    })
    renderApp('/profile/notifications')
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByText('Bron tasdiqlandi')).toBeInTheDocument()
  })

  it('the home bell shows the unread count and opens the list', async () => {
    stubApi({
      'GET /api/users/me': player,
      'GET /api/stadiums': page([]),
      'GET /api/notifications/unread-count': { count: 3 },
      'GET /api/notifications': page([notification()]),
    })
    const { router } = renderApp('/')
    const bell = await screen.findByRole('button', { name: 'Bildirishnomalar · 3 ta yangi' })
    expect(within(bell).getByText('3')).toBeInTheDocument()
    fireEvent.click(bell)
    await waitFor(() => expect(router.state.location.pathname).toBe('/profile/notifications'))
  })

  it('the bell has no badge with nothing unread', async () => {
    stubApi({
      'GET /api/users/me': player,
      'GET /api/stadiums': page([]),
      'GET /api/notifications/unread-count': { count: 0 },
    })
    renderApp('/')
    expect(await screen.findByRole('button', { name: 'Bildirishnomalar' })).toBeInTheDocument()
  })
})

describe('Telefon raqam', () => {
  it('saves a typed number with PATCH /users/me', async () => {
    const api = stubApi({
      'GET /api/users/me': makeUser(),
      'PATCH /api/users/me': (body) => ({ ...makeUser(), ...(body as object) }),
    })
    renderApp('/profile/phone')
    fireEvent.change(await screen.findByLabelText('Telefon raqam'), {
      target: { value: '901234567' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    await waitFor(() =>
      expect(api.calls('PATCH /api/users/me')).toEqual([{ phone: '+998901234567' }]),
    )
    expect(await screen.findByText('Saqlandi')).toBeInTheDocument()
  })

  it('refuses an incomplete number without calling the API', async () => {
    const api = stubApi({ 'GET /api/users/me': makeUser() })
    renderApp('/profile/phone')
    fireEvent.change(await screen.findByLabelText('Telefon raqam'), { target: { value: '9012' } })
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    expect(
      await screen.findByText('Raqam +998 XX XXX XX XX formatida boʻlishi kerak'),
    ).toBeInTheDocument()
    expect(api.calls('PATCH /api/users/me')).toHaveLength(0)
  })

  it('maps a taken number to its message', async () => {
    stubApi({
      'GET /api/users/me': makeUser(),
      'PATCH /api/users/me': jsonResponse(
        409,
        null,
        'Phone is already used by another account',
        'PHONE_TAKEN',
      ),
    })
    renderApp('/profile/phone')
    fireEvent.change(await screen.findByLabelText('Telefon raqam'), {
      target: { value: '901234567' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    expect(
      await screen.findByText('Bu raqam boshqa hisobga bogʻlangan. Boshqa raqam kiriting.'),
    ).toBeInTheDocument()
  })

  it('has no share button outside Telegram', async () => {
    stubApi({ 'GET /api/users/me': makeUser() })
    renderApp('/profile/phone')
    await screen.findByLabelText('Telefon raqam')
    expect(screen.queryByRole('button', { name: /Raqamni ulashish/ })).not.toBeInTheDocument()
  })

  it('in Telegram, shares the contact with the bot and picks the saved phone up', async () => {
    let shareCallback: ((shared: boolean) => void) | undefined
    installFakeTelegram({ requestContact: vi.fn((cb) => (shareCallback = cb)) })
    let reads = 0
    stubApi({
      'GET /api/users/me': () => (++reads < 3 ? makeUser() : makeUser({ phone: '+998935554433' })),
    })
    renderApp('/profile/phone')
    fireEvent.click(await screen.findByRole('button', { name: /Raqamni ulashish/ }))
    shareCallback?.(true)
    expect(await screen.findByText('Raqam saqlandi', {}, { timeout: 8000 })).toBeInTheDocument()
    expect(screen.getByLabelText('Telefon raqam')).toHaveValue('+998 93 555 44 33')
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stubApi({
      'GET /api/users/me': () => (fail ? jsonResponse(404, null, 'User not found') : makeUser()),
    })
    renderApp('/profile/phone')
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByLabelText('Telefon raqam')).toBeInTheDocument()
  })
})

describe('Yordam', () => {
  it('links to support and opens one answer at a time', async () => {
    vi.stubEnv('VITE_TELEGRAM_SUPPORT_USERNAME', 'minipolya_support')
    const telegram = installFakeTelegram()
    stubApi({})
    renderApp('/profile/help')
    fireEvent.click(await screen.findByRole('button', { name: /@minipolya_support/ }))
    expect(telegram.webApp.openTelegramLink).toHaveBeenCalledWith('https://t.me/minipolya_support')

    for (const q of [
      'Qanday bron qilaman?',
      'Bekor qilish va pulni qaytarish',
      'Qolganini naqd toʻlash',
      'Jamoa jamoaga qarshi oʻyin',
      'Maydonimni qanday qoʻshaman?',
    ]) {
      expect(screen.getByRole('button', { name: q })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Qanday bron qilaman?' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Qolganini naqd toʻlash' }))
    expect(screen.getByRole('button', { name: 'Qanday bron qilaman?' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByText(/naqd berishingiz/)).toBeInTheDocument()
  })

  it('says support is coming when no username is configured', async () => {
    vi.stubEnv('VITE_TELEGRAM_SUPPORT_USERNAME', '')
    stubApi({})
    renderApp('/profile/help')
    expect(
      await screen.findByText('Qoʻllab-quvvatlash chati tez orada qoʻshiladi.'),
    ).toBeInTheDocument()
  })
})

describe('Ilova haqida', () => {
  it('shows the version and opens both text pages', async () => {
    stubApi({})
    const { router } = renderApp('/profile/about')
    expect(await screen.findByText(/^Versiya \d+\.\d+\.\d+$/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Foydalanish shartlari' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Foydalanish shartlari' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '1. Umumiy qoidalar' })).toBeInTheDocument()
    await router.navigate('/profile/about/privacy')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Maxfiylik siyosati' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '5. Bogʻlanish' })).toBeInTheDocument()
  })
})
