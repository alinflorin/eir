import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { AllNotificationsMarkedAsRead } from '../../../domain/all-notifications-marked-as-read'
import { AllNotificationsMarkedAsReadRequested } from '../../../domain/all-notifications-marked-as-read-requested'
import { NotificationAdded } from '../../../domain/notification-added'
import { NotificationListFetched } from '../../../domain/notification-list-fetched'
import { NotificationListRequested } from '../../../domain/notification-list-requested'
import { NotificationMarkAsReadRequested } from '../../../domain/notification-mark-as-read-requested'
import { NotificationMarkedAsRead } from '../../../domain/notification-marked-as-read'
import { useEventBus } from './useEventBus'
import { useNotifications } from './useNotifications'

vi.mock('./useEventBus', () => ({
  useEventBus: vi.fn(),
}))

function mockEventBus(isConnected = true) {
  const publish = vi.fn()
  const subscribe = vi.fn().mockReturnValue(() => {})
  vi.mocked(useEventBus).mockReturnValue({ connect: vi.fn(), disconnect: vi.fn(), publish, subscribe, isConnected })
  return { publish, subscribe }
}

function subscribedHandler(subscribe: ReturnType<typeof mockEventBus>['subscribe'], type: unknown) {
  const call = subscribe.mock.calls.find((c) => c[0] === type)
  if (!call) throw new Error('handler was never subscribed')
  return call[1] as (payload: unknown) => void
}

const notificationA = { id: 'a', title: 'Hi', body: 'body a', date: '2026-01-01T00:00:00.000Z', isRead: false }
const notificationB = { id: 'b', title: 'Yo', body: 'body b', date: '2026-01-02T00:00:00.000Z', isRead: true, readDate: '2026-01-02T01:00:00.000Z' }

describe('useNotifications', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('fetches the first page as soon as the event bus is connected', async () => {
    const { publish } = mockEventBus(true)

    await renderHook(() => useNotifications())

    expect(publish).toHaveBeenCalledWith(new NotificationListRequested(1, 10))
  })

  it('does not fetch while the event bus is disconnected', async () => {
    const { publish } = mockEventBus(false)

    await renderHook(() => useNotifications())

    expect(publish).not.toHaveBeenCalled()
  })

  it('applies NotificationListFetched to notifications, unreadCount and totalCount', async () => {
    const { subscribe } = mockEventBus()
    const { result } = await renderHook(() => useNotifications())

    const onFetched = subscribedHandler(subscribe, NotificationListFetched)
    onFetched(new NotificationListFetched([notificationA, notificationB], 1, 10, 2, 1))

    await expect.poll(() => result.current.notifications).toEqual([notificationA, notificationB])
    expect(result.current.unreadCount).toBe(1)
    expect(result.current.totalCount).toBe(2)
    expect(result.current.isLoading).toBe(false)
  })

  it('appends subsequent pages instead of replacing the list', async () => {
    const { subscribe } = mockEventBus()
    const { result } = await renderHook(() => useNotifications())

    const onFetched = subscribedHandler(subscribe, NotificationListFetched)
    onFetched(new NotificationListFetched([notificationA], 1, 1, 2, 1))
    onFetched(new NotificationListFetched([notificationB], 2, 1, 2, 1))

    await expect.poll(() => result.current.notifications).toEqual([notificationA, notificationB])
  })

  it('loadMore() requests the next page', async () => {
    const { publish, subscribe } = mockEventBus()
    const { result } = await renderHook(() => useNotifications())

    const onFetched = subscribedHandler(subscribe, NotificationListFetched)
    onFetched(new NotificationListFetched([notificationA], 3, 1, 10, 1))
    await expect.poll(() => result.current.notifications).toEqual([notificationA])

    result.current.loadMore()

    expect(publish).toHaveBeenCalledWith(new NotificationListRequested(4, 10))
  })

  it('refresh() re-requests the first page', async () => {
    const { publish } = mockEventBus()
    const { result } = await renderHook(() => useNotifications())
    publish.mockClear()

    result.current.refresh()

    expect(publish).toHaveBeenCalledWith(new NotificationListRequested(1, 10))
  })

  it('hasMore reflects whether every notification has been loaded', async () => {
    const { subscribe } = mockEventBus()
    const { result } = await renderHook(() => useNotifications())

    const onFetched = subscribedHandler(subscribe, NotificationListFetched)
    onFetched(new NotificationListFetched([notificationA], 1, 1, 2, 1))
    await expect.poll(() => result.current.hasMore).toBe(true)

    onFetched(new NotificationListFetched([notificationB], 2, 1, 2, 1))
    await expect.poll(() => result.current.hasMore).toBe(false)
  })

  it('prepends a live NotificationAdded and bumps unreadCount and totalCount', async () => {
    const { subscribe } = mockEventBus()
    const { result } = await renderHook(() => useNotifications())

    const onFetched = subscribedHandler(subscribe, NotificationListFetched)
    onFetched(new NotificationListFetched([notificationB], 1, 10, 1, 0))
    await expect.poll(() => result.current.notifications).toEqual([notificationB])

    const onAdded = subscribedHandler(subscribe, NotificationAdded)
    onAdded(new NotificationAdded(notificationA))

    await expect.poll(() => result.current.notifications).toEqual([notificationA, notificationB])
    expect(result.current.unreadCount).toBe(1)
    expect(result.current.totalCount).toBe(2)
  })

  it('does not bump unreadCount for a live NotificationAdded that arrives already read', async () => {
    const { subscribe } = mockEventBus()
    const { result } = await renderHook(() => useNotifications())

    const onFetched = subscribedHandler(subscribe, NotificationListFetched)
    onFetched(new NotificationListFetched([], 1, 10, 0, 0))
    await expect.poll(() => result.current.totalCount).toBe(0)

    const onAdded = subscribedHandler(subscribe, NotificationAdded)
    onAdded(new NotificationAdded(notificationB))

    await expect.poll(() => result.current.totalCount).toBe(1)
    expect(result.current.unreadCount).toBe(0)
  })

  it('markAsRead() publishes NotificationMarkAsReadRequested and reconciles state once confirmed', async () => {
    const { publish, subscribe } = mockEventBus()
    const { result } = await renderHook(() => useNotifications())

    const onFetched = subscribedHandler(subscribe, NotificationListFetched)
    onFetched(new NotificationListFetched([notificationA], 1, 10, 1, 1))

    result.current.markAsRead('a')

    expect(publish).toHaveBeenCalledWith(new NotificationMarkAsReadRequested('a'))

    const onMarked = subscribedHandler(subscribe, NotificationMarkedAsRead)
    onMarked(new NotificationMarkedAsRead('a'))

    await expect.poll(() => result.current.notifications[0]?.isRead).toBe(true)
    expect(result.current.unreadCount).toBe(0)
  })

  it('markAllAsRead() publishes AllNotificationsMarkedAsReadRequested and marks everything read once confirmed', async () => {
    const { publish, subscribe } = mockEventBus()
    const { result } = await renderHook(() => useNotifications())

    const onFetched = subscribedHandler(subscribe, NotificationListFetched)
    onFetched(new NotificationListFetched([notificationA], 1, 10, 1, 1))

    result.current.markAllAsRead()

    expect(publish).toHaveBeenCalledWith(new AllNotificationsMarkedAsReadRequested())

    const onAllMarked = subscribedHandler(subscribe, AllNotificationsMarkedAsRead)
    onAllMarked(new AllNotificationsMarkedAsRead())

    await expect.poll(() => result.current.notifications[0]?.isRead).toBe(true)
    expect(result.current.unreadCount).toBe(0)
  })
})
