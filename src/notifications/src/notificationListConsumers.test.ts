import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AllNotificationsMarkedAsRead } from '../../domain/all-notifications-marked-as-read.js'
import { AllNotificationsMarkedAsReadRequested } from '../../domain/all-notifications-marked-as-read-requested.js'
import { ExceptionOccurred } from '../../domain/exception-occurred.js'
import { NotificationListFetched } from '../../domain/notification-list-fetched.js'
import { NotificationListRequested } from '../../domain/notification-list-requested.js'
import { NotificationMarkAsReadRequested } from '../../domain/notification-mark-as-read-requested.js'
import { NotificationMarkedAsRead } from '../../domain/notification-marked-as-read.js'

const onConnect = vi.fn()
const consumeAny = vi.fn()
const publish = vi.fn()
const getNotifications = vi.fn()
const markAsRead = vi.fn()
const markAllAsRead = vi.fn()

vi.mock('./eventBus.js', () => ({ onConnect, consumeAny, publish }))
vi.mock('./notificationService.js', () => ({ getNotifications, markAsRead, markAllAsRead }))

const { startNotificationListConsumers } = await import('./notificationListConsumers.js')

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

function registerAndGetHandlers() {
  onConnect.mockImplementation((listener: () => void) => listener())
  startNotificationListConsumers()

  const listCall = consumeAny.mock.calls.find((call) => call[0] === NotificationListRequested)
  const markCall = consumeAny.mock.calls.find((call) => call[0] === NotificationMarkAsReadRequested)
  const markAllCall = consumeAny.mock.calls.find((call) => call[0] === AllNotificationsMarkedAsReadRequested)
  const rawListHandler = listCall![2] as (request: NotificationListRequested, user: string) => void
  const rawMarkHandler = markCall![2] as (request: NotificationMarkAsReadRequested, user: string) => void
  const rawMarkAllHandler = markAllCall![2] as (request: AllNotificationsMarkedAsReadRequested, user: string) => void

  return {
    listHandler: async (request: NotificationListRequested, user: string) => {
      rawListHandler(request, user)
      await flush()
    },
    markHandler: async (request: NotificationMarkAsReadRequested, user: string) => {
      rawMarkHandler(request, user)
      await flush()
    },
    markAllHandler: async (request: AllNotificationsMarkedAsReadRequested, user: string) => {
      rawMarkAllHandler(request, user)
      await flush()
    },
  }
}

describe('notificationListConsumers', () => {
  beforeEach(() => {
    onConnect.mockReset()
    consumeAny.mockReset()
    publish.mockReset()
    getNotifications.mockReset()
    markAsRead.mockReset()
    markAllAsRead.mockReset()
  })

  it('registers all three consumers scoped to users, inside onConnect', () => {
    registerAndGetHandlers()

    expect(consumeAny).toHaveBeenCalledWith(NotificationListRequested, 'users', expect.any(Function))
    expect(consumeAny).toHaveBeenCalledWith(NotificationMarkAsReadRequested, 'users', expect.any(Function))
    expect(consumeAny).toHaveBeenCalledWith(AllNotificationsMarkedAsReadRequested, 'users', expect.any(Function))
  })

  it('fetches a page of notifications and publishes NotificationListFetched back to the requesting user', async () => {
    const { listHandler } = registerAndGetHandlers()
    const date = new Date('2026-01-01T00:00:00.000Z')
    getNotifications.mockResolvedValue({
      notifications: [
        { _id: { toString: () => 'abc123' }, userName: 'alice', title: 'Hi', body: 'body', link: undefined, date, isRead: false, readDate: null },
      ],
      totalCount: 5,
      unreadCount: 2,
    })

    await listHandler(new NotificationListRequested(1, 20), 'alice')

    expect(getNotifications).toHaveBeenCalledWith('alice', 1, 20)
    expect(publish).toHaveBeenCalledWith(
      new NotificationListFetched(
        [{ id: 'abc123', title: 'Hi', body: 'body', link: undefined, date: date.toISOString(), isRead: false, readDate: undefined }],
        1,
        20,
        5,
        2,
      ),
      { user: 'alice' },
    )
  })

  it('clamps page below 1 up to 1 and pageSize above the max down to the max', async () => {
    const { listHandler } = registerAndGetHandlers()
    getNotifications.mockResolvedValue({ notifications: [], totalCount: 0, unreadCount: 0 })

    await listHandler(new NotificationListRequested(0, 1000), 'alice')

    expect(getNotifications).toHaveBeenCalledWith('alice', 1, 100)
  })

  it('publishes ExceptionOccurred to the requesting user when fetching fails', async () => {
    const { listHandler } = registerAndGetHandlers()
    getNotifications.mockRejectedValue(new Error('mongo is down'))

    await listHandler(new NotificationListRequested(1, 20), 'alice')

    expect(publish).toHaveBeenCalledWith(new ExceptionOccurred('mongo is down'), { user: 'alice' })
  })

  it('marks a notification as read and publishes NotificationMarkedAsRead back to the requesting user', async () => {
    const { markHandler } = registerAndGetHandlers()
    markAsRead.mockResolvedValue(undefined)

    const request = new NotificationMarkAsReadRequested('abc123')
    await markHandler(request, 'alice')

    expect(markAsRead).toHaveBeenCalledWith('alice', 'abc123')
    expect(publish).toHaveBeenCalledWith(new NotificationMarkedAsRead('abc123'), { user: 'alice' })
  })

  it('publishes ExceptionOccurred to the requesting user when marking as read fails', async () => {
    const { markHandler } = registerAndGetHandlers()
    markAsRead.mockRejectedValue(new Error('mongo is down'))

    await markHandler(new NotificationMarkAsReadRequested('abc123'), 'alice')

    expect(publish).toHaveBeenCalledWith(new ExceptionOccurred('mongo is down'), { user: 'alice' })
  })

  it('marks all notifications as read and publishes AllNotificationsMarkedAsRead back to the requesting user', async () => {
    const { markAllHandler } = registerAndGetHandlers()
    markAllAsRead.mockResolvedValue(undefined)

    await markAllHandler(new AllNotificationsMarkedAsReadRequested(), 'alice')

    expect(markAllAsRead).toHaveBeenCalledWith('alice')
    expect(publish).toHaveBeenCalledWith(new AllNotificationsMarkedAsRead(), { user: 'alice' })
  })

  it('publishes ExceptionOccurred to the requesting user when marking all as read fails', async () => {
    const { markAllHandler } = registerAndGetHandlers()
    markAllAsRead.mockRejectedValue(new Error('mongo is down'))

    await markAllHandler(new AllNotificationsMarkedAsReadRequested(), 'alice')

    expect(publish).toHaveBeenCalledWith(new ExceptionOccurred('mongo is down'), { user: 'alice' })
  })
})
