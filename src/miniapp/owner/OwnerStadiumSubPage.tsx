import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import type { OwnerStadium } from '../api/owner'
import { EmptyState, ErrorState, Header, Screen, SkeletonList } from '../components'
import { useGoBack } from '../lib/useGoBack'
import { useOwnerStadiumList } from './queries'

/** A Maydonim sub-screen: finds the stadium by `:id` in the owner's list. */
export function OwnerStadiumSubPage({
  title,
  footer,
  children,
}: {
  title: string
  footer?: (stadium: OwnerStadium) => ReactNode
  children: (stadium: OwnerStadium) => ReactNode
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
  return (
    <Screen header={header} footer={footer?.(stadium)}>
      {children(stadium)}
    </Screen>
  )
}
