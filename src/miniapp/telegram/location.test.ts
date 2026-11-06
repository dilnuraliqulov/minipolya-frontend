import { afterEach, describe, expect, it, vi } from 'vitest'
import { installFakeTelegram, removeFakeTelegram } from '../test/fakeTelegram'
import type { TelegramLocationData, TelegramLocationManager } from './webApp'
import { getDeviceLocation, LocationError } from './location'

function fakeManager(
  options: { available?: boolean; data?: TelegramLocationData | null; inited?: boolean } = {},
) {
  const manager: TelegramLocationManager = {
    isInited: options.inited ?? false,
    isLocationAvailable: false,
    isAccessRequested: false,
    isAccessGranted: false,
    init: vi.fn((callback?: () => void) => {
      manager.isInited = true
      manager.isLocationAvailable = options.available ?? true
      callback?.()
      return manager
    }),
    getLocation: vi.fn((callback: (data: TelegramLocationData | null) => void) => {
      callback(options.data === undefined ? { latitude: 41.3, longitude: 69.24 } : options.data)
      return manager
    }),
    openSettings: vi.fn(),
  }
  return manager
}

function stubGeolocation(result: { lat: number; lon: number } | { code: number }) {
  const getCurrentPosition = vi.fn(
    (ok: (p: GeolocationPosition) => void, fail: (e: GeolocationPositionError) => void) => {
      if ('lat' in result) {
        ok({ coords: { latitude: result.lat, longitude: result.lon } } as GeolocationPosition)
      } else {
        fail({ code: result.code, PERMISSION_DENIED: 1 } as GeolocationPositionError)
      }
    },
  )
  vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } })
  return getCurrentPosition
}

afterEach(() => {
  removeFakeTelegram()
  vi.unstubAllGlobals()
})

describe('getDeviceLocation', () => {
  it('uses Telegram’s LocationManager on 8.0+: init, then getLocation', async () => {
    const manager = fakeManager()
    installFakeTelegram({ version: '8.0', LocationManager: manager })
    const browser = stubGeolocation({ lat: 1, lon: 1 })
    await expect(getDeviceLocation()).resolves.toEqual({ lat: 41.3, lon: 69.24 })
    expect(manager.init).toHaveBeenCalled()
    expect(browser).not.toHaveBeenCalled()
  })

  it('a refusal in Telegram is "denied"', async () => {
    installFakeTelegram({ version: '8.0', LocationManager: fakeManager({ data: null }) })
    await expect(getDeviceLocation()).rejects.toEqual(new LocationError('denied'))
  })

  it('falls back to the browser when Telegram has no location on this device, or is older', async () => {
    installFakeTelegram({ version: '8.0', LocationManager: fakeManager({ available: false }) })
    stubGeolocation({ lat: 41.2, lon: 69.1 })
    await expect(getDeviceLocation()).resolves.toEqual({ lat: 41.2, lon: 69.1 })

    removeFakeTelegram()
    const manager = fakeManager()
    installFakeTelegram({ version: '7.10', LocationManager: manager })
    await expect(getDeviceLocation()).resolves.toEqual({ lat: 41.2, lon: 69.1 })
    expect(manager.init).not.toHaveBeenCalled()
  })

  it('maps browser errors to denied / unavailable', async () => {
    stubGeolocation({ code: 1 })
    await expect(getDeviceLocation()).rejects.toMatchObject({ code: 'denied' })
    stubGeolocation({ code: 3 })
    await expect(getDeviceLocation()).rejects.toMatchObject({ code: 'unavailable' })
    vi.stubGlobal('navigator', { ...navigator, geolocation: undefined })
    await expect(getDeviceLocation()).rejects.toMatchObject({ code: 'unavailable' })
  })
})
