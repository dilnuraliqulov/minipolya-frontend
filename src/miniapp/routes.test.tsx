import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import './i18n'

vi.mock('./stadiums/StadiumsPage', () => ({
  StadiumsPage: () => {
    throw new Error('boom')
  },
}))

afterEach(() => {
  vi.restoreAllMocks()
  document.getElementById('splash')?.remove()
})

describe('route errors', () => {
  it('a render crash shows the error state and hides the splash', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.useFakeTimers()
    const splash = document.createElement('div')
    splash.id = 'splash'
    document.body.appendChild(splash)
    const { routes } = await import('./routes')
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })

    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/'] })} />)

    expect(screen.getByRole('heading', { name: 'Xatolik yuz berdi' })).toBeInTheDocument()
    vi.advanceTimersByTime(1000)
    expect(document.getElementById('splash')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Qayta urinish' }))
    expect(reload).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
})
