import { Moon, Sun } from 'lucide-react'
import { toggleAdminTheme, useAdminTheme } from './theme'

export function PlaceholderPage() {
  const theme = useAdminTheme()
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <main className="flex min-h-dvh items-center justify-center bg-page p-10">
      <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-background p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-primary">MiniPolya Admin</h1>
          <p className="text-base text-secondary">Boshqaruv paneli tayyorlanmoqda</p>
        </div>
        <button
          type="button"
          onClick={toggleAdminTheme}
          className="flex h-9 items-center gap-2 rounded-md bg-accent px-3.5 text-base font-medium text-on-accent"
        >
          <Icon size={16} aria-hidden />
          {theme === 'dark' ? 'Yorug‘ rejim' : 'Tungi rejim'}
        </button>
      </div>
    </main>
  )
}
