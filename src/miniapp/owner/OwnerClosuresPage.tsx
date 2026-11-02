import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '../api/errors'
import {
  addClosure,
  closuresKey,
  removeClosure,
  type Closure,
  type OwnerStadium,
} from '../api/owner'
import {
  BottomSheet,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  SkeletonList,
  useToast,
} from '../components'
import { dayTitle } from '../stadiums/dates'
import { OwnerStadiumSubPage } from './OwnerStadiumSubPage'
import { useClosures } from './queries'
import { tashkentToday } from '../../shared/format'

/** Yopiq kunlar: planned closures — list, add a full-day closure, remove. */
export function OwnerClosuresPage() {
  const { t } = useTranslation()
  return (
    <OwnerStadiumSubPage title={t('owner.closures.title')}>
      {(stadium) => <Closures stadium={stadium} />}
    </OwnerStadiumSubPage>
  )
}

function closureLabel(closure: Closure): string {
  const days =
    closure.startDate === closure.endDate
      ? dayTitle(closure.startDate)
      : `${dayTitle(closure.startDate)} – ${dayTitle(closure.endDate)}`
  return closure.startTime && closure.endTime
    ? `${days}, ${closure.startTime.slice(0, 5)}–${closure.endTime.slice(0, 5)}`
    : days
}

function Closures({ stadium }: { stadium: OwnerStadium }) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const closures = useClosures(stadium.id)
  const [adding, setAdding] = useState(false)
  const remove = useMutation({
    mutationFn: removeClosure,
    onSuccess: () => {
      toast.show(t('owner.closures.removed'), 'success')
      void queryClient.invalidateQueries({ queryKey: closuresKey(stadium.id) })
      // A closure changes which hours are free on Jadval and for players.
      void queryClient.invalidateQueries({ queryKey: ['availability', stadium.id] })
      void queryClient.invalidateQueries({ queryKey: ['owner', 'schedule', stadium.id] })
    },
    onError: (error) => toast.show(errorMessage(error), 'danger'),
  })
  const list = [...(closures.data ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate))
  return (
    <>
      {closures.isPending ? (
        <SkeletonList count={2} variant="item" />
      ) : closures.isError ? (
        <ErrorState onRetry={() => void closures.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title={t('owner.closures.empty')} />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-border" aria-label={t('owner.closures.title')}>
            {list.map((closure) => {
              const label = closureLabel(closure)
              return (
                <li key={closure.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-base text-primary">{label}</span>
                    <span className="text-xs text-secondary">
                      {closure.reason ?? (closure.startTime ? '' : t('owner.closures.allDay'))}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={t('owner.removeItem', { item: label })}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(closure.id)}
                    className="flex size-11 items-center justify-center text-danger disabled:opacity-50"
                  >
                    <Trash2 size={18} aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
      <Button variant="ghost" icon={Plus} onClick={() => setAdding(true)}>
        {t('owner.closures.add')}
      </Button>
      {adding && <AddClosureSheet stadiumId={stadium.id} onClose={() => setAdding(false)} />}
    </>
  )
}

function AddClosureSheet({ stadiumId, onClose }: { stadiumId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [today] = useState(() => tashkentToday())
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(today)
  const [reason, setReason] = useState('')
  const add = useMutation({
    mutationFn: () =>
      addClosure(stadiumId, {
        startDate: start,
        endDate: end,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      }),
    onSuccess: () => {
      toast.show(t('owner.closures.added'), 'success')
      void queryClient.invalidateQueries({ queryKey: closuresKey(stadiumId) })
      void queryClient.invalidateQueries({ queryKey: ['availability', stadiumId] })
      void queryClient.invalidateQueries({ queryKey: ['owner', 'schedule', stadiumId] })
      onClose()
    },
  })
  return (
    <BottomSheet
      open
      title={t('owner.closures.add')}
      onClose={() => {
        if (!add.isPending) onClose()
      }}
      actions={
        <Button
          haptic
          disabled={!start || !end || end < start}
          loading={add.isPending}
          onClick={() => add.mutate()}
        >
          {t('owner.add')}
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('owner.field.startDate')}
          type="date"
          min={today}
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <Input
          label={t('owner.field.endDate')}
          type="date"
          min={start}
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>
      <Input
        label={t('owner.field.reason')}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {add.isError && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(add.error)}
        </p>
      )}
    </BottomSheet>
  )
}
