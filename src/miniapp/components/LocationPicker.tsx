import { Link2, LocateFixed, MapPin } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPoint, isInUzbekistan, parseMapLink, type LatLon } from '../../shared/map'
import { YandexMap } from '../map/YandexMap'
import { getDeviceLocation, LocationError } from '../telegram'
import { Button } from './Button'
import { cx } from './cx'
import { Input } from './Input'

interface LocationPickerProps {
  value: LatLon | null
  onChange: (point: LatLon) => void
  /** A rule broken outside the picker, e.g. "mark the pitch on the map". */
  error?: string
}

/**
 * Where the stadium is (design "Maydon qoʻshish / 2 Joylashuv"), shared by the
 * wizard and Maydonim → Maʼlumotlar: a map to tap or drag the pin on (YandexMap), "Joriy joylashuvim" (Telegram's LocationManager, else the browser), and
 * a pasted Google / Yandex Maps link. The point must be in Uzbekistan.
 */
export function LocationPicker({ value, onChange, error }: LocationPickerProps) {
  const { t } = useTranslation()
  const [focus, setFocus] = useState(0)
  const [link, setLink] = useState('')
  const [linkError, setLinkError] = useState<string>()
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string>()

  /** A point from outside the map: checked, then the map flies to it. */
  const jump = (point: LatLon): boolean => {
    if (!isInUzbekistan(point.lat, point.lon)) return false
    onChange(point)
    setFocus((n) => n + 1)
    return true
  }

  const pickFromMap = (point: LatLon) => {
    setLocateError(undefined)
    onChange(point)
  }

  const locate = async () => {
    setLocating(true)
    setLocateError(undefined)
    try {
      const point = await getDeviceLocation()
      if (!jump(point)) setLocateError(t('owner.rules.outsideUzbekistan'))
    } catch (cause) {
      const denied = cause instanceof LocationError && cause.code === 'denied'
      setLocateError(t(denied ? 'owner.location.denied' : 'owner.location.unavailable'))
    } finally {
      setLocating(false)
    }
  }

  const paste = (text: string) => {
    setLink(text)
    if (text.trim() === '') {
      setLinkError(undefined)
      return
    }
    const parsed = parseMapLink(text)
    if (parsed === 'short') setLinkError(t('owner.location.linkShort'))
    else if (parsed === null) setLinkError(t('owner.location.linkInvalid'))
    else if (!jump(parsed)) setLinkError(t('owner.rules.outsideUzbekistan'))
    else setLinkError(undefined)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-secondary">{t('owner.location.mapTitle')}</span>
        <YandexMap point={value} focus={focus} onPick={pickFromMap} />
        <p
          aria-live="polite"
          className={cx(
            'flex items-center gap-1.5 text-xs tabular-nums',
            value ? 'text-primary' : 'text-secondary',
          )}
        >
          <MapPin size={14} className="shrink-0 text-link" aria-hidden />
          {value ? formatPoint(value) : t('owner.location.noPoint')}
        </p>
        {error && (
          <p role="alert" className="text-xs text-danger-text">
            {error}
          </p>
        )}
      </div>
      <Button
        variant="secondary"
        icon={LocateFixed}
        loading={locating}
        onClick={() => void locate()}
      >
        {t('owner.location.myLocation')}
      </Button>
      {locateError && (
        <p role="alert" className="text-xs text-danger-text">
          {locateError}
        </p>
      )}
      <Input
        label={t('owner.location.linkLabel')}
        placeholder={t('owner.location.linkPlaceholder')}
        value={link}
        inputMode="url"
        autoComplete="off"
        error={linkError}
        onChange={(e) => paste(e.target.value)}
        trailing={<Link2 size={18} className="shrink-0 text-secondary" aria-hidden />}
      />
    </div>
  )
}
