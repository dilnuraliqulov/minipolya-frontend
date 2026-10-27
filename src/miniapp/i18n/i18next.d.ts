import 'i18next'
import type uz from './locales/uz.json'

// Typed keys: `t('app.tagline')` is checked against the Uzbek file.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof uz }
  }
}
