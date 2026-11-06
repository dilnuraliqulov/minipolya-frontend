/** A point on the map, in degrees. */
export interface LatLon {
  lat: number
  lon: number
}

const NUMBER = '(-?\\d{1,3}(?:\\.\\d+)?)'
const PAIR = new RegExp(`^\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*$`)
const PLACE_PIN = new RegExp(`!3d${NUMBER}!4d${NUMBER}`)
const VIEW_CENTRE = new RegExp(`/@${NUMBER},${NUMBER}`)

function point(lat: number, lon: number): LatLon | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return { lat, lon }
}

/** `"41.3,69.2"` → the two numbers in order, or null. Google's `loc:` prefix is allowed. */
function pair(value: string | null): [number, number] | null {
  const match = value?.replace(/^loc:/, '').match(PAIR)
  return match ? [Number(match[1]), Number(match[2])] : null
}

function isShort(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, '')
  if (host === 'maps.app.goo.gl') return true
  if (host === 'goo.gl' && url.pathname.startsWith('/maps')) return true
  return host.includes('yandex.') && url.pathname.startsWith('/maps/-/')
}

function fromGoogle(url: URL, text: string): LatLon | null {
  const pin = text.match(PLACE_PIN)
  if (pin) return point(Number(pin[1]), Number(pin[2]))
  for (const key of ['q', 'query', 'll', 'center']) {
    const found = pair(url.searchParams.get(key))
    if (found) return point(...found)
  }
  const centre = url.pathname.match(VIEW_CENTRE)
  return centre ? point(Number(centre[1]), Number(centre[2])) : null
}

/** Yandex writes longitude first. The pin (`pt`, "what's here") wins over the view centre (`ll`). */
function fromYandex(url: URL): LatLon | null {
  for (const key of ['pt', 'whatshere[point]', 'll']) {
    const found = pair(url.searchParams.get(key)?.split('~')[0] ?? null)
    if (found) return point(found[1], found[0])
  }
  return null
}

/**
 * The coordinates in a Google Maps or Yandex Maps link the owner pasted (or in
 * plain `"41.29950, 69.24010"`). `'short'` for a short link (maps.app.goo.gl,
 * goo.gl/maps, yandex…/maps/-/…), whose place is only known after a redirect
 * the browser cannot follow; `null` when nothing usable is found.
 */
export function parseMapLink(input: string): LatLon | 'short' | null {
  const plain = pair(input)
  if (plain) return point(...plain)
  const found = input.match(/(?:https?:\/\/)?[\w.-]*(?:google|goo\.gl|yandex)[^\s]*/i)
  if (!found) return null
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(found[0]) ? found[0] : `https://${found[0]}`)
  } catch {
    return null
  }
  if (isShort(url)) return 'short'
  const host = url.hostname.toLowerCase()
  if (host.includes('yandex.')) return fromYandex(url)
  if (host.includes('google.')) {
    let text = found[0]
    try {
      text = decodeURIComponent(text)
    } catch {
      // A stray % — read it as it is.
    }
    return fromGoogle(url, text)
  }
  return null
}
