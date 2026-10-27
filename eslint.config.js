import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/** Shared code flows one way: miniapp/admin → shared, never back. */
function forbidImports(...dirs) {
  return {
    'no-restricted-imports': [
      'error',
      {
        patterns: dirs.map((dir) => ({
          group: [`**/${dir}`, `**/${dir}/**`],
          message: `Do not import from src/${dir} here — see "Planned structure" in CLAUDE.md.`,
        })),
      },
    ],
  }
}

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  { files: ['src/miniapp/**'], rules: forbidImports('admin') },
  { files: ['src/admin/**'], rules: forbidImports('miniapp') },
  { files: ['src/shared/**'], rules: forbidImports('admin', 'miniapp') },
  prettier,
])
