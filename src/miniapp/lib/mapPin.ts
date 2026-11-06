/** lucide "map-pin", drawn inside the design's 36px accent pin (Leaflet `divIcon` HTML). */
export const PIN_HTML =
  '<span class="flex size-9 items-center justify-center rounded-full bg-accent text-on-accent shadow-md">' +
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>' +
  '<circle cx="12" cy="10" r="3"/></svg></span>'

/** OpenStreetMap's tile server; the attribution comes from `stadium.mapAttribution`. */
export const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
