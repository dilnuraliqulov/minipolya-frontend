import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OwnerStadium, OwnerStadiumDetail } from '../api/owner'
import { jsonResponse, makeUser, stubApi } from '../test/api'
import { readySession, renderApp } from '../test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
})

const session = readySession(makeUser({ isOwner: true }))
const listed: OwnerStadium = { id: 's1', name: 'Bunyodkor Arena', status: 'approved' }
const detail: OwnerStadiumDetail = {
  ...listed,
  openTime: '08:00:00',
  closeTime: '23:00:00',
  minBookingAmount: 5_000_000,
  playerMinBookingAmount: 5_500_000,
  cancellationPolicy: { cancellationHours: 24 },
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
  it('opens from Maydonim, prefilled, and saves whole hours', async () => {
    const api = stub({ 'PUT /api/owner/stadiums/s1': detail })
    const { router } = renderApp('/owner/stadium', { session })
    fireEvent.click(await screen.findByRole('button', { name: /Ish vaqti/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/owner/stadium/s1/hours'))
    expect(await screen.findByLabelText('Ochilish')).toHaveValue('08:00')
    fireEvent.change(screen.getByLabelText('Yopilish'), { target: { value: '22:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    await waitFor(() =>
      expect(api.calls('PUT /api/owner/stadiums/s1')).toEqual([
        { openTime: '08:00:00', closeTime: '22:00:00' },
      ]),
    )
  })

  it('refuses a closing time before the opening time', async () => {
    stub()
    renderApp('/owner/stadium/s1/hours', { session })
    fireEvent.change(await screen.findByLabelText('Yopilish'), { target: { value: '07:00' } })
    expect(screen.getByText('Yopilish vaqti ochilishdan keyin boʻlishi kerak.')).toBeInTheDocument()
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
    expect(await screen.findByLabelText('Ochilish')).toBeInTheDocument()
  })
})

describe('Maydonim — Bron shartlari', () => {
  it('shows the saved minimum and what players pay, from the API', async () => {
    stub()
    renderApp('/owner/stadium/s1/terms', { session })
    expect(await screen.findByLabelText('Oldindan toʻlov (soʻm, ixtiyoriy)')).toHaveValue('50000')
    expect(screen.getByText('Oʻyinchilar uchun: 55 000 soʻm')).toBeInTheDocument()
    expect(screen.getByText('24 soat')).toBeInTheDocument()
  })

  it('"Minimum yoʻq" clears the minimum, with the cancellation hours', async () => {
    const api = stub({ 'PUT /api/owner/stadiums/s1': detail })
    renderApp('/owner/stadium/s1/terms', { session })
    fireEvent.click(await screen.findByRole('switch', { name: 'Oldindan toʻlov' }))
    expect(screen.getByText(/Minimum yoʻq/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bir soat koʻproq' }))
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    await waitFor(() =>
      expect(api.calls('PUT /api/owner/stadiums/s1')).toEqual([
        { clearMinBookingAmount: true, cancellationHours: 25 },
      ]),
    )
  })

  it('sends a new minimum in tiyin and shows the floor error', async () => {
    const api = stub({
      'PUT /api/owner/stadiums/s1': jsonResponse(
        400,
        null,
        "minBookingAmount must be at least 50000 tiyin (500 so'm)",
      ),
    })
    renderApp('/owner/stadium/s1/terms', { session })
    fireEvent.change(await screen.findByLabelText('Oldindan toʻlov (soʻm, ixtiyoriy)'), {
      target: { value: '300' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    expect(
      await screen.findByText('Oldindan toʻlov kamida 500 soʻm boʻlishi kerak.'),
    ).toBeInTheDocument()
    expect(api.calls('PUT /api/owner/stadiums/s1')).toEqual([
      { minBookingAmount: 30_000, cancellationHours: 24 },
    ])
  })

  it('starts with "Minimum yoʻq" when no minimum is set', async () => {
    stub({ 'GET /api/owner/stadiums/s1': { ...detail, minBookingAmount: undefined } })
    renderApp('/owner/stadium/s1/terms', { session })
    expect(await screen.findByRole('switch', { name: 'Oldindan toʻlov' })).not.toBeChecked()
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
  })

  it('makes a photo the cover by reordering', async () => {
    const api = stub({ 'PUT /api/owner/stadiums/s1/photos/order': [] })
    renderApp('/owner/stadium/s1/photos', { session })
    fireEvent.click(await screen.findByRole('button', { name: 'Muqova qilish' }))
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

  it('uploads a picked file as multipart', async () => {
    const fetchMock = stub({
      'POST /api/owner/stadiums/s1/photos': { id: 'p3', url: '/x.jpg', position: 2 },
    })
    renderApp('/owner/stadium/s1/photos', { session })
    await screen.findByText('Muqova')
    const file = new File(['x'], 'pitch.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [file] } })
    expect(await screen.findByText('Rasm yuklandi')).toBeInTheDocument()
    const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    const init = call?.[1]
    expect(init?.body).toBeInstanceOf(FormData)
    expect((init?.body as FormData).get('file')).toBe(file)
    expect((init?.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })

  it('maps an unsupported image to its message', async () => {
    stub({
      'POST /api/owner/stadiums/s1/photos': jsonResponse(400, null, 'Unsupported image type'),
    })
    renderApp('/owner/stadium/s1/photos', { session })
    await screen.findByText('Muqova')
    const file = new File(['x'], 'a.gif', { type: 'image/gif' })
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [file] } })
    expect(
      await screen.findByText('Faqat JPG, PNG yoki WebP rasm yuklash mumkin.'),
    ).toBeInTheDocument()
  })

  it('refuses a file over 10 MB without uploading', async () => {
    const api = stub()
    renderApp('/owner/stadium/s1/photos', { session })
    await screen.findByText('Muqova')
    const big = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 })
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [big] } })
    expect(
      await screen.findByText('Rasm juda katta — 5 MB gacha boʻlishi kerak.'),
    ).toBeInTheDocument()
    expect(api.calls('POST /api/owner/stadiums/s1/photos')).toHaveLength(0)
  })

  it('shows the empty state with no photos', async () => {
    stub({ 'GET /api/owner/stadiums/s1': { ...detail, photos: [] } })
    renderApp('/owner/stadium/s1/photos', { session })
    expect(await screen.findByText('Hozircha rasm yoʻq')).toBeInTheDocument()
    expect(within(document.body).getByRole('button', { name: 'Rasm yuklash' })).toBeEnabled()
  })
})
