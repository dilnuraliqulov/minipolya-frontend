import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { stubMedia } from '../test-utils'
import { FilterBar, FilterSelect, SearchField } from './FilterBar'
import { CARD_ROWS } from './useMediaQuery'
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

describe('FilterBar below 768px', () => {
  afterEach(() => vi.unstubAllGlobals())

  const search = <SearchField value="" onChange={vi.fn()} placeholder="Ism boʻyicha qidirish" />
  const holat = (
    <FilterSelect
      label="Holat"
      value=""
      onChange={vi.fn()}
      options={[
        { value: '', label: 'Barchasi' },
        { value: 'pending', label: 'Kutilmoqda' },
      ]}
    />
  )

  it('keeps the search visible and moves the filters into a sheet', () => {
    stubMedia(CARD_ROWS)
    render(
      <FilterBar search={search} activeCount={2} onClear={vi.fn()}>
        {holat}
      </FilterBar>,
    )
    expect(screen.getByRole('searchbox', { name: 'Ism boʻyicha qidirish' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Holat' })).not.toBeInTheDocument()

    const button = screen.getByRole('button', { name: /Filtrlar/ })
    expect(button).toHaveTextContent('2')
    fireEvent.click(button)

    const sheet = screen.getByRole('dialog', { name: 'Filtrlar' })
    expect(within(sheet).getByRole('combobox', { name: 'Holat' })).toBeInTheDocument()
  })

  it('closes the sheet on Esc, on the backdrop and on "Tayyor"', () => {
    stubMedia(CARD_ROWS)
    render(
      <FilterBar search={search} onClear={vi.fn()}>
        {holat}
      </FilterBar>,
    )
    const open = () => fireEvent.click(screen.getByRole('button', { name: /Filtrlar/ }))
    const sheet = () => screen.queryByRole('dialog', { name: 'Filtrlar' })

    open()
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Filtrlar' }), { key: 'Escape' })
    expect(sheet()).not.toBeInTheDocument()

    open()
    fireEvent.mouseDown(screen.getByTestId('sheet-backdrop'))
    expect(sheet()).not.toBeInTheDocument()

    open()
    fireEvent.click(screen.getByRole('button', { name: 'Tayyor' }))
    expect(sheet()).not.toBeInTheDocument()
  })

  it('clears from inside the sheet and closes it', () => {
    stubMedia(CARD_ROWS)
    const onClear = vi.fn()
    render(
      <FilterBar search={search} activeCount={1} onClear={onClear}>
        {holat}
      </FilterBar>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Filtrlar/ }))
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Filtrlar' })).getByRole('button', {
        name: 'Tozalash',
      }),
    )
    expect(onClear).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog', { name: 'Filtrlar' })).not.toBeInTheDocument()
  })

  it('is one row again at 768px and above', () => {
    render(
      <FilterBar search={search} onClear={vi.fn()}>
        {holat}
      </FilterBar>,
    )
    expect(screen.getByRole('combobox', { name: 'Holat' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Filtrlar/ })).not.toBeInTheDocument()
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
