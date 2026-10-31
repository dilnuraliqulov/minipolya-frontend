import { Ban, Send } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { BlockDetails } from '../api/blocked'
import { Button, ErrorState, Header, Screen, SkeletonList, StateView } from '../components'
import { formatLongDate } from '../format'
import { getTelegramWebApp } from '../telegram'
import { useSession, useSessionState } from './sessionContext'

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

  switch (state.status) {
    case 'ready':
      return <>{children}</>
    case 'loading':
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
  const support = import.meta.env.VITE_TELEGRAM_SUPPORT_USERNAME
  const openSupport = () => {
    const url = `https://t.me/${support}`
    const webApp = getTelegramWebApp()
    if (webApp) webApp.openTelegramLink(url)
    else window.open(url, '_blank', 'noopener')
  }
  const when = [
    details.blockedAt && t('blocked.date', { date: formatLongDate(details.blockedAt) }),
    t('blocked.questions'),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Screen header={<Header title={t('app.name')} />} className="justify-center">
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="flex size-22 items-center justify-center rounded-full bg-danger-soft text-danger">
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
          <p className="w-full rounded-lg bg-warning-soft p-3 text-sm text-warning">
            {t('auth.noTelegramDev')}
          </p>
        )}
      </StateView>
    </Screen>
  )
}
