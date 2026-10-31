import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { Button, EmptyState, ErrorState, Header, Screen, SkeletonList } from '../components'
import { useGoBack } from '../lib/useGoBack'
import { useReviews } from './queries'
import { ReviewCard } from './ReviewCard'

/** Sharhlar: every review of a stadium, newest first, "Yana koʻrsatish" for more. */
export function ReviewsPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const goBack = useGoBack(`/stadiums/${id}`)
  const reviews = useReviews(id)
  const items = reviews.data?.pages.flatMap((page) => page.content) ?? []

  return (
    <Screen header={<Header title={t('stadium.reviews')} onBack={goBack} />}>
      {reviews.isPending ? (
        <SkeletonList />
      ) : reviews.isError ? (
        <ErrorState onRetry={() => void reviews.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t('stadium.noReviews')} />
      ) : (
        <>
          {items.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
          {reviews.hasNextPage && (
            <Button
              variant="secondary"
              loading={reviews.isFetchingNextPage}
              onClick={() => void reviews.fetchNextPage()}
            >
              {t('stadiums.more')}
            </Button>
          )}
        </>
      )}
    </Screen>
  )
}
