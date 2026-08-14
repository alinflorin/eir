import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates public/pwa/* icons (any + maskable + apple-touch) from the
// existing favicon.svg, referenced by vite-plugin-pwa's manifest config in
// vite.config.ts. Regenerate with `npm run pwa:assets` after changing the
// source SVG.
export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: minimal2023Preset,
  images: ['public/favicon.svg'],
})
