import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, LockOpen, Phone } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { isApiError } from '../../../shared/api'
import { formatDate, formatDateTime, formatNumber, formatSom } from '../../../shared/format'
import { getAuditLog } from '../../api/audit'
import { BOOKINGS_LIST, listBookings, type AdminBooking } from '../../api/bookings'
import { availability, requestFor } from '../../api/missing'
import { listOwnerStadiums, OWNER_STADIUMS, type StadiumRow } from '../../api/stadiums'
import {
  getAdminUser,
  getLatestBlock,
  getUserTeams,
  setUserBlocked,
  USER_TEAMS,
  type AdminUser,
} from '../../api/users'
import { AuditLogTable } from '../../audit/AuditLogTable'
import { useSession } from '../../auth/session'
import { SoonSection } from '../../components/Availability'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { CARD } from '../../components/card'
import { cx } from '../../components/cx'
import { DataTable, type Column } from '../../components/DataTable'
import { ConfirmModal, ReasonModal } from '../../components/Modal'
import { Pagination } from '../../components/Pagination'
import { SampleTag } from '../../components/SampleTag'
import { Skeleton } from '../../components/Skeleton'
import { EmptyState, ErrorState } from '../../components/States'
import { StatusBadge } from '../../components/StatusBadge'
import { Tabs } from '../../components/Tabs'
import { useToast } from '../../components/Toast'
import { formatSlot } from '../../format'
import { usePageHeader } from '../../layout/pageHeader'
import { BOOKING_STATUSES, STADIUM_STATUSES, statusOf } from '../../statuses'
import { RoleBadges } from './badges'

const PAGE_SIZE = 10
const LANGUAGES = { uz: 'Oʻzbekcha', ru: 'Ruscha', en: 'Inglizcha' }

const linkClass =
  'rounded-xs text-link hover:underline focus-visible:outline-2 focus-visible:outline-accent'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-base">
      <dt className="w-32 shrink-0 text-sm text-secondary">{label}</dt>
      <dd className="min-w-0 flex-1 text-primary">{children}</dd>
    </div>
  )
}

const BOOKING_COLUMNS: Column<AdminBooking>[] = [
  {
    key: 'when',
    header: 'Sana va vaqt',
    width: 220,
    render: (b) => <span className="whitespace-nowrap">{formatSlot(b.startsAt, b.endsAt)}</span>,
  },
  {
    key: 'stadium',
    header: 'Maydon',
    render: (b) => (
      <Link
        to={`/maydonlar/${b.stadiumId}`}
        onClick={(e) => e.stopPropagation()}
        className={linkClass}
      >
        {b.stadiumName}
      </Link>
    ),
  },
  { key: 'price', header: 'Summa', width: 150, render: (b) => formatSom(b.price) },
  {
    key: 'status',
    header: 'Holat',
    width: 170,
    render: (b) => {
      const s = statusOf(BOOKING_STATUSES, b.status)
      return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
    },
  },
]

function BookingsTab({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const mode = availability(BOOKINGS_LIST)
  const bookings = useQuery({
    queryKey: ['admin', 'bookings', 'user', userId, page],
    queryFn: () => listBookings({ userId, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    enabled: mode !== 'soon',
  })
  if (mode === 'soon') return <SoonSection />
  const data = bookings.data
  return (
    <div className="flex flex-col gap-2">
      {mode === 'sample' && (
        <span className="self-start">
          <SampleTag request={requestFor(BOOKINGS_LIST)!} />
        </span>
      )}
      <DataTable
        columns={BOOKING_COLUMNS}
        rows={data?.content}
        rowKey={(b) => b.id}
        onRowClick={(b) => void navigate(`/bronlar?bron=${b.id}`)}
        loading={bookings.isPending}
        error={bookings.isError}
        onRetry={() => void bookings.refetch()}
        empty={{ title: 'Bronlar yoʻq', description: 'Bu foydalanuvchi hali bron qilmagan' }}
        loadingRows={4}
      />
      {data && data.totalPages > 1 && (
        <Pagination
          page={data.page}
          size={data.size}
          totalElements={data.totalElements}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

const STADIUM_COLUMNS: Column<StadiumRow>[] = [
  { key: 'name', header: 'Maydon', render: (s) => <span className="font-medium">{s.name}</span> },
  { key: 'address', header: 'Manzil', render: (s) => s.address },
  {
    key: 'status',
    header: 'Holat',
    width: 150,
    render: (s) => {
      const status = statusOf(STADIUM_STATUSES, s.status)
      return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
    },
  },
]

function StadiumsTab({ ownerId }: { ownerId: string }) {
  const navigate = useNavigate()
  const mode = availability(OWNER_STADIUMS)
  const stadiums = useQuery({
    queryKey: ['admin', 'stadiums', 'owner', ownerId],
    queryFn: () => listOwnerStadiums(ownerId),
    enabled: mode !== 'soon',
  })
  if (mode === 'soon') return <SoonSection />
  return (
    <div className="flex flex-col gap-2">
      {mode === 'sample' && (
        <span className="self-start">
          <SampleTag request={requestFor(OWNER_STADIUMS)!} />
        </span>
      )}
      <DataTable
        columns={STADIUM_COLUMNS}
        rows={stadiums.data?.content}
        rowKey={(s) => s.id}
        onRowClick={(s) => void navigate(`/maydonlar/${s.id}`)}
        loading={stadiums.isPending}
        error={stadiums.isError}
        onRetry={() => void stadiums.refetch()}
        empty={{ title: 'Maydonlar yoʻq' }}
        loadingRows={2}
      />
    </div>
  )
}

function TeamsTab({ teams }: { teams: Awaited<ReturnType<typeof getUserTeams>> }) {
  return (
    <ul className={cx(CARD, 'flex flex-col')}>
      {teams.map((team) => (
        <li
          key={team.id}
          className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-b-0"
        >
          <Avatar name={team.name} />
          <span className="flex flex-1 flex-col">
            <span className="text-base font-medium text-primary">{team.name}</span>
            <span className="text-sm text-secondary">
              {formatNumber(team.memberCount)} aʼzo
              {team.role === 'member' && team.leaderName && ` · sardor: ${team.leaderName}`}
            </span>
          </span>
          <StatusBadge tone={team.role === 'leader' ? 'accent' : 'neutral'}>
            {team.role === 'leader' ? 'Sardor' : 'Aʼzo'}
          </StatusBadge>
        </li>
      ))}
    </ul>
  )
}

type TabKey = 'bookings' | 'teams' | 'stadiums'

function UserTabs({ user }: { user: AdminUser }) {
  const [tab, setTab] = useState<TabKey>('bookings')
  const teamsMode = availability(USER_TEAMS)
  const teams = useQuery({
    queryKey: ['admin', 'users', 'teams', user.id],
    queryFn: () => getUserTeams(user.id),
    enabled: teamsMode !== 'soon',
  })
  const teamList = teams.data ?? []
  const showStadiums = user.isOwner || user.stadiumCount > 0
  const tabs = [
    { value: 'bookings' as const, label: 'Bronlar', count: user.bookingCount },
    ...(teamList.length
      ? [{ value: 'teams' as const, label: 'Jamoalar', count: teamList.length }]
      : []),
    ...(showStadiums
      ? [{ value: 'stadiums' as const, label: 'Maydonlar', count: user.stadiumCount }]
      : []),
  ]
  const active = tabs.some((t) => t.value === tab) ? tab : 'bookings'
  return (
    <div className="flex flex-col gap-3">
      <Tabs label="Foydalanuvchi maʼlumotlari" tabs={tabs} value={active} onChange={setTab} />
      {active === 'bookings' && <BookingsTab userId={user.id} />}
      {active === 'teams' && (
        <div className="flex flex-col gap-2">
          {teamsMode === 'sample' && (
            <span className="self-start">
              <SampleTag request={requestFor(USER_TEAMS)!} />
            </span>
          )}
          <TeamsTab teams={teamList} />
        </div>
      )}
      {active === 'stadiums' && <StadiumsTab ownerId={user.id} />}
    </div>
  )
}

function SummaryCard({ user }: { user: AdminUser }) {
  return (
    <section aria-label="Maʼlumotlar" className={cx(CARD, 'flex flex-col gap-4 p-5')}>
      <h2 className="text-lg font-semibold text-primary">Maʼlumotlar</h2>
      <div className="flex items-center gap-3">
        <Avatar name={user.name} size="lg" />
        <span className="text-md font-medium text-primary">{user.name}</span>
      </div>
      {user.phone && (
        <a
          href={`tel:${user.phone.replace(/\s/g, '')}`}
          className="flex items-center gap-2.5 rounded-lg bg-accent-soft px-3.5 py-2.5 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Phone size={18} aria-hidden className="text-link" />
          <span className="flex-1 text-lg font-semibold text-primary">{user.phone}</span>
          <span className="text-sm text-link">Qoʻngʻiroq qilish</span>
        </a>
      )}
      <dl className="flex flex-col gap-2.5">
        {user.telegramId !== undefined && <Row label="Telegram ID">{user.telegramId}</Row>}
        <Row label="Til">{LANGUAGES[user.language] ?? user.language}</Row>
        <Row label="Roʻyxatdan oʻtgan">{formatDate(user.createdAt)}</Row>
        {user.lastActiveAt && <Row label="Oxirgi faollik">{formatDateTime(user.lastActiveAt)}</Row>}
        <Row label="Rollar">
          <RoleBadges user={user} />
        </Row>
        <Row label="Bronlar">{formatNumber(user.bookingCount)} ta</Row>
      </dl>
    </section>
  )
}

function BlockPanel({ user, own }: { user: AdminUser; own: boolean }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<'block' | 'unblock' | null>(null)
  const block = useQuery({
    queryKey: ['admin', 'users', 'block', user.id],
    queryFn: () => getLatestBlock(user.id),
    enabled: user.isBlocked,
  })
  const sample = user.id.startsWith('sample-')
  const change = useMutation({
    mutationFn: (args: { blocked: boolean; reason?: string }) =>
      setUserBlocked(user.id, args.blocked, args.reason),
    onSuccess: (_, args) => {
      setDialog(null)
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      const text = args.blocked ? 'Foydalanuvchi bloklandi' : 'Foydalanuvchi blokdan chiqarildi'
      toast.success(sample ? `${text} (namuna)` : text)
    },
    onError: (error) => {
      setDialog(null)
      toast.error(
        isApiError(error) && error.status === 400
          ? 'Oʻzingizni bloklay olmaysiz'
          : 'Amalni bajarib boʻlmadi. Qayta urinib koʻring',
      )
    },
  })

  let body: ReactNode
  if (own) {
    body = <p className="text-sm text-secondary">Bu sizning hisobingiz</p>
  } else if (user.isBlocked) {
    const last = block.data
    body = (
      <>
        <p className="text-base font-semibold text-danger">Bloklangan</p>
        {block.isPending ? (
          <Skeleton className="h-14 w-full rounded-md" />
        ) : last ? (
          <dl className="flex flex-col gap-2">
            <Row label="Sabab">{last.reason ?? '—'}</Row>
            <Row label="Qachon">{formatDateTime(last.time)}</Row>
            <Row label="Kim">{last.actor?.name ?? 'Tizim'}</Row>
          </dl>
        ) : (
          <p className="text-sm text-secondary">Sabab yozilmagan</p>
        )}
        <Button
          icon={LockOpen}
          className="w-full"
          disabled={change.isPending}
          onClick={() => setDialog('unblock')}
        >
          Blokdan chiqarish
        </Button>
      </>
    )
  } else {
    body = (
      <>
        <p className="text-sm text-secondary">
          Bloklangan foydalanuvchi ilovadan foydalana olmaydi
        </p>
        <Button
          variant="danger-outline"
          icon={Ban}
          className="w-full"
          disabled={change.isPending}
          onClick={() => setDialog('block')}
        >
          Bloklash
        </Button>
      </>
    )
  }

  return (
    <section aria-label="Qaror" className={cx(CARD, 'flex flex-col gap-2.5 p-5')}>
      <h2 className="text-lg font-semibold text-primary">Qaror</h2>
      {body}
      <ReasonModal
        open={dialog === 'block'}
        title="Foydalanuvchini bloklash"
        description={`Foydalanuvchi ilovaga kira olmaydi: ${user.name} bron qila olmaydi va oʻyinlarga qoʻshila olmaydi. Sababni yozing.`}
        chips={['Koʻp bekor qilishlar', 'Firibgarlik', 'Haqoratli xatti-harakat']}
        minLength={5}
        confirmLabel="Bloklash"
        busy={change.isPending}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => change.mutate({ blocked: true, reason })}
      />
      <ConfirmModal
        open={dialog === 'unblock'}
        title="Blokdan chiqarish"
        message={`${user.name} yana ilovadan foydalana oladi. Davom etasizmi?`}
        confirmLabel="Blokdan chiqarish"
        busy={change.isPending}
        onClose={() => setDialog(null)}
        onConfirm={() => change.mutate({ blocked: false })}
      />
    </section>
  )
}

function UserHistory({ userId }: { userId: string }) {
  const [page, setPage] = useState(0)
  const sample = userId.startsWith('sample-')
  const history = useQuery({
    queryKey: ['admin', 'audit-log', 'user', userId, page],
    queryFn: () => getAuditLog({ entityType: 'user', entityId: userId, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    enabled: !sample,
  })
  const data = history.data
  return (
    <section className="flex flex-col gap-3" aria-labelledby="user-history">
      <h2 id="user-history" className="text-lg font-semibold text-primary">
        Tarix
      </h2>
      <AuditLogTable
        compact
        entries={sample ? [] : data?.content}
        loading={!sample && history.isPending}
        error={history.isError}
        onRetry={() => void history.refetch()}
        empty={{
          title: 'Tarix boʻsh',
          description: 'Rollar va bloklash oʻzgarishlari shu yerda koʻrinadi',
        }}
      />
      {data && data.totalPages > 1 && (
        <Pagination
          page={data.page}
          size={data.size}
          totalElements={data.totalElements}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </section>
  )
}

export function UserPage() {
  const { id = '' } = useParams()
  const session = useSession()
  const user = useQuery({
    queryKey: ['admin', 'users', 'detail', id],
    queryFn: () => getAdminUser(id),
    retry: false,
  })
  const data = user.data
  usePageHeader({
    title: data?.name ?? 'Foydalanuvchi',
    crumbs: [
      { label: 'Foydalanuvchilar', to: '/foydalanuvchilar' },
      { label: data?.name ?? 'Foydalanuvchi' },
    ],
    status: data && {
      label: data.isBlocked ? 'Bloklangan' : 'Faol',
      tone: data.isBlocked ? 'danger' : 'success',
    },
  })

  if (user.isError) {
    const missing = isApiError(user.error) && user.error.status === 404
    return (
      <div className={CARD}>
        {missing ? (
          <EmptyState
            title="Foydalanuvchi topilmadi"
            description="Havola notoʻgʻri boʻlishi mumkin"
          />
        ) : (
          <ErrorState onRetry={() => void user.refetch()} />
        )}
      </div>
    )
  }
  if (!data) {
    return (
      <div aria-busy className="flex gap-6">
        <Skeleton className="h-80 flex-1 rounded-xl" />
        <Skeleton className="h-80 w-94 rounded-xl" />
      </div>
    )
  }

  const own = session.status === 'authenticated' && session.user.id === data.id
  return (
    <div className="flex items-start gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <UserTabs user={data} />
        <UserHistory userId={data.id} />
      </div>
      <aside aria-label="Foydalanuvchi" className="sticky top-6 flex w-94 shrink-0 flex-col gap-4">
        <SummaryCard user={data} />
        <BlockPanel user={data} own={own} />
      </aside>
    </div>
  )
}
