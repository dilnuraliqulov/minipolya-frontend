import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameDetail, GameMessage } from '../api/games'
import { jsonResponse, stubApi } from '../test/api'
import { renderApp } from '../test/renderApp'

beforeEach(() => {
  // jsdom has no window scrolling; the chat drives the page's own scroll.
  vi.stubGlobal('scrollTo', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
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
  chatMessageMaxLength: 30,
  teams: [
    {
      side: 'a',
      teamId: 't1',
      leaderId: ME,
      teamName: 'Chilonzor Lions',
      teamLevel: 'orta',
      price: 0,
      remainderAmount: 0,
      remainderStatus: 'unpaid',
      paidInApp: 0,
    },
    {
      side: 'b',
      teamId: 't2',
      leaderId: 'x',
      teamName: 'Delta FC',
      teamLevel: 'professional',
      price: 0,
      remainderAmount: 0,
      remainderStatus: 'unpaid',
      paidInApp: 0,
    },
  ],
}
const msg = (
  id: string,
  userId: string,
  text: string,
  at: string,
  extra: Partial<GameMessage> = {},
): GameMessage => ({
  id,
  gameId: 'g1',
  userId,
  userName: userId === ME ? 'Test User' : 'Rustam',
  message: text,
  createdAt: at,
  kind: 'user',
  ...extra,
})
const page = <T,>(content: T[], size = 50) => ({
  content,
  page: 0,
  size,
  totalElements: content.length,
  totalPages: 1,
})

describe('Chat', () => {
  it('shows the messages oldest first, mine on the right', async () => {
    stubApi({
      'GET /api/games/g1': game,
      'GET /api/games/g1/messages': page([
        msg('m2', ME, 'Toʻp bizda', '2026-11-05T10:05:00Z'),
        msg('m1', 'x', 'Salom!', '2026-11-05T10:00:00Z'),
      ]),
    })
    renderApp('/games/g1/chat')

    const list = await screen.findByRole('list', { name: 'Chat' })
    const runs = within(list).getAllByRole('listitem')
    // A day separator, then their run, then mine.
    expect(runs[1]).toHaveTextContent('Rustam')
    expect(runs[1]).toHaveTextContent('Salom!')
    expect(runs[1]).toHaveClass('items-start')
    expect(runs[2]).toHaveTextContent('Toʻp bizda')
    expect(runs[2]).toHaveClass('items-end')
  })

  it('heads a run with the sender’s name and their team’s badge', async () => {
    stubApi({
      'GET /api/games/g1': game,
      'GET /api/games/g1/messages': page([
        msg('m1', 'x', 'Salom!', '2026-11-05T10:00:00Z', {
          teamName: 'Delta FC',
          teamLevel: 'professional',
        }),
      ]),
    })
    renderApp('/games/g1/chat')

    const list = await screen.findByRole('list', { name: 'Chat' })
    expect(within(list).getByText('Rustam')).toBeInTheDocument()
    expect(within(list).getByText('Delta FC')).toBeInTheDocument()
    expect(within(list).getByText('Professional')).toBeInTheDocument()
  })

  it('shows a system line centred, with no sender', async () => {
    stubApi({
      'GET /api/games/g1': game,
      'GET /api/games/g1/messages': page([
        {
          id: 's1',
          gameId: 'g1',
          message: 'team_joined',
          createdAt: '2026-11-05T10:00:00Z',
          kind: 'system',
          event: 'team_joined',
          eventTeamName: 'Delta FC',
        },
      ]),
    })
    renderApp('/games/g1/chat')

    expect(await screen.findByText('Delta FC qoʻshildi')).toBeInTheDocument()
  })

  it('names both teams with their levels and opens the game', async () => {
    stubApi({ 'GET /api/games/g1': game, 'GET /api/games/g1/messages': page([]) })
    renderApp('/games/g1/chat')

    expect(await screen.findByText('Chilonzor Lions')).toBeInTheDocument()
    expect(screen.getByText('Delta FC')).toBeInTheDocument()
    expect(screen.getByText('Oʻrta')).toBeInTheDocument()
    expect(screen.getByText('Professional')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Oʻyinni ochish' })).toHaveAttribute(
      'href',
      '/games/g1',
    )
  })

  it('shows a message the moment it is written, then keeps it once it lands', async () => {
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

    const input = await screen.findByLabelText('Xabar')
    await waitFor(() => expect(input).toBeEnabled())
    fireEvent.change(input, { target: { value: '  Kelamiz ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Yuborish' }))

    await waitFor(() => expect(api.calls('POST /api/games/g1/messages')).toHaveLength(1))
    expect(await screen.findByText('Kelamiz')).toBeInTheDocument()
    expect(api.calls('POST /api/games/g1/messages')).toEqual([{ message: 'Kelamiz' }])
    expect(input).toHaveValue('')
  })

  it('offers a failed message for another try, and sends it again on tap', async () => {
    let fail = true
    const api = stubApi({
      'GET /api/games/g1': game,
      'GET /api/games/g1/messages': page([]),
      'POST /api/games/g1/messages': () =>
        fail
          ? jsonResponse(500, null, 'Internal server error')
          : msg('m3', ME, 'Kelamiz', '2026-11-05T11:00:00Z'),
    })
    renderApp('/games/g1/chat')

    const input = await screen.findByLabelText('Xabar')
    await waitFor(() => expect(input).toBeEnabled())
    fireEvent.change(input, { target: { value: 'Kelamiz' } })
    fireEvent.click(screen.getByRole('button', { name: 'Yuborish' }))

    expect(await screen.findByText('Yuborilmadi. Qayta urinish uchun bosing')).toBeInTheDocument()
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Kelamiz' }))

    await waitFor(() => expect(api.calls('POST /api/games/g1/messages')).toHaveLength(2))
  })

  it('will not send an empty message', async () => {
    stubApi({ 'GET /api/games/g1': game, 'GET /api/games/g1/messages': page([]) })
    renderApp('/games/g1/chat')

    const input = await screen.findByLabelText('Xabar')
    await waitFor(() => expect(input).toBeEnabled())
    expect(screen.getByRole('button', { name: 'Yuborish' })).toBeDisabled()

    fireEvent.change(input, { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: 'Yuborish' })).toBeDisabled()
  })

  it('counts down only near the server’s limit', async () => {
    stubApi({ 'GET /api/games/g1': game, 'GET /api/games/g1/messages': page([]) })
    renderApp('/games/g1/chat')

    const input = await screen.findByLabelText('Xabar')
    await waitFor(() => expect(input).toBeEnabled())
    // The game says 30, so the counter shows from the first character.
    fireEvent.change(input, { target: { value: 'hi' } })

    expect(await screen.findByText('2/30')).toBeInTheDocument()
    expect(input).toHaveAttribute('maxlength', '30')
  })

  it('shows markup and links as the plain text they are', async () => {
    stubApi({
      'GET /api/games/g1': game,
      'GET /api/games/g1/messages': page([
        msg('m1', 'x', '<b>jim</b> https://example.com', '2026-11-05T10:00:00Z'),
      ]),
    })
    renderApp('/games/g1/chat')

    const list = await screen.findByRole('list', { name: 'Chat' })
    expect(within(list).getByText('<b>jim</b> https://example.com')).toBeInTheDocument()
    expect(list.querySelector('b')).toBeNull()
    expect(within(list).queryByRole('link')).toBeNull()
  })

  it('loads older messages when the chat is scrolled to the top', async () => {
    const api = stubApi({
      'GET /api/games/g1': game,
      'GET /api/games/g1/messages': (_body, query) =>
        query.get('before')
          ? page([msg('m0', 'x', 'Eski', '2026-11-04T10:00:00Z')], 1)
          : page(
              // Newest first, as the API answers.
              [
                msg('m1', 'x', 'Xabar 1', '2026-11-05T10:01:00Z'),
                msg('m0', 'x', 'Xabar 0', '2026-11-05T10:00:00Z'),
              ],
              2,
            ),
    })
    renderApp('/games/g1/chat')

    await screen.findByText('Xabar 0')
    fireEvent.scroll(window)

    await waitFor(() =>
      expect(api.queries('GET /api/games/g1/messages').at(-1)).toMatchObject({
        before: '2026-11-05T10:00:00Z',
      }),
    )
  })

  it('stops asking for messages while the app is in the background', async () => {
    const api = stubApi({ 'GET /api/games/g1': game, 'GET /api/games/g1/messages': page([]) })
    renderApp('/games/g1/chat')
    await screen.findByText('Hali xabar yoʻq')
    const before = api.calls('GET /api/games/g1/messages').length

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() => expect(screen.getByText('Hali xabar yoʻq')).toBeInTheDocument())

    expect(api.calls('GET /api/games/g1/messages').length).toBe(before)
  })

  it('is read-only when the game is not confirmed', async () => {
    const api = stubApi({
      'GET /api/games/g1': { ...game, status: 'completed' },
      'GET /api/games/g1/messages': jsonResponse(400, null, 'Chat is closed for this game'),
    })
    renderApp('/games/g1/chat')

    expect(await screen.findByText('Chat faqat tasdiqlangan oʻyinda ochiq.')).toBeInTheDocument()
    expect(screen.getByLabelText('Xabar')).toBeDisabled()
    expect(api.calls('GET /api/games/g1/messages')).toHaveLength(0)
  })

  it('invites the first message when there is none', async () => {
    stubApi({ 'GET /api/games/g1': game, 'GET /api/games/g1/messages': page([]) })
    renderApp('/games/g1/chat')

    expect(await screen.findByText('Hali xabar yoʻq')).toBeInTheDocument()
    expect(screen.getByText('Raqib jamoa bilan kelishib oling!')).toBeInTheDocument()
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

    expect(await screen.findByText('Hali xabar yoʻq')).toBeInTheDocument()
  })
})
