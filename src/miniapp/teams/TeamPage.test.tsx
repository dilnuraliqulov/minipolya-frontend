import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Challenge } from '../api/games'
import type { TeamDetail } from '../api/teams'
import { jsonResponse, stubApi } from '../test/api'
import { installFakeTelegram, removeFakeTelegram } from '../test/fakeTelegram'
import { renderApp } from '../test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  removeFakeTelegram()
})

const ME = '018f3a2c-0000-7000-8000-000000000001'
const OTHER = '018f3a2c-0000-7000-8000-000000000002'
const lions: TeamDetail = {
  id: 't1',
  name: 'Chilonzor Lions',
  leaderId: ME,
  leaderName: 'Test User',
  members: [
    { userId: ME, userName: 'Test User', role: 'leader' },
    { userId: OTHER, userName: 'Bobur', role: 'member' },
  ],
}
const atlas: TeamDetail = {
  id: 't2',
  name: 'Sergeli Atlas',
  leaderId: OTHER,
  leaderName: 'Bobur',
  members: [
    { userId: OTHER, userName: 'Bobur', role: 'leader' },
    { userId: ME, userName: 'Test User', role: 'member' },
  ],
}
const challenge: Challenge = {
  gameId: 'g1',
  waitingTeamId: 't9',
  waitingTeamName: 'Yunusobod United',
  stadiumId: 's1',
  stadiumName: 'Bunyodkor Arena',
  stadiumAddress: 'Bunyodkor koʻchasi 12',
  format: '7x7',
  startsAt: '2026-11-06T15:00:00Z',
  endsAt: '2026-11-06T16:00:00Z',
  durationHours: 1,
  totalPrice: 31_000_000,
  amountToPayNow: 8_800_000,
  remainderAmount: 8_000_000,
  fullAmount: 8_800_000,
}
const page = <T,>(content: T[], totalPages = 1) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages,
})

function stub(overrides: Record<string, unknown> = {}) {
  return stubApi({
    'GET /api/teams/me': [
      { id: 't1', name: 'Chilonzor Lions', leaderName: 'Test User', memberCount: 2 },
      { id: 't2', name: 'Sergeli Atlas', leaderName: 'Bobur', memberCount: 2 },
    ],
    'GET /api/teams/t1': lions,
    'GET /api/teams/t2': atlas,
    'GET /api/games/challenges': page([challenge]),
    ...overrides,
  } as Parameters<typeof stubApi>[0])
}

describe('Jamoam', () => {
  it('shows the team, its members and the challenge board for the captain', async () => {
    stub()
    renderApp('/team')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Chilonzor Lions' }),
    ).toBeInTheDocument()
    expect(screen.getByText('2 aʼzo · Sardor: Test User')).toBeInTheDocument()
    const members = await screen.findByRole('list', { name: 'Aʼzolar' })
    expect(within(members).getByText('Bobur')).toBeInTheDocument()
    expect(within(members).getAllByText('Sardor')).toHaveLength(1)
    const board = screen.getByRole('region', { name: 'Raqib qidirayotgan jamoalar' })
    expect(await within(board).findByText('Yunusobod United')).toBeInTheDocument()
    expect(within(board).getByText('Jamoangiz toʻlaydi: 88 000 soʻm')).toBeInTheDocument()
    expect(within(board).getByRole('link', { name: 'Qabul qilish' })).toHaveAttribute(
      'href',
      '/challenges/g1?team=t1',
    )
    expect(within(board).queryByText('Chaqiriqlarni jamoa sardori qabul qiladi.')).toBeNull()
  })

  it('switches teams; a member sees no accept, remove or delete', async () => {
    stub()
    renderApp('/team')
    fireEvent.click(await screen.findByRole('tab', { name: 'Sergeli Atlas' }))
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Sergeli Atlas' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Yunusobod United')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Qabul qilish' })).not.toBeInTheDocument()
    expect(screen.getByText('Chaqiriqlarni jamoa sardori qabul qiladi.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /amallar/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Jamoani oʻchirish' })).not.toBeInTheDocument()
  })

  it('the leader opens "Taklif havolasi": copy, share in Telegram, renew', async () => {
    vi.stubEnv('VITE_TELEGRAM_BOT_USERNAME', 'minipolya_bot')
    vi.stubEnv('VITE_TELEGRAM_APP_NAME', 'app')
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const telegram = installFakeTelegram()
    const api = stub({
      'GET /api/teams/t1/invite': { code: 'abc123' },
      'POST /api/teams/t1/invite': { code: 'new456' },
    })
    renderApp('/team')
    fireEvent.click(await screen.findByRole('button', { name: /Aʼzo taklif qilish/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Taklif havolasi' })
    const link = 'https://t.me/minipolya_bot/app?startapp=team_abc123'
    expect(await within(sheet).findByText(link)).toBeInTheDocument()

    fireEvent.click(within(sheet).getByRole('button', { name: 'Havoladan nusxa olish' }))
    expect(await screen.findByText('Havola nusxalandi')).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith(link)

    fireEvent.click(within(sheet).getByRole('button', { name: 'Telegramda ulashish' }))
    const shared = vi.mocked(telegram.webApp.openTelegramLink).mock.calls[0]?.[0] ?? ''
    expect(shared.startsWith('https://t.me/share/url?')).toBe(true)
    expect(new URL(shared).searchParams.get('url')).toBe(link)

    fireEvent.click(within(sheet).getByRole('button', { name: 'Yangi havola yaratish' }))
    expect(
      await within(sheet).findByText('https://t.me/minipolya_bot/app?startapp=team_new456'),
    ).toBeInTheDocument()
    expect(api.calls('POST /api/teams/t1/invite')).toHaveLength(1)
  })

  it('a member has no invite button', async () => {
    stub({ 'GET /api/teams/me': [{ id: 't2', name: 'Sergeli Atlas' }], 'GET /api/teams/t2': atlas })
    renderApp('/team')
    await screen.findByRole('heading', { level: 2, name: 'Sergeli Atlas' })
    expect(screen.queryByRole('button', { name: /Aʼzo taklif qilish/ })).not.toBeInTheDocument()
  })

  it('removes a member after confirming', async () => {
    const api = stub({ [`DELETE /api/teams/t1/members/${OTHER}`]: null })
    renderApp('/team')
    fireEvent.click(await screen.findByRole('button', { name: 'Bobur — amallar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Jamoadan chiqarish' }))
    const confirm = await screen.findByRole('dialog', { name: 'Boburni jamoadan chiqarasizmi?' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Chiqarish' }))
    expect(await screen.findByText('Aʼzo chiqarildi')).toBeInTheDocument()
    expect(api.calls(`DELETE /api/teams/t1/members/${OTHER}`)).toHaveLength(1)
  })

  it('deletes the team after confirming', async () => {
    const api = stub({ 'DELETE /api/teams/t1': null })
    renderApp('/team')
    fireEvent.click(await screen.findByRole('button', { name: 'Jamoani oʻchirish' }))
    const confirm = await screen.findByRole('dialog', { name: 'Jamoani oʻchirasizmi?' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Oʻchirish' }))
    expect(await screen.findByText('Jamoa oʻchirildi')).toBeInTheDocument()
    expect(api.calls('DELETE /api/teams/t1')).toHaveLength(1)
  })

  it('has an empty state that leads to creating a team', async () => {
    stub({ 'GET /api/teams/me': [] })
    const { router } = renderApp('/team')
    expect(await screen.findByText('Sizda hali jamoa yoʻq')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Jamoa yaratish' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/team/new'))
  })

  // ---- The level, the next game and the stats ----

  it('shows the level next to the team and names the captain', async () => {
    stub({ 'GET /api/teams/t1': { ...lions, level: 'orta' } })
    renderApp('/team')

    await screen.findByRole('heading', { level: 2, name: 'Chilonzor Lions' })
    // The badge, not the board's filter chip of the same name.
    expect(screen.getByText('Oʻrta', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('2 aʼzo · Sardor: Test User')).toBeInTheDocument()
  })

  it('asks the captain of a team with no level to set one', async () => {
    stub()
    renderApp('/team')

    expect(await screen.findByText('Jamoangiz darajasini belgilang')).toBeInTheDocument()
  })

  it('does not ask a member to set the level', async () => {
    stub({ 'GET /api/teams/me': [{ id: 't2', name: 'Sergeli Atlas' }] })
    renderApp('/team')

    await screen.findByRole('heading', { level: 2, name: 'Sergeli Atlas' })
    expect(screen.queryByText('Jamoangiz darajasini belgilang')).not.toBeInTheDocument()
  })

  it('saves a new level from the banner', async () => {
    const api = stub({ 'PATCH /api/teams/t1': { ...lions, level: 'professional' } })
    renderApp('/team')

    fireEvent.click(await screen.findByText('Jamoangiz darajasini belgilang'))
    const sheet = await screen.findByRole('dialog', { name: 'Jamoa darajasi' })
    fireEvent.click(within(sheet).getByRole('radio', { name: /Professional/ }))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Saqlash' }))

    expect(await screen.findByText('Daraja saqlandi')).toBeInTheDocument()
    expect(api.calls('PATCH /api/teams/t1')).toEqual([{ level: 'professional' }])
  })

  it('shows the next game and links to it', async () => {
    stub({
      'GET /api/teams/t1': {
        ...lions,
        upcomingGame: {
          gameId: 'g7',
          startsAt: '2026-11-21T15:00:00Z',
          status: 'confirmed',
          stadiumName: 'Bunyodkor Arena',
          opponentName: 'Delta FC',
        },
      },
    })
    renderApp('/team')

    const card = await screen.findByRole('link', { name: 'Oʻyinga oʻtish' })
    expect(card).toHaveAttribute('href', '/games/g7')
    expect(within(card).getByText('Raqib: Delta FC')).toBeInTheDocument()
    expect(within(card).getByText('Bunyodkor Arena')).toBeInTheDocument()
  })

  it('says the opponent is still awaited rather than inventing one', async () => {
    stub({
      'GET /api/teams/t1': {
        ...lions,
        upcomingGame: { gameId: 'g7', startsAt: '2026-11-21T15:00:00Z', status: 'open' },
      },
    })
    renderApp('/team')

    expect(await screen.findByText('Raqib kutilmoqda')).toBeInTheDocument()
  })

  it('shows no next-game card when the API sends none', async () => {
    stub()
    renderApp('/team')

    await screen.findByRole('heading', { level: 2, name: 'Chilonzor Lions' })
    expect(screen.queryByRole('link', { name: 'Oʻyinga oʻtish' })).not.toBeInTheDocument()
  })

  it('shows only the figures the API sent', async () => {
    stub({ 'GET /api/teams/t1': { ...lions, gamesPlayed: 4 } })
    renderApp('/team')

    expect(await screen.findByText('Oʻynalgan oʻyinlar')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('shows no stats at all when the API counted nothing', async () => {
    stub()
    renderApp('/team')

    await screen.findByRole('heading', { level: 2, name: 'Chilonzor Lions' })
    expect(screen.queryByText('Oʻynalgan oʻyinlar')).not.toBeInTheDocument()
  })

  // ---- The captain's actions, and a member's ----

  it('gives the captain "Raqib qidirish" and a member the reason they have none', async () => {
    stub()
    renderApp('/team')

    expect(await screen.findByRole('link', { name: 'Raqib qidirish' })).toHaveAttribute(
      'href',
      '/opponent',
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Sergeli Atlas' }))
    expect(await screen.findByText('Oʻyinlarni faqat sardor yaratadi')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Raqib qidirish' })).not.toBeInTheDocument()
  })

  it('lets a member leave the team after confirming', async () => {
    const api = stub({
      'GET /api/teams/me': [{ id: 't2', name: 'Sergeli Atlas' }],
      [`DELETE /api/teams/t2/members/${ME}`]: null,
    })
    renderApp('/team')

    fireEvent.click(await screen.findByRole('button', { name: 'Jamoadan chiqish' }))
    const confirm = await screen.findByRole('dialog', { name: 'Jamoadan chiqasizmi?' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Chiqish' }))

    expect(await screen.findByText('Jamoadan chiqdingiz')).toBeInTheDocument()
    expect(api.calls(`DELETE /api/teams/t2/members/${ME}`)).toHaveLength(1)
  })

  it('never offers the captain a way to walk out of their own team', async () => {
    stub()
    renderApp('/team')

    await screen.findByRole('heading', { level: 2, name: 'Chilonzor Lions' })
    expect(screen.queryByRole('button', { name: 'Jamoadan chiqish' })).not.toBeInTheDocument()
  })

  it('explains what teams are for when the player has none', async () => {
    stub({ 'GET /api/teams/me': [] })
    renderApp('/team')

    expect(await screen.findByText('Sizda hali jamoa yoʻq')).toBeInTheDocument()
    expect(screen.getByText(/maydon haqini ikki jamoa boʻlib boʻlasiz/)).toBeInTheDocument()
  })

  it('shows a skeleton while loading', () => {
    stub({ 'GET /api/teams/me': new Promise(() => {}) })
    renderApp('/team')
    expect(screen.getByRole('status', { name: 'Yuklanmoqda' })).toBeInTheDocument()
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stub({
      'GET /api/teams/me': () =>
        fail
          ? jsonResponse(500, null, 'Internal server error')
          : [{ id: 't1', name: 'Chilonzor Lions', memberCount: 2 }],
    })
    renderApp('/team')
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Chilonzor Lions' }),
    ).toBeInTheDocument()
  })
})

describe('Jamoa yaratish', () => {
  it('creates a team and opens it', async () => {
    const created = { ...lions, id: 't7', name: 'Yangi Arslonlar', members: [lions.members[0]] }
    const api = stubApi({
      'POST /api/teams': created,
      'GET /api/teams/me': [{ id: 't7', name: 'Yangi Arslonlar', memberCount: 1 }],
      'GET /api/teams/t7': created,
      'GET /api/games/challenges': page([]),
    } as Parameters<typeof stubApi>[0])
    const { router } = renderApp('/team/new')
    const name = await screen.findByLabelText('Jamoa nomi')
    const submit = screen.getByRole('button', { name: 'Jamoa yaratish' })
    fireEvent.change(name, { target: { value: 'Ya' } })
    expect(submit).toBeDisabled()
    fireEvent.change(name, { target: { value: '  Yangi Arslonlar ' } })
    expect(submit).toBeDisabled() // the level is still unchosen
    fireEvent.click(screen.getByRole('radio', { name: /Oʻrta/ }))
    fireEvent.click(submit)
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/team'))
    expect(router.state.location.search).toBe('?team=t7')
    expect(api.calls('POST /api/teams')).toEqual([{ name: 'Yangi Arslonlar', level: 'orta' }])
    expect(await screen.findByText('Jamoa yaratildi')).toBeInTheDocument()
  })
})
