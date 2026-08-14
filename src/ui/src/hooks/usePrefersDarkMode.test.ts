import { describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { usePrefersDarkMode } from './usePrefersDarkMode'

// jsdom-less browser mode still ships a real `matchMedia`, but it can't know
// about the OS color scheme, so we stub it to drive both branches explicitly.
function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<() => void>()
  let matches = initialMatches

  const mql = {
    get matches() {
      return matches
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }

  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql))

  return {
    change(next: boolean) {
      matches = next
      listeners.forEach((listener) => listener())
    },
  }
}

describe('usePrefersDarkMode', () => {
  it('reflects the current matchMedia state on mount', async () => {
    stubMatchMedia(true)
    const { result } = await renderHook(() => usePrefersDarkMode())

    expect(result.current).toBe(true)

    vi.unstubAllGlobals()
  })

  it('updates when the media query change event fires', async () => {
    const mql = stubMatchMedia(false)
    const { result, act } = await renderHook(() => usePrefersDarkMode())

    expect(result.current).toBe(false)

    await act(() => mql.change(true))

    expect(result.current).toBe(true)

    vi.unstubAllGlobals()
  })
})
