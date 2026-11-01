import { ErrorState } from './components'
import { useSplashDone } from './splash'

/** A render crash: never leave the splash over React Router's own error page. */
export function RouteError() {
  useSplashDone()
  return (
    <div className="flex min-h-dvh items-center justify-center bg-page px-4">
      <ErrorState onRetry={() => window.location.reload()} />
    </div>
  )
}
