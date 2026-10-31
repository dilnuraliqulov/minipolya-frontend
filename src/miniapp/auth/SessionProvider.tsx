import type { ReactNode } from 'react'
import type { Session } from './session'
import { SessionContext } from './sessionContext'

export function SessionProvider({ session, children }: { session: Session; children: ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}
