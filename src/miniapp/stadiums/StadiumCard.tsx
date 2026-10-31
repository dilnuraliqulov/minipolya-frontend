import { ArrowRight, Heart, Star } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { formatSomParts } from '../../shared/format'
import type { Stadium } from '../api/stadiums'
import { Button, cx } from '../components'
import { formatLabel, ratingLabel } from './labels'

interface StadiumCardProps {
  stadium: Stadium
  onOpen: () => void
  /** The heart — from `isFavorited` on the list, always true on Sevimlilar. */
  favorite?: { favorited: boolean; onToggle: () => void; pending?: boolean }
}

/**
 * The design's Stadium Card: cover photo (when the stadium has one), name and rating, district · format, and
 * ONE price per hour — the player price from the API, nothing else.
 */
export function StadiumCard({ stadium, onOpen, favorite }: StadiumCardProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const photo = stadium.coverPhotoUrl
  const meta = [stadium.district, formatLabel(stadium.format)].filter(Boolean).join(' · ')
  const price = formatSomParts(stadium.pricePerHour).amount

  const heart = favorite && (
    <button
      type="button"
      onClick={favorite.onToggle}
      disabled={favorite.pending}
      aria-pressed={favorite.favorited}
      aria-label={t(favorite.favorited ? 'stadium.unfavorite' : 'stadium.favorite')}
      className={cx(
        'flex size-11 shrink-0 items-center justify-center rounded-full',
        photo ? 'bg-image-overlay text-on-accent' : 'bg-surface text-secondary',
      )}
    >
      <Heart
        size={20}
        className={favorite.favorited ? 'fill-danger text-danger' : undefined}
        aria-hidden
      />
    </button>
  )

  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-3xl border border-border bg-background p-4"
    >
      {photo && (
        <div className="relative h-47 overflow-hidden rounded-xl bg-surface">
          <img src={photo} alt="" className="size-full object-cover" loading="lazy" />
          {heart && <div className="absolute top-3 right-3">{heart}</div>}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h3 id={titleId} className="min-w-0 flex-1 truncate text-2xl font-bold text-primary">
            {stadium.name}
          </h3>
          {stadium.averageRating !== undefined && (
            <span className="flex shrink-0 items-center gap-1.5">
              <Star size={15} className="fill-current text-primary" aria-hidden />
              <span className="text-md font-bold text-primary">
                {ratingLabel(stadium.averageRating)}
              </span>
              {stadium.reviewCount !== undefined && (
                <span className="text-base text-secondary">({stadium.reviewCount})</span>
              )}
            </span>
          )}
          {!photo && heart}
        </div>
        <p className="text-base text-secondary">{meta}</p>
      </div>
      <div className="h-px bg-border" />
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">{price}</span>
          <span className="text-sm text-secondary">{t('stadiums.perHour')}</span>
        </p>
        <Button block={false} haptic onClick={onOpen} className="gap-3">
          {t('stadiums.book')}
          <ArrowRight size={18} aria-hidden />
        </Button>
      </div>
    </article>
  )
}
