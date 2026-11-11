import { Minus, Plus } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { TASHKENT, type LatLon } from '../../shared/map'
import { cx } from '../components/cx'
import { PITCH_PIN_HTML } from '../lib/mapPin'
import {
  createYandexMap,
  explainYandexFallback,
  loadYandexMaps,
  type YandexMapHandle,
} from './yandexMaps'

/** Leaflet is the fallback only: without a key, or if Yandex fails to load. */
const LeafletStill = lazy(() =>
  import('../stadiums/StadiumMap').then((m) => ({ default: m.StadiumMap })),
)
const LeafletPicker = lazy(() => import('../components/LocationMap'))

const START_ZOOM = 12
const POINT_ZOOM = 17
const STILL_ZOOM = 15

const reducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const readTheme = (): 'light' | 'dark' =>
  document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  return () => observer.disconnect()
}

function pinElement(draggable: boolean): HTMLElement {
  const pin = document.createElement('div')
  pin.innerHTML = PITCH_PIN_HTML
  pin.style.position = 'absolute'
  // The tip of the pin is the point.
  pin.style.transform = 'translate(-50%, -100%)'
  // Inline and important: the locked map's `pan-y` must not reach the pin being dragged.
  if (draggable) pin.style.setProperty('touch-action', 'none', 'important')
  return pin
}

interface YandexMapProps {
  point: LatLon | null
  /** Makes it a picker: a tap moves the pin, the pin drags. */
  onPick?: (point: LatLon) => void
  /** Changes when the point was set from outside (my location, a link): the map flies there. */
  focus?: number
}

/**
 * The Mini App's one map: Yandex Maps v3 in the app's theme with our pin. One
 * finger scrolls the page until the map is tapped; two fingers always work.
 * Yandex's logo, copyright and "Open in Yandex Maps" are never covered.
 */
export function YandexMap({ point, onPick, focus = 0 }: YandexMapProps) {
  const { t, i18n } = useTranslation()
  const picker = onPick !== undefined
  const box = useRef<HTMLDivElement>(null)
  const container = useRef<HTMLDivElement>(null)
  const handle = useRef<YandexMapHandle | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [unlocked, setUnlocked] = useState(false)
  const theme = useSyncExternalStore(subscribeTheme, readTheme)

  // What the map starts with; later changes arrive through the effects below.
  const start = useRef({ point, theme, picker, language: i18n.language })
  const pick = useRef(onPick)
  useEffect(() => {
    pick.current = onPick
  })

  useEffect(() => {
    let cancelled = false
    const { point: first, theme: firstTheme, picker: isPicker, language } = start.current
    loadYandexMaps(language)
      .then((api) => {
        if (cancelled || !container.current) return
        handle.current = createYandexMap(api, container.current, {
          center: first ?? TASHKENT,
          zoom: first ? (isPicker ? POINT_ZOOM : STILL_ZOOM) : START_ZOOM,
          theme: firstTheme,
          point: first,
          draggable: isPicker,
          pinElement: () => pinElement(isPicker),
          onTap: (tapped) => {
            setUnlocked(true)
            pick.current?.(tapped)
          },
          onDragEnd: (dragged) => pick.current?.(dragged),
        })
        setStatus('ready')
      })
      .catch((error: unknown) => {
        explainYandexFallback(error)
        if (!cancelled) setStatus('failed')
      })
    return () => {
      cancelled = true
      handle.current?.destroy()
      handle.current = null
    }
  }, [])

  useEffect(() => handle.current?.setTheme(theme), [theme, status])

  useEffect(() => {
    handle.current?.setUnlocked(unlocked)
    if (!unlocked) return
    const lockOutside = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setUnlocked(false)
    }
    document.addEventListener('pointerdown', lockOutside)
    return () => document.removeEventListener('pointerdown', lockOutside)
  }, [unlocked])

  const lat = point?.lat
  const lon = point?.lon
  useEffect(() => {
    if (status !== 'ready') return
    handle.current?.setPoint(lat !== undefined && lon !== undefined ? { lat, lon } : null)
  }, [lat, lon, status])

  useEffect(() => {
    if (focus === 0 || lat === undefined || lon === undefined) return
    handle.current?.flyTo({ lat, lon }, POINT_ZOOM, !reducedMotion())
    // Only a new focus moves the view; a tap or a drag leaves it where the owner put it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])

  const height = picker ? 'h-50' : 'h-40'

  if (status === 'failed') {
    return (
      <Suspense
        fallback={
          <div aria-hidden className={cx(height, 'animate-pulse rounded-xl bg-skeleton')} />
        }
      >
        {onPick ? (
          <LeafletPicker point={point} focus={focus} onPick={onPick} />
        ) : (
          point && <LeafletStill latitude={point.lat} longitude={point.lon} />
        )}
      </Suspense>
    )
  }

  return (
    <div
      ref={box}
      className={cx(height, 'relative isolate overflow-hidden rounded-xl border border-border')}
    >
      <div
        ref={container}
        role={picker ? 'application' : 'img'}
        aria-label={t(picker ? 'owner.location.mapLabel' : 'stadium.mapLabel')}
        className={cx('size-full', !unlocked && 'touch-pan-y! [&_*]:touch-pan-y!')}
      />
      {status === 'loading' && (
        <div aria-hidden className="absolute inset-0 animate-pulse bg-skeleton" />
      )}
      {status === 'ready' && !unlocked && (
        <span className="pointer-events-none absolute top-2 left-2 rounded-full bg-image-overlay px-2.5 py-1 text-xs font-medium text-on-accent">
          {t('stadium.mapTapHint')}
        </span>
      )}
      {status === 'ready' && picker && (
        // Mid-height on the right: clear of Yandex's logo, copyright and its top-right button.
        <div className="absolute top-1/2 right-2 z-10 flex -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-md">
          <button
            type="button"
            aria-label={t('owner.location.zoomIn')}
            onClick={() => handle.current?.zoomBy(1)}
            className="flex size-11 items-center justify-center text-primary"
          >
            <Plus size={18} aria-hidden />
          </button>
          <span className="h-px bg-border" aria-hidden />
          <button
            type="button"
            aria-label={t('owner.location.zoomOut')}
            onClick={() => handle.current?.zoomBy(-1)}
            className="flex size-11 items-center justify-center text-primary"
          >
            <Minus size={18} aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}
