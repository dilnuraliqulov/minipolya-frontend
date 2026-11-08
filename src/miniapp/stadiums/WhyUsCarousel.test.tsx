import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../i18n'
import { WhyUsCarousel } from './WhyUsCarousel'

const SLIDES = [
  ['Tasdiqlangan maydonlar', 'Har bir maydonni tekshiramiz va egasi bilan shartnoma tuzamiz.'],
  [
    'Xavfsiz toʻlov',
    'Uzcard va Humo orqali. Belgilangan muddatgacha bekor qilsangiz, pul toʻliq qaytariladi.',
  ],
  ['Raqib jamoa toping', 'Jamoangiz bilan oʻyin yarating, raqib jamoa qoʻshiladi.'],
  ['1 daqiqada bron', 'Boʻsh vaqtni tanlang va darhol band qiling.'],
] as const

const dots = () => screen.getByTestId('why-us-dots').children
const activeDot = () =>
  Array.from(dots()).findIndex((dot) => dot.getAttribute('data-active') === 'true')

function reducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  reducedMotion(false)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('WhyUsCarousel', () => {
  it('has the four true claims and four dots', () => {
    render(<WhyUsCarousel onDismiss={() => {}} />)
    for (const [title, text] of SLIDES) {
      expect(screen.getByText(title)).toBeInTheDocument()
      expect(screen.getByText(text)).toBeInTheDocument()
    }
    expect(dots()).toHaveLength(4)
    expect(activeDot()).toBe(0)
  })

  it('advances on its own and wraps around', () => {
    render(<WhyUsCarousel onDismiss={() => {}} />)
    act(() => void vi.advanceTimersByTime(5000))
    expect(activeDot()).toBe(1)
    act(() => void vi.advanceTimersByTime(15000))
    expect(activeDot()).toBe(0)
  })

  it('stays still while touched, then carries on', () => {
    render(<WhyUsCarousel onDismiss={() => {}} />)
    const track = screen.getByTestId('why-us-track')
    fireEvent.touchStart(track)
    act(() => void vi.advanceTimersByTime(20000))
    expect(activeDot()).toBe(0)
    fireEvent.touchEnd(track)
    act(() => void vi.advanceTimersByTime(5000))
    expect(activeDot()).toBe(1)
  })

  it('never moves by itself with reduced motion', () => {
    reducedMotion(true)
    render(<WhyUsCarousel onDismiss={() => {}} />)
    act(() => void vi.advanceTimersByTime(30000))
    expect(activeDot()).toBe(0)
  })

  it('follows a swipe: the dot is read from the scroll position', () => {
    render(<WhyUsCarousel onDismiss={() => {}} />)
    const track = screen.getByTestId('why-us-track')
    Object.defineProperty(track, 'clientWidth', { value: 300 })
    Object.defineProperty(track, 'scrollLeft', { value: 600 })
    fireEvent.scroll(track)
    expect(activeDot()).toBe(2)
  })

  it('can be closed', () => {
    const onDismiss = vi.fn()
    render(<WhyUsCarousel onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: 'Yopish' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
