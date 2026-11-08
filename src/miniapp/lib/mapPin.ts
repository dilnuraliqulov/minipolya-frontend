/** lucide "map-pin", drawn inside the design's 36px accent pin (Leaflet `divIcon` HTML). */
export const PIN_HTML =
  '<span class="flex size-9 items-center justify-center rounded-full bg-accent text-on-accent shadow-md">' +
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>' +
  '<circle cx="12" cy="10" r="3"/></svg></span>'

/**
 * Our Yandex marker: an accent pin with a football in it, its tip on the point.
 * Fill and ball come from the theme tokens, so both modes are covered.
 */
export const PITCH_PIN_HTML =
  '<svg width="40" height="48" viewBox="0 0 40 48" aria-hidden="true" style="display:block;filter:drop-shadow(0 2px 4px rgb(0 0 0 / .35))">' +
  '<path fill="var(--accent)" d="M20 47C20 47 38 31.5 38 19A18 18 0 0 0 2 19C2 31.5 20 47 20 47Z"/>' +
  '<circle cx="20" cy="19" r="12" fill="var(--on-accent)"/>' +
  '<path fill="var(--accent)" d="m20 13.2 4.6 3.3-1.8 5.4h-5.6l-1.8-5.4Z"/>' +
  '<path fill="none" stroke="var(--accent)" stroke-width="1.4" stroke-linecap="round" d="M20 13.2V8.5m4.6 8 4.7-1.6m-6.5 7 2.9 4m-8.5-4-2.9 4m1.1-9.4-4.7-1.6"/>' +
  '</svg>'

/** OpenStreetMap's tile server; the attribution comes from `stadium.mapAttribution`. */
export const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
