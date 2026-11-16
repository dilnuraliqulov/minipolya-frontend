import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LanguageFlag } from './LanguageFlag'

describe('LanguageFlag', () => {
  it.each(['uz', 'ru', 'en'] as const)('renders a decorative inline svg for %s', (language) => {
    const { container } = render(<LanguageFlag language={language} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 20 14')
    // Not an emoji flag: emoji do not render on Windows.
    expect(container.textContent).toBe('')
  })

  it('uses the border token for its hairline, not a hard-coded colour', () => {
    const { container } = render(<LanguageFlag language="uz" />)
    expect(container.querySelector('rect.stroke-border')).not.toBeNull()
  })

  it('is the same size whatever the language, so the rows stay aligned', () => {
    const sizes = (['uz', 'ru', 'en'] as const).map((language) => {
      const { container } = render(<LanguageFlag language={language} />)
      const svg = container.querySelector('svg')
      return `${svg?.getAttribute('width')}x${svg?.getAttribute('height')}`
    })
    expect(new Set(sizes)).toEqual(new Set(['20x14']))
  })

  it('keeps a caller className', () => {
    const { container } = render(<LanguageFlag language="ru" className="mr-2" />)
    expect(container.querySelector('svg')).toHaveClass('mr-2')
  })
})
