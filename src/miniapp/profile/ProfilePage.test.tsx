import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '../i18n'
import { jsonResponse, makeUser, stubApi } from '../test/api'
import { renderApp } from '../test/renderApp'
import { THEME_STORAGE_KEY } from '../theme'

afterEach(async () => {
  vi.unstubAllGlobals()
  localStorage.clear()
  await i18n.changeLanguage('uz')
})

const player = makeUser({ name: 'Aziz Karimov', phone: '+998901234567' })

describe('Profil', () => {
  it('shows a skeleton, then the header, HISOB, ILOVA and the version', async () => {
    stubApi({ 'GET /api/users/me': player, 'GET /api/owner/stadiums': [] })
    const { session } = renderApp('/profile')

    expect(screen.getByRole('status', { name: 'Yuklanmoqda' })).toBeInTheDocument()
    expect(await screen.findByText('Aziz Karimov')).toBeInTheDocument()
    expect(screen.getByText('AK')).toBeInTheDocument()
    const account = screen.getByRole('region', { name: 'Hisob' })
    for (const row of ['Shaxsiy maʼlumotlar', 'Telefon raqam', 'Kartalarim', 'Sevimlilar']) {
      expect(within(account).getByRole('button', { name: new RegExp(row) })).toBeInTheDocument()
    }
    expect(
      within(account).getByRole('button', { name: /Telefon raqam.*\+998 90 123 45 67/ }),
    ).toBeInTheDocument()
    const app = screen.getByRole('region', { name: 'Ilova' })
    for (const row of ['Til', 'Mavzu', 'Bildirishnomalar', 'Yordam', 'Ilova haqida']) {
      expect(within(app).getByRole('button', { name: new RegExp(row) })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /Til.*Oʻzbekcha/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mavzu.*Tizim/ })).toBeInTheDocument()
    expect(screen.getByText(/^MiniPolya v\d+\.\d+\.\d+ · Telegram ilovasi$/)).toBeInTheDocument()
    expect(session.checkRoles).toHaveBeenCalledWith(player)
  })

  it('says so when no phone has been set yet', async () => {
    stubApi({ 'GET /api/users/me': makeUser({ name: 'Aziz' }), 'GET /api/owner/stadiums': [] })
    renderApp('/profile')
    expect(await screen.findByText('Telefon raqam kiritilmagan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Telefon raqam.*Kiritilmagan/ })).toBeInTheDocument()
  })

  it('shows the error state, and "Qayta urinish" loads again', async () => {
    let fail = true
    stubApi({
      'GET /api/users/me': () => (fail ? jsonResponse(500, null, 'Internal server error') : player),
      'GET /api/owner/stadiums': [],
    })
    renderApp('/profile')
    fireEvent.click(await screen.findByRole('button', { name: 'Qayta urinish' }))
    fail = false
    // The first click retried while still failing; the second succeeds.
    fireEvent.click(await screen.findByRole('button', { name: 'Qayta urinish' }))
    expect(await screen.findByText('Aziz Karimov')).toBeInTheDocument()
  })

  it('Ega rejimi, no stadium: "Maydoningiz bormi?" opens the add-stadium wizard', async () => {
    stubApi({ 'GET /api/users/me': player, 'GET /api/owner/stadiums': [] })
    renderApp('/profile')
    expect(await screen.findByText('Maydoningiz bormi?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Maydon qoʻshish' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Maydon qoʻshish' }),
    ).toBeInTheDocument()
  })

  it('Ega rejimi, only a rejected stadium: offers to add one again', async () => {
    stubApi({
      'GET /api/users/me': player,
      'GET /api/owner/stadiums': [{ id: 's1', name: 'Old', status: 'rejected' }],
    })
    renderApp('/profile')
    expect(await screen.findByText('Maydoningiz bormi?')).toBeInTheDocument()
  })

  it('Ega rejimi, stadium under review: says so, no button', async () => {
    stubApi({
      'GET /api/users/me': player,
      'GET /api/owner/stadiums': [{ id: 's1', name: 'Bunyodkor Arena', status: 'pending' }],
    })
    renderApp('/profile')
    expect(
      await screen.findByText('Koʻrib chiqilmoqda. Tez orada siz bilan bogʻlanamiz.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ega rejimiga oʻtish' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Maydon qoʻshish' })).not.toBeInTheDocument()
  })

  it('Ega rejimi, approved: "Ega rejimiga oʻtish" opens owner mode', async () => {
    stubApi({
      'GET /api/users/me': { ...player, isOwner: true },
      'GET /api/owner/stadiums': [{ id: 's1', name: 'Bunyodkor Arena', status: 'approved' }],
    })
    renderApp('/profile')
    fireEvent.click(await screen.findByRole('button', { name: 'Ega rejimiga oʻtish' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Jadval' })).toBeInTheDocument()
  })

  it('Ega rejimi: the stadium list failing shows its own retry', async () => {
    let fail = true
    stubApi({
      'GET /api/users/me': player,
      'GET /api/owner/stadiums': () =>
        fail ? jsonResponse(500, null, 'Internal server error') : [],
    })
    renderApp('/profile')
    await screen.findByText('Aziz Karimov')
    fail = false
    fireEvent.click(await screen.findByRole('button', { name: 'Qayta urinish' }))
    expect(await screen.findByText('Maydoningiz bormi?')).toBeInTheDocument()
  })

  it('changes the language through PATCH /users/me and switches the app', async () => {
    const api = stubApi({
      'GET /api/users/me': player,
      'GET /api/owner/stadiums': [],
      'PATCH /api/users/me': (body) => ({ ...player, ...(body as object) }),
    })
    renderApp('/profile')
    fireEvent.click(await screen.findByRole('button', { name: /Til/ }))
    const sheet = screen.getByRole('dialog', { name: 'Tilni tanlang' })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Русский' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Профиль' })).toBeInTheDocument()
    expect(api.calls('PATCH /api/users/me')).toEqual([{ language: 'ru' }])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('switches immediately, before the save answers', async () => {
    let answer: (response: Response) => void = () => {}
    const api = stubApi({
      'GET /api/users/me': player,
      'GET /api/owner/stadiums': [],
      'PATCH /api/users/me': () => new Promise<Response>((resolve) => (answer = resolve)),
    })
    renderApp('/profile')
    fireEvent.click(await screen.findByRole('button', { name: /Til/ }))
    fireEvent.click(screen.getByRole('radio', { name: 'English' }))

    // Still waiting for the backend, already in English, sheet closed.
    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.calls('PATCH /api/users/me')).toEqual([{ language: 'en' }])

    answer(jsonResponse(200, { ...player, language: 'en' }))
    await vi.waitFor(() => expect(i18n.language).toBe('en'))
  })

  it('goes back to the saved language and says so when the save fails', async () => {
    stubApi({
      'GET /api/users/me': player,
      'GET /api/owner/stadiums': [],
      'PATCH /api/users/me': jsonResponse(500, null, 'Internal server error'),
    })
    renderApp('/profile')
    fireEvent.click(await screen.findByRole('button', { name: /Til/ }))
    fireEvent.click(screen.getByRole('radio', { name: 'English' }))
    expect(
      await screen.findByText('Serverda xatolik. Birozdan soʻng qayta urinib koʻring.'),
    ).toBeInTheDocument()
    expect(i18n.language).toBe('uz')
    expect(screen.getByRole('button', { name: /Til.*Oʻzbekcha/ })).toBeInTheDocument()
  })

  it('follows the language saved on the backend profile (user.language)', async () => {
    stubApi({ 'GET /api/users/me': { ...player, language: 'ru' }, 'GET /api/owner/stadiums': [] })
    renderApp('/profile')
    expect(await screen.findByRole('heading', { level: 1, name: 'Профиль' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Поля' })).toBeInTheDocument()
  })

  it('switches the theme from the Mavzu sheet', async () => {
    stubApi({ 'GET /api/users/me': player, 'GET /api/owner/stadiums': [] })
    renderApp('/profile')
    fireEvent.click(await screen.findByRole('button', { name: /Mavzu/ }))
    const sheet = screen.getByRole('dialog', { name: 'Mavzuni tanlang' })
    expect(within(sheet).getByRole('radio', { name: 'Tizim' })).toBeChecked()
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Qorongʻi' }))

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(screen.getByRole('button', { name: /Mavzu.*Qorongʻi/ })).toBeInTheDocument()
  })

  it('opens Kartalarim', async () => {
    stubApi({ 'GET /api/users/me': player, 'GET /api/owner/stadiums': [], 'GET /api/cards': [] })
    renderApp('/profile')
    fireEvent.click(await screen.findByRole('button', { name: /Kartalarim/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Kartalarim' })).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Saqlangan kartalar yoʻq' }),
    ).toBeInTheDocument()
  })
})
