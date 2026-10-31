import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { configureApiClient, createMemoryTokenStore } from '../../shared/api'
import { PROFILE_FIELDS, type User } from '../api/users'
import { ToastProvider } from '../components/ToastProvider'
import '../i18n'
import { makeUser, stubApi } from '../test/api'
import { markAvailable } from '../test/missing'
import { isProfileComplete } from './profile'
import { useProfileGate } from './useProfileGate'

afterEach(() => {
  vi.unstubAllGlobals()
})

function Booking({ onProceed }: { onProceed: () => void }) {
  const gate = useProfileGate()
  return (
    <>
      <button onClick={() => void gate.require(onProceed)}>Band qilish</button>
      {gate.sheet}
    </>
  )
}

function renderBooking(user: User, onProceed: () => void) {
  configureApiClient({ tokenStore: createMemoryTokenStore() })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['me'], user)
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <Booking onProceed={onProceed} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('isProfileComplete', () => {
  it('needs a first name, a last name and a phone', () => {
    expect(
      isProfileComplete(makeUser({ firstName: 'A', lastName: 'B', phone: '+998901234567' })),
    ).toBe(true)
    expect(isProfileComplete(makeUser({ name: 'From Telegram', phone: '+998901234567' }))).toBe(
      false,
    )
  })
})

describe('useProfileGate — "Profilingizni toʻldiring" before the first booking', () => {
  it('goes straight on when the profile is complete', async () => {
    const onProceed = vi.fn()
    renderBooking(
      makeUser({ firstName: 'Aziz', lastName: 'Karimov', phone: '+998901234567' }),
      onProceed,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Band qilish' }))
    await vi.waitFor(() => expect(onProceed).toHaveBeenCalledOnce())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('asks first, with empty fields (never from Telegram), and goes on after saving', async () => {
    markAvailable(PROFILE_FIELDS)
    const onProceed = vi.fn()
    const user = makeUser({ name: 'Telegram Name' })
    stubApi({ 'PATCH /api/users/me': (body) => ({ ...user, ...(body as object) }) })
    renderBooking(user, onProceed)

    fireEvent.click(screen.getByRole('button', { name: 'Band qilish' }))
    expect(
      await screen.findByRole('dialog', { name: 'Profilingizni toʻldiring' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Ism')).toHaveValue('')
    expect(onProceed).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Ism'), { target: { value: 'Aziz' } })
    fireEvent.change(screen.getByLabelText('Familiya'), { target: { value: 'Karimov' } })
    fireEvent.change(screen.getByLabelText('Telefon raqam'), {
      target: { value: '901234567' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }))

    await vi.waitFor(() => expect(onProceed).toHaveBeenCalledOnce())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the sheet as "Tez orada" while R20 is not shipped', async () => {
    renderBooking(makeUser(), vi.fn())
    fireEvent.click(screen.getByRole('button', { name: 'Band qilish' }))
    expect(await screen.findByText(/Tez orada/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Davom etish' })).toBeDisabled()
  })
})
