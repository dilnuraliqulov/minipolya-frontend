import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BarChart, type BarDatum } from './BarChart'
import { labelledIndexes, niceMax } from './chartScale'

const data: BarDatum[] = [
  { key: '2026-10-20', label: '20 okt', title: '20 oktabr', value: 12 },
  { key: '2026-10-21', label: '21 okt', title: '21 oktabr', value: 0 },
  { key: '2026-10-22', label: '22 okt', title: '22 oktabr', value: 43 },
]

describe('chart scale', () => {
  it('rounds the axis up to a nice value split in three', () => {
    expect(niceMax(0)).toBe(3)
    expect(niceMax(43)).toBe(60) // ticks 0, 20, 40, 60 as in the design
    expect(niceMax(60)).toBe(60)
    expect(niceMax(61)).toBe(75)
    expect(niceMax(7)).toBe(9) // no 2.5 steps for small counts
    expect(niceMax(1203)).toBe(1500)
    expect(niceMax(5)).toBe(6)
  })

  it('labels every 7th bar and the last', () => {
    expect(labelledIndexes(30)).toEqual([0, 7, 14, 21, 29])
    expect(labelledIndexes(3)).toEqual([2])
    expect(labelledIndexes(0)).toEqual([])
  })
})

describe('BarChart', () => {
  it('draws every day: a bar for each count and a light stub for each zero', () => {
    render(<BarChart data={data} label="Bronlar" formatValue={(v) => `${v} ta bron`} />)
    expect(screen.getByRole('img', { name: 'Bronlar' })).toBeInTheDocument()
    expect(screen.getAllByTestId('bar')).toHaveLength(3)
    expect(screen.getAllByTestId('bar-fill')).toHaveLength(2)
    const stub = screen.getByTestId('bar-stub')
    expect(stub).toHaveClass('fill-accent', 'opacity-20')
    expect(stub).toHaveAttribute('height', '3')
    expect(screen.getByText('60')).toBeInTheDocument()
  })

  it('draws the highlighted bar in full accent, the rest lighter until hovered', () => {
    render(
      <BarChart data={data} highlight={2} label="Bronlar" formatValue={(v) => `${v} ta bron`} />,
    )
    const [first, last] = screen.getAllByTestId('bar-fill')
    expect(last).toHaveAttribute('data-strong', 'true')
    expect(last).not.toHaveClass('opacity-45')
    expect(first).toHaveClass('opacity-45')
    fireEvent.mouseEnter(screen.getAllByTestId('bar')[0]!)
    expect(first).not.toHaveClass('opacity-45')
    fireEvent.mouseEnter(screen.getAllByTestId('bar')[1]!)
    expect(screen.getByTestId('bar-stub')).not.toHaveClass('opacity-20')
  })

  it('shows a tooltip on hover and on keyboard focus', () => {
    render(<BarChart data={data} label="Bronlar" formatValue={(v) => `${v} ta bron`} />)
    const bars = screen.getAllByTestId('bar')
    fireEvent.mouseEnter(bars[2]!)
    expect(screen.getByRole('tooltip')).toHaveTextContent('22 oktabr43 ta bron')
    fireEvent.focus(bars[1]!)
    expect(screen.getByRole('tooltip')).toHaveTextContent('21 oktabr0 ta bron')
    fireEvent.blur(bars[1]!)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(bars[0]).toHaveAttribute('aria-label', '20 oktabr: 12 ta bron')
  })
})
