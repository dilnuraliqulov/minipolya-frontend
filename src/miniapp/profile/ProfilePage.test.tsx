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
  it('shows a skeleton, then the name, phone and settings from /users/me', async () => {
    stubApi({ 'GET /api/users/me': player })
    const { session } = renderApp('/profile')

    expect(screen.getByRole('status', { name: 'Yuklanmoqda' })).toBeInTheDocument()
    expect(await screen.findByText('Aziz Karimov')).toBeInTheDocument()
    expect(screen.getByText('AK')).toBeInTheDocument()
    expect(screen.getByText('+998 90 123 45 67')).toBeInTheDocument()
    for (const row of ['Shaxsiy maʼlumotlar', 'Kartalarim', 'Sevimlilar', 'Til', 'Mavzu']) {
      expect(screen.getByRole('button', { name: new RegExp(row) })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /Til.*Oʻzbekcha/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mavzu.*Tizim/ })).toBeInTheDocument()
    expect(session.checkRoles).toHaveBeenCalledWith(player)
  })

  it('says so when no phone has been set yet', async () => {
    stubApi({ 'GET /api/users/me': makeUser({ name: 'Aziz' }) })
    renderApp('/profile')
    expect(await screen.findByText('Telefon raqam kiritilmagan')).toBeInTheDocument()
  })

  it('shows the error state, and "Qayta urinish" loads again', async () => {
    let fail = true
    stubApi({
      'GET /api/users/me': () => (fail ? jsonResponse(500, null, 'Internal server error') : player),
    })
    renderApp('/profile')
    fireEvent.click(await screen.findByRole('button', { name: 'Qayta urinish' }))
    fail = false
    // The first click retried while still failing; the second succeeds.
    fireEvent.click(await screen.findByRole('button', { name: 'Qayta urinish' }))
    expect(await screen.findByText('Aziz Karimov')).toBeInTheDocument()
  })

  it('has no "Ega rejimi" switch for a player', async () => {
    const api = stubApi({ 'GET /api/users/me': player })
    renderApp('/profile')
    await screen.findByText('Aziz Karimov')
    expect(screen.queryByRole('switch', { name: 'Ega rejimi' })).not.toBeInTheDocument()
    expect(api.calls('GET /api/owner/stadiums')).toHaveLength(0)
  })

  it('shows "Ega rejimi" only when the owner has a stadium, and opens owner mode', async () => {
    stubApi({
      'GET /api/users/me': { ...player, isOwner: true },
      'GET /api/owner/stadiums': [{ id: 's1', name: 'Bunyodkor Arena', status: 'approved' }],
    })
    renderApp('/profile')
    const toggle = await screen.findByRole('switch', { name: 'Ega rejimi' })
    fireEvent.click(toggle)
    expect(await screen.findByRole('heading', { level: 1, name: 'Ega rejimi' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tez orada' })).toBeInTheDocument()
  })

  it('hides "Ega rejimi" for an owner without stadiums', async () => {
    stubApi({
      'GET /api/users/me': { ...player, isOwner: true },
      'GET /api/owner/stadiums': [],
    })
    renderApp('/profile')
    await screen.findByText('Aziz Karimov')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.queryByRole('switch', { name: 'Ega rejimi' })).not.toBeInTheDocument()
  })

  it('changes the language through PATCH /users/me and switches the app', async () => {
    const api = stubApi({
      'GET /api/users/me': player,
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

  it('keeps the language and tells the user when saving it fails', async () => {
    stubApi({
      'GET /api/users/me': player,
      'PATCH /api/users/me': jsonResponse(500, null, 'Internal server error'),
    })
    renderApp('/profile')
    fireEvent.click(await screen.findByRole('button', { name: /Til/ }))
    fireEvent.click(screen.getByRole('radio', { name: 'English' }))
    expect(
      await screen.findByText('Serverda xatolik. Birozdan soʻng qayta urinib koʻring.'),
    ).toBeInTheDocument()
    expect(i18n.language).toBe('uz')
  })

  it('switches the theme from the Mavzu sheet', async () => {
    stubApi({ 'GET /api/users/me': player })
    renderApp('/profile')
    fireEvent.click(await screen.findByRole('button', { name: /Mavzu/ }))
    const sheet = screen.getByRole('dialog', { name: 'Mavzuni tanlang' })
    expect(within(sheet).getByRole('radio', { name: 'Tizim' })).toBeChecked()
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Qorongʻi' }))

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(screen.getByRole('button', { name: /Mavzu.*Qorongʻi/ })).toBeInTheDocument()
  })

  it('opens Kartalarim and Sevimlilar as "Tez orada" for now', async () => {
    stubApi({ 'GET /api/users/me': player })
    renderApp('/profile')
    fireEvent.click(await screen.findByRole('button', { name: /Kartalarim/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Kartalarim' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tez orada' })).toBeInTheDocument()
  })
})
