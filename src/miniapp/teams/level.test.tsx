import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '../i18n'
import { avatarTone } from './avatarTone'
import { TeamAvatar } from './TeamAvatar'
import { TeamLevelBadge } from './TeamLevelBadge'
import { TeamLevelCards } from './TeamLevelCards'

describe('the team level', () => {
  it('shows nothing at all for a team that has no level', () => {
    const { container } = render(<TeamLevelBadge />)

    expect(container).toBeEmptyDOMElement()
  })

  it('shows nothing for a value the app does not know', () => {
    const { container } = render(<TeamLevelBadge level="elite" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('names the level in the reader’s language', () => {
    render(<TeamLevelBadge level="orta" />)

    expect(screen.getByText('Oʻrta')).toBeInTheDocument()
  })
})

describe('the three choice cards', () => {
  it('offers every level with the one line that explains it', () => {
    render(<TeamLevelCards onChange={() => {}} />)

    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByText('Havaskor')).toBeInTheDocument()
    expect(screen.getByText('Doʻstlar bilan dam olish uchun oʻynaymiz')).toBeInTheDocument()
    expect(screen.getByText('Muntazam oʻynaymiz, yaxshi tayyorgarlik')).toBeInTheDocument()
    expect(screen.getByText('Turnir darajasi, kuchli jamoa')).toBeInTheDocument()
  })

  it('marks the chosen one and reports the next choice', () => {
    const onChange = vi.fn()
    render(<TeamLevelCards value="havaskor" onChange={onChange} />)

    const [amateur, , professional] = screen.getAllByRole('radio')
    expect(amateur).toHaveAttribute('aria-checked', 'true')
    expect(professional).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(professional!)

    expect(onChange).toHaveBeenCalledWith('professional')
  })
})

describe('a team’s avatar colour', () => {
  it('is the same every time for the same team', () => {
    const id = '0199f0a0-1111-7000-8000-000000000001'

    expect(avatarTone(id)).toBe(avatarTone(id))
  })

  it('tells teams apart', () => {
    const tones = [
      '0199f0a0-1111-7000-8000-000000000001',
      '0199f0a0-1111-7000-8000-000000000002',
      '0199f0a0-1111-7000-8000-000000000003',
    ].map(avatarTone)

    expect(new Set(tones).size).toBeGreaterThan(1)
  })

  it('falls back to the accent when there is no team to derive from', () => {
    const { container } = render(<TeamAvatar name="Alpha Bravo" />)

    expect(container.firstElementChild).toHaveClass('bg-accent')
    expect(container.firstElementChild).toHaveTextContent('AB')
  })
})
