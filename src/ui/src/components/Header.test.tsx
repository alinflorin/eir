import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import Header from './Header'

function renderHeader(props: Partial<ComponentProps<typeof Header>> = {}) {
  const onToggleDrawer = vi.fn()

  return render(
    <FluentProvider theme={webLightTheme}>
      <Header
        isMobile={false}
        onToggleDrawer={onToggleDrawer}
        isAuthLoading={false}
        isAuthenticated={false}
        themePreference="system"
        onThemePreferenceChange={vi.fn()}
        onLoginClick={vi.fn()}
        onLogoutClick={vi.fn()}
        {...props}
      />
    </FluentProvider>,
  ).then((screen) => ({ ...screen, onToggleDrawer }))
}

describe('Header', () => {
  it('hides the hamburger on desktop', async () => {
    const screen = await renderHeader({ isMobile: false })

    await expect.element(screen.getByRole('button', { name: 'Toggle navigation' })).not.toBeInTheDocument()
  })

  it('shows a hamburger that opens the drawer on mobile', async () => {
    const screen = await renderHeader({ isMobile: true })

    await screen.getByRole('button', { name: 'Toggle navigation' }).click()

    expect(screen.onToggleDrawer).toHaveBeenCalledOnce()
  })

  it('renders the brand name', async () => {
    const screen = await renderHeader()

    await expect.element(screen.getByText('Eir')).toBeVisible()
  })

  it('shows the notification bell only when authenticated', async () => {
    const screen = await renderHeader({ isAuthenticated: false })

    await expect.element(screen.getByRole('button', { name: /Notifications/ })).not.toBeInTheDocument()
  })

  it('shows the notification bell when authenticated', async () => {
    const screen = await renderHeader({ isAuthenticated: true })

    await expect.element(screen.getByRole('button', { name: /Notifications/ })).toBeVisible()
  })
})
