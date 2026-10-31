import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DataTable, type Column } from './DataTable'

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
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} selectedKey="b" />)
    expect(screen.getByText('Dilnoza').closest('tr')).toHaveAttribute('aria-selected', 'true')
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
