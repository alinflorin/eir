import { describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useIsMobile } from './useIsMobile'

function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<() => void>()
  let matches = initialMatches

  const mql = {
    get matches() {
      return matches
    },
    media: '(max-width: 640px)',
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

describe('useIsMobile', () => {
  it('reports true when the viewport already matches the mobile breakpoint', async () => {
    stubMatchMedia(true)
    const { result } = await renderHook(() => useIsMobile())

    expect(result.current).toBe(true)

    vi.unstubAllGlobals()
  })

  it('flips to true once the viewport narrows past the breakpoint', async () => {
    const mql = stubMatchMedia(false)
    const { result, act } = await renderHook(() => useIsMobile())

    expect(result.current).toBe(false)

    await act(() => mql.change(true))

    expect(result.current).toBe(true)

    vi.unstubAllGlobals()
  })

  it('stops listening after unmount', async () => {
    const mql = stubMatchMedia(false)
    const { result, unmount } = await renderHook(() => useIsMobile())

    unmount()

    // Firing a change after unmount must not throw or resurrect the listener.
    expect(() => mql.change(true)).not.toThrow()
    expect(result.current).toBe(false)

    vi.unstubAllGlobals()
  })
})
