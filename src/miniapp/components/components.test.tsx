import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../i18n'
import { installFakeTelegram, removeFakeTelegram } from '../test/fakeTelegram'
import { Button } from './Button'
import { EmptyState, ErrorState } from './StateView'
import { SkeletonList } from './Skeleton'

afterEach(() => {
  removeFakeTelegram()
})

describe('Button', () => {
  it('runs onClick with light haptic feedback for main actions', () => {
    const { webApp } = installFakeTelegram()
    const onClick = vi.fn()
    render(
      <Button haptic onClick={onClick}>
        Saqlash
      </Button>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    expect(onClick).toHaveBeenCalledOnce()
    expect(webApp.HapticFeedback.impactOccurred).toHaveBeenCalledWith('light')
  })

  it('does nothing while disabled or loading', () => {
    const onClick = vi.fn()
    const { rerender } = render(
      <Button disabled onClick={onClick}>
        Saqlash
      </Button>,
    )
    fireEvent.click(screen.getByRole('button'))
    rerender(
      <Button loading onClick={onClick}>
        Saqlash
      </Button>,
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is at least 44px tall (the design uses 48)', () => {
    render(<Button>OK</Button>)
    expect(screen.getByRole('button').className).toMatch(/\bmin-h-12\b/)
  })
})

describe('ErrorState', () => {
  it('shows the design text and a "Qayta urinish" button', () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)
    expect(screen.getByRole('heading', { name: 'Xatolik yuz berdi' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Qayta urinish' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

describe('EmptyState', () => {
  it('shows a title, a description and an optional action', () => {
    const onAction = vi.fn()
    render(
      <EmptyState
        title="Boʻsh"
        description="Hech narsa yoʻq"
        actionLabel="Qoʻshish"
        onAction={onAction}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Boʻsh' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Qoʻshish' }))
    expect(onAction).toHaveBeenCalledOnce()
  })
})

describe('SkeletonList', () => {
  it('announces loading to screen readers', () => {
    render(<SkeletonList />)
    expect(screen.getByRole('status', { name: 'Yuklanmoqda' })).toBeInTheDocument()
  })
})
