import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BOOKING_DETAIL } from '../../api/bookings'
import {
  PAYMENTS_LIST,
  PAYMENTS_SUMMARY,
  REFUND_MANUAL,
  REFUND_RETRY,
  type AdminPayment,
  type AdminPaymentDetail,
  type PaymentSummary,
} from '../../api/payments'
import {
  markMissing,
  mockBackend,
  page,
  renderAt,
  type Reply,
  type Request,
  signIn,
  stats,
  useAdminTestSetup,
} from '../../test-utils'

const failedRefund: AdminPayment = {
  id: 'p1',
  createdAt: '2026-10-28T09:02:00Z',
  userId: 'u7',
  userName: 'Sardor Aliyev',
  userPhone: '+998 90 111 22 33',
  paymentType: 'refund',
  stadiumId: 'st1',
  stadiumName: 'Chilonzor Arena',
  bookingId: 'b1',
  amount: -20_000_000,
  ownerAmount: -19_000_000,
  platformAmount: -1_000_000,
  commissionPercent: 5,
  method: 'card',
  provider: 'atmos',
  providerTxnId: '8f3a2c1d5e764b098d317a4e9c21abcd-refund',
  status: 'failed',
  refundReason: 'Bron bekor qilindi',
  refundOfPaymentId: 'p2',
  failureReason: 'Transaction declined by issuer (code 57)',
}
const held: AdminPayment = {
  ...failedRefund,
  id: 'p3',
  userName: 'Jasur Toshev',
  paymentType: 'team_game',
  amount: 8_000_000,
  ownerAmount: 7_500_000,
  platformAmount: 500_000,
  cardFee: 120_000,
  providerCommission: 118_000,
  status: 'held',
  providerTxnId: '2c1d77e0aaaabbbbccccddddeeee0000',
  failureReason: undefined,
  refundOfPaymentId: undefined,
  refundReason: undefined,
}
const cash: AdminPayment = {
  ...held,
  id: 'p4',
  userName: 'Alisher Mirzayev',
  paymentType: 'remainder',
  method: 'cash',
  provider: 'cash',
  providerTxnId: undefined,
  cardFee: undefined,
  providerCommission: undefined,
  status: 'paid',
  amount: 13_000_000,
  ownerAmount: 13_000_000,
  platformAmount: 0,
}

const summary: PaymentSummary = {
  appRevenue: 4_865_000_000,
  cardFees: 73_000_000,
  platformRevenue: 125_000_000,
  ownerPayouts: 4_667_000_000,
  refunded: 210_000_000,
  held: 30_000_000,
}

function detail(p: AdminPayment): AdminPaymentDetail {
  return {
    ...p,
    linkedPayments:
      p.id === failedRefund.id
        ? [
            {
              id: 'p2',
              paymentType: 'booking',
              amount: 20_000_000,
              status: 'refund_failed',
              method: 'card',
              providerTxnId: 'b41e000000000000000000000000003af',
              createdAt: '2026-10-20T09:03:00Z',
            },
          ]
        : [],
  }
}

function backend(extra: Record<string, Reply | ((r: Request) => Reply)> = {}) {
  return mockBackend({
    '/api/admin/stats': [200, { ...stats, failedRefunds: 1 }],
    '/api/admin/stadiums': [200, page([])],
    // The backend filters by type and status; the mock answers as it would.
    '/api/admin/payments': (request) => {
      const type = request.url.searchParams.get('type')
      const status = request.url.searchParams.get('status')
      return [
        200,
        page(
          [failedRefund, held, cash].filter(
            (p) => (!type || p.paymentType === type) && (!status || p.status === status),
          ),
        ),
      ]
    },
    '/api/admin/payments/summary': [200, summary],
    '/api/admin/payments/p1': [200, detail(failedRefund)],
    '/api/admin/payments/p3': [200, detail(held)],
    '/api/admin/audit-log': [200, page([])],
    ...extra,
  })
}

const last = (requests: Request[], path: string) =>
  requests.filter((r) => r.url.pathname === path).at(-1)!.url.searchParams

describe('Toʻlovlar', () => {
  useAdminTestSetup()

  it('shows the period summary with the cash note, and the payments table', async () => {
    const { requests } = backend()
    signIn()
    renderAt('/tolovlar')
    const region = await screen.findByRole('region', { name: 'Umumiy koʻrsatkichlar' })
    expect(await within(region).findByText('48 650 000')).toBeInTheDocument()
    expect(within(region).getByText('Karta komissiyasi')).toBeInTheDocument()
    expect(within(region).getByText('730 000')).toBeInTheDocument()
    expect(within(region).getByText('Platforma daromadi')).toBeInTheDocument()
    expect(within(region).getByText('Naqd toʻlovlar tushumga kirmaydi')).toBeInTheDocument()
    // "Oy" by default: from the 1st of this month to today.
    const range = last(requests, '/api/admin/payments/summary')
    expect(range.get('from')!.endsWith('-01')).toBe(true)
    expect(range.get('to')! >= range.get('from')!).toBe(true)

    const table = screen.getByRole('table')
    const refundRow = (await within(table).findByText('Sardor Aliyev')).closest('tr')!
    expect(within(refundRow).getByText("−200 000 so'm")).toHaveClass('text-danger')
    expect(within(refundRow).getByText('Egaga: −190 000')).toBeInTheDocument()
    expect(within(refundRow).getByText('Platformaga: −10 000')).toBeInTheDocument()
    expect(within(refundRow).getByText('Muvaffaqiyatsiz')).toBeInTheDocument()
    expect(within(refundRow).getByText('8f3a…fund')).toBeInTheDocument()
    expect(within(refundRow).getByText('28 okt, 14:02')).toBeInTheDocument()
    const cashRow = within(table).getByText('Qoldiq').closest('tr')!
    expect(within(cashRow).getByText('Naqd')).toBeInTheDocument()
    expect(within(cashRow).getAllByText('—')).toHaveLength(2)
  })

  it('changes the summary period', async () => {
    const { requests } = backend()
    signIn()
    renderAt('/tolovlar')
    await screen.findByText('Sardor Aliyev')
    fireEvent.click(screen.getByRole('button', { name: 'Bugun' }))
    await waitFor(() => {
      const range = last(requests, '/api/admin/payments/summary')
      expect(range.get('from')).toBe(range.get('to'))
    })
    expect(screen.getByRole('button', { name: 'Bugun' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('has refund and held tabs: the refund tab filters by type and shows the failed count', async () => {
    const { requests } = backend()
    signIn()
    renderAt('/tolovlar')
    const refundsTab = await screen.findByRole('tab', { name: /Qaytarishlar/ })
    expect(await within(refundsTab).findByText('1')).toHaveClass('text-danger')
    fireEvent.click(refundsTab)
    await waitFor(() => expect(last(requests, '/api/admin/payments').get('type')).toBe('refund'))
    expect(screen.queryByLabelText('Turi')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Ushlab turilgan/ }))
    await waitFor(() => expect(last(requests, '/api/admin/payments').get('status')).toBe('held'))
    expect(screen.queryByLabelText('Holat')).not.toBeInTheDocument()
  })

  it('sends the search and the filters to the backend', async () => {
    const { requests } = backend()
    signIn()
    renderAt('/tolovlar')
    await screen.findByText('Sardor Aliyev')
    fireEvent.change(screen.getByLabelText('Ism, telefon yoki tranzaksiya ID'), {
      target: { value: '8f3a' },
    })
    await waitFor(() => expect(last(requests, '/api/admin/payments').get('search')).toBe('8f3a'))
    fireEvent.change(screen.getByLabelText('Turi'), { target: { value: 'refund' } })
    fireEvent.change(screen.getByLabelText('Usul'), { target: { value: 'card' } })
    fireEvent.change(screen.getByLabelText('Holat'), { target: { value: 'failed' } })
    await waitFor(() => {
      const query = last(requests, '/api/admin/payments')
      expect([query.get('type'), query.get('method'), query.get('status')]).toEqual([
        'refund',
        'card',
        'failed',
      ])
      expect(query.get('page')).toBe('0')
    })
  })

  it('opens a failed refund with the ATMOS error, retries it and links the original', async () => {
    const { requests } = backend({
      'POST /api/admin/payments/p1/retry-refund': [
        200,
        { ...failedRefund, status: 'refunded', failureReason: undefined },
      ],
    })
    signIn()
    const router = renderAt('/tolovlar?tolov=p1')
    const panel = await screen.findByRole('dialog', { name: /Qaytarish ·/ })
    expect(await within(panel).findByText('Qaytarish amalga oshmadi')).toBeInTheDocument()
    expect(
      within(panel).getByText('ATMOS xatosi: «Transaction declined by issuer (code 57)»'),
    ).toBeInTheDocument()
    expect(within(panel).getByText('Egadan')).toBeInTheDocument()
    expect(within(panel).getByText('5 %')).toBeInTheDocument()
    expect(within(panel).getByText('Qaytarish oʻtmadi')).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'Bronni ochish' })).toHaveAttribute(
      'href',
      '/bronlar?bron=b1',
    )
    fireEvent.click(within(panel).getByRole('button', { name: 'Qayta urinish' }))
    expect(await screen.findByText('Pul qaytarildi')).toBeInTheDocument()
    expect(requests.some((r) => r.method === 'POST')).toBe(true)

    fireEvent.click(within(panel).getByRole('button', { name: /Asl toʻlov/ }))
    expect(router.state.location.search).toContain('tolov=p2')
  })

  it('says when ATMOS cannot be reached on a retry', async () => {
    backend({
      'POST /api/admin/payments/p1/retry-refund': [502, 'Payment provider unavailable'],
    })
    signIn()
    renderAt('/tolovlar?tolov=p1')
    fireEvent.click(await screen.findByRole('button', { name: 'Qayta urinish' }))
    expect(
      await screen.findByText('ATMOS bilan bogʻlanib boʻlmadi. Keyinroq urinib koʻring'),
    ).toBeInTheDocument()
  })

  it('marks a failed refund as refunded by hand, with a required reason', async () => {
    const { requests } = backend({
      'POST /api/admin/payments/p1/mark-refunded': [
        200,
        { ...failedRefund, status: 'refunded', refundedManually: true },
      ],
    })
    signIn()
    renderAt('/tolovlar?tolov=p1')
    fireEvent.click(await screen.findByRole('button', { name: 'Qoʻlda qaytarildi' }))
    const dialog = screen.getByRole('dialog', { name: 'Qoʻlda qaytarildi deb belgilash' })
    expect(dialog).toHaveTextContent('Faqat pul boshqa yoʻl bilan qaytarilgan boʻlsa belgilang')
    const confirm = within(dialog).getByRole('button', { name: 'Belgilash' })
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'naqd' } })
    expect(confirm).toBeDisabled()
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'Mijozga maydonda naqd qaytarildi' },
    })
    fireEvent.click(confirm)
    expect(await screen.findByText('Qoʻlda qaytarildi deb belgilandi')).toBeInTheDocument()
    expect(requests.find((r) => r.method === 'POST')?.body).toEqual({
      reason: 'Mijozga maydonda naqd qaytarildi',
    })
  })

  it('shows the card fee of a card payment and has no actions on it', async () => {
    backend()
    signIn()
    renderAt('/tolovlar?tolov=p3')
    const panel = await screen.findByRole('dialog', { name: /Jamoa oʻyini ·/ })
    expect(await within(panel).findByText('Ushlab turilgan')).toBeInTheDocument()
    expect(within(panel).getByText('Karta komissiyasi')).toBeInTheDocument()
    expect(within(panel).getByText('ATMOS ushlab qoldi')).toBeInTheDocument()
    expect(
      within(panel).queryByRole('button', { name: /Qayta urinish|Qoʻlda/ }),
    ).not.toBeInTheDocument()
  })

  it('shows empty and error states', async () => {
    let fail = false
    backend({ '/api/admin/payments': () => (fail ? [500, 'boom'] : [200, page([])]) })
    signIn()
    renderAt('/tolovlar')
    expect(await screen.findByText('Toʻlovlar yoʻq')).toBeInTheDocument()
    fail = true
    fireEvent.change(screen.getByLabelText('Usul'), { target: { value: 'cash' } })
    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('while R16 is missing: the whole page is "Tez orada" — no summary, tabs, panel or request', async () => {
    markMissing(PAYMENTS_LIST, PAYMENTS_SUMMARY)
    const { requests } = backend()
    signIn()
    renderAt('/tolovlar?tolov=p1')
    expect(await screen.findByText('Tez orada')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Umumiy koʻrsatkichlar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(requests.some((r) => r.url.pathname.startsWith('/api/admin/payments'))).toBe(false)
  })

  it('while R17 is missing: the refund actions are disabled "Tez orada"; while R15 is, no booking link', async () => {
    markMissing(REFUND_RETRY, REFUND_MANUAL, BOOKING_DETAIL)
    backend()
    signIn()
    renderAt('/tolovlar?tolov=p1')
    const panel = await screen.findByRole('dialog', { name: /Qaytarish ·/ })
    const retry = await within(panel).findByRole('button', { name: 'Qayta urinish' })
    expect(retry).toBeDisabled()
    expect(retry.closest('[title]')).toHaveAttribute('title', 'Tez orada')
    expect(within(panel).getByRole('button', { name: 'Qoʻlda qaytarildi' })).toBeDisabled()
    expect(within(panel).queryByRole('link', { name: 'Bronni ochish' })).not.toBeInTheDocument()
  })
})
