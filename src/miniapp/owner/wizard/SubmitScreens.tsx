import { Check, CircleCheck, CircleX, Phone, RotateCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Badge, ButtonLink, Card } from '../../components'
import { cx } from '../../components/cx'
import { LocalThumb } from '../../components/PhotoPicker'
import { maskPhone } from '../../profile/phone'
import type { UploadItem } from '../usePhotoUploads'
import { Note } from './Steps'

/** "Maydon qoʻshish / Yuborilmoqda": the stadium exists, its photos upload one by one. */
export function UploadProgress({
  items,
  onRetry,
}: {
  items: UploadItem[]
  onRetry: (key: string) => void
}) {
  const { t } = useTranslation()
  const done = items.filter((item) => item.state === 'done').length
  const failed = items.filter((item) => item.state === 'failed').length
  const total = items.length
  const fraction =
    total === 0
      ? 0
      : items.reduce((sum, item) => sum + (item.state === 'done' ? 1 : item.progress), 0) / total
  return (
    <>
      <div className="flex flex-col items-start gap-3">
        <Badge tone="success">
          <Check size={12} className="mr-1" aria-hidden />
          {t('owner.wizard.created')}
        </Badge>
        <h2 className="text-3xl font-bold text-primary">{t('owner.wizard.uploadingTitle')}</h2>
        <p className="text-sm text-secondary">{t('owner.wizard.uploadingText')}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-primary tabular-nums">
            {t('owner.wizard.uploadedCount', { done, total })}
          </span>
          {failed > 0 && (
            <span className="font-medium text-danger-text">
              {t('owner.wizard.failedCount', { count: failed })}
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-label={t('owner.wizard.uploadedCount', { done, total })}
          className="h-1.5 overflow-hidden rounded-full bg-border"
        >
          <span
            className="block h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${Math.round(fraction * 100)}%` }}
          />
        </div>
      </div>
      <Card className="p-0">
        <ul className="divide-y divide-border" aria-label={t('owner.section.photos')}>
          {items.map((item, index) => (
            <UploadRow key={item.key} item={item} index={index} onRetry={() => onRetry(item.key)} />
          ))}
        </ul>
      </Card>
      <Note>{t('owner.wizard.leaveNote')}</Note>
    </>
  )
}

function UploadRow({
  item,
  index,
  onRetry,
}: {
  item: UploadItem
  index: number
  onRetry: () => void
}) {
  const { t } = useTranslation()
  const n = index + 1
  const name = index === 0 ? t('owner.wizard.photoCover', { n }) : t('owner.wizard.photoN', { n })
  const percent = Math.round(item.progress * 100)
  return (
    <li className="flex min-h-16 items-center gap-3 px-4 py-2">
      <LocalThumb file={item.file} alt={name} className="w-16 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-base font-medium text-primary">{name}</span>
        {item.state === 'done' && (
          <span className="flex items-center gap-1 text-xs text-success-text">
            <CircleCheck size={14} aria-hidden />
            {t('owner.wizard.status.done')}
          </span>
        )}
        {item.state === 'failed' && (
          <span className="flex items-center gap-1 text-xs text-danger-text">
            <CircleX size={14} aria-hidden />
            {item.error ?? t('owner.wizard.status.failed')}
          </span>
        )}
        {item.state === 'queued' && (
          <span className="text-xs text-secondary">{t('owner.wizard.status.queued')}</span>
        )}
        {item.state === 'uploading' && (
          <span className="flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-border">
              <span
                className="block h-full rounded-full bg-accent transition-[width] duration-200"
                style={{ width: `${percent}%` }}
              />
            </span>
            <span className="text-xs text-secondary tabular-nums">
              {t('owner.photos.progress', { percent })}
            </span>
          </span>
        )}
      </div>
      {item.state === 'done' && (
        <Check size={18} className="shrink-0 text-success-text" aria-hidden />
      )}
      {item.state === 'failed' && (
        <button
          type="button"
          onClick={onRetry}
          aria-label={t('owner.photos.retry', { n })}
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg bg-danger-soft px-3 text-sm font-semibold text-danger-text"
        >
          <RotateCw size={14} aria-hidden />
          {t('common.retry')}
        </button>
      )}
    </li>
  )
}

/** "Maydon qoʻshish / Arizangiz qabul qilindi": every photo is uploaded. */
export function Sent({
  phone,
  fromProfile,
  stadiumLink,
  stadiumLabel,
  homeLink,
}: {
  /** `+998XXXXXXXXX`: the number the admin will call. */
  phone: string
  /** The number is the profile's (so "Profilda yangilang" can fix it). */
  fromProfile: boolean
  stadiumLink: string
  stadiumLabel: string
  homeLink: string
}) {
  const { t } = useTranslation()
  const steps = [
    t('owner.wizard.stepCall'),
    t('owner.wizard.stepContract'),
    t('owner.wizard.stepLive'),
  ]
  return (
    <>
      <div className="flex flex-col items-center gap-3 pt-6 text-center">
        <span className="flex size-18 items-center justify-center rounded-full bg-success-soft text-success-text motion-safe:animate-rise">
          <Check size={36} strokeWidth={2.5} aria-hidden />
        </span>
        <h2 className="text-3xl font-bold text-primary">{t('owner.wizard.sentTitle')}</h2>
        <p className="text-sm text-secondary">{t('owner.wizard.sentText')}</p>
      </div>
      <Card className="flex flex-col items-center gap-1 p-4 text-center">
        <span className="flex items-center gap-2 text-sm text-secondary">
          <Phone size={16} aria-hidden />
          {t('owner.wizard.callNumber')}
        </span>
        <span className="text-2xl font-bold text-primary tabular-nums">{maskPhone(phone)}</span>
        {fromProfile && (
          <span className="text-sm text-secondary">
            {t('owner.wizard.wrongNumber')}{' '}
            <Link
              to="/profile/personal"
              className="inline-flex min-h-11 items-center font-medium text-link"
            >
              {t('owner.wizard.updateInProfile')}
            </Link>
          </span>
        )}
      </Card>
      <section className="flex flex-col gap-2">
        <h3 className="text-md font-semibold text-primary">{t('owner.wizard.nextSteps')}</h3>
        <ol className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <li key={step} className="flex items-center gap-3 text-base text-primary">
              <span
                className={cx(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  'bg-accent-soft text-link-text',
                )}
                aria-hidden
              >
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>
      <div className="flex flex-col gap-2 pt-2">
        <ButtonLink to={stadiumLink} replace>
          {stadiumLabel}
        </ButtonLink>
        <ButtonLink to={homeLink} replace variant="ghost">
          {t('owner.wizard.toHome')}
        </ButtonLink>
      </div>
    </>
  )
}
