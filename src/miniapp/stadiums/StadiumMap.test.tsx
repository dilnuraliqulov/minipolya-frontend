import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../i18n'
import { StadiumMap } from './StadiumMap'

describe('StadiumMap', () => {
  it('is one labelled image with no focusable pin inside', () => {
    const { container } = render(<StadiumMap latitude={41.28} longitude={69.2} />)
    expect(screen.getByRole('img', { name: /xarita/i })).toBeInTheDocument()
    expect(container.querySelector('[role="button"], [tabindex="0"]')).toBeNull()
  })
})
