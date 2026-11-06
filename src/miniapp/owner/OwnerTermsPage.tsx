import { Clock, MessageCircle, ShieldCheck, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { OwnerStadiumDetail } from '../api/owner'
import { Badge, Button, Card, Screen } from '../components'
import { formatMoney } from '../format'
import { openSupport, supportUsername } from '../telegram'
import { OwnerDetailPage } from './OwnerDetailPage'

/** The backend's default for a stadium whose terms an admin has not set (D4). */
const DEFAULT_CANCELLATION_HOURS = 24

/**
 * Maydonim → Bron shartlari, read-only (D21): the deposit (or full payment) and
 * the free-cancellation hours are agreed with the platform by phone and set by
 * an admin. Shown exactly as the API returns them.
 */
export function OwnerTermsPage() {
  const { t } = useTranslation()
  return (
    <OwnerDetailPage
      title={t('owner.terms.title')}
      screen={(stadium, header) => <Terms stadium={stadium} header={header} />}
    />
  )
}

function Terms({ stadium, header }: { stadium: OwnerStadiumDetail; header: ReactNode }) {
  return (
    <Screen header={header}>
      <BookingTermsCard stadium={stadium} />
    </Screen>
  )
}

/** The "Bron shartlari" card: also used where the owner reviews the stadium. */
export function BookingTermsCard({ stadium }: { stadium: OwnerStadiumDetail }) {
  const { t } = useTranslation()
  const hours = stadium.cancellationPolicy?.cancellationHours ?? DEFAULT_CANCELLATION_HOURS
  return (
    <>
      <Card className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-md font-semibold text-primary">{t('owner.terms.title')}</h2>
          <Badge tone="success">{t('owner.terms.agreed')}</Badge>
        </div>
        <dl className="flex flex-col gap-3">
          <Row icon={<Wallet size={18} aria-hidden />} label={t('owner.terms.minimum')}>
            {stadium.minBookingAmount === undefined ? (
              t('owner.terms.full')
            ) : (
              <>
                <span>{formatMoney(stadium.minBookingAmount)}</span>
                {stadium.playerMinBookingAmount !== undefined && (
                  <span className="text-sm font-normal text-secondary">
                    {t('owner.terms.playerPays', {
                      amount: formatMoney(stadium.playerMinBookingAmount),
                    })}
                  </span>
                )}
              </>
            )}
          </Row>
          <Row icon={<Clock size={18} aria-hidden />} label={t('owner.terms.cancel')}>
            {t('owner.terms.cancelValue', { count: hours })}
          </Row>
        </dl>
      </Card>
      <p className="flex gap-2 text-sm text-secondary">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-link" aria-hidden />
        {t('owner.terms.note')}
      </p>
      {supportUsername() && (
        <Button variant="secondary" icon={MessageCircle} onClick={openSupport}>
          {t('owner.terms.support')}
        </Button>
      )}
    </>
  )
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-link">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <dt className="text-sm text-secondary">{label}</dt>
        <dd className="flex flex-col text-md font-semibold text-primary">{children}</dd>
      </div>
    </div>
  )
}
