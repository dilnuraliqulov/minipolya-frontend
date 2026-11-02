import { isInBookingWindow } from '../stadiums/dates'

/** `/checkout?stadium=<id>&date=YYYY-MM-DD&start=HH:00` — what the stadium page sends. */
export interface CheckoutParams {
  stadiumId: string
  date: string
  /** `"20:00"`, Tashkent time. */
  start: string
}

const HOUR = /^([01]\d|2[0-3]):00$/

/** The checkout link's parameters, or null when any is missing or out of the booking window. */
export function parseCheckoutParams(search: URLSearchParams, today: string): CheckoutParams | null {
  const stadiumId = search.get('stadium') ?? ''
  const date = search.get('date')
  const start = search.get('start') ?? ''
  if (!stadiumId || !HOUR.test(start) || !isInBookingWindow(date, today)) return null
  return { stadiumId, date: date as string, start }
}
