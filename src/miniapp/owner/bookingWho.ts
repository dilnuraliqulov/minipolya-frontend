import type { TFunction } from 'i18next'
import type { Booking } from '../api/bookings'

/**
 * Who a booking in the owner's schedule is for: the walk-in client's name, a team
 * game ("Jamoa vs jamoa" — its teams are listed in the sheet), or a player who
 * booked in the app.
 */
export function bookingWho(booking: Booking, t: TFunction): string {
  if (booking.clientName) return booking.clientName
  return booking.gameId ? t('games.teamGame') : t('owner.booking.player')
}
