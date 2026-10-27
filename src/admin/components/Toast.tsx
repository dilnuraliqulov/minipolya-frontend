import { CircleCheck, CircleX, Info } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  tone: ToastTone
  text: string
}

const TONES = {
  success: { icon: CircleCheck, className: 'text-success' },
  error: { icon: CircleX, className: 'text-danger' },
  info: { icon: Info, className: 'text-link' },
}

export const TOAST_DURATION_MS = 4000

type ShowToast = (tone: ToastTone, text: string) => void

const ToastContext = createContext<ShowToast | null>(null)

/** Inverted pill (text colour as background) in the bottom-right corner. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const show = useCallback<ShowToast>((tone, text) => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, tone, text }])
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), TOAST_DURATION_MS)
  }, [])

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed right-6 bottom-6 z-60 flex flex-col items-end gap-3"
      >
        {toasts.map((toast) => {
          const tone = TONES[toast.tone]
          return (
            <div
              key={toast.id}
              className="flex items-center gap-2.5 rounded-lg bg-primary py-3 pr-4 pl-3.5 shadow-lg"
            >
              <tone.icon size={18} aria-hidden className={tone.className} />
              <span className="text-base font-medium text-background">{toast.text}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs with its provider
export function useToast() {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast must be used inside <ToastProvider>')
  return {
    success: (text: string) => show('success', text),
    error: (text: string) => show('error', text),
    info: (text: string) => show('info', text),
  }
}
