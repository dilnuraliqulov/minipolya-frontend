import { CircleAlert, CircleCheck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { haptic } from '../telegram'
import { cx } from './cx'
import { ToastContext, type ToastApi, type ToastTone } from './toast'

const VISIBLE_MS = 3000

/** The design's Toast: a soft-coloured bar above the bottom navigation. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string; tone: ToastTone } | null>(null)

  const show = useCallback<ToastApi['show']>((message, tone = 'success') => {
    if (tone === 'danger') haptic.error()
    else haptic.success()
    setToast({ id: Date.now(), message, tone })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [toast])

  const api = useMemo(() => ({ show }), [show])
  const Icon = toast?.tone === 'danger' ? CircleAlert : CircleCheck

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-[calc(96px+var(--tg-safe-bottom))] z-50 flex justify-center">
        <div role="status" aria-live="polite" className="w-full max-w-sm">
          {toast && (
            <div
              key={toast.id}
              className={cx(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium shadow-lg',
                toast.tone === 'danger'
                  ? 'bg-danger-soft text-danger'
                  : 'bg-success-soft text-success',
              )}
            >
              <Icon size={18} className="shrink-0" aria-hidden />
              <span className="flex-1">{toast.message}</span>
            </div>
          )}
        </div>
      </div>
    </ToastContext.Provider>
  )
}
