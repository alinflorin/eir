import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import { useAuth } from 'react-oidc-context'
import { ToastProvider } from './useToast'
import { useEventBus } from './useEventBus'
import { usePushNotifications } from './usePushNotifications'
import { PushSubscriptionAddRequested } from '../../../domain/push-subscription-add-requested'
import { PushSubscriptionAdded } from '../../../domain/push-subscription-added'
import { PushSubscriptionDeleteRequested } from '../../../domain/push-subscription-delete-requested'
import { PushSubscriptionDeleted } from '../../../domain/push-subscription-deleted'

vi.mock('./useEventBus', () => ({
  useEventBus: vi.fn(),
}))

vi.mock('react-oidc-context', () => ({
  // Defaults to unauthenticated so existing tests (which don't care about
  // auto-request) don't need to opt in explicitly; override with mockAuth().
  useAuth: vi.fn(() => ({ isAuthenticated: false })),
}))

function mockEventBus(isConnected = false) {
  const publish = vi.fn()
  const subscribe = vi.fn().mockReturnValue(() => {})
  vi.mocked(useEventBus).mockReturnValue({ connect: vi.fn(), disconnect: vi.fn(), publish, subscribe, isConnected })
  return { publish, subscribe }
}

function mockAuth(isAuthenticated = false) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(useAuth).mockReturnValue({ isAuthenticated } as any)
}

function subscribedHandler(subscribe: ReturnType<typeof mockEventBus>['subscribe'], type: unknown) {
  const call = subscribe.mock.calls.find((c) => c[0] === type)
  if (!call) throw new Error('handler was never subscribed')
  return call[1] as (payload: unknown) => void
}

function stubNotification(permission: NotificationPermission, requestPermission = vi.fn().mockResolvedValue(permission)) {
  vi.stubGlobal('Notification', { permission, requestPermission })
  return requestPermission
}

function stubServiceWorker(registration: {
  pushManager: { getSubscription: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> }
}) {
  vi.stubGlobal('PushManager', function PushManager() {})
  vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve(registration) } })
}

function stubUnsupported() {
  vi.stubGlobal('PushManager', undefined)
  vi.stubGlobal('navigator', {})
}

function fakeSubscription(overrides: Partial<{ endpoint: string; keys: { p256dh: string; auth: string } | null; expirationTime: number | null }> = {}) {
  const endpoint = overrides.endpoint ?? 'https://push.example.com/abc'
  const keys = overrides.keys === undefined ? { p256dh: 'p256dh-key', auth: 'auth-key' } : overrides.keys
  const expirationTime = overrides.expirationTime ?? null
  return {
    endpoint,
    unsubscribe: vi.fn().mockResolvedValue(true),
    toJSON: () => ({ endpoint, keys, expirationTime }),
  }
}

function fakeRegistration(overrides: {
  getSubscription?: ReturnType<typeof vi.fn>
  subscribe?: ReturnType<typeof vi.fn>
} = {}) {
  return {
    pushManager: {
      getSubscription: overrides.getSubscription ?? vi.fn().mockResolvedValue(null),
      subscribe: overrides.subscribe ?? vi.fn().mockResolvedValue(fakeSubscription()),
    },
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <FluentProvider theme={webLightTheme}>
      <ToastProvider>{children}</ToastProvider>
    </FluentProvider>
  )
}

describe('usePushNotifications', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>)
  })

  it('starts as unsupported when the browser lacks the Push API', async () => {
    mockEventBus()
    stubUnsupported()

    const { result } = await renderHook(() => usePushNotifications(), { wrapper })

    expect(result.current.state).toBe('unsupported')
  })

  it('starts as denied when notification permission was already denied', async () => {
    mockEventBus()
    stubNotification('denied')
    stubServiceWorker(fakeRegistration())

    const { result } = await renderHook(() => usePushNotifications(), { wrapper })

    expect(result.current.state).toBe('denied')
  })

  it('resolves to enabled once mount finds an existing subscription', async () => {
    mockEventBus()
    stubNotification('default')
    stubServiceWorker(fakeRegistration({ getSubscription: vi.fn().mockResolvedValue(fakeSubscription()) }))

    const { result } = await renderHook(() => usePushNotifications(), { wrapper })

    await expect.poll(() => result.current.state).toBe('enabled')
  })

  it('stays default on mount when there is no existing subscription', async () => {
    mockEventBus()
    stubNotification('default')
    stubServiceWorker(fakeRegistration({ getSubscription: vi.fn().mockResolvedValue(null) }))

    const { result } = await renderHook(() => usePushNotifications(), { wrapper })

    await expect.poll(() => result.current.state).toBe('default')
  })

  it('enable() subscribes and publishes PushSubscriptionAddRequested with the browser subscription', async () => {
    const { publish, subscribe } = mockEventBus()
    stubNotification('default', vi.fn().mockResolvedValue('granted'))
    const subscription = fakeSubscription({ endpoint: 'https://push.example.com/xyz' })
    stubServiceWorker(fakeRegistration({ subscribe: vi.fn().mockResolvedValue(subscription) }))

    const { result, act } = await renderHook(() => usePushNotifications(), { wrapper })
    await act(() => result.current.enable())

    expect(publish).toHaveBeenCalledWith(
      new PushSubscriptionAddRequested('https://push.example.com/xyz', null, { p256dh: 'p256dh-key', auth: 'auth-key' }),
    )

    // Confirmed by the notifications service replying with PushSubscriptionAdded.
    const onAdded = subscribedHandler(subscribe, PushSubscriptionAdded)
    onAdded(new PushSubscriptionAdded('https://push.example.com/xyz', null, { p256dh: 'p256dh-key', auth: 'auth-key' }, new Date().toISOString()))

    await expect.poll(() => result.current.state).toBe('enabled')
  })

  it('enable() does not publish and reflects the denied permission when the user declines', async () => {
    const { publish } = mockEventBus()
    stubNotification('default', vi.fn().mockResolvedValue('denied'))
    stubServiceWorker(fakeRegistration())

    const { result, act } = await renderHook(() => usePushNotifications(), { wrapper })
    await act(() => result.current.enable())

    expect(publish).not.toHaveBeenCalled()
    expect(result.current.state).toBe('denied')
  })

  it('enable() falls back to default if the browser subscription is missing required fields', async () => {
    const { publish } = mockEventBus()
    stubNotification('default', vi.fn().mockResolvedValue('granted'))
    const incomplete = fakeSubscription({ keys: null })
    const subscribeMock = vi.fn().mockResolvedValue(incomplete)
    stubServiceWorker(fakeRegistration({ subscribe: subscribeMock }))

    const { result, act } = await renderHook(() => usePushNotifications(), { wrapper })
    await act(() => result.current.enable())

    expect(subscribeMock).toHaveBeenCalledOnce()
    expect(publish).not.toHaveBeenCalled()
    expect(result.current.state).toBe('default')
  })

  it('disable() unsubscribes locally and publishes PushSubscriptionDeleteRequested', async () => {
    const { publish, subscribe } = mockEventBus()
    stubNotification('granted')
    const subscription = fakeSubscription({ endpoint: 'https://push.example.com/xyz' })
    stubServiceWorker(fakeRegistration({ getSubscription: vi.fn().mockResolvedValue(subscription) }))

    const { result, act } = await renderHook(() => usePushNotifications(), { wrapper })
    await act(() => result.current.disable())

    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(publish).toHaveBeenCalledWith(new PushSubscriptionDeleteRequested('https://push.example.com/xyz'))

    // Confirmed by the notifications service replying with PushSubscriptionDeleted.
    const onDeleted = subscribedHandler(subscribe, PushSubscriptionDeleted)
    onDeleted(new PushSubscriptionDeleted('https://push.example.com/xyz'))

    await expect.poll(() => result.current.state).toBe('default')
  })

  it('disable() is a no-op that settles on default when there is no subscription to remove', async () => {
    const { publish } = mockEventBus()
    stubNotification('granted')
    stubServiceWorker(fakeRegistration({ getSubscription: vi.fn().mockResolvedValue(null) }))

    const { result, act } = await renderHook(() => usePushNotifications(), { wrapper })
    await act(() => result.current.disable())

    expect(publish).not.toHaveBeenCalled()
    expect(result.current.state).toBe('default')
  })

  describe('auto-request on login', () => {
    it('requests permission once authenticated, connected, and no subscription/refusal exists', async () => {
      mockAuth(true)
      const { publish } = mockEventBus(true)
      const requestPermission = stubNotification('default', vi.fn().mockResolvedValue('granted'))
      const subscription = fakeSubscription({ endpoint: 'https://push.example.com/auto' })
      stubServiceWorker(fakeRegistration({ getSubscription: vi.fn().mockResolvedValue(null), subscribe: vi.fn().mockResolvedValue(subscription) }))

      await renderHook(() => usePushNotifications(), { wrapper })

      await expect.poll(() => requestPermission.mock.calls.length).toBe(1)
      expect(publish).toHaveBeenCalledWith(
        new PushSubscriptionAddRequested('https://push.example.com/auto', null, { p256dh: 'p256dh-key', auth: 'auth-key' }),
      )
    })

    it('does not auto-request when not authenticated, even if the event bus is connected', async () => {
      mockAuth(false)
      mockEventBus(true)
      const requestPermission = stubNotification('default')
      stubServiceWorker(fakeRegistration({ getSubscription: vi.fn().mockResolvedValue(null) }))

      const { result } = await renderHook(() => usePushNotifications(), { wrapper })

      await expect.poll(() => result.current.state).toBe('default')
      expect(requestPermission).not.toHaveBeenCalled()
    })

    it('does not auto-request when authenticated but the event bus is not connected', async () => {
      mockAuth(true)
      mockEventBus(false)
      const requestPermission = stubNotification('default')
      stubServiceWorker(fakeRegistration({ getSubscription: vi.fn().mockResolvedValue(null) }))

      const { result } = await renderHook(() => usePushNotifications(), { wrapper })

      await expect.poll(() => result.current.state).toBe('default')
      expect(requestPermission).not.toHaveBeenCalled()
    })

    it('does not auto-request when an existing subscription is already present', async () => {
      mockAuth(true)
      mockEventBus(true)
      const requestPermission = stubNotification('granted')
      stubServiceWorker(fakeRegistration({ getSubscription: vi.fn().mockResolvedValue(fakeSubscription()) }))

      const { result } = await renderHook(() => usePushNotifications(), { wrapper })

      await expect.poll(() => result.current.state).toBe('enabled')
      expect(requestPermission).not.toHaveBeenCalled()
    })

    it('does not auto-request when permission was previously denied', async () => {
      mockAuth(true)
      mockEventBus(true)
      const requestPermission = stubNotification('denied')
      stubServiceWorker(fakeRegistration())

      const { result } = await renderHook(() => usePushNotifications(), { wrapper })

      await expect.poll(() => result.current.state).toBe('denied')
      expect(requestPermission).not.toHaveBeenCalled()
    })
  })
})
