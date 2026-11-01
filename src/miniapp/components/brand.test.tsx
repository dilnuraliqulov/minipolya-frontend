import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../i18n'
import { LOGO_MARK_PATH } from '../../shared/brand/logoMark'
import { LogoMark } from './LogoMark'
import { LogoSpinner } from './LogoSpinner'

describe('LogoMark', () => {
  it('renders the design path at the given size', () => {
    const { container } = render(<LogoMark size={32} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '32')
    expect(svg).toHaveAttribute('viewBox', '0 0 64 64')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    const path = container.querySelector('path')
    expect(path).toHaveAttribute('d', LOGO_MARK_PATH)
    expect(path).toHaveAttribute('fill-rule', 'evenodd')
  })
})

describe('LogoSpinner', () => {
  it('is a status with a translated label', () => {
    render(<LogoSpinner />)
    expect(screen.getByRole('status', { name: 'Yuklanmoqda' })).toBeInTheDocument()
    render(<LogoSpinner label="Kuting" />)
    expect(screen.getByRole('status', { name: 'Kuting' })).toBeInTheDocument()
  })

  it('has motion-reduce:animate-none', () => {
    render(<LogoSpinner />)
    const el = screen.getByRole('status')
    expect(el).toHaveClass('animate-logo-pulse')
    expect(el).toHaveClass('motion-reduce:animate-none')
  })
})
