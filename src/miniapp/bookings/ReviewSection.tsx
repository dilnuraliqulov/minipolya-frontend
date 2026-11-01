import { useQuery } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Booking } from '../api/bookings'
import { getMyReviews, MY_REVIEWS_KEY } from '../api/reviews'
import { Button, Card } from '../components'
import { Stars } from '../stadiums/ReviewCard'
import { ReviewSheet } from './ReviewSheet'

/**
 * A completed booking: the player's review of the stadium, or the way to
 * write one. One review per stadium per player (the backend's rule), so a
 * review of this stadium from another booking counts too.
 */
export function ReviewSection({ booking }: { booking: Booking }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const mine = useQuery({ queryKey: MY_REVIEWS_KEY, queryFn: getMyReviews })
  if (mine.isPending || mine.isError) return null
  const review =
    mine.data.content.find((r) => r.bookingId === booking.id) ??
    mine.data.content.find((r) => r.stadiumId === booking.stadiumId)

  if (review) {
    return (
      <Card className="flex flex-col gap-2 p-4">
        <h3 className="text-lg font-semibold text-primary">{t('review.yours')}</h3>
        <Stars rating={review.rating} label={t('stadium.ratingOf', { rating: review.rating })} />
        {review.comment && <p className="text-base text-primary">{review.comment}</p>}
      </Card>
    )
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-primary">{t('review.rate')}</h3>
        <p className="text-sm text-secondary">{t('review.rateText')}</p>
      </div>
      <Button icon={Star} onClick={() => setOpen(true)}>
        {t('review.rate')}
      </Button>
      <ReviewSheet open={open} booking={booking} onClose={() => setOpen(false)} />
    </Card>
  )
}
