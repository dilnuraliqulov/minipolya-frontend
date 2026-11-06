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
import {
  getBooking,
  getGame,
  getTimeline,
  type AdminGameDetail,
  type AdminGameTeam,
  type GamePlayer,
  undoRemainderMark,
} from '../../api/bookings'
import { StatusTimeline } from '../../audit/StatusTimeline'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { ConfirmModal } from '../../components/Modal'
import { cx } from '../../components/cx'
import { PanelRow, PanelSection, SidePanel } from '../../components/SidePanel'
import { Skeleton } from '../../components/Skeleton'
import { ErrorState } from '../../components/States'
import { StatusBadge } from '../../components/StatusBadge'
import { useToast } from '../../components/Toast'
import { WEEKDAYS_SHORT } from '../../format'
import { BOOKING_STATUSES, gameStatus, GAME_TYPES, REMAINDER_MARKS, statusOf } from '../../statuses'
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

function TeamCard({ team }: { team: AdminGameTeam }) {
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
      <dl className="grid grid-cols-3 gap-2 rounded-md bg-surface px-3 py-2 text-xs">
        {(
          [
            ['Platforma toʻlovi', team.platformFee],
            ['Egasiga avans', team.ownerAdvance],
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
        <div>
          <dt className="text-secondary">Qoldiq</dt>
          <dd
            className={cx(
              'font-medium',
              team.remainderStatus === 'paid' ? 'text-success-text' : 'text-warning-text',
            )}
          >
            {team.remainderStatus === 'paid' ? 'Toʻlangan' : formatSom(team.remainderAmount)}
          </dd>
        </div>
      </dl>
      <Players players={team.players} />
    </div>
  )
}

function GameBody({ g }: { g: AdminGameDetail }) {
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
              <TeamCard key={team.side} team={team} />
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
          <GameBody g={g} />
          <PanelSection title="Holat tarixi">
            <StatusTimeline
              entries={timeline.data}
              loading={timeline.isPending}
              error={timeline.isError}
            />
          </PanelSection>
        </>
      )}
    </SidePanel>
  )
}
