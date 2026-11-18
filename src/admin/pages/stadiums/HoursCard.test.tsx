import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DayHours, StadiumDetail, StadiumRow } from '../../api/stadiums'
import {
  mockBackend,
  page,
  renderAt,
  type Reply,
  type Request,
  signIn,
  stats,
  useAdminTestSetup,
} from '../../test-utils'

/** Friday (4) 08:00–02:00, Sunday (6) closed, the rest 08:00–00:00. */
const MIXED_WEEK: DayHours[] = [
  { dayOfWeek: 0, closed: false, openTime: '08:00:00', closeTime: '00:00:00' },
  { dayOfWeek: 1, closed: false, openTime: '08:00:00', closeTime: '00:00:00' },
  { dayOfWeek: 2, closed: false, openTime: '08:00:00', closeTime: '00:00:00' },
  { dayOfWeek: 3, closed: false, openTime: '08:00:00', closeTime: '00:00:00' },
  { dayOfWeek: 4, closed: false, openTime: '08:00:00', closeTime: '02:00:00' },
  { dayOfWeek: 5, closed: false, openTime: '10:00:00', closeTime: '00:00:00' },
  { dayOfWeek: 6, closed: true },
]

const row: StadiumRow = {
  id: 's1',
  name: 'Chilonzor Arena',
  address: 'Chilonzor tumani, Bunyodkor 12',
  district: 'Chilonzor',
  pricePerHour: 15_000_000,
  playerPrice: 15_500_000,
  ownerReceives: 15_267_500,
  atmosFee: 232_500,
  ownerContractStatus: 'signed',
  ownerName: 'Jamshid Karimov',
  ownerId: 'o1',
  status: 'approved',
  format: '7x7',
  surfaceType: 'artificial',
  averageRating: 0,
  reviewCount: 0,
  totalBookings: 4,
  totalRevenue: 0,
  createdAt: '2026-10-01T10:00:00Z',
}

const stadium: StadiumDetail = {
  ...row,
  phone: '+998 71 200 00 00',
  latitude: 41.28,
  longitude: 69.2,
  openTime: '08:00:00',
  closeTime: '00:00:00',
  hours: MIXED_WEEK,
}

function backend(extra: Record<string, Reply | ((r: Request) => Reply)> = {}) {
  return mockBackend({
    '/api/admin/stats': [200, stats],
    '/api/admin/stadiums': [200, page([row])],
    '/api/admin/stadiums/s1': [200, stadium],
    '/api/admin/stadiums/s1/notes': [200, []],
    '/api/admin/users/o1': [
      200,
      {
        id: 'o1',
        name: 'Jamshid Karimov',
        phone: '+998 90 123 45 67',
        language: 'uz',
        isOwner: true,
        isAdmin: false,
        isBlocked: false,
        bookingCount: 6,
        stadiumCount: 1,
        createdAt: '2026-02-14T07:00:00Z',
      },
    ],
    '/api/admin/users/o1/legal-details': [200, null],
    '/api/admin/settings': [
      200,
      {
        id: 'ps',
        teamGamePlatformFee: 2_500_000,
        casualGameServiceFee: 0,
        cardFeeBps: 150,
        paymentRoundingStep: 500_000,
        defaultMinBookingAmount: 5_000_000,
        updatedAt: '2026-11-06T00:00:00Z',
      },
    ],
    '/api/admin/audit-log': [200, page([])],
    '/api/admin/bookings': [200, page([])],
    ...extra,
  })
}

describe('Maydon — Ish vaqti', () => {
  useAdminTestSetup()

  it('lists every day of the week', async () => {
    backend()
    signIn()
    renderAt('/maydonlar/s1')

    const card = await screen.findByRole('region', { name: 'Ish vaqti' })
    expect(within(card).getByText('Juma').closest('div')).toHaveTextContent(
      '08:00–02:00 (ertasi kuni)',
    )
    expect(within(card).getByText('Yakshanba').closest('div')).toHaveTextContent('Yopiq')
    expect(within(card).getByText('Dushanba').closest('div')).toHaveTextContent('08:00–00:00')
  })

  it('asks for confirmation before saving, and sends the whole week', async () => {
    const { requests } = backend({ '/api/admin/stadiums/s1/hours': [200, stadium] })
    signIn()
    renderAt('/maydonlar/s1')

    const card = await screen.findByRole('region', { name: 'Ish vaqti' })
    fireEvent.click(within(card).getByRole('button', { name: /Oʻzgartirish/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Ish vaqti' })
    fireEvent.change(within(dialog).getByLabelText('Seshanba yopilish'), {
      target: { value: '02:00:00' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Saqlash' }))

    // Nothing is sent until the confirmation is accepted.
    expect(requests.filter((r) => r.method === 'PUT')).toHaveLength(0)
    fireEvent.click(await screen.findByRole('button', { name: 'Tasdiqlash' }))

    await waitFor(() =>
      expect(requests.filter((r) => r.url.pathname === '/api/admin/stadiums/s1/hours')).toHaveLength(
        1,
      ),
    )
    const sent = requests.find((r) => r.url.pathname === '/api/admin/stadiums/s1/hours')?.body as {
      hours: { days: DayHours[] }
    }
    expect(sent.hours.days).toHaveLength(7)
    expect(sent.hours.days[1]).toEqual({
      dayOfWeek: 1,
      closed: false,
      openTime: '08:00:00',
      closeTime: '02:00:00',
    })
    expect(sent.hours.days[6]).toEqual({ dayOfWeek: 6, closed: true })
  })

  it('sends nothing when the confirmation is dismissed', async () => {
    const { requests } = backend()
    signIn()
    renderAt('/maydonlar/s1')

    const card = await screen.findByRole('region', { name: 'Ish vaqti' })
    fireEvent.click(within(card).getByRole('button', { name: /Oʻzgartirish/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Ish vaqti' })
    fireEvent.change(within(dialog).getByLabelText('Seshanba yopilish'), {
      target: { value: '02:00:00' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Saqlash' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Bekor qilish' }))

    expect(requests.filter((r) => r.method === 'PUT')).toHaveLength(0)
  })

  it('refuses a week the backend would refuse, without sending it', async () => {
    const { requests } = backend()
    signIn()
    renderAt('/maydonlar/s1')

    const card = await screen.findByRole('region', { name: 'Ish vaqti' })
    fireEvent.click(within(card).getByRole('button', { name: /Oʻzgartirish/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Ish vaqti' })
    // Saturday opens at 10:00; closing Friday at 09:00 leaves less than an hour… and
    // 09:00 is past 06:00 anyway, so the day is refused outright.
    fireEvent.change(within(dialog).getByLabelText('Juma yopilish'), {
      target: { value: '07:00:00' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Saqlash' }))

    expect(within(dialog).getByRole('alert')).toHaveTextContent(/06:00/)
    expect(requests.filter((r) => r.method === 'PUT')).toHaveLength(0)
  })

  it('closes a day with its Yopiq checkbox', async () => {
    const { requests } = backend({ '/api/admin/stadiums/s1/hours': [200, stadium] })
    signIn()
    renderAt('/maydonlar/s1')

    const card = await screen.findByRole('region', { name: 'Ish vaqti' })
    fireEvent.click(within(card).getByRole('button', { name: /Oʻzgartirish/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Ish vaqti' })
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Dushanba yopiq' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Saqlash' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Tasdiqlash' }))

    await waitFor(() => expect(requests.filter((r) => r.method === 'PUT')).toHaveLength(1))
    const sent = requests.find((r) => r.method === 'PUT')?.body as { hours: { days: DayHours[] } }
    expect(sent.hours.days[0]).toEqual({ dayOfWeek: 0, closed: true })
  })

  it('says "Tez orada" when the backend sends no schedule', async () => {
    backend({ '/api/admin/stadiums/s1': [200, { ...stadium, hours: undefined }] })
    signIn()
    renderAt('/maydonlar/s1')

    const card = await screen.findByRole('region', { name: 'Ish vaqti' })
    // The legacy pair is still shown, but there is nothing to edit day by day.
    expect(card).toHaveTextContent('08:00–00:00')
    expect(within(card).queryByRole('button', { name: /Oʻzgartirish/ })).toBeNull()
  })
})
