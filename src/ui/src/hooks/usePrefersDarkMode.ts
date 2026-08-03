import { useEffect, useState } from 'react'

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function usePrefersDarkMode() {
  const [prefersDark, setPrefersDark] = useState(
    () => window.matchMedia(DARK_QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(DARK_QUERY)
    const onChange = () => setPrefersDark(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return prefersDark
}
