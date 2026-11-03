import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, stubApi } from '../test/api'
import { renderApp } from '../test/renderApp'
import { makeReview, page } from '../test/stadiums'

afterEach(() => {
  vi.unstubAllGlobals()
})

const ID = 'st1'
const PATH = `/stadiums/${ID}/reviews`
const KEY = `GET /api/reviews/stadium/${ID}`

describe('Sharhlar', () => {
  it('lists the reviews with the author and comment', async () => {
    stubApi({
      [KEY]: page([
        makeReview({ id: 'r1', userName: 'Jasur A.', comment: 'Gazon zoʻr' }),
        makeReview({ id: 'r2', userName: 'Bekzod R.', rating: 3, comment: 'Dush sovuq' }),
      ]),
    })
    renderApp(PATH)
    expect(await screen.findByRole('heading', { name: 'Sharhlar' })).toBeInTheDocument()
    expect(await screen.findByText('Gazon zoʻr')).toBeInTheDocument()
    expect(screen.getByText('Bekzod R.')).toBeInTheDocument()
    expect(screen.getByText('Dush sovuq')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Yana koʻrsatish' })).not.toBeInTheDocument()
  })

  it('loads the next page with "Yana koʻrsatish"', async () => {
    let calls = 0
    const api = stubApi({
      [KEY]: () =>
        ++calls === 1
          ? page([makeReview({ id: 'r1', comment: 'Birinchi' })], {
              totalPages: 2,
              totalElements: 2,
            })
          : page([makeReview({ id: 'r2', comment: 'Ikkinchi' })], {
              page: 1,
              totalPages: 2,
              totalElements: 2,
            }),
    })
    renderApp(PATH)
    expect(await screen.findByText('Birinchi')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Yana koʻrsatish' }))
    expect(await screen.findByText('Ikkinchi')).toBeInTheDocument()
    expect(screen.getByText('Birinchi')).toBeInTheDocument()
    await waitFor(() => expect(api.queries(KEY).map((q) => q.page)).toEqual(['0', '1']))
    expect(screen.queryByRole('button', { name: 'Yana koʻrsatish' })).not.toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    stubApi({ [KEY]: page([]) })
    renderApp(PATH)
    expect(await screen.findByText('Hali sharhlar yoʻq')).toBeInTheDocument()
  })

  it('shows the error state and retries', async () => {
    let calls = 0
    stubApi({
      [KEY]: () => (++calls === 1 ? jsonResponse(500, null, 'boom') : page([makeReview()])),
    })
    renderApp(PATH)
    fireEvent.click(await screen.findByRole('button', { name: 'Qayta urinish' }))
    expect(await screen.findByText('Gazon zoʻr')).toBeInTheDocument()
  })
})
