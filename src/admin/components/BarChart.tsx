import { useEffect, useRef, useState } from 'react'
import { formatNumber } from '../../shared/format'
import { cx } from './cx'
import { labelledIndexes, niceMax, TICKS } from './chartScale'

export interface BarDatum {
  key: string
  /** Short x-axis label, e.g. "14 okt". */
  label: string
  /** Tooltip heading, e.g. "14 oktabr". */
  title: string
  value: number
}

const BAR_RADIUS = 4
const GAP = 4
const FALLBACK_WIDTH = 1000 // before the first measurement, and in tests (no ResizeObserver)

function topRoundedBar(x: number, y: number, width: number, height: number): string {
  const r = Math.min(BAR_RADIUS, width / 2, height)
  const bottom = y + height
  return `M${x},${bottom}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${bottom}Z`
}

export interface BarChartProps {
  data: BarDatum[]
  /** Tooltip value line, e.g. `(v) => \`${v} ta bron\``. */
  formatValue: (value: number) => string
  /** Accessible summary of the whole chart. */
  label: string
  height?: number
}

/** A small SVG bar chart: grid, y-axis ticks, x-axis labels, tooltip on hover or focus. */
export function BarChart({ data, formatValue, label, height = 300 }: BarChartProps) {
  const plot = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(FALLBACK_WIDTH)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    const node = plot.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const slot = data.length ? width / data.length : width
  const barWidth = Math.max(1, slot - GAP)
  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => (max / TICKS) * (TICKS - i))
  const activeDatum = active === null ? undefined : data[active]

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-2.5">
        <div
          aria-hidden
          className="flex w-6 shrink-0 flex-col items-end justify-between text-2xs text-secondary"
          style={{ height }}
        >
          {ticks.map((tick) => (
            <span key={tick} className="leading-none">
              {formatNumber(Math.round(tick))}
            </span>
          ))}
        </div>
        <div ref={plot} className="relative min-w-0 flex-1" style={{ height }}>
          <svg
            role="img"
            aria-label={label}
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="block overflow-visible"
            onMouseLeave={() => setActive(null)}
          >
            {ticks.map((tick, i) => {
              const y = Math.min(height - 0.5, Math.max(0.5, (height / TICKS) * i))
              return (
                <line
                  key={tick}
                  x1={0}
                  x2={width}
                  y1={y}
                  y2={y}
                  className="stroke-border"
                  strokeWidth={1}
                />
              )
            })}
            {data.map((datum, i) => {
              const barHeight = (datum.value / max) * height
              const x = i * slot + GAP / 2
              return (
                <g key={datum.key}>
                  {barHeight > 0 && (
                    <path
                      d={topRoundedBar(x, height - barHeight, barWidth, barHeight)}
                      className={cx('fill-accent transition-opacity', active !== i && 'opacity-72')}
                    />
                  )}
                  <rect
                    data-testid="bar"
                    x={i * slot}
                    y={0}
                    width={slot}
                    height={height}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${datum.title}: ${formatValue(datum.value)}`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    className="outline-none focus-visible:stroke-accent"
                  />
                </g>
              )
            })}
          </svg>
          {activeDatum && active !== null && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-10 flex w-max -translate-x-1/2 -translate-y-full flex-col gap-0.5 rounded-md bg-primary px-2.5 py-2 shadow-md"
              style={{
                left: active * slot + slot / 2,
                top: height - (activeDatum.value / max) * height - 8,
              }}
            >
              <span className="text-2xs text-secondary">{activeDatum.title}</span>
              <span className="text-sm font-semibold text-background">
                {formatValue(activeDatum.value)}
              </span>
            </div>
          )}
        </div>
      </div>
      <div aria-hidden className="relative ml-8.5 h-3.5 text-2xs text-secondary">
        {labelledIndexes(data.length).map((i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${((i + 0.5) / data.length) * 100}%` }}
          >
            {data[i]?.label}
          </span>
        ))}
      </div>
    </div>
  )
}
