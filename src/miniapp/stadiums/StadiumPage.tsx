import { ChevronRight, Heart, Info, MapPinOff, MessageSquare, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { isApiError } from '../../shared/api'
import { errorMessage } from '../api/errors'
import { isAvailable } from '../api/missing'
import { STADIUM_DETAIL_RATING, type StadiumDetail } from '../api/stadiums'
import { Card, EmptyState, ErrorState, Header, Screen, SkeletonList, useToast } from '../components'
import { useGoBack } from '../lib/useGoBack'
import { openExternalLink } from '../telegram'
import { Gallery } from './Gallery'
import { AMENITY_KEYS, formatLabel, isKnownSurface, ratingLabel, SURFACE_KEYS } from './labels'
import { mapLink } from './mapLink'
import { useReviewPreview, useStadium, useToggleFavorite } from './queries'
import { ReviewCard } from './ReviewCard'
import { StadiumMap } from './StadiumMap'

/** Maydon: photos, info, amenities, map, cancellation rule, reviews, favourite. */
export function StadiumPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const goBack = useGoBack()
  const detail = useStadium(id)

  const header = (
    <Header
      title={t('stadium.title')}
      onBack={goBack}
      action={detail.data && <FavoriteButton stadium={detail.data} />}
    />
  )

  if (detail.isPending) {
    return (
      <Screen header={header}>
        <SkeletonList count={2} />
      </Screen>
    )
  }
  if (detail.isError) {
    const notFound = isApiError(detail.error) && detail.error.status === 404
    return (
      <Screen header={header} className="justify-center">
        {notFound ? (
          <EmptyState
            icon={MapPinOff}
            title={t('stadium.notFoundTitle')}
            description={t('stadium.notFoundText')}
          />
        ) : (
          <ErrorState onRetry={() => void detail.refetch()} />
        )}
      </Screen>
    )
  }

  const stadium = detail.data
  return (
    <Screen header={header} padded={false}>
      <Gallery photos={stadium.photos} name={stadium.name} />
      <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
        <StadiumInfo stadium={stadium} />
        <Amenities stadium={stadium} />
        <Address stadium={stadium} />
        <Card className="flex gap-3 px-4 py-3">
          <Info size={16} className="mt-0.5 shrink-0 text-link" aria-hidden />
          <p className="text-sm text-primary">
            {t('stadium.cancelRule', { hours: stadium.cancellationPolicy.cancellationHours })}
          </p>
        </Card>
        <ReviewsPreview stadium={stadium} />
      </div>
    </Screen>
  )
}

function FavoriteButton({ stadium }: { stadium: StadiumDetail }) {
  const { t } = useTranslation()
  const toast = useToast()
  const toggle = useToggleFavorite()
  if (stadium.isFavorited === undefined) return null
  const on = stadium.isFavorited
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={t(on ? 'stadium.unfavorite' : 'stadium.favorite')}
      disabled={toggle.isPending}
      onClick={() =>
        toggle.mutate(stadium.id, {
          onError: (error) => toast.show(errorMessage(error), 'danger'),
        })
      }
      className="flex size-11 items-center justify-center text-primary disabled:opacity-60"
    >
      <Heart size={24} className={on ? 'fill-danger text-danger' : undefined} aria-hidden />
    </button>
  )
}

function StadiumInfo({ stadium }: { stadium: StadiumDetail }) {
  const { t } = useTranslation()
  const rating = isAvailable(STADIUM_DETAIL_RATING) ? stadium.averageRating : undefined
  const badges = [
    formatLabel(stadium.format),
    isKnownSurface(stadium.surfaceType)
      ? t(SURFACE_KEYS[stadium.surfaceType])
      : stadium.surfaceType,
  ]
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 text-3xl font-bold text-primary">{stadium.name}</h2>
        {rating !== undefined && (
          <span className="flex shrink-0 items-center gap-2">
            <Star size={16} className="fill-current text-primary" aria-hidden />
            <span className="text-md font-bold text-primary">{ratingLabel(rating)}</span>
            {stadium.reviewCount !== undefined && (
              <span className="text-base text-secondary">({stadium.reviewCount})</span>
            )}
          </span>
        )}
      </div>
      {stadium.district && (
        <p className="text-base text-secondary">
          {t('stadium.districtName', { district: stadium.district })}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            key={badge}
            className="rounded-sm border border-border px-3 py-2 text-xs font-semibold text-secondary"
          >
            {badge}
          </span>
        ))}
      </div>
      {stadium.description && <p className="text-sm text-secondary">{stadium.description}</p>}
    </div>
  )
}

function Amenities({ stadium }: { stadium: StadiumDetail }) {
  const { t } = useTranslation()
  const present = (Object.keys(AMENITY_KEYS) as Array<keyof typeof AMENITY_KEYS>).filter(
    (key) => stadium.amenities[key],
  )
  if (present.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-title font-bold text-primary">{t('stadium.amenities')}</h3>
      <ul aria-label={t('stadium.amenities')} className="flex flex-wrap gap-3">
        {present.map((key) => (
          <li
            key={key}
            className="rounded-xl bg-surface px-4 py-3 text-sm font-medium text-primary"
          >
            {t(AMENITY_KEYS[key])}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Address({ stadium }: { stadium: StadiumDetail }) {
  const { t } = useTranslation()
  const hasCoordinates = stadium.latitude !== undefined && stadium.longitude !== undefined
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-title font-bold text-primary">{t('stadium.address')}</h3>
      {hasCoordinates && <StadiumMap latitude={stadium.latitude!} longitude={stadium.longitude!} />}
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-base text-primary">{stadium.address}</p>
        <button
          type="button"
          onClick={() => openExternalLink(mapLink(stadium))}
          className="flex min-h-11 shrink-0 items-center gap-1 text-base font-medium text-link"
        >
          {t('stadium.openMap')}
          <ChevronRight size={14} aria-hidden />
        </button>
      </div>
    </section>
  )
}

const PREVIEW_COUNT = 2

function ReviewsPreview({ stadium }: { stadium: StadiumDetail }) {
  const { t } = useTranslation()
  const reviews = useReviewPreview(stadium.id)
  const titleId = `reviews-${stadium.id}`
  const shown = reviews.data?.content.slice(0, PREVIEW_COUNT) ?? []
  const total = reviews.data?.totalElements ?? 0
  const more = reviews.data && (total > shown.length || reviews.data.totalPages > 1)

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <div className="flex h-11 items-center justify-between">
        <h3 id={titleId} className="text-title font-bold text-primary">
          {t('stadium.reviews')}
        </h3>
        {more && (
          <Link
            to={`/stadiums/${stadium.id}/reviews`}
            className="flex h-11 items-center gap-1 pl-3 text-md font-medium text-link"
          >
            {t('stadium.allReviews')}
            <ChevronRight size={16} aria-hidden />
          </Link>
        )}
      </div>
      {reviews.isPending ? (
        <SkeletonList count={1} />
      ) : reviews.isError ? (
        <ErrorState onRetry={() => void reviews.refetch()} />
      ) : shown.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-secondary">
          <MessageSquare size={16} aria-hidden />
          {t('stadium.noReviews')}
        </p>
      ) : (
        <>
          <p className="text-sm text-secondary">{t('stadium.reviewCount', { count: total })}</p>
          {shown.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </>
      )}
    </section>
  )
}
