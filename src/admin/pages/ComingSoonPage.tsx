import { Hourglass } from 'lucide-react'
import { EmptyState } from '../components/States'

/** Placeholder for sections not built yet. */
export function ComingSoonPage() {
  return (
    <div className="rounded-xl border border-border bg-background">
      <EmptyState
        icon={Hourglass}
        title="Tez orada"
        description="Bu boʻlim keyingi bosqichlarda qoʻshiladi"
        className="py-18"
      />
    </div>
  )
}
