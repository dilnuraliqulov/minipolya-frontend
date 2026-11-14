/**
 * Serves the production build (`dist/`) with Vite's preview server, on the port and
 * interface the environment asks for.
 *
 * A host assigns the port at run time through `PORT`, and the process has to listen on
 * every interface rather than on localhost, or nothing outside the container can reach
 * it. `vite preview --host 0.0.0.0 --port $PORT` would say that in one line on Linux and
 * break on Windows, where the shell does not expand `$PORT` — so the values are read here
 * instead, which works the same in every shell. Everything else (the /api proxy, the
 * allowed hosts, the security headers, the /admin rewrite) comes from `vite.config.ts`.
 *
 *   npm start                 → 0.0.0.0:4173, for checking the build locally
 *   PORT=8080 npm start       → 0.0.0.0:8080, what a host does
 *   HOST=localhost npm start  → localhost only
 *
 * `npm run preview` is untouched and still serves on localhost the way Vite does by
 * default.
 */
import { preview } from 'vite'

const DEFAULT_PORT = 4173

const port = Number(process.env.PORT)
const server = await preview({
  preview: {
    host: process.env.HOST ?? '0.0.0.0',
    port: Number.isInteger(port) && port > 0 ? port : DEFAULT_PORT,
    // Listening on a different port than the one assigned is worse than not starting:
    // the host would keep sending to a port nothing answers on.
    strictPort: true,
  },
})

server.printUrls()
