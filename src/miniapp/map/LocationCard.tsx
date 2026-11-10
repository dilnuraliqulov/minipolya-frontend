import { ChevronRight, ExternalLink, Landmark, Map as MapIcon, MapPin } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { mediaUrl } from '../../shared/api'
import { googleMapsLink, mapLink, yandexMapsLink } from '../../shared/map'
import { Button } from '../components'
import { formatLabel } from '../stadiums/labels'
import { openExternalLink } from '../telegram'
import { YandexMap } from './YandexMap'

/** Where a pitch is: the stadium page's own fields, or a game's `location`. */
export interface PitchLocation {
  /** With an id, the name and photo open the stadium page. */
  id?: string
  name?: string
  address: string
  district?: string
  landmark?: string
  latitude?: number
  longitude?: number
  coverPhotoUrl?: string
  format?: string
}

interface LocationCardProps {
  location: PitchLocation
  /** The section heading. */
  title: string
  /** Shows the stadium's photo, name and format, linking to its page. */
  showStadium?: boolean
}

/**
 * A pitch's location as a static card first — address, district, Moʻljal, "open in
 * Yandex/Google Maps" — and the interactive Yandex map only after "Xaritani koʻrsatish":
 * the key has a small daily limit, so the map is loaded only when someone asks for it.
 */
export function LocationCard({ location, title, showStadium = false }: LocationCardProps) {
  const { t } = useTranslation()
  const [mapShown, setMapShown] = useState(false)
  const { latitude, longitude } = location
  const point =
    latitude !== undefined && longitude !== undefined ? { lat: latitude, lon: longitude } : null

  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h3 className="text-title font-bold text-primary">{title}</h3>
      {showStadium && location.name && <StadiumLink location={location} />}
      <div className="flex flex-col gap-2 rounded-xl bg-surface p-3">
        <p className="flex gap-2 text-base text-primary">
          <MapPin size={18} className="mt-0.5 shrink-0 text-link" aria-hidden />
          <span className="min-w-0 flex-1">{location.address}</span>
        </p>
        {location.district && (
          <p className="pl-6.5 text-sm text-secondary">
            {t('stadium.districtName', { district: location.district })}
          </p>
        )}
        {location.landmark && (
          <p className="flex gap-2 text-sm text-secondary">
            <Landmark size={16} className="mt-0.5 shrink-0 text-link" aria-hidden />
            <span>
              <span className="font-medium text-primary">{t('stadium.landmark')}:</span>{' '}
              {location.landmark}
            </span>
          </p>
        )}
      </div>
      {point ? (
        <>
          {mapShown ? (
            <YandexMap point={point} />
          ) : (
            <Button
              variant="secondary"
              size="compact"
              icon={MapIcon}
              onClick={() => setMapShown(true)}
            >
              {t('stadium.showMap')}
            </Button>
          )}
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              size="compact"
              icon={ExternalLink}
              onClick={() => openExternalLink(yandexMapsLink(point.lat, point.lon))}
            >
              {t('stadium.openYandex')}
            </Button>
            <Button
              variant="secondary"
              size="compact"
              icon={ExternalLink}
              onClick={() => openExternalLink(googleMapsLink(point.lat, point.lon))}
            >
              {t('stadium.openGoogle')}
            </Button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => openExternalLink(mapLink(location))}
          className="flex min-h-11 items-center gap-1 self-start text-base font-medium text-link"
        >
          {t('stadium.openMap')}
          <ChevronRight size={14} aria-hidden />
        </button>
      )}
    </section>
  )
}

function StadiumLink({ location }: { location: PitchLocation }) {
  const [broken, setBroken] = useState(false)
  const photo = location.coverPhotoUrl && !broken ? mediaUrl(location.coverPhotoUrl) : undefined
  const body = (
    <>
      {photo ? (
        <img
          src={photo}
          alt=""
          onError={() => setBroken(true)}
          className="size-14 shrink-0 rounded-lg bg-skeleton object-cover"
        />
      ) : (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-surface">
          <MapPin size={22} className="text-link" aria-hidden />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-md font-semibold text-primary">{location.name}</span>
        {location.format && (
          <span className="text-sm text-secondary">{formatLabel(location.format)}</span>
        )}
      </span>
      {location.id && <ChevronRight size={20} className="shrink-0 text-secondary" aria-hidden />}
    </>
  )
  const className =
    'flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-background p-2 pr-3'
  return location.id ? (
    <Link to={`/stadiums/${location.id}`} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}
