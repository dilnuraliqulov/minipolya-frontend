import { Check, MapPin } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { somToTiyin, formatSomParts } from '../../shared/format'
import {
  DISTRICTS,
  FORMATS,
  type District,
  type StadiumFilters,
  type StadiumFormat,
} from '../api/stadiums'
import { BottomSheet, Button, Card, Chip, Input, ListRow, cx } from '../components'
import { haptic } from '../telegram'
import { formatLabel } from './labels'

export type AppliedFilters = Pick<StadiumFilters, 'format' | 'maxPrice' | 'district'>

/**
 * "Filtrlar": the format, the price limit (maxPrice, the player price per
 * hour) and the district. "Tuman" opens "Tumanni tanlang" — the twelve
 * districts the backend accepts, plus "Barcha tumanlar"; choosing one returns
 * here. Nothing is sent until "Qoʻllash".
 */
export function FiltersSheet({
  open,
  filters,
  onApply,
  onClose,
}: {
  open: boolean
  filters: StadiumFilters
  onApply: (next: AppliedFilters) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [price, setPrice] = useState(
    filters.maxPrice === null ? '' : formatSomParts(filters.maxPrice).amount.replace(/\s/g, ''),
  )
  const formatId = useId()
  const [format, setFormat] = useState<StadiumFormat | null>(filters.format)
  const [district, setDistrict] = useState<District | null>(filters.district)
  const [choosingDistrict, setChoosingDistrict] = useState(false)
  const digits = price.replace(/\D/g, '')

  if (choosingDistrict) {
    return (
      <DistrictSheet
        open={open}
        value={district}
        onChoose={(next) => {
          setDistrict(next)
          setChoosingDistrict(false)
        }}
        onClose={() => setChoosingDistrict(false)}
      />
    )
  }

  return (
    <BottomSheet
      open={open}
      title={t('stadiums.filters')}
      onClose={onClose}
      actions={
        <>
          <Button
            haptic
            onClick={() =>
              onApply({ format, maxPrice: digits ? somToTiyin(Number(digits)) : null, district })
            }
          >
            {t('stadiums.apply')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onApply({ format: null, maxPrice: null, district: null })}
          >
            {t('stadiums.resetFilters')}
          </Button>
        </>
      }
    >
      <div role="group" aria-labelledby={formatId} className="flex flex-col gap-1.5">
        <p id={formatId} className="text-sm font-medium text-secondary">
          {t('stadiums.format')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip selected={format === null} onClick={() => setFormat(null)}>
            {t('stadiums.allFormats')}
          </Chip>
          {FORMATS.map((option) => (
            <Chip key={option} selected={format === option} onClick={() => setFormat(option)}>
              {formatLabel(option)}
            </Chip>
          ))}
        </div>
      </div>
      <Input
        label={t('stadiums.maxPrice')}
        inputMode="numeric"
        placeholder="150000"
        value={price}
        onChange={(event) => setPrice(event.target.value.replace(/\D/g, '').slice(0, 9))}
      />
      <Card>
        <ListRow
          icon={MapPin}
          label={t('stadiums.district')}
          value={district ?? t('stadiums.allDistricts')}
          onClick={() => setChoosingDistrict(true)}
        />
      </Card>
    </BottomSheet>
  )
}

/** "Tumanni tanlang": one row per district, the chosen one in the link colour with a tick. */
function DistrictSheet({
  open,
  value,
  onChoose,
  onClose,
}: {
  open: boolean
  value: District | null
  onChoose: (district: District | null) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const options: Array<{ value: District | null; label: string }> = [
    { value: null, label: t('stadiums.allDistricts') },
    ...DISTRICTS.map((district) => ({ value: district, label: district })),
  ]
  return (
    <BottomSheet open={open} title={t('stadiums.chooseDistrict')} onClose={onClose}>
      <div role="radiogroup" aria-label={t('stadiums.district')} className="flex flex-col">
        {options.map((option) => {
          const checked = option.value === value
          return (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => {
                haptic.selection()
                onChoose(option.value)
              }}
              className="flex min-h-11 items-center gap-2 border-b border-border text-left last:border-b-0"
            >
              <span
                className={cx(
                  'flex-1 text-md',
                  checked ? 'font-semibold text-link' : 'text-primary',
                )}
              >
                {option.label}
              </span>
              {checked && <Check size={18} className="shrink-0 text-link" aria-hidden />}
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
