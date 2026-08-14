// Registers `page.render` and its types; see https://github.com/vitest-dev/vitest-browser-react
import 'vitest-browser-react'

// Side-effect import: initializes i18next so components using useTranslation()
// resolve real copy instead of raw keys.
import './configs/i18nConfig'
