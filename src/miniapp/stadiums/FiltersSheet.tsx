import { MapPin } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { somToTiyin, formatSomParts } from '../../shared/format'
import { isAvailable } from '../api/missing'
import { STADIUM_DISTRICT_FILTER, type StadiumFilters } from '../api/stadiums'
import { BottomSheet, Button, Card, Input, ListRow } from '../components'

/**
 * "Filtrlar": the price limit (maxPrice, the player price per hour). The
 * district filter waits for R23 and is shown disabled with "Tez orada".
 */
export function FiltersSheet({
  open,
  filters,
  onApply,
  onClose,
}: {
  open: boolean
  filters: StadiumFilters
  onApply: (next: Pick<StadiumFilters, 'maxPrice'>) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [price, setPrice] = useState(
    filters.maxPrice === null ? '' : formatSomParts(filters.maxPrice).amount.replace(/\s/g, ''),
  )
  const digits = price.replace(/\D/g, '')
  const districtReady = isAvailable(STADIUM_DISTRICT_FILTER)

  return (
    <BottomSheet
      open={open}
      title={t('stadiums.filters')}
      onClose={onClose}
      actions={
        <>
          <Button
            haptic
            onClick={() => onApply({ maxPrice: digits ? somToTiyin(Number(digits)) : null })}
          >
            {t('stadiums.apply')}
          </Button>
          <Button variant="ghost" onClick={() => onApply({ maxPrice: null })}>
            {t('stadiums.resetFilters')}
          </Button>
        </>
      }
    >
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
          value={districtReady ? undefined : t('common.soon')}
          disabled={!districtReady}
        />
      </Card>
    </BottomSheet>
  )
}
