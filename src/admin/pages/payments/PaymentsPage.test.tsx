import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminPayment, AdminPaymentDetail } from '../../api/payments'
import { mockBackend, page, renderAt, signIn, stats, useAdminTestSetup } from '../../test-utils'

const failedRefund: AdminPayment = {
  id: 'sample-payment-0001',
  createdAt: '2026-10-28T09:02:00Z',
  userId: 'sample-user-0001',
  userName: 'Sardor Aliyev',
  userPhone: '+998 90 111 22 33',
  paymentType: 'refund',
  stadiumId: 'sample-stadium-0011',
  stadiumName: 'Bunyodkor Arena',
  bookingId: 'sample-booking-0001',
  amount: -20_000_000,
  ownerAmount: -19_000_000,
  platformAmount: -1_000_000,
  commissionPercent: 5,
  method: 'card',
  provider: 'atmos',
  providerTxnId: '8f3a2c1d5e764b098d317a4e9c21abcd-refund',
  status: 'failed',
  refundReason: 'Bron bekor qilindi',
  refundOfPaymentId: 'sample-payment-0002',
  failureReason: 'Transaction declined by issuer (code 57)',
}
const held: AdminPayment = {
  ...failedRefund,
  id: 'sample-payment-0003',
  userName: 'Jasur Toshev',
  paymentType: 'team_game',
  amount: 8_000_000,
  ownerAmount: 7_500_000,
  platformAmount: 500_000,
  status: 'held',
  providerTxnId: '2c1d77e0aaaabbbbccccddddeeee0000',
  failureReason: undefined,
  refundOfPaymentId: undefined,
  refundReason: undefined,
}
const cash: AdminPayment = {
  ...held,
  id: 'sample-payment-0004',
  userName: 'Alisher Mirzayev',
  paymentType: 'remainder',
  method: 'cash',
  provider: 'cash',
  providerTxnId: undefined,
  status: 'paid',
  amount: 13_000_000,
  ownerAmount: 13_000_000,
  platformAmount: 0,
}

async function sample() {
  const adapter = await import('../../api/sample/adapter')
  const list = vi
    .spyOn(adapter, 'listPayments')
    .mockImplementation((q) =>
      Promise.resolve(
        page(
          [failedRefund, held, cash].filter(
            (p) => (!q.type || p.paymentType === q.type) && (!q.status || p.status === q.status),
          ),
        ),
      ),
    )
  vi.spyOn(adapter, 'getPayment').mockImplementation((id) => {
    const p = [failedRefund, held, cash].find((x) => x.id === id)!
    const detail: AdminPaymentDetail = {
      ...p,
      linkedPayments:
        p.id === failedRefund.id
          ? [
              {
                id: 'sample-payment-0002',
                paymentType: 'booking',
                amount: 20_000_000,
                status: 'paid',
                method: 'card',
                providerTxnId: 'b41e000000000000000000000000003af',
                createdAt: '2026-10-20T09:03:00Z',
              },
            ]
          : [],
    }
    return Promise.resolve(detail)
  })
  vi.spyOn(adapter, 'paymentSummary').mockResolvedValue({
    appRevenue: 4_865_000_000,
    platformRevenue: 125_000_000,
    ownerPayouts: 4_740_000_000,
    refunded: 210_000_000,
    held: 30_000_000,
  })
  vi.spyOn(adapter, 'refundAlerts').mockReturnValue({ failedRefunds: 1 })
  return { list, adapter }
}

const replies = {
  '/api/admin/stats': [200, stats],
  '/api/admin/stadiums': [200, page([])],
} as const

describe('Toʻlovlar', () => {
  useAdminTestSetup()

  it('shows the period summary with the cash note, and the payments table', async () => {
    const { adapter } = await sample()
    mockBackend({ ...replies })
    signIn()
    renderAt('/tolovlar')
    const summary = await screen.findByRole('region', { name: 'Umumiy koʻrsatkichlar' })
    expect(await within(summary).findByText('48 650 000')).toBeInTheDocument()
    expect(within(summary).getByText('Platforma daromadi')).toBeInTheDocument()
    expect(within(summary).getByText('Naqd toʻlovlar tushumga kirmaydi')).toBeInTheDocument()
    // "Oy" by default: from the 1st of this month to today.
    const [from, to] = vi.mocked(adapter.paymentSummary).mock.calls.at(-1)!
    expect(from.endsWith('-01')).toBe(true)
    expect(to >= from).toBe(true)

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
    const { adapter } = await sample()
    mockBackend({ ...replies })
    signIn()
    renderAt('/tolovlar')
    await screen.findByText('Sardor Aliyev')
    fireEvent.click(screen.getByRole('button', { name: 'Bugun' }))
    await waitFor(() => {
      const [from, to] = vi.mocked(adapter.paymentSummary).mock.calls.at(-1)!
      expect(from).toBe(to)
    })
    expect(screen.getByRole('button', { name: 'Bugun' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('has refund and held tabs: the refund tab filters by type and shows the failed count', async () => {
    const { list } = await sample()
    mockBackend({ ...replies })
    signIn()
    renderAt('/tolovlar')
    const refundsTab = await screen.findByRole('tab', { name: /Qaytarishlar/ })
    expect(await within(refundsTab).findByText('1')).toHaveClass('text-danger')
    fireEvent.click(refundsTab)
    await waitFor(() => expect(list.mock.calls.at(-1)![0]).toMatchObject({ type: 'refund' }))
    expect(screen.queryByLabelText('Turi')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Ushlab turilgan/ }))
    await waitFor(() => expect(list.mock.calls.at(-1)![0]).toMatchObject({ status: 'held' }))
    expect(screen.queryByLabelText('Holat')).not.toBeInTheDocument()
  })

  it('sends the search and the filters', async () => {
    const { list } = await sample()
    mockBackend({ ...replies })
    signIn()
    renderAt('/tolovlar')
    await screen.findByText('Sardor Aliyev')
    fireEvent.change(screen.getByLabelText('Ism, telefon yoki tranzaksiya ID'), {
      target: { value: '8f3a' },
    })
    await waitFor(() => expect(list.mock.calls.at(-1)![0].search).toBe('8f3a'))
    fireEvent.change(screen.getByLabelText('Turi'), { target: { value: 'refund' } })
    fireEvent.change(screen.getByLabelText('Usul'), { target: { value: 'card' } })
    fireEvent.change(screen.getByLabelText('Holat'), { target: { value: 'failed' } })
    await waitFor(() =>
      expect(list.mock.calls.at(-1)![0]).toMatchObject({
        type: 'refund',
        method: 'card',
        status: 'failed',
        page: 0,
      }),
    )
  })

  it('opens a failed refund with the ATMOS error, retries it and links the original', async () => {
    const { adapter } = await sample()
    const retry = vi
      .spyOn(adapter, 'retryRefund')
      .mockResolvedValue({ ...failedRefund, status: 'refunded', failureReason: undefined })
    mockBackend({ ...replies })
    signIn()
    const router = renderAt('/tolovlar?tolov=sample-payment-0001')
    const panel = await screen.findByRole('dialog', { name: /Qaytarish ·/ })
    expect(await within(panel).findByText('Qaytarish amalga oshmadi')).toBeInTheDocument()
    expect(
      within(panel).getByText('ATMOS xatosi: «Transaction declined by issuer (code 57)»'),
    ).toBeInTheDocument()
    expect(within(panel).getByText('Egadan')).toBeInTheDocument()
    expect(within(panel).getByText('5 %')).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'Bronni ochish' })).toHaveAttribute(
      'href',
      '/bronlar?bron=sample-booking-0001',
    )
    fireEvent.click(within(panel).getByRole('button', { name: 'Qayta urinish' }))
    expect(await screen.findByText('Pul qaytarildi (namuna)')).toBeInTheDocument()
    expect(retry).toHaveBeenCalledWith('sample-payment-0001')

    fireEvent.click(within(panel).getByRole('button', { name: /Asl toʻlov/ }))
    expect(router.state.location.search).toContain('tolov=sample-payment-0002')
  })

  it('marks a failed refund as refunded by hand, with a required reason', async () => {
    const { adapter } = await sample()
    const mark = vi
      .spyOn(adapter, 'markRefunded')
      .mockResolvedValue({ ...failedRefund, status: 'refunded', refundedManually: true })
    mockBackend({ ...replies })
    signIn()
    renderAt('/tolovlar?tolov=sample-payment-0001')
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
    expect(await screen.findByText('Qoʻlda qaytarildi deb belgilandi (namuna)')).toBeInTheDocument()
    expect(mark).toHaveBeenCalledWith('sample-payment-0001', 'Mijozga maydonda naqd qaytarildi')
  })

  it('has no actions on other payments', async () => {
    await sample()
    mockBackend({ ...replies })
    signIn()
    renderAt('/tolovlar?tolov=sample-payment-0003')
    const panel = await screen.findByRole('dialog', { name: /Jamoa oʻyini ·/ })
    expect(await within(panel).findByText('Ushlab turilgan')).toBeInTheDocument()
    expect(
      within(panel).queryByRole('button', { name: /Qayta urinish|Qoʻlda/ }),
    ).not.toBeInTheDocument()
  })

  it('shows empty and error states', async () => {
    const { list } = await sample()
    list.mockResolvedValue(page([]))
    mockBackend({ ...replies })
    signIn()
    renderAt('/tolovlar')
    expect(await screen.findByText('Toʻlovlar yoʻq')).toBeInTheDocument()
    list.mockRejectedValue(new Error('boom'))
    fireEvent.change(screen.getByLabelText('Usul'), { target: { value: 'cash' } })
    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toBeInTheDocument()
  })
})
