import { onlineManager } from '@tanstack/react-query'
import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, stubApi } from '../test/api'
import { renderApp } from '../test/renderApp'
import { makeStadium, page } from '../test/stadiums'

afterEach(() => {
  vi.unstubAllGlobals()
})

const LIST = 'GET /api/stadiums'

describe('Bosh sahifa — the stadium list', () => {
  it('loads the first page and shows each card with ONE price per hour', async () => {
    const api = stubApi({ [LIST]: page([makeStadium()]) })
    renderApp('/')

    expect(screen.getByRole('status', { name: 'Yuklanmoqda' })).toBeInTheDocument()
    const card = await screen.findByRole('article', { name: 'Bunyodkor Arena' })
    expect(within(card).getByText('4.8')).toBeInTheDocument()
    expect(within(card).getByText('(128)')).toBeInTheDocument()
    expect(within(card).getByText('Chilonzor · 7×7')).toBeInTheDocument()
    expect(within(card).getByText('155 000')).toBeInTheDocument()
    expect(within(card).getByText('soʻm/soat')).toBeInTheDocument()
    // One price, nothing else that looks like money.
    expect(within(card).getAllByText(/\d{3} \d{3}/)).toHaveLength(1)
    expect(within(card).queryByText(/komissiya|karta toʻlovi|xizmat haqi/i)).not.toBeInTheDocument()
    expect(api.queries(LIST)).toEqual([{ page: '0', size: '20' }])
  })

  it('hides the rating when the stadium has no reviews', async () => {
    stubApi({
      [LIST]: page([makeStadium({ averageRating: undefined, reviewCount: undefined })]),
    })
    renderApp('/')
    const card = await screen.findByRole('article', { name: 'Bunyodkor Arena' })
    expect(within(card).queryByText(/\(\d+\)/)).not.toBeInTheDocument()
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

  it('filters by format with the chips; "Hammasi" removes it', async () => {
    const api = stubApi({ [LIST]: page([makeStadium()]) })
    renderApp('/')
    await screen.findByRole('article')

    fireEvent.click(screen.getByRole('button', { name: '7×7' }))
    await vi.waitFor(() =>
      expect(api.queries(LIST).at(-1)).toEqual({ format: '7x7', page: '0', size: '20' }),
    )
    expect(screen.getByRole('button', { name: '7×7' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Hammasi' }))
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
