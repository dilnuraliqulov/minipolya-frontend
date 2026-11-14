# MiniPolya frontend: npm builds both apps, Caddy serves the result.
#
# The two apps are one Vite build (index.html → Mini App, admin.html → admin panel), so one
# image carries both. Built by the backend repository's deploy/docker-compose.yml with this
# repository as the context; the Caddyfile is NOT baked in — compose mounts it, so the
# routing and the headers can be changed and reloaded without rebuilding the bundle.
#
# Both stages are multi-architecture: the same file builds on a t4g (ARM) and a t3 (x86).

# ---------------------------------------------------------------------------------------
# Stage 1 — build. Node, the whole node_modules tree and the TypeScript compiler live only
# here. Nothing from this stage reaches the server image except dist/.
# ---------------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS build

WORKDIR /build

# The lockfile first, in its own layer: a change to the source re-uses the installed tree.
# `npm ci` (not `npm install`) installs exactly what package-lock.json pins and fails if the
# two disagree, so the server builds the same dependency versions you tested against.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Everything VITE_* is read at BUILD time and inlined into the public bundle, so each one
# has to be a build argument rather than a container environment variable — and each one is
# public by definition. Never add a secret here: it would be readable in the JavaScript.
#
# VITE_API_URL is deliberately EMPTY: Caddy serves these files and the API on one origin, so
# the apps call /api on their own origin. That is what lets the backend have no public
# address and no CORS at all.
ARG VITE_API_URL=""
ARG VITE_YANDEX_MAPS_API_KEY=""
ARG VITE_TELEGRAM_BOT_USERNAME=""
ARG VITE_TELEGRAM_APP_NAME=""
ARG VITE_TELEGRAM_SUPPORT_USERNAME=""

ENV VITE_API_URL=$VITE_API_URL \
    VITE_YANDEX_MAPS_API_KEY=$VITE_YANDEX_MAPS_API_KEY \
    VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME \
    VITE_TELEGRAM_APP_NAME=$VITE_TELEGRAM_APP_NAME \
    VITE_TELEGRAM_SUPPORT_USERNAME=$VITE_TELEGRAM_SUPPORT_USERNAME

# VITE_DEV_LOGIN_KEY is NOT an argument and is NOT set. The dev sign-in picker is behind
# `import.meta.env.DEV ? lazy(...) : null` in AuthGate, so Rollup drops it from a production
# build whatever the variable says — but leaving the key out as well means there is nothing
# to leak even if that guard were ever weakened. NODE_ENV=production is what makes
# import.meta.env.DEV false.
ENV NODE_ENV=production

# tsc -b && vite build. The ceiling keeps Node from growing past what a 2 GB server can give
# it: without it V8 sizes its heap from the host's RAM, and the build is the one moment this
# server is short of memory (that is also what the swap file in DEPLOYMENT-AWS.md is for).
ENV NODE_OPTIONS=--max-old-space-size=1024
RUN npm run build

# ---------------------------------------------------------------------------------------
# Stage 2 — serve. Caddy and the built files, nothing else: no Node, no npm, no sources.
# ---------------------------------------------------------------------------------------
FROM caddy:2.10-alpine AS runtime

# Where the Caddyfile's `root` points. Caddy's own image runs as root so it can bind 80 and
# 443 and write the certificates it fetches; the files it serves are read-only to it.
COPY --from=build --chown=root:root --chmod=444 /build/dist /srv

# Caddy's default config is replaced by the mounted Caddyfile (see deploy/docker-compose.yml);
# this is only the fallback for `docker run` without a mount.
EXPOSE 80 443
