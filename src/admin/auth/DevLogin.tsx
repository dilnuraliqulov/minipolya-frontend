import { Terminal } from 'lucide-react'
import { Button } from '../components/Button'

/**
 * DEVELOPMENT ONLY. Imported by LoginPage behind `import.meta.env.DEV`, so a
 * production build drops this module and the VITE_DEV_INIT_DATA value with
 * it; `npm run build` verifies that (scripts/check-dist.mjs).
 *
 * Posts signed Telegram initData for a test user to the normal Mini App
 * login endpoint. How to generate the value: CLAUDE.md, "Admin dev login".
 */
export default function DevLogin({
  busy,
  onLogin,
}: {
  busy: boolean
  onLogin: (initData: string) => void
}) {
  const initData = import.meta.env.VITE_DEV_INIT_DATA?.trim()

  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-warning bg-warning-soft p-3">
      <p className="text-xs font-semibold tracking-caps text-warning uppercase">
        Faqat development
      </p>
      <Button
        variant="secondary"
        icon={Terminal}
        className="w-full"
        disabled={!initData || busy}
        onClick={() => initData && onLogin(initData)}
      >
        Dev login
      </Button>
      {!initData && (
        <p className="text-xs text-secondary">
          .env.local da VITE_DEV_INIT_DATA yoʻq — CLAUDE.md, “Admin dev login”.
        </p>
      )}
    </div>
  )
}
