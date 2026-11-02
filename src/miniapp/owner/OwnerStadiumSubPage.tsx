import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import type { OwnerStadium } from '../api/owner'
import { EmptyState, ErrorState, Header, Screen, SkeletonList } from '../components'
import { useGoBack } from '../lib/useGoBack'
import { useOwnerStadiumList } from './queries'

/**
 * A Maydonim sub-screen: finds the stadium by `:id` in the owner's list.
 * `children` fills the default Screen; `screen` builds its own Screen (with
 * this header) when its footer needs the content's state, e.g. a form's save bar.
 */
export function OwnerStadiumSubPage({
  title,
  children,
  screen,
}: {
  title: string
  children?: (stadium: OwnerStadium) => ReactNode
  screen?: (stadium: OwnerStadium, header: ReactNode) => ReactNode
}) {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const goBack = useGoBack('/owner/stadium')
  const list = useOwnerStadiumList()
  const header = <Header title={title} onBack={goBack} />
  if (list.isPending) {
    return (
      <Screen header={header}>
        <SkeletonList count={3} />
      </Screen>
    )
  }
  if (list.isError) {
    return (
      <Screen header={header} className="justify-center">
        <ErrorState onRetry={() => void list.refetch()} />
      </Screen>
    )
  }
  const stadium = list.data.find((s) => s.id === id)
  if (!stadium) {
    return (
      <Screen header={header}>
        <EmptyState title={t('stadium.notFoundTitle')} />
      </Screen>
    )
  }
  if (screen) return screen(stadium, header)
  return <Screen header={header}>{children?.(stadium)}</Screen>
}
