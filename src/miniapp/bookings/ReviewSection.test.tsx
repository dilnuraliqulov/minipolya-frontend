import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, stubApi } from '../test/api'
import { makeBooking } from '../test/bookings'
import { renderApp } from '../test/renderApp'
import { makeDetail, makeReview } from '../test/stadiums'

afterEach(() => {
  vi.unstubAllGlobals()
})

const SID = '018f3a2c-0000-7000-8000-0000000000a1'
const completed = makeBooking({ id: 'b1', stadiumId: SID, status: 'completed' })
const MY = 'GET /api/reviews/my'
const page = <T,>(content: T[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
})

function stub(booking = completed, overrides: Record<string, unknown> = {}) {
  return stubApi({
    'GET /api/bookings/b1': booking,
    [`GET /api/stadiums/${SID}`]: makeDetail({ id: SID }),
    [MY]: page([]),
    ...overrides,
  } as Parameters<typeof stubApi>[0])
}

describe('Review a completed booking', () => {
  it('posts a rating with a comment and then shows it', async () => {
    let posted = false
    const mine = makeReview({ stadiumId: SID, bookingId: 'b1', rating: 4, comment: 'Zoʻr' })
    const api = stub(completed, {
      [MY]: () => page(posted ? [mine] : []),
      'POST /api/reviews': () => {
        posted = true
        return mine
      },
    })
    renderApp('/bookings/b1')
    fireEvent.click(await screen.findByRole('button', { name: 'Oʻyinni baholang' }))
    const sheet = await screen.findByRole('dialog', { name: 'Maydonni baholang' })
    const submit = within(sheet).getByRole('button', { name: 'Yuborish' })
    expect(submit).toBeDisabled()
    fireEvent.click(within(sheet).getByRole('radio', { name: '4 yulduz' }))
    fireEvent.change(within(sheet).getByLabelText('Izoh (ixtiyoriy)'), {
      target: { value: 'Zoʻr' },
    })
    fireEvent.click(submit)
    expect(await screen.findByText('Rahmat! Bahoyingiz qabul qilindi')).toBeInTheDocument()
    expect(api.calls('POST /api/reviews')).toEqual([
      { stadiumId: SID, bookingId: 'b1', rating: 4, comment: 'Zoʻr' },
    ])
    expect(await screen.findByText('Sizning bahoyingiz')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Oʻyinni baholang' })).not.toBeInTheDocument()
  })

  it.each([
    ['this booking', { bookingId: 'b1' }],
    ['this stadium', { bookingId: undefined }],
  ])('shows the existing review for %s', async (_, extra) => {
    stub(completed, {
      [MY]: page([makeReview({ stadiumId: SID, rating: 5, comment: 'Ajoyib', ...extra })]),
    })
    renderApp('/bookings/b1')
    expect(await screen.findByText('Sizning bahoyingiz')).toBeInTheDocument()
    expect(screen.getByText('Ajoyib')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Oʻyinni baholang' })).not.toBeInTheDocument()
  })

  it('maps the already-reviewed error to its own text', async () => {
    stub(completed, {
      'POST /api/reviews': jsonResponse(400, null, 'You have already reviewed this stadium'),
    })
    renderApp('/bookings/b1')
    fireEvent.click(await screen.findByRole('button', { name: 'Oʻyinni baholang' }))
    const sheet = await screen.findByRole('dialog', { name: 'Maydonni baholang' })
    fireEvent.click(within(sheet).getByRole('radio', { name: '5 yulduz' }))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Yuborish' }))
    expect(await within(sheet).findByRole('alert')).toHaveTextContent(
      'Siz bu maydonni allaqachon baholagansiz.',
    )
  })

  it('asks nothing for a booking that is not completed', async () => {
    const api = stub(makeBooking({ id: 'b1', stadiumId: SID, status: 'confirmed' }))
    renderApp('/bookings/b1')
    await screen.findByText('Tasdiqlangan')
    expect(screen.queryByText('Oʻyinni baholang')).not.toBeInTheDocument()
    expect(api.calls(MY)).toHaveLength(0)
  })
})
