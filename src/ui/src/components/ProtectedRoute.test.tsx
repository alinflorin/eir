import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from 'vitest-browser-react'
import { MemoryRouter } from 'react-router'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import { useAuth } from 'react-oidc-context'
import ProtectedRoute from './ProtectedRoute'

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

function renderProtectedRoute() {
  return render(
    <FluentProvider theme={webLightTheme}>
      <MemoryRouter initialEntries={['/settings?foo=bar']}>
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      </MemoryRouter>
    </FluentProvider>,
  )
}

beforeEach(() => {
  mockedUseAuth.mockReset()
})

describe('ProtectedRoute', () => {
  it('shows a spinner and redirects to sign-in when unauthenticated', async () => {
    const signinRedirect = vi.fn().mockResolvedValue(undefined)
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      activeNavigator: undefined,
      error: undefined,
      signinRedirect,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const screen = await renderProtectedRoute()

    await expect.element(screen.getByText('Signing you in…')).toBeVisible()
    await expect.poll(() => signinRedirect.mock.calls.length).toBe(1)
    expect(signinRedirect).toHaveBeenCalledWith({
      state: { returnTo: '/settings?foo=bar' },
      extraQueryParams: { ui_locales: 'en' },
    })
  })

  it('does not redirect again while still loading', async () => {
    const signinRedirect = vi.fn()
    mockedUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      activeNavigator: undefined,
      error: undefined,
      signinRedirect,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    await renderProtectedRoute()

    expect(signinRedirect).not.toHaveBeenCalled()
  })

  it('renders the protected children once authenticated', async () => {
    mockedUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      activeNavigator: undefined,
      error: undefined,
      signinRedirect: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const screen = await renderProtectedRoute()

    await expect.element(screen.getByText('Protected content')).toBeVisible()
  })
})
