import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AuditEntry } from '../../api/audit'
import { mockBackend, page, renderAt, signIn, stats, useAdminTestSetup } from '../../test-utils'

const entries: AuditEntry[] = [
  {
    id: 'e1',
    time: '2026-10-22T13:30:00Z',
    actor: { id: 'u2', name: 'Dilnoza Karimova', type: 'ADMIN' },
    action: 'USER_BLOCKED',
    entity: { type: 'user', id: 'u9', label: 'Umid Karimov' },
    changes: [{ field: 'isBlocked', oldValue: false, newValue: true }],
    reason: 'Koʻp bekor qilishlar',
    ip: '10.0.0.7',
  },
  {
    id: 'e2',
    time: '2026-10-22T11:12:00Z',
    actor: { id: 'u1', name: 'Aziz Rahimov', type: 'ADMIN' },
    action: 'SETTINGS_CHANGED',
    entity: { type: 'platform_settings', id: 's1', label: 'Platform settings' },
    changes: [{ field: 'bookingCommissionPercent', oldValue: 0, newValue: 5 }],
  },
  {
    id: 'e3',
    time: '2026-10-21T10:00:00Z',
    actor: { type: 'SYSTEM' },
    action: 'BOOKING_CONFIRMED',
    entity: { type: 'booking', id: 'b1', label: 'Chilonzor Arena, 2026-10-21 20:00 (2h)' },
    changes: [
      { field: 'status', oldValue: 'pending', newValue: 'confirmed' },
      { field: 'paidAmount', oldValue: 0, newValue: 5_000_000 },
    ],
  },
  {
    id: 'e4',
    time: '2026-10-20T10:00:00Z',
    actor: { id: 'u3', name: 'Ali', type: 'OWNER' },
    action: 'SOMETHING_NEW',
    entity: { type: 'stadium', id: 's9' },
    changes: [],
    details: '{"raw":"json"}',
  },
]

function replies(content = entries, totalElements = 2318) {
  return {
    '/api/admin/stats': [200, stats],
    '/api/admin/audit-log': [200, { ...page(content), totalElements, totalPages: 116 }],
    '/api/admin/audit-log/actions': [200, ['USER_BLOCKED', 'SETTINGS_CHANGED', 'STADIUM_APPROVED']],
  } as const
}

describe('Jurnal', () => {
  useAdminTestSetup()

  it('lists entries in plain Uzbek with the total in the title', async () => {
    mockBackend(replies())
    signIn()
    renderAt('/jurnal')
    expect(
      await screen.findByText('Foydalanuvchini blokladi', { selector: 'td' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Jurnal · 2 318'),
    )
    const rows = screen.getAllByRole('row')
    const first = rows[1]!
    expect(first).toHaveTextContent('22.10.2026 18:30')
    expect(within(first).getByText('Dilnoza Karimova')).toBeInTheDocument()
    expect(within(first).getByText('Admin')).toBeInTheDocument()
    expect(within(first).getByText('Umid Karimov')).toBeInTheDocument()
    // The system shows as "Tizim"; an unknown code shows as the code.
    expect(screen.getByText('Tizim', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Bron tasdiqlandi')).toBeInTheDocument()
    expect(screen.getByText('SOMETHING_NEW')).toBeInTheDocument()
    expect(screen.getByText('Maydon egasi', { selector: 'span' })).toBeInTheDocument()
    // The settings object links to its page.
    expect(screen.getByRole('link', { name: 'Platform settings' })).toHaveAttribute(
      'href',
      '/sozlamalar',
    )
  })

  it('expands a row into readable changes, the reason and the IP — never JSON', async () => {
    mockBackend(replies())
    signIn()
    renderAt('/jurnal')
    await screen.findByText('Foydalanuvchini blokladi', { selector: 'td' })
    const toggles = screen.getAllByLabelText('Batafsil')

    fireEvent.click(toggles[0]!)
    expect(screen.getByText('Koʻp bekor qilishlar')).toBeInTheDocument()
    expect(screen.getByText('Bloklangan', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByText('Yoʻq → Ha')).toBeInTheDocument()
    expect(screen.getByText('IP: 10.0.0.7')).toHaveClass('text-xs')

    fireEvent.click(screen.getAllByLabelText('Batafsil')[1]!)
    expect(screen.getByText('Kutilmoqda → Tasdiqlangan')).toBeInTheDocument()
    expect(screen.getByText("0 so'm → 50 000 so'm")).toBeInTheDocument()

    fireEvent.click(screen.getAllByLabelText('Batafsil')[1]!)
    expect(screen.getByText('Eski yozuv: oʻzgarishlar alohida saqlanmagan')).toBeInTheDocument()
    expect(screen.queryByText(/raw/)).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByLabelText('Yopish')[0]!)
    expect(screen.queryByText('Koʻp bekor qilishlar')).not.toBeInTheDocument()
  })

  it('sends each filter to the backend and resets to the first page', async () => {
    const { requests } = mockBackend(replies())
    signIn()
    const router = renderAt('/jurnal')
    await screen.findByText('Foydalanuvchini blokladi', { selector: 'td' })
    const last = () =>
      requests.filter((r) => r.url.pathname === '/api/admin/audit-log').at(-1)!.url.searchParams

    fireEvent.click(screen.getByRole('button', { name: '2' }))
    await waitFor(() => expect(last().get('page')).toBe('1'))

    fireEvent.change(screen.getByLabelText('Turi'), { target: { value: 'OWNER' } })
    await waitFor(() => expect(last().get('actorType')).toBe('OWNER'))
    expect(last().get('page')).toBe('0')

    await waitFor(() =>
      expect(screen.getByLabelText('Harakat')).toHaveTextContent('Maydonni tasdiqladi'),
    )
    fireEvent.change(screen.getByLabelText('Harakat'), { target: { value: 'STADIUM_APPROVED' } })
    await waitFor(() => expect(last().get('action')).toBe('STADIUM_APPROVED'))

    fireEvent.change(screen.getByLabelText('Kim'), { target: { value: ' Dilnoza ' } })
    await waitFor(() => expect(last().get('actor')).toBe('Dilnoza'))

    fireEvent.click(screen.getByRole('button', { name: 'Sana: Barchasi' }))
    const picker = screen.getByRole('dialog', { name: 'Sana' })
    fireEvent.change(within(picker).getByLabelText('Dan'), { target: { value: '2026-10-01' } })
    fireEvent.change(within(picker).getByLabelText('Gacha'), { target: { value: '2026-10-23' } })
    fireEvent.click(within(picker).getByRole('button', { name: 'Qoʻllash' }))
    await waitFor(() => expect(last().get('from')).toBe('2026-10-01'))
    expect(last().get('to')).toBe('2026-10-23')
    expect(screen.getByRole('button', { name: /01\.10\.2026 – 23\.10\.2026/ })).toBeInTheDocument()
    expect(router.state.location.search).toContain('turi=OWNER')

    fireEvent.click(screen.getByRole('button', { name: 'Tozalash' }))
    // Back to the unfiltered list (already cached, so it may not be fetched again).
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(screen.getByLabelText('Turi')).toHaveValue('')
    expect(screen.getByLabelText('Kim')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Sana: Barchasi' })).toBeInTheDocument()
  })

  it('refuses a date range that ends before it starts', async () => {
    mockBackend(replies())
    signIn()
    renderAt('/jurnal')
    fireEvent.click(await screen.findByRole('button', { name: 'Sana: Barchasi' }))
    const picker = screen.getByRole('dialog', { name: 'Sana' })
    fireEvent.change(within(picker).getByLabelText('Dan'), { target: { value: '2026-10-20' } })
    fireEvent.change(within(picker).getByLabelText('Gacha'), { target: { value: '2026-10-10' } })
    expect(within(picker).getByRole('alert')).toBeInTheDocument()
    expect(within(picker).getByRole('button', { name: 'Qoʻllash' })).toBeDisabled()
  })

  it('shows the empty and filtered-empty states', async () => {
    mockBackend(replies([], 0))
    signIn()
    renderAt('/jurnal')
    expect(await screen.findByText('Jurnal boʻsh')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Turi'), { target: { value: 'SYSTEM' } })
    expect(await screen.findByText('Hech narsa topilmadi')).toBeInTheDocument()
  })

  it('shows an error with a retry', async () => {
    let fail = true
    mockBackend({
      ...replies(),
      '/api/admin/audit-log': () => (fail ? [500, 'boom'] : [200, page(entries)]),
    })
    signIn()
    renderAt('/jurnal')
    const alert = await screen.findByRole('alert', {}, { timeout: 4000 })
    fail = false
    fireEvent.click(within(alert).getByRole('button', { name: 'Qayta urinish' }))
    expect(
      await screen.findByText('Foydalanuvchini blokladi', { selector: 'td' }),
    ).toBeInTheDocument()
  })
})
