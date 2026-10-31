import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FilterBar, FilterSelect, SearchField } from './FilterBar'
import { pageItems } from './pageItems'
import { Pagination } from './Pagination'
import { Tabs } from './Tabs'

describe('pageItems', () => {
  it('lists every page when there are few', () => {
    expect(pageItems(0, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('collapses the middle with gaps', () => {
    expect(pageItems(0, 8)).toEqual([1, 2, 3, 4, null, 8])
    expect(pageItems(4, 10)).toEqual([1, null, 4, 5, 6, null, 10])
    expect(pageItems(9, 10)).toEqual([1, null, 7, 8, 9, 10])
  })
})

describe('Pagination', () => {
  it('shows the range and moves between pages', () => {
    const onPageChange = vi.fn()
    render(
      <Pagination
        page={0}
        size={20}
        totalElements={156}
        totalPages={8}
        onPageChange={onPageChange}
      />,
    )
    expect(screen.getByText('1–20 / 156')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Oldingi sahifa' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Keyingi sahifa' }))
    expect(onPageChange).toHaveBeenLastCalledWith(1)
    fireEvent.click(screen.getByRole('button', { name: '8' }))
    expect(onPageChange).toHaveBeenLastCalledWith(7)
  })

  it('handles the last page and an empty list', () => {
    const { rerender } = render(
      <Pagination page={7} size={20} totalElements={156} totalPages={8} onPageChange={vi.fn()} />,
    )
    expect(screen.getByText('141–156 / 156')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keyingi sahifa' })).toBeDisabled()
    rerender(
      <Pagination page={0} size={20} totalElements={0} totalPages={0} onPageChange={vi.fn()} />,
    )
    expect(screen.getByText('0–0 / 0')).toBeInTheDocument()
  })
})

describe('FilterBar', () => {
  it('passes search input and select changes up, and clears', () => {
    const onSearch = vi.fn()
    const onSelect = vi.fn()
    const onClear = vi.fn()
    render(
      <FilterBar onClear={onClear}>
        <SearchField value="" onChange={onSearch} placeholder="Ism boʻyicha qidirish" />
        <FilterSelect
          label="Holat"
          value="all"
          onChange={onSelect}
          options={[
            { value: 'all', label: 'Barchasi' },
            { value: 'pending', label: 'Kutilmoqda' },
          ]}
        />
      </FilterBar>,
    )
    fireEvent.change(screen.getByRole('searchbox', { name: 'Ism boʻyicha qidirish' }), {
      target: { value: 'Jam' },
    })
    expect(onSearch).toHaveBeenCalledWith('Jam')
    expect(screen.getByText('Holat: Barchasi')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'Holat' }), {
      target: { value: 'pending' },
    })
    expect(onSelect).toHaveBeenCalledWith('pending')
    fireEvent.click(screen.getByRole('button', { name: 'Tozalash' }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('highlights a select that is not on "all"', () => {
    render(
      <FilterSelect
        label="Tuman"
        value="chilonzor"
        onChange={vi.fn()}
        options={[
          { value: '', label: 'Barchasi' },
          { value: 'chilonzor', label: 'Chilonzor' },
        ]}
      />,
    )
    expect(screen.getByText('Tuman: Chilonzor').parentElement).toHaveClass('border-accent')
  })
})

describe('Tabs', () => {
  it('selects by click and arrow keys; count only on the active tab', () => {
    const onChange = vi.fn()
    render(
      <Tabs
        label="Arizalar"
        value="pending"
        onChange={onChange}
        tabs={[
          { value: 'pending', label: 'Kutilmoqda', count: 4 },
          { value: 'approved', label: 'Tasdiqlangan', count: 10 },
        ]}
      />,
    )
    const active = screen.getByRole('tab', { selected: true })
    expect(active).toHaveTextContent('Kutilmoqda4')
    expect(screen.getByRole('tab', { name: 'Tasdiqlangan' })).toHaveAttribute('tabindex', '-1')
    fireEvent.click(screen.getByRole('tab', { name: 'Tasdiqlangan' }))
    expect(onChange).toHaveBeenLastCalledWith('approved')
    fireEvent.keyDown(active, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('approved') // wraps around
  })
})
