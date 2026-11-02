import { render } from '@testing-library/react'
import L from 'leaflet'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StadiumMap from './StadiumMap'

const HOSTILE = '<img src=x onerror=alert(1)>'

describe('admin StadiumMap', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the stadium name in the tooltip as text, never as HTML', () => {
    const bound: L.Layer[] = []
    const original = L.Layer.prototype.bindTooltip
    vi.spyOn(L.Layer.prototype, 'bindTooltip').mockImplementation(function (
      this: L.Layer,
      ...args: Parameters<L.Layer['bindTooltip']>
    ) {
      bound.push(this)
      return original.apply(this, args)
    })

    const { container } = render(<StadiumMap latitude={41.28} longitude={69.2} label={HOSTILE} />)
    expect(bound).toHaveLength(1)
    bound[0]!.openTooltip()

    const tooltip = container.querySelector('.leaflet-tooltip')
    expect(tooltip).not.toBeNull()
    expect(tooltip!.textContent).toBe(HOSTILE)
    expect(container.querySelector('img[src="x"]')).toBeNull()
  })
})
