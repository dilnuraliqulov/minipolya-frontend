import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ChallengeCardMini } from '../teams/ChallengeCardMini'
import { useChallenges, useLedTeams } from '../teams/queries'

/**
 * Bosh sahifa → "Raqib qidirayotgan jamoalar" (design E11): the challenge board's
 * first page as a horizontal scroll-snap row, "Hammasi" → the full board. A
 * skeleton while it loads; nothing at all when it is empty or fails — the home
 * screen stays about pitches. The captain's "Qabul qilish" is for the team they
 * lead (the first, if they lead several), as on Jamoam.
 */
export function ChallengeCarousel() {
  const { t } = useTranslation()
  const board = useChallenges()
  const challenges = board.data?.pages[0]?.content ?? []
  // Teams are read only when there is something to accept.
  const led = useLedTeams(challenges.length > 0)

  if (board.isPending || (challenges.length > 0 && led.isPending)) {
    return (
      <section aria-busy aria-label={t('home.challengesTitle')} className="flex flex-col gap-3">
        <div className="h-5 w-56 animate-pulse rounded-sm bg-skeleton" />
        <div className="-mx-4 flex gap-3 overflow-hidden px-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              data-testid="challenge-skeleton"
              className="flex w-62 shrink-0 flex-col gap-2.5 rounded-3xl border border-border bg-background p-2.5"
            >
              <div className="h-28 animate-pulse rounded-xl bg-skeleton" />
              <div className="h-4 w-36 animate-pulse rounded-sm bg-skeleton" />
              <div className="h-3 w-28 animate-pulse rounded-sm bg-skeleton" />
              <div className="h-11 animate-pulse rounded-xl bg-skeleton" />
            </div>
          ))}
        </div>
      </section>
    )
  }
  if (board.isError || challenges.length === 0) return null

  const acceptAs = led.teams[0]?.id
  return (
    <section aria-labelledby="home-challenges" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="home-challenges" className="text-title font-bold text-primary">
          {t('home.challengesTitle')}
        </h2>
        <Link
          to="/challenges"
          className="flex min-h-11 shrink-0 items-center text-base font-semibold text-link"
        >
          {t('home.challengesAll')}
        </Link>
      </div>
      <ul
        aria-labelledby="home-challenges"
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
      >
        {challenges.map((challenge) => (
          <li key={challenge.gameId} className="w-62 shrink-0 snap-start">
            <ChallengeCardMini challenge={challenge} acceptAs={acceptAs} />
          </li>
        ))}
      </ul>
    </section>
  )
}
