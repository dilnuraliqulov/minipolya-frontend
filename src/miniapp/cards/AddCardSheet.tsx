import { useQueryClient } from '@tanstack/react-query'
import { CircleAlert, Lock, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isApiError } from '../../shared/api'
import {
  CARDS_KEY,
  confirmCard,
  resendCardCode,
  startCardBinding,
  type SavedCard,
} from '../api/cards'
import { errorMessageKey, errorTone, type ErrorMessageKey } from '../api/errors'
import { BottomSheet, Button, cx, Input, Notice, useToast } from '../components'
import { tashkentToday } from '../../shared/format'
import { CardBrandTile } from './CardBrandTile'
import {
  cardBrand,
  cardNumberProblem,
  digitsOnly,
  expiryProblem,
  formatExpiry,
  groupCardNumber,
} from './cardInput'

interface AddCardSheetProps {
  open: boolean
  onClose: () => void
  onSaved: (card: SavedCard) => void
}

/**
 * The provider's cooldown before a new SMS code may be asked for. The code itself
 * stays valid longer; only the backend says when it has expired (SMS_CODE_EXPIRED).
 */
const RESEND_SECONDS = 60
const CODE_LENGTH = 6

type Problem =
  /** Under the card number field. */
  | { kind: 'number'; key: ErrorMessageKey }
  /** Under the expiry field. */
  | { kind: 'expiry'; key: ErrorMessageKey }
  /** Under the SMS code; the typed code is cleared. */
  | { kind: 'code'; key: ErrorMessageKey }
  /** The SMS code is no longer valid: a new one is needed. */
  | { kind: 'codeExpired' }
  | { kind: 'network' }
  /** A notice above the form (a refusal, or the payment system being down). */
  | { kind: 'other'; key: ErrorMessageKey }

/**
 * Where a failed call's message goes. The backend's card codes (errors.ts) decide;
 * a 4xx without a code (bean validation) is read as the number, or the code, being wrong.
 */
function classify(error: unknown, step: 'bind' | 'confirm' | 'resend'): Problem {
  if (isApiError(error) && error.isNetworkError) return { kind: 'network' }
  const key = errorMessageKey(error)
  switch (key) {
    case 'errors.cardNotSupported':
    case 'errors.cardExpiryInvalid':
      return { kind: 'number', key }
    case 'errors.cardExpired':
      return { kind: 'expiry', key }
    case 'errors.smsCodeWrong':
      return { kind: 'code', key }
    case 'errors.smsCodeExpired':
      return { kind: 'codeExpired' }
  }
  if (isApiError(error) && error.code === undefined && error.status === 400) {
    if (step === 'bind') return { kind: 'number', key: 'errors.cardExpiryInvalid' }
    if (step === 'confirm') return { kind: 'code', key: 'errors.smsCodeWrong' }
  }
  return { kind: 'other', key }
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * Adding a card, two steps in one full-height sheet: number + expiry, then
 * the SMS code. The number, expiry and code live in this component's state
 * only: the calls are plain awaits (no mutation cache), nothing is logged or
 * stored, and closing the sheet drops the state with the component.
 */
export function AddCardSheet({ open, onClose, onSaved }: AddCardSheetProps) {
  if (!open) return null
  return <OpenAddCard onClose={onClose} onSaved={onSaved} />
}

function OpenAddCard({ onClose, onSaved }: Omit<AddCardSheetProps, 'open'>) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [number, setNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  /** A field's incomplete-value error shows once the player has left it. */
  const [touched, setTouched] = useState({ number: false, expiry: false })
  const [binding, setBinding] = useState<{ id: string; phone: string; round: number } | null>(null)
  const [code, setCode] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<Problem | null>(null)
  const mounted = useRef(true)
  const codeInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const round = binding?.round
  useEffect(() => {
    if (round === undefined) return
    // Count down from a deadline: background timers run late, the clock does not.
    const deadline = Date.now() + RESEND_SECONDS * 1000
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [round])

  useEffect(() => {
    if (round !== undefined) codeInput.current?.focus()
  }, [round])

  const numberProblem = cardNumberProblem(number)
  const expiryIssue = expiryProblem(expiry, tashkentToday())
  const formReady = numberProblem === null && expiryIssue === null
  const brand = cardBrand(number)
  // A wrong prefix or a past month is certain at once; "too short" only after leaving the field.
  const numberError =
    numberProblem === 'brand'
      ? t('cards.numberBrand')
      : numberProblem === 'length' && touched.number && number.length > 0
        ? t('cards.numberLength')
        : problem?.kind === 'number'
          ? t(problem.key)
          : undefined
  const expiryError =
    expiryIssue === 'past'
      ? t('cards.expiryPast')
      : expiryIssue === 'shape' && touched.expiry && expiry.length > 0
        ? t('cards.expiryShape')
        : problem?.kind === 'expiry'
          ? t(problem.key)
          : undefined
  const expired = problem?.kind === 'codeExpired'
  const canResend = binding !== null && secondsLeft === 0

  const requestCode = async () => {
    if (busy || !formReady) return
    setBusy(true)
    setProblem(null)
    try {
      const answer = await startCardBinding(number, expiry)
      if (!mounted.current) return
      setCode('')
      setSecondsLeft(RESEND_SECONDS)
      setBinding({ id: answer.bindingId, phone: answer.maskedPhone, round: (round ?? 0) + 1 })
    } catch (error) {
      if (mounted.current) setProblem(classify(error, 'bind'))
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  /** Same binding, a new SMS; the cooldown starts again. */
  const resendCode = async () => {
    if (busy || !binding || !canResend) return
    setBusy(true)
    setProblem(null)
    try {
      const answer = await resendCardCode(binding.id)
      if (!mounted.current) return
      setCode('')
      setSecondsLeft(RESEND_SECONDS)
      setBinding({ id: answer.bindingId, phone: answer.maskedPhone, round: binding.round + 1 })
      toast.show(t('cards.codeResent'), 'success')
    } catch (error) {
      if (!mounted.current) return
      const next = classify(error, 'resend')
      if (
        next.kind === 'other' &&
        (next.key === 'errors.smsResendUnavailable' || next.key === 'errors.bindingNotFound')
      ) {
        // No new code for this binding: back to the card form (number and expiry are
        // still filled in), which says why; Davom etish starts a new binding.
        setBinding(null)
      }
      setProblem(next)
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  const submitCode = async () => {
    if (busy || !binding || code.length !== CODE_LENGTH) return
    setBusy(true)
    setProblem(null)
    try {
      const card = await confirmCard(binding.id, code)
      // The card is saved whatever the sheet is doing: refresh the list even if it was closed.
      // Put the card in the list at once, so a screen that selects it can pay with it
      // before the refetch lands; then refetch for the server's own list.
      queryClient.setQueryData<SavedCard[]>(CARDS_KEY, (old) =>
        old ? [...old.filter((c) => c.id !== card.id), card] : [card],
      )
      void queryClient.invalidateQueries({ queryKey: CARDS_KEY })
      if (!mounted.current) return
      setNumber('')
      setExpiry('')
      setCode('')
      toast.show(t('cards.saved'), 'success')
      onSaved(card)
    } catch (error) {
      if (!mounted.current) return
      const next = classify(error, 'confirm')
      if (next.kind === 'code' || next.kind === 'codeExpired') setCode('')
      if (next.kind === 'other' && next.key === 'errors.bindingNotFound') {
        // The binding is gone: back to the card form, which says so.
        setBinding(null)
      }
      setProblem(next)
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  const banner =
    problem?.kind === 'network' ? (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-danger"
      >
        <WifiOff size={18} className="mt-0.5 shrink-0" aria-hidden />
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">{t('cards.noInternet')}</span>
          <span>{t('cards.noInternetHint')}</span>
        </div>
      </div>
    ) : problem?.kind === 'other' ? (
      <Notice tone={errorTone(problem.key)}>{t(problem.key)}</Notice>
    ) : null

  const privacy = (
    <p className="flex items-center gap-2 text-xs text-secondary">
      <Lock size={14} className="shrink-0" aria-hidden />
      {t('cards.privacy')}
    </p>
  )

  if (!binding) {
    return (
      <BottomSheet
        open
        title={t('cards.addTitle')}
        subtitle={t('cards.step1')}
        onClose={onClose}
        actions={
          <Button haptic loading={busy} disabled={!formReady} onClick={() => void requestCode()}>
            {problem?.kind === 'network' ? t('common.retry') : t('cards.next')}
          </Button>
        }
      >
        {banner}
        <Input
          label={t('cards.number')}
          value={groupCardNumber(number)}
          onChange={(event) => {
            if (problem?.kind === 'number' || problem?.kind === 'expiry') setProblem(null)
            setNumber(digitsOnly(event.target.value).slice(0, 16))
          }}
          onBlur={() => setTouched((x) => ({ ...x, number: true }))}
          inputMode="numeric"
          autoComplete="cc-number"
          error={numberError}
          trailing={brand && <CardBrandTile cardType={brand} />}
        />
        <Input
          label={t('cards.expiry')}
          value={expiry}
          onChange={(event) => {
            if (problem?.kind === 'number' || problem?.kind === 'expiry') setProblem(null)
            setExpiry(formatExpiry(event.target.value))
          }}
          onBlur={() => setTouched((x) => ({ ...x, expiry: true }))}
          inputMode="numeric"
          autoComplete="cc-exp"
          error={expiryError}
        />
        {privacy}
      </BottomSheet>
    )
  }

  const wrongCode = problem?.kind === 'code' ? problem.key : null
  return (
    <BottomSheet
      open
      title={t('cards.smsTitle')}
      subtitle={t('cards.step2')}
      onClose={onClose}
      actions={
        <Button
          haptic
          loading={busy}
          disabled={code.length !== CODE_LENGTH}
          onClick={() => void submitCode()}
        >
          {problem?.kind === 'network' ? t('common.retry') : t('cards.confirm')}
        </Button>
      }
    >
      <p className="text-base text-primary">{t('cards.codeSent', { phone: binding.phone })}</p>
      {banner}
      <div className="relative">
        <div className="flex justify-between gap-2" aria-hidden>
          {Array.from({ length: CODE_LENGTH }, (_, i) => (
            <span
              key={i}
              className={cx(
                'flex h-14 flex-1 items-center justify-center rounded-xl border bg-background text-2xl font-semibold text-primary',
                wrongCode || expired
                  ? 'border-danger'
                  : i === code.length
                    ? 'border-accent'
                    : 'border-border',
              )}
            >
              {code[i]}
            </span>
          ))}
        </div>
        <input
          ref={codeInput}
          aria-label={t('cards.smsLabel')}
          value={code}
          onChange={(event) => {
            setProblem(null)
            setCode(digitsOnly(event.target.value).slice(0, CODE_LENGTH))
          }}
          // No maxLength: a pasted "123 456" or "Kod: 123456" is cut to its digits above.
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          className="absolute inset-0 size-full bg-transparent text-transparent caret-transparent opacity-0 outline-none"
        />
      </div>
      {wrongCode && (
        <p role="alert" className="flex items-center gap-2 text-sm text-danger">
          <CircleAlert size={16} className="shrink-0" aria-hidden />
          {t(wrongCode)}
        </p>
      )}
      {expired && (
        <p role="alert" className="flex items-center gap-2 text-sm text-danger">
          <CircleAlert size={16} className="shrink-0" aria-hidden />
          {t('errors.smsCodeExpired')}
        </p>
      )}
      <Button variant="ghost" disabled={!canResend || busy} onClick={() => void resendCode()}>
        {canResend ? t('cards.resend') : t('cards.resendIn', { time: clock(secondsLeft) })}
      </Button>
      {privacy}
    </BottomSheet>
  )
}
