import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { isApiError } from '../../../shared/api'
import { formatDateTime, formatSom } from '../../../shared/format'
import { getAuditLog, type AuditChange, type AuditEntry } from '../../api/audit'
import {
  getSettings,
  SETTINGS_ACTIONS,
  updateSettings,
  type PlatformSettings,
  type SettingsField,
  type SettingsUpdate,
} from '../../api/settings'
import { fieldLabel, formatAuditValue } from '../../audit/labels'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { CARD } from '../../components/card'
import { DataTable, type Column } from '../../components/DataTable'
import { ConfirmModal } from '../../components/Modal'
import { NumberField } from '../../components/NumberField'
import { Pagination } from '../../components/Pagination'
import { Skeleton } from '../../components/Skeleton'
import { ErrorState } from '../../components/States'
import { useToast } from '../../components/Toast'
import { bpsToPercent, formatBps, percentToBps } from '../../format'

const settingsKeys = {
  settings: ['admin', 'settings'] as const,
  history: (page: number) => ['admin', 'audit-log', 'settings', page] as const,
}

const HISTORY_PAGE_SIZE = 10

/**
 * The form keeps the values as typed: the commission in whole percent, the
 * card fee in percent with up to two decimals ("1.5"), the fees and the
 * rounding step in whole so'm.
 */
type Draft = Record<SettingsField, string>

const TIYIN_PER_SOM = 100
/** The example booking price for the commission preview. */
const EXAMPLE_BOOKING = 200_000 * TIYIN_PER_SOM

function toDraft(settings: PlatformSettings): Draft {
  return {
    bookingCommissionPercent: String(settings.bookingCommissionPercent),
    teamGamePlatformFee: String(Math.round(settings.teamGamePlatformFee / TIYIN_PER_SOM)),
    casualGameServiceFee: String(Math.round(settings.casualGameServiceFee / TIYIN_PER_SOM)),
    cardFeeBps: bpsToPercent(settings.cardFeeBps),
    paymentRoundingStep: String(Math.round(settings.paymentRoundingStep / TIYIN_PER_SOM)),
  }
}

/** The draft as the API wants it: percent as is, the card fee in basis points, so'm → tiyin. */
function fromDraft(draft: Draft): Record<SettingsField, number> {
  return {
    bookingCommissionPercent: Number(draft.bookingCommissionPercent),
    teamGamePlatformFee: Number(draft.teamGamePlatformFee) * TIYIN_PER_SOM,
    casualGameServiceFee: Number(draft.casualGameServiceFee) * TIYIN_PER_SOM,
    cardFeeBps: percentToBps(draft.cardFeeBps),
    paymentRoundingStep: Number(draft.paymentRoundingStep) * TIYIN_PER_SOM,
  }
}

const FIELDS: SettingsField[] = [
  'bookingCommissionPercent',
  'teamGamePlatformFee',
  'casualGameServiceFee',
  'cardFeeBps',
  'paymentRoundingStep',
]

/**
 * The backend validates in the service and names the field first:
 * "bookingCommissionPercent must be between 0 and 50", "teamGamePlatformFee
 * must not be negative", "cardFeeBps must be between 0 and 1000",
 * "paymentRoundingStep must be between 1 and 1000000". Messages for other
 * fields stay page-level.
 */
const FIELD_ERRORS: Record<SettingsField, string> = {
  bookingCommissionPercent: 'Komissiya 0 dan 50 gacha boʻlishi kerak',
  teamGamePlatformFee: 'Haq manfiy boʻlishi mumkin emas',
  casualGameServiceFee: 'Haq manfiy boʻlishi mumkin emas',
  cardFeeBps: 'Komissiya 0 dan 10% gacha boʻlishi kerak',
  paymentRoundingStep: "Qadam 1 so'mdan 10 000 so'mgacha boʻlishi kerak",
}

function fieldOfError(message: string): SettingsField | undefined {
  return FIELDS.find((field) => message.startsWith(field))
}

function SettingRow({
  title,
  description,
  children,
  preview,
}: {
  title: string
  description: string
  children: React.ReactNode
  preview: string | null
}) {
  return (
    <section className="flex flex-col gap-4 border-b border-border px-5 py-5 last:border-b-0">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-md font-semibold text-primary">{title}</h3>
        <p className="text-sm text-secondary">{description}</p>
      </div>
      {children}
      {preview && (
        <p className="rounded-md bg-surface px-3.5 py-3 text-base font-medium text-primary">
          {preview}
        </p>
      )}
    </section>
  )
}

function SettingsSkeleton() {
  return (
    <div aria-busy className={`${CARD} flex flex-col`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col gap-3 border-b border-border p-5 last:border-b-0">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-72" />
          <Skeleton className="h-10 w-55 rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      ))}
    </div>
  )
}

/** One row per changed field, so an entry that changed two settings shows two. */
interface HistoryRow {
  key: string
  entry: AuditEntry
  change?: AuditChange
}

function historyRows(entries: AuditEntry[]): HistoryRow[] {
  return entries.flatMap((entry) =>
    entry.changes.length
      ? entry.changes.map((change) => ({ key: `${entry.id}-${change.field}`, entry, change }))
      : [{ key: entry.id, entry }],
  )
}

const HISTORY_COLUMNS: Column<HistoryRow>[] = [
  {
    key: 'time',
    header: 'Sana va vaqt',
    width: 170,
    render: (row) => formatDateTime(row.entry.time),
  },
  {
    key: 'admin',
    header: 'Admin',
    render: (row) => {
      const name = row.entry.actor?.name ?? 'Tizim'
      return (
        <span className="flex items-center gap-2.5 font-medium whitespace-nowrap">
          <Avatar name={name} size="sm" />
          {name}
        </span>
      )
    },
  },
  {
    key: 'setting',
    header: 'Sozlama',
    width: 260,
    render: (row) => (row.change ? fieldLabel(row.change.field) : '—'),
  },
  {
    key: 'change',
    header: 'Oʻzgarish',
    width: 220,
    render: (row) =>
      row.change ? (
        <span className="font-medium whitespace-nowrap">
          {formatAuditValue(row.change.field, row.change.oldValue)} →{' '}
          {formatAuditValue(row.change.field, row.change.newValue)}
        </span>
      ) : (
        // An old row from before the structured log: no field-level changes.
        <span className="text-secondary">Tafsilotlar yoʻq</span>
      ),
  },
]

function SettingsHistory() {
  const [page, setPage] = useState(0)
  const history = useQuery({
    queryKey: settingsKeys.history(page),
    queryFn: () => getAuditLog({ actions: SETTINGS_ACTIONS, page, size: HISTORY_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })
  const data = history.data
  return (
    <section className="flex flex-col gap-3" aria-labelledby="settings-history">
      <h2 id="settings-history" className="text-lg font-semibold text-primary">
        Oʻzgarishlar tarixi
      </h2>
      <DataTable
        columns={HISTORY_COLUMNS}
        rows={data ? historyRows(data.content) : undefined}
        rowKey={(row) => row.key}
        loading={history.isPending}
        error={history.isError}
        onRetry={() => void history.refetch()}
        empty={{
          title: 'Hali oʻzgarish yoʻq',
          description: 'Sozlamalar oʻzgarganda shu yerda koʻrinadi',
        }}
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
    </section>
  )
}

function SettingsForm({ settings }: { settings: PlatformSettings }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const saved = toDraft(settings)
  const [draft, setDraft] = useState<Draft>(saved)
  const [errors, setErrors] = useState<Partial<Record<SettingsField, string>>>({})
  const [confirming, setConfirming] = useState(false)

  const changed = FIELDS.filter((field) => draft[field] !== saved[field])
  const dirty = changed.length > 0

  const save = useMutation({
    mutationFn: (update: SettingsUpdate) => updateSettings(update),
    onSuccess: (next) => {
      queryClient.setQueryData(settingsKeys.settings, next)
      setDraft(toDraft(next))
      setErrors({})
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit-log'] })
      toast.success('Sozlamalar saqlandi')
    },
    onError: (error) => {
      const field =
        isApiError(error) && error.status === 400 ? fieldOfError(error.message) : undefined
      if (field) setErrors({ [field]: FIELD_ERRORS[field] })
      else toast.error('Saqlab boʻlmadi. Qayta urinib koʻring')
    },
    onSettled: () => setConfirming(false),
  })

  const set = (field: SettingsField) => (digits: string) => {
    setDraft((current) => ({ ...current, [field]: digits }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const requestSave = () => {
    const missing = changed.filter((field) => draft[field] === '')
    if (missing.length) {
      setErrors(Object.fromEntries(missing.map((field) => [field, 'Qiymatni kiriting'])))
      return
    }
    setConfirming(true)
  }

  const values = fromDraft(draft)
  const filled = (field: SettingsField) => draft[field] !== ''

  return (
    <>
      <div className={`${CARD} flex flex-col`}>
        <SettingRow
          title="Oddiy bronlar"
          description="Har bir bron toʻlovidan platforma oladigan komissiya"
          preview={
            filled('bookingCommissionPercent')
              ? `${formatSom(EXAMPLE_BOOKING)}lik brondan: ${formatSom((EXAMPLE_BOOKING * values.bookingCommissionPercent) / 100)}`
              : null
          }
        >
          <NumberField
            label="Komissiya"
            suffix="%"
            maxLength={3}
            value={draft.bookingCommissionPercent}
            onChange={set('bookingCommissionPercent')}
            helper="0 dan 50 gacha, butun son"
            error={errors.bookingCommissionPercent}
          />
        </SettingRow>
        <SettingRow
          title="Jamoa vs jamoa oʻyinlari"
          description="Har bir jamoadan olinadigan platforma haqi"
          preview={
            filled('teamGamePlatformFee')
              ? `Har bir jamoadan: ${formatSom(values.teamGamePlatformFee)}`
              : null
          }
        >
          <NumberField
            label="Platforma haqi"
            suffix="so'm"
            value={draft.teamGamePlatformFee}
            onChange={set('teamGamePlatformFee')}
            error={errors.teamGamePlatformFee}
          />
        </SettingRow>
        <SettingRow
          title="Doʻstlar bilan oʻyinlar"
          description="Har bir oʻyinchidan olinadigan xizmat haqi"
          preview={
            filled('casualGameServiceFee')
              ? `Har bir oʻyinchidan: ${formatSom(values.casualGameServiceFee)}`
              : null
          }
        >
          <NumberField
            label="Xizmat haqi"
            suffix="so'm"
            value={draft.casualGameServiceFee}
            onChange={set('casualGameServiceFee')}
            error={errors.casualGameServiceFee}
          />
        </SettingRow>
        <SettingRow
          title="Karta komissiyasi"
          description="ATMOS har bir karta toʻlovidan oladigan ulush. Karta narxlari shunga qarab oshiriladi, naqd toʻlovlarga taʼsir qilmaydi"
          preview={
            filled('cardFeeBps')
              ? `Har bir karta toʻlovidan: ${formatBps(values.cardFeeBps)}`
              : null
          }
        >
          <NumberField
            label="Komissiya (karta)"
            suffix="%"
            decimals={2}
            maxLength={5}
            value={draft.cardFeeBps}
            onChange={set('cardFeeBps')}
            helper="0 dan 10 gacha, masalan 1,5"
            error={errors.cardFeeBps}
          />
        </SettingRow>
        <SettingRow
          title="Narxni yaxlitlash"
          description="Karta orqali toʻlanadigan narxlar shu summaga karrali qilib yuqoriga yaxlitlanadi"
          preview={
            filled('paymentRoundingStep')
              ? `Karta narxlari ${formatSom(values.paymentRoundingStep)}ga yaxlitlanadi`
              : null
          }
        >
          <NumberField
            label="Yaxlitlash qadami"
            suffix="so'm"
            value={draft.paymentRoundingStep}
            onChange={set('paymentRoundingStep')}
            helper="1 dan 10 000 so'mgacha"
            error={errors.paymentRoundingStep}
          />
        </SettingRow>
      </div>

      {dirty && (
        <div
          role="region"
          aria-label="Saqlanmagan oʻzgarishlar"
          className="sticky bottom-4 z-10 flex items-center gap-3 rounded-xl border border-border bg-background px-6 py-4 shadow-lg"
        >
          <TriangleAlert size={18} aria-hidden className="text-warning" />
          <p className="flex-1 text-base font-medium text-primary">Saqlanmagan oʻzgarishlar bor</p>
          <Button
            variant="secondary"
            onClick={() => {
              setDraft(saved)
              setErrors({})
            }}
          >
            Bekor qilish
          </Button>
          <Button onClick={requestSave} disabled={save.isPending}>
            Saqlash
          </Button>
        </div>
      )}

      <ConfirmModal
        open={confirming}
        title="Oʻzgarishlarni saqlash"
        message="Yangi qiymatlar faqat yangi toʻlovlarga qoʻllaniladi. Avvalgi toʻlovlar oʻzgarmaydi."
        confirmLabel="Saqlash"
        busy={save.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={() =>
          save.mutate(Object.fromEntries(changed.map((field) => [field, values[field]])))
        }
      />
    </>
  )
}

export function SettingsPage() {
  const settings = useQuery({ queryKey: settingsKeys.settings, queryFn: getSettings })
  return (
    <div className="flex max-w-200 flex-col gap-6">
      {settings.isError ? (
        <div className={CARD}>
          <ErrorState onRetry={() => void settings.refetch()} />
        </div>
      ) : settings.data ? (
        // Keyed by the saved version, so a save resets the draft from the server's values.
        <SettingsForm key={settings.data.updatedAt} settings={settings.data} />
      ) : (
        <SettingsSkeleton />
      )}
      <SettingsHistory />
    </div>
  )
}
