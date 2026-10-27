import type { ReactNode } from 'react'

/** The centred 400 px card of the "Kirish" screens. */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-page p-6">
      <div className="flex w-100 max-w-full flex-col items-center rounded-3xl border border-border bg-background px-9 pt-10 pb-8 text-center shadow-card">
        {children}
      </div>
    </main>
  )
}
