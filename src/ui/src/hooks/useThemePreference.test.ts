import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useThemePreference } from './useThemePreference'

const STORAGE_KEY = 'eir-theme-preference'

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('useThemePreference', () => {
  it('defaults to "system" and follows the OS preference', async () => {
    const { result } = await renderHook(() => useThemePreference())

    expect(result.current.preference).toBe('system')
    expect(result.current.isDark).toBe(false)
  })

  it('reads a previously stored preference on mount', async () => {
    localStorage.setItem(STORAGE_KEY, 'dark')

    const { result } = await renderHook(() => useThemePreference())

    expect(result.current.preference).toBe('dark')
    expect(result.current.isDark).toBe(true)
  })

  it('persists an explicit preference to localStorage', async () => {
    const { result, act } = await renderHook(() => useThemePreference())

    await act(() => result.current.setPreference('light'))

    expect(result.current.preference).toBe('light')
    expect(result.current.isDark).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light')
  })

  it('clears storage when switching back to "system"', async () => {
    localStorage.setItem(STORAGE_KEY, 'dark')
    const { result, act } = await renderHook(() => useThemePreference())

    await act(() => result.current.setPreference('system'))

    expect(result.current.preference).toBe('system')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
