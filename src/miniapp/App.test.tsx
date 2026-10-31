import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from './test/renderApp'

describe('Mini App shell', () => {
  it('opens on Maydonlar with the four tabs from the design', async () => {
    renderApp('/')
    const nav = await screen.findByRole('navigation')
    for (const label of ['Maydonlar', 'Jamoam', 'Oʻyinlarim', 'Profil']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(nav).toContainElement(screen.getByRole('link', { name: 'Maydonlar' }))
    expect(screen.getByRole('link', { name: 'Maydonlar' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows "Tez orada" on the tabs later parts build', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Tez orada' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Jamoam' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Jamoam' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tez orada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Jamoam' })).toHaveAttribute('aria-current', 'page')

    fireEvent.click(screen.getByRole('link', { name: 'Oʻyinlarim' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Oʻyinlarim' })).toBeInTheDocument()
  })

  it('sends unknown paths to the first tab', async () => {
    renderApp('/nowhere')
    expect(await screen.findByRole('heading', { level: 1, name: 'Maydonlar' })).toBeInTheDocument()
  })
})
