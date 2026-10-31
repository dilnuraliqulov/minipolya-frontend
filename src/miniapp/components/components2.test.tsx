import { act, fireEvent, render, screen } from '@testing-library/react'
import { User } from 'lucide-react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../i18n'
import { installFakeTelegram, removeFakeTelegram } from '../test/fakeTelegram'
import { Badge } from './Badge'
import { BottomSheet } from './BottomSheet'
import { Card } from './Card'
import { Chip } from './Chip'
import { Input } from './Input'
import { ListRow } from './ListRow'
import { Switch } from './Switch'
import { ToastProvider } from './ToastProvider'
import { useToast } from './toast'

afterEach(() => {
  removeFakeTelegram()
  vi.useRealTimers()
})

describe('Input', () => {
  it('labels the field and shows a hint', () => {
    render(<Input label="Ism" hint="Izoh" value="" onChange={() => {}} />)
    const field = screen.getByLabelText('Ism')
    expect(field).toHaveAccessibleDescription('Izoh')
    expect(field).not.toHaveAttribute('aria-invalid')
  })

  it('shows an error instead of the hint and marks the field invalid', () => {
    render(<Input label="Telefon" hint="Izoh" error="Xato" value="" onChange={() => {}} />)
    const field = screen.getByLabelText('Telefon')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription('Xato')
    expect(screen.queryByText('Izoh')).not.toBeInTheDocument()
  })
})

describe('Switch', () => {
  it('is a labelled switch that toggles', () => {
    const onChange = vi.fn()
    render(<Switch label="Ega rejimi" checked={false} onChange={onChange} />)
    const control = screen.getByRole('switch', { name: 'Ega rejimi' })
    expect(control).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(control)
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('ListRow', () => {
  it('is a button with its label and value', () => {
    const onClick = vi.fn()
    render(<ListRow icon={User} label="Til" value="Oʻzbekcha" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: /Til.*Oʻzbekcha/ }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})

describe('Badge, Chip, Card', () => {
  it('render their content', () => {
    const onClick = vi.fn()
    render(
      <Card>
        <Badge tone="success">Tasdiqlangan</Badge>
        <Chip selected onClick={onClick}>
          Hammasi
        </Chip>
      </Card>,
    )
    expect(screen.getByText('Tasdiqlangan')).toBeInTheDocument()
    const chip = screen.getByRole('button', { name: 'Hammasi' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(chip)
    expect(onClick).toHaveBeenCalledOnce()
  })
})

describe('BottomSheet', () => {
  it('is a dialog with a title that closes from the scrim and Escape', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open title="Tilni tanlang" onClose={onClose}>
        <p>content</p>
      </BottomSheet>,
    )
    expect(screen.getByRole('dialog', { name: 'Tilni tanlang' })).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('sheet-scrim'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it("closes with Telegram's BackButton", () => {
    const fake = installFakeTelegram()
    const onClose = vi.fn()
    render(
      <BottomSheet open title="Mavzu" onClose={onClose}>
        <p>content</p>
      </BottomSheet>,
    )
    act(() => fake.backButton.click())
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders nothing while closed', () => {
    render(
      <BottomSheet open={false} title="Mavzu" onClose={() => {}}>
        <p>content</p>
      </BottomSheet>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Toast', () => {
  function Trigger() {
    const toast = useToast()
    return <button onClick={() => toast.show('Saqlandi')}>go</button>
  }

  it('announces a message and hides it after a while', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'go' }))
    expect(screen.getByRole('status')).toHaveTextContent('Saqlandi')
    act(() => vi.advanceTimersByTime(4000))
    expect(screen.queryByText('Saqlandi')).not.toBeInTheDocument()
  })
})
