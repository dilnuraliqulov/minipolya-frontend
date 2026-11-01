import { useTranslation } from 'react-i18next'
import { Badge } from '../components'
import { bookingStatusBadge } from './status'

export function BookingStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const badge = bookingStatusBadge(status)
  return <Badge tone={badge.tone}>{badge.labelKey ? t(badge.labelKey) : badge.raw}</Badge>
}
