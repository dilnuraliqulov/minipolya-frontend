import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configureApiClient, createMemoryTokenStore, getTokenStore } from '../../shared/api'
import type { User } from '../api/types'
import { ToastProvider } from '../components/Toast'
import { queryClient } from '../queryClient'
import { routes } from '../routes'
import { logout, resetSessionForTests, restoreSession, unauthorizedReason } from './session'

const admin: User = {
  id: 'u1',
  name: 'Aziz Rahimov',
  username: 'aziz',
  language: 'uz',
  isOwner: false,
  isAdmin: true,
  createdAt: '2026-10-01T10:00:00Z',
}

function json(status: number, body: object) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function loginFails(status: number, code?: string, data: unknown = null, message = 'x') {
  return json(status, { success: false, data, message, ...(code && { code }) })
}

/** The login endpoint answers `login`; anything else (the overview) a plain 404. */
function mockLogin(login: () => Promise<Response>) {
  const fetchMock = vi.fn(async (input: string) =>
    new URL(input).pathname === '/api/auth/admin/login'
      ? login()
      : loginFails(404, undefined, null, 'Not found'),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function renderLogin() {
  await restoreSession()
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return router
}

function fillIn(username = 'aziz', password = 'correct horse battery') {
  fireEvent.change(screen.getByLabelText('Login'), { target: { value: username } })
  fireEvent.change(screen.getByLabelText('Parol'), { target: { value: password } })
}

/** What pressing Enter in either field does: submit the form. */
function pressEnter() {
  fireEvent.submit(screen.getByRole('form', { name: 'Kirish' }))
}

describe('admin login page', () => {
  beforeEach(() => {
    resetSessionForTests()
    queryClient.clear()
    configureApiClient({
      tokenStore: createMemoryTokenStore(),
      onUnauthorized: (error) => logout(unauthorizedReason(error)),
      onAccountBlocked: () => logout('blocked'),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('has a login and a password field that password managers recognise', async () => {
    await renderLogin()
    expect(screen.getByLabelText('Login')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Parol')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByLabelText('Parol')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Kirish' })).toHaveAttribute('type', 'submit')
    expect(screen.queryByText(/roʻyxatdan|unutdingizmi|parolni oʻzgartirish/i)).toBeNull()
  })

  it('shows and hides the password with the eye button', async () => {
    await renderLogin()
    fireEvent.click(screen.getByRole('button', { name: 'Parolni koʻrsatish' }))
    expect(screen.getByLabelText('Parol')).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'Parolni yashirish' }))
    expect(screen.getByLabelText('Parol')).toHaveAttribute('type', 'password')
  })

  it('cannot be submitted with an empty field', async () => {
    const fetchMock = mockLogin(async () => json(200, {}))
    await renderLogin()
    expect(screen.getByRole('button', { name: 'Kirish' })).toBeDisabled()
    fillIn('aziz', '')
    pressEnter()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('logs in on Enter, stores the token and opens the overview', async () => {
    const fetchMock = mockLogin(async () =>
      json(200, { success: true, data: { token: 'x.e30.y', user: admin }, message: null }),
    )
    const router = await renderLogin()
    fillIn('aziz', 'correct horse battery')
    pressEnter()

    expect(await screen.findByRole('heading', { name: 'Bosh sahifa' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(getTokenStore().get()).toBe('x.e30.y')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(new URL(url).pathname).toBe('/api/auth/admin/login')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ username: 'aziz', password: 'correct horse battery' }))
  })

  it('shows a loading button while the request is in flight', async () => {
    let answer: (response: Response) => void = () => {}
    mockLogin(() => new Promise((resolve) => (answer = resolve)))
    await renderLogin()
    fillIn()
    pressEnter()

    const button = await screen.findByRole('button', { name: 'Kirish' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByLabelText('Login')).toBeDisabled()

    answer(loginFails(401, 'INVALID_CREDENTIALS'))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kirish' })).toHaveAttribute('aria-busy', 'false')
  })

  it.each([
    [
      'a wrong login or password',
      () => loginFails(401, 'INVALID_CREDENTIALS'),
      'Login yoki parol notoʻgʻri',
    ],
    [
      'a locked account, with the minutes left',
      () => loginFails(423, 'ACCOUNT_LOCKED', { minutesRemaining: 12 }),
      'Juda koʻp urinish. 12 daqiqadan keyin qayta urinib koʻring',
    ],
    [
      'too many attempts from this address',
      () => loginFails(429, 'TOO_MANY_ATTEMPTS', { minutesRemaining: 7 }),
      'Juda koʻp urinish. Birozdan keyin qayta urinib koʻring',
    ],
    [
      'a blocked account',
      () => loginFails(403, 'ACCOUNT_BLOCKED', null, 'Account is blocked'),
      'Hisobingiz bloklangan',
    ],
    [
      'a server error',
      () => loginFails(500, undefined, null, 'Internal server error'),
      'Server bilan bogʻlanib boʻlmadi',
    ],
    [
      'a network failure',
      () => {
        throw new TypeError('Failed to fetch')
      },
      'Server bilan bogʻlanib boʻlmadi',
    ],
  ])('explains %s under the form', async (_case, reply, message) => {
    mockLogin(async () => reply())
    const router = await renderLogin()
    fillIn()
    pressEnter()

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(router.state.location.pathname).toBe('/login')
    expect(getTokenStore().get()).toBeNull()
    // The form keeps what was typed, ready for another try.
    expect(screen.getByLabelText('Login')).toHaveValue('aziz')
    expect(screen.getByRole('button', { name: 'Kirish' })).toBeEnabled()
  })
})
