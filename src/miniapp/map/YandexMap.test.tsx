import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../i18n'
import { YandexMap } from './YandexMap'
import {
  loadYandexMaps,
  resetYandexMapsForTests,
  yandexLanguage,
  type YandexApi,
} from './yandexMaps'

vi.mock('../stadiums/StadiumMap', () => ({
  StadiumMap: () => <div data-testid="leaflet-still" />,
}))
vi.mock('../components/LocationMap', () => ({
  default: () => <div data-testid="leaflet-picker" />,
}))

const POINT = { lat: 41.3, lon: 69.25 }

function fakeApi() {
  const calls = {
    mapProps: undefined as unknown as Record<string, unknown>,
    tap: undefined as unknown as (o: unknown, e: { coordinates: [number, number] }) => void,
    markerProps: undefined as unknown as Record<string, unknown> & {
      onDragEnd: (c: [number, number]) => void
    },
    markerElement: undefined as unknown as HTMLElement,
    markerUpdates: [] as unknown[],
    behaviors: [] as string[][],
    locations: [] as unknown[],
    updates: [] as unknown[],
    destroyed: 0,
  }
  const api = {
    ready: Promise.resolve(),
    import: () =>
      Promise.resolve({
        YMapOpenMapsButton: class {},
      }),
    YMap: class {
      zoom = 15
      constructor(_el: HTMLElement, props: Record<string, unknown>) {
        calls.mapProps = props
      }
      addChild() {}
      removeChild() {}
      update(p: unknown) {
        calls.updates.push(p)
      }
      setLocation(l: unknown) {
        calls.locations.push(l)
      }
      setBehaviors(b: string[]) {
        calls.behaviors.push(b)
      }
      destroy() {
        calls.destroyed += 1
      }
    },
    YMapDefaultSchemeLayer: class {},
    YMapDefaultFeaturesLayer: class {},
    YMapListener: class {
      constructor(props: { onFastClick: typeof calls.tap }) {
        calls.tap = props.onFastClick
      }
    },
    YMapMarker: class {
      constructor(props: typeof calls.markerProps, el: HTMLElement) {
        calls.markerProps = props
        calls.markerElement = el
      }
      update(p: unknown) {
        calls.markerUpdates.push(p)
      }
    },
    YMapControls: class {
      addChild() {}
    },
  }
  return { api: api as unknown as YandexApi, calls }
}

beforeEach(() => {
  resetYandexMapsForTests()
  delete window.ymaps3
})
afterEach(() => {
  vi.stubEnv('VITE_YANDEX_MAPS_API_KEY', '')
  document.documentElement.removeAttribute('data-theme')
  document.head.querySelectorAll('script[src*="api-maps"]').forEach((s) => s.remove())
})

describe('loadYandexMaps', () => {
  it('rejects without a key, and adds no script', async () => {
    await expect(loadYandexMaps('uz')).rejects.toThrow()
    expect(document.head.querySelector('script[src*="api-maps"]')).toBeNull()
  })

  it('asks for Russian for Uzbek users: Yandex has no Uzbek', async () => {
    expect(yandexLanguage('uz')).toBe('ru_RU')
    expect(yandexLanguage('ru')).toBe('ru_RU')
    expect(yandexLanguage('en')).toBe('en_US')
    vi.stubEnv('VITE_YANDEX_MAPS_API_KEY', 'k1')
    const loaded = loadYandexMaps('uz')
    await waitFor(() =>
      expect(document.head.querySelector('script[src*="api-maps"]')).not.toBeNull(),
    )
    const script = document.head.querySelector<HTMLScriptElement>('script[src*="api-maps"]')!
    expect(script.src).toBe('https://api-maps.yandex.ru/v3/?apikey=k1&lang=ru_RU')
    window.ymaps3 = fakeApi().api
    script.onload?.(new Event('load'))
    await expect(loaded).resolves.toBe(window.ymaps3)
  })

  it('rejects when the script fails, and loads only once', async () => {
    vi.stubEnv('VITE_YANDEX_MAPS_API_KEY', 'k1')
    const first = loadYandexMaps('uz')
    expect(loadYandexMaps('uz')).toBe(first)
    await waitFor(() =>
      expect(document.head.querySelector('script[src*="api-maps"]')).not.toBeNull(),
    )
    document.head
      .querySelector<HTMLScriptElement>('script[src*="api-maps"]')!
      .onerror?.(new Event('error'))
    await expect(first).rejects.toThrow()
  })
})

describe('YandexMap', () => {
  const withApi = () => {
    const fake = fakeApi()
    window.ymaps3 = fake.api
    vi.stubEnv('VITE_YANDEX_MAPS_API_KEY', 'k1')
    return fake
  }

  it('falls back to the still Leaflet map when there is no key', async () => {
    render(<YandexMap point={POINT} />)
    expect(await screen.findByTestId('leaflet-still')).toBeInTheDocument()
  })

  it('falls back to the Leaflet picker when the API fails', async () => {
    vi.stubEnv('VITE_YANDEX_MAPS_API_KEY', 'k1')
    window.ymaps3 = { ...fakeApi().api, ready: Promise.reject(new Error('blocked')) }
    render(<YandexMap point={POINT} onPick={vi.fn()} />)
    expect(await screen.findByTestId('leaflet-picker')).toBeInTheDocument()
  })

  it('starts on the point, in the app theme, with one finger left to the page', async () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    const { calls } = withApi()
    render(<YandexMap point={POINT} />)
    await waitFor(() => expect(calls.mapProps).toBeDefined())
    expect(calls.mapProps.theme).toBe('dark')
    expect(calls.mapProps.behaviors).toEqual(['pinchZoom'])
    expect(calls.mapProps.location).toMatchObject({ center: [69.25, 41.3] })
    expect(calls.markerProps.coordinates).toEqual([69.25, 41.3])
    expect(calls.markerProps.draggable).toBe(false)
  })

  it('follows the theme live', async () => {
    const { calls } = withApi()
    render(<YandexMap point={POINT} />)
    await waitFor(() => expect(calls.mapProps).toBeDefined())
    act(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await waitFor(() => expect(calls.updates).toContainEqual({ theme: 'dark' }))
  })

  it('a tap unlocks dragging, and a tap outside locks it again', async () => {
    const { calls } = withApi()
    render(<YandexMap point={POINT} />)
    await waitFor(() => expect(calls.tap).toBeDefined())
    act(() => calls.tap(undefined, { coordinates: [69.3, 41.4] }))
    expect(calls.behaviors.at(-1)).toContain('drag')
    fireEvent.pointerDown(document.body)
    expect(calls.behaviors.at(-1)).not.toContain('drag')
  })

  it('picker: a tap moves the pin, the pin can be dragged, coordinates come back as lat/lon', async () => {
    const { calls } = withApi()
    const onPick = vi.fn()
    render(<YandexMap point={POINT} onPick={onPick} />)
    await waitFor(() => expect(calls.tap).toBeDefined())
    expect(calls.markerProps.draggable).toBe(true)
    act(() => calls.tap(undefined, { coordinates: [69.3, 41.4] }))
    expect(onPick).toHaveBeenLastCalledWith({ lat: 41.4, lon: 69.3 })
    act(() => calls.markerProps.onDragEnd([69.1, 41.2]))
    expect(onPick).toHaveBeenLastCalledWith({ lat: 41.2, lon: 69.1 })
  })

  it('the pin keeps its own touch handling, so it drags while the map is locked', async () => {
    const { calls } = withApi()
    render(<YandexMap point={POINT} onPick={vi.fn()} />)
    await waitFor(() => expect(calls.markerElement).toBeDefined())
    expect(calls.markerElement.style.getPropertyValue('touch-action')).toBe('none')
  })

  it('flies to a point set from outside, and moves the pin', async () => {
    const { calls } = withApi()
    const { rerender } = render(<YandexMap point={POINT} focus={0} onPick={vi.fn()} />)
    await waitFor(() => expect(calls.markerProps).toBeDefined())
    expect(calls.locations).toHaveLength(0)
    rerender(<YandexMap point={{ lat: 41.5, lon: 69.5 }} focus={1} onPick={vi.fn()} />)
    await waitFor(() => expect(calls.locations).toHaveLength(1))
    expect(calls.locations[0]).toMatchObject({ center: [69.5, 41.5], zoom: 17 })
    expect(calls.markerUpdates).toContainEqual({ coordinates: [69.5, 41.5] })
  })

  it('destroys the map when it leaves the screen', async () => {
    const { calls } = withApi()
    const { unmount } = render(<YandexMap point={POINT} />)
    await waitFor(() => expect(calls.mapProps).toBeDefined())
    unmount()
    expect(calls.destroyed).toBe(1)
  })
})
