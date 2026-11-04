import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OwnerStadium } from '../api/owner'
import { jsonResponse, makeUser, stubApi } from '../test/api'
import { readySession, renderApp } from '../test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
})

const owner = makeUser({ isOwner: true, name: 'Jasur Toshmatov', phone: '+998901234567' })
const session = readySession(owner)
const stadiums: OwnerStadium[] = [
  { id: 's1', name: 'Bunyodkor Arena', status: 'approved' },
  { id: 's2', name: 'Sergeli Park', status: 'pending' },
]

function stub(overrides: Record<string, unknown> = {}) {
  return stubApi({
    'GET /api/owner/stadiums': stadiums,
    'GET /api/users/me': owner,
    ...overrides,
  } as Parameters<typeof stubApi>[0])
}

describe('Ega rejimi — Profil', () => {
  it('shows the current stadium, the owner, MAYDON with the contract status, HISOB and ILOVA', async () => {
    stub({ 'GET /api/owner/legal-details': { legalType: 'yatt', atmosContractStatus: 'signed' } })
    renderApp('/owner/profile', { session })
    expect(await screen.findByText('Bunyodkor Arena')).toBeInTheDocument()
    expect(screen.getByText('Jasur Toshmatov · +998 90 123 45 67')).toBeInTheDocument()
    const stadium = screen.getByRole('region', { name: 'Maydon' })
    expect(within(stadium).getByRole('button', { name: /Maydonlarim.*2 ta/ })).toBeInTheDocument()
    expect(within(stadium).getByRole('button', { name: 'Maydon qoʻshish' })).toBeInTheDocument()
    expect(
      await within(stadium).findByRole('button', { name: /Toʻlovlar va shartnoma.*Imzolangan/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Hisob' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Ilova' })).toBeInTheDocument()
    expect(screen.getByText(/· Ega rejimi$/)).toBeInTheDocument()
  })

  it('switches the current stadium from the switcher sheet', async () => {
    stub()
    const { router } = renderApp('/owner/profile', { session })
    fireEvent.click(await screen.findByRole('button', { name: 'Maydonni tanlang' }))
    const sheet = await screen.findByRole('dialog', { name: 'Maydonni tanlang' })
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Sergeli Park' }))
    await waitFor(() => expect(router.state.location.search).toBe('?stadium=s2'))
    expect(screen.getByText('Sergeli Park')).toBeInTheDocument()
  })

  it('has no switcher with one stadium', async () => {
    stub({ 'GET /api/owner/stadiums': [stadiums[0]] })
    renderApp('/owner/profile', { session })
    await screen.findByText('Bunyodkor Arena')
    expect(screen.queryByRole('button', { name: 'Maydonni tanlang' })).not.toBeInTheDocument()
  })

  it('opens Toʻlovlar va shartnoma read-only', async () => {
    stub({ 'GET /api/owner/legal-details': { legalType: 'mchj', atmosContractStatus: 'pending' } })
    renderApp('/owner/contract', { session })
    expect(
      await screen.findByText('Faqat koʻrish uchun — oʻzgartirish uchun bizga yozing'),
    ).toBeInTheDocument()
    expect(screen.getByText('MChJ')).toBeInTheDocument()
    expect(screen.getByText('Jarayonda')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('Toʻlovlar va shartnoma: error state with retry', async () => {
    let calls = 0
    stub({
      'GET /api/owner/legal-details': () =>
        ++calls === 1 ? jsonResponse(403, null, 'Access denied') : { atmosContractStatus: 'none' },
    })
    renderApp('/owner/contract', { session })
    fireEvent.click(await screen.findByRole('button', { name: 'Qayta urinish' }))
    expect(await screen.findByText('Yoʻq')).toBeInTheDocument()
  })

  it('says when there is no phone yet', async () => {
    const noPhone = makeUser({ isOwner: true, name: 'Jasur Toshmatov' })
    stub({ 'GET /api/users/me': noPhone })
    renderApp('/owner/profile', { session: readySession(noPhone) })
    expect(await screen.findByText(/Jasur Toshmatov/)).toBeInTheDocument()
    expect(screen.queryByText(/\+998/)).not.toBeInTheDocument()
  })

  it('goes back to player mode', async () => {
    stub()
    const { router } = renderApp('/owner/profile', { session })
    fireEvent.click(await screen.findByRole('button', { name: 'Oʻyinchi rejimiga qaytish' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/profile'))
  })

  it('opens the language and theme sheets', async () => {
    stub()
    renderApp('/owner/profile', { session })
    fireEvent.click(await screen.findByRole('button', { name: /Til/ }))
    const languages = await screen.findByRole('dialog', { name: 'Tilni tanlang' })
    expect(within(languages).getByText('Русский')).toBeInTheDocument()
  })

  it('opens the theme sheet', async () => {
    stub()
    renderApp('/owner/profile', { session })
    fireEvent.click(await screen.findByRole('button', { name: /Mavzu/ }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('Tizim')
  })

  it('shows the error state and retries', async () => {
    let calls = 0
    stub({
      'GET /api/users/me': () =>
        ++calls === 1 ? jsonResponse(404, null, 'User not found') : owner,
    })
    renderApp('/owner/profile', { session })
    fireEvent.click(await screen.findByRole('button', { name: 'Qayta urinish' }))
    expect(await screen.findByText(/Jasur Toshmatov/)).toBeInTheDocument()
  })
})
