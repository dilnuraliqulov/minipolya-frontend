import { useEffect, useRef } from 'react'
import type { TelegramWidgetUser } from '../api/auth'

const CALLBACK = '__minipolyaTelegramAuth'

declare global {
  interface Window {
    [CALLBACK]?: (user: TelegramWidgetUser) => void
  }
}

/**
 * Telegram's official Login Widget. It renders its own button in an iframe,
 * so its look is Telegram's, not ours. It only works on the domain set for
 * the bot with BotFather's /setdomain — not on localhost.
 */
export function TelegramLoginWidget({
  botName,
  onAuth,
}: {
  botName: string
  onAuth: (user: TelegramWidgetUser) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const onAuthRef = useRef(onAuth)
  useEffect(() => {
    onAuthRef.current = onAuth
  })

  useEffect(() => {
    const node = container.current
    if (!node) return
    window[CALLBACK] = (user) => onAuthRef.current(user)
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.dataset.telegramLogin = botName
    script.dataset.size = 'large'
    script.dataset.radius = '22'
    script.dataset.onauth = `${CALLBACK}(user)`
    node.appendChild(script)
    return () => {
      node.replaceChildren()
      delete window[CALLBACK]
    }
  }, [botName])

  return <div ref={container} className="flex min-h-11 justify-center" />
}
