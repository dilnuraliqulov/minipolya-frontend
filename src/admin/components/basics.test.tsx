import { fireEvent, render, screen } from '@testing-library/react'
import { Check } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
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
  it('shows label, value and a trend', () => {
    render(<KpiCard label="Bugungi bronlar" value="47" delta={{ trend: 'up', text: '+12%' }} />)
    expect(screen.getByText('Bugungi bronlar')).toBeInTheDocument()
    expect(screen.getByText('47')).toBeInTheDocument()
    expect(screen.getByText('+12%').parentElement).toHaveClass('text-success')
    expect(screen.queryByText('Namuna')).not.toBeInTheDocument()
  })

  it('marks a sample delta', () => {
    render(
      <KpiCard label="x" value="1" delta={{ trend: 'down', text: '−4%', sampleRequest: 'R4' }} />,
    )
    expect(screen.getByText('Namuna')).toHaveAttribute('title', expect.stringContaining('R4'))
  })

  it('renders skeletons while loading', () => {
    render(<KpiCard label="x" loading />)
    expect(screen.getAllByTestId('skeleton')).toHaveLength(3)
    expect(screen.queryByText('x')).not.toBeInTheDocument()
  })
})

describe('Skeleton', () => {
  it('is hidden from assistive technology', () => {
    render(<Skeleton className="h-3 w-10" />)
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden')
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
