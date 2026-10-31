import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AuditEntry } from '../../api/audit'
import {
  NOTES_GET,
  NOTES_POST,
  REJECTED_STATUS,
  STADIUM_DETAIL_FIELDS,
  STADIUM_LIST_FIELDS,
  type StadiumDetail,
  type StadiumNote,
  type StadiumRow,
} from '../../api/stadiums'
import { LEGAL_DETAILS_GET, LEGAL_DETAILS_PUT, type OwnerLegalDetails } from '../../api/users'
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

const pending: StadiumRow = {
  id: 's1',
  name: 'Chilonzor Arena',
  address: 'Chilonzor tumani, Bunyodkor 12',
  district: 'Chilonzor',
  photoUrl: 'https://cdn.example/s1.jpg',
  // The owner's 150 000 so'm; players pay 155 000; the owner receives 152 675.
  pricePerHour: 15_000_000,
  playerPrice: 15_500_000,
  ownerReceives: 15_267_500,
  atmosFee: 232_500,
  ownerContractStatus: 'signed',
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
const sergeli: StadiumRow = {
  ...pending,
  id: 's2',
  name: 'Sergeli Sport',
  address: 'Sergeli tumani, 5',
  district: 'Sergeli',
  ownerName: 'Bobur Nazarov',
  ownerId: 'o2',
  ownerContractStatus: 'pending',
  format: '7x7',
}
const approved: StadiumRow = { ...pending, id: 's3', name: 'Uchtepa Futsal', status: 'approved' }
const blocked: StadiumRow = {
  ...pending,
  id: 's4',
  name: 'Sergeli Stadion',
  status: 'blocked',
  statusReason: 'Koʻp shikoyatlar',
}
const rejected: StadiumRow = {
  ...pending,
  id: 's5',
  name: 'Qoʻyliq Mini Futbol',
  status: 'rejected',
  statusReason: 'Rasmlar mos emas',
}

const detail: StadiumDetail = {
  ...pending,
  phone: '+998 71 200 00 00',
  latitude: 41.28,
  longitude: 69.2,
  openTime: '08:00:00',
  closeTime: '23:00:00',
  photos: [{ id: 'p1', url: 'https://cdn.example/s1.jpg', position: 0 }],
  amenities: {
    parking: true,
    lighting: true,
    showers: false,
    lockerRoom: true,
    wifi: false,
    cafe: false,
    equipmentRental: false,
    tribune: false,
  },
  minBookingAmount: 5_000_000,
  playerMinBookingAmount: 5_500_000,
  cancellationHours: 24,
  pricingRules: [
    {
      id: 'r1',
      dayOfWeek: 5,
      startTime: '18:00:00',
      endTime: '23:00:00',
      pricePerHour: 25_000_000,
      playerPrice: 25_500_000,
    },
  ],
}

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

const signed: OwnerLegalDetails = {
  legalType: 'mchj',
  tin: '305678912',
  atmosContractStatus: 'signed',
  atmosRecipientId: '10428',
  updatedAt: '2026-10-20T10:00:00Z',
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

const note: StadiumNote = {
  id: 'n1',
  text: '28.10 qoʻngʻiroq qilindi',
  authorId: 'u1',
  authorName: 'Aziz Rahimov',
  createdAt: '2026-10-28T06:00:00Z',
}

function listReply(request: Request): Reply {
  const { searchParams } = request.url
  const status = searchParams.get('status')
  const format = searchParams.get('format')
  const district = searchParams.get('district')
  // The backend filters; the mock answers as it would.
  const all = [pending, sergeli, approved, blocked, rejected].filter(
    (s) =>
      (!status || s.status === status) &&
      (!format || s.format === format) &&
      (!district || s.district === district),
  )
  return [200, page(all)]
}

function backend(extra: Record<string, Reply | ((r: Request) => Reply)> = {}) {
  return mockBackend({
    '/api/admin/stats': [200, stats],
    '/api/admin/stadiums': listReply,
    '/api/admin/stadiums/s1': [200, detail],
    '/api/admin/stadiums/s4': [200, blocked],
    '/api/admin/stadiums/s5': [200, rejected],
    '/api/admin/stadiums/s1/notes': [200, [note]],
    '/api/admin/stadiums/s4/notes': [200, []],
    '/api/admin/stadiums/s5/notes': [200, []],
    '/api/admin/users/o1': [200, owner],
    '/api/admin/users/o1/legal-details': [200, signed],
    '/api/admin/audit-log': (request) =>
      request.url.searchParams.get('entityId') === 's4'
        ? [200, page([blockEntry])]
        : [200, page([])],
    ...extra,
  })
}

const lastList = (requests: Request[]) =>
  requests.filter((r) => r.url.pathname === '/api/admin/stadiums').at(-1)!.url.searchParams

describe('Maydonlar — list', () => {
  useAdminTestSetup()

  it('opens on the pending tab with the review columns from the backend', async () => {
    const { requests } = backend()
    signIn()
    renderAt('/maydonlar')
    expect(await screen.findByText('Chilonzor Arena', { selector: 'span' })).toBeInTheDocument()
    expect(lastList(requests).get('status')).toBe('pending')
    expect(screen.getByRole('tab', { name: /Kutilmoqda/ })).toHaveAttribute('aria-selected', 'true')
    const table = within(screen.getByRole('table'))
    for (const header of ['Tuman', 'Egasining narxi', 'Oʻyinchilar uchun', 'ATMOS']) {
      expect(table.getByText(header)).toBeInTheDocument()
    }
    expect(table.getAllByText('Chilonzor').length).toBeGreaterThan(0)
    expect(table.getAllByText("150 000 so'm")).toHaveLength(2)
    expect(table.getAllByText("155 000 so'm")).toHaveLength(2)
    expect(table.getByText('Imzolangan')).toBeInTheDocument()
    expect(table.getByText('Kutilmoqda')).toBeInTheDocument()
    expect(table.getByText('5×5')).toBeInTheDocument()
    expect(table.getAllByText('1 kun oldin')).toHaveLength(2)
    expect(table.queryByText('Holat')).not.toBeInTheDocument()
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

  it('asks the backend for the rejected stadiums', async () => {
    const { requests } = backend()
    signIn()
    renderAt('/maydonlar?holat=rejected')
    expect(await screen.findByText('Qoʻyliq Mini Futbol', { selector: 'span' })).toBeInTheDocument()
    expect(lastList(requests).get('status')).toBe('rejected')
  })

  it('sends the search, district and format to the backend', async () => {
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

  it('while R9 is missing: no review columns, Tuman and Format disabled "Tez orada"', async () => {
    markMissing(STADIUM_LIST_FIELDS)
    backend()
    signIn()
    renderAt('/maydonlar?tuman=Chilonzor')
    await screen.findByText('Chilonzor Arena', { selector: 'span' })
    const table = within(screen.getByRole('table'))
    for (const header of ['Tuman', 'Egasining narxi', 'Oʻyinchilar uchun', 'ATMOS']) {
      expect(table.queryByText(header)).not.toBeInTheDocument()
    }
    expect(screen.queryByLabelText('Tuman')).not.toBeInTheDocument()
    expect(screen.getByText('Tuman: Barchasi').closest('[title]')).toHaveAttribute(
      'title',
      'Tez orada',
    )
    expect(screen.getByText('Format: Barchasi').closest('[title]')).toHaveAttribute(
      'title',
      'Tez orada',
    )
    expect(document.querySelector('img')).toBeNull()
  })

  it('while R10 is missing: the Rad etilgan tab says "Tez orada" and asks nothing', async () => {
    markMissing(REJECTED_STATUS)
    const { requests } = backend()
    signIn()
    renderAt('/maydonlar?holat=rejected')
    expect(await screen.findByText('Tez orada')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(requests.some((r) => r.url.pathname === '/api/admin/stadiums')).toBe(false)
  })
})

describe('Maydonlar — detail', () => {
  useAdminTestSetup()

  it('shows the stadium from the backend: details, owner, terms, contract and notes', async () => {
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
      expect.stringContaining('mlat=41.28'),
    )
    expect(screen.getByRole('img', { name: 'Chilonzor Arena — 1-rasm' })).toBeInTheDocument()
    const info = within(screen.getByRole('region', { name: 'Maʼlumotlar' }))
    expect(info.getByText('Chilonzor')).toBeInTheDocument()
    expect(info.getByText('+998 71 200 00 00')).toBeInTheDocument()
    expect(info.getByText('08:00–23:00')).toBeInTheDocument()
    expect(info.getByText('Avtoturargoh')).toBeInTheDocument()
    expect(info.queryByText('Dush')).not.toBeInTheDocument()

    const prices = within(screen.getByRole('region', { name: 'Narxlar' }))
    // The admin sees the full breakdown, every figure from the backend.
    const priceRow = (label: string) => prices.getByText(label, { selector: 'dt' }).closest('div')!
    expect(priceRow('Egasining narxi')).toHaveTextContent("150 000 so'm/soat")
    expect(priceRow('Oʻyinchilar uchun')).toHaveTextContent("155 000 so'm/soat")
    expect(priceRow('Egasiga tushadi')).toHaveTextContent("152 675 so'm/soat")
    expect(priceRow('ATMOS komissiyasi')).toHaveTextContent("2 325 so'm/soat")
    // A pricing rule shows both prices.
    const rule = prices.getByText(/18:00–23:00/).closest('tr')!
    expect(rule).toHaveTextContent("250 000 so'm")
    expect(rule).toHaveTextContent("255 000 so'm")
    const terms = within(screen.getByRole('region', { name: 'Bron shartlari' }))
    expect(terms.getByText("Egasining: 50 000 so'm")).toBeInTheDocument()
    expect(terms.getByText("Oʻyinchilar uchun: 55 000 so'm")).toBeInTheDocument()
    expect(terms.getByText('Boshlanishidan 24 soat oldingacha')).toBeInTheDocument()

    const phone = await screen.findByRole('link', { name: /\+998 90 123 45 67/ })
    expect(phone).toHaveAttribute('href', 'tel:+998901234567')
    expect(screen.getByText('14 fevral 2026')).toBeInTheDocument()
    expect(screen.getByText('6 ta')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Foydalanuvchi sahifasi' })).toHaveAttribute(
      'href',
      '/foydalanuvchilar/o1',
    )
    expect(await screen.findByText('305678912')).toBeInTheDocument()
    expect(screen.getByText('Imzolangan')).toBeInTheDocument()
    expect(await screen.findByText('28.10 qoʻngʻiroq qilindi')).toBeInTheDocument()
    expect(screen.queryByText('Tez orada')).not.toBeInTheDocument()
  })

  it('approves after confirming, with the real status endpoint', async () => {
    const { requests } = backend({ 'PUT /api/admin/stadiums/s1/status': [200, approved] })
    signIn()
    renderAt('/maydonlar/s1')
    const approve = await screen.findByRole('button', { name: 'Tasdiqlash' })
    expect(approve).toBeEnabled()
    fireEvent.click(approve)
    const dialog = screen.getByRole('dialog', { name: 'Maydonni tasdiqlash' })
    expect(dialog).toHaveTextContent('Chilonzor Arena ilovada koʻrinadi')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tasdiqlash' }))
    expect(await screen.findByText('Maydon tasdiqlandi')).toBeInTheDocument()
    expect(requests.find((r) => r.method === 'PUT')?.body).toEqual({ status: 'approved' })
  })

  it('keeps Tasdiqlash disabled while the backend says the contract is not signed', async () => {
    backend({ '/api/admin/stadiums/s1': [200, { ...detail, ownerContractStatus: 'pending' }] })
    signIn()
    renderAt('/maydonlar/s1')
    expect(
      await screen.findByText('Egasining ATMOS shartnomasi imzolanmagan', { selector: 'p' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tasdiqlash' })).toBeDisabled()
    expect(screen.getByTitle('Egasining ATMOS shartnomasi imzolanmagan')).toBeInTheDocument()
  })

  it('shows the backend refusing an approval for an unsigned contract', async () => {
    backend({
      'PUT /api/admin/stadiums/s1/status': [400, "The owner's ATMOS contract is not signed"],
    })
    signIn()
    renderAt('/maydonlar/s1')
    fireEvent.click(await screen.findByRole('button', { name: 'Tasdiqlash' }))
    const dialog = screen.getByRole('dialog', { name: 'Maydonni tasdiqlash' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tasdiqlash' }))
    expect(await screen.findByText('Egasining ATMOS shartnomasi imzolanmagan')).toBeInTheDocument()
  })

  it('rejects with a reason, as the rejected status', async () => {
    const { requests } = backend({ 'PUT /api/admin/stadiums/s1/status': [200, rejected] })
    signIn()
    renderAt('/maydonlar/s1')
    fireEvent.click(await screen.findByRole('button', { name: 'Rad etish' }))
    const dialog = screen.getByRole('dialog', { name: 'Maydonni rad etish' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Manzil topilmadi' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rad etish' }))
    expect(await screen.findByText('Maydon rad etildi')).toBeInTheDocument()
    expect(requests.find((r) => r.method === 'PUT')?.body).toEqual({
      status: 'rejected',
      reason: 'Manzil topilmadi',
    })
  })

  it('shows who blocked it, when and why, and unblocks after confirming', async () => {
    const { requests } = backend({ 'PUT /api/admin/stadiums/s4/status': [200, approved] })
    signIn()
    renderAt('/maydonlar/s4')
    const panel = await screen.findByRole('region', { name: 'Qaror' })
    expect(within(panel).getByText('Koʻp shikoyatlar')).toBeInTheDocument()
    expect(await within(panel).findByText('18.10.2026 09:30')).toBeInTheDocument()
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

  it('shows a rejected stadium with its reason and no actions', async () => {
    backend()
    signIn()
    renderAt('/maydonlar/s5')
    const panel = await screen.findByRole('region', { name: 'Qaror' })
    expect(within(panel).getByText('Rad etilgan')).toBeInTheDocument()
    expect(within(panel).getByText('Rasmlar mos emas')).toBeInTheDocument()
    expect(within(panel).queryByRole('button')).not.toBeInTheDocument()
  })

  it('enters the owner details, validating STIR and the recipient id', async () => {
    const { requests } = backend({
      '/api/admin/users/o1/legal-details': [200, null],
      'PUT /api/admin/users/o1/legal-details': [200, signed],
    })
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
    expect(requests.some((r) => r.method === 'PUT')).toBe(false)

    fireEvent.change(within(dialog).getByLabelText(/STIR/), { target: { value: '305 678 912' } })
    fireEvent.change(within(dialog).getByLabelText(/qabul qiluvchi ID/), {
      target: { value: '10428' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Saqlash' }))
    expect(await screen.findByText('Maʼlumotlar saqlandi')).toBeInTheDocument()
    expect(requests.find((r) => r.method === 'PUT')?.body).toEqual({
      legalType: 'mchj',
      tin: '305678912',
      atmosContractStatus: 'signed',
      atmosRecipientId: '10428',
    })
  })

  it('takes the 14-digit JShShIR for a self-employed owner', async () => {
    backend({ '/api/admin/users/o1/legal-details': [200, null] })
    signIn()
    renderAt('/maydonlar/s1')
    fireEvent.click(await screen.findByRole('button', { name: 'Maʼlumotlarni kiritish' }))
    const dialog = screen.getByRole('dialog', { name: 'Egasi maʼlumotlari' })
    fireEvent.click(within(dialog).getByLabelText('Oʻzini oʻzi band qilgan'))
    fireEvent.change(within(dialog).getByLabelText(/JShShIR/), {
      target: { value: '305678912' },
    })
    fireEvent.click(within(dialog).getByLabelText('Yoʻq'))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Saqlash' }))
    expect(
      within(dialog).getByText('JShShIR 14 ta raqamdan iborat boʻlishi kerak'),
    ).toBeInTheDocument()
  })

  it('adds an internal note through the backend', async () => {
    const { requests } = backend({
      'POST /api/admin/stadiums/s1/notes': [
        200,
        { ...note, id: 'n2', text: 'Egasi bilan gaplashildi' },
      ],
    })
    signIn()
    renderAt('/maydonlar/s1')
    const notes = await screen.findByRole('region', { name: 'Ichki izohlar' })
    expect(within(notes).getByText('Faqat adminlar koʻradi')).toBeInTheDocument()
    fireEvent.change(within(notes).getByLabelText('Izoh'), {
      target: { value: 'Egasi bilan gaplashildi' },
    })
    fireEvent.click(within(notes).getByRole('button', { name: 'Izoh qoʻshish' }))
    expect(await screen.findByText('Izoh qoʻshildi')).toBeInTheDocument()
    expect(requests.find((r) => r.method === 'POST')?.body).toEqual({
      text: 'Egasi bilan gaplashildi',
    })
  })

  it('while R9, R11 and R12 are missing: real fields only, "Tez orada" sections, approve still possible', async () => {
    markMissing(STADIUM_DETAIL_FIELDS, LEGAL_DETAILS_GET, LEGAL_DETAILS_PUT, NOTES_GET, NOTES_POST)
    const { requests } = backend({
      '/api/admin/stadiums/s1': [200, { ...detail, ownerContractStatus: 'none' }],
    })
    signIn()
    renderAt('/maydonlar/s1')
    await screen.findByRole('heading', { level: 1, name: /Chilonzor Arena/ })
    for (const name of ['Rasmlar', 'Narxlar', 'Bron shartlari']) {
      expect(
        within(screen.getByRole('region', { name })).getByText('Tez orada'),
      ).toBeInTheDocument()
    }
    const info = within(screen.getByRole('region', { name: 'Maʼlumotlar' }))
    expect(info.getByText('Chilonzor tumani, Bunyodkor 12')).toBeInTheDocument()
    expect(info.queryByText('08:00–23:00')).not.toBeInTheDocument()
    expect(info.queryByText('Avtoturargoh')).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    const notes = within(screen.getByRole('region', { name: 'Ichki izohlar' }))
    expect(notes.getByText('Tez orada')).toBeInTheDocument()
    expect(notes.queryByRole('button')).not.toBeInTheDocument()
    // Approval is not held back by contract data that does not exist yet.
    expect(screen.getByRole('button', { name: 'Tasdiqlash' })).toBeEnabled()
    expect(requests.some((r) => r.url.pathname.endsWith('/legal-details'))).toBe(false)
    expect(requests.some((r) => r.url.pathname.endsWith('/notes'))).toBe(false)
  })

  it('says when the stadium does not exist', async () => {
    backend({ '/api/admin/stadiums/nope': [404, 'Stadium not found'] })
    signIn()
    renderAt('/maydonlar/nope')
    expect(await screen.findByText('Maydon topilmadi')).toBeInTheDocument()
  })
})
