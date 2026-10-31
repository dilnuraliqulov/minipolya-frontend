import { useTranslation } from 'react-i18next'
import { errorMessage } from '../api/errors'
import { BottomSheet, OptionList, useToast } from '../components'
import { LANGUAGES, type Language } from '../i18n'
import { setThemePreference, useThemePreference } from '../theme'
import { LANGUAGE_LABEL_KEYS, THEME_LABEL_KEYS } from './labels'
import { useUpdateLanguage } from './queries'

/** "Tilni tanlang": saved on the backend profile (PATCH /users/me), which drives i18n. */
export function LanguageSheet({
  open,
  current,
  onClose,
}: {
  open: boolean
  current: Language
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const update = useUpdateLanguage()
  const choose = (language: Language) => {
    if (language === current) return onClose()
    update.mutate(language, {
      onSuccess: onClose,
      onError: (error) => toast.show(errorMessage(error), 'danger'),
    })
  }
  return (
    <BottomSheet open={open} title={t('profile.languageTitle')} onClose={onClose}>
      <OptionList
        label={t('profile.languageTitle')}
        options={LANGUAGES.map((value) => ({ value, label: t(LANGUAGE_LABEL_KEYS[value]) }))}
        value={current}
        onChange={choose}
        disabled={update.isPending}
      />
    </BottomSheet>
  )
}

/** "Mavzuni tanlang": Yorugʻ / Qorongʻi / Tizim (a display preference on this device). */
export function ThemeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const preference = useThemePreference()
  const options = (['light', 'dark', 'system'] as const).map((value) => ({
    value,
    label: t(THEME_LABEL_KEYS[value]),
  }))
  return (
    <BottomSheet open={open} title={t('profile.themeTitle')} onClose={onClose}>
      <OptionList
        label={t('profile.themeTitle')}
        options={options}
        value={preference}
        onChange={(value) => {
          setThemePreference(value)
          onClose()
        }}
      />
    </BottomSheet>
  )
}
