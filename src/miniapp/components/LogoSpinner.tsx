import { useTranslation } from 'react-i18next'
import { LogoMark } from './LogoMark'

/** A pulsing logo: the loading indicator for splash and full-screen waits. */
export function LogoSpinner({ size = 48, label }: { size?: number; label?: string }) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      aria-label={label ?? t('common.loading')}
      className="inline-flex animate-logo-pulse motion-reduce:animate-none"
    >
      <LogoMark size={size} />
    </div>
  )
}
