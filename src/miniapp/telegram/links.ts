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
