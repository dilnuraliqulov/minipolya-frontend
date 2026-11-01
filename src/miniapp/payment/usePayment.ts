import { useCallback, useEffect, useRef, useState } from 'react'
import type { Booking } from '../api/bookings'
import { runPayment, type PaymentState, type RunPaymentOptions } from './machine'

export function usePayment() {
  const [state, setState] = useState<PaymentState>({ kind: 'idle' })
  const busy = useRef(false)
  const unmounted = useRef(false)

  useEffect(() => {
    unmounted.current = false
    return () => {
      unmounted.current = true
    }
  }, [])

  const pay = useCallback(
    async (charge: () => Promise<Booking>, opts: Omit<RunPaymentOptions, 'isCancelled'>) => {
      if (busy.current) return
      busy.current = true
      setState({ kind: 'paying' })
      try {
        const next = await runPayment(charge, {
          ...opts,
          isCancelled: () => unmounted.current,
        })
        if (!unmounted.current) setState(next)
      } finally {
        busy.current = false
      }
    },
    [],
  )

  const reset = useCallback(() => {
    if (busy.current) return
    setState({ kind: 'idle' })
  }, [])

  return { state, pay, reset }
}
