import { LOGO_MARK_PATH, LOGO_MARK_VIEWBOX } from '../../shared/brand/logoMark'
import { cx } from './cx'

/** The MiniPolya mark; takes the colour of the text around it (accent by default). */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox={LOGO_MARK_VIEWBOX}
      fill="currentColor"
      className={cx('shrink-0 text-accent', className)}
    >
      <path fillRule="evenodd" d={LOGO_MARK_PATH} />
    </svg>
  )
}
