import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configureApiClient, createMemoryTokenStore } from '../../shared/api'
import '../i18n'
import { ToastProvider } from '../components/ToastProvider'
import { jsonResponse, stubApi } from '../test/api'
import { makeCard } from '../test/bookings'
import { AddCardSheet } from './AddCardSheet'
import { useCards } from './queries'

const NUMBER = '8600123456789012'
const BIND = { bindingId: 'b1', maskedPhone: '+998 •• ••• •• 67' }
const saved = makeCard({ id: 'new', maskedNumber: '8600 •••• 9012', cardType: 'humo' })

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function setup(props: { onSaved?: (card: typeof saved) => void; onClose?: () => void } = {}) {
  configureApiClient({ tokenStore: createMemoryTokenStore() })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const onSaved = props.onSaved ?? vi.fn()
  const onClose = props.onClose ?? vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AddCardSheet open onClose={onClose} onSaved={onSaved} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return { queryClient, onSaved, onClose }
}

function fillForm(number = NUMBER, expiry = '12/27') {
  fireEvent.change(screen.getByLabelText('Karta raqami'), { target: { value: number } })
  fireEvent.change(screen.getByLabelText('Amal qilish muddati (OO/YY)'), {
    target: { value: expiry },
  })
}

async function toCodeStep() {
  fillForm()
  fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }))
  await screen.findByLabelText('SMS kod')
}

describe('AddCardSheet', () => {
  it('enables Davom etish only at 16 digits and a valid expiry', () => {
    stubApi({})
    setup()
    const next = screen.getByRole('button', { name: 'Davom etish' })
    expect(next).toBeDisabled()
    fillForm('8600 1234 5678 901', '12/27')
    expect(next).toBeDisabled()
    fillForm(NUMBER, '13/27')
    expect(next).toBeDisabled()
    fillForm(NUMBER, '12/27')
    expect(next).toBeEnabled()
  })

  it('shows Uzcard or Humo from the first four digits', () => {
    stubApi({})
    setup()
    const number = screen.getByLabelText('Karta raqami')
    fireEvent.change(number, { target: { value: '8600' } })
    expect(screen.getByText('UZCARD')).toBeInTheDocument()
    fireEvent.change(number, { target: { value: '9860 12' } })
    expect(screen.getByText('HUMO')).toBeInTheDocument()
    expect(screen.queryByText('UZCARD')).not.toBeInTheDocument()
  })

  it('refuses another card system and a past month before sending', () => {
    const api = stubApi({})
    setup()
    fillForm('4111 1111 1111 1111', '10/20')
    expect(
      screen.getByText('Faqat Uzcard (8600…) va Humo (9860…) kartalari qabul qilinadi'),
    ).toBeInTheDocument()
    expect(screen.getByText('Kartaning amal qilish muddati tugagan')).toBeInTheDocument()
    expect(screen.getByLabelText('Karta raqami')).toHaveAttribute('aria-invalid', 'true')
    const next = screen.getByRole('button', { name: 'Davom etish' })
    expect(next).toBeDisabled()
    fireEvent.click(next)
    expect(api).not.toHaveBeenCalled()
  })

  it('says a short number or an unfinished expiry once the field is left', () => {
    stubApi({})
    setup()
    const number = screen.getByLabelText('Karta raqami')
    const expiry = screen.getByLabelText('Amal qilish muddati (OO/YY)')
    fireEvent.change(number, { target: { value: '8600 1234' } })
    expect(screen.queryByText('Karta raqami 16 ta raqamdan iborat boʻlishi kerak')).toBeNull()
    fireEvent.blur(number)
    expect(
      screen.getByText('Karta raqami 16 ta raqamdan iborat boʻlishi kerak'),
    ).toBeInTheDocument()
    fireEvent.change(expiry, { target: { value: '1' } })
    fireEvent.blur(expiry)
    expect(
      screen.getByText('Muddatni OO/YY koʻrinishida kiriting, masalan 08/28'),
    ).toBeInTheDocument()
  })

  it('accepts a pasted spaced number', async () => {
    stubApi({})
    setup()
    // A paste reaches a controlled input as one change event carrying the whole text.
    fireEvent.change(screen.getByLabelText('Karta raqami'), {
      target: { value: '8600 1234 5678 9012' },
    })
    expect(screen.getByLabelText('Karta raqami')).toHaveValue('8600 1234 5678 9012')
    fireEvent.change(screen.getByLabelText('Amal qilish muddati (OO/YY)'), {
      target: { value: '1227' },
    })
    expect(screen.getByLabelText('Amal qilish muddati (OO/YY)')).toHaveValue('12/27')
    expect(screen.getByRole('button', { name: 'Davom etish' })).toBeEnabled()
  })

  it('posts the digits and shows the masked phone', async () => {
    const api = stubApi({ 'POST /api/cards': BIND })
    setup()
    await toCodeStep()
    expect(api.calls('POST /api/cards')).toEqual([{ cardNumber: NUMBER, expiry: '12/27' }])
    expect(screen.getByText('Kod +998 •• ••• •• 67 raqamiga yuborildi')).toBeInTheDocument()
  })

  it('maps a 400 on the card to the wrong-number text', async () => {
    stubApi({ 'POST /api/cards': jsonResponse(400, null, 'Invalid card') })
    setup()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }))
    expect(
      await screen.findByText('Karta raqami yoki amal qilish muddati notoʻgʻri'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('SMS kod')).not.toBeInTheDocument()
  })

  it('shows the no-internet text on a network failure and retries', async () => {
    let down = true
    stubApi({
      'POST /api/cards': () => {
        if (down) throw new TypeError('Failed to fetch')
        return BIND
      },
    })
    setup()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }))
    expect(await screen.findByText('Internet aloqasi yoʻq')).toBeInTheDocument()
    down = false
    fireEvent.click(screen.getByRole('button', { name: 'Qayta urinish' }))
    expect(await screen.findByLabelText('SMS kod')).toBeInTheDocument()
  })

  it('accepts a pasted code and saves the card', async () => {
    const onSaved = vi.fn()
    const api = stubApi({ 'POST /api/cards': BIND, 'POST /api/cards/confirm': saved })
    const { queryClient } = setup({ onSaved })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    await toCodeStep()
    fireEvent.change(screen.getByLabelText('SMS kod'), { target: { value: '111111' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tasdiqlash' }))
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved))
    expect(api.calls('POST /api/cards/confirm')).toEqual([{ bindingId: 'b1', smsCode: '111111' }])
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['cards'] })
  })

  it('keeps Tasdiqlash disabled until six digits', async () => {
    stubApi({ 'POST /api/cards': BIND })
    setup()
    await toCodeStep()
    fireEvent.change(screen.getByLabelText('SMS kod'), { target: { value: '12a34' } })
    expect(screen.getByLabelText('SMS kod')).toHaveValue('1234')
    expect(screen.getByRole('button', { name: 'Tasdiqlash' })).toBeDisabled()
  })

  it('maps a 400 on confirm to the wrong-code text and clears the code', async () => {
    stubApi({
      'POST /api/cards': BIND,
      'POST /api/cards/confirm': jsonResponse(400, null, 'Invalid code'),
    })
    setup()
    await toCodeStep()
    fireEvent.change(screen.getByLabelText('SMS kod'), { target: { value: '111111' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tasdiqlash' }))
    expect(await screen.findByText('Kod notoʻgʻri. Qaytadan kiriting.')).toBeInTheDocument()
    expect(screen.getByLabelText('SMS kod')).toHaveValue('')
  })

  it('disables resend for 60 s, then posts again and uses the new binding', async () => {
    let n = 0
    const api = stubApi({
      'POST /api/cards': () => ({ bindingId: `b${++n}`, maskedPhone: BIND.maskedPhone }),
      'POST /api/cards/confirm': saved,
    })
    setup()
    await toCodeStep()
    expect(screen.getByRole('button', { name: 'Kodni qayta yuborish (1:00)' })).toBeDisabled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(screen.getByRole('button', { name: 'Kodni qayta yuborish (0:30)' })).toBeDisabled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    const resend = screen.getByRole('button', { name: 'Yangi kod yuborish' })
    expect(resend).toBeEnabled()
    fireEvent.click(resend)
    await vi.waitFor(() => expect(api.calls('POST /api/cards')).toHaveLength(2))
    expect(api.calls('POST /api/cards')[1]).toEqual({ cardNumber: NUMBER, expiry: '12/27' })
    const confirm = await screen.findByRole('button', { name: 'Tasdiqlash' })
    fireEvent.change(screen.getByLabelText('SMS kod'), { target: { value: '222222' } })
    fireEvent.click(confirm)
    await vi.waitFor(() =>
      expect(api.calls('POST /api/cards/confirm')).toEqual([
        { bindingId: 'b2', smsCode: '222222' },
      ]),
    )
  })

  it('says the code expired after 60 s without a confirm', async () => {
    stubApi({ 'POST /api/cards': BIND })
    setup()
    await toCodeStep()
    expect(screen.queryByText('Kod muddati tugadi — yangi kod soʻrang')).not.toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(screen.getByText('Kod muddati tugadi — yangi kod soʻrang')).toBeInTheDocument()
  })

  it('accepts pasted text with extra spaces in the number and the expiry', () => {
    stubApi({})
    setup()
    fireEvent.change(screen.getByLabelText('Karta raqami'), {
      target: { value: '8600  1234  5678  9012' },
    })
    expect(screen.getByLabelText('Karta raqami')).toHaveValue('8600 1234 5678 9012')
    fireEvent.change(screen.getByLabelText('Amal qilish muddati (OO/YY)'), {
      target: { value: '12 / 27' },
    })
    expect(screen.getByLabelText('Amal qilish muddati (OO/YY)')).toHaveValue('12/27')
    expect(screen.getByRole('button', { name: 'Davom etish' })).toBeEnabled()
  })

  it('has no maxLength that would cut a pasted number or expiry', () => {
    stubApi({})
    setup()
    expect(screen.getByLabelText('Karta raqami')).not.toHaveAttribute('maxlength')
    expect(screen.getByLabelText('Amal qilish muddati (OO/YY)')).not.toHaveAttribute('maxlength')
  })

  it('refreshes the cards list even if the sheet was closed before confirm answered', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    const api = stubApi({
      'GET /api/cards': [],
      'POST /api/cards': BIND,
      'POST /api/cards/confirm': async () => {
        await gate
        return saved
      },
    })
    configureApiClient({ tokenStore: createMemoryTokenStore() })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function Probe() {
      useCards()
      return null
    }
    const tree = (open: boolean) => (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <Probe />
          <AddCardSheet open={open} onClose={() => {}} onSaved={() => {}} />
        </ToastProvider>
      </QueryClientProvider>
    )
    const view = render(tree(true))
    await toCodeStep()
    fireEvent.change(screen.getByLabelText('SMS kod'), { target: { value: '111111' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tasdiqlash' }))
    await vi.waitFor(() => expect(api.calls('POST /api/cards/confirm')).toHaveLength(1))
    const before = api.calls('GET /api/cards').length
    view.rerender(tree(false))
    release()
    await vi.waitFor(() => expect(api.calls('GET /api/cards').length).toBeGreaterThan(before))
  })

  it('never leaks the number, expiry or code', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    )
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    stubApi({ 'POST /api/cards': BIND, 'POST /api/cards/confirm': saved })
    const onSaved = vi.fn()
    const { queryClient } = setup({ onSaved })
    await toCodeStep()
    fireEvent.change(screen.getByLabelText('SMS kod'), { target: { value: '111111' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tasdiqlash' }))
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled())

    const secrets = [NUMBER, '1234 5678', '111111']
    const seen = JSON.stringify([
      spies.map((s) => s.mock.calls),
      setItem.mock.calls,
      queryClient
        .getQueryCache()
        .getAll()
        .map((q) => [q.queryKey, q.state.data]),
      queryClient
        .getMutationCache()
        .getAll()
        .map((m) => [m.options.mutationKey, m.state.variables]),
    ])
    for (const secret of secrets) expect(seen).not.toContain(secret)
  })
})
