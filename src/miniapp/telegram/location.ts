import { getTelegramWebApp, type TelegramLocationManager } from './webApp'

/** `denied`: the user refused access. `unavailable`: the device cannot tell (no GPS, timed out, unsupported). */
export type LocationFailure = 'denied' | 'unavailable'

export class LocationError extends Error {
  readonly code: LocationFailure
  constructor(code: LocationFailure) {
    super(code)
    this.name = 'LocationError'
    this.code = code
  }
}

export interface DeviceLocation {
  lat: number
  lon: number
}

/** Telegram's LocationManager on Bot API 8.0+, else null. */
function telegramLocationManager(): TelegramLocationManager | null {
  const webApp = getTelegramWebApp()
  if (!webApp?.LocationManager || !webApp.isVersionAtLeast('8.0')) return null
  return webApp.LocationManager
}

function init(manager: TelegramLocationManager): Promise<void> {
  if (manager.isInited) return Promise.resolve()
  return new Promise((resolve) => manager.init(() => resolve()))
}

function viaTelegram(manager: TelegramLocationManager): Promise<DeviceLocation> {
  return new Promise((resolve, reject) =>
    manager.getLocation((data) =>
      data
        ? resolve({ lat: data.latitude, lon: data.longitude })
        : reject(new LocationError('denied')),
    ),
  )
}

function viaBrowser(): Promise<DeviceLocation> {
  const geolocation = typeof navigator === 'undefined' ? undefined : navigator.geolocation
  if (!geolocation) return Promise.reject(new LocationError('unavailable'))
  return new Promise((resolve, reject) =>
    geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
      (error) =>
        reject(
          new LocationError(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
        ),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    ),
  )
}

/**
 * "Joriy joylashuvim": inside Telegram 8.0+ through its LocationManager
 * (`init` → `isLocationAvailable` → `getLocation`, Telegram asks the user);
 * otherwise, or when Telegram reports no location on this device, the
 * browser's geolocation. Rejects with `LocationError`.
 */
export async function getDeviceLocation(): Promise<DeviceLocation> {
  const manager = telegramLocationManager()
  if (manager) {
    await init(manager)
    if (manager.isLocationAvailable) return viaTelegram(manager)
  }
  return viaBrowser()
}
