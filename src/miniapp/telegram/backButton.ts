import { useEffect, useRef } from 'react'
import { getTelegramWebApp, type TelegramWebApp } from './webApp'

/**
 * Telegram has one BackButton, but a screen and a sheet open over it may both
 * want it. Registrations form a stack: a tap goes to the top-most one only,
 * and the button stays visible while anything is registered.
 */
const stack: Array<{ current: (() => void) | null }> = []

function dispatch() {
  stack[stack.length - 1]?.current?.()
}

function push(webApp: TelegramWebApp, entry: { current: (() => void) | null }) {
  if (stack.length === 0) {
    webApp.BackButton.onClick(dispatch)
    webApp.BackButton.show()
  }
  stack.push(entry)
}

function remove(webApp: TelegramWebApp, entry: { current: (() => void) | null }) {
  const index = stack.lastIndexOf(entry)
  if (index !== -1) stack.splice(index, 1)
  if (stack.length === 0) {
    webApp.BackButton.offClick(dispatch)
    webApp.BackButton.hide()
  }
}

/**
 * Shows Telegram's own BackButton while the calling screen (or sheet) is
 * mounted and runs `onBack` when it is tapped; `null` registers nothing
 * (tab roots).
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
    push(webApp, handler)
    return () => remove(webApp, handler)
  }, [webApp, enabled])

  return webApp !== null
}
