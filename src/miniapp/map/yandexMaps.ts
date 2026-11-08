import type { LatLon } from '../../shared/map'

/** The parts of the Yandex Maps JS API v3 we use. Coordinates are [longitude, latitude]. */
type LonLat = [number, number]
type MapTheme = 'light' | 'dark'

interface YMapEntity {
  update(props: Record<string, unknown>): void
}
interface YMapInstance extends YMapEntity {
  addChild(child: unknown): void
  removeChild(child: unknown): void
  setLocation(location: { center?: LonLat; zoom?: number; duration?: number }): void
  setBehaviors(behaviors: string[]): void
  readonly zoom: number
  destroy(): void
}
interface TapEvent {
  coordinates: LonLat
}

export interface YandexApi {
  ready: Promise<unknown>
  import(pkg: string): Promise<Record<string, new (props: object) => unknown>>
  YMap: new (element: HTMLElement, props: object, children?: unknown[]) => YMapInstance
  YMapDefaultSchemeLayer: new (props: object) => unknown
  YMapDefaultFeaturesLayer: new (props: object) => unknown
  YMapListener: new (props: object) => unknown
  YMapMarker: new (props: object, element: HTMLElement) => YMapEntity
  YMapControls: new (props: object) => { addChild(child: unknown): void }
}

declare global {
  interface Window {
    ymaps3?: YandexApi
  }
}

const SCRIPT_URL = 'https://api-maps.yandex.ru/v3/'
const LOAD_TIMEOUT_MS = 10_000

/**
 * The map's interface language. Yandex's v3 list (ru_RU, ru_UA, uk_UA, tr_TR,
 * en_RU, en_US, he_IL, en_IL) has no Uzbek, so Uzbek users get Russian.
 */
export function yandexLanguage(appLanguage: string): string {
  return appLanguage === 'en' ? 'en_US' : 'ru_RU'
}

function injectScript(key: string, language: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${SCRIPT_URL}?apikey=${encodeURIComponent(key)}&lang=${language}`
    script.async = true
    const timer = window.setTimeout(() => reject(new Error('timeout')), LOAD_TIMEOUT_MS)
    script.onload = () => {
      window.clearTimeout(timer)
      resolve()
    }
    script.onerror = () => {
      window.clearTimeout(timer)
      reject(new Error('script failed'))
    }
    document.head.appendChild(script)
  })
}

let loading: Promise<YandexApi> | null = null

/**
 * Loads the API once, the first time a screen with a map opens. Rejects with no
 * key or when the script fails; the outcome is kept, so a blocked API is not
 * asked for again on every map.
 */
export function loadYandexMaps(appLanguage: string): Promise<YandexApi> {
  if (loading) return loading
  loading = (async () => {
    const key = import.meta.env.VITE_YANDEX_MAPS_API_KEY?.trim()
    if (!key) throw new Error('no key')
    if (!window.ymaps3) await injectScript(key, yandexLanguage(appLanguage))
    const api = window.ymaps3
    if (!api) throw new Error('no api')
    await api.ready
    return api
  })()
  return loading
}

export function resetYandexMapsForTests(): void {
  loading = null
}

/** Without a tap the map leaves one finger to the page; two fingers still zoom it. */
const LOCKED = ['pinchZoom']
const UNLOCKED = ['drag', 'pinchZoom', 'dblClick']

const toLonLat = (point: LatLon): LonLat => [point.lon, point.lat]

export interface YandexMapOptions {
  center: LatLon
  zoom: number
  theme: MapTheme
  point: LatLon | null
  pinElement: () => HTMLElement
  /** The pin can be dragged. */
  draggable: boolean
  onTap: (point: LatLon) => void
  onDragEnd: (point: LatLon) => void
}

export interface YandexMapHandle {
  setTheme(theme: MapTheme): void
  setPoint(point: LatLon | null): void
  flyTo(point: LatLon, zoom: number, animate: boolean): void
  zoomBy(delta: number): void
  setUnlocked(unlocked: boolean): void
  destroy(): void
}

/** Builds one map. Yandex's logo, copyright and "Open in Yandex Maps" stay as Yandex draws them. */
export function createYandexMap(
  api: YandexApi,
  element: HTMLElement,
  options: YandexMapOptions,
): YandexMapHandle {
  const map = new api.YMap(
    element,
    {
      location: { center: toLonLat(options.center), zoom: options.zoom },
      theme: options.theme,
      behaviors: LOCKED,
    },
    [new api.YMapDefaultSchemeLayer({}), new api.YMapDefaultFeaturesLayer({})],
  )
  map.addChild(
    new api.YMapListener({
      layer: 'any',
      onFastClick: (_object: unknown, event: TapEvent) => {
        const [lon, lat] = event.coordinates
        options.onTap({ lat, lon })
      },
    }),
  )

  let destroyed = false
  // Not fatal if it is missing: the screens also have their own link to Yandex Maps.
  api
    .import('@yandex/controls-extra')
    .then((extra) => {
      const Button = extra.YMapOpenMapsButton
      if (destroyed || !Button) return
      const controls = new api.YMapControls({ position: 'top right' })
      controls.addChild(new Button({}))
      map.addChild(controls)
    })
    .catch(() => undefined)

  let marker: YMapEntity | null = null
  const setPoint: YandexMapHandle['setPoint'] = (point) => {
    if (!point) {
      if (marker) map.removeChild(marker)
      marker = null
    } else if (marker) {
      marker.update({ coordinates: toLonLat(point) })
    } else {
      marker = new api.YMapMarker(
        {
          coordinates: toLonLat(point),
          draggable: options.draggable,
          mapFollowsOnDrag: false,
          onDragEnd: ([lon, lat]: LonLat) => options.onDragEnd({ lat, lon }),
        },
        options.pinElement(),
      )
      map.addChild(marker)
    }
  }
  setPoint(options.point)

  return {
    setTheme: (theme) => map.update({ theme }),
    setPoint,
    flyTo: (point, zoom, animate) =>
      map.setLocation({ center: toLonLat(point), zoom, duration: animate ? 400 : 0 }),
    zoomBy: (delta) => map.setLocation({ zoom: map.zoom + delta, duration: 200 }),
    setUnlocked: (unlocked) => map.setBehaviors(unlocked ? UNLOCKED : LOCKED),
    destroy: () => {
      destroyed = true
      map.destroy()
    },
  }
}
