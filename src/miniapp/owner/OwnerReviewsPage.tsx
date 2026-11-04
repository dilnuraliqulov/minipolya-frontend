import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '../api/errors'
import { getOwnerReviews, ownerReviewsKey, replyToReview, type OwnerStadium } from '../api/owner'
import type { Review } from '../api/stadiums'
import {
  BottomSheet,
  Button,
  Card,
  EmptyState,
  ErrorState,
  SkeletonList,
  useToast,
} from '../components'
import { ReviewCard } from '../stadiums/ReviewCard'
import { ratingLabel } from '../stadiums/labels'
import { OwnerStadiumSubPage } from './OwnerStadiumSubPage'

const REPLY_MAX = 2000

/** Maydonim → Sharhlar: the stadium's reviews, newest first, with "Javob berish". */
export function OwnerReviewsPage() {
  const { t } = useTranslation()
  return (
    <OwnerStadiumSubPage title={t('owner.reviews.title')}>
      {(stadium) => <Reviews stadium={stadium} />}
    </OwnerStadiumSubPage>
  )
}

function Reviews({ stadium }: { stadium: OwnerStadium }) {
  const { t } = useTranslation()
  const [replying, setReplying] = useState<Review | null>(null)
  const reviews = useInfiniteQuery({
    queryKey: ownerReviewsKey(stadium.id),
    queryFn: ({ pageParam }) => getOwnerReviews(stadium.id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
  if (reviews.isPending) return <SkeletonList count={3} />
  if (reviews.isError) return <ErrorState onRetry={() => void reviews.refetch()} />
  const items = reviews.data.pages.flatMap((page) => page.content)
  const total = reviews.data.pages[0]?.totalElements ?? 0
  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col justify-center">
        <EmptyState
          icon={MessageSquare}
          title={t('owner.reviews.emptyTitle')}
          description={t('owner.reviews.emptyText')}
        />
      </div>
    )
  }
  return (
    <>
      {stadium.averageRating !== undefined && (
        <Card className="flex items-center gap-3 p-4">
          <span className="text-5xl font-bold text-primary">
            {ratingLabel(stadium.averageRating)}
          </span>
          <span className="text-sm text-secondary">
            {t('owner.reviews.count', { count: total })}
          </span>
        </Card>
      )}
      {items.map((review) => (
        <ReviewCard key={review.id} review={review} replyLabel={t('owner.reviews.yourReply')}>
          {!review.ownerReply && (
            <Button variant="secondary" onClick={() => setReplying(review)}>
              {t('owner.reviews.reply')}
            </Button>
          )}
        </ReviewCard>
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
      <ReplySheet stadiumId={stadium.id} review={replying} onClose={() => setReplying(null)} />
    </>
  )
}

function ReplySheet({
  stadiumId,
  review,
  onClose,
}: {
  stadiumId: string
  review: Review | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const send = useMutation({
    mutationFn: () => replyToReview(review?.id ?? '', text.trim()),
    onSuccess: () => {
      toast.show(t('owner.reviews.sent'), 'success')
      setText('')
      void queryClient.invalidateQueries({ queryKey: ownerReviewsKey(stadiumId) })
      onClose()
    },
    onError: (error) => toast.show(errorMessage(error), 'danger'),
  })
  return (
    <BottomSheet
      open={review !== null}
      title={t('owner.reviews.replyTitle')}
      subtitle={review?.comment}
      onClose={onClose}
      actions={
        <Button
          haptic
          disabled={text.trim().length === 0}
          loading={send.isPending}
          onClick={() => send.mutate()}
        >
          {t('owner.reviews.send')}
        </Button>
      }
    >
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-secondary">{t('owner.reviews.replyLabel')}</span>
        <textarea
          value={text}
          maxLength={REPLY_MAX}
          rows={4}
          onChange={(event) => setText(event.target.value)}
          className="min-h-24 rounded-xl border border-border bg-background p-3 text-lg text-primary outline-none focus:border-accent"
        />
      </label>
    </BottomSheet>
  )
}
