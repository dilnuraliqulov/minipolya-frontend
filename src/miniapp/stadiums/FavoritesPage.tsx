import { Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { errorMessage } from '../api/errors'
import {
  Button,
  EmptyState,
  ErrorState,
  Header,
  Screen,
  SkeletonList,
  useToast,
} from '../components'
import { useGoBack } from '../lib/useGoBack'
import { useFavorites, useToggleFavorite } from './queries'
import { StadiumCardCompact } from './StadiumCardCompact'

/** Profil → Sevimlilar: GET /api/favorites, most recently saved first. */
export function FavoritesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const goBack = useGoBack('/profile')
  const toast = useToast()
  const favorites = useFavorites()
  const toggle = useToggleFavorite()
  const stadiums = favorites.data?.pages.flatMap((page) => page.content) ?? []

  return (
    <Screen header={<Header title={t('profile.favorites')} onBack={goBack} />}>
      {favorites.isPending ? (
        <SkeletonList variant="stadium" />
      ) : favorites.isError ? (
        <ErrorState onRetry={() => void favorites.refetch()} />
      ) : stadiums.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center">
          <EmptyState
            icon={Heart}
            title={t('favorites.emptyTitle')}
            description={t('favorites.emptyText')}
            actionLabel={t('favorites.find')}
            onAction={() => navigate('/')}
          />
        </div>
      ) : (
        <>
          {stadiums.map((stadium) => (
            <StadiumCardCompact
              key={stadium.id}
              stadium={stadium}
              onOpen={() => navigate(`/stadiums/${stadium.id}`)}
              favorite={{
                favorited: true,
                pending: toggle.isPending && toggle.variables === stadium.id,
                onToggle: () =>
                  toggle.mutate(stadium.id, {
                    onError: (error) => toast.show(errorMessage(error), 'danger'),
                  }),
              }}
            />
          ))}
          {favorites.hasNextPage && (
            <Button
              variant="secondary"
              loading={favorites.isFetchingNextPage}
              onClick={() => void favorites.fetchNextPage()}
            >
              {t('stadiums.more')}
            </Button>
          )}
        </>
      )}
    </Screen>
  )
}
