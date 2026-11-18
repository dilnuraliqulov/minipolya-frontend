/**
 * The three app languages' national flags as inline SVG — Uzbekistan, Russia,
 * the United Kingdom — for the language pickers. Not emoji flags: Windows
 * renders those as bare letter pairs.
 *
 * The hex values below are the flags' own official colours, not theme colours,
 * so they are written here rather than taken from a design token (the one token
 * used is `stroke-border`, for the hairline that keeps a white stripe legible on
 * a white or a black background). Purely decorative: every flag is
 * `aria-hidden`, and the language's name next to it is what is read out.
 */

export type FlagLanguage = 'uz' | 'ru' | 'en'

const WIDTH = 20
const HEIGHT = 14

export function LanguageFlag({
  language,
  className,
}: {
  language: FlagLanguage
  className?: string
}) {
  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-hidden="true"
      focusable="false"
      className={['shrink-0 rounded-xs', className].filter(Boolean).join(' ')}
    >
      <clipPath id={`flag-clip-${language}`}>
        <rect width={WIDTH} height={HEIGHT} rx="2" />
      </clipPath>
      <g clipPath={`url(#flag-clip-${language})`}>{bands(language)}</g>
      <rect
        x="0.5"
        y="0.5"
        width={WIDTH - 1}
        height={HEIGHT - 1}
        rx="2"
        fill="none"
        strokeWidth="1"
        className="stroke-border"
      />
    </svg>
  )
}

function bands(language: FlagLanguage) {
  switch (language) {
    case 'uz':
      return (
        <>
          {/* Blue, white, green bands separated by two thin red stripes. */}
          <rect width="20" height="4.4" fill="#0099B5" />
          <rect y="4.4" width="20" height="5.2" fill="#FFFFFF" />
          <rect y="9.6" width="20" height="4.4" fill="#1EB53A" />
          <rect y="4.4" width="20" height="0.5" fill="#CE1126" />
          <rect y="9.1" width="20" height="0.5" fill="#CE1126" />
          {/* The crescent: a white disc with a blue disc cut out of its right. */}
          <circle cx="3.6" cy="2.2" r="1.5" fill="#FFFFFF" />
          <circle cx="4.4" cy="2.2" r="1.5" fill="#0099B5" />
          {/* Three of the twelve stars — more would be mud at this size. */}
          <circle cx="7.1" cy="1.3" r="0.4" fill="#FFFFFF" />
          <circle cx="7.1" cy="3.1" r="0.4" fill="#FFFFFF" />
          <circle cx="8.9" cy="3.1" r="0.4" fill="#FFFFFF" />
        </>
      )
    case 'ru':
      return (
        <>
          <rect width="20" height="4.67" fill="#FFFFFF" />
          <rect y="4.67" width="20" height="4.66" fill="#0039A6" />
          <rect y="9.33" width="20" height="4.67" fill="#D52B1E" />
        </>
      )
    case 'en':
      return (
        <>
          <rect width="20" height="14" fill="#012169" />
          {/* The saltire: white diagonals, then the red ones offset inside them. */}
          <path d="M0 0 20 14M20 0 0 14" stroke="#FFFFFF" strokeWidth="2.8" />
          <path d="M0 0 20 14" stroke="#C8102E" strokeWidth="1.2" />
          <path d="M20 0 0 14" stroke="#C8102E" strokeWidth="1.2" />
          {/* St George's cross over it. */}
          <path d="M10 0V14M0 7H20" stroke="#FFFFFF" strokeWidth="4.6" />
          <path d="M10 0V14M0 7H20" stroke="#C8102E" strokeWidth="2.8" />
        </>
      )
  }
}
