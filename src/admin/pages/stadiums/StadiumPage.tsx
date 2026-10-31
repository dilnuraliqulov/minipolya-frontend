import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  ExternalLink,
  LandPlot,
  Lock,
  LockOpen,
  Pencil,
  Phone,
  Plus,
  TriangleAlert,
  X,
} from 'lucide-react'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { API_MESSAGES, isApiError } from '../../../shared/api'
import { formatDateTime, formatNumber, formatSom } from '../../../shared/format'
import { getAuditLog } from '../../api/audit'
import { isAvailable } from '../../api/missing'
import {
  addStadiumNote,
  getLatestDecision,
  getStadium,
  getStadiumNotes,
  NOTES_GET,
  NOTES_POST,
  setStadiumStatus,
  STADIUM_DETAIL_FIELDS,
  type PricingRule,
  type StadiumDetail,
} from '../../api/stadiums'
import {
  getOwnerLegalDetails,
  getUser,
  LEGAL_DETAILS_GET,
  LEGAL_DETAILS_PUT,
  saveOwnerLegalDetails,
} from '../../api/users'
import { AuditLogTable } from '../../audit/AuditLogTable'
import { DisabledHint, SOON, SoonSection } from '../../components/Availability'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { CARD } from '../../components/card'
import { cx } from '../../components/cx'
import { ConfirmModal, ReasonModal } from '../../components/Modal'
import { Pagination } from '../../components/Pagination'
import { Skeleton } from '../../components/Skeleton'
import { EmptyState, ErrorState } from '../../components/States'
import { StatusBadge } from '../../components/StatusBadge'
import { useToast } from '../../components/Toast'
import { formatLongDate, formatPitch } from '../../format'
import { usePageHeader } from '../../layout/pageHeader'
import { STADIUM_STATUSES, statusOf, SURFACE_TYPES } from '../../statuses'
import {
  AMENITY_LABELS,
  BLOCK_REASONS,
  CONTRACT_LABELS,
  DAYS_SHORT,
  LEGAL_TYPE_LABELS,
  REJECT_REASONS,
} from './labels'
import { OwnerDetailsModal } from './OwnerDetailsModal'

const StadiumMap = lazy(() => import('./StadiumMap'))

const HISTORY_SIZE = 10

function Card({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section aria-label={title} className={cx(CARD, 'flex flex-col', className)}>
      <div className="flex items-center gap-2.5 px-5 pt-3.5 pb-2.5">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <span className="flex-1" />
        {action}
      </div>
      <div className="flex flex-col gap-3 px-5 pt-1 pb-5">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-base">
      <dt className="w-28 shrink-0 text-sm text-secondary">{label}</dt>
      <dd className="min-w-0 flex-1 text-primary">{children}</dd>
    </div>
  )
}

function mapLink(stadium: StadiumDetail): string {
  if (stadium.latitude !== undefined && stadium.longitude !== undefined) {
    const { latitude: lat, longitude: lng } = stadium
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
  }
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${stadium.address}, Toshkent`)}`
}

/** "18:00:00" → "18:00". */
const hhmm = (time: string) => time.slice(0, 5)

/**
 * Pricing rules grouped for reading: consecutive days with the same hours and
 * price become one line ("Du–Ju 18:00–23:00"). Display only — the prices are
 * the backend's.
 */
function pricingLines(rules: PricingRule[]) {
  const sorted = [...rules].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
  )
  const lines: Array<{ from: number; to: number; rule: PricingRule }> = []
  for (const rule of sorted) {
    const last = lines.find(
      (l) =>
        l.to === rule.dayOfWeek - 1 &&
        l.rule.startTime === rule.startTime &&
        l.rule.endTime === rule.endTime &&
        l.rule.pricePerHour === rule.pricePerHour,
    )
    if (last) last.to = rule.dayOfWeek
    else lines.push({ from: rule.dayOfWeek, to: rule.dayOfWeek, rule })
  }
  return lines.map(({ from, to, rule }) => ({
    key: rule.id,
    days: from === to ? DAYS_SHORT[from] : `${DAYS_SHORT[from]}–${DAYS_SHORT[to]}`,
    hours: `${hhmm(rule.startTime)}–${hhmm(rule.endTime)}`,
    price: formatSom(rule.pricePerHour),
  }))
}

function Gallery({ stadium }: { stadium: StadiumDetail }) {
  const photos = stadium.photos ?? []
  const [active, setActive] = useState(0)
  const current = photos[active]
  if (!current) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg bg-surface">
        <LandPlot size={28} aria-hidden className="text-secondary" />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <img
        src={current.url}
        alt={`${stadium.name} — ${active + 1}-rasm`}
        className="aspect-[3/2] w-full rounded-lg object-cover"
      />
      {photos.length > 1 && (
        <div className="flex gap-2">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              aria-label={`${i + 1}-rasm`}
              aria-pressed={i === active}
              onClick={() => setActive(i)}
              className={cx(
                'size-14 overflow-hidden rounded-md border-2 focus-visible:outline-2 focus-visible:outline-accent',
                i === active ? 'border-accent' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <img src={photo.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function InfoSection({
  stadium,
  extras,
}: {
  stadium: StadiumDetail
  /** The review fields (R9) exist: photos, district, phone, hours, amenities, map. */
  extras: boolean
}) {
  const amenities = stadium.amenities
    ? (Object.keys(AMENITY_LABELS) as Array<keyof typeof AMENITY_LABELS>).filter(
        (key) => stadium.amenities?.[key],
      )
    : []
  const hasMap = extras && stadium.latitude !== undefined && stadium.longitude !== undefined
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_1fr]">
      {extras ? <Gallery stadium={stadium} /> : <SoonSection title="Rasmlar" />}
      <Card title="Maʼlumotlar">
        <dl className="flex flex-col gap-2.5">
          <Row label="Manzil">
            <span className="flex flex-col items-start gap-1">
              {stadium.address}
              <a
                href={mapLink(stadium)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-xs text-sm text-link hover:underline focus-visible:outline-2 focus-visible:outline-accent"
              >
                Xaritada ochish
                <ExternalLink size={13} aria-hidden />
              </a>
            </span>
          </Row>
          {extras && stadium.district && <Row label="Tuman">{stadium.district}</Row>}
          {extras && stadium.phone && <Row label="Telefon">{stadium.phone}</Row>}
          <Row label="Format">{formatPitch(stadium.format)}</Row>
          <Row label="Qoplama">{SURFACE_TYPES[stadium.surfaceType] ?? stadium.surfaceType}</Row>
          {extras && stadium.openTime && stadium.closeTime && (
            <Row label="Ish vaqti">
              {hhmm(stadium.openTime)}–{hhmm(stadium.closeTime)}
            </Row>
          )}
          {extras && amenities.length > 0 && (
            <Row label="Qulayliklar">
              <span className="flex flex-wrap gap-1.5">
                {amenities.map((key) => (
                  <span key={key} className="rounded-full bg-surface px-2.5 py-0.5 text-sm">
                    {AMENITY_LABELS[key]}
                  </span>
                ))}
              </span>
            </Row>
          )}
          <Row label="Qoʻshilgan">{formatDateTime(stadium.createdAt)}</Row>
          <Row label="Bronlar">{formatNumber(stadium.totalBookings)} ta</Row>
          {!extras && <Row label="Ish vaqti, qulayliklar">{SOON}</Row>}
        </dl>
        {hasMap && (
          <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
            <StadiumMap
              latitude={stadium.latitude!}
              longitude={stadium.longitude!}
              label={stadium.name}
            />
          </Suspense>
        )}
      </Card>
    </div>
  )
}

function TermsSection({ stadium, extras }: { stadium: StadiumDetail; extras: boolean }) {
  if (!extras) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SoonSection title="Narxlar" />
        <SoonSection title="Bron shartlari" />
      </div>
    )
  }
  const lines = pricingLines(stadium.pricingRules ?? [])
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card title="Narxlar">
        <dl className="flex flex-col gap-2.5">
          <Row label="Asosiy narx">
            {stadium.pricePerHour === undefined ? '—' : `${formatSom(stadium.pricePerHour)}/soat`}
          </Row>
        </dl>
        {lines.length > 0 && (
          <ul className="flex flex-col gap-1.5 rounded-md bg-surface px-3.5 py-3">
            {lines.map((line) => (
              <li key={line.key} className="flex gap-3 text-sm">
                <span className="flex-1 text-secondary">
                  {line.days} {line.hours}
                </span>
                <span className="font-medium text-primary">{line.price}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Bron shartlari">
        <dl className="flex flex-col gap-2.5">
          <Row label="Minimal toʻlov">
            <span className="flex flex-col gap-0.5">
              {stadium.minBookingAmount === undefined
                ? 'Toʻliq toʻlov'
                : formatSom(stadium.minBookingAmount)}
              <span className="text-xs text-secondary">
                Bron qilishda oʻyinchi toʻlaydigan eng kam summa
              </span>
            </span>
          </Row>
          <Row label="Bekor qilish">
            {stadium.cancellationHours === undefined
              ? '—'
              : `Boshlanishidan ${stadium.cancellationHours} soat oldingacha`}
          </Row>
        </dl>
      </Card>
    </div>
  )
}

function OwnerCard({ stadium }: { stadium: StadiumDetail }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const owner = useQuery({
    queryKey: ['admin', 'users', 'detail', stadium.ownerId],
    queryFn: () => getUser(stadium.ownerId),
    retry: false,
  })
  const legalShown = isAvailable(LEGAL_DETAILS_GET)
  const legal = useQuery({
    queryKey: ['admin', 'users', 'legal', stadium.ownerId],
    queryFn: () => getOwnerLegalDetails(stadium.ownerId),
    enabled: legalShown,
  })
  const canSave = isAvailable(LEGAL_DETAILS_PUT)
  const save = useMutation({
    mutationFn: (update: Parameters<typeof saveOwnerLegalDetails>[1]) =>
      saveOwnerLegalDetails(stadium.ownerId, update),
    onSuccess: (saved) => {
      queryClient.setQueryData(['admin', 'users', 'legal', stadium.ownerId], saved)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stadiums'] })
      setEditing(false)
      toast.success('Maʼlumotlar saqlandi')
    },
    onError: () => toast.error('Saqlab boʻlmadi. Qayta urinib koʻring'),
  })

  const name = owner.data?.name ?? stadium.ownerName
  const phone = owner.data?.phone ?? stadium.ownerPhone
  const details = legal.data
  const editButton = (label: string, icon = Pencil) =>
    !canSave ? (
      <DisabledHint hint={SOON}>
        <Button variant="secondary" icon={icon} disabled className="h-8 text-sm">
          {label}
        </Button>
      </DisabledHint>
    ) : (
      <Button
        variant="secondary"
        icon={icon}
        className="h-8 text-sm"
        onClick={() => setEditing(true)}
      >
        {label}
      </Button>
    )

  return (
    <Card
      title="Maydon egasi"
      action={
        <Link
          to={`/foydalanuvchilar/${stadium.ownerId}`}
          className="rounded-xs text-sm text-link hover:underline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Foydalanuvchi sahifasi
        </Link>
      }
    >
      <div className="flex items-center gap-3">
        <Avatar name={name} size="lg" />
        <span className="text-md font-medium text-primary">{name}</span>
      </div>
      {phone ? (
        <a
          href={`tel:${phone.replace(/\s/g, '')}`}
          className="flex items-center gap-2.5 rounded-lg bg-accent-soft px-3.5 py-2.5 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Phone size={18} aria-hidden className="text-link" />
          <span className="flex-1 text-lg font-semibold text-primary">{phone}</span>
          <span className="text-sm text-link">Qoʻngʻiroq qilish</span>
        </a>
      ) : (
        <p className="text-sm text-secondary">Telefon raqami yoʻq</p>
      )}
      <dl className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-secondary">Roʻyxatdan oʻtgan</dt>
          <dd className="text-base text-primary">
            {owner.data ? (
              formatLongDate(owner.data.createdAt)
            ) : owner.isPending ? (
              <Skeleton className="h-3.5 w-24" />
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-secondary">Oʻyinchi sifatida bronlar</dt>
          <dd className="text-base text-primary">
            {owner.data ? (
              `${formatNumber(owner.data.bookingCount)} ta`
            ) : owner.isPending ? (
              <Skeleton className="h-3.5 w-10" />
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2.5 border-t border-border pt-3">
        <h3 className="text-sm font-semibold text-primary">Huquqiy maʼlumotlar</h3>
        {!legalShown ? (
          <p className="text-sm text-secondary">{SOON}</p>
        ) : legal.isPending ? (
          <Skeleton className="h-16 w-full rounded-md" />
        ) : details ? (
          <>
            <dl className="flex flex-col gap-2">
              <Row label="Huquqiy shakl">
                {details.legalType ? LEGAL_TYPE_LABELS[details.legalType] : '—'}
              </Row>
              <Row label={details.legalType === 'self_employed' ? 'JShShIR' : 'STIR'}>
                {details.tin ?? '—'}
              </Row>
              <Row label="ATMOS shartnomasi">
                <StatusBadge tone={CONTRACT_LABELS[details.atmosContractStatus].tone}>
                  {CONTRACT_LABELS[details.atmosContractStatus].label}
                </StatusBadge>
              </Row>
              {details.atmosRecipientId && (
                <Row label="Qabul qiluvchi ID">{details.atmosRecipientId}</Row>
              )}
            </dl>
            <div>
              {editButton(
                details.atmosContractStatus === 'signed' ? 'Tahrirlash' : 'Shartnomani belgilash',
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-start gap-2.5 rounded-md bg-surface p-3.5">
            <p className="text-base font-medium text-primary">Maʼlumotlar kiritilmagan</p>
            {editButton('Maʼlumotlarni kiritish')}
          </div>
        )}
      </div>

      {editing && (
        <OwnerDetailsModal
          open
          ownerName={name}
          stadiumName={stadium.name}
          current={details ?? null}
          busy={save.isPending}
          onSave={(update) => save.mutate(update)}
          onClose={() => setEditing(false)}
        />
      )}
    </Card>
  )
}

function NotesCard({ stadiumId }: { stadiumId: string }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const shown = isAvailable(NOTES_GET)
  const canPost = isAvailable(NOTES_POST)
  const notes = useQuery({
    queryKey: ['admin', 'stadiums', 'notes', stadiumId],
    queryFn: () => getStadiumNotes(stadiumId),
    enabled: shown,
  })
  const add = useMutation({
    mutationFn: (note: string) => addStadiumNote(stadiumId, note),
    onSuccess: () => {
      setText('')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stadiums', 'notes', stadiumId] })
      toast.success('Izoh qoʻshildi')
    },
    onError: () => toast.error('Izohni saqlab boʻlmadi'),
  })
  if (!shown) return <SoonSection title="Ichki izohlar" />
  return (
    <Card
      title="Ichki izohlar"
      action={<span className="text-xs text-secondary">Faqat adminlar koʻradi</span>}
    >
      {notes.isPending ? (
        <Skeleton className="h-12 w-full rounded-md" />
      ) : notes.isError ? (
        <p className="text-sm text-danger">Izohlarni yuklab boʻlmadi</p>
      ) : notes.data.length === 0 ? (
        <p className="text-sm text-secondary">Hali izoh yoʻq</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.data.map((note) => (
            <li
              key={note.id}
              className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0 last:pb-0"
            >
              <p className="text-sm whitespace-pre-line text-primary">{note.text}</p>
              <p className="text-xs text-secondary">
                {note.authorName} · {formatDateTime(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (text.trim()) add.mutate(text.trim())
        }}
      >
        <label htmlFor={`note-${stadiumId}`} className="sr-only">
          Izoh
        </label>
        <textarea
          id={`note-${stadiumId}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Izoh yozing…"
          disabled={!canPost}
          maxLength={1000}
          className="h-18 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-primary outline-none focus:border-accent disabled:opacity-60"
        />
        <div className="flex justify-end">
          {!canPost ? (
            <DisabledHint hint={SOON}>
              <Button variant="secondary" icon={Plus} disabled className="h-8 text-sm">
                Izoh qoʻshish
              </Button>
            </DisabledHint>
          ) : (
            <Button
              type="submit"
              variant="secondary"
              icon={Plus}
              className="h-8 text-sm"
              disabled={!text.trim() || add.isPending}
            >
              Izoh qoʻshish
            </Button>
          )}
        </div>
      </form>
    </Card>
  )
}

type Dialog = 'approve' | 'reject' | 'block' | 'unblock' | null

function DecisionPanel({ stadium }: { stadium: StadiumDetail }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<Dialog>(null)
  const decision = useQuery({
    queryKey: ['admin', 'stadiums', 'decision', stadium.id],
    queryFn: () => getLatestDecision(stadium.id),
  })

  const change = useMutation({
    mutationFn: (args: {
      status: 'approved' | 'rejected' | 'blocked'
      reason?: string
      message: string
    }) => setStadiumStatus(stadium.id, args.status, args.reason),
    onSuccess: (_, args) => {
      setDialog(null)
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast.success(args.message)
    },
    onError: (error) => {
      setDialog(null)
      toast.error(
        isApiError(error) && error.status === 404
          ? 'Maydon topilmadi'
          : isApiError(error) && error.message === API_MESSAGES.contractNotSigned
            ? 'Egasining ATMOS shartnomasi imzolanmagan'
            : 'Amalni bajarib boʻlmadi. Qayta urinib koʻring',
      )
    },
  })

  // The backend refuses approval without the owner's signed ATMOS contract;
  // the button says so up front. While the contract data is missing (R11) it
  // stays usable and the backend decides.
  const unsigned =
    isAvailable(LEGAL_DETAILS_GET) &&
    stadium.ownerContractStatus !== undefined &&
    stadium.ownerContractStatus !== 'signed'
  const last = decision.data
  const shownStatus = stadium.status

  let body: ReactNode
  if (shownStatus === 'pending') {
    const approve = (
      <Button
        icon={Check}
        className="w-full"
        disabled={unsigned || change.isPending}
        onClick={() => setDialog('approve')}
      >
        Tasdiqlash
      </Button>
    )
    body = (
      <>
        <p className="text-sm text-secondary">
          Tasdiqlansa, maydon ilovada koʻrinadi va bron qilish uchun ochiladi
        </p>
        {unsigned ? (
          <DisabledHint hint="Egasining ATMOS shartnomasi imzolanmagan" className="w-full">
            {approve}
          </DisabledHint>
        ) : (
          approve
        )}
        {unsigned && (
          <p className="flex items-center gap-2 text-sm text-warning">
            <TriangleAlert size={16} aria-hidden />
            Egasining ATMOS shartnomasi imzolanmagan
          </p>
        )}
        <Button
          variant="danger-outline"
          icon={X}
          className="w-full"
          disabled={change.isPending}
          onClick={() => setDialog('reject')}
        >
          Rad etish
        </Button>
      </>
    )
  } else if (shownStatus === 'approved') {
    body = (
      <>
        <p className="text-sm text-secondary">
          Maydon ilovada koʻrinadi va bron qilish uchun ochiq
        </p>
        <Button
          variant="danger-outline"
          icon={Lock}
          className="w-full"
          disabled={change.isPending}
          onClick={() => setDialog('block')}
        >
          Bloklash
        </Button>
      </>
    )
  } else {
    const rejected = shownStatus === 'rejected'
    body = (
      <>
        <p className="text-base font-semibold text-danger">
          {rejected ? 'Rad etilgan' : 'Bloklangan'}
        </p>
        <dl className="flex flex-col gap-2">
          <Row label="Sabab">{stadium.statusReason ?? last?.reason ?? 'Sabab yozilmagan'}</Row>
          {decision.isPending ? (
            <Skeleton className="h-9 w-full rounded-md" />
          ) : (
            last && (
              <>
                <Row label="Qachon">{formatDateTime(last.time)}</Row>
                <Row label="Kim">{last.actor?.name ?? 'Tizim'}</Row>
              </>
            )
          )}
        </dl>
        {!rejected && (
          <Button
            icon={LockOpen}
            className="w-full"
            disabled={change.isPending}
            onClick={() => setDialog('unblock')}
          >
            Blokdan chiqarish
          </Button>
        )}
      </>
    )
  }

  return (
    <section aria-label="Qaror" className={cx(CARD, 'flex flex-col gap-2.5 p-5')}>
      <h2 className="text-lg font-semibold text-primary">Qaror</h2>
      {body}
      <ConfirmModal
        open={dialog === 'approve'}
        title="Maydonni tasdiqlash"
        message={`${stadium.name} ilovada koʻrinadi va bron qilish uchun ochiladi. Tasdiqlaysizmi?`}
        confirmLabel="Tasdiqlash"
        busy={change.isPending}
        onClose={() => setDialog(null)}
        onConfirm={() => change.mutate({ status: 'approved', message: 'Maydon tasdiqlandi' })}
      />
      <ConfirmModal
        open={dialog === 'unblock'}
        title="Blokdan chiqarish"
        message={`${stadium.name} yana bron qilish uchun ochiladi. Davom etasizmi?`}
        confirmLabel="Blokdan chiqarish"
        busy={change.isPending}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          change.mutate({ status: 'approved', message: 'Maydon blokdan chiqarildi' })
        }
      />
      <ReasonModal
        open={dialog === 'reject'}
        title="Maydonni rad etish"
        description="Sababni tanlang yoki yozing. Egasi sababni koʻradi."
        chips={REJECT_REASONS}
        minLength={5}
        confirmLabel="Rad etish"
        busy={change.isPending}
        onClose={() => setDialog(null)}
        onConfirm={(reason) =>
          change.mutate({ status: 'rejected', reason, message: 'Maydon rad etildi' })
        }
      />
      <ReasonModal
        open={dialog === 'block'}
        title="Maydonni bloklash"
        description="Sababni tanlang yoki yozing. Maydon bron qilish uchun yopiladi, kelgusi bronlar bekor qilinadi va toʻlovlar qaytariladi."
        chips={BLOCK_REASONS}
        minLength={5}
        confirmLabel="Bloklash"
        busy={change.isPending}
        onClose={() => setDialog(null)}
        onConfirm={(reason) =>
          change.mutate({ status: 'blocked', reason, message: 'Maydon bloklandi' })
        }
      />
    </section>
  )
}

function StadiumHistory({ stadiumId }: { stadiumId: string }) {
  const [page, setPage] = useState(0)
  const history = useQuery({
    queryKey: ['admin', 'audit-log', 'stadium', stadiumId, page],
    queryFn: () =>
      getAuditLog({ entityType: 'stadium', entityId: stadiumId, page, size: HISTORY_SIZE }),
    placeholderData: keepPreviousData,
  })
  const data = history.data
  return (
    <section className="flex flex-col gap-3" aria-labelledby="stadium-history">
      <h2 id="stadium-history" className="text-lg font-semibold text-primary">
        Tarix
      </h2>
      <AuditLogTable
        compact
        entries={data?.content}
        loading={history.isPending}
        error={history.isError}
        onRetry={() => void history.refetch()}
        empty={{
          title: 'Tarix boʻsh',
          description: 'Bu maydon bilan bogʻliq harakatlar shu yerda koʻrinadi',
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

function DetailSkeleton() {
  return (
    <div aria-busy className="flex gap-6">
      <div className="flex flex-1 flex-col gap-4">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <div className="flex w-94 flex-col gap-4">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function StadiumPage() {
  const { id = '' } = useParams()
  const stadium = useQuery({
    queryKey: ['admin', 'stadiums', 'detail', id],
    queryFn: () => getStadium(id),
    retry: false,
  })
  const data = stadium.data
  const status = data ? statusOf(STADIUM_STATUSES, data.status) : undefined
  usePageHeader({
    title: data?.name ?? 'Maydon',
    crumbs: [{ label: 'Maydonlar', to: '/maydonlar' }, { label: data?.name ?? 'Maydon' }],
    status: status && { label: status.label, tone: status.tone },
  })

  if (stadium.isError) {
    const missing = isApiError(stadium.error) && stadium.error.status === 404
    return (
      <div className={CARD}>
        {missing ? (
          <EmptyState title="Maydon topilmadi" description="U oʻchirilgan yoki havola notoʻgʻri" />
        ) : (
          <ErrorState onRetry={() => void stadium.refetch()} />
        )}
      </div>
    )
  }
  if (!data) return <DetailSkeleton />

  const extras = isAvailable(STADIUM_DETAIL_FIELDS)
  return (
    <div className="flex items-start gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <InfoSection stadium={data} extras={extras} />
        <TermsSection stadium={data} extras={extras} />
        <StadiumHistory stadiumId={data.id} />
      </div>
      <aside
        aria-label="Qaror va egasi"
        className="sticky top-6 flex max-h-[calc(100dvh-3rem)] w-94 shrink-0 flex-col gap-4 overflow-y-auto"
      >
        <DecisionPanel stadium={data} />
        <OwnerCard stadium={data} />
        <NotesCard stadiumId={data.id} />
      </aside>
    </div>
  )
}
