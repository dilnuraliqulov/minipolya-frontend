#!/usr/bin/env node
/**
 * Fails if the production build in dist/ contains the admin dev login or any
 * development initData. Runs after every `npm run build`.
 *
 * Looks for:
 * - markers of the dev login code (its label, the env variable's name)
 * - the shape of a Telegram initData string
 * - the actual VITE_DEV_* values from .env* files and the environment,
 *   and the `hash` inside any of them
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const MARKERS = ['VITE_DEV_INIT_DATA', 'Dev login', 'Faqat development']
const INIT_DATA_SHAPE = /auth_date=\d+&(?:query_id|user)=/

/** Values that must never ship: the dev env values, plus the hash inside initData ones. */
export function secretsFrom(env) {
  const secrets = []
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith('VITE_DEV_') || !value?.trim()) continue
    secrets.push(value.trim())
    const hash = new URLSearchParams(value.trim()).get('hash')
    if (hash && hash.length >= 16) secrets.push(hash)
  }
  return secrets
}

/** `files`: [{ name, text }]. Returns one message per problem found. */
export function findLeaks(files, secrets) {
  const problems = []
  for (const { name, text } of files) {
    for (const marker of MARKERS) {
      if (text.includes(marker)) problems.push(`${name}: contains "${marker}"`)
    }
    if (INIT_DATA_SHAPE.test(text)) problems.push(`${name}: contains Telegram initData`)
    for (const secret of secrets) {
      if (text.includes(secret)) problems.push(`${name}: contains a VITE_DEV_* value`)
    }
  }
  return problems
}

function readTextFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(html|js|mjs|css|json|map|txt|svg)$/.test(entry.name))
    .map((entry) => {
      const path = join(entry.parentPath, entry.name)
      return { name: relative(dir, path), text: readFileSync(path, 'utf8') }
    })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const env = {
    ...loadEnv('development', root, 'VITE_DEV_'),
    ...loadEnv('production', root, 'VITE_DEV_'),
  }
  const dir = process.argv[2] ? join(root, process.argv[2]) : join(root, 'dist')
  const files = readTextFiles(dir)
  const problems = findLeaks(files, secretsFrom(env))
  if (problems.length > 0) {
    console.error(`✗ ${relative(root, dir)}/ contains development-only login code or data:`)
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
  }
  console.log(
    `✓ ${relative(root, dir)}/ is clean: no dev login, no dev initData (${files.length} files checked)`,
  )
}
