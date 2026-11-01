import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, stubApi } from '../test/api'
import { makeCard } from '../test/bookings'
import { renderApp } from '../test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
})

const CARDS = 'GET /api/cards'
const humo = makeCard({
  id: 'c1',
  maskedNumber: '8600 •••• 1234',
  cardType: 'humo',
  expiry: '12/27',
})
const uzcard = makeCard({
  id: 'c2',
  maskedNumber: '8600 •••• 5678',
  cardType: 'uzcard',
  expiry: '08/26',
})

describe('Kartalarim', () => {
  it('lists the cards with last four and type · expiry, and no default badge', async () => {
    stubApi({ [CARDS]: [humo, uzcard] })
    renderApp('/profile/cards')
    expect(await screen.findByRole('heading', { level: 1, name: 'Kartalarim' })).toBeInTheDocument()
    expect(await screen.findByText('•••• 1234')).toBeInTheDocument()
    expect(screen.getByText('•••• 5678')).toBeInTheDocument()
    expect(screen.getByText('Humo · 12/27')).toBeInTheDocument()
    expect(screen.getByText('Uzcard · 08/26')).toBeInTheDocument()
    expect(screen.queryByText('Asosiy')).not.toBeInTheDocument()
    expect(screen.getByText(/faqat toʻlov tokeni saqlanadi/)).toBeInTheDocument()
  })

  it('shows a skeleton while loading', () => {
    stubApi({ [CARDS]: new Promise(() => {}) as unknown as object })
    renderApp('/profile/cards')
    expect(screen.getByRole('status', { name: 'Yuklanmoqda' })).toBeInTheDocument()
  })

  it('has an empty state with Karta qoʻshish that opens the sheet', async () => {
    stubApi({ [CARDS]: [] })
    renderApp('/profile/cards')
    expect(
      await screen.findByRole('heading', { name: 'Saqlangan kartalar yoʻq' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Karta qoʻshish' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Karta raqami')).toBeInTheDocument()
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stubApi({ [CARDS]: () => (fail ? jsonResponse(500, null, 'Internal server error') : [humo]) })
    renderApp('/profile/cards')
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByText('•••• 1234')).toBeInTheDocument()
  })

  it('deletes a card after confirming', async () => {
    let cards = [humo, uzcard]
    const api = stubApi({
      [CARDS]: () => cards,
      'DELETE /api/cards/c2': () => {
        cards = [humo]
        return null
      },
    })
    renderApp('/profile/cards')
    await screen.findByText('•••• 5678')
    const buttons = screen.getAllByRole('button', { name: 'Karta amallari' })
    fireEvent.click(buttons[1]!)
    fireEvent.click(await screen.findByRole('button', { name: 'Kartani oʻchirish' }))
    const dialog = await screen.findByRole('dialog', { name: 'Kartani oʻchirasizmi?' })
    expect(within(dialog).getByText(/5678/)).toBeInTheDocument()
    expect(api.calls('DELETE /api/cards/c2')).toHaveLength(0)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Oʻchirish' }))
    expect(await screen.findByText('Karta oʻchirildi')).toBeInTheDocument()
    await vi.waitFor(() => expect(screen.queryByText('•••• 5678')).not.toBeInTheDocument())
    expect(api.calls('DELETE /api/cards/c2')).toHaveLength(1)
    expect(screen.getByText('•••• 1234')).toBeInTheDocument()
  })

  it('keeps the card when the confirm sheet is dismissed', async () => {
    const api = stubApi({ [CARDS]: [humo] })
    renderApp('/profile/cards')
    await screen.findByText('•••• 1234')
    fireEvent.click(screen.getByRole('button', { name: 'Karta amallari' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Kartani oʻchirish' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Ortga' }))
    expect(api.calls('DELETE /api/cards/c1')).toHaveLength(0)
  })
})
