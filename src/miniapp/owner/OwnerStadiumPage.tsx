import { CalendarOff, Clock, FileText, Image, Plus, ShieldCheck, Tag } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { isAvailable } from '../api/missing'
import { OWNER_STADIUM_DETAIL, type OwnerStadium } from '../api/owner'
import { Badge, Button, Card, ListRow, LogoMark, type BadgeTone } from '../components'
import { formatMoney } from '../format'
import { formatLabel, ratingLabel, surfaceLabel } from '../stadiums/labels'
import { OwnerTabScreen } from './OwnerTabScreen'
import { AddStadiumButton, WithOwnerStadium } from './StadiumPicker'

const STATUS: Record<
  string,
  { tone: BadgeTone; key: 'pending' | 'approved' | 'rejected' | 'blocked' }
> = {
  pending: { tone: 'warning', key: 'pending' },
  approved: { tone: 'success', key: 'approved' },
  rejected: { tone: 'danger', key: 'rejected' },
  blocked: { tone: 'danger', key: 'blocked' },
}

/** Maydonim: the owner's stadium, its review status and its settings. */
export function OwnerStadiumPage() {
  const { t } = useTranslation()
  return (
    <OwnerTabScreen title={t('owner.tabs.stadium')} action={<AddStadiumButton />}>
      <WithOwnerStadium>{(stadium) => <StadiumOverview stadium={stadium} />}</WithOwnerStadium>
    </OwnerTabScreen>
  )
}

function StadiumOverview({ stadium }: { stadium: OwnerStadium }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [broken, setBroken] = useState(false)
  const status = STATUS[stadium.status]
  const meta = [
    stadium.district ? t('stadium.districtName', { district: stadium.district }) : null,
    stadium.format ? formatLabel(stadium.format) : null,
    stadium.surfaceType ? surfaceLabel(stadium.surfaceType, t) : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const soon = !isAvailable(OWNER_STADIUM_DETAIL)
  const base = `/owner/stadium/${stadium.id}`

  return (
    <>
      <Card className="flex items-center gap-3 p-4">
        <span className="flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface text-secondary">
          {stadium.coverPhotoUrl && !broken ? (
            <img
              src={stadium.coverPhotoUrl}
              alt=""
              width={72}
              height={72}
              className="size-full object-cover"
              onError={() => setBroken(true)}
            />
          ) : (
            <LogoMark size={28} className="opacity-40" />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <h2 className="w-full truncate text-xl font-bold text-primary">{stadium.name}</h2>
          {meta && <p className="text-sm text-secondary">{meta}</p>}
          <div className="flex items-center gap-2">
            <Badge tone={status?.tone ?? 'neutral'}>
              {status ? t(`owner.status.${status.key}`) : stadium.status}
            </Badge>
            {stadium.averageRating !== undefined && (
              <span className="text-sm text-secondary">
                {`★ ${ratingLabel(stadium.averageRating)} (${stadium.reviewCount ?? 0})`}
              </span>
            )}
          </div>
        </div>
      </Card>

      {status && status.key !== 'approved' && (
        <div
          role="status"
          className={
            status.key === 'pending'
              ? 'rounded-xl bg-warning-soft p-3 text-sm text-warning'
              : 'rounded-xl bg-danger-soft p-3 text-sm text-danger'
          }
        >
          <p>{t(`owner.banner.${status.key}`)}</p>
          {stadium.statusReason && (
            <p className="pt-1 font-semibold">
              {t('owner.banner.reason', { reason: stadium.statusReason })}
            </p>
          )}
        </div>
      )}

      <Card>
        <ListRow
          icon={FileText}
          label={t('owner.section.info')}
          sub={t('owner.section.infoText')}
          onClick={() => navigate(`${base}/info`)}
        />
        <ListRow
          icon={Tag}
          label={t('owner.section.prices')}
          sub={
            stadium.pricePerHour !== undefined
              ? t('owner.section.pricesText', { price: formatMoney(stadium.pricePerHour) })
              : undefined
          }
          onClick={() => navigate(`${base}/prices`)}
        />
        <ListRow
          icon={CalendarOff}
          label={t('owner.section.closures')}
          sub={t('owner.section.closuresText')}
          onClick={() => navigate(`${base}/closures`)}
        />
        <ListRow
          icon={Clock}
          label={t('owner.section.hours')}
          sub={soon ? t('common.soon') : undefined}
          disabled={soon}
        />
        <ListRow
          icon={ShieldCheck}
          label={t('owner.section.terms')}
          sub={soon ? t('common.soon') : undefined}
          disabled={soon}
        />
        <ListRow
          icon={Image}
          label={t('owner.section.photos')}
          sub={soon ? t('common.soon') : undefined}
          disabled={soon}
        />
      </Card>
      {soon && <p className="px-1 text-xs text-secondary">{t('owner.soonDetail')}</p>}

      <Button variant="ghost" icon={Plus} onClick={() => navigate('/owner/new')}>
        {t('owner.addStadium')}
      </Button>
    </>
  )
}
