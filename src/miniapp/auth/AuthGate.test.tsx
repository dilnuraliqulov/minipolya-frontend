import { QueryClient } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryTokenStore } from '../../shared/api'
import '../i18n'
import { makeUser } from '../test/api'
import { AuthGate } from './AuthGate'
import { SessionProvider } from './SessionProvider'
import { createSession, type Session, type SessionState } from './session'

afterEach(() => {
  vi.unstubAllEnvs()
})

/** A real session object whose state the test sets directly. */
function sessionIn(state: SessionState): Session {
  const session = createSession({
    tokenStore: createMemoryTokenStore(),
    queryClient: new QueryClient(),
  })
  let current = state
  const listeners = new Set<() => void>()
  return {
    ...session,
    getState: () => current,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    start: vi.fn(),
    retry: vi.fn(() => {
      current = { status: 'loading' }
      listeners.forEach((l) => l())
    }),
  }
}

function renderGate(session: Session) {
  return render(
    <SessionProvider session={session}>
      <AuthGate>
        <p>app content</p>
      </AuthGate>
    </SessionProvider>,
  )
}

describe('AuthGate', () => {
  it('starts the login on mount and shows a skeleton while it runs', () => {
    const session = sessionIn({ status: 'loading' })
    renderGate(session)
    expect(session.start).toHaveBeenCalledOnce()
    expect(screen.getByRole('status', { name: 'Yuklanmoqda' })).toBeInTheDocument()
    expect(screen.queryByText('app content')).not.toBeInTheDocument()
  })

  it('renders the app once logged in', () => {
    renderGate(sessionIn({ status: 'ready', user: makeUser() }))
    expect(screen.getByText('app content')).toBeInTheDocument()
  })

  it('shows a full error screen whose "Qayta urinish" logs in again', async () => {
    const session = sessionIn({ status: 'error', reason: 'network' })
    renderGate(session)
    expect(screen.getByRole('heading', { name: 'Xatolik yuz berdi' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Qayta urinish' }))
    expect(session.retry).toHaveBeenCalledOnce()
    expect(screen.getByRole('status', { name: 'Yuklanmoqda' })).toBeInTheDocument()
  })

  it('explains an ended session differently from a network failure', () => {
    renderGate(sessionIn({ status: 'error', reason: 'session' }))
    expect(screen.getByText(/Sessiya tugadi/)).toBeInTheDocument()
  })

  it('shows "Hisobingiz bloklangan" without a reason while the backend sends none (R21)', () => {
    renderGate(sessionIn({ status: 'blocked', details: {} }))
    expect(screen.getByRole('heading', { name: 'Hisobingiz bloklangan' })).toBeInTheDocument()
    expect(screen.queryByText(/Sabab:/)).not.toBeInTheDocument()
    expect(screen.queryByText('app content')).not.toBeInTheDocument()
  })

  it('shows the reason and the date when they arrive', () => {
    renderGate(
      sessionIn({
        status: 'blocked',
        details: { reason: 'Qoidabuzarlik', blockedAt: '2026-10-31T05:00:00Z' },
      }),
    )
    expect(screen.getByText('Sabab: Qoidabuzarlik')).toBeInTheDocument()
    expect(screen.getByText(/31-oktabr, 2026/)).toBeInTheDocument()
  })

  it('outside Telegram in development, says the dev login is a backend request (R19)', () => {
    vi.stubEnv('DEV', true)
    renderGate(sessionIn({ status: 'no-telegram' }))
    expect(screen.getByRole('heading', { name: 'Telegram orqali oching' })).toBeInTheDocument()
    expect(screen.getByText(/R19/)).toBeInTheDocument()
  })

  it('outside Telegram in production, only asks to open it in Telegram', () => {
    vi.stubEnv('DEV', false)
    renderGate(sessionIn({ status: 'no-telegram' }))
    expect(screen.getByRole('heading', { name: 'Telegram orqali oching' })).toBeInTheDocument()
    expect(screen.queryByText(/R19/)).not.toBeInTheDocument()
  })

  it('follows the session live', () => {
    const session = sessionIn({ status: 'error', reason: 'server' })
    renderGate(session)
    act(() => session.retry())
    expect(screen.getByRole('status', { name: 'Yuklanmoqda' })).toBeInTheDocument()
  })
})
