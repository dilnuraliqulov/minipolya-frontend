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
  it('shows the owner, their phone and stadium count, and payouts as "Tez orada"', async () => {
    stub()
    renderApp('/owner/profile', { session })
    expect(await screen.findByText('Jasur Toshmatov')).toBeInTheDocument()
    expect(screen.getByText(/\+998 90 123 45 67/)).toBeInTheDocument()
    expect(await screen.findByText('Maydon egasi · 2 maydon')).toBeInTheDocument()
    expect(screen.getByText('Toʻlovlar').parentElement).toHaveTextContent(
      'Tez orada — server bu maʼlumotni egaga hali bermaydi',
    )
  })

  it('says when there is no phone yet', async () => {
    const noPhone = makeUser({ isOwner: true, name: 'Jasur Toshmatov' })
    stub({ 'GET /api/users/me': noPhone })
    renderApp('/owner/profile', { session: readySession(noPhone) })
    expect(await screen.findByText('Jasur Toshmatov')).toBeInTheDocument()
    expect(screen.queryByText(/\+998/)).not.toBeInTheDocument()
  })

  it('goes back to player mode with the switch', async () => {
    stub()
    const { router } = renderApp('/owner/profile', { session })
    fireEvent.click(await screen.findByRole('switch', { name: 'Oʻyinchi rejimiga oʻtish' }))
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
      'GET /api/users/me': () => (++calls === 1 ? jsonResponse(500, null, 'boom') : owner),
    })
    renderApp('/owner/profile', { session })
    fireEvent.click(await screen.findByRole('button', { name: 'Qayta urinish' }))
    expect(await screen.findByText('Jasur Toshmatov')).toBeInTheDocument()
  })
})
