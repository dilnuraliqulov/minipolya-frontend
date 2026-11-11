import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import type { OwnerStadiumDetail } from '../api/owner'
import { ErrorState, Header, Screen, SkeletonList } from '../components'
import { useGoBack } from '../lib/useGoBack'
import { useOwnerStadiumDetail } from './queries'

/**
 * A Maydonim sub-screen that needs the stadium's full settings
 * (GET /api/owner/stadiums/{id}, R35): loading, error, then `screen`.
 */
export function OwnerDetailPage({
  title,
  screen,
}: {
  title: string
  screen: (stadium: OwnerStadiumDetail, header: ReactNode) => ReactNode
}) {
  const { id = '' } = useParams()
  const goBack = useGoBack('/owner/stadium')
  const detail = useOwnerStadiumDetail(id)
  const header = <Header title={title} onBack={goBack} />
  if (detail.isPending) {
    return (
      <Screen header={header}>
        <SkeletonList count={3} />
      </Screen>
    )
  }
  if (detail.isError) {
    return (
      <Screen header={header} className="justify-center">
        <ErrorState onRetry={() => void detail.refetch()} />
      </Screen>
    )
  }
  return screen(detail.data, header)
}
