import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OwnerStadium } from '../api/owner'
import { jsonResponse, makeUser, stubApi } from '../test/api'
import { readySession, renderApp } from '../test/renderApp'
import { makeReview, page } from '../test/stadiums'

afterEach(() => {
  vi.unstubAllGlobals()
})

const owner = makeUser({ isOwner: true })
const session = readySession(owner)
const stadium: OwnerStadium = {
  id: 's1',
  name: 'Bunyodkor Arena',
  status: 'approved',
  averageRating: 4.5,
  reviewCount: 2,
}
const REVIEWS = 'GET /api/owner/dashboard/stadiums/s1/reviews'

describe('Ega rejimi — Sharhlar', () => {
  it('opens from Maydonim and lists reviews with the owner reply', async () => {
    stubApi({
      'GET /api/owner/stadiums': [stadium],
      [REVIEWS]: page(
        [
          makeReview({ id: 'r1', userName: 'Jasur T.', comment: 'Zoʻr', ownerReply: 'Rahmat!' }),
          makeReview({ id: 'r2', userName: 'Bekzod A.', comment: 'Kichik' }),
        ],
        { totalElements: 2 },
      ),
    })
    const { router } = renderApp('/owner/stadium', { session })
    fireEvent.click(await screen.findByRole('button', { name: /Sharhlar/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/owner/stadium/s1/reviews'))
    expect(await screen.findByText('Rahmat!')).toBeInTheDocument()
    expect(screen.getByText('Sizning javobingiz')).toBeInTheDocument()
    expect(screen.getByText('2 ta sharh')).toBeInTheDocument()
    // Only the unanswered review offers a reply.
    expect(screen.getAllByRole('button', { name: 'Javob berish' })).toHaveLength(1)
  })

  it('replies to a review', async () => {
    let replied = false
    const api = stubApi({
      'GET /api/owner/stadiums': [stadium],
      [REVIEWS]: () =>
        page([
          makeReview({
            id: 'r2',
            comment: 'Kichik',
            ownerReply: replied ? 'Kattalashtiramiz' : undefined,
          }),
        ]),
      'POST /api/reviews/r2/reply': () => {
        replied = true
        return makeReview({ id: 'r2', ownerReply: 'Kattalashtiramiz' })
      },
    })
    renderApp('/owner/stadium/s1/reviews', { session })
    fireEvent.click(await screen.findByRole('button', { name: 'Javob berish' }))
    const sheet = await screen.findByRole('dialog', { name: 'Sharhga javob' })
    const send = within(sheet).getByRole('button', { name: 'Yuborish' })
    expect(send).toBeDisabled()
    fireEvent.change(within(sheet).getByLabelText('Javobingiz'), {
      target: { value: '  Kattalashtiramiz ' },
    })
    fireEvent.click(send)
    expect(await screen.findByText('Javob yuborildi')).toBeInTheDocument()
    expect(api.calls('POST /api/reviews/r2/reply')).toEqual([{ reply: 'Kattalashtiramiz' }])
    expect(await screen.findByText('Kattalashtiramiz')).toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    stubApi({ 'GET /api/owner/stadiums': [stadium], [REVIEWS]: page([]) })
    renderApp('/owner/stadium/s1/reviews', { session })
    expect(await screen.findByText('Hozircha sharhlar yoʻq')).toBeInTheDocument()
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stubApi({
      'GET /api/owner/stadiums': [stadium],
      [REVIEWS]: () => (fail ? jsonResponse(403, null, 'You do not own this stadium') : page([])),
    })
    renderApp('/owner/stadium/s1/reviews', { session })
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByText('Hozircha sharhlar yoʻq')).toBeInTheDocument()
  })
})
