import { CreditCard, ShieldCheck, Timer, Users, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cx } from '../components'

const SLIDES: { key: 'verified' | 'payment' | 'opponent' | 'quick'; icon: LucideIcon }[] = [
  { key: 'verified', icon: ShieldCheck },
  { key: 'payment', icon: CreditCard },
  { key: 'opponent', icon: Users },
  { key: 'quick', icon: Timer },
]

const INTERVAL_MS = 5000

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Bosh sahifa: why MiniPolya, four true claims. Swipes natively (scroll-snap),
 * advances on its own unless touched or the device asks for reduced motion.
 */
export function WhyUsCarousel({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation()
  const track = useRef<HTMLDivElement>(null)
  const current = useRef(0)
  // While the carousel scrolls itself, the halfway positions must not move the dot back.
  const autoTarget = useRef<number | null>(null)
  const [index, setIndex] = useState(0)
  const [touching, setTouching] = useState(false)

  useEffect(() => {
    if (touching || prefersReducedMotion()) return
    const timer = window.setInterval(() => {
      const next = (current.current + 1) % SLIDES.length
      current.current = next
      setIndex(next)
      const element = track.current
      if (!element) return
      autoTarget.current = next * element.clientWidth
      element.scrollTo?.({ left: autoTarget.current, behavior: 'smooth' })
    }, INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [touching])

  const onScroll = () => {
    const element = track.current
    if (!element || element.clientWidth === 0) return
    if (autoTarget.current !== null) {
      if (Math.abs(element.scrollLeft - autoTarget.current) > 1) return
      autoTarget.current = null
    }
    const position = Math.round(element.scrollLeft / element.clientWidth)
    current.current = position
    setIndex(position)
  }

  const startTouch = () => {
    autoTarget.current = null
    setTouching(true)
  }

  return (
    <section
      aria-roledescription={t('home.whyUs.roledescription')}
      aria-label={t('home.whyUs.label')}
      className="relative flex flex-col gap-2 rounded-2xl bg-accent-soft py-3"
    >
      <div
        ref={track}
        data-testid="why-us-track"
        onScroll={onScroll}
        onTouchStart={startTouch}
        onTouchEnd={() => setTouching(false)}
        onTouchCancel={() => setTouching(false)}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]"
      >
        {SLIDES.map(({ key, icon: Icon }) => (
          <div
            key={key}
            role="group"
            className="flex w-full shrink-0 snap-center items-start gap-3 pr-11 pl-3"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background text-link">
              <Icon size={20} aria-hidden />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-md font-bold text-primary">{t(`home.whyUs.${key}.title`)}</p>
              <p className="text-sm text-primary">{t(`home.whyUs.${key}.text`)}</p>
            </div>
          </div>
        ))}
      </div>
      <div data-testid="why-us-dots" aria-hidden className="flex justify-center gap-1.5">
        {SLIDES.map(({ key }, i) => (
          <span
            key={key}
            data-active={i === index}
            className={cx(
              'h-1.5 rounded-full transition-[width] motion-reduce:transition-none',
              i === index ? 'w-4 bg-accent' : 'w-1.5 bg-secondary/40',
            )}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('home.whyUs.close')}
        className="absolute top-0 right-0 flex size-11 items-center justify-center text-secondary"
      >
        <X size={16} aria-hidden />
      </button>
    </section>
  )
}
