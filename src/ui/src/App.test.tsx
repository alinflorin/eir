import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from 'vitest-browser-react'
import { MemoryRouter } from 'react-router'
import { useAuth } from 'react-oidc-context'
import type { AuthContextProps, ErrorContext } from 'react-oidc-context'
import { useEventBus } from './hooks/useEventBus'
import App from './App'

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(),
}))

vi.mock('./hooks/useEventBus', () => ({
  useEventBus: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseEventBus = vi.mocked(useEventBus)

function mockAuth(overrides: Partial<AuthContextProps> = {}) {
  const auth = {
    isLoading: false,
    isAuthenticated: false,
    activeNavigator: undefined,
    error: undefined,
    user: undefined,
    events: { addAccessTokenExpired: vi.fn().mockReturnValue(vi.fn()) },
    signinRedirect: vi.fn(),
    signinSilent: vi.fn(),
    removeUser: vi.fn(),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  mockedUseAuth.mockReturnValue(auth)
  return auth
}

function mockEventBus() {
  const bus = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    publish: vi.fn(),
    subscribe: vi.fn().mockReturnValue(vi.fn()),
  }
  mockedUseEventBus.mockReturnValue(bus)
  return bus
}

function renderApp(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockedUseAuth.mockReset()
  mockedUseEventBus.mockReset()
  localStorage.clear()
})

describe('App', () => {
  it('shows a signing-in spinner while silently signing in', async () => {
    mockAuth({ activeNavigator: 'signinSilent' })
    mockEventBus()

    const screen = await renderApp()

    await expect.element(screen.getByText('Signing you in…')).toBeVisible()
  })

  it('shows a signing-out spinner while signing out', async () => {
    mockAuth({ activeNavigator: 'signoutRedirect' })
    mockEventBus()

    const screen = await renderApp()

    await expect.element(screen.getByText('Signing you out…')).toBeVisible()
  })

  it('shows a loading spinner while auth is loading', async () => {
    mockAuth({ isLoading: true })
    mockEventBus()

    const screen = await renderApp()

    await expect.element(screen.getByText('Loading…')).toBeVisible()
  })

  it('shows an error message when auth fails', async () => {
    const e: ErrorContext = {message: 'boom', name: 'boom', source: 'signinSilent', args: undefined};
    mockAuth({ error: e })
    mockEventBus()

    const screen = await renderApp()

    await expect.element(screen.getByText('Authentication error: boom')).toBeVisible()
  })

  it('renders the app shell and routed page once ready', async () => {
    mockAuth()
    mockEventBus()

    const screen = await renderApp(['/'])

    await expect.element(screen.getByText('Eir')).toBeVisible()
    await expect.element(screen.getByText('Welcome to the app.')).toBeVisible()
  })

  it('routes to the page matching the current location', async () => {
    mockAuth()
    mockEventBus()

    const screen = await renderApp(['/about'])

    await expect.element(screen.getByText('Learn more about this project.')).toBeVisible()
  })

  it('navigates to the returnTo location stashed on the auth state after sign-in', async () => {
    mockAuth({
      isAuthenticated: true,
      user: {
        access_token: 'token-123',
        profile: { name: 'Ada Lovelace', email: 'ada@example.com' },
        state: { returnTo: '/about' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    })
    mockEventBus()

    const screen = await renderApp(['/'])

    await expect.element(screen.getByText('Learn more about this project.')).toBeVisible()
  })

  it('connects the event bus with the access token once authenticated', async () => {
    mockAuth({
      isAuthenticated: true,
      user: {
        access_token: 'token-123',
        profile: { name: 'Ada Lovelace', email: 'ada@example.com' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    })
    const bus = mockEventBus()

    await renderApp()

    await expect.poll(() => bus.connect.mock.calls.length).toBe(1)
    expect(bus.connect).toHaveBeenCalledWith('token-123', 'Ada Lovelace')
  })

  it('disconnects the event bus when not authenticated', async () => {
    mockAuth({ isAuthenticated: false })
    const bus = mockEventBus()

    await renderApp()

    await expect.poll(() => bus.disconnect.mock.calls.length).toBeGreaterThan(0)
  })

  it('calls signinRedirect with the current location as returnTo when logging in', async () => {
    const auth = mockAuth()
    mockEventBus()

    const screen = await renderApp(['/contact'])

    await screen.getByRole('img', { name: 'Account' }).click()
    await screen.getByRole('menuitem', { name: 'Login' }).click()

    expect(auth.signinRedirect).toHaveBeenCalledWith({ state: { returnTo: '/contact' } })
  })

  it('calls removeUser when logging out', async () => {
    const auth = mockAuth({
      isAuthenticated: true,
      user: {
        access_token: 'token-123',
        profile: { name: 'Ada Lovelace', email: 'ada@example.com' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    })
    mockEventBus()

    const screen = await renderApp()

    await screen.getByRole('img', { name: 'Ada Lovelace' }).click()
    await screen.getByRole('menuitem', { name: 'Logout' }).click()

    expect(auth.removeUser).toHaveBeenCalledOnce()
  })
})
