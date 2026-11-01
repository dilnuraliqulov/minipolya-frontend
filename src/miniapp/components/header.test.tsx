import { fireEvent, render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../i18n'
import { makeUser, stubApi } from '../test/api'
import { renderApp } from '../test/renderApp'
import { page } from '../test/stadiums'
import { Header } from './Screen'

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.removeAttribute('data-fullscreen')
})

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true, writable: true })
}

describe('Header', () => {
  it('brand header shows the mark and MiniPolya', () => {
    const { container } = render(<Header brand title="MiniPolya" />)
    const heading = screen.getByRole('heading', { level: 1, name: 'MiniPolya' })
    expect(heading).toBeInTheDocument()
    expect(container.querySelector('header svg')).toBeInTheDocument()
  })

  it('shows no mark without brand', () => {
    const { container } = render(<Header title="Maydon" />)
    expect(container.querySelector('header svg')).not.toBeInTheDocument()
  })

  it('fullscreen header pads 102px each side', () => {
    document.documentElement.dataset.fullscreen = 'true'
    render(<Header brand title="MiniPolya" action={<button type="button">Act</button>} />)
    const row = screen.getByRole('heading', { level: 1 }).parentElement!
    expect(row).toHaveClass(
      'tg-fullscreen:h-(--tg-content-top)',
      'tg-fullscreen:px-[102px]',
      'tg-fullscreen:justify-center',
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass(
      'tg-fullscreen:text-xl',
      'tg-fullscreen:font-semibold',
      'tg-fullscreen:text-center',
    )
    // The action moves to a second row of the same header in fullscreen.
    const action = screen.getByRole('button', { name: 'Act' }).parentElement!
    expect(action.closest('header')).toBe(screen.getByRole('banner'))
    expect(action).toHaveClass(
      'tg-fullscreen:row-start-2',
      'tg-fullscreen:h-11',
      'tg-fullscreen:px-4',
    )
  })

  it('fullscreen title shrinks and truncates between Close and ⋯', () => {
    document.documentElement.dataset.fullscreen = 'true'
    const { container } = render(<Header brand title="Salom, Muhammadjon Abdurahmonov" />)
    const title = screen.getByRole('heading', { level: 1 })
    expect(title).toHaveClass('truncate', 'min-w-0', 'tg-fullscreen:flex-initial')
    expect(title.className).not.toMatch(/flex-none/)
    expect(container.querySelector('header svg')).toHaveClass('shrink-0')
  })

  it('hides its own back button in fullscreen', () => {
    render(<Header title="Maydon" onBack={() => {}} />)
    expect(screen.getByRole('button', { name: 'Orqaga' })).toHaveClass('tg-fullscreen:hidden')
  })

  it('border appears after scrolling', () => {
    setScrollY(0)
    try {
      render(<Header title="Maydon" />)
      const header = screen.getByRole('banner')
      expect(header).toHaveClass('border-transparent')
      expect(header).not.toHaveClass('border-border')
      act(() => {
        setScrollY(10)
        fireEvent.scroll(window)
      })
      expect(header).toHaveClass('border-border')
      act(() => {
        setScrollY(0)
        fireEvent.scroll(window)
      })
      expect(header).toHaveClass('border-transparent')
    } finally {
      setScrollY(0)
    }
  })
})

describe('Bosh sahifa header', () => {
  it('home greets by first name', async () => {
    stubApi({
      'GET /api/users/me': makeUser({ firstName: 'Dilnur' }),
      'GET /api/stadiums': page([]),
    })
    renderApp('/')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Salom, Dilnur' }),
    ).toBeInTheDocument()
  })

  it('home without firstName shows MiniPolya', async () => {
    stubApi({ 'GET /api/users/me': makeUser(), 'GET /api/stadiums': page([]) })
    renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'MiniPolya' })).toBeInTheDocument()
    expect(screen.getByRole('banner').querySelector('svg')).toBeInTheDocument()
  })
})
