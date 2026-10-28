import { Eye, EyeOff, Goal, LoaderCircle } from 'lucide-react'
import { type FormEvent, type InputHTMLAttributes, useId, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { loginWithPassword } from '../api/auth'
import { Button } from '../components/Button'
import { cx } from '../components/cx'
import { AuthCard } from './AuthCard'
import { LOGOUT_NOTICES, loginErrorMessage } from './messages'
import { startSession, useSession } from './session'

/**
 * "Kirish": username + password. Admin accounts and passwords are managed in
 * the database only, so there is no register, forgot or change-password link.
 */
export function LoginPage() {
  const session = useSession()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (session.status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? '/'} replace />
  }

  const canSubmit = username.trim() !== '' && password !== '' && !busy

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      const { token, user } = await loginWithPassword(username, password)
      startSession(token, user)
    } catch (cause) {
      setError(loginErrorMessage(cause))
      setBusy(false)
    }
  }

  const notice = session.status === 'anonymous' && session.reason
  const message = error ?? (notice ? LOGOUT_NOTICES[notice] : null)

  return (
    <AuthCard>
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent">
        <Goal size={30} aria-hidden className="text-on-accent" />
      </span>
      <h1 className="mt-4.5 text-3xl font-semibold text-primary">MiniPolya</h1>
      <p className="mt-1 text-base text-secondary">Admin panel</p>

      <form
        onSubmit={(event) => void submit(event)}
        aria-label="Kirish"
        className="mt-7 flex w-full flex-col gap-3.5 text-left"
      >
        <Field
          label="Login"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={busy}
        />
        <PasswordField
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={busy}
        />
        <Button
          type="submit"
          className="mt-1 h-11 w-full text-md"
          disabled={!canSubmit}
          aria-busy={busy}
        >
          {busy && <LoaderCircle size={16} aria-hidden className="animate-spin" />}
          Kirish
        </Button>
        {message && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {message}
          </p>
        )}
      </form>

      <p className="mt-4 text-xs text-secondary">Faqat administratorlar uchun</p>
    </AuthCard>
  )
}

const box =
  'flex h-11 items-center rounded-md border border-border bg-background text-base focus-within:border-accent has-disabled:opacity-60'
const input =
  'h-full min-w-0 flex-1 bg-transparent px-3 text-primary outline-none placeholder:text-secondary'

function Label({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-primary">
      {children}
    </label>
  )
}

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className={box}>
        <input id={id} type="text" className={input} {...props} />
      </div>
    </div>
  )
}

function PasswordField(props: InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye
  return (
    <div>
      <Label htmlFor={id}>Parol</Label>
      <div className={box}>
        <input
          id={id}
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          className={input}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? 'Parolni yashirish' : 'Parolni koʻrsatish'}
          aria-pressed={visible}
          className={cx(
            'mr-1 flex size-9 shrink-0 items-center justify-center rounded-sm text-secondary hover:text-primary',
            'focus-visible:outline-2 focus-visible:outline-accent',
          )}
        >
          <Icon size={18} aria-hidden />
        </button>
      </div>
    </div>
  )
}
