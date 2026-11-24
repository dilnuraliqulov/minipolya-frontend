import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { isApiError } from '../../../shared/api'
import { setStadiumHours, type DayHours, type StadiumDetail } from '../../api/stadiums'
import { Button } from '../../components/Button'
import { CARD } from '../../components/card'
import { cx } from '../../components/cx'
import { ConfirmModal, Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'

/** The seven days, Monday first — the backend's `dayOfWeek` 0–6. */
const DAY_NAMES = [
  'Dushanba',
  'Seshanba',
  'Chorshanba',
  'Payshanba',
  'Juma',
  'Shanba',
  'Yakshanba',
] as const

/** The latest a day may close when it closes after midnight. */
const LATEST_AFTER_MIDNIGHT_CLOSE = 6
const MIN_GAP_HOURS = 1

const hhmm = (time: string) => time.slice(0, 5)
const toTime = (hour: number) => `${String(hour).padStart(2, '0')}:00:00`
const toHour = (time: string | undefined) =>
  time === undefined ? 0 : Number(time.slice(0, 2)) || 0

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

/** Whether a day's closing time falls on the next morning (midnight excluded). */
function closesNextMorning(open: number, close: number): boolean {
  return close !== 0 && close <= open
}

function lengthHours(day: DayHours): number {
  if (day.closed || day.openTime === undefined || day.closeTime === undefined) return 0
  const open = toHour(day.openTime)
  const close = toHour(day.closeTime)
  if (close === 0) return 24 - open
  if (close > open) return close - open
  return 24 - open + close
}

/** `"08:00–02:00 (ertasi kuni)"` or `"Yopiq"`. */
function dayLabel(day: DayHours): string {
  if (day.closed || day.openTime === undefined || day.closeTime === undefined) return 'Yopiq'
  const open = toHour(day.openTime)
  const close = toHour(day.closeTime)
  const suffix = closesNextMorning(open, close) ? ' (ertasi kuni)' : ''
  return `${hhmm(day.openTime)}–${hhmm(day.closeTime)}${suffix}`
}

/**
 * The backend's `WeeklyHoursRules`, checked here so a week it would refuse is never sent.
 * Answers the message to show, or null.
 */
function checkWeek(days: DayHours[]): string | null {
  if (days.length !== 7) return 'Haftaning yettala kuni kerak'
  if (days.every((day) => day.closed)) return 'Kamida bitta kun ochiq boʻlsin'
  for (const day of days) {
    if (day.closed) continue
    const open = toHour(day.openTime)
    const close = toHour(day.closeTime)
    if (close === open || (closesNextMorning(open, close) && close > LATEST_AFTER_MIDNIGHT_CLOSE)) {
      return `${DAY_NAMES[day.dayOfWeek]}: yarim tundan keyin yopilish eng kechi 06:00 boʻlishi mumkin`
    }
  }
  for (const day of days) {
    const next = days[(day.dayOfWeek + 1) % 7]
    if (day.closed || next === undefined || next.closed) continue
    const closes = toHour(day.openTime) + lengthHours(day)
    const opens = 24 + toHour(next.openTime)
    if (opens - closes < MIN_GAP_HOURS) {
      return `${DAY_NAMES[day.dayOfWeek]} yopilishi bilan ${DAY_NAMES[next.dayOfWeek]} ochilishi orasida kamida 1 soat boʻlsin`
    }
  }
  return null
}

/**
 * "Ish vaqti": the stadium's weekly opening schedule. A day may close after midnight
 * (06:00 at the latest), and those hours belong to the day that opened them — the working
 * day. Edit → check → confirm → `PUT /api/admin/stadiums/{id}/hours`, audited as
 * STADIUM_HOURS_CHANGED.
 */
export function HoursCard({
  stadium,
  row: Row,
}: {
  stadium: StadiumDetail
  /** The page's label/value row. */
  row: (props: { label: string; children: ReactNode }) => ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const schedule = stadium.hours
  return (
    <section aria-label="Ish vaqti" className={cx(CARD, 'flex flex-col')}>
      <div className="flex items-center gap-2.5 px-5 pt-3.5 pb-2.5">
        <h2 className="text-lg font-semibold text-primary">Ish vaqti</h2>
        <span className="flex-1" />
        {schedule !== undefined && (
          <Button
            variant="secondary"
            icon={Pencil}
            className="h-8 text-sm"
            onClick={() => setEditing(true)}
          >
            Oʻzgartirish
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-3 px-5 pt-1 pb-5">
        <dl className="flex flex-col gap-2.5">
          {schedule === undefined
            ? stadium.openTime !== undefined &&
              stadium.closeTime !== undefined && (
                <Row label="Har kuni">{`${hhmm(stadium.openTime)}–${hhmm(stadium.closeTime)}`}</Row>
              )
            : [...schedule]
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                .map((day) => (
                  <Row key={day.dayOfWeek} label={DAY_NAMES[day.dayOfWeek] ?? ''}>
                    {dayLabel(day)}
                  </Row>
                ))}
        </dl>
        <p className="text-xs text-secondary">
          Yarim tundan keyingi soatlar shu kunning kechasiga tegishli
        </p>
      </div>
      {editing && schedule !== undefined && (
        <HoursModal stadium={stadium} schedule={schedule} onClose={() => setEditing(false)} />
      )}
    </section>
  )
}

function HoursModal({
  stadium,
  schedule,
  onClose,
}: {
  stadium: StadiumDetail
  schedule: DayHours[]
  onClose: () => void
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [days, setDays] = useState<DayHours[]>(() =>
    [...schedule].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
  )
  const [tried, setTried] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const problem = checkWeek(days)

  const setDay = (dayOfWeek: number, next: Partial<DayHours>) => {
    setDays((current) =>
      current.map((day) => {
        if (day.dayOfWeek !== dayOfWeek) return day
        const merged = { ...day, ...next }
        return merged.closed
          ? { dayOfWeek, closed: true }
          : {
              dayOfWeek,
              closed: false,
              openTime: merged.openTime ?? '08:00:00',
              closeTime: merged.closeTime ?? '00:00:00',
            }
      }),
    )
  }

  const save = useMutation({
    mutationFn: () => setStadiumHours(stadium.id, { days }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['admin', 'stadiums', 'detail', stadium.id], saved)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stadiums'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit-log'] })
      toast.success('Ish vaqti saqlandi')
      onClose()
    },
    onError: (error) => {
      setConfirming(false)
      toast.error(
        isApiError(error) && error.status === 404
          ? 'Maydon topilmadi'
          : 'Saqlab boʻlmadi. Qayta urinib koʻring',
      )
    },
  })

  return (
    <>
      <Modal
        open={!confirming}
        title="Ish vaqti"
        onClose={onClose}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button
              onClick={() => {
                setTried(true)
                if (problem === null) setConfirming(true)
              }}
            >
              Saqlash
            </Button>
          </>
        }
      >
        <p className="text-sm text-secondary">
          {stadium.name} uchun haftalik ish vaqti. Yarim tundan keyin yopilish mumkin — eng kechi
          06:00.
        </p>
        <ul className="flex flex-col gap-2">
          {days.map((day) => (
            <li
              key={day.dayOfWeek}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2"
            >
              <span className="w-24 shrink-0 text-base text-primary">
                {DAY_NAMES[day.dayOfWeek]}
              </span>
              <label className="flex items-center gap-1.5 text-sm text-secondary">
                <input
                  type="checkbox"
                  aria-label={`${DAY_NAMES[day.dayOfWeek]} yopiq`}
                  checked={day.closed}
                  onChange={(event) => setDay(day.dayOfWeek, { closed: event.target.checked })}
                  className="size-4 accent-accent"
                />
                Yopiq
              </label>
              {!day.closed && (
                <span className="flex items-center gap-1.5">
                  <select
                    aria-label={`${DAY_NAMES[day.dayOfWeek]} ochilish`}
                    value={day.openTime ?? '08:00:00'}
                    onChange={(event) => setDay(day.dayOfWeek, { openTime: event.target.value })}
                    className="h-8 rounded-md border border-border bg-background px-2 text-sm text-primary"
                  >
                    {HOURS.map((hour) => (
                      <option key={hour} value={toTime(hour)}>
                        {hhmm(toTime(hour))}
                      </option>
                    ))}
                  </select>
                  <span aria-hidden className="text-secondary">
                    –
                  </span>
                  <select
                    aria-label={`${DAY_NAMES[day.dayOfWeek]} yopilish`}
                    value={day.closeTime ?? '00:00:00'}
                    onChange={(event) => setDay(day.dayOfWeek, { closeTime: event.target.value })}
                    className="h-8 rounded-md border border-border bg-background px-2 text-sm text-primary"
                  >
                    {HOURS.map((hour) => (
                      <option key={hour} value={toTime(hour)}>
                        {hhmm(toTime(hour))}
                        {closesNextMorning(toHour(day.openTime), hour) ? ' (ertasi kuni)' : ''}
                      </option>
                    ))}
                  </select>
                </span>
              )}
            </li>
          ))}
        </ul>
        {tried && problem !== null && (
          <p role="alert" className="text-sm text-danger-text">
            {problem}
          </p>
        )}
      </Modal>
      <ConfirmModal
        open={confirming}
        title="Ish vaqtini oʻzgartirasizmi?"
        message={`${stadium.name} uchun haftalik ish vaqti yangilanadi. Mavjud bronlar oʻzgarmaydi.`}
        confirmLabel="Tasdiqlash"
        busy={save.isPending}
        onConfirm={() => save.mutate()}
        onClose={() => setConfirming(false)}
      />
    </>
  )
}
