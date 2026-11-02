import { getTelegramWebApp } from './webApp'

/** Telegram allows A–Z, a–z, 0–9, _ and - in `startapp`, up to 512 characters. */
const START_PARAM = /^[A-Za-z0-9_-]{1,512}$/

/**
 * A link that opens the Mini App with `startapp=<param>` — for team and game
 * invites: `https://t.me/<bot>/<app>?startapp=<param>`. Both names are public
 * values from VITE_TELEGRAM_BOT_USERNAME / VITE_TELEGRAM_APP_NAME.
 */
export function buildInviteLink(param: string): string {
  if (!START_PARAM.test(param)) {
    throw new Error(`Invalid startapp parameter: ${JSON.stringify(param)}`)
  }
  const bot = import.meta.env.VITE_TELEGRAM_BOT_USERNAME
  const app = import.meta.env.VITE_TELEGRAM_APP_NAME
  if (!bot) throw new Error('VITE_TELEGRAM_BOT_USERNAME is not set')
  if (!app) throw new Error('VITE_TELEGRAM_APP_NAME is not set')
  return `https://t.me/${bot}/${app}?startapp=${param}`
}

/**
 * Opens an outside web page (a map, a support page): Telegram's in-app
 * browser inside Telegram, a new tab in a plain browser.
 */
export function openExternalLink(url: string): void {
  const webApp = getTelegramWebApp()
  if (webApp) webApp.openLink(url)
  else window.open(url, '_blank', 'noopener')
}
