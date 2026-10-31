import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AuditEntry } from '../../api/audit'
import { mockBackend, page, renderAt, signIn, stats, useAdminTestSetup } from '../../test-utils'

const settings = {
  id: 's1',
  teamGamePlatformFee: 2_500_000,
  casualGameServiceFee: 500_000,
  cardFeeBps: 150,
  paymentRoundingStep: 10_000,
  updatedAt: '2026-10-22T11:12:00Z',
}

const history: AuditEntry[] = [
  {
    id: 'e1',
    time: '2026-10-22T11:12:00Z',
    actor: { id: 'u1', name: 'Aziz Rahimov', type: 'ADMIN' },
    action: 'SETTINGS_CHANGED',
    entity: { type: 'platform_settings', id: 's1', label: 'Platform settings' },
    changes: [
      { field: 'bookingCommissionPercent', oldValue: 5, newValue: 10 },
      { field: 'teamGamePlatformFee', oldValue: 2_000_000, newValue: 2_500_000 },
      { field: 'cardFeeBps', oldValue: 200, newValue: 150 },
    ],
    ip: '10.0.0.1',
  },
  {
    id: 'e0',
    time: '2026-09-02T05:00:00Z',
    actor: { id: 'u2', name: 'Dilnoza Karimova' },
    action: 'PLATFORM_SETTINGS_UPDATED',
    entity: { type: 'platform_settings', id: 's1' },
    changes: [],
    details: '{"x":1}',
  },
]

const base = {
  '/api/admin/stats': [200, stats],
  '/api/admin/settings': [200, settings],
  '/api/admin/audit-log': [200, page(history)],
} as const

function field(name: string) {
  return screen.getByLabelText(name) as HTMLInputElement
}

describe('Sozlamalar', () => {
  useAdminTestSetup()

  it('shows the four settings in percent and so’m with a preview under each', async () => {
    mockBackend({ ...base })
    signIn()
    renderAt('/sozlamalar')
    expect(await screen.findByLabelText('Platforma haqi')).toHaveValue('25 000')
    expect(field('Xizmat haqi')).toHaveValue('5 000')
    // The platform takes nothing from ordinary bookings: no commission row.
    expect(screen.queryByText('Oddiy bronlar')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Komissiya')).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Jamoa vs jamoa oʻyinlari',
      'Doʻstlar bilan oʻyinlar',
      'Karta komissiyasi',
      'Narxni yaxlitlash',
    ])
    expect(screen.getByText("Har bir jamoadan: 25 000 so'm")).toBeInTheDocument()
    expect(screen.getByText("Har bir oʻyinchidan: 5 000 so'm")).toBeInTheDocument()
    // The card fee in percent (150 bps), the rounding step in so'm (10 000 tiyin).
    expect(field('Komissiya (karta)')).toHaveValue('1,5')
    expect(field('Yaxlitlash qadami')).toHaveValue('100')
    expect(screen.getByText('Har bir karta toʻlovidan: 1,5%')).toBeInTheDocument()
    expect(screen.getByText("Oʻyinchilar narxi 100 so'mga yaxlitlanadi")).toBeInTheDocument()
    expect(
      screen.getByText(
        'Oʻyinchilar uchun narx shu qadamgacha yuqoriga yaxlitlanadi. Farq maydon egasiga tushadi.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/brondan/)).not.toBeInTheDocument()
    expect(screen.queryByText('Saqlanmagan oʻzgarishlar bor')).not.toBeInTheDocument()
  })

  it('reads the change history from the audit log, settings actions only', async () => {
    const { requests } = mockBackend({ ...base })
    signIn()
    renderAt('/sozlamalar')
    const table = await screen.findByRole('table')
    // An old entry for the commission that no longer exists still reads.
    expect(await within(table).findByText('5% → 10%')).toBeInTheDocument()
    expect(within(table).getByText('Oddiy bronlar komissiyasi')).toBeInTheDocument()
    expect(within(table).getByText("20 000 so'm → 25 000 so'm")).toBeInTheDocument()
    expect(within(table).getByText('Jamoa vs jamoa: platforma haqi')).toBeInTheDocument()
    expect(within(table).getByText('Karta komissiyasi')).toBeInTheDocument()
    expect(within(table).getByText('2% → 1,5%')).toBeInTheDocument()
    expect(within(table).getAllByText('Aziz Rahimov')).toHaveLength(3)
    expect(within(table).getByText('Tafsilotlar yoʻq')).toBeInTheDocument()
    expect(within(table).getAllByText('22.10.2026 16:12')).toHaveLength(3)
    const audit = requests.find((r) => r.url.pathname === '/api/admin/audit-log')
    expect(audit?.url.searchParams.get('action')).toBe('SETTINGS_CHANGED,PLATFORM_SETTINGS_UPDATED')
  })

  it('edits, confirms and saves only the changed field, in tiyin', async () => {
    let saved = settings
    const { requests } = mockBackend({
      ...base,
      '/api/admin/settings': () => [200, saved],
      'PUT /api/admin/settings': (request) => {
        saved = { ...settings, ...(request.body as object), updatedAt: '2026-10-28T10:00:00Z' }
        return [200, saved]
      },
    })
    signIn()
    renderAt('/sozlamalar')
    fireEvent.change(await screen.findByLabelText('Platforma haqi'), {
      target: { value: '30 000' },
    })
    expect(field('Platforma haqi')).toHaveValue('30 000')
    expect(screen.getByText("Har bir jamoadan: 30 000 so'm")).toBeInTheDocument()
    const bar = screen.getByRole('region', { name: 'Saqlanmagan oʻzgarishlar' })
    expect(bar).toHaveTextContent('Saqlanmagan oʻzgarishlar bor')

    fireEvent.click(within(bar).getByRole('button', { name: 'Saqlash' }))
    const dialog = screen.getByRole('dialog', { name: 'Oʻzgarishlarni saqlash' })
    expect(dialog).toHaveTextContent(
      'Yangi qiymatlar faqat yangi toʻlovlarga qoʻllaniladi. Avvalgi toʻlovlar oʻzgarmaydi.',
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Saqlash' }))

    expect(await screen.findByText('Sozlamalar saqlandi')).toBeInTheDocument()
    const put = requests.find((r) => r.method === 'PUT')
    expect(put?.body).toEqual({ teamGamePlatformFee: 3_000_000 })
    await waitFor(() =>
      expect(screen.queryByText('Saqlanmagan oʻzgarishlar bor')).not.toBeInTheDocument(),
    )
    expect(field('Platforma haqi')).toHaveValue('30 000')
  })

  it('saves the card fee in basis points and the rounding step in tiyin', async () => {
    const { requests } = mockBackend({
      ...base,
      'PUT /api/admin/settings': (request) => [200, { ...settings, ...(request.body as object) }],
    })
    signIn()
    renderAt('/sozlamalar')
    fireEvent.change(await screen.findByLabelText('Komissiya (karta)'), {
      target: { value: '2,25' },
    })
    expect(field('Komissiya (karta)')).toHaveValue('2,25')
    fireEvent.change(field('Yaxlitlash qadami'), { target: { value: '1 000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Saqlash' }))
    expect(await screen.findByText('Sozlamalar saqlandi')).toBeInTheDocument()
    expect(requests.find((r) => r.method === 'PUT')?.body).toEqual({
      cardFeeBps: 225,
      paymentRoundingStep: 100_000,
    })
  })

  it('shows the backend range errors on the card fee and the rounding step', async () => {
    let message = 'cardFeeBps must be between 0 and 1000'
    mockBackend({ ...base, 'PUT /api/admin/settings': () => [400, message] })
    signIn()
    renderAt('/sozlamalar')
    fireEvent.change(await screen.findByLabelText('Komissiya (karta)'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Saqlash' }))
    expect(await screen.findByText('Komissiya 0 dan 10% gacha boʻlishi kerak')).toBeInTheDocument()
    expect(field('Komissiya (karta)')).toHaveAttribute('aria-invalid', 'true')

    message = 'paymentRoundingStep must be between 1 and 1000000'
    fireEvent.change(field('Yaxlitlash qadami'), { target: { value: '20000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Saqlash' }))
    expect(
      await screen.findByText("Qadam 1 so'mdan 10 000 so'mgacha boʻlishi kerak"),
    ).toBeInTheDocument()
  })

  it('"Bekor qilish" puts the saved values back', async () => {
    mockBackend({ ...base })
    signIn()
    renderAt('/sozlamalar')
    fireEvent.change(await screen.findByLabelText('Platforma haqi'), {
      target: { value: '15 000' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }))
    expect(field('Platforma haqi')).toHaveValue('25 000')
    expect(screen.queryByText('Saqlanmagan oʻzgarishlar bor')).not.toBeInTheDocument()
  })

  it('shows the backend validation error on its field', async () => {
    mockBackend({
      ...base,
      'PUT /api/admin/settings': [400, 'casualGameServiceFee must not be negative'],
    })
    signIn()
    renderAt('/sozlamalar')
    fireEvent.change(await screen.findByLabelText('Xizmat haqi'), { target: { value: '6 000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Saqlash' }))
    expect(await screen.findByText('Haq manfiy boʻlishi mumkin emas')).toBeInTheDocument()
    expect(field('Xizmat haqi')).toHaveAttribute('aria-invalid', 'true')
    // The draft is kept so the admin can correct it.
    expect(screen.getByText('Saqlanmagan oʻzgarishlar bor')).toBeInTheDocument()
  })

  it('asks for a value before saving an emptied field', async () => {
    const { requests } = mockBackend({ ...base })
    signIn()
    renderAt('/sozlamalar')
    fireEvent.change(await screen.findByLabelText('Xizmat haqi'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    expect(screen.getByText('Qiymatni kiriting')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(requests.some((r) => r.method === 'PUT')).toBe(false)
  })

  it('shows an error state with retry, and an empty history', async () => {
    let fail = true
    mockBackend({
      ...base,
      '/api/admin/settings': () => (fail ? [500, 'boom'] : [200, settings]),
      '/api/admin/audit-log': [200, page([])],
    })
    signIn()
    renderAt('/sozlamalar')
    expect(await screen.findByText('Hali oʻzgarish yoʻq')).toBeInTheDocument()
    const alert = await screen.findByRole('alert', {}, { timeout: 4000 })
    fail = false
    fireEvent.click(within(alert).getByRole('button', { name: 'Qayta urinish' }))
    expect(await screen.findByLabelText('Platforma haqi')).toHaveValue('25 000')
  })
})
