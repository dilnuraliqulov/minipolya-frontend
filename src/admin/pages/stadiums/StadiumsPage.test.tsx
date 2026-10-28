import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AuditEntry } from '../../api/audit'
import type { AdminStadium } from '../../api/types'
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

const pending: AdminStadium = {
  id: 's1',
  name: 'Chilonzor Arena',
  address: 'Chilonzor tumani, Bunyodkor 12',
  ownerName: 'Jamshid Karimov',
  ownerId: 'o1',
  status: 'pending',
  format: '5x5',
  surfaceType: 'artificial',
  averageRating: 0,
  reviewCount: 0,
  totalBookings: 0,
  totalRevenue: 0,
  createdAt: new Date(Date.now() - 26 * 3_600_000).toISOString(),
}
const sergeli: AdminStadium = {
  ...pending,
  id: 's2',
  name: 'Sergeli Sport',
  address: 'Sergeli tumani, 5',
  ownerName: 'Bobur Nazarov',
  ownerId: 'o2',
  format: '7x7',
}
const approved: AdminStadium = { ...pending, id: 's3', name: 'Uchtepa Futsal', status: 'approved' }
const blocked: AdminStadium = { ...pending, id: 's4', name: 'Sergeli Stadion', status: 'blocked' }

const owner = {
  id: 'o1',
  name: 'Jamshid Karimov',
  phone: '+998 90 123 45 67',
  language: 'uz',
  isOwner: false,
  isAdmin: false,
  isBlocked: false,
  bookingCount: 6,
  stadiumCount: 1,
  createdAt: '2026-02-14T07:00:00Z',
}

const blockEntry: AuditEntry = {
  id: 'd1',
  time: '2026-10-18T04:30:00Z',
  actor: { id: 'u1', name: 'Aziz Rahimov', type: 'ADMIN' },
  action: 'STADIUM_BLOCKED',
  entity: { type: 'stadium', id: 's4', label: 'Sergeli Stadion' },
  changes: [{ field: 'status', oldValue: 'approved', newValue: 'blocked' }],
  reason: 'Koʻp shikoyatlar',
}

function listReply(request: Request): Reply {
  const status = request.url.searchParams.get('status')
  const all = [pending, sergeli, approved, blocked]
  return [200, page(all.filter((s) => !status || s.status === status))]
}

function backend(extra: Record<string, Reply | ((r: Request) => Reply)> = {}) {
  return mockBackend({
    '/api/admin/stats': [200, stats],
    '/api/admin/stadiums': listReply,
    '/api/admin/stadiums/s1': [200, pending],
    '/api/admin/stadiums/s4': [200, blocked],
    '/api/admin/users/o1': [200, owner],
    '/api/admin/audit-log': (request) =>
      request.url.searchParams.get('entityId') === 's4'
        ? [200, page([blockEntry])]
        : [200, page([])],
    ...extra,
  })
}

async function signedContract(status: 'signed' | 'pending' | null) {
  const adapter = await import('../../api/sample/adapter')
  vi.spyOn(adapter, 'ownerLegalDetails').mockResolvedValue(
    status && {
      legalType: 'mchj',
      tin: '305678912',
      atmosContractStatus: status,
      atmosRecipientId: status === 'signed' ? '10428' : undefined,
      updatedAt: '2026-10-20T10:00:00Z',
    },
  )
}

const lastList = (requests: Request[]) =>
  requests.filter((r) => r.url.pathname === '/api/admin/stadiums').at(-1)!.url.searchParams

describe('Maydonlar — list', () => {
  useAdminTestSetup()

  it('opens on the pending tab with sample columns tagged', async () => {
    const { requests } = backend()
    signIn()
    renderAt('/maydonlar')
    expect(await screen.findByText('Chilonzor Arena', { selector: 'span' })).toBeInTheDocument()
    expect(lastList(requests).get('status')).toBe('pending')
    expect(screen.getByRole('tab', { name: /Kutilmoqda/ })).toHaveAttribute('aria-selected', 'true')
    const table = screen.getByRole('table')
    for (const header of ['Tuman', 'Narx', 'ATMOS']) {
      expect(within(table).getByText(header).parentElement).toHaveTextContent('Namuna')
    }
    expect(within(table).getByText('5×5')).toBeInTheDocument()
    expect(within(table).getAllByText('1 kun oldin')).toHaveLength(2)
    expect(within(table).queryByText('Holat')).not.toBeInTheDocument()
  })

  it('changes tabs and columns: ATMOS only on Kutilmoqda, Holat only on Barchasi', async () => {
    const { requests } = backend()
    signIn()
    const router = renderAt('/maydonlar')
    await screen.findByText('Chilonzor Arena', { selector: 'span' })

    fireEvent.click(screen.getByRole('tab', { name: /Tasdiqlangan/ }))
    await waitFor(() => expect(lastList(requests).get('status')).toBe('approved'))
    expect(await screen.findByText('Uchtepa Futsal', { selector: 'span' })).toBeInTheDocument()
    expect(within(screen.getByRole('table')).queryByText('ATMOS')).not.toBeInTheDocument()
    expect(router.state.location.search).toBe('?holat=approved')

    fireEvent.click(screen.getByRole('tab', { name: /Barchasi/ }))
    await waitFor(() => expect(lastList(requests).has('status')).toBe(false))
    expect(await screen.findByText('Holat')).toBeInTheDocument()
    expect(screen.getByText('Bloklangan', { selector: 'span.rounded-full' })).toBeInTheDocument()
  })

  it('sends the search and narrows by district and format', async () => {
    const { requests } = backend()
    signIn()
    renderAt('/maydonlar')
    await screen.findByText('Chilonzor Arena', { selector: 'span' })

    fireEvent.change(screen.getByLabelText('Maydon yoki egasi boʻyicha qidirish'), {
      target: { value: 'Bobur' },
    })
    await waitFor(() => expect(lastList(requests).get('search')).toBe('Bobur'))

    fireEvent.change(screen.getByLabelText('Format'), { target: { value: '7x7' } })
    await waitFor(() => expect(lastList(requests).get('format')).toBe('7x7'))
    await waitFor(() =>
      expect(screen.queryByText('Chilonzor Arena', { selector: 'span' })).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Sergeli Sport', { selector: 'span' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Tuman'), { target: { value: 'Chilonzor' } })
    await waitFor(() => expect(lastList(requests).get('district')).toBe('Chilonzor'))
    expect(await screen.findByText('Hech narsa topilmadi')).toBeInTheDocument()
  })

  it('shows the sample rejected stadiums without asking the backend', async () => {
    const { requests } = backend()
    signIn()
    renderAt('/maydonlar?holat=rejected')
    expect(await screen.findByText('Qoʻyliq Mini Futbol', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText(/alohida holat yoʻq/)).toBeInTheDocument()
    expect(requests.some((r) => r.url.searchParams.get('status') === 'rejected')).toBe(false)
  })

  it('opens a stadium from its row', async () => {
    backend()
    signIn()
    const router = renderAt('/maydonlar')
    fireEvent.click(await screen.findByText('Chilonzor Arena', { selector: 'span' }))
    expect(router.state.location.pathname).toBe('/maydonlar/s1')
  })

  it('shows the empty and error states', async () => {
    let fail = false
    backend({
      '/api/admin/stadiums': () => (fail ? [500, 'boom'] : [200, page([])]),
    })
    signIn()
    renderAt('/maydonlar')
    expect(await screen.findByText('Kutilayotgan maydon yoʻq')).toBeInTheDocument()
    fail = true
    fireEvent.click(screen.getByRole('tab', { name: /Tasdiqlangan/ }))
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      'Maʼlumotlarni yuklab boʻlmadi',
    )
  })
})

describe('Maydonlar — detail', () => {
  useAdminTestSetup()

  it('shows the stadium, its owner with a phone link and sample sections tagged', async () => {
    await signedContract('signed')
    backend()
    signIn()
    renderAt('/maydonlar/s1')
    expect(
      await screen.findByRole('heading', { level: 1, name: /Chilonzor Arena/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('Kutilmoqda', { selector: 'span.rounded-full' })).toBeInTheDocument()
    expect(screen.getByText('Chilonzor tumani, Bunyodkor 12')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Xaritada ochish/ })).toHaveAttribute(
      'href',
      expect.stringContaining('openstreetmap.org'),
    )
    const phone = await screen.findByRole('link', { name: /\+998 90 123 45 67/ })
    expect(phone).toHaveAttribute('href', 'tel:+998901234567')
    expect(screen.getByText('14 fevral 2026')).toBeInTheDocument()
    expect(screen.getByText('6 ta')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Foydalanuvchi sahifasi' })).toHaveAttribute(
      'href',
      '/foydalanuvchilar/o1',
    )
    expect(
      within(screen.getByRole('region', { name: 'Narxlar' })).getByText('Namuna'),
    ).toBeInTheDocument()
    expect(await screen.findByText('305678912')).toBeInTheDocument()
    expect(screen.getByText('Imzolangan')).toBeInTheDocument()
  })

  it('approves after confirming, with the real status endpoint', async () => {
    await signedContract('signed')
    const { requests } = backend({ 'PUT /api/admin/stadiums/s1/status': [200, approved] })
    signIn()
    renderAt('/maydonlar/s1')
    const approve = await screen.findByRole('button', { name: 'Tasdiqlash' })
    await waitFor(() => expect(approve).toBeEnabled())
    fireEvent.click(approve)
    const dialog = screen.getByRole('dialog', { name: 'Maydonni tasdiqlash' })
    expect(dialog).toHaveTextContent('Chilonzor Arena ilovada koʻrinadi')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tasdiqlash' }))
    expect(await screen.findByText('Maydon tasdiqlandi')).toBeInTheDocument()
    expect(requests.find((r) => r.method === 'PUT')?.body).toEqual({ status: 'approved' })
  })

  it('keeps Tasdiqlash disabled until the ATMOS contract is signed', async () => {
    await signedContract('pending')
    backend()
    signIn()
    renderAt('/maydonlar/s1')
    expect(
      await screen.findByText('Egasining ATMOS shartnomasi imzolanmagan', { selector: 'p' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tasdiqlash' })).toBeDisabled()
    expect(screen.getByTitle('Egasining ATMOS shartnomasi imzolanmagan')).toBeInTheDocument()
  })

  it('rejects with a reason (sent as blocked until R10)', async () => {
    await signedContract('signed')
    const { requests } = backend({ 'PUT /api/admin/stadiums/s1/status': [200, blocked] })
    signIn()
    renderAt('/maydonlar/s1')
    fireEvent.click(await screen.findByRole('button', { name: 'Rad etish' }))
    const dialog = screen.getByRole('dialog', { name: 'Maydonni rad etish' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Manzil topilmadi' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rad etish' }))
    expect(await screen.findByText('Maydon rad etildi')).toBeInTheDocument()
    expect(requests.find((r) => r.method === 'PUT')?.body).toEqual({
      status: 'blocked',
      reason: 'Manzil topilmadi',
    })
  })

  it('shows who blocked it, when and why, and unblocks after confirming', async () => {
    const { requests } = backend({ 'PUT /api/admin/stadiums/s4/status': [200, approved] })
    signIn()
    renderAt('/maydonlar/s4')
    const panel = await screen.findByRole('region', { name: 'Qaror' })
    expect(await within(panel).findByText('Koʻp shikoyatlar')).toBeInTheDocument()
    expect(within(panel).getByText('18.10.2026 09:30')).toBeInTheDocument()
    expect(within(panel).getByText('Aziz Rahimov')).toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: 'Blokdan chiqarish' }))
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Blokdan chiqarish' })).getByRole('button', {
        name: 'Blokdan chiqarish',
      }),
    )
    expect(await screen.findByText('Maydon blokdan chiqarildi')).toBeInTheDocument()
    expect(requests.find((r) => r.method === 'PUT')?.body).toEqual({ status: 'approved' })
    // The history comes from the audit log for this stadium.
    const audit = requests.find((r) => r.url.searchParams.get('entityType') === 'stadium')
    expect(audit?.url.searchParams.get('entityId')).toBe('s4')
  })

  it('shows a rejection — a blocked stadium whose last decision was a rejection', async () => {
    backend({
      '/api/admin/audit-log': [
        200,
        page([{ ...blockEntry, action: 'STADIUM_REJECTED', reason: 'Rasmlar mos emas' }]),
      ],
    })
    signIn()
    renderAt('/maydonlar/s4')
    const panel = await screen.findByRole('region', { name: 'Qaror' })
    expect(await within(panel).findByText('Rad etilgan')).toBeInTheDocument()
    expect(within(panel).getByText('Rasmlar mos emas')).toBeInTheDocument()
    expect(within(panel).queryByRole('button')).not.toBeInTheDocument()
  })

  it('enters the owner details, validating STIR and the recipient id', async () => {
    await signedContract(null)
    const adapter = await import('../../api/sample/adapter')
    const save = vi.spyOn(adapter, 'saveOwnerLegalDetails')
    backend()
    signIn()
    renderAt('/maydonlar/s1')
    expect(await screen.findByText('Maʼlumotlar kiritilmagan')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Maʼlumotlarni kiritish' }))
    const dialog = screen.getByRole('dialog', { name: 'Egasi maʼlumotlari' })
    fireEvent.click(within(dialog).getByLabelText('MChJ'))
    fireEvent.change(within(dialog).getByLabelText(/STIR/), { target: { value: '12345' } })
    fireEvent.click(within(dialog).getByLabelText('Imzolangan'))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Saqlash' }))
    expect(within(dialog).getByText('STIR 9 ta raqamdan iborat boʻlishi kerak')).toBeInTheDocument()
    expect(within(dialog).getAllByText('«Imzolangan» holati uchun majburiy')).toHaveLength(1)
    expect(save).not.toHaveBeenCalled()

    fireEvent.change(within(dialog).getByLabelText(/STIR/), { target: { value: '305 678 912' } })
    fireEvent.change(within(dialog).getByLabelText(/qabul qiluvchi ID/), {
      target: { value: '10428' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Saqlash' }))
    expect(await screen.findByText('Maʼlumotlar saqlandi (namuna)')).toBeInTheDocument()
    expect(save).toHaveBeenCalledWith('o1', {
      legalType: 'mchj',
      tin: '305678912',
      atmosContractStatus: 'signed',
      atmosRecipientId: '10428',
    })
  })

  it('adds an internal note (sample)', async () => {
    backend()
    signIn()
    renderAt('/maydonlar/s1')
    const notes = await screen.findByRole('region', { name: 'Ichki izohlar' })
    expect(within(notes).getByText('Faqat adminlar koʻradi')).toBeInTheDocument()
    fireEvent.change(within(notes).getByLabelText('Izoh'), {
      target: { value: 'Egasi bilan gaplashildi' },
    })
    fireEvent.click(within(notes).getByRole('button', { name: 'Izoh qoʻshish' }))
    expect(await screen.findByText('Izoh qoʻshildi (namuna)')).toBeInTheDocument()
    expect(await within(notes).findByText('Egasi bilan gaplashildi')).toBeInTheDocument()
  })

  it('says when the stadium does not exist', async () => {
    backend({ '/api/admin/stadiums/nope': [404, 'Stadium not found'] })
    signIn()
    renderAt('/maydonlar/nope')
    expect(await screen.findByText('Maydon topilmadi')).toBeInTheDocument()
  })
})
