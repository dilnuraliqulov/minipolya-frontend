import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { configureApiClient, createMemoryTokenStore } from '../../shared/api'
import type { User } from '../api/users'
import { SessionProvider } from '../auth/SessionProvider'
import type { Session } from '../auth/session'
import { ToastProvider } from '../components/ToastProvider'
import '../i18n'
import { routes } from '../routes'
import { makeUser } from './api'

/** A logged-in session for screen tests; its methods are spies. */
export function readySession(user: User = makeUser()): Session {
  return {
    getState: () => ({ status: 'ready', user }),
    subscribe: () => () => {},
    start: vi.fn(),
    retry: vi.fn(),
    handleUnauthorized: vi.fn(),
    handleAccountBlocked: vi.fn(),
    checkRoles: vi.fn(),
  }
}

/**
 * Renders the Mini App's routes at `path`, logged in. Requests go to the
 * stubbed `fetch` (stub it with `vi.stubGlobal('fetch', …)` first).
 */
export function renderApp(path: string, { session = readySession() } = {}) {
  configureApiClient({ tokenStore: createMemoryTokenStore() })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </SessionProvider>
    </QueryClientProvider>,
  )
  return { ...result, router, queryClient, session }
}
