import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { configureApiClient, createMemoryTokenStore } from '../../shared/api'
import type { Booking } from '../api/bookings'
import { SessionProvider } from '../auth/SessionProvider'
import { ToastProvider } from '../components/ToastProvider'
import '../i18n'
import { routes } from '../routes'
import { stubApi } from '../test/api'
import { makeBooking } from '../test/bookings'
import { readySession } from '../test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderDone(booking?: Booking) {
  stubApi({
    'GET /api/bookings': { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
  })
  configureApiClient({ tokenStore: createMemoryTokenStore() })
  const router = createMemoryRouter(routes, {
    initialEntries: [{ pathname: '/checkout/done', state: booking ? { booking } : null }],
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SessionProvider session={readySession()}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </SessionProvider>
    </QueryClientProvider>,
  )
  return router
}

describe('Band qilindi', () => {
  it('shows what was paid and the cancellation deadline from the booking', async () => {
    renderDone(
      makeBooking({
        paidAmount: 15_500_000,
        remainingAmount: 0,
        cancellationDeadline: '2099-11-05T15:00:00Z',
      }),
    )
    expect(await screen.findByRole('heading', { name: 'Band qilindi!' })).toBeInTheDocument()
    expect(screen.getByText('Bunyodkor Arena')).toBeInTheDocument()
    expect(screen.getByText(/20:00–21:00/)).toBeInTheDocument()
    expect(screen.getByText('Toʻlandi: 155 000 soʻm')).toBeInTheDocument()
    expect(screen.queryByText(/Qolgani/)).not.toBeInTheDocument()
    expect(
      screen.getByText('Bekor qilish muddati: 5-noyabr, 2099, 20:00 gacha'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Oʻyinlarimga oʻtish' })).toHaveAttribute(
      'href',
      '/games',
    )
    expect(screen.getByRole('link', { name: 'Bosh sahifa' })).toHaveAttribute('href', '/')
  })

  it('says nothing comes back, not a past deadline, when booked inside the window', async () => {
    renderDone(
      makeBooking({
        paidAmount: 5_500_000,
        remainingAmount: 10_000_000,
        refundIfCancelledNow: 0,
        cancellationDeadline: new Date(Date.now() - 24 * 60 * 60_000).toISOString(),
      }),
    )
    expect(
      await screen.findByText('Hozir bekor qilsangiz, toʻlov qaytarilmaydi'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Bekor qilish muddati/)).not.toBeInTheDocument()
  })

  it('shows the remainder when part is still due', async () => {
    renderDone(
      makeBooking({
        paymentStatus: 'partially_paid',
        paidAmount: 5_500_000,
        remainingAmount: 10_000_000,
      }),
    )
    expect(await screen.findByText('Toʻlandi: 55 000 soʻm')).toBeInTheDocument()
    expect(screen.getByText('Qolgani: 100 000 soʻm')).toBeInTheDocument()
    expect(screen.getByText(/ilovada yoki maydonda naqd/)).toBeInTheDocument()
  })

  it('goes to Oʻyinlarim when opened without a booking', async () => {
    const router = renderDone()
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/games'))
  })
})
