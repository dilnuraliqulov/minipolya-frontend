import { Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Review } from '../api/stadiums'
import { Card, cx } from '../components'
import { formatLongDate } from '../format'
import { initials } from '../profile/profile'

/** Five stars, the first `rating` filled. */
export function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <span className="flex gap-1" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          aria-hidden
          className={cx(n <= rating ? 'fill-warning text-warning' : 'fill-border text-border')}
        />
      ))}
    </span>
  )
}

/** A review: initials, name, date, stars, the comment and the owner's reply; `children` below (owner actions). */
export function ReviewCard({
  review,
  replyLabel,
  children,
}: {
  review: Review
  /** The reply's heading; the owner sees "Sizning javobingiz". */
  replyLabel?: string
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const name = review.userName ?? t('stadium.anonymous')
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-surface text-2xs font-semibold text-primary"
          aria-hidden
        >
          {initials(name)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-base font-semibold text-primary">{name}</span>
          <span className="text-xs text-secondary">{formatLongDate(review.createdAt)}</span>
        </div>
        <Stars rating={review.rating} label={t('stadium.ratingOf', { rating: review.rating })} />
      </div>
      {review.comment && <p className="text-sm text-primary">{review.comment}</p>}
      {review.ownerReply && (
        <div className="flex flex-col gap-1 rounded-lg bg-surface p-3">
          <span className="text-xs font-semibold text-secondary">
            {replyLabel ?? t('stadium.ownerReply')}
          </span>
          <p className="text-sm text-primary">{review.ownerReply}</p>
        </div>
      )}
      {children}
    </Card>
  )
}
