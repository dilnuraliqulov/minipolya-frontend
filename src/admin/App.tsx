import { createBrowserRouter, RouterProvider } from 'react-router'
import { PlaceholderPage } from './PlaceholderPage'

// The router lives under /admin; opening the file path directly lands there too.
// Must run before the router reads the URL.
if (location.pathname === '/admin.html') history.replaceState(null, '', '/admin/')

const router = createBrowserRouter([{ path: '*', element: <PlaceholderPage /> }], {
  basename: '/admin',
})

export function App() {
  return <RouterProvider router={router} />
}
