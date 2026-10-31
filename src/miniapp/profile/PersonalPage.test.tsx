import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PROFILE_FIELDS } from '../api/users'
import { makeUser, stubApi } from '../test/api'
import { markAvailable } from '../test/missing'
import { renderApp } from '../test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Shaxsiy maʼlumotlar', () => {
  it('is "Tez orada" while the backend cannot save first name, last name and phone (R20)', async () => {
    const api = stubApi({ 'GET /api/users/me': makeUser({ phone: '+998901234567' }) })
    renderApp('/profile/personal')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Shaxsiy maʼlumotlar' }),
    ).toBeInTheDocument()
    expect(await screen.findByLabelText('Ism')).toBeDisabled()
    expect(screen.getByLabelText('Familiya')).toBeDisabled()
    expect(screen.getByLabelText('Telefon raqam')).toHaveValue('+998 90 123 45 67')
    expect(screen.getByText(/Tez orada/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Saqlash' })).toBeDisabled()
    expect(api.calls('PATCH /api/users/me')).toHaveLength(0)
  })

  it('never fills the name from Telegram: only what the user entered (firstName / lastName)', async () => {
    markAvailable(PROFILE_FIELDS)
    stubApi({ 'GET /api/users/me': makeUser({ name: 'Telegram Name' }) })
    renderApp('/profile/personal')
    expect(await screen.findByLabelText('Ism')).toHaveValue('')
    expect(screen.getByLabelText('Familiya')).toHaveValue('')
  })

  it('validates, then saves firstName, lastName and +998 phone once R20 ships', async () => {
    markAvailable(PROFILE_FIELDS)
    const user = makeUser({ firstName: 'Aziz', lastName: 'Karimov' })
    const api = stubApi({
      'GET /api/users/me': user,
      'PATCH /api/users/me': (body) => ({ ...user, ...(body as object) }),
    })
    renderApp('/profile/personal')

    const phone = await screen.findByLabelText('Telefon raqam')
    expect(screen.getByLabelText('Ism')).toHaveValue('Aziz')
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    expect(await screen.findByText('Telefon raqamni kiriting')).toBeInTheDocument()

    fireEvent.change(phone, { target: { value: '+998 90 12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    expect(
      await screen.findByText('Raqam +998 XX XXX XX XX formatida boʻlishi kerak'),
    ).toBeInTheDocument()

    fireEvent.change(phone, { target: { value: '+998 90 123 45 67' } })
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    expect(await screen.findByText('Saqlandi')).toBeInTheDocument()
    expect(api.calls('PATCH /api/users/me')).toEqual([
      { firstName: 'Aziz', lastName: 'Karimov', phone: '+998901234567' },
    ])
  })
})
