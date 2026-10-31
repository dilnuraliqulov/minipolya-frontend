import type { Language } from '../i18n'
import type { ThemePreference } from '../theme'

/** Each language under its own name (the same in every locale). */
export const LANGUAGE_LABEL_KEYS = {
  uz: 'languages.uz',
  ru: 'languages.ru',
  en: 'languages.en',
} as const satisfies Record<Language, string>

export const THEME_LABEL_KEYS = {
  light: 'profile.themeLight',
  dark: 'profile.themeDark',
  system: 'profile.themeSystem',
} as const satisfies Record<ThemePreference, string>
