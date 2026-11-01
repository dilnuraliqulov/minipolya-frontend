import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '../i18n'
import { makeStadium } from '../test/stadiums'
import { StadiumCardCompact } from './StadiumCardCompact'

function renderCard(props: Partial<Parameters<typeof StadiumCardCompact>[0]> = {}) {
  const onOpen = vi.fn()
  render(<StadiumCardCompact stadium={makeStadium()} onOpen={onOpen} {...props} />)
  return { onOpen }
}

describe('StadiumCardCompact', () => {
  it('shows one price from pricePerHour', () => {
    renderCard()
    expect(screen.getAllByText(/\d{3} \d{3}/)).toHaveLength(1)
    expect(screen.getByText('155 000 soʻm')).toBeInTheDocument()
    expect(screen.getByText('/soat')).toBeInTheDocument()
    expect(screen.getByText('Chilonzor · 7×7 · Sunʼiy gazon')).toBeInTheDocument()
  })

  it('image is lazy and fades in', () => {
    const { container } = render(<StadiumCardCompact stadium={makeStadium()} onOpen={() => {}} />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveClass('opacity-0')
    fireEvent.load(img)
    expect(img).toHaveClass('opacity-100')
  })

  it('rating chip only with averageRating', () => {
    const { unmount } = render(<StadiumCardCompact stadium={makeStadium()} onOpen={() => {}} />)
    expect(screen.getByText('4.8')).toBeInTheDocument()
    unmount()
    renderCard({ stadium: makeStadium({ averageRating: undefined }) })
    expect(screen.queryByText('4.8')).not.toBeInTheDocument()
  })

  it('heart toggles and reports pressed state', () => {
    const onToggle = vi.fn()
    renderCard({ favorite: { favorited: true, onToggle } })
    const heart = screen.getByRole('button', { name: 'Sevimlilardan olib tashlash' })
    expect(heart).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(heart)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('no photo shows the mark placeholder', () => {
    const { container } = render(
      <StadiumCardCompact stadium={makeStadium({ coverPhotoUrl: undefined })} onOpen={() => {}} />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg.opacity-40')).not.toBeNull()
  })

  it('opens from the button and the name', () => {
    const { onOpen } = renderCard()
    fireEvent.click(screen.getByRole('button', { name: 'Band qilish' }))
    fireEvent.click(screen.getByText('Bunyodkor Arena'))
    expect(onOpen).toHaveBeenCalledTimes(2)
  })
})
