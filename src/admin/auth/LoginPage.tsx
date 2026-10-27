import { Goal } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { loginWithInitData, loginWithWidget, type TelegramWidgetUser } from '../api/auth'
import type { AuthResponse } from '../api/types'
import { AuthCard } from './AuthCard'
import { LOGOUT_NOTICES, loginErrorMessage } from './messages'
import { startSession, useSession } from './session'
import { TelegramLoginWidget } from './TelegramLoginWidget'

// `import.meta.env.DEV` is the literal `false` in a production build, so the
// bundler drops this import and the dev login never ships.
const DevLogin = import.meta.env.DEV ? lazy(() => import('./DevLogin')) : null

export function LoginPage() {
  const session = useSession()
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (session.status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? '/'} replace />
  }

  const login = async (request: () => Promise<AuthResponse>) => {
    setBusy(true)
    setError(null)
    try {
      const { token, user } = await request()
      startSession(token, user)
    } catch (cause) {
      setError(loginErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME?.trim()
  const notice = session.status === 'anonymous' && session.reason
  const message = error ?? (notice ? LOGOUT_NOTICES[notice] : null)

  return (
    <AuthCard>
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent">
        <Goal size={30} aria-hidden className="text-on-accent" />
      </span>
      <h1 className="mt-4.5 text-3xl font-semibold text-primary">MiniPolya</h1>
      <p className="mt-1 text-base text-secondary">Admin panel</p>

      <div className="mt-7 flex w-full flex-col gap-3">
        {message && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {message}
          </p>
        )}
        {botName ? (
          <TelegramLoginWidget
            botName={botName}
            onAuth={(user: TelegramWidgetUser) => void login(() => loginWithWidget(user))}
          />
        ) : (
          <p className="text-sm text-secondary">
            Telegram orqali kirish sozlanmagan: VITE_TELEGRAM_BOT_NAME boʻsh.
          </p>
        )}
        {DevLogin && (
          <Suspense fallback={null}>
            <DevLogin
              busy={busy}
              onLogin={(initData) => void login(() => loginWithInitData(initData))}
            />
          </Suspense>
        )}
      </div>

      <p className="mt-4 text-xs text-secondary">Faqat administratorlar uchun</p>
    </AuthCard>
  )
}
