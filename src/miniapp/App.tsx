import { createBrowserRouter, RouterProvider } from 'react-router'
import { ToastProvider } from './components/ToastProvider'
import { routes } from './routes'
import { getStartParam } from './telegram'
import { startRoute } from './telegram/startRoute'

// A launch from an invite link (startapp=team_<code>) opens its screen first.
const start = startRoute(getStartParam())
if (start && window.location.pathname === '/') window.history.replaceState(null, '', start)

const router = createBrowserRouter(routes)

export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  )
}
