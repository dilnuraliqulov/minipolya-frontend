import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Undo2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { API_MESSAGES, isApiError } from '../../../shared/api'
import {
  formatDate,
  formatDateTime,
  formatSom,
  formatTimeRange,
  toTashkentParts,
} from '../../../shared/format'
import { teamRemainderState, teamRemaining } from '../../../shared/payments/remainder'
import {
  getBooking,
  getGame,
  getTimeline,
  type AdminGameDetail,
  type AdminGameTeam,
  type GamePlayer,
  undoGameRemainderMark,
  undoRemainderMark,
} from '../../api/bookings'
import { StatusTimeline } from '../../audit/StatusTimeline'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { ConfirmModal } from '../../components/Modal'
import { PanelRow, PanelSection, SidePanel } from '../../components/SidePanel'
import { Skeleton } from '../../components/Skeleton'
import { ErrorState } from '../../components/States'
import { StatusBadge } from '../../components/StatusBadge'
import { useToast } from '../../components/Toast'
import { WEEKDAYS_SHORT } from '../../format'
import {
  BOOKING_STATUSES,
  gameStatus,
  GAME_TYPES,
  REMAINDER_CHIPS,
  REMAINDER_MARKS,
  statusOf,
  TEAM_PAYMENT_OPTIONS,
} from '../../statuses'
import { RemainderChip } from './RemainderChip'

const linkClass =
  'rounded-xs text-link hover:underline focus-visible:outline-2 focus-visible:outline-accent'

/** "Pa 22.10.2026 · 20:00–22:00" */
function slotLong(startsAt: string, endsAt: string): string {
  const day = WEEKDAYS_SHORT[toTashkentParts(startsAt).dayOfWeek]
  return `${day} ${formatDate(startsAt)} · ${formatTimeRange(startsAt, endsAt)}`
}

/** An optional amount from the backend; "—" when it is absent. */
const amount = (tiyin: number | undefined) => (tiyin === undefined ? '—' : formatSom(tiyin))

/** A short reference for the title: the last 6 characters of the UUID. */
const shortId = (id: string) => id.replace(/-/g, '').slice(-6).toUpperCase()

function PanelLoading() {
  return (
    <div aria-busy className="flex flex-col gap-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-28 w-full rounded-md" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-20 w-full rounded-md" />
    </div>
  )
}

function UserLink({ id, children }: { id?: string; children: ReactNode }) {
  return id ? (
    <Link to={`/foydalanuvchilar/${id}`} className={linkClass}>
      {children}
    </Link>
  ) : (
    <>{children}</>
  )
}

export function BookingPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const booking = useQuery({
    queryKey: ['admin', 'bookings', 'detail', id],
    queryFn: () => getBooking(id),
    retry: false,
  })
  const timeline = useQuery({
    queryKey: ['admin', 'bookings', 'timeline', id],
    queryFn: () => getTimeline('booking', id),
  })
  const b = booking.data
  const status = b && statusOf(BOOKING_STATUSES, b.status)
  const toast = useToast()
  const queryClient = useQueryClient()
  const [undoing, setUndoing] = useState(false)
  // E6: the admin may undo the owner's mark at any time.
  const undo = useMutation({
    mutationFn: () => undoRemainderMark(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'bookings', 'detail', id], updated)
      toast.success('Belgi bekor qilindi')
    },
    onError: (error) => {
      toast.error(
        isApiError(error) && error.message === API_MESSAGES.noRemainderMark
          ? 'Bu bronda belgi yoʻq — u allaqachon bekor qilingan'
          : 'Belgini bekor qilib boʻlmadi. Qayta urinib koʻring',
      )
    },
    onSettled: () => {
      setUndoing(false)
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })
  const mark = b?.remainderMark

  return (
    <SidePanel
      open
      onClose={onClose}
      title={`Bron #${shortId(id)}`}
      subtitle={b ? `${slotLong(b.startsAt, b.endsAt)} · ${b.stadiumName}` : undefined}
    >
      {booking.isError ? (
        <ErrorState onRetry={() => void booking.refetch()} className="py-10" />
      ) : !b ? (
        <PanelLoading />
      ) : (
        <>
          <PanelSection title="Bron maʼlumotlari">
            <dl className="flex flex-col gap-2.5">
              <PanelRow label="Maydon">
                <Link to={`/maydonlar/${b.stadiumId}`} className={linkClass}>
                  {b.stadiumName}
                </Link>
              </PanelRow>
              <PanelRow label="Sana va vaqt">{slotLong(b.startsAt, b.endsAt)}</PanelRow>
              <PanelRow label="Mijoz">
                <span className="flex flex-wrap items-center gap-1.5">
                  <UserLink id={b.userId}>{b.userName ?? b.clientName ?? '—'}</UserLink>
                  {(b.userPhone ?? b.clientPhone) && (
                    <span className="text-secondary">· {b.userPhone ?? b.clientPhone}</span>
                  )}
                  {b.isWalkin && <StatusBadge tone="neutral">Qoʻlda</StatusBadge>}
                </span>
              </PanelRow>
              <PanelRow label="Holat">
                {status && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
              </PanelRow>
              {b.gameId && (
                <PanelRow label="Oʻyin">
                  <Link to={`/bronlar?tab=oyinlar&oyin=${b.gameId}`} className={linkClass}>
                    Oʻyinni ochish
                  </Link>
                </PanelRow>
              )}
            </dl>
          </PanelSection>

          <PanelSection title="Toʻlov">
            <dl className="flex flex-col gap-2.5">
              {/* Every figure is the backend's; nothing is worked out here. */}
              <PanelRow label="Oʻyinchi narxi">{formatSom(b.price)}</PanelRow>
              <PanelRow label="Egasining narxi">{amount(b.ownerPrice)}</PanelRow>
              <PanelRow label="Ilovada toʻlangan">{amount(b.paidInApp)}</PanelRow>
              {b.cashReceived !== undefined && (
                <PanelRow label="Naqd (ega qabul qildi)">{formatSom(b.cashReceived)}</PanelRow>
              )}
              <PanelRow label="Qolgan summa">
                <span className="flex flex-wrap items-center gap-2">
                  {formatSom(b.remainingAmount)}
                  <RemainderChip booking={b} />
                </span>
              </PanelRow>
              <PanelRow label="Egasiga tushadi">{amount(b.ownerReceives)}</PanelRow>
              <PanelRow label="ATMOS komissiyasi">{amount(b.atmosFee)}</PanelRow>
            </dl>
          </PanelSection>

          {mark && (
            <PanelSection title="Qoldiq belgisi">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-base font-medium text-primary">
                    {REMAINDER_MARKS[mark] ?? mark}
                  </span>
                  {b.remainderMarkedAt && (
                    <span className="text-sm text-secondary">
                      Ega belgiladi: {formatDateTime(b.remainderMarkedAt)}
                    </span>
                  )}
                </span>
                <Button variant="secondary" icon={Undo2} onClick={() => setUndoing(true)}>
                  Belgini bekor qilish
                </Button>
              </div>
            </PanelSection>
          )}

          {b.cancellationReason && (
            <PanelSection title="Bekor qilish sababi">
              <p className="rounded-md bg-surface px-3.5 py-3 text-base text-primary">
                {b.cancellationReason}
              </p>
            </PanelSection>
          )}

          <PanelSection title="Holat tarixi">
            <StatusTimeline
              entries={timeline.data}
              loading={timeline.isPending}
              error={timeline.isError}
            />
          </PanelSection>
          <ConfirmModal
            open={undoing}
            title="Belgini bekor qilish"
            message={
              mark === 'cash_received'
                ? 'Egasining «Naqd olindi» belgisi bekor qilinadi: naqd toʻlov yozuvi bekor qilinadi (pul qaytarilmaydi) va bronning qoldigʻi qayta ochiladi.'
                : 'Egasining «Toʻlanmadi» belgisi bekor qilinadi. Bronning qoldigʻi oʻzgarmaydi.'
            }
            confirmLabel="Belgini bekor qilish"
            busy={undo.isPending}
            onConfirm={() => undo.mutate()}
            onClose={() => {
              if (!undo.isPending) setUndoing(false)
            }}
          />
        </>
      )}
    </SidePanel>
  )
}

/** "Bekzod Rahmatov" → "Bekzod R." for the compact player grid. */
const shortName = (name: string) => {
  const [first, last] = name.split(/\s+/)
  return last ? `${first} ${last[0]}.` : name
}

function Players({ players }: { players: GamePlayer[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
      {players.map((p) => (
        <li key={p.userId} className="truncate text-sm">
          <Link to={`/foydalanuvchilar/${p.userId}`} className={linkClass} title={p.userName}>
            {shortName(p.userName)}
          </Link>
          {p.status === 'joined' && <span className="text-secondary"> · toʻlamagan</span>}
          {(p.status === 'cancelled' || p.status === 'refunded') && (
            <span className="text-secondary"> · chiqdi</span>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * One team of a team game (T9/T10): what it chose, what it paid and still owes, the
 * split of its payments, its players — and the owner's mark with the admin's undo.
 * Every figure is the backend's.
 */
function TeamCard({ team, onUndo }: { team: AdminGameTeam; onUndo: () => void }) {
  const state = teamRemainderState(team)
  const chip = REMAINDER_CHIPS[state]
  const remaining = teamRemaining(team)
  const mark = team.remainderMark
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <Avatar name={team.teamName} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-medium text-primary">{team.teamName}</span>
          <span className="text-xs text-secondary">
            Sardor: <UserLink id={team.leaderId}>{team.leaderName}</UserLink>
          </span>
        </span>
        <span className="flex flex-col items-end">
          <span className="text-2xs text-secondary">Ilova orqali toʻladi</span>
          <span className="text-sm font-semibold text-primary">{formatSom(team.paidInApp)}</span>
        </span>
      </div>
      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-secondary">Toʻlov turi</dt>
          <dd className="font-medium text-primary">
            {team.paymentOption
              ? (TEAM_PAYMENT_OPTIONS[team.paymentOption] ?? team.paymentOption)
              : '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-secondary">Toʻlagan</dt>
          <dd className="font-medium text-primary">{amount(team.paidAmount)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-secondary">Qoldiq</dt>
          <dd className="flex flex-wrap items-center justify-end gap-2 font-medium text-primary">
            {formatSom(remaining)}
            <StatusBadge tone={chip.tone}>{chip.label}</StatusBadge>
          </dd>
        </div>
      </dl>
      <dl className="grid grid-cols-3 gap-2 rounded-md bg-surface px-3 py-2 text-xs">
        {(
          [
            ['Platforma toʻlovi', team.platformFee],
            ['Egasining ulushi', team.ownerPart ?? team.ownerAdvance],
            ['Egasiga qolgan', team.ownerRemainder],
            ['Egasiga tushadi', team.ownerReceives],
            ['ATMOS komissiyasi', team.atmosFee],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-secondary">{label}</dt>
            <dd className="font-medium text-primary">{amount(value)}</dd>
          </div>
        ))}
      </dl>
      {mark && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-primary">
              Qoldiq belgisi: {REMAINDER_MARKS[mark] ?? mark}
            </span>
            {team.remainderMarkedAt && (
              <span className="text-xs text-secondary">
                Ega belgiladi: {formatDateTime(team.remainderMarkedAt)}
              </span>
            )}
          </span>
          <Button variant="secondary" icon={Undo2} onClick={onUndo}>
            Belgini bekor qilish
          </Button>
        </div>
      )}
      <Players players={team.players} />
    </div>
  )
}

function GameBody({
  g,
  onUndoTeam,
}: {
  g: AdminGameDetail
  onUndoTeam: (team: AdminGameTeam) => void
}) {
  const status = gameStatus(g.type, g.status)
  return (
    <>
      <PanelSection title="Oʻyin maʼlumotlari">
        <dl className="flex flex-col gap-2.5">
          <PanelRow label="Maydon">
            <Link to={`/maydonlar/${g.stadiumId}`} className={linkClass}>
              {g.stadiumName}
            </Link>
          </PanelRow>
          <PanelRow label="Sana va vaqt">{slotLong(g.startsAt, g.endsAt)}</PanelRow>
          <PanelRow label="Turi">{GAME_TYPES[g.type] ?? g.type}</PanelRow>
          <PanelRow label="Yaratgan">
            <UserLink id={g.creatorId}>{g.creatorName}</UserLink>
          </PanelRow>
          <PanelRow label="Egasining narxi">{formatSom(g.totalPrice)}</PanelRow>
          {g.serviceFeePerPerson !== undefined && (
            <PanelRow label="Xizmat haqi">{formatSom(g.serviceFeePerPerson)} / oʻyinchi</PanelRow>
          )}
          <PanelRow label="Holat">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          </PanelRow>
          {g.bookingId && (
            <PanelRow label="Bron">
              <Link to={`/bronlar?bron=${g.bookingId}`} className={linkClass}>
                Bronni ochish
              </Link>
            </PanelRow>
          )}
        </dl>
      </PanelSection>

      {g.teams && (
        <PanelSection title="Jamoalar">
          <div className="flex flex-col gap-3">
            {g.teams.map((team) => (
              <TeamCard key={team.side} team={team} onUndo={() => onUndoTeam(team)} />
            ))}
            {g.teams.length === 1 && (
              <p className="rounded-md bg-warning-soft px-3.5 py-2.5 text-sm text-warning-text">
                Raqib kutilmoqda
              </p>
            )}
          </div>
        </PanelSection>
      )}

      {g.participants && (
        <PanelSection
          title="Oʻyinchilar"
          aside={
            <span className="text-sm text-secondary">
              {g.currentPlayers ?? g.participants.length}
              {g.maxPlayers ? ` / ${g.maxPlayers}` : ''}
            </span>
          }
        >
          <Players players={g.participants} />
        </PanelSection>
      )}

      {g.cancellationReason && (
        <PanelSection title="Bekor qilish sababi">
          <p className="rounded-md bg-surface px-3.5 py-3 text-base text-primary">
            {g.cancellationReason}
          </p>
        </PanelSection>
      )}
    </>
  )
}

export function GamePanel({ id, onClose }: { id: string; onClose: () => void }) {
  const game = useQuery({
    queryKey: ['admin', 'games', 'detail', id],
    queryFn: () => getGame(id),
    retry: false,
  })
  const timeline = useQuery({
    queryKey: ['admin', 'games', 'timeline', id],
    queryFn: () => getTimeline('game', id),
  })
  const g = game.data
  const toast = useToast()
  const queryClient = useQueryClient()
  const [undoing, setUndoing] = useState<AdminGameTeam | null>(null)
  // T10: the admin may undo the owner's mark on a team at any time.
  const undo = useMutation({
    mutationFn: (side: 'a' | 'b') => undoGameRemainderMark(id, side),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'games', 'detail', id], updated)
      toast.success('Belgi bekor qilindi')
    },
    onError: (error) => {
      toast.error(
        isApiError(error) && error.message === API_MESSAGES.teamNoRemainderMark
          ? 'Bu jamoada belgi yoʻq — u allaqachon bekor qilingan'
          : 'Belgini bekor qilib boʻlmadi. Qayta urinib koʻring',
      )
    },
    onSettled: () => {
      setUndoing(null)
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })
  return (
    <SidePanel
      open
      onClose={onClose}
      title={`Oʻyin #${shortId(id)}`}
      subtitle={g ? `${slotLong(g.startsAt, g.endsAt)} · ${g.stadiumName}` : undefined}
    >
      {game.isError ? (
        <ErrorState onRetry={() => void game.refetch()} className="py-10" />
      ) : !g ? (
        <PanelLoading />
      ) : (
        <>
          <GameBody g={g} onUndoTeam={setUndoing} />
          <PanelSection title="Holat tarixi">
            <StatusTimeline
              entries={timeline.data}
              loading={timeline.isPending}
              error={timeline.isError}
            />
          </PanelSection>
          <ConfirmModal
            open={undoing !== null}
            title="Belgini bekor qilish"
            message={
              undoing?.remainderMark === 'cash_received'
                ? `${undoing.teamName}: egasining «Naqd olindi» belgisi bekor qilinadi — naqd toʻlov yozuvi bekor qilinadi (pul qaytarilmaydi) va jamoaning qoldigʻi qayta ochiladi.`
                : `${undoing?.teamName ?? ''}: egasining «Toʻlanmadi» belgisi bekor qilinadi. Jamoaning qoldigʻi oʻzgarmaydi.`
            }
            confirmLabel="Belgini bekor qilish"
            busy={undo.isPending}
            onConfirm={() => undoing && undo.mutate(undoing.side)}
            onClose={() => {
              if (!undo.isPending) setUndoing(null)
            }}
          />
        </>
      )}
    </SidePanel>
  )
}
