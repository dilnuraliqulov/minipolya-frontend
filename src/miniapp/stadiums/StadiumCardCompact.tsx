import { Heart, Star } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatMoney } from '../format'
import type { Stadium } from '../api/stadiums'
import { Button, cx, LogoMark } from '../components'
import { formatLabel, ratingLabel, surfaceLabel } from './labels'

interface StadiumCardCompactProps {
  stadium: Stadium
  onOpen: () => void
  /** The heart — from `isFavorited` on the list, always true on Sevimlilar. */
  favorite?: { favorited: boolean; onToggle: () => void; pending?: boolean }
}

/**
 * The design's Stadium Card Compact: photo with heart and rating chip, name, district · format · surface,
 * and ONE price per hour — the player price from the API — with "Band qilish".
 */
export function StadiumCardCompact({ stadium, onOpen, favorite }: StadiumCardCompactProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const [loaded, setLoaded] = useState(false)
  const photo = stadium.coverPhotoUrl
  const meta = [stadium.district, formatLabel(stadium.format), surfaceLabel(stadium.surfaceType, t)]
    .filter(Boolean)
    .join(' · ')

  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col gap-2.5 rounded-3xl border border-border bg-background p-2.5"
    >
      {/* Mouse/touch convenience: the photo and the text open the stadium; the name button is the keyboard route. */}
      <div className="flex cursor-pointer flex-col gap-2.5" onClick={onOpen}>
        <div className="relative flex h-37.5 items-center justify-center overflow-hidden rounded-xl bg-surface p-2.5">
          {photo ? (
            <img
              src={photo}
              alt=""
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              className={cx(
                'absolute inset-0 size-full object-cover transition-opacity duration-200',
                loaded ? 'opacity-100' : 'opacity-0',
              )}
            />
          ) : (
            <LogoMark size={40} className="text-secondary opacity-40" />
          )}
          {favorite && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                favorite.onToggle()
              }}
              disabled={favorite.pending}
              aria-pressed={favorite.favorited}
              aria-label={t(favorite.favorited ? 'stadium.unfavorite' : 'stadium.favorite')}
              className="absolute top-0 right-0 flex size-11 items-center justify-center"
            >
              <span className="flex size-9 items-center justify-center rounded-full border border-on-accent/20 bg-image-overlay text-on-accent">
                <Heart
                  size={18}
                  className={favorite.favorited ? 'fill-danger text-danger' : undefined}
                  aria-hidden
                />
              </span>
            </button>
          )}
          {stadium.averageRating !== undefined && (
            <span className="absolute bottom-2.5 left-2.5 flex h-6 items-center gap-1 rounded-xl bg-image-overlay px-2 text-xs font-semibold text-on-accent">
              <Star size={12} className="fill-current" aria-hidden />
              {ratingLabel(stadium.averageRating)}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 id={titleId} className="truncate text-lg font-semibold text-primary">
            <button type="button" className="max-w-full truncate text-left">
              {stadium.name}
            </button>
          </h3>
          <p className="truncate text-sm text-secondary">{meta}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-primary">
            {formatMoney(stadium.pricePerHour)}
          </span>
          <span className="text-sm text-secondary">{t('stadiums.perHourShort')}</span>
        </p>
        <Button block={false} size="compact" haptic onClick={onOpen}>
          {t('stadiums.book')}
        </Button>
      </div>
    </article>
  )
}
