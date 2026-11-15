import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { stubMedia } from '../test-utils'
import { DataTable, RowCard, type Column } from './DataTable'
import { CARD_ROWS } from './useMediaQuery'

interface Row {
  id: string
  name: string
}

const columns: Column<Row>[] = [
  { key: 'name', header: 'Ism', render: (row) => row.name, sortable: true },
  { key: 'id', header: 'ID', render: (row) => row.id },
]
const rows: Row[] = [
  { id: 'a', name: 'Jamshid' },
  { id: 'b', name: 'Dilnoza' },
]

describe('DataTable', () => {
  it('renders rows', () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />)
    expect(screen.getAllByRole('row')).toHaveLength(3) // header + 2
    expect(screen.getByText('Dilnoza')).toBeInTheDocument()
  })

  it('reports sort changes: asc, then desc', () => {
    const onSortChange = vi.fn()
    const { rerender } = render(
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onSortChange={onSortChange} />,
    )
    // Only sortable columns get a button.
    expect(screen.queryByRole('button', { name: 'ID' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ism' }))
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'name', direction: 'asc' })

    rerender(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        sort={{ key: 'name', direction: 'asc' }}
        onSortChange={onSortChange}
      />,
    )
    expect(screen.getByRole('columnheader', { name: 'Ism' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ism' }))
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'name', direction: 'desc' })
  })

  it('opens a row by click or Enter, with a chevron column', () => {
    const onRowClick = vi.fn()
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={onRowClick} />)
    const row = screen.getByText('Jamshid').closest('tr')!
    expect(row).toHaveClass('hover:bg-hover')
    expect(row.querySelectorAll('svg')).toHaveLength(1) // chevron
    fireEvent.click(row)
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(onRowClick).toHaveBeenCalledTimes(2)
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })

  it('highlights the selected row', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        selectedKey="b"
        onRowClick={vi.fn()}
      />,
    )
    expect(screen.getByText('Dilnoza').closest('tr')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Jamshid').closest('tr')).toHaveAttribute('aria-selected', 'false')
  })

  it('is a plain table without clickable rows: no grid role, no focusable rows', () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} label="Roʻyxat" />)
    expect(screen.getByRole('table', { name: 'Roʻyxat' })).toBeInTheDocument()
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    const row = screen.getByText('Jamshid').closest('tr')!
    expect(row).not.toHaveAttribute('tabindex')
    expect(row).not.toHaveAttribute('aria-selected')
  })

  it('with clickable rows it is a grid with one tab stop and arrow-key navigation', () => {
    const onRowClick = vi.fn()
    const many = [...rows, { id: 'c', name: 'Sardor' }]
    render(
      <DataTable
        columns={columns}
        rows={many}
        rowKey={(r) => r.id}
        onRowClick={onRowClick}
        label="Roʻyxat"
      />,
    )
    const grid = screen.getByRole('grid', { name: 'Roʻyxat' })
    const [first, second, third] = many.map((r) => within(grid).getByText(r.name).closest('tr')!)
    // One tab stop: the first row; the others are reached with the arrows.
    expect(first).toHaveAttribute('tabindex', '0')
    expect(second).toHaveAttribute('tabindex', '-1')
    first!.focus()
    fireEvent.keyDown(first!, { key: 'ArrowDown' })
    expect(second).toHaveFocus()
    expect(second).toHaveAttribute('tabindex', '0')
    expect(first).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(second!, { key: 'End' })
    expect(third).toHaveFocus()
    fireEvent.keyDown(third!, { key: 'ArrowDown' })
    expect(third).toHaveFocus()
    fireEvent.keyDown(third!, { key: 'Home' })
    expect(first).toHaveFocus()
    fireEvent.keyDown(first!, { key: 'ArrowUp' })
    expect(first).toHaveFocus()
    fireEvent.keyDown(first!, { key: ' ' })
    expect(onRowClick).toHaveBeenCalledWith(many[0])
  })

  it('puts the tab stop on the selected row', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        selectedKey="b"
        onRowClick={vi.fn()}
      />,
    )
    expect(screen.getByText('Dilnoza').closest('tr')).toHaveAttribute('tabindex', '0')
    expect(screen.getByText('Jamshid').closest('tr')).toHaveAttribute('tabindex', '-1')
  })

  it('shows loading, empty and error states', () => {
    const onRetry = vi.fn()
    const { rerender } = render(
      <DataTable columns={columns} rows={undefined} rowKey={(r) => r.id} loading loadingRows={3} />,
    )
    expect(screen.getAllByTestId('skeleton')).toHaveLength(6)

    rerender(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        empty={{ title: 'Arizalar yoʻq' }}
      />,
    )
    expect(screen.getByText('Arizalar yoʻq')).toBeInTheDocument()

    rerender(
      <DataTable columns={columns} rows={undefined} rowKey={(r) => r.id} error onRetry={onRetry} />,
    )
    fireEvent.click(
      within(screen.getByRole('alert')).getByRole('button', { name: 'Qayta urinish' }),
    )
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

describe('DataTable below 768px', () => {
  afterEach(() => vi.unstubAllGlobals())

  const card = (row: Row) => (
    <RowCard title={row.name} status={<span>Faol</span>}>
      <dt>ID</dt>
      <dd>{row.id}</dd>
    </RowCard>
  )

  it('renders a card per row instead of the table, and opens one on tap', () => {
    stubMedia(CARD_ROWS)
    const onRowClick = vi.fn()
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        card={card}
        onRowClick={onRowClick}
        label="Foydalanuvchilar"
      />,
    )
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Foydalanuvchilar' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: /Jamshid/ }))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })

  it('keeps the loading, empty and error states in card mode', () => {
    stubMedia(CARD_ROWS)
    const onRetry = vi.fn()
    const { rerender } = render(
      <DataTable columns={columns} rows={undefined} rowKey={(r) => r.id} card={card} loading />,
    )
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(document.querySelector('[aria-busy]')).toBeInTheDocument()

    rerender(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        card={card}
        empty={{ title: 'Arizalar yoʻq' }}
      />,
    )
    expect(screen.getByText('Arizalar yoʻq')).toBeInTheDocument()

    rerender(
      <DataTable
        columns={columns}
        rows={undefined}
        rowKey={(r) => r.id}
        card={card}
        error
        onRetry={onRetry}
      />,
    )
    fireEvent.click(
      within(screen.getByRole('alert')).getByRole('button', { name: 'Qayta urinish' }),
    )
    expect(onRetry).toHaveBeenCalledOnce()
  })

  // Review Focus 3: a table with no card renderer must stay readable.
  it('without a card renderer it stays a table with a sticky first column', () => {
    stubMedia(CARD_ROWS)
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Jamshid').closest('td')).toHaveClass('max-md:sticky')
    expect(screen.getByRole('columnheader', { name: 'Ism' })).toHaveClass('max-md:sticky')
  })

  it('is the table again at 768px and above', () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} card={card} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
