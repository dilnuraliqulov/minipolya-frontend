import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, makeUser, stubApi } from '../test/api'
import { renderApp } from '../test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Shaxsiy maʼlumotlar', () => {
  it('never fills the name from Telegram: only what the user entered (firstName / lastName)', async () => {
    stubApi({ 'GET /api/users/me': makeUser({ name: 'Telegram Name' }) })
    renderApp('/profile/personal')
    expect(await screen.findByLabelText('Ism')).toHaveValue('')
    expect(screen.getByLabelText('Familiya')).toHaveValue('')
  })

  it('validates, then saves firstName, lastName and +998 phone', async () => {
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

  it('shows a phone another account has (409 PHONE_TAKEN) under the phone field', async () => {
    const user = makeUser({ firstName: 'Aziz', lastName: 'Karimov', phone: '+998901234567' })
    stubApi({
      'GET /api/users/me': user,
      'PATCH /api/users/me': jsonResponse(
        409,
        null,
        'Phone is already used by another account',
        'PHONE_TAKEN',
      ),
    })
    renderApp('/profile/personal')

    const phone = await screen.findByLabelText('Telefon raqam')
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    expect(
      await screen.findByText('Bu raqam boshqa hisobga bogʻlangan. Boshqa raqam kiriting.'),
    ).toBeInTheDocument()
    expect(phone).toHaveAccessibleDescription(/Bu raqam boshqa hisobga bogʻlangan/)

    fireEvent.change(phone, { target: { value: '+998 90 765 43 21' } })
    expect(screen.queryByText(/Bu raqam boshqa hisobga/)).not.toBeInTheDocument()
  })
})
