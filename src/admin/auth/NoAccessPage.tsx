import { LogOut, ShieldOff } from 'lucide-react'
import type { User } from '../api/types'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { AuthCard } from './AuthCard'
import { logout } from './session'

/** A logged-in user without `isAdmin`. */
export function NoAccessPage({ user }: { user: User }) {
  return (
    <AuthCard>
      <span className="flex size-14 items-center justify-center rounded-full bg-danger-soft">
        <ShieldOff size={26} aria-hidden className="text-danger" />
      </span>
      <h1 className="mt-4.5 text-2xl font-semibold text-primary">Sizda kirish huquqi yoʻq</h1>
      <p className="mt-2 text-base text-secondary">
        Bu Telegram hisobi administrator sifatida roʻyxatdan oʻtmagan. Agar bu xato deb
        hisoblasangiz, bosh administratorga murojaat qiling.
      </p>
      <span className="mt-4 flex max-w-full items-center gap-2 rounded-full bg-surface py-1.5 pr-3 pl-1.5">
        <Avatar name={user.name} size="sm" />
        <span className="truncate text-sm font-medium text-primary">{user.name}</span>
      </span>
      <Button variant="secondary" icon={LogOut} className="mt-6 w-full" onClick={() => logout()}>
        Chiqish
      </Button>
    </AuthCard>
  )
}
