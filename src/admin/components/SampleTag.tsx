/**
 * Marks a value that is sample data, not from the backend. Every use must
 * point at an entry in docs/backend-requests.md.
 */
export function SampleTag({ request }: { request: string }) {
  return (
    <span
      title={`Namuna maʼlumot — backend bu qiymatni hali bermaydi (${request}, docs/backend-requests.md)`}
      className="inline-flex shrink-0 items-center rounded-full border border-dashed border-warning px-1.5 text-2xs font-semibold tracking-caps text-warning uppercase"
    >
      Namuna
    </span>
  )
}
