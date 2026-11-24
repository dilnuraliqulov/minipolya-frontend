import { SendHorizontal } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cx } from '../../components'

/** The counter appears only once the limit is close enough to matter. */
const COUNTER_WITHIN = 50

/**
 * The chat's composer, pinned above the keyboard and Telegram's safe area. It
 * grows with the message up to four lines and then scrolls; Enter inserts a
 * newline and never sends, because on a phone the send button is right there
 * and a stray Enter costs a half-written message.
 */
export function Composer({
  value,
  onChange,
  onSend,
  maxLength,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  /** The server's limit, from the game detail. */
  maxLength: number
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const box = useRef<HTMLTextAreaElement>(null)
  const trimmed = value.trim()
  const left = maxLength - value.length
  const grow = (element: HTMLTextAreaElement | null) => {
    if (!element) return
    element.style.height = 'auto'
    // Four lines at 24px, plus the 20px of vertical padding.
    element.style.height = `${Math.min(element.scrollHeight, 4 * 24 + 20)}px`
  }

  return (
    <div className="sticky bottom-0 flex flex-col gap-1 border-t border-border bg-bar px-4 pt-3 pb-[max(12px,var(--tg-safe-bottom))]">
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (trimmed && !disabled) onSend()
        }}
      >
        <textarea
          ref={(element) => {
            box.current = element
            grow(element)
          }}
          rows={1}
          aria-label={t('chat.input')}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={t('chat.placeholder')}
          onChange={(event) => {
            onChange(event.target.value)
            grow(event.target)
          }}
          className="min-h-11 flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-2.5 text-base text-primary disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label={t('chat.send')}
          disabled={disabled || !trimmed}
          className={cx(
            'flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent',
            'disabled:opacity-50',
          )}
        >
          <SendHorizontal size={20} aria-hidden />
        </button>
      </form>
      {left <= COUNTER_WITHIN && (
        <p
          aria-live="polite"
          className={cx('self-end text-2xs', left <= 0 ? 'text-danger-text' : 'text-secondary')}
        >
          {`${value.length}/${maxLength}`}
        </p>
      )}
    </div>
  )
}
