import { createBrowserRouter, RouterProvider } from 'react-router'
import { PlaceholderPage } from './PlaceholderPage'

const router = createBrowserRouter([{ path: '*', element: <PlaceholderPage /> }])

export function App() {
  return <RouterProvider router={router} />
}
