import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleAlert, Star } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Booking } from '../api/bookings'
import { errorMessage } from '../api/errors'
import { MY_REVIEWS_KEY, postReview } from '../api/reviews'
import { BottomSheet, Button, cx, useToast } from '../components'

/** `@Size(max = 2000)` on the review comment. */
const MAX_COMMENT = 2000

/** "Maydonni baholang": 1–5 stars (required) and an optional comment. */
export function ReviewSheet({
  open,
  booking,
  onClose,
}: {
  open: boolean
  booking: Booking
  onClose: () => void
}) {
  if (!open) return null
  return <OpenReviewSheet booking={booking} onClose={onClose} />
}

function OpenReviewSheet({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const commentId = useId()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const send = useMutation({
    mutationFn: () =>
      postReview({
        stadiumId: booking.stadiumId,
        bookingId: booking.id,
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      }),
    onSuccess: () => {
      toast.show(t('review.thanks'), 'success')
      void queryClient.invalidateQueries({ queryKey: MY_REVIEWS_KEY })
      void queryClient.invalidateQueries({ queryKey: ['reviews', booking.stadiumId] })
      onClose()
    },
  })

  return (
    <BottomSheet
      open
      title={t('review.sheetTitle')}
      subtitle={booking.stadiumName}
      onClose={() => {
        if (!send.isPending) onClose()
      }}
      actions={
        <Button
          haptic
          disabled={rating === 0}
          loading={send.isPending}
          onClick={() => send.mutate()}
        >
          {t('review.submit')}
        </Button>
      }
    >
      <div
        role="radiogroup"
        aria-label={t('review.sheetTitle')}
        className="flex justify-center gap-2"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={t('review.star', { count: n })}
            onClick={() => setRating(n)}
            className="flex size-11 items-center justify-center"
          >
            <Star
              size={32}
              aria-hidden
              className={cx(n <= rating ? 'fill-warning text-warning' : 'fill-border text-border')}
            />
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={commentId} className="text-sm font-medium text-secondary">
          {t('review.comment')}
        </label>
        <textarea
          id={commentId}
          value={comment}
          maxLength={MAX_COMMENT}
          rows={4}
          onChange={(event) => setComment(event.target.value)}
          className="w-full resize-none rounded-xl border border-border bg-surface p-3 text-base text-primary"
        />
      </div>
      {send.isError && (
        <p role="alert" className="flex gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
          <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          {errorMessage(send.error)}
        </p>
      )}
    </BottomSheet>
  )
}
