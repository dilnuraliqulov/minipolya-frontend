import { Info } from 'lucide-react'
import { lazy, Suspense, type Dispatch, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { somToTiyin } from '../../../shared/format'
import { formatPoint } from '../../../shared/map'
import { Card, Input } from '../../components'
import { cx } from '../../components/cx'
import { LocationPicker } from '../../components/LocationPicker'
import { LocalThumb, PhotoPicker } from '../../components/PhotoPicker'
import { formatMoney } from '../../format'
import { presentFacilities } from '../../stadiums/facilities'
import { formatLabel, surfaceLabel } from '../../stadiums/labels'
import { newUploadKey } from '../usePhotoUploads'
import {
  DescriptionField,
  DistrictField,
  FacilityChips,
  FormatField,
  HourStepper,
  PhoneField,
  SomField,
  SurfaceField,
} from '../StadiumFields'
import { hourLabel, STADIUM_LIMITS } from '../stadiumRules'
import { STEPS, type Draft, type DraftAction, type DraftField, type Step } from './draft'

const StadiumMap = lazy(() =>
  import('../../stadiums/StadiumMap').then((m) => ({ default: m.StadiumMap })),
)

/** Translated messages for the fields of the current step. */
export type FieldErrors = Partial<Record<DraftField, string>>

interface StepProps {
  draft: Draft
  dispatch: Dispatch<DraftAction>
  errors: FieldErrors
}

const set = (dispatch: Dispatch<DraftAction>, patch: Partial<Draft>) =>
  dispatch({ type: 'set', patch })

/** "1/6 · Asosiy", the six-segment bar (animated fill) and the step's title. */
export function StepHeading({ step }: { step: Step }) {
  const { t } = useTranslation()
  const n = STEPS.indexOf(step) + 1
  return (
    <div className="flex flex-col gap-2">
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={n}
        aria-label={t('owner.wizard.progressLabel', { n, total: STEPS.length })}
        className="flex gap-1"
      >
        {STEPS.map((s, i) => (
          <span key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-border">
            <span
              className={cx(
                'block h-full rounded-full bg-accent transition-[width] duration-300 ease-out motion-reduce:transition-none',
                i < n ? 'w-full' : 'w-0',
              )}
            />
          </span>
        ))}
      </div>
      <p className="text-xs text-secondary">
        {t('owner.wizard.progress', {
          n,
          total: STEPS.length,
          name: t(`owner.wizard.steps.${step}`),
        })}
      </p>
      <h2 className="text-3xl font-bold text-primary">{t(`owner.wizard.titles.${step}`)}</h2>
    </div>
  )
}

export function BasicsStep({ draft, dispatch, errors }: StepProps) {
  const { t } = useTranslation()
  return (
    <>
      <Input
        label={t('owner.field.name')}
        placeholder={t('owner.field.namePlaceholder')}
        value={draft.name}
        maxLength={STADIUM_LIMITS.nameMax}
        error={errors.name}
        onChange={(e) => set(dispatch, { name: e.target.value })}
      />
      <FormatField value={draft.format} onChange={(format) => set(dispatch, { format })} />
      <SurfaceField value={draft.surface} onChange={(surface) => set(dispatch, { surface })} />
      <PhoneField
        value={draft.phone}
        error={errors.phone}
        onChange={(phone) => set(dispatch, { phone })}
      />
    </>
  )
}

export function LocationStep({ draft, dispatch, errors }: StepProps) {
  const { t } = useTranslation()
  return (
    <>
      <LocationPicker
        value={draft.point}
        error={errors.point}
        onChange={(point) => set(dispatch, { point })}
      />
      <DistrictField
        value={draft.district}
        error={errors.district}
        onChange={(district) => set(dispatch, { district })}
      />
      <Input
        label={t('owner.field.address')}
        placeholder={t('owner.field.addressPlaceholder')}
        value={draft.address}
        maxLength={STADIUM_LIMITS.addressMax}
        error={errors.address}
        onChange={(e) => set(dispatch, { address: e.target.value })}
      />
      <Input
        label={t('owner.field.landmark')}
        placeholder={t('owner.field.landmarkPlaceholder')}
        value={draft.landmark}
        maxLength={STADIUM_LIMITS.landmarkMax}
        error={errors.landmark}
        onChange={(e) => set(dispatch, { landmark: e.target.value })}
      />
    </>
  )
}

export function PhotosStep({ draft, dispatch, errors }: StepProps) {
  return (
    <PhotoPicker
      photos={draft.photos.map((p) => ({ key: p.key, file: p.file }))}
      error={errors.photos}
      onAdd={(files) =>
        dispatch({
          type: 'addPhotos',
          photos: files.map((file) => ({ key: newUploadKey(), file })),
        })
      }
      onRemove={(key) => dispatch({ type: 'removePhoto', key })}
      onMove={(from, to) => dispatch({ type: 'movePhoto', from, to })}
    />
  )
}

export function FacilitiesStep({ draft, dispatch, errors }: StepProps) {
  const { t } = useTranslation()
  return (
    <>
      <p className="text-sm text-secondary">{t('owner.wizard.facilitiesText')}</p>
      <FacilityChips
        value={draft.amenities}
        onChange={(amenities) => set(dispatch, { amenities })}
      />
      <DescriptionField
        value={draft.description}
        error={errors.description}
        onChange={(description) => set(dispatch, { description })}
      />
    </>
  )
}

export function HoursStep({ draft, dispatch, errors }: StepProps) {
  const { t } = useTranslation()
  const hours = draft.close - draft.open
  return (
    <>
      <div className="flex gap-3">
        <HourStepper
          label={t('owner.wizard.open')}
          value={draft.open}
          max={22}
          onChange={(open) => set(dispatch, { open })}
        />
        <HourStepper
          label={t('owner.wizard.close')}
          value={draft.close}
          min={1}
          onChange={(close) => set(dispatch, { close })}
        />
      </div>
      {errors.hours ? (
        <p role="alert" className="text-sm text-danger-text">
          {errors.hours}
        </p>
      ) : (
        hours > 0 && (
          <p className="text-sm font-medium text-primary">
            {t('owner.wizard.everyDayHours', {
              open: hourLabel(draft.open),
              close: hourLabel(draft.close),
              count: hours,
            })}
          </p>
        )
      )}
      <p className="text-xs text-secondary">{t('owner.wizard.hoursNote')}</p>
      <SomField
        label={t('owner.wizard.yourPrice')}
        value={draft.price}
        hint={t('owner.wizard.priceHint')}
        error={errors.price}
        onChange={(price) => set(dispatch, { price })}
      />
      <Note>{t('owner.wizard.playerPriceNote')}</Note>
    </>
  )
}

/** An info line on the accent tint (the design's note boxes). */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 rounded-xl bg-accent-soft p-3 text-sm text-primary">
      <Info size={16} className="mt-0.5 shrink-0 text-link" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-md font-semibold text-primary">{title}</h3>
        <button
          type="button"
          aria-label={t('owner.wizard.editSection', { section: title })}
          onClick={onEdit}
          className="-my-2 flex min-h-11 items-center text-sm font-medium text-link"
        >
          {t('owner.wizard.edit')}
        </button>
      </div>
      {children}
    </Card>
  )
}

function Rows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="flex flex-col gap-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt className="shrink-0 text-secondary">{label}</dt>
          <dd className="min-w-0 text-right break-words text-primary">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ReviewStep({ draft, onEdit }: { draft: Draft; onEdit: (step: Step) => void }) {
  const { t } = useTranslation()
  const facilities = presentFacilities(draft.amenities)
  const landmark = draft.landmark.trim()
  return (
    <>
      <ReviewSection title={t('owner.wizard.steps.basics')} onEdit={() => onEdit('basics')}>
        <Rows
          rows={[
            [t('owner.field.name'), draft.name.trim()],
            [t('owner.field.format'), formatLabel(draft.format)],
            [t('owner.field.surface'), surfaceLabel(draft.surface, t)],
            [t('owner.field.phone'), draft.phone],
          ]}
        />
      </ReviewSection>
      <ReviewSection title={t('owner.wizard.steps.location')} onEdit={() => onEdit('location')}>
        {draft.point && (
          <>
            <div aria-label={t('owner.wizard.mapPreview')} role="group">
              <Suspense fallback={<div aria-hidden className="h-35 rounded-xl bg-surface" />}>
                <StadiumMap latitude={draft.point.lat} longitude={draft.point.lon} />
              </Suspense>
            </div>
            <p className="text-xs text-secondary tabular-nums">{formatPoint(draft.point)}</p>
          </>
        )}
        <Rows
          rows={[
            [t('owner.field.district'), draft.district],
            [t('owner.field.address'), draft.address.trim()],
            ...(landmark ? [[t('stadium.landmark'), landmark] as [string, string]] : []),
          ]}
        />
      </ReviewSection>
      <ReviewSection
        title={t('owner.wizard.photosCount', { count: draft.photos.length })}
        onEdit={() => onEdit('photos')}
      >
        <ul className="grid grid-cols-4 gap-2">
          {draft.photos.map((photo, index) => (
            <li key={photo.key}>
              <LocalThumb
                file={photo.file}
                alt={t('owner.photos.alt', { n: index + 1 })}
                cover={index === 0}
              />
            </li>
          ))}
        </ul>
      </ReviewSection>
      <ReviewSection title={t('owner.wizard.steps.facilities')} onEdit={() => onEdit('facilities')}>
        {facilities.length === 0 ? (
          <p className="text-sm text-secondary">{t('owner.wizard.noFacilities')}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {facilities.map(({ key, icon: Icon, label }) => (
              <li
                key={key}
                className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-primary"
              >
                <Icon size={14} className="text-link" aria-hidden />
                {t(label)}
              </li>
            ))}
          </ul>
        )}
        {draft.description.trim() && (
          <p className="text-sm whitespace-pre-line text-secondary">{draft.description.trim()}</p>
        )}
      </ReviewSection>
      <ReviewSection title={t('owner.wizard.steps.hours')} onEdit={() => onEdit('hours')}>
        <Rows
          rows={[
            [
              t('owner.wizard.reviewHours'),
              t('owner.wizard.everyDay', {
                open: hourLabel(draft.open),
                close: hourLabel(draft.close),
              }),
            ],
            [
              t('owner.wizard.reviewPrice'),
              t('owner.wizard.perHour', {
                price: formatMoney(somToTiyin(Number(draft.price || '0'))),
              }),
            ],
          ]}
        />
      </ReviewSection>
      <Note>{t('owner.wizard.termsNote')}</Note>
    </>
  )
}
