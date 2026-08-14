// Test-only stand-in for the 'virtual:pwa-register/react' module that
// vite-plugin-pwa injects at build/dev time (see vite.config.ts). Aliased in
// vitest.config.ts because that virtual module doesn't exist under the
// plugin-less test config, and Vite's dependency scanner resolves imports
// before vi.mock() has a chance to intercept them.
import { useState } from 'react'

export function useRegisterSW() {
  const needRefresh = useState(false)
  const offlineReady = useState(false)
  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: async () => {},
  }
}
