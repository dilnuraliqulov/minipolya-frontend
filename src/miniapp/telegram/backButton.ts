import { useEffect, useRef } from 'react'
import { getTelegramWebApp } from './webApp'

/**
 * Shows Telegram's own BackButton while the calling screen is mounted and
 * runs `onBack` when it is tapped; `null` leaves it hidden (tab roots).
 *
 * Returns whether Telegram draws the button — when false (a plain browser in
 * development) the screen's Header draws its own back arrow instead.
 */
export function useBackButton(onBack: (() => void) | null): boolean {
  const webApp = getTelegramWebApp()
  const handler = useRef(onBack)
  useEffect(() => {
    handler.current = onBack
  })

  const enabled = onBack !== null
  useEffect(() => {
    if (!webApp || !enabled) return
    const click = () => handler.current?.()
    webApp.BackButton.onClick(click)
    webApp.BackButton.show()
    return () => {
      webApp.BackButton.offClick(click)
      webApp.BackButton.hide()
    }
  }, [webApp, enabled])

  return webApp !== null
}
