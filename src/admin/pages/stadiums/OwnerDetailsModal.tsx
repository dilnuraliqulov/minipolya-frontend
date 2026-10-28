import { useId, useState, type ReactNode } from 'react'
import type {
  ContractStatus,
  LegalType,
  OwnerLegalDetails,
  OwnerLegalDetailsUpdate,
} from '../../api/users'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { Modal } from '../../components/Modal'
import { CONTRACT_LABELS, LEGAL_TYPE_LABELS } from './labels'

function RadioGroup<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: V | ''
  options: Array<{ value: V; label: string }>
  onChange: (value: V) => void
}) {
  const name = useId()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium text-primary">
        {label} <span className="text-danger">*</span>
      </legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-base text-primary">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="size-4 accent-accent"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function TextField({
  label,
  value,
  onChange,
  helper,
  error,
  maxLength,
}: {
  label: ReactNode
  value: string
  onChange: (value: string) => void
  helper: string
  error?: string
  maxLength: number
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-primary">
        {label} <span className="text-danger">*</span>
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-help`}
        className={cx(
          'h-10 rounded-md border bg-background px-3 text-base text-primary outline-none',
          error ? 'border-danger' : 'border-border focus:border-accent',
        )}
      />
      <p id={`${id}-help`} className={cx('text-xs', error ? 'text-danger' : 'text-secondary')}>
        {error ?? helper}
      </p>
    </div>
  )
}

const LEGAL_TYPES = Object.keys(LEGAL_TYPE_LABELS) as LegalType[]
const CONTRACTS = Object.keys(CONTRACT_LABELS) as ContractStatus[]

/** "Egasi maʼlumotlari": legal type, STIR, the ATMOS contract and its recipient id. */
export function OwnerDetailsModal({
  open,
  ownerName,
  stadiumName,
  current,
  busy,
  onSave,
  onClose,
}: {
  open: boolean
  ownerName: string
  stadiumName: string
  current: OwnerLegalDetails | null
  busy: boolean
  onSave: (update: OwnerLegalDetailsUpdate) => void
  onClose: () => void
}) {
  const [legalType, setLegalType] = useState<LegalType | ''>(current?.legalType ?? '')
  const [tin, setTin] = useState(current?.tin ?? '')
  const [contract, setContract] = useState<ContractStatus | ''>(current?.atmosContractStatus ?? '')
  const [recipient, setRecipient] = useState(current?.atmosRecipientId ?? '')
  const [submitted, setSubmitted] = useState(false)

  const errors = {
    tin: tin.length !== 9 ? 'STIR 9 ta raqamdan iborat boʻlishi kerak' : undefined,
    recipient:
      contract === 'signed' && !recipient ? '«Imzolangan» holati uchun majburiy' : undefined,
  }
  const complete = legalType !== '' && contract !== ''
  const valid = complete && !errors.tin && !errors.recipient

  const save = () => {
    setSubmitted(true)
    if (!valid) return
    onSave({
      legalType,
      tin,
      atmosContractStatus: contract,
      atmosRecipientId: contract === 'signed' ? recipient : undefined,
    })
  }

  return (
    <Modal
      open={open}
      title="Egasi maʼlumotlari"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={save} disabled={busy}>
            Saqlash
          </Button>
        </>
      }
    >
      <p className="text-base text-secondary">
        {ownerName} ({stadiumName} egasi) uchun huquqiy maʼlumotlar va ATMOS shartnomasi holatini
        kiriting.
      </p>
      <RadioGroup
        label="Huquqiy shakl"
        value={legalType}
        options={LEGAL_TYPES.map((value) => ({ value, label: LEGAL_TYPE_LABELS[value] }))}
        onChange={setLegalType}
      />
      <TextField
        label="STIR"
        value={tin}
        onChange={setTin}
        maxLength={9}
        helper="9 ta raqam"
        error={submitted ? errors.tin : undefined}
      />
      <RadioGroup
        label="ATMOS shartnomasi"
        value={contract}
        options={CONTRACTS.map((value) => ({ value, label: CONTRACT_LABELS[value].label }))}
        onChange={setContract}
      />
      {contract === 'signed' && (
        <TextField
          label="ATMOS qabul qiluvchi ID"
          value={recipient}
          onChange={setRecipient}
          maxLength={20}
          helper="«Imzolangan» holati uchun majburiy"
          error={submitted ? errors.recipient : undefined}
        />
      )}
      {submitted && !complete && (
        <p role="alert" className="text-sm text-danger">
          Huquqiy shakl va shartnoma holatini tanlang
        </p>
      )}
    </Modal>
  )
}
