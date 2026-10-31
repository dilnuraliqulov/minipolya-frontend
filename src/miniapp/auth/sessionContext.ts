import { createContext, useContext, useSyncExternalStore } from 'react'
import type { User } from '../api/users'
import type { Session, SessionState } from './session'

export const SessionContext = createContext<Session | null>(null)

export function useSession(): Session {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession must be used inside <SessionProvider>')
  return session
}

export function useSessionState(): SessionState {
  const session = useSession()
  return useSyncExternalStore(session.subscribe, session.getState)
}

/** The logged-in user from the login answer. Only valid under <AuthGate>. */
export function useLoginUser(): User {
  const state = useSessionState()
  if (state.status !== 'ready') throw new Error('useLoginUser must be used under <AuthGate>')
  return state.user
}
