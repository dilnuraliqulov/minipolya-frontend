import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '../i18n'
import { RemainderCard } from './RemainderCard'

describe('RemainderCard', () => {
  it('leads with the amount, then the pay button and the cash note', () => {
    const onPay = vi.fn()
    render(<RemainderCard amount={15_000_000} onPay={onPay} />)
    const card = screen.getByRole('region', { name: 'Qolgan summa: 150 000 soʻm' })
    expect(within(card).getByText('Qolgan summa')).toBeInTheDocument()
    expect(within(card).getByText('150 000 soʻm')).toBeInTheDocument()
    expect(within(card).getByText('yoki maydonda naqd toʻlang')).toBeInTheDocument()
    fireEvent.click(within(card).getByRole('button', { name: 'Ilovada toʻlash' }))
    expect(onPay).toHaveBeenCalledOnce()
  })

  it('sits on the normal surface with a slim warning edge, never a warning fill', () => {
    render(<RemainderCard amount={100} />)
    const card = screen.getByRole('region')
    expect(card.className).toContain('bg-background')
    expect(card.className).toContain('border-l-warning-text')
    expect(card.className).not.toContain('bg-warning')
  })

  it('has no button without a way to pay, and shows a status in its place', () => {
    render(<RemainderCard amount={100} status="Tekshirilmoqda" />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Tekshirilmoqda')).toBeInTheDocument()
  })

  it('compact: the label and amount only, safe inside a link', () => {
    const { container } = render(<RemainderCard amount={15_000_000} variant="compact" />)
    expect(screen.getByText('Qolgan summa')).toBeInTheDocument()
    expect(screen.getByText('150 000 soʻm')).toBeInTheDocument()
    expect(screen.queryByText('yoki maydonda naqd toʻlang')).toBeNull()
    expect(container.querySelector('section, button, div, p')).toBeNull()
  })
})
