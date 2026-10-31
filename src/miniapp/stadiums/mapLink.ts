/** An OpenStreetMap link for a stadium: its coordinates, or a search for its address. */
export function mapLink({
  latitude,
  longitude,
  address,
}: {
  latitude?: number
  longitude?: number
  address: string
}): string {
  if (latitude !== undefined && longitude !== undefined) {
    return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`
  }
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`
}
