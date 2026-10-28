import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AuditEntry } from '../../api/audit'
import { mockBackend, page, renderAt, signIn, stats, useAdminTestSetup } from '../../test-utils'

const settings = {
  id: 's1',
  bookingCommissionPercent: 10,
  teamGamePlatformFee: 2_500_000,
  casualGameServiceFee: 500_000,
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

  it('shows the three settings in percent and so’m with a preview under each', async () => {
    mockBackend({ ...base })
    signIn()
    renderAt('/sozlamalar')
    expect(await screen.findByLabelText('Komissiya')).toHaveValue('10')
    expect(field('Platforma haqi')).toHaveValue('25 000')
    expect(field('Xizmat haqi')).toHaveValue('5 000')
    expect(screen.getByText("200 000 so'mlik brondan: 20 000 so'm")).toBeInTheDocument()
    expect(screen.getByText("Har bir jamoadan: 25 000 so'm")).toBeInTheDocument()
    expect(screen.getByText("Har bir oʻyinchidan: 5 000 so'm")).toBeInTheDocument()
    expect(screen.queryByText(/ATMOS|egasi/)).not.toBeInTheDocument()
    expect(screen.queryByText('Saqlanmagan oʻzgarishlar bor')).not.toBeInTheDocument()
  })

  it('reads the change history from the audit log, settings actions only', async () => {
    const { requests } = mockBackend({ ...base })
    signIn()
    renderAt('/sozlamalar')
    const table = await screen.findByRole('table')
    expect(await within(table).findByText('5% → 10%')).toBeInTheDocument()
    expect(within(table).getByText("20 000 so'm → 25 000 so'm")).toBeInTheDocument()
    expect(within(table).getByText('Jamoa vs jamoa: platforma haqi')).toBeInTheDocument()
    expect(within(table).getAllByText('Aziz Rahimov')).toHaveLength(2)
    expect(within(table).getByText('Tafsilotlar yoʻq')).toBeInTheDocument()
    expect(within(table).getAllByText('22.10.2026 16:12')).toHaveLength(2)
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

  it('"Bekor qilish" puts the saved values back', async () => {
    mockBackend({ ...base })
    signIn()
    renderAt('/sozlamalar')
    fireEvent.change(await screen.findByLabelText('Komissiya'), { target: { value: '15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }))
    expect(field('Komissiya')).toHaveValue('10')
    expect(screen.queryByText('Saqlanmagan oʻzgarishlar bor')).not.toBeInTheDocument()
  })

  it('shows the backend validation error on its field', async () => {
    mockBackend({
      ...base,
      'PUT /api/admin/settings': [400, 'bookingCommissionPercent must be between 0 and 50'],
    })
    signIn()
    renderAt('/sozlamalar')
    fireEvent.change(await screen.findByLabelText('Komissiya'), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Saqlash' }))
    expect(await screen.findByText('Komissiya 0 dan 50 gacha boʻlishi kerak')).toBeInTheDocument()
    expect(field('Komissiya')).toHaveAttribute('aria-invalid', 'true')
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
    expect(await screen.findByLabelText('Komissiya')).toHaveValue('10')
  })
})
