import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// No `languageOptions.globals` here: domain models are plain TS with no
// runtime API surface, so they must stay free of both node and browser
// globals to remain safely importable from either environment.
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
])
