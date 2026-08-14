import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import UserMenu from './UserMenu'

async function renderUserMenu(props: Partial<ComponentProps<typeof UserMenu>> = {}) {
  const onThemePreferenceChange = vi.fn()
  const onLoginClick = vi.fn()
  const onLogoutClick = vi.fn()

  const screen = await render(
    <FluentProvider theme={webLightTheme}>
      <UserMenu
        isLoading={false}
        isAuthenticated={false}
        themePreference="system"
        onThemePreferenceChange={onThemePreferenceChange}
        onLoginClick={onLoginClick}
        onLogoutClick={onLogoutClick}
        {...props}
      />
    </FluentProvider>,
  )

  return { ...screen, onThemePreferenceChange, onLoginClick, onLogoutClick }
}

describe('UserMenu', () => {
  it('shows a spinner while auth is loading', async () => {
    const screen = await renderUserMenu({ isLoading: true })

    await expect.element(screen.getByRole('progressbar')).toBeVisible()
  })

  it('offers a login action when unauthenticated', async () => {
    const screen = await renderUserMenu()

    await screen.getByRole('img', { name: 'Account' }).click()
    await expect.element(screen.getByRole('menuitem', { name: 'Login' })).toBeVisible()

    await screen.getByRole('menuitem', { name: 'Login' }).click()

    expect(screen.onLoginClick).toHaveBeenCalledOnce()
  })

  it('shows the display name and a logout action when authenticated', async () => {
    const screen = await renderUserMenu({ isAuthenticated: true, name: 'Ada Lovelace' })

    await screen.getByRole('img', { name: 'Ada Lovelace' }).click()

    await expect.element(screen.getByText('Ada Lovelace')).toBeVisible()
    await expect.element(screen.getByRole('menuitem', { name: 'Logout' })).toBeVisible()

    await screen.getByRole('menuitem', { name: 'Logout' }).click()

    expect(screen.onLogoutClick).toHaveBeenCalledOnce()
  })

  it('falls back to email when no name is provided', async () => {
    const screen = await renderUserMenu({ isAuthenticated: true, email: 'ada@example.com' })

    await expect.element(screen.getByRole('img', { name: 'ada@example.com' })).toBeVisible()
  })

  it('reports the selected theme preference', async () => {
    const screen = await renderUserMenu({ isAuthenticated: true, name: 'Ada Lovelace' })

    await screen.getByRole('img', { name: 'Ada Lovelace' }).click()
    await screen.getByRole('menuitem', { name: 'Theme' }).click()
    await screen.getByRole('menuitemradio', { name: 'Dark' }).click()

    expect(screen.onThemePreferenceChange).toHaveBeenCalledWith('dark')
  })
})
