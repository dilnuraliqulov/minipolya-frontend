import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, Info } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { somToTiyin } from '../../shared/format'
import { errorMessage } from '../api/errors'
import { createStadium, OWNER_STADIUMS_KEY } from '../api/owner'
import { DISTRICTS, FORMATS } from '../api/stadiums'
import {
  BottomBar,
  Button,
  ButtonLink,
  Card,
  Header,
  Input,
  Screen,
  StateView,
} from '../components'
import { formatMoney } from '../format'
import { useGoBack } from '../lib/useGoBack'
import { formatLabel, SURFACE_KEYS } from '../stadiums/labels'
import { SelectField } from './SelectField'

const STEPS = ['basics', 'place', 'hours', 'price', 'review'] as const
const digits = (value: string) => Number(value.replace(/\D/g, '') || '0')
/** Up to 999 999 999 soʻm — far above any real hourly price, safely inside the tiyin range. */
const MONEY_DIGITS = 9
const moneyInput = (value: string) => value.replace(/\D/g, '').slice(0, MONEY_DIGITS)
/** Bookings start on the hour, so opening hours must too. */
const onTheHour = (time: string) => time.endsWith(':00')

/**
 * Maydon qoʻshish: five steps, then POST /api/owner/stadiums. The stadium is
 * `pending` until an admin approves it. Photos wait for an upload endpoint (R36).
 */
export function AddStadiumPage() {
  const { t } = useTranslation()
  const goBack = useGoBack('/owner/stadium')
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [format, setFormat] = useState<string>(FORMATS[0])
  const [surface, setSurface] = useState('artificial')
  const [address, setAddress] = useState('')
  const [district, setDistrict] = useState('')
  const [phone, setPhone] = useState('')
  const [open, setOpen] = useState('08:00')
  const [close, setClose] = useState('23:00')
  const [price, setPrice] = useState('')
  const [minimum, setMinimum] = useState('')
  const [cancelHours, setCancelHours] = useState('24')
  const create = useMutation({
    mutationFn: () =>
      createStadium({
        name: name.trim(),
        address: address.trim(),
        format,
        surfaceType: surface,
        ...(district ? { district } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        openTime: `${open}:00`,
        closeTime: `${close}:00`,
        pricePerHour: somToTiyin(digits(price)),
        ...(minimum.trim() ? { minBookingAmount: somToTiyin(digits(minimum)) } : {}),
        ...(cancelHours.trim() ? { cancellationHours: digits(cancelHours) } : {}),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: OWNER_STADIUMS_KEY }),
  })
  const current = STEPS[step] ?? 'review'
  const header = (
    <Header
      title={t('owner.wizard.title')}
      onBack={() => {
        if (create.isPending) return
        if (step > 0 && !create.isSuccess) setStep(step - 1)
        else goBack()
      }}
    />
  )

  if (create.isSuccess) {
    return (
      <Screen header={header}>
        <StateView
          icon={CircleCheck}
          title={t('owner.wizard.sentTitle')}
          description={t('owner.wizard.sentText')}
        >
          <div className="w-full pt-3">
            <ButtonLink to="/owner/stadium" replace>
              {t('owner.wizard.toStadium')}
            </ButtonLink>
          </div>
        </StateView>
      </Screen>
    )
  }

  const valid = {
    basics: name.trim().length > 0,
    place: address.trim().length > 0,
    hours: open < close && onTheHour(open) && onTheHour(close),
    price: digits(price) > 0,
    review: true,
  }[current]
  const footer = (
    <BottomBar>
      {current === 'review' ? (
        <Button haptic loading={create.isPending} onClick={() => create.mutate()}>
          {t('owner.wizard.submit')}
        </Button>
      ) : (
        <Button haptic disabled={!valid} onClick={() => setStep(step + 1)}>
          {t('owner.wizard.next')}
        </Button>
      )}
    </BottomBar>
  )

  return (
    <Screen header={header} footer={footer}>
      <p className="text-sm text-secondary">
        {t('owner.wizard.step', {
          n: step + 1,
          total: STEPS.length,
          name: t(`owner.wizard.${current}`),
        })}
      </p>
      {current === 'basics' && (
        <>
          <Input
            label={t('owner.field.name')}
            value={name}
            maxLength={150}
            onChange={(e) => setName(e.target.value)}
          />
          <SelectField
            label={t('owner.field.format')}
            value={format}
            onChange={setFormat}
            options={FORMATS.map((f) => ({ value: f, label: formatLabel(f) }))}
          />
          <SelectField
            label={t('owner.field.surface')}
            value={surface}
            onChange={setSurface}
            options={Object.entries(SURFACE_KEYS).map(([value, key]) => ({ value, label: t(key) }))}
          />
        </>
      )}
      {current === 'place' && (
        <>
          <Input
            label={t('owner.field.address')}
            value={address}
            maxLength={300}
            onChange={(e) => setAddress(e.target.value)}
          />
          <SelectField
            label={t('owner.field.district')}
            value={district}
            onChange={setDistrict}
            placeholder="—"
            options={DISTRICTS.map((d) => ({ value: d, label: d }))}
          />
          <Input
            label={t('owner.field.phone')}
            type="tel"
            inputMode="tel"
            maxLength={20}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </>
      )}
      {current === 'hours' && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('owner.field.open')}
            type="time"
            step={3600}
            value={open}
            onChange={(e) => setOpen(e.target.value)}
          />
          <Input
            label={t('owner.field.close')}
            type="time"
            step={3600}
            value={close}
            onChange={(e) => setClose(e.target.value)}
            error={
              open >= close
                ? t('owner.wizard.hoursError')
                : !onTheHour(open) || !onTheHour(close)
                  ? t('owner.wizard.onTheHour')
                  : undefined
            }
          />
        </div>
      )}
      {current === 'price' && (
        <>
          <Input
            label={t('owner.field.price')}
            inputMode="numeric"
            value={price}
            hint={t('owner.field.priceHint')}
            onChange={(e) => setPrice(moneyInput(e.target.value))}
          />
          <Input
            label={t('owner.field.minimum')}
            inputMode="numeric"
            value={minimum}
            hint={t('owner.field.minimumHint')}
            onChange={(e) => setMinimum(moneyInput(e.target.value))}
          />
          <Input
            label={t('owner.field.cancelHours')}
            inputMode="numeric"
            value={cancelHours}
            onChange={(e) => setCancelHours(e.target.value.replace(/\D/g, ''))}
          />
        </>
      )}
      {current === 'review' && (
        <>
          <Card className="flex flex-col gap-2 p-4 text-base">
            {(
              [
                [t('owner.field.name'), name.trim()],
                [t('owner.field.format'), formatLabel(format)],
                [t('owner.field.address'), [address.trim(), district].filter(Boolean).join(', ')],
                [t('owner.section.hours'), `${open}–${close}`],
                [t('owner.field.price'), formatMoney(somToTiyin(digits(price)))],
                ...(minimum.trim()
                  ? [[t('owner.field.minimum'), formatMoney(somToTiyin(digits(minimum)))] as const]
                  : []),
                ...(cancelHours.trim()
                  ? [
                      [
                        t('owner.field.cancelHours'),
                        t('owner.field.hoursUnit', { count: digits(cancelHours) }),
                      ] as const,
                    ]
                  : []),
              ] as Array<readonly [string, string]>
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="text-secondary">{label}</span>
                <span className="text-right text-primary">{value}</span>
              </div>
            ))}
          </Card>
          <p className="flex gap-2 text-sm text-secondary">
            <Info size={16} className="mt-0.5 shrink-0 text-link" aria-hidden />
            {t('owner.wizard.photosSoon')}
          </p>
          {create.isError && (
            <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">
              {errorMessage(create.error)}
            </p>
          )}
        </>
      )}
      {step > 0 && (
        <Button variant="ghost" disabled={create.isPending} onClick={() => setStep(step - 1)}>
          {t('owner.wizard.back')}
        </Button>
      )}
      {step === 0 && (
        <Button variant="ghost" onClick={goBack}>
          {t('owner.cancel')}
        </Button>
      )}
    </Screen>
  )
}
