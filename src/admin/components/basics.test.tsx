import { fireEvent, render, screen } from '@testing-library/react'
import { Check } from 'lucide-react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { initials } from './initials'
import { KpiCard } from './KpiCard'
import { Skeleton } from './Skeleton'
import { EmptyState, ErrorState } from './States'
import { StatusBadge } from './StatusBadge'

describe('Button', () => {
  it('renders each variant with token classes and handles clicks', () => {
    const onClick = vi.fn()
    const { rerender } = render(
      <Button icon={Check} onClick={onClick}>
        Tasdiqlash
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Tasdiqlash' })
    expect(button).toHaveClass('bg-accent', 'text-on-accent')
    expect(button).toHaveAttribute('type', 'button')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()

    rerender(<Button variant="secondary">x</Button>)
    expect(screen.getByRole('button')).toHaveClass('border-border', 'bg-background')
    rerender(<Button variant="danger-outline">x</Button>)
    expect(screen.getByRole('button')).toHaveClass('border-danger', 'text-danger')
    rerender(<Button variant="text">x</Button>)
    expect(screen.getByRole('button')).toHaveClass('text-link')
  })

  it('does not fire when disabled', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        x
      </Button>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('StatusBadge', () => {
  it('maps tones to status tokens', () => {
    render(<StatusBadge tone="warning">Kutilmoqda</StatusBadge>)
    expect(screen.getByText('Kutilmoqda')).toHaveClass('bg-warning-soft', 'text-warning')
  })
})

describe('KpiCard', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows label, value and a trend', () => {
    render(<KpiCard label="Bugungi bronlar" value="47" delta={{ trend: 'up', text: '+12%' }} />)
    expect(screen.getByText('Bugungi bronlar')).toBeInTheDocument()
    expect(screen.getByText('47')).toBeInTheDocument()
    expect(screen.getByText('+12%').parentElement).toHaveClass('text-success')
    expect(screen.queryByText('Namuna')).not.toBeInTheDocument()
  })

  it('shows the unit apart from the value, smaller and secondary', () => {
    render(<KpiCard label="Toʻlovlar" value="48 650 000" unit="so'm" sublabel="Shu oy" />)
    expect(screen.getByText('48 650 000')).toHaveClass('text-5xl')
    expect(screen.getByText("so'm")).toHaveClass('text-lg', 'text-secondary')
    expect(screen.getByText('Shu oy')).toHaveClass('text-xs')
  })

  it('marks only the sample comparison, at the end of its line', () => {
    render(
      <KpiCard label="x" value="1" delta={{ trend: 'down', text: '−4%', sampleRequest: 'R4' }} />,
    )
    const tag = screen.getByText('Namuna')
    expect(tag).toHaveAttribute('title', expect.stringContaining('R4'))
    expect(tag.parentElement).toBe(screen.getByText('−4%').parentElement)
    expect(tag.parentElement?.lastElementChild).toBe(tag)
  })

  it('renders skeletons while loading', () => {
    render(<KpiCard label="x" loading />)
    expect(screen.getAllByTestId('skeleton')).toHaveLength(4)
    expect(screen.queryByText('x')).not.toBeInTheDocument()
  })

  it('is a focusable link with a hover chevron when it has a destination', () => {
    render(
      <MemoryRouter>
        <KpiCard label="Bugungi bronlar" value="47" to="/bronlar" />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /Bugungi bronlar/ })
    expect(link).toHaveAttribute('href', '/bronlar')
    link.focus()
    expect(link).toHaveFocus()
    expect(link).toHaveClass('focus-visible:outline-accent', 'hover:border-accent/60')
    // outline-none would cancel the focus ring in Tailwind v4.
    expect(link).not.toHaveClass('outline-none')
    expect(screen.getByTestId('kpi-chevron')).toHaveClass('opacity-0', 'group-hover:opacity-100')
  })

  it('is neither a link nor styled as one without a destination', () => {
    const { container } = render(<KpiCard label="Toʻlovlar" value="1" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByTestId('kpi-chevron')).not.toBeInTheDocument()
    expect(container.firstElementChild?.className).not.toMatch(/hover:/)
  })

  it('drops the hover lift and transitions with reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    render(
      <MemoryRouter>
        <KpiCard label="x" value="1" to="/bronlar" />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link')
    expect(link.className).not.toMatch(/translate|transition/)
    expect(link).toHaveClass('hover:border-accent/60')
  })
})

describe('Skeleton', () => {
  it('is hidden from assistive technology', () => {
    render(<Skeleton className="h-3 w-10" />)
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden')
  })

  it('takes a radius in place of its default one', () => {
    render(<Skeleton className="size-9 rounded-full" />)
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-full')
    expect(screen.getByTestId('skeleton')).not.toHaveClass('rounded-xs')
  })
})

describe('Avatar', () => {
  it('shows initials', () => {
    expect(initials('Aziz Rahimov')).toBe('AR')
    expect(initials('  bobur  ')).toBe('B')
    expect(initials('Oʻtkir Ali Valiyev')).toBe('OV')
    render(<Avatar name="Jamshid Karimov" />)
    expect(screen.getByText('JK')).toBeInTheDocument()
  })
})

describe('States', () => {
  it('empty state shows title and description', () => {
    render(<EmptyState title="Arizalar yoʻq" description="Keyinroq qarang" />)
    expect(screen.getByText('Arizalar yoʻq')).toBeInTheDocument()
    expect(screen.getByText('Keyinroq qarang')).toBeInTheDocument()
  })

  it('error state retries', () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Maʼlumotlarni yuklab boʻlmadi')
    fireEvent.click(screen.getByRole('button', { name: 'Qayta urinish' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
