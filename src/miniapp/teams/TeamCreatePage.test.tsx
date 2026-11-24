import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { stubApi } from '../test/api'
import { renderApp } from '../test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Jamoa yaratish', () => {
  it('waits for a level before it will create anything', async () => {
    stubApi({})
    renderApp('/team/new')

    fireEvent.change(await screen.findByLabelText('Jamoa nomi'), {
      target: { value: 'Chilonzor Lions' },
    })

    expect(screen.getByRole('button', { name: 'Jamoa yaratish' })).toBeDisabled()
  })

  it('sends the name and the chosen level', async () => {
    const api = stubApi({
      'POST /api/teams': { id: 't1', name: 'Chilonzor Lions', leaderId: 'u1', members: [] },
      'GET /api/teams/me': [],
    })
    renderApp('/team/new')

    fireEvent.change(await screen.findByLabelText('Jamoa nomi'), {
      target: { value: 'Chilonzor Lions' },
    })
    fireEvent.click(screen.getByRole('radio', { name: /Professional/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Jamoa yaratish' }))

    await waitFor(() =>
      expect(api.calls('POST /api/teams')).toEqual([
        { name: 'Chilonzor Lions', level: 'professional' },
      ]),
    )
  })

  it('offers every level with the line that explains it', async () => {
    stubApi({})
    renderApp('/team/new')

    expect(await screen.findByText('Doʻstlar bilan dam olish uchun oʻynaymiz')).toBeInTheDocument()
    expect(screen.getByText('Muntazam oʻynaymiz, yaxshi tayyorgarlik')).toBeInTheDocument()
    expect(screen.getByText('Turnir darajasi, kuchli jamoa')).toBeInTheDocument()
  })
})
