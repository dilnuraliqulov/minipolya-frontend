import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfirmModal, ReasonModal } from './Modal'
import { TOAST_DURATION_MS, ToastProvider, useToast } from './Toast'

describe('ConfirmModal', () => {
  it('renders nothing when closed', () => {
    render(
      <ConfirmModal
        open={false}
        title="t"
        message="m"
        confirmLabel="Ha"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('confirms, cancels, and closes on Escape', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(
      <ConfirmModal
        open
        title="Arizani tasdiqlash"
        message="Tasdiqlaysizmi?"
        confirmLabel="Tasdiqlash"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    )
    expect(screen.getByRole('dialog', { name: 'Arizani tasdiqlash' })).toHaveAttribute(
      'aria-modal',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tasdiqlash' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('ReasonModal', () => {
  it('requires a reason of the minimum length; chips fill it in', () => {
    const onConfirm = vi.fn()
    render(
      <ReasonModal
        open
        title="Arizani rad etish"
        chips={['Maʼlumotlar toʻliq emas', 'Boshqa']}
        minLength={10}
        confirmLabel="Rad etish"
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    )
    const confirm = screen.getByRole('button', { name: 'Rad etish' })
    const field = screen.getByRole('textbox', { name: /Sabab \(kamida 10 ta belgi\)/ })
    expect(confirm).toBeDisabled()
    expect(field).toHaveFocus()

    fireEvent.change(field, { target: { value: '  qisqa   ' } })
    expect(confirm).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Maʼlumotlar toʻliq emas' }))
    expect(field).toHaveValue('Maʼlumotlar toʻliq emas')
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledWith('Maʼlumotlar toʻliq emas')
  })

  it('keeps focus in the field while typing', () => {
    render(
      <ReasonModal
        open
        title="t"
        chips={['a']}
        confirmLabel="Rad etish"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const field = screen.getByRole('textbox')
    fireEvent.change(field, { target: { value: 'birinchi harf' } })
    expect(field).toHaveFocus()
  })
})

function ToastButtons() {
  const toast = useToast()
  return (
    <>
      <button onClick={() => toast.success('Maydon tasdiqlandi')}>ok</button>
      <button onClick={() => toast.error('Ariza rad etildi')}>err</button>
    </>
  )
}

describe('Toast', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows messages and removes them after a while', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <ToastButtons />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByText('ok'))
    fireEvent.click(screen.getByText('err'))
    const region = screen.getByRole('status')
    expect(region).toHaveTextContent('Maydon tasdiqlandi')
    expect(region).toHaveTextContent('Ariza rad etildi')
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS))
    expect(region).toBeEmptyDOMElement()
  })

  it('throws outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ToastButtons />)).toThrow('ToastProvider')
    vi.restoreAllMocks()
  })
})
