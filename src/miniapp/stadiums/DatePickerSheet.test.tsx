import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '../i18n'
import { DatePickerSheet } from './DatePickerSheet'
import { BOOKING_WINDOW_DAYS, dayTitle } from './dates'

/**
 * "Sanani tanlang" — the home page's calendar sheet. `today` is a prop, so
 * every case here is a fixed date and nothing depends on the clock.
 */
const TODAY = '2026-11-18'
const SELECTED = '2026-11-20'
/** The window is today … today + 28 days, so this is the first day outside it. */
const BEYOND = '2026-12-17'

function open(value = SELECTED, onChange = vi.fn()) {
  render(<DatePickerSheet today={TODAY} value={value} onChange={onChange} onClose={() => {}} />)
  const sheet = screen.getByRole('dialog', { name: 'Sanani tanlang' })
  const day = (iso: string) => within(sheet).getByRole('button', { name: dayTitle(iso) })
  return { sheet, day, onChange }
}

describe('DatePickerSheet', () => {
  it('marks today', () => {
    const { day } = open()
    expect(day(TODAY)).toHaveAttribute('aria-current', 'date')
    expect(day(SELECTED)).not.toHaveAttribute('aria-current')
  })

  it('highlights the selected date', () => {
    const { day } = open()
    expect(day(SELECTED)).toHaveAttribute('aria-pressed', 'true')
    expect(day(TODAY)).toHaveAttribute('aria-pressed', 'false')
  })

  it('disables the days before today and beyond the booking window', () => {
    const { day } = open()
    expect(day('2026-11-01')).toBeDisabled()
    expect(day('2026-11-17')).toBeDisabled()
    expect(day(BEYOND)).toBeDisabled()
    expect(day(TODAY)).toBeEnabled()
    expect(day('2026-12-16')).toBeEnabled()
  })

  it('reports the day that was picked', () => {
    const { day, onChange } = open()
    fireEvent.click(day('2026-11-25'))
    expect(onChange).toHaveBeenCalledWith('2026-11-25')
  })

  it('reports nothing for a day outside the window', () => {
    const { day, onChange } = open()
    fireEvent.click(day(BEYOND))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('covers every month the window touches', () => {
    const { sheet } = open()
    expect(within(sheet).getByText('noyabr')).toBeInTheDocument()
    expect(within(sheet).getByText('dekabr')).toBeInTheDocument()
    // Every day of both months is there: 30 + 31.
    expect(within(sheet).getAllByRole('button')).toHaveLength(61)
    expect(BOOKING_WINDOW_DAYS).toBe(28)
  })
})
