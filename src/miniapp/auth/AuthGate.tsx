import { Ban, Send } from 'lucide-react'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { BlockDetails } from '../api/blocked'
import { Button, ErrorState, Header, Screen, SkeletonList, StateView } from '../components'
import { formatLongDate } from '../format'
import { hasSplash, useSplashDone } from '../splash'
import { openSupport, supportUsername } from '../telegram'
import { useSession, useSessionState } from './sessionContext'

/**
 * Dev builds only: a user picker for testing in a plain browser. The condition
 * is statically false in production, so the import (the picker, its API calls
 * and VITE_DEV_LOGIN_KEY) is removed from the bundle. Its strings are not
 * translated: it is a developer tool that never ships.
 */
const DevLoginPicker = import.meta.env.DEV ? lazy(() => import('./dev/DevLoginPicker')) : null

/**
 * Logs in on mount and renders the app only once there is a JWT. Until then,
 * and whenever the session breaks, it shows a full screen: loading skeleton,
 * error with "Qayta urinish", the blocked screen, or "open it in Telegram".
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession()
  const state = useSessionState()
  const { t } = useTranslation()

  useEffect(() => {
    session.start()
  }, [session])

  // The static splash covers the loading and ready phases; a full-screen
  // state (error, blocked, no Telegram) takes over and lifts it.
  useSplashDone(
    state.status === 'error' || state.status === 'blocked' || state.status === 'no-telegram',
  )

  switch (state.status) {
    case 'ready':
      return <>{children}</>
    case 'loading':
      // The splash covers this; without one (tests, HMR) show the skeleton.
      if (hasSplash()) return null
      return (
        <Screen header={<Header title={t('app.name')} />}>
          <SkeletonList />
        </Screen>
      )
    case 'blocked':
      return <BlockedScreen details={state.details} />
    case 'no-telegram':
      return <NoTelegramScreen />
    case 'error':
      return (
        <Screen header={<Header title={t('app.name')} />} className="justify-center">
          <ErrorState
            description={
              state.reason === 'session'
                ? t('auth.errorSession')
                : state.reason === 'server'
                  ? t('states.errorServer')
                  : t('states.errorNetwork')
            }
            onRetry={session.retry}
          />
        </Screen>
      )
  }
}

function BlockedScreen({ details }: { details: BlockDetails }) {
  const { t } = useTranslation()
  const support = supportUsername()
  const when = [
    details.blockedAt && t('blocked.date', { date: formatLongDate(details.blockedAt) }),
    t('blocked.questions'),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Screen header={<Header title={t('app.name')} />} className="justify-center">
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="flex size-22 items-center justify-center rounded-full bg-danger-soft text-danger-text">
          <Ban size={44} aria-hidden />
        </div>
        <h2 className="text-3xl font-bold text-primary">{t('blocked.title')}</h2>
        <div className="flex flex-col gap-2">
          {details.reason && (
            <p className="text-lg font-semibold text-primary">
              {t('blocked.reason', { reason: details.reason })}
            </p>
          )}
          <p className="text-md text-secondary">{when}</p>
        </div>
        {support && (
          <div className="w-full pt-2">
            <Button haptic onClick={openSupport}>
              {t('blocked.support')}
            </Button>
          </div>
        )}
      </div>
    </Screen>
  )
}

function NoTelegramScreen() {
  const { t } = useTranslation()
  return (
    <Screen header={<Header title={t('app.name')} />} className="justify-center">
      <StateView
        icon={Send}
        title={t('auth.noTelegramTitle')}
        description={t('auth.noTelegramText')}
      >
        {import.meta.env.DEV && (
          <p className="w-full rounded-lg bg-warning-soft p-3 text-sm text-warning-text">
            {t('auth.noTelegramDev')}
          </p>
        )}
        {DevLoginPicker && (
          <Suspense fallback={null}>
            <DevLoginPicker />
          </Suspense>
        )}
      </StateView>
    </Screen>
  )
}
