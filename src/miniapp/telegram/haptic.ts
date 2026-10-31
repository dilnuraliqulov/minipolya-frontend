import { getTelegramWebApp } from './webApp'

/** Haptic feedback for main actions. A no-op outside Telegram. */
export const haptic = {
  light: () => getTelegramWebApp()?.HapticFeedback.impactOccurred('light'),
  success: () => getTelegramWebApp()?.HapticFeedback.notificationOccurred('success'),
  error: () => getTelegramWebApp()?.HapticFeedback.notificationOccurred('error'),
  selection: () => getTelegramWebApp()?.HapticFeedback.selectionChanged(),
}
