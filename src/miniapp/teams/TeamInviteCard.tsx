import { UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * "Aʼzo taklif qilish": the captain's way of growing the team, given a card of
 * its own rather than a button at the bottom — on an empty team it is the one
 * thing worth doing. It opens the invite sheet (link, Telegram, renew).
 */
export function TeamInviteCard({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-11 items-center gap-3 rounded-xl border border-accent bg-accent-soft p-4 text-left"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
        <UserPlus size={20} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-semibold text-primary">{t('team.inviteCard.title')}</span>
        <span className="text-sm text-secondary">{t('team.inviteCard.text')}</span>
      </span>
    </button>
  )
}
