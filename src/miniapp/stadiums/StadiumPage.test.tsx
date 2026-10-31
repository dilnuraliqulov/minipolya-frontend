import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, stubApi } from '../test/api'
import { installFakeTelegram, removeFakeTelegram } from '../test/fakeTelegram'
import { renderApp } from '../test/renderApp'
import { makeDetail, makeReview, page } from '../test/stadiums'

// Leaflet needs a real layout; the map itself is checked by eye.
vi.mock('./StadiumMap', () => ({ StadiumMap: () => <div data-testid="map" /> }))

afterEach(() => {
  vi.unstubAllGlobals()
  removeFakeTelegram()
})

const ID = '018f3a2c-0000-7000-8000-0000000000a1'
const DETAIL = `GET /api/stadiums/${ID}`
const REVIEWS = `GET /api/reviews/stadium/${ID}`
const AVAILABILITY = `GET /api/stadiums/${ID}/availability`

function stub(overrides: Record<string, unknown> = {}) {
  return stubApi({
    [DETAIL]: makeDetail(),
    [REVIEWS]: page([makeReview()]),
    [AVAILABILITY]: {
      stadiumId: ID,
      stadiumName: 'Bunyodkor Arena',
      date: '2026-11-01',
      slots: [],
    },
    ...overrides,
  })
}

describe('Maydon — the stadium page', () => {
  it('shows the photos, info, amenities the API reports, the map and the cancellation rule', async () => {
    stub()
    renderApp(`/stadiums/${ID}`)

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Bunyodkor Arena' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Maydon' })).toBeInTheDocument()
    expect(screen.getByText('Chilonzor tumani')).toBeInTheDocument()
    expect(screen.getByText('7×7')).toBeInTheDocument()
    expect(screen.getByText('Sunʼiy gazon')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()

    const amenities = screen.getByRole('list', { name: 'Qulayliklar' })
    expect(
      within(amenities)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Yoritish', 'Kiyinish xonasi', 'Avtoturargoh'])
    expect(screen.getByTestId('map')).toBeInTheDocument()
    expect(screen.getByText('Bunyodkor koʻchasi 12')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Oʻyin boshlanishiga 24 soat qolguncha bekor qilsangiz, toʻlangan pul toʻliq qaytariladi.',
      ),
    ).toBeInTheDocument()
  })

  it('states the rule with the hours this stadium sets', async () => {
    stub({ [DETAIL]: makeDetail({ cancellationPolicy: { cancellationHours: 6 } }) })
    renderApp(`/stadiums/${ID}`)
    expect(await screen.findByText(/boshlanishiga 6 soat qolguncha/)).toBeInTheDocument()
  })

  it('opens the map link from "Xaritada ochish"', async () => {
    const { webApp } = installFakeTelegram()
    stub()
    renderApp(`/stadiums/${ID}`)
    fireEvent.click(await screen.findByRole('button', { name: /Xaritada ochish/ }))
    expect(webApp.openLink).toHaveBeenCalledWith(
      'https://www.openstreetmap.org/?mlat=41.28&mlon=69.2#map=17/41.28/69.2',
    )
  })

  it('shows the latest reviews with the count; the average waits for R23', async () => {
    stub({
      [REVIEWS]: page([makeReview(), makeReview({ id: 'r2', userName: 'Dilshod K.', rating: 4 })], {
        totalPages: 2,
      }),
    })
    renderApp(`/stadiums/${ID}`)
    const reviews = await screen.findByRole('region', { name: 'Sharhlar' })
    expect(await within(reviews).findByText('Jasur A.')).toBeInTheDocument()
    expect(within(reviews).getByText('Dilshod K.')).toBeInTheDocument()
    expect(within(reviews).getAllByText('12-oktabr, 2026')).toHaveLength(2)
    expect(within(reviews).getByText('2 ta sharh')).toBeInTheDocument()
    expect(within(reviews).getByRole('link', { name: /Barcha sharhlar/ })).toHaveAttribute(
      'href',
      `/stadiums/${ID}/reviews`,
    )
  })

  it('says when there are no reviews yet', async () => {
    stub({ [REVIEWS]: page([]) })
    renderApp(`/stadiums/${ID}`)
    expect(await screen.findByText('Hali sharhlar yoʻq')).toBeInTheDocument()
  })

  it('toggles the favourite with POST /api/favorites/{id}/toggle', async () => {
    const api = stub({ [`POST /api/favorites/${ID}/toggle`]: { favorited: true } })
    renderApp(`/stadiums/${ID}`)
    const heart = await screen.findByRole('button', { name: 'Sevimlilarga qoʻshish' })
    expect(heart).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(heart)
    expect(
      await screen.findByRole('button', { name: 'Sevimlilardan olib tashlash' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(api.calls(`POST /api/favorites/${ID}/toggle`)).toHaveLength(1)
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stub({
      [DETAIL]: () => (fail ? jsonResponse(500, null, 'Internal server error') : makeDetail()),
    })
    renderApp(`/stadiums/${ID}`)
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Bunyodkor Arena' }),
    ).toBeInTheDocument()
  })

  it('says the stadium was not found on a 404', async () => {
    stub({ [DETAIL]: jsonResponse(404, null, 'Stadium not found') })
    renderApp(`/stadiums/${ID}`)
    expect(await screen.findByRole('heading', { name: 'Maydon topilmadi' })).toBeInTheDocument()
  })
})

describe('Sharhlar — all reviews', () => {
  it('lists the reviews and loads more', async () => {
    const api = stubApi({
      [REVIEWS]: () =>
        api.queries(REVIEWS).length === 1
          ? page([makeReview()], { totalPages: 2 })
          : page([makeReview({ id: 'r2', userName: 'Dilshod K.' })], { page: 1, totalPages: 2 }),
    })
    renderApp(`/stadiums/${ID}/reviews`)
    expect(await screen.findByText('Jasur A.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Yana koʻrsatish' }))
    expect(await screen.findByText('Dilshod K.')).toBeInTheDocument()
  })

  it('has an empty state', async () => {
    stubApi({ [REVIEWS]: page([]) })
    renderApp(`/stadiums/${ID}/reviews`)
    expect(await screen.findByRole('heading', { name: 'Hali sharhlar yoʻq' })).toBeInTheDocument()
  })
})
