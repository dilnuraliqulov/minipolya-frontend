import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installFakeXhr } from '../../test/fakeXhr'
import type { OwnerStadium, OwnerStadiumDetail } from '../api/owner'
import { jsonResponse, makeUser, stubApi } from '../test/api'
import { readySession, renderApp } from '../test/renderApp'
import { NO_AMENITIES } from '../stadiums/facilities'

// Leaflet needs a real layout: a stand-in map that "taps" a point in Tashkent.
vi.mock('../components/LocationMap', () => ({
  default: ({ onPick }: { onPick: (p: { lat: number; lon: number }) => void }) => (
    <button type="button" onClick={() => onPick({ lat: 41.31, lon: 69.28 })}>
      tap-map
    </button>
  ),
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

const session = readySession(makeUser({ isOwner: true }))
const listed: OwnerStadium = { id: 's1', name: 'Bunyodkor Arena', status: 'approved' }
const detail: OwnerStadiumDetail = {
  ...listed,
  address: 'Bunyodkor koʻchasi 12',
  district: 'Chilonzor',
  format: '7x7',
  surfaceType: 'artificial',
  phone: '+998901234567',
  latitude: 41.2995,
  longitude: 69.2401,
  description: 'Kirish orqa tomonda',
  amenities: { ...NO_AMENITIES, parking: true, wifi: true },
  openTime: '08:00:00',
  closeTime: '23:00:00',
  minBookingAmount: 5_000_000,
  playerMinBookingAmount: 5_500_000,
  cancellationPolicy: { cancellationHours: 12 },
  photos: [
    { id: 'p2', url: '/api/uploads/stadiums/s1/b.jpg', position: 1 },
    { id: 'p1', url: '/api/uploads/stadiums/s1/a.jpg', position: 0 },
  ],
}

function stub(routes: Record<string, unknown> = {}) {
  return stubApi({
    'GET /api/owner/stadiums': [listed],
    'GET /api/owner/stadiums/s1': detail,
    ...routes,
  } as Parameters<typeof stubApi>[0])
}

describe('Maydonim — Ish vaqti', () => {
  it('opens from Maydonim, prefilled, and saves whole hours with the steppers', async () => {
    const api = stub({ 'PUT /api/owner/stadiums/s1': detail })
    const { router } = renderApp('/owner/stadium', { session })
    fireEvent.click(await screen.findByRole('button', { name: /Ish vaqti/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/owner/stadium/s1/hours'))
    const open = await screen.findByRole('group', { name: 'Ochilish' })
    expect(within(open).getByText('08:00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Yopilish: bir soat oldin' }))
    expect(screen.getByText('Har kuni 08:00 – 22:00 · 14 soat')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    await waitFor(() =>
      expect(api.calls('PUT /api/owner/stadiums/s1')).toEqual([
        { openTime: '08:00:00', closeTime: '22:00:00' },
      ]),
    )
  })

  it('refuses a closing time not after the opening time (no closing after midnight)', async () => {
    stub({ 'GET /api/owner/stadiums/s1': { ...detail, openTime: '22:00:00' } })
    renderApp('/owner/stadium/s1/hours', { session })
    expect(await screen.findByRole('button', { name: 'Yopilish: bir soat keyin' })).toBeDisabled()
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Yopilish: bir soat oldin' }))
    }
    expect(screen.getByRole('alert')).toHaveTextContent(/Yarim tundan keyin yopilish/)
    expect(screen.getByRole('button', { name: 'Saqlash' })).toBeDisabled()
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stub({
      'GET /api/owner/stadiums/s1': () =>
        fail ? jsonResponse(403, null, 'You do not own this stadium') : detail,
    })
    renderApp('/owner/stadium/s1/hours', { session })
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByRole('group', { name: 'Ochilish' })).toBeInTheDocument()
  })
})

describe('Maydonim — Bron shartlari (read-only)', () => {
  it('shows the minimum, what players pay and the cancellation hours, with no way to edit', async () => {
    stub()
    renderApp('/owner/stadium/s1/terms', { session })
    expect(await screen.findByText('50 000 soʻm')).toBeInTheDocument()
    expect(screen.getByText('Oʻyinchilar uchun: 55 000 soʻm')).toBeInTheDocument()
    expect(screen.getByText('Boshlanishiga 12 soat qolguncha')).toBeInTheDocument()
    expect(screen.getByText('Platforma bilan kelishilgan')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('switch')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Saqlash' })).toBeNull()
  })

  it('says "Platforma standarti" with no minimum of its own, and 24 h when the API sends no policy', async () => {
    stub({
      'GET /api/owner/stadiums/s1': {
        ...detail,
        minBookingAmount: undefined,
        playerMinBookingAmount: 5_500_000,
        cancellationPolicy: undefined,
      },
    })
    renderApp('/owner/stadium/s1/terms', { session })
    expect(await screen.findByText('Platforma standarti')).toBeInTheDocument()
    expect(screen.getByText('Oʻyinchilar uchun: 55 000 soʻm')).toBeInTheDocument()
    expect(screen.queryByText('Toʻliq toʻlov')).toBeNull()
    expect(screen.getByText('Boshlanishiga 24 soat qolguncha')).toBeInTheDocument()
  })
})

describe('Maydonim — Maʼlumotlar', () => {
  it('edits name, phone, the pin and Moʻljal, with the save button in the bottom bar', async () => {
    const api = stub({ 'PUT /api/owner/stadiums/s1': detail })
    renderApp('/owner/stadium/s1/info', { session })
    fireEvent.change(await screen.findByLabelText('Maydon nomi'), {
      target: { value: 'Bunyodkor Arena 2' },
    })
    expect(screen.getByText('41.29950, 69.24010')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'tap-map' }))
    expect(screen.getByText('41.31000, 69.28000')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Moʻljal (ixtiyoriy)'), {
      target: { value: 'Novza metro yonida' },
    })
    fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '+998 91 765 43 21' } })
    const save = screen.getByRole('button', { name: 'Saqlash' })
    expect(save.closest('main')).toBeNull()
    fireEvent.click(save)
    expect(await screen.findByText('Saqlandi')).toBeInTheDocument()
    expect(api.calls('PUT /api/owner/stadiums/s1')).toEqual([
      {
        name: 'Bunyodkor Arena 2',
        address: 'Bunyodkor koʻchasi 12',
        format: '7x7',
        surfaceType: 'artificial',
        district: 'Chilonzor',
        phone: '+998917654321',
        landmark: 'Novza metro yonida',
        latitude: 41.31,
        longitude: 69.28,
      },
    ])
  })

  it('checks the rules before saving', async () => {
    const api = stub()
    renderApp('/owner/stadium/s1/info', { session })
    fireEvent.change(await screen.findByLabelText('Maydon nomi'), { target: { value: 'ab' } })
    fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '+998 90 12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    expect(screen.getByText('Nomi 3 dan 150 belgigacha boʻlsin')).toBeInTheDocument()
    expect(
      screen.getByText('Raqamni toʻliq kiriting, masalan: +998 90 123 45 67'),
    ).toBeInTheDocument()
    expect(api.calls('PUT /api/owner/stadiums/s1')).toEqual([])
  })

  it('reads a pasted Google Maps link, and asks for the full link for a short one', async () => {
    stub()
    renderApp('/owner/stadium/s1/info', { session })
    const link = await screen.findByLabelText('Xarita havolasi')
    fireEvent.change(link, { target: { value: 'https://maps.app.goo.gl/abc' } })
    expect(screen.getByText('Toʻliq havolani qoʻying yoki xaritada belgilang')).toBeInTheDocument()
    fireEvent.change(link, { target: { value: 'https://www.google.com/maps/@41.33,69.3,17z' } })
    expect(screen.getByText('41.33000, 69.30000')).toBeInTheDocument()
    fireEvent.change(link, { target: { value: 'https://www.google.com/maps/@55.75,37.6,17z' } })
    expect(screen.getByText('Joy Oʻzbekiston hududida boʻlishi kerak')).toBeInTheDocument()
    expect(screen.getByText('41.33000, 69.30000')).toBeInTheDocument()
  })

  it('maps the backend rule to its text', async () => {
    stub({
      'PUT /api/owner/stadiums/s1': jsonResponse(400, null, 'Location must be inside Uzbekistan'),
    })
    renderApp('/owner/stadium/s1/info', { session })
    fireEvent.click(await screen.findByRole('button', { name: 'Saqlash' }))
    expect(await screen.findByText('Joy Oʻzbekiston hududida boʻlishi kerak.')).toBeInTheDocument()
  })
})

describe('Maydonim — Qulayliklar', () => {
  it('toggles facilities and sends all twelve flags, keeping wifi', async () => {
    const api = stub({ 'PUT /api/owner/stadiums/s1': detail })
    const { router } = renderApp('/owner/stadium', { session })
    fireEvent.click(await screen.findByRole('button', { name: /Qulayliklar/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/owner/stadium/s1/facilities'))
    const parking = await screen.findByRole('button', { name: 'Avtoturargoh' })
    expect(parking).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Wi-Fi' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Hojatxona' }))
    expect(screen.getByText('19/500')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    await waitFor(() =>
      expect(api.calls('PUT /api/owner/stadiums/s1')).toEqual([
        {
          amenities: { ...NO_AMENITIES, parking: true, wifi: true, toilet: true },
          description: 'Kirish orqa tomonda',
        },
      ]),
    )
  })
})

describe('Maydonim — Rasmlar', () => {
  it('lists photos by position with the first as the cover', async () => {
    stub()
    renderApp('/owner/stadium/s1/photos', { session })
    const images = await screen.findAllByRole('img', { name: /-rasm$/ })
    expect(images.map((img) => img.getAttribute('src'))).toEqual([
      `${window.location.origin}/api/uploads/stadiums/s1/a.jpg`,
      `${window.location.origin}/api/uploads/stadiums/s1/b.jpg`,
    ])
    expect(screen.getByText('Muqova')).toBeInTheDocument()
    expect(screen.getByText('2/10')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Kamida 3 ta rasm qoʻshing')
  })

  it('makes a photo the cover by reordering', async () => {
    const api = stub({ 'PUT /api/owner/stadiums/s1/photos/order': [] })
    renderApp('/owner/stadium/s1/photos', { session })
    fireEvent.click(await screen.findByRole('button', { name: '2-rasmni muqova qilish' }))
    await waitFor(() =>
      expect(api.calls('PUT /api/owner/stadiums/s1/photos/order')).toEqual([
        { photoIds: ['p2', 'p1'] },
      ]),
    )
  })

  it('deletes a photo', async () => {
    const api = stub({ 'DELETE /api/owner/stadiums/s1/photos/p1': null })
    renderApp('/owner/stadium/s1/photos', { session })
    fireEvent.click(await screen.findByRole('button', { name: '1-rasmni oʻchirish' }))
    expect(await screen.findByText('Rasm oʻchirildi')).toBeInTheDocument()
    expect(api.calls('DELETE /api/owner/stadiums/s1/photos/p1')).toHaveLength(1)
  })

  it('uploads a picked photo as multipart with progress, then refreshes', async () => {
    const api = stub()
    let release: () => void = () => {}
    const { requests } = installFakeXhr(
      (request) =>
        new Promise((resolve) => {
          request.progress(0.4)
          release = () => resolve({ data: { id: 'p3', url: '/x.jpg', position: 2 } })
        }),
    )
    renderApp('/owner/stadium/s1/photos', { session })
    await screen.findByText('Muqova')
    const file = new File(['x'], 'pitch.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [file] } })
    expect(await screen.findByText('40%')).toBeInTheDocument()
    expect(requests[0]?.url).toBe(`${window.location.origin}/api/owner/stadiums/s1/photos`)
    expect((requests[0]?.body as FormData).get('file')).toBeInstanceOf(File)
    release()
    expect(await screen.findByText('Rasm yuklandi')).toBeInTheDocument()
    expect(api.calls('GET /api/owner/stadiums/s1').length).toBeGreaterThan(1)
  })

  it('shows a failed upload with its reason and retries only that photo', async () => {
    stub()
    let attempt = 0
    const { requests } = installFakeXhr(() =>
      ++attempt === 1
        ? { status: 400, message: 'Unsupported image type' }
        : { data: { id: 'p3', url: '/x.jpg', position: 2 } },
    )
    renderApp('/owner/stadium/s1/photos', { session })
    await screen.findByText('Muqova')
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [file] } })
    expect(
      await screen.findByText('Faqat JPG, PNG yoki WebP rasm yuklash mumkin.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '3-rasmni qayta yuklash' }))
    expect(await screen.findByText('Rasm yuklandi')).toBeInTheDocument()
    expect(requests).toHaveLength(2)
  })

  it('refuses a non-image and a file over 5 MB without uploading', async () => {
    stub()
    const { requests } = installFakeXhr(() => ({ data: null }))
    renderApp('/owner/stadium/s1/photos', { session })
    await screen.findByText('Muqova')
    const pdf = new File(['x'], 'menu.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [pdf] } })
    expect(await screen.findByText('Bu fayl rasm emas')).toBeInTheDocument()
    const big = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 })
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [big] } })
    expect(await screen.findByText('Rasm 5 MB dan katta')).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })

  it('refuses more than 10 photos', async () => {
    stub()
    installFakeXhr(() => new Promise(() => {}))
    renderApp('/owner/stadium/s1/photos', { session })
    await screen.findByText('Muqova')
    const files = Array.from(
      { length: 9 },
      (_, i) => new File(['x'], `${i}.jpg`, { type: 'image/jpeg' }),
    )
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files } })
    expect(await screen.findByText('Koʻpi bilan 10 ta rasm')).toBeInTheDocument()
    expect(await screen.findByText('10/10')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rasm qoʻshish' })).toBeNull()
  })

  it('shows the empty state with no photos, and the add tile', async () => {
    stub({ 'GET /api/owner/stadiums/s1': { ...detail, photos: [] } })
    renderApp('/owner/stadium/s1/photos', { session })
    expect(await screen.findByText('Hozircha rasm yoʻq')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rasm qoʻshish' })).toBeEnabled()
  })
})
