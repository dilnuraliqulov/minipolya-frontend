import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { API_MESSAGES, isApiError } from '../../../shared/api'
import { formatSom, somToTiyin } from '../../../shared/format'
import { setBookingTerms, type StadiumDetail } from '../../api/stadiums'
import { Button } from '../../components/Button'
import { CARD } from '../../components/card'
import { cx } from '../../components/cx'
import { ConfirmModal, Modal } from '../../components/Modal'
import { NumberField } from '../../components/NumberField'
import { useToast } from '../../components/Toast'

/** The backend's defaults for a stadium whose terms were never set (D4). */
const DEFAULT_HOURS = 24
/** Tiyin: the deposit floor (500 so'm). */
const MIN_DEPOSIT = 50_000
const MAX_HOURS = 168

type Mode = 'full' | 'deposit'

function currentHours(stadium: StadiumDetail): number {
  return stadium.cancellationHours ?? stadium.cancellationPolicy?.cancellationHours ?? DEFAULT_HOURS
}

function failureText(error: unknown): string {
  if (!isApiError(error)) return 'Saqlab boʻlmadi. Qayta urinib koʻring'
  if (error.status === 404) return 'Maydon topilmadi'
  if (error.message === API_MESSAGES.minimumTooLow) return 'Oldindan toʻlov kamida 500 soʻm boʻlsin'
  if (error.message === API_MESSAGES.minimumAbovePrice)
    return 'Oldindan toʻlov soatlik narxdan oshmasin'
  if (error.message === API_MESSAGES.cancellationHoursRange)
    return 'Bekor qilish muddati 0 dan 168 soatgacha boʻlsin'
  return 'Saqlab boʻlmadi. Qayta urinib koʻring'
}

/**
 * "Bron shartlari" (design D3, D21): the deposit (or full payment) and the
 * free-cancellation hours, agreed with the owner by phone and set here only.
 * Edit → check → confirm → `PUT /api/admin/stadiums/{id}/booking-terms`.
 */
export function BookingTermsCard({
  stadium,
  row: Row,
}: {
  stadium: StadiumDetail
  /** The page's label/value row. */
  row: (props: { label: string; children: ReactNode }) => ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const hours = currentHours(stadium)
  return (
    <section aria-label="Bron shartlari" className={cx(CARD, 'flex flex-col')}>
      <div className="flex items-center gap-2.5 px-5 pt-3.5 pb-2.5">
        <h2 className="text-lg font-semibold text-primary">Bron shartlari</h2>
        <span className="flex-1" />
        <Button
          variant="secondary"
          icon={Pencil}
          className="h-8 text-sm"
          onClick={() => setEditing(true)}
        >
          Oʻzgartirish
        </Button>
      </div>
      <div className="flex flex-col gap-3 px-5 pt-1 pb-5">
        <dl className="flex flex-col gap-2.5">
          <Row label="Minimal toʻlov">
            <span className="flex flex-col gap-0.5">
              {stadium.minBookingAmount === undefined ? (
                'Toʻliq toʻlov'
              ) : (
                <>
                  <span>Egasining: {formatSom(stadium.minBookingAmount)}</span>
                  {stadium.playerMinBookingAmount !== undefined && (
                    <span>Oʻyinchilar uchun: {formatSom(stadium.playerMinBookingAmount)}</span>
                  )}
                </>
              )}
              <span className="text-xs text-secondary">
                Bron qilishda oʻyinchi toʻlaydigan eng kam summa
              </span>
            </span>
          </Row>
          <Row label="Bekor qilish">{`Boshlanishidan ${hours} soat oldingacha`}</Row>
        </dl>
        <p className="text-xs text-secondary">
          Egasi bilan telefon orqali kelishiladi; egasi ularni faqat koʻradi
        </p>
      </div>
      {editing && <TermsModal stadium={stadium} onClose={() => setEditing(false)} />}
    </section>
  )
}

function TermsModal({ stadium, onClose }: { stadium: StadiumDetail; onClose: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>(
    stadium.minBookingAmount === undefined ? 'full' : 'deposit',
  )
  const [amount, setAmount] = useState(
    stadium.minBookingAmount === undefined
      ? ''
      : String(Math.floor(stadium.minBookingAmount / 100)),
  )
  const [hours, setHours] = useState(String(currentHours(stadium)))
  const [tried, setTried] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const deposit = amount === '' ? null : somToTiyin(Number(amount))
  const hoursValue = hours === '' ? null : Number(hours)
  const price = stadium.pricePerHour
  const amountError =
    mode !== 'deposit'
      ? undefined
      : deposit === null
        ? 'Summani kiriting'
        : deposit < MIN_DEPOSIT
          ? 'Kamida 500 soʻm'
          : price !== undefined && deposit > price
            ? `Soatlik narxdan (${formatSom(price)}) oshmasin`
            : undefined
  const hoursError =
    hoursValue === null || hoursValue > MAX_HOURS ? '0 dan 168 soatgacha' : undefined
  const invalid = Boolean(amountError || hoursError)

  const save = useMutation({
    mutationFn: () =>
      setBookingTerms(stadium.id, {
        minBookingAmount: mode === 'deposit' ? deposit : null,
        cancellationHours: hoursValue ?? DEFAULT_HOURS,
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['admin', 'stadiums', 'detail', stadium.id], saved)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stadiums'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit-log'] })
      toast.success('Bron shartlari saqlandi')
      onClose()
    },
    onError: (error) => {
      setConfirming(false)
      toast.error(failureText(error))
    },
  })

  const summary =
    (mode === 'full' || deposit === null
      ? 'Toʻliq toʻlov'
      : `Oldindan toʻlov ${formatSom(deposit)}`) +
    `, bekor qilish boshlanishidan ${hoursValue ?? DEFAULT_HOURS} soat oldingacha`

  return (
    <>
      <Modal
        open={!confirming}
        title="Bron shartlari"
        onClose={onClose}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button
              onClick={() => {
                setTried(true)
                if (!invalid) setConfirming(true)
              }}
            >
              Saqlash
            </Button>
          </>
        }
      >
        <p className="text-sm text-secondary">
          {stadium.name} uchun egasi bilan kelishilgan shartlar
        </p>
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-1.5 text-base font-medium text-primary">Toʻlov</legend>
          {(
            [
              ['full', 'Toʻliq toʻlov', 'Oʻyinchi bron qilishda butun narxni toʻlaydi'],
              ['deposit', 'Oldindan toʻlov', 'Bron qilishda eng kam summa, qolgani keyin'],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className={cx(
                'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5',
                mode === value ? 'border-accent bg-accent-soft' : 'border-border',
              )}
            >
              <input
                type="radio"
                name="terms-mode"
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
                className="mt-1 accent-accent"
              />
              <span className="flex flex-col">
                <span className="text-base font-medium text-primary">{label}</span>
                <span className="text-sm text-secondary">{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {mode === 'deposit' && (
          <NumberField
            label="Oldindan toʻlov (egasining narxida)"
            suffix="so'm"
            maxLength={9}
            value={amount}
            onChange={setAmount}
            helper={
              price !== undefined ? `500 soʻmdan ${formatSom(price)} gacha` : 'Kamida 500 soʻm'
            }
            error={tried ? amountError : undefined}
          />
        )}
        <NumberField
          label="Bepul bekor qilish"
          suffix="soat"
          maxLength={3}
          value={hours}
          onChange={setHours}
          helper="Oʻyin boshlanishidan shuncha soat oldingacha, 0–168"
          error={tried ? hoursError : undefined}
        />
      </Modal>
      <ConfirmModal
        open={confirming}
        title="Bron shartlarini oʻzgartirish"
        message={`${stadium.name}: ${summary}. Saqlaysizmi?`}
        confirmLabel="Saqlash"
        busy={save.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={() => save.mutate()}
      />
    </>
  )
}
