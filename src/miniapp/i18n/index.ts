import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ru from './locales/ru.json'
import uz from './locales/uz.json'

/**
 * Mini App translations. Every user-facing string goes through `t()`.
 *
 * The language comes from the user's backend profile (`user.language` on
 * GET /api/users/me) — not the browser, not Telegram. Until that is loaded,
 * Uzbek is shown.
 */

export const LANGUAGES = ['uz', 'ru', 'en'] as const
export type Language = (typeof LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'uz'

export const resources = {
  uz: { translation: uz },
  ru: { translation: ru },
  en: { translation: en },
} as const

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language)
}

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGES,
  interpolation: { escapeValue: false }, // React already escapes.
})

/** Switch to the language from the user's profile; unknown values keep Uzbek. */
export function setLanguage(language: string): Promise<unknown> {
  return i18n.changeLanguage(isLanguage(language) ? language : DEFAULT_LANGUAGE)
}

export default i18n
