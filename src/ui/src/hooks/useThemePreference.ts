import { useCallback, useState } from 'react'
import { usePrefersDarkMode } from './usePrefersDarkMode'

export type ThemePreference = 'system' | 'dark' | 'light'

const STORAGE_KEY = 'eir-theme-preference'

function readStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'dark' || stored === 'light' ? stored : 'system'
}

export function useThemePreference() {
  const prefersDark = usePrefersDarkMode()
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference)

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    if (next === 'system') {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, next)
    }
  }, [])

  const isDark = preference === 'system' ? prefersDark : preference === 'dark'

  return { preference, setPreference, isDark }
}
