import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CARD_ROWS } from '../../components/useMediaQuery'
import {
  mockBackend,
  page,
  renderAt,
  signIn,
  stats,
  stubMedia,
  useAdminTestSetup,
  type Reply,
} from '../../test-utils'

const LONG_NAME = 'Abdurahmon Toshmuhammedov-Qodirjonov Muhammadaliyevich'

const users = [
  {
    id: 'u-1',
    name: 'Dilnoza Karimova',
    phone: '+998 93 210 98 76',
    language: 'uz',
    isOwner: true,
    isAdmin: false,
    isBlocked: false,
    bookingCount: 12,
    stadiumCount: 2,
    createdAt: '2026-03-04T09:00:00Z',
  },
  {
    id: 'u-2',
    name: LONG_NAME,
    language: 'uz',
    isOwner: false,
    isAdmin: false,
    isBlocked: true,
    bookingCount: 0,
    stadiumCount: 0,
    createdAt: '2026-05-16T09:00:00Z',
  },
]

const replies: Record<string, Reply> = {
  '/api/admin/stats': [200, stats],
  '/api/admin/users': [200, page(users)],
}

describe('Foydalanuvchilar below 768px', () => {
  useAdminTestSetup()

  async function show() {
    stubMedia(CARD_ROWS)
    mockBackend(replies)
    signIn()
    const router = renderAt('/foydalanuvchilar')
    await screen.findByText('Dilnoza Karimova')
    return router
  }

  it('shows one card per user with the phone, role and status, and no table', async () => {
    await show()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Foydalanuvchilar' })
    const cards = within(list).getAllByRole('listitem')
    expect(cards).toHaveLength(2)

    const first = within(cards[0]!)
    expect(first.getByText('+998 93 210 98 76')).toBeInTheDocument()
    expect(first.getByText('Maydon egasi')).toBeInTheDocument()
    expect(first.getByText('Faol')).toBeInTheDocument()
    expect(within(cards[1]!).getByText('Bloklangan')).toBeInTheDocument()
  })

  it('opens the user when the card is tapped', async () => {
    const router = await show()
    fireEvent.click(screen.getByRole('button', { name: /Dilnoza Karimova/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/foydalanuvchilar/u-1'))
  })

  // Review Focus 4: a long name must not widen the card.
  it('truncates a very long name instead of widening the card', async () => {
    await show()
    expect(screen.getByText(LONG_NAME)).toHaveClass('truncate')
  })
})
