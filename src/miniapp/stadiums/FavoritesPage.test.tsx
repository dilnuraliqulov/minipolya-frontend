import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, makeUser, stubApi } from '../test/api'
import { renderApp } from '../test/renderApp'
import { makeStadium, page } from '../test/stadiums'

afterEach(() => {
  vi.unstubAllGlobals()
})

const FAVORITES = 'GET /api/favorites'
const arena = makeStadium()
const park = makeStadium({ id: 's2', name: 'Yunusobod Sport Park', pricePerHour: 12_500_000 })

describe('Sevimlilar', () => {
  it('lists the favourite stadiums with ONE price each', async () => {
    stubApi({ [FAVORITES]: page([arena, park]) })
    renderApp('/profile/favorites')
    expect(await screen.findByRole('heading', { level: 1, name: 'Sevimlilar' })).toBeInTheDocument()
    const card = await screen.findByRole('article', { name: 'Yunusobod Sport Park' })
    expect(within(card).getAllByText(/\d{3} \d{3}/)).toHaveLength(1)
    expect(within(card).getByText('125 000 soʻm')).toBeInTheDocument()
  })

  it('removes a stadium with the heart', async () => {
    let favorites = [arena, park]
    const api = stubApi({
      [FAVORITES]: () => page(favorites),
      'POST /api/favorites/s2/toggle': () => {
        favorites = [arena]
        return { favorited: false }
      },
    })
    renderApp('/profile/favorites')
    const card = await screen.findByRole('article', { name: 'Yunusobod Sport Park' })
    fireEvent.click(within(card).getByRole('button', { name: 'Sevimlilardan olib tashlash' }))
    await vi.waitFor(() =>
      expect(
        screen.queryByRole('article', { name: 'Yunusobod Sport Park' }),
      ).not.toBeInTheDocument(),
    )
    expect(api.calls('POST /api/favorites/s2/toggle')).toHaveLength(1)
    expect(screen.getByRole('article', { name: 'Bunyodkor Arena' })).toBeInTheDocument()
  })

  it('has an empty state that leads to the stadium list', async () => {
    stubApi({ [FAVORITES]: page([]), 'GET /api/stadiums': page([]) })
    const { router } = renderApp('/profile/favorites')
    expect(
      await screen.findByRole('heading', { name: 'Sevimli maydonlaringiz yoʻq' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Maydon topish' }))
    expect(router.state.location.pathname).toBe('/')
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stubApi({
      [FAVORITES]: () => (fail ? jsonResponse(500, null, 'Internal server error') : page([arena])),
    })
    renderApp('/profile/favorites')
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByRole('article', { name: 'Bunyodkor Arena' })).toBeInTheDocument()
  })

  it('is opened from Profil', async () => {
    stubApi({ 'GET /api/users/me': makeUser(), [FAVORITES]: page([arena]) })
    renderApp('/profile')
    fireEvent.click(await screen.findByRole('button', { name: /Sevimlilar/ }))
    expect(await screen.findByRole('article', { name: 'Bunyodkor Arena' })).toBeInTheDocument()
  })
})
