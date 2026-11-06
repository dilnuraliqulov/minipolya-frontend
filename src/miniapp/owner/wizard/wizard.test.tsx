import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installFakeXhr, type FakeXhrReply } from '../../../test/fakeXhr'
import { makeUser, stubApi } from '../../test/api'
import { installFakeTelegram, removeFakeTelegram } from '../../test/fakeTelegram'
import { readySession, renderApp } from '../../test/renderApp'
import { NO_AMENITIES } from '../../stadiums/facilities'

vi.mock('../../components/LocationMap', () => ({
  default: ({ onPick }: { onPick: (p: { lat: number; lon: number }) => void }) => (
    <button type="button" onClick={() => onPick({ lat: 41.2995, lon: 69.2401 })}>
      tap-map
    </button>
  ),
}))
vi.mock('../../stadiums/StadiumMap', () => ({ StadiumMap: () => <div data-testid="preview" /> }))

afterEach(() => {
  vi.unstubAllGlobals()
  removeFakeTelegram()
})

const owner = makeUser({ isOwner: true, phone: '+998901112233' })
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }))
const photo = (name: string) => new File(['x'], name, { type: 'image/jpeg' })

function stub(routes: Record<string, unknown> = {}) {
  return stubApi({
    'GET /api/users/me': owner,
    'GET /api/owner/stadiums': [],
    'POST /api/owner/stadiums': { id: 's9' },
    'PUT /api/owner/stadiums/s9/photos/order': [],
    ...routes,
  } as Parameters<typeof stubApi>[0])
}

async function fillBasics() {
  fireEvent.change(await screen.findByLabelText('Maydon nomi'), {
    target: { value: 'Chilonzor Sport Maydoni' },
  })
  fireEvent.click(screen.getByRole('radio', { name: '5×5' }))
  fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '+998 90 123 45 67' } })
  next()
}

async function fillLocation() {
  fireEvent.click(await screen.findByRole('button', { name: 'tap-map' }))
  fireEvent.click(screen.getByRole('button', { name: /Tuman/ }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('radio', { name: 'Chilonzor' }))
  fireEvent.change(screen.getByLabelText('Manzil'), { target: { value: 'Bunyodkor koʻchasi 12' } })
  fireEvent.change(screen.getByLabelText('Moʻljal (ixtiyoriy)'), {
    target: { value: 'Novza metro bekati yonida' },
  })
  next()
}

async function fillPhotos() {
  const input = await screen.findByTestId('photo-input')
  fireEvent.change(input, { target: { files: [photo('a.jpg'), photo('b.jpg'), photo('c.jpg')] } })
  expect(await screen.findByText('3/10')).toBeInTheDocument()
  next()
}

async function fillToReview() {
  await fillBasics()
  await fillLocation()
  await fillPhotos()
  fireEvent.click(await screen.findByRole('button', { name: 'Avtoturargoh' }))
  next()
  fireEvent.change(await screen.findByLabelText('Sizning narxingiz (1 soat)'), {
    target: { value: '150000' },
  })
  next()
  await screen.findByText('Hammasi toʻgʻrimi?')
}

describe('Maydon qoʻshish — the wizard', () => {
  it('checks every step before "Davom etish", in Uzbek', async () => {
    stub()
    renderApp('/owner/new', { session: readySession(owner) })
    expect(await screen.findByText('1/6 · Asosiy')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '+998 90 12' } })
    next()
    expect(screen.getByText('Nomi 3 dan 150 belgigacha boʻlsin')).toBeInTheDocument()
    expect(
      screen.getByText('Raqamni toʻliq kiriting, masalan: +998 90 123 45 67'),
    ).toBeInTheDocument()
    await fillBasics()

    expect(await screen.findByText('2/6 · Joylashuv')).toBeInTheDocument()
    next()
    expect(screen.getByText('Maydon joyini xaritada belgilang')).toBeInTheDocument()
    expect(screen.getByText('Tumanni tanlang', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('Manzil 5 dan 300 belgigacha boʻlsin')).toBeInTheDocument()
    await fillLocation()

    expect(await screen.findByText('3/6 · Rasmlar')).toBeInTheDocument()
    next()
    expect(screen.getByRole('alert')).toHaveTextContent('Kamida 3 ta rasm qoʻshing')
    await fillPhotos()

    expect(await screen.findByText('4/6 · Qulayliklar')).toBeInTheDocument()
    next()
    expect(await screen.findByText('5/6 · Ish vaqti va narx')).toBeInTheDocument()
    expect(
      screen.getByText('Oʻyinchilar karta toʻlovi hisobiga biroz yuqoriroq narxni koʻradi.'),
    ).toBeInTheDocument()
    next()
    expect(screen.getByText('Narx 10 000 dan 5 000 000 soʻmgacha boʻlsin')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Sizning narxingiz (1 soat)'), {
      target: { value: '5000001' },
    })
    expect(screen.getByLabelText('Sizning narxingiz (1 soat)')).toHaveValue('5 000 001')
    expect(screen.getByText('Narx 10 000 dan 5 000 000 soʻmgacha boʻlsin')).toBeInTheDocument()
  })

  it('keeps the draft going back and forth, also with Telegram’s BackButton', async () => {
    const telegram = installFakeTelegram()
    stub()
    renderApp('/owner/new', { session: readySession(owner) })
    await fillBasics()
    await screen.findByText('2/6 · Joylashuv')
    telegram.backButton.click()
    expect(await screen.findByText('1/6 · Asosiy')).toBeInTheDocument()
    expect(screen.getByLabelText('Maydon nomi')).toHaveValue('Chilonzor Sport Maydoni')
    expect(screen.getByRole('radio', { name: '5×5' })).toHaveAttribute('aria-checked', 'true')
    next()
    await fillLocation()
    await fillPhotos()
    await screen.findByText('4/6 · Qulayliklar')
    telegram.backButton.click()
    expect(await screen.findByText('3/10')).toBeInTheDocument()
  })

  it('reviews everything, and "Tahrirlash" goes back to that step', async () => {
    stub()
    renderApp('/owner/new', { session: readySession(owner) })
    await fillToReview()
    expect(screen.getByText('Chilonzor Sport Maydoni')).toBeInTheDocument()
    expect(screen.getByText('+998 90 123 45 67')).toBeInTheDocument()
    expect(screen.getByText('41.29950, 69.24010')).toBeInTheDocument()
    expect(await screen.findByTestId('preview')).toBeInTheDocument()
    expect(screen.getByText('Novza metro bekati yonida')).toBeInTheDocument()
    expect(screen.getByText('Rasmlar · 3')).toBeInTheDocument()
    expect(screen.getByText('Har kuni 08:00 – 23:00')).toBeInTheDocument()
    expect(screen.getByText('150 000 soʻm / soat')).toBeInTheDocument()
    expect(
      screen.getByText('Oldindan toʻlov va bekor qilish shartlari platforma bilan kelishiladi.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Asosiy — tahrirlash' }))
    expect(await screen.findByLabelText('Maydon nomi')).toHaveValue('Chilonzor Sport Maydoni')
  })

  it('creates once, uploads the photos one by one, retries a failed one, then "Arizangiz qabul qilindi"', async () => {
    const api = stub()
    let attempts = 0
    const { requests } = installFakeXhr((request): FakeXhrReply => {
      attempts += 1
      request.progress(0.5)
      // The second photo fails the first time.
      if (attempts === 2) return { status: 413, message: 'File too large' }
      return { data: { id: `photo-${attempts}`, url: '/x.jpg', position: attempts } }
    })
    renderApp('/owner/new', { session: readySession(owner) })
    await fillToReview()
    fireEvent.click(screen.getByRole('button', { name: 'Tekshiruvga yuborish' }))

    expect(await screen.findByText('Rasmlar yuklanmoqda')).toBeInTheDocument()
    expect(
      await screen.findByText('Rasm juda katta — 5 MB gacha boʻlishi kerak.'),
    ).toBeInTheDocument()
    expect(await screen.findByText('2/3 yuklandi')).toBeInTheDocument()
    expect(screen.getByText('1 ta xato')).toBeInTheDocument()
    expect(screen.queryByText('Arizangiz qabul qilindi')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '2-rasmni qayta yuklash' }))
    expect(await screen.findByText('Arizangiz qabul qilindi')).toBeInTheDocument()
    expect(screen.getByText('+998 90 ••• •• 33')).toBeInTheDocument()

    expect(api.calls('POST /api/owner/stadiums')).toEqual([
      {
        name: 'Chilonzor Sport Maydoni',
        format: '5x5',
        surfaceType: 'artificial',
        phone: '+998901234567',
        latitude: 41.2995,
        longitude: 69.2401,
        district: 'Chilonzor',
        address: 'Bunyodkor koʻchasi 12',
        landmark: 'Novza metro bekati yonida',
        amenities: { ...NO_AMENITIES, parking: true },
        openTime: '08:00:00',
        closeTime: '23:00:00',
        pricePerHour: 15_000_000,
      },
    ])
    expect(requests.map((r) => r.url)).toEqual(
      Array(4).fill(`${window.location.origin}/api/owner/stadiums/s9/photos`),
    )
    // The retry made photo 2 go last: the owner's order (cover first) is put back.
    await waitFor(() =>
      expect(api.calls('PUT /api/owner/stadiums/s9/photos/order')).toEqual([
        { photoIds: ['photo-1', 'photo-4', 'photo-3'] },
      ]),
    )
  })

  it('shows a create error on the review and creates only once on a second try', async () => {
    let fail = true
    const api = stub({
      'POST /api/owner/stadiums': () =>
        fail
          ? new Response(
              JSON.stringify({
                success: false,
                data: null,
                message: "pricePerHour must be between 10 000 and 5 000 000 so'm",
              }),
              { status: 400 },
            )
          : { id: 's9' },
    })
    installFakeXhr((): FakeXhrReply => ({ data: { id: 'p', url: '/x.jpg', position: 0 } }))
    renderApp('/owner/new', { session: readySession(owner) })
    await fillToReview()
    fireEvent.click(screen.getByRole('button', { name: 'Tekshiruvga yuborish' }))
    expect(
      await screen.findByText('Narx 10 000 dan 5 000 000 soʻmgacha boʻlishi kerak.'),
    ).toBeInTheDocument()
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Tekshiruvga yuborish' }))
    expect(await screen.findByText('Arizangiz qabul qilindi')).toBeInTheDocument()
    expect(api.calls('POST /api/owner/stadiums')).toHaveLength(2)
  })

  it('lets the owner leave while photos upload, without creating again', async () => {
    const api = stub()
    installFakeXhr(() => new Promise<FakeXhrReply>(() => {}))
    const { router } = renderApp('/owner/new', { session: readySession(owner) })
    await fillToReview()
    fireEvent.click(screen.getByRole('button', { name: 'Tekshiruvga yuborish' }))
    expect(
      await screen.findByText(
        'Chiqib ketsangiz ham boʻladi — qolgan rasmlarni Maydonim → Rasmlar boʻlimida yuklaysiz.',
      ),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Keyinroq tugatish' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/owner/stadium'))
    // Maydonim opens on the stadium just created, not the first one.
    expect(router.state.location.search).toBe('?stadium=s9')
    expect(api.calls('POST /api/owner/stadiums')).toHaveLength(1)
  })

  it('asks before throwing away a started draft', async () => {
    stub()
    renderApp('/owner/new', { session: readySession(owner) })
    fireEvent.change(await screen.findByLabelText('Maydon nomi'), { target: { value: 'Arena' } })
    fireEvent.click(screen.getByRole('button', { name: 'Orqaga' }))
    expect(await screen.findByText('Maydon qoʻshishni toʻxtatasizmi?')).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Davom etish' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByLabelText('Maydon nomi')).toHaveValue('Arena')
  })
})
