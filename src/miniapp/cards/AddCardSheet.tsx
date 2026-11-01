import { useQueryClient } from '@tanstack/react-query'
import { CircleAlert, Lock, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isApiError } from '../../shared/api'
import { CARDS_KEY, confirmCard, startCardBinding, type SavedCard } from '../api/cards'
import { errorMessage } from '../api/errors'
import { BottomSheet, Button, cx, Input, useToast } from '../components'
import {
  digitsOnly,
  formatExpiry,
  groupCardNumber,
  isCardNumberComplete,
  isExpiryShape,
} from './cardInput'

interface AddCardSheetProps {
  open: boolean
  onClose: () => void
  onSaved: (card: SavedCard) => void
}

/** The provider's SMS stays valid for about this long; also the resend timer. */
const RESEND_SECONDS = 60
const CODE_LENGTH = 6

type Problem =
  { kind: 'number' } | { kind: 'code' } | { kind: 'network' } | { kind: 'other'; message: string }

function classify(error: unknown, step: 'bind' | 'confirm'): Problem {
  if (isApiError(error)) {
    if (error.isNetworkError) return { kind: 'network' }
    if (step === 'bind' && error.status === 400) return { kind: 'number' }
    if (step === 'confirm' && error.status >= 400 && error.status < 500 && error.status !== 401) {
      return { kind: 'code' }
    }
  }
  return { kind: 'other', message: errorMessage(error) }
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
    const timer = setInterval(() => {
      setSecondsLeft((left) => {
        if (left <= 1) {
          clearInterval(timer)
          return 0
        }
        return left - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [round])

  useEffect(() => {
    if (round !== undefined) codeInput.current?.focus()
  }, [round])

  const formReady = isCardNumberComplete(number) && isExpiryShape(expiry)
  const expired = binding !== null && secondsLeft === 0

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

  const submitCode = async () => {
    if (busy || !binding || code.length !== CODE_LENGTH) return
    setBusy(true)
    setProblem(null)
    try {
      const card = await confirmCard(binding.id, code)
      if (!mounted.current) return
      setNumber('')
      setExpiry('')
      setCode('')
      void queryClient.invalidateQueries({ queryKey: CARDS_KEY })
      toast.show(t('cards.saved'), 'success')
      onSaved(card)
    } catch (error) {
      if (!mounted.current) return
      const next = classify(error, 'confirm')
      if (next.kind === 'code') setCode('')
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
      <div
        role="alert"
        className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-danger"
      >
        <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
        <span className="text-sm">{problem.message}</span>
      </div>
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
          onChange={(event) => setNumber(digitsOnly(event.target.value).slice(0, 16))}
          inputMode="numeric"
          autoComplete="cc-number"
          maxLength={19}
          error={problem?.kind === 'number' ? t('cards.wrongNumber') : undefined}
        />
        <Input
          label={t('cards.expiry')}
          value={expiry}
          onChange={(event) => setExpiry(formatExpiry(event.target.value))}
          inputMode="numeric"
          autoComplete="cc-exp"
          maxLength={5}
        />
        {privacy}
      </BottomSheet>
    )
  }

  const wrongCode = problem?.kind === 'code'
  return (
    <BottomSheet
      open
      title={t('cards.smsTitle')}
      subtitle={t('cards.step2')}
      onClose={onClose}
      actions={
        expired ? (
          <Button haptic loading={busy} onClick={() => void requestCode()}>
            {t('cards.newCode')}
          </Button>
        ) : (
          <Button
            haptic
            loading={busy}
            disabled={code.length !== CODE_LENGTH}
            onClick={() => void submitCode()}
          >
            {problem?.kind === 'network' ? t('common.retry') : t('cards.confirm')}
          </Button>
        )
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
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          className="absolute inset-0 size-full bg-transparent text-transparent caret-transparent opacity-0 outline-none"
        />
      </div>
      {wrongCode && (
        <p role="alert" className="flex items-center gap-2 text-sm text-danger">
          <CircleAlert size={16} className="shrink-0" aria-hidden />
          {t('cards.wrongCode')}
        </p>
      )}
      {expired && !wrongCode && (
        <p className="flex items-center gap-2 text-sm text-danger">
          <CircleAlert size={16} className="shrink-0" aria-hidden />
          {t('cards.codeExpired')}
        </p>
      )}
      <Button variant="ghost" disabled={!expired || busy} onClick={() => void requestCode()}>
        {expired ? t('cards.resend') : t('cards.resendIn', { time: clock(secondsLeft) })}
      </Button>
      {privacy}
    </BottomSheet>
  )
}
