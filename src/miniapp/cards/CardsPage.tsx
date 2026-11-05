import { CreditCard, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '../api/errors'
import { formatMaskedNumber, type SavedCard } from '../api/cards'
import {
  BottomSheet,
  Button,
  EmptyState,
  ErrorState,
  Header,
  Screen,
  SkeletonList,
  useToast,
} from '../components'
import { useGoBack } from '../lib/useGoBack'
import { AddCardSheet } from './AddCardSheet'
import { CardRow } from './CardRow'
import { useCards, useDeleteCard } from './queries'

/** Profil → Kartalarim: the saved cards, delete with a confirm, add a card. */
export function CardsPage() {
  const { t } = useTranslation()
  const goBack = useGoBack('/profile')
  const toast = useToast()
  const cards = useCards()
  const remove = useDeleteCard()
  const [adding, setAdding] = useState(false)
  const [menuCard, setMenuCard] = useState<SavedCard | null>(null)
  const [confirmCard, setConfirmCard] = useState<SavedCard | null>(null)

  const label = (card: SavedCard) => formatMaskedNumber(card.maskedNumber)

  const confirmDelete = () => {
    if (!confirmCard) return
    remove.mutate(confirmCard.id, {
      onSuccess: () => toast.show(t('cards.deleted'), 'success'),
      onError: (error) => toast.show(errorMessage(error), 'danger'),
    })
    setConfirmCard(null)
  }

  return (
    <Screen header={<Header title={t('profile.cards')} onBack={goBack} />}>
      {cards.isPending ? (
        <SkeletonList variant="item" />
      ) : cards.isError ? (
        <ErrorState onRetry={() => void cards.refetch()} />
      ) : cards.data.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center">
          <EmptyState
            icon={CreditCard}
            title={t('cards.emptyTitle')}
            description={t('cards.emptyText')}
            actionLabel={t('cards.add')}
            onAction={() => setAdding(true)}
          />
        </div>
      ) : (
        <>
          {cards.data.map((card) => (
            <CardRow key={card.id} card={card} onMore={() => setMenuCard(card)} />
          ))}
          <Button variant="ghost" icon={Plus} haptic onClick={() => setAdding(true)}>
            {t('cards.add')}
          </Button>
          <p className="text-sm text-secondary">{t('cards.footer')}</p>
        </>
      )}

      <BottomSheet
        open={menuCard !== null}
        title={menuCard ? label(menuCard) : ''}
        onClose={() => setMenuCard(null)}
        actions={
          <>
            <Button
              variant="danger-outline"
              icon={Trash2}
              onClick={() => {
                setConfirmCard(menuCard)
                setMenuCard(null)
              }}
            >
              {t('cards.delete')}
            </Button>
            <Button variant="ghost" onClick={() => setMenuCard(null)}>
              {t('cards.back')}
            </Button>
          </>
        }
      />
      <BottomSheet
        open={confirmCard !== null}
        title={t('cards.deleteTitle')}
        subtitle={
          confirmCard
            ? t('cards.deleteText', {
                card: `${confirmCard.cardType.charAt(0).toUpperCase()}${confirmCard.cardType.slice(1)} ${label(confirmCard)}`,
              })
            : undefined
        }
        onClose={() => setConfirmCard(null)}
        actions={
          <>
            <Button variant="danger" icon={Trash2} haptic onClick={confirmDelete}>
              {t('cards.deleteConfirm')}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmCard(null)}>
              {t('cards.back')}
            </Button>
          </>
        }
      />
      <AddCardSheet
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={() => setAdding(false)}
      />
    </Screen>
  )
}
