import { Navigate, Outlet, useLocation } from 'react-router'
import { ErrorState } from '../components/States'
import { NoAccessPage } from './NoAccessPage'
import { restoreSession, useSession } from './session'

/** Route guard: not logged in → login page; logged in but not an admin → no-access page. */
export function RequireAdmin() {
  const session = useSession()
  const location = useLocation()

  switch (session.status) {
    case 'loading':
      return (
        <div aria-busy className="flex min-h-dvh items-center justify-center bg-page">
          <span className="size-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      )
    case 'unavailable':
      return (
        <main className="flex min-h-dvh items-center justify-center bg-page">
          <ErrorState
            title="Serverga ulanib boʻlmadi"
            description="Backend ishlayotganini tekshirib, qayta urinib koʻring"
            onRetry={() => void restoreSession()}
          />
        </main>
      )
    case 'anonymous':
      return <Navigate to="/login" replace state={{ from: location.pathname }} />
    case 'authenticated':
      return session.user.isAdmin ? <Outlet /> : <NoAccessPage user={session.user} />
  }
}
