import { onlineManager } from '@tanstack/react-query'
import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, stubApi } from '../test/api'
import { renderApp } from '../test/renderApp'
import { makeStadium, page } from '../test/stadiums'
import { nextDate, tashkentToday } from './dates'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const LIST = 'GET /api/stadiums'
const BANNER = 'Toʻlov xavfsiz · Bekor qilish shartlari aniq'

describe('Bosh sahifa — the stadium list', () => {
  it('loads the first page and shows each card with ONE price per hour', async () => {
    const api = stubApi({ [LIST]: page([makeStadium()]) })
    renderApp('/')

    expect(screen.getByRole('status', { name: 'Yuklanmoqda' })).toBeInTheDocument()
    const card = await screen.findByRole('article', { name: 'Bunyodkor Arena' })
    expect(within(card).getByText('4.8')).toBeInTheDocument()
    expect(within(card).getByText('Chilonzor · 7×7 · Sunʼiy gazon')).toBeInTheDocument()
    expect(within(card).getByText('155 000 soʻm')).toBeInTheDocument()
    expect(within(card).getByText('/soat')).toBeInTheDocument()
    // One price, nothing else that looks like money.
    expect(within(card).getAllByText(/\d{3} \d{3}/)).toHaveLength(1)
    expect(within(card).queryByText(/komissiya|karta toʻlovi|xizmat haqi/i)).not.toBeInTheDocument()
    expect(api.queries(LIST)).toEqual([{ page: '0', size: '20' }])
  })

  it('renders search, date strip, banner, count header and compact cards', async () => {
    stubApi({ [LIST]: page([makeStadium()], { totalElements: 12 }) })
    renderApp('/')
    await screen.findByRole('article', { name: 'Bunyodkor Arena' })

    expect(screen.getByRole('searchbox', { name: 'Maydon yoki manzilni qidiring' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Filtrlar' })).toBeInTheDocument()
    const strip = screen.getByRole('radiogroup', { name: 'Sana' })
    expect(within(strip).getByRole('radio', { name: /Bugun/ })).toBeChecked()
    expect(within(strip).getByRole('radio', { name: /Ertaga/ })).not.toBeChecked()
    expect(screen.getByText(BANNER)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Barcha maydonlar · 12' }),
    ).toBeInTheDocument()
    // The format chips live in the Filters sheet now.
    expect(screen.queryByRole('button', { name: '7×7' })).not.toBeInTheDocument()
  })

  it('banner dismissal is remembered', async () => {
    stubApi({ [LIST]: page([makeStadium()]) })
    const first = renderApp('/')
    await screen.findByRole('article')
    fireEvent.click(screen.getByRole('button', { name: 'Yopish' }))
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument()
    expect(localStorage.getItem('minipolya-miniapp-banner-hidden')).toBe('1')
    first.unmount()

    renderApp('/')
    await screen.findByRole('article')
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument()
  })

  it('opening a card carries the chosen date', async () => {
    stubApi({ [LIST]: page([makeStadium()]) })
    const { router } = renderApp('/')
    const card = await screen.findByRole('article', { name: 'Bunyodkor Arena' })
    fireEvent.click(screen.getByRole('radio', { name: /Ertaga/ }))
    fireEvent.click(within(card).getByRole('button', { name: 'Band qilish' }))
    expect(router.state.location.pathname).toBe('/stadiums/018f3a2c-0000-7000-8000-0000000000a1')
    expect(router.state.location.search).toBe(`?date=${nextDate(tashkentToday())}`)
  })

  it('requests nothing for nearby/free-on-date', async () => {
    const api = stubApi({ [LIST]: page([makeStadium()]) })
    renderApp('/')
    await screen.findByRole('article')
    fireEvent.click(screen.getByRole('radio', { name: /Ertaga/ }))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(api.queries(LIST).length).toBeGreaterThan(0)
    for (const query of api.queries(LIST)) {
      expect(query).not.toHaveProperty('sort')
      expect(query).not.toHaveProperty('date')
      expect(query).not.toHaveProperty('freeOnly')
    }
  })

  it('hides the rating when the stadium has no reviews', async () => {
    stubApi({
      [LIST]: page([makeStadium({ averageRating: undefined, reviewCount: undefined })]),
    })
    renderApp('/')
    const card = await screen.findByRole('article', { name: 'Bunyodkor Arena' })
    expect(within(card).queryByText('4.8')).not.toBeInTheDocument()
  })

  it('searches with q, after the user stops typing', async () => {
    const api = stubApi({ [LIST]: page([makeStadium()]) })
    renderApp('/')
    await screen.findByRole('article')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Maydon yoki manzilni qidiring' }), {
      target: { value: 'Olmazor' },
    })
    await vi.waitFor(() =>
      expect(api.queries(LIST)).toContainEqual({ q: 'Olmazor', page: '0', size: '20' }),
    )
  })

  it('format filter lives in the sheet', async () => {
    const api = stubApi({ [LIST]: page([makeStadium()]) })
    renderApp('/')
    await screen.findByRole('article')

    fireEvent.click(screen.getByRole('button', { name: 'Filtrlar' }))
    let sheet = screen.getByRole('dialog', { name: 'Filtrlar' })
    expect(within(sheet).getByRole('button', { name: 'Hammasi' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(within(sheet).getByRole('button', { name: '7×7' }))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Qoʻllash' }))
    await vi.waitFor(() =>
      expect(api.queries(LIST).at(-1)).toEqual({ format: '7x7', page: '0', size: '20' }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Filtrlar' }))
    sheet = screen.getByRole('dialog', { name: 'Filtrlar' })
    expect(within(sheet).getByRole('button', { name: '7×7' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(within(sheet).getByRole('button', { name: 'Filtrlarni tozalash' }))
    await vi.waitFor(() => expect(api.queries(LIST).at(-1)).toEqual({ page: '0', size: '20' }))
  })

  it('sends the price limit in tiyin and the district from "Tumanni tanlang"', async () => {
    const api = stubApi({ [LIST]: page([makeStadium()]) })
    renderApp('/')
    await screen.findByRole('article')

    fireEvent.click(screen.getByRole('button', { name: 'Filtrlar' }))
    let sheet = screen.getByRole('dialog', { name: 'Filtrlar' })
    fireEvent.change(within(sheet).getByLabelText('Soatiga narx, gacha (soʻm)'), {
      target: { value: '150000' },
    })
    fireEvent.click(within(sheet).getByRole('button', { name: /Tuman.*Barcha tumanlar/ }))

    const districts = screen.getByRole('dialog', { name: 'Tumanni tanlang' })
    expect(within(districts).getAllByRole('radio')).toHaveLength(13)
    expect(within(districts).getByRole('radio', { name: 'Barcha tumanlar' })).toBeChecked()
    fireEvent.click(within(districts).getByRole('radio', { name: 'Mirzo Ulugʻbek' }))

    sheet = screen.getByRole('dialog', { name: 'Filtrlar' })
    // The typed price survives the trip to the district list.
    expect(within(sheet).getByLabelText('Soatiga narx, gacha (soʻm)')).toHaveValue('150000')
    fireEvent.click(within(sheet).getByRole('button', { name: 'Qoʻllash' }))

    await vi.waitFor(() =>
      expect(api.queries(LIST).at(-1)).toEqual({
        maxPrice: '15000000',
        district: 'Mirzo Ulugʻbek',
        page: '0',
        size: '20',
      }),
    )
  })

  it('"Filtrlarni tozalash" drops the price and the district', async () => {
    const api = stubApi({ [LIST]: page([makeStadium()]) })
    renderApp('/')
    await screen.findByRole('article')
    fireEvent.click(screen.getByRole('button', { name: 'Filtrlar' }))
    fireEvent.click(screen.getByRole('button', { name: /Tuman/ }))
    fireEvent.click(screen.getByRole('radio', { name: 'Yunusobod' }))
    fireEvent.click(screen.getByRole('button', { name: 'Qoʻllash' }))
    await vi.waitFor(() =>
      expect(api.queries(LIST).at(-1)).toMatchObject({ district: 'Yunusobod' }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Filtrlar' }))
    expect(screen.getByRole('button', { name: /Tuman.*Yunusobod/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Filtrlarni tozalash' }))
    await vi.waitFor(() => expect(api.queries(LIST).at(-1)).toEqual({ page: '0', size: '20' }))
  })

  it('shows the cover photo, and no photo block when the stadium has none', async () => {
    stubApi({
      [LIST]: page([
        makeStadium(),
        makeStadium({ id: 's2', name: 'Paxtakor Mini Arena', coverPhotoUrl: undefined }),
      ]),
    })
    const { container } = renderApp('/')
    await screen.findByRole('article', { name: 'Paxtakor Mini Arena' })
    const images = [...container.querySelectorAll('article img')]
    expect(images.map((img) => img.getAttribute('src'))).toEqual(['https://img.test/cover.jpg'])
  })

  it('shows the heart from isFavorited and toggles it on the card', async () => {
    const ID = makeStadium().id
    const api = stubApi({
      [LIST]: page([makeStadium({ isFavorited: false })]),
      [`POST /api/favorites/${ID}/toggle`]: { favorited: true },
    })
    renderApp('/')
    const card = await screen.findByRole('article', { name: 'Bunyodkor Arena' })
    fireEvent.click(within(card).getByRole('button', { name: 'Sevimlilarga qoʻshish' }))
    expect(
      await within(card).findByRole('button', { name: 'Sevimlilardan olib tashlash' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(api.calls(`POST /api/favorites/${ID}/toggle`)).toHaveLength(1)
  })

  it('loads the next page with "Yana koʻrsatish"', async () => {
    const api = stubApi({
      [LIST]: () =>
        api.queries(LIST).length === 1
          ? page([makeStadium()], { page: 0, totalPages: 2 })
          : page([makeStadium({ id: 's2', name: 'Paxtakor Mini Arena' })], {
              page: 1,
              totalPages: 2,
            }),
    })
    renderApp('/')
    fireEvent.click(await screen.findByRole('button', { name: 'Yana koʻrsatish' }))
    expect(await screen.findByRole('article', { name: 'Paxtakor Mini Arena' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Bunyodkor Arena' })).toBeInTheDocument()
    expect(api.queries(LIST).at(-1)).toEqual({ page: '1', size: '20' })
    expect(screen.queryByRole('button', { name: 'Yana koʻrsatish' })).not.toBeInTheDocument()
  })

  it('says when there are no stadiums at all', async () => {
    stubApi({ [LIST]: page([]) })
    renderApp('/')
    expect(
      await screen.findByRole('heading', { name: 'Hozircha maydonlar yoʻq' }),
    ).toBeInTheDocument()
  })

  it('says nothing was found for a search, and "Qidiruvni tozalash" resets it', async () => {
    const api = stubApi({
      [LIST]: () => (api.queries(LIST).at(-1)?.q ? page([]) : page([makeStadium()])),
    })
    renderApp('/')
    await screen.findByRole('article')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Olmazor arena' } })

    expect(await screen.findByRole('heading', { name: 'Hech narsa topilmadi' })).toBeInTheDocument()
    expect(screen.getByText(/«Olmazor arena» boʻyicha maydon topilmadi/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Qidiruvni tozalash' }))
    expect(await screen.findByRole('article', { name: 'Bunyodkor Arena' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stubApi({
      [LIST]: () =>
        fail ? jsonResponse(500, null, 'Internal server error') : page([makeStadium()]),
    })
    renderApp('/')
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByRole('article', { name: 'Bunyodkor Arena' })).toBeInTheDocument()
  })

  it('opens the stadium page from the card', async () => {
    stubApi({ [LIST]: page([makeStadium()]) })
    const { router } = renderApp('/')
    const card = await screen.findByRole('article', { name: 'Bunyodkor Arena' })
    fireEvent.click(within(card).getByRole('button', { name: /Band qilish/ }))
    expect(router.state.location.pathname).toBe('/stadiums/018f3a2c-0000-7000-8000-0000000000a1')
    expect(router.state.location.search).toBe(`?date=${tashkentToday()}`)
  })
})

describe('Bosh sahifa — the splash', () => {
  afterEach(() => {
    onlineManager.setOnline(true)
    document.getElementById('splash')?.remove()
  })

  it('lifts the splash when the first load is paused offline', async () => {
    stubApi({ [LIST]: page([]) })
    onlineManager.setOnline(false)
    const splash = document.createElement('div')
    splash.id = 'splash'
    document.body.appendChild(splash)
    renderApp('/')
    await vi.waitFor(() => expect(document.getElementById('splash')).toBeNull())
  })
})
