import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameDetail, GameMessage } from '../api/games'
import { jsonResponse, stubApi } from '../test/api'
import { renderApp } from '../test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
})

const ME = '018f3a2c-0000-7000-8000-000000000001'
const game: GameDetail = {
  id: 'g1',
  type: 'team_vs_team',
  status: 'confirmed',
  stadiumId: 's1',
  creatorId: ME,
  startsAt: '2026-11-06T15:00:00Z',
  endsAt: '2026-11-06T16:00:00Z',
  isPublic: true,
  createdAt: '2026-11-01T10:00:00Z',
}
const msg = (id: string, userId: string, text: string, at: string): GameMessage => ({
  id,
  gameId: 'g1',
  userId,
  userName: userId === ME ? 'Test User' : 'Rustam',
  message: text,
  createdAt: at,
})
const page = <T,>(content: T[]) => ({
  content,
  page: 0,
  size: 50,
  totalElements: content.length,
  totalPages: 1,
})

describe('Chat', () => {
  it('shows the messages oldest first and marks mine', async () => {
    stubApi({
      'GET /api/games/g1': game,
      'GET /api/games/g1/messages': page([
        msg('m2', ME, 'Toʻp bizda', '2026-11-05T10:05:00Z'),
        msg('m1', 'x', 'Salom!', '2026-11-05T10:00:00Z'),
      ]),
    })
    renderApp('/games/g1/chat')
    const list = await screen.findByRole('list', { name: 'Chat' })
    const items = within(list).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Rustam')
    expect(items[0]).toHaveTextContent('Salom!')
    expect(items[0]).toHaveTextContent('15:00')
    expect(items[1]).toHaveTextContent('Toʻp bizda')
    expect(items[1]).toHaveTextContent('Siz · 15:05')
  })

  it('sends a message and refreshes', async () => {
    let sent = false
    const api = stubApi({
      'GET /api/games/g1': game,
      'GET /api/games/g1/messages': () =>
        page(sent ? [msg('m3', ME, 'Kelamiz', '2026-11-05T11:00:00Z')] : []),
      'POST /api/games/g1/messages': () => {
        sent = true
        return msg('m3', ME, 'Kelamiz', '2026-11-05T11:00:00Z')
      },
    })
    renderApp('/games/g1/chat')
    expect(await screen.findByText('Hali xabarlar yoʻq')).toBeInTheDocument()
    const input = screen.getByLabelText('Xabar')
    await vi.waitFor(() => expect(input).toBeEnabled())
    fireEvent.change(input, { target: { value: '  Kelamiz ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Yuborish' }))
    expect(await screen.findByText('Kelamiz')).toBeInTheDocument()
    expect(api.calls('POST /api/games/g1/messages')).toEqual([{ message: 'Kelamiz' }])
    expect(input).toHaveValue('')
  })

  it('is read-only when the game is not confirmed', async () => {
    stubApi({
      'GET /api/games/g1': { ...game, status: 'completed' },
      'GET /api/games/g1/messages': page([]),
    })
    renderApp('/games/g1/chat')
    expect(await screen.findByText('Chat faqat tasdiqlangan oʻyinda ochiq.')).toBeInTheDocument()
    expect(screen.getByLabelText('Xabar')).toBeDisabled()
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stubApi({
      'GET /api/games/g1': game,
      'GET /api/games/g1/messages': () =>
        fail ? jsonResponse(500, null, 'Internal server error') : page([]),
    })
    renderApp('/games/g1/chat')
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByText('Hali xabarlar yoʻq')).toBeInTheDocument()
  })
})
