import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button, type ButtonVariant } from './Button'
import { cx } from './cx'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer: ReactNode
}

/** Base dialog: overlay, title with close button, body, footer. Esc and overlay click close it. */
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  // Callers pass inline functions; keep the latest without re-running the focus effect.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    // A text field first; otherwise the first button that is not the close icon.
    const first =
      panel.current?.querySelector<HTMLElement>('textarea, input') ??
      panel.current?.querySelector<HTMLElement>('button:not([data-modal-close])')
    first?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay max-md:p-0 md:items-center md:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          'flex w-110 max-w-full flex-col rounded-2xl border border-border bg-background shadow-xl',
          // A sheet from the bottom edge on a phone, where a centred 440px box
          // leaves the keyboard nowhere to go.
          'max-md:max-h-[90dvh] max-md:w-full max-md:rounded-b-none',
        )}
      >
        <div className="flex items-start gap-3 pt-4 pr-3 pl-4 md:pt-5 md:pr-5 md:pl-6">
          <h2 id={titleId} className="flex-1 text-xl font-semibold text-primary md:pt-1">
            {title}
          </h2>
          <button
            type="button"
            data-modal-close
            aria-label="Yopish"
            onClick={onClose}
            className="flex size-11 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-hover hover:text-primary focus-visible:outline-2 focus-visible:outline-accent md:size-auto md:hover:bg-transparent"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-3.5 overflow-y-auto px-4 pt-2.5 pb-5 md:px-6">
          {children}
        </div>
        <div
          data-testid="modal-footer"
          className="flex flex-col-reverse gap-2.5 border-t border-border px-4 pt-3.5 pb-5 md:flex-row md:justify-end md:px-6 [&>button]:max-md:w-full"
        >
          {footer}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export interface ConfirmModalProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  variant?: Extract<ButtonVariant, 'primary' | 'danger'>
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  variant = 'primary',
  busy = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-base text-secondary">{message}</p>
    </Modal>
  )
}

export interface ReasonModalProps {
  open: boolean
  title: string
  description?: string
  /** Quick picks; clicking one puts its text into the field. */
  chips?: string[]
  /** The reason must be at least this long (after trimming). */
  minLength?: number
  /** The field takes at most this many characters (the backend limit); a counter shows the count. */
  maxLength?: number
  hint?: string
  confirmLabel: string
  /** Danger for negative actions (the default); primary for a neutral record. */
  confirmVariant?: Extract<ButtonVariant, 'primary' | 'danger'>
  busy?: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}

/** Asks for a required reason before a negative action (reject, block). */
export function ReasonModal({
  open,
  title,
  description = 'Sababni tanlang yoki yozing.',
  chips = [],
  minLength = 10,
  maxLength = 500,
  hint,
  confirmLabel,
  confirmVariant = 'danger',
  busy = false,
  onConfirm,
  onClose,
}: ReasonModalProps) {
  const [reason, setReason] = useState('')
  const fieldId = useId()
  const textarea = useRef<HTMLTextAreaElement>(null)
  const valid = reason.trim().length >= minLength

  const close = () => {
    setReason('')
    onClose()
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Bekor qilish
          </Button>
          <Button
            variant={confirmVariant}
            disabled={!valid || busy}
            onClick={() => {
              onConfirm(reason.trim())
              setReason('')
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-base text-secondary">{description}</p>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              aria-pressed={reason === chip}
              onClick={() => {
                setReason(chip)
                textarea.current?.focus()
              }}
              className={cx(
                'rounded-full border px-3 py-1.5 text-sm font-medium',
                'focus-visible:outline-2 focus-visible:outline-accent',
                reason === chip
                  ? 'border-accent bg-accent-soft text-link-text'
                  : 'border-border bg-surface text-primary hover:bg-hover',
              )}
            >
              {chip}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-primary">
          Sabab (kamida {minLength} ta belgi) <span className="text-danger-text">*</span>
        </label>
        <textarea
          ref={textarea}
          id={fieldId}
          required
          minLength={minLength}
          maxLength={maxLength}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="h-24 resize-none rounded-md border border-border bg-background px-3 py-2.5 text-base text-primary outline-none focus:border-accent max-md:text-field"
        />
        <div className="flex justify-between gap-3 text-xs text-secondary">
          <p>{hint}</p>
          <p aria-live="polite" className="shrink-0 tabular-nums">
            {reason.length} / {maxLength}
          </p>
        </div>
      </div>
    </Modal>
  )
}
